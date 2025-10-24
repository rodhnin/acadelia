// backend/services/chat/documentStorageService.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import pool from '../../lib/dbPool.js';
import mammoth from 'mammoth';

// ====== IMPORTAR CONFIGURACIÓN CENTRALIZADA ACADEL ======
import {
  FILE_LIMITS,
  SUPPORTED_FILES,
  FORBIDDEN_FILES,
  validateFileTypeBackend,
  validateTextContentBackend,
  validateFileCountBackend,
  detectLanguageBackend,
  inferMimeTypeFromExtensionBackend,
  createSupportedMimeTypesConfig
} from '../../utils/chat/backend-file-constants.js';

/**
 * 🦫 Servicio para almacenar y procesar documentos con Sistema Acadel Centralizado
 * Mantiene coherencia total con el frontend
 */
class DocumentStorageService {
  constructor() {
    console.log('🦫 Acadel Document Storage Service iniciándose...');

    // Configuración de rutas para almacenamiento de documentos
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.chatDocumentsDir = path.join(this.uploadsDir, 'chat_documents');
    this.tempDir = path.join(process.cwd(), 'tmp', 'document_processing');

    // ⭐ USAR CONFIGURACIÓN CENTRALIZADA ACADEL ⭐
    this.supportedMimeTypes = createSupportedMimeTypesConfig();
    this.maxFileSize = FILE_LIMITS.MAX_FILE_SIZE;
    this.maxContentLength = FILE_LIMITS.MAX_TEXT_CONTENT;
    this.maxFilesPerQuery = FILE_LIMITS.MAX_FILES_PER_QUERY;

    console.log(`🦫 Acadel configurado: ${Object.keys(this.supportedMimeTypes).length} tipos MIME, ${this.maxFileSize / 1024 / 1024}MB máx, ${this.maxContentLength} chars máx`);

    // Asegurar que existan los directorios
    this.ensureDirectoriesExist();
  }

  /**
   * Asegura que existan los directorios necesarios
   */
  ensureDirectoriesExist() {
    [this.uploadsDir, this.chatDocumentsDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`🦫 Acadel creó directorio: ${dir}`);
      }
    });
  }

  /**
   * 🦫 NUEVA FUNCIÓN: Recupera contenido de documentos para retry/edit
   * @param {string} fileId - ID del archivo
   * @returns {Promise<Object|null>} - Datos del archivo o null
   */
  async getDocumentContentForRetryEdit(fileId) {
    const client = await pool.connect();

    try {
      const query = `
        SELECT file_id, original_name, file_name, file_path, file_size, 
               mime_type, file_extension, attachment_type, extracted_content, 
               language, created_at
        FROM file_attachments 
        WHERE file_id = $1
      `;

      const result = await client.query(query, [fileId]);

      if (result.rows.length === 0) {
        console.warn(`⚠️ Acadel: Documento no encontrado para retry/edit: ${fileId}`);
        return null;
      }

      const doc = result.rows[0];

      // Actualizar accessed_at
      await client.query(
        'UPDATE file_attachments SET accessed_at = NOW() WHERE file_id = $1',
        [fileId]
      );

      console.log(`✅ Acadel recuperó contenido para retry/edit: ${doc.original_name} (${doc.extracted_content?.length || 0} chars)`);

      return {
        success: true,
        fileId: doc.file_id,
        originalName: doc.original_name,
        fileName: doc.file_name,
        filePath: doc.file_path,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        fileExtension: doc.file_extension,
        attachmentType: doc.attachment_type,
        extractedContent: doc.extracted_content || '',
        language: doc.language,
        createdAt: doc.created_at
      };

    } catch (error) {
      console.error(`❌ Acadel error recuperando documento para retry/edit ${fileId}:`, error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Crea un directorio específico para el chat si no existe
   * @param {string} chatId - ID del chat
   * @returns {string} - Ruta del directorio para el chat
   */
  getChatDirectory(chatId) {
    const chatDir = path.join(this.chatDocumentsDir, chatId);

    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
      console.log(`🦫 Acadel creó directorio para chat: ${chatId}`);
    }

    return chatDir;
  }

  /**
   * Genera un nombre de archivo único
   * @param {string} originalName - Nombre original del archivo
   * @returns {string} - Nombre de archivo único
   */
  generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);

    return `${baseName}_${timestamp}_${randomHash}${extension}`;
  }

  /**
   * 🦫 EXTRACCIÓN DE CONTENIDO CENTRALIZADA CON VALIDACIONES ACADEL
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} mimeType - Tipo MIME del archivo
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<string>} - Contenido extraído y validado
   */
  async extractContent(fileBuffer, mimeType, filename) {
    console.log(`🦫 Acadel extrayendo contenido: ${filename} (${mimeType})`);

    try {
      let rawContent = '';

      switch (mimeType) {
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          rawContent = await this.extractDocxContent(fileBuffer);
          break;

        case 'application/msword':
          throw new Error('Archivos .doc no soportados por Acadel, usa .docx en su lugar');

        // ⭐ TODOS LOS TIPOS DE TEXTO Y CÓDIGO ⭐
        case 'text/plain':
        case 'text/markdown':
        case 'text/csv':
        case 'text/rtf':

        // ✅ JAVASCRIPT - TODOS LOS MIME TYPES
        case 'text/javascript':
        case 'application/javascript':
        case 'application/x-javascript':    // ← ESTE ERA EL FALTANTE
        case 'text/ecmascript':
        case 'application/ecmascript':

        // ✅ TYPESCRIPT - TODOS LOS MIME TYPES
        case 'text/typescript':
        case 'application/typescript':
        case 'text/x-typescript':

        // ✅ PYTHON - TODOS LOS MIME TYPES
        case 'text/x-python':
        case 'application/x-python':
        case 'text/x-python-script':

        // ✅ JAVA - TODOS LOS MIME TYPES
        case 'text/x-java-source':
        case 'application/x-java':
        case 'text/x-java':

        // ✅ C/C++ - TODOS LOS MIME TYPES
        case 'text/x-c':
        case 'application/x-c':
        case 'text/x-c++':
        case 'application/x-c++':

        // ✅ C# - TODOS LOS MIME TYPES
        case 'text/x-csharp':
        case 'application/x-csharp':

        // ✅ WEB - TODOS LOS MIME TYPES
        case 'text/html':
        case 'application/xhtml+xml':
        case 'text/css':

        // ✅ DATOS - TODOS LOS MIME TYPES
        case 'text/xml':
        case 'application/xml':
        case 'application/json':
        case 'text/json':
        case 'application/yaml':
        case 'text/x-yaml':
        case 'text/yaml':

        // ✅ SQL - TODOS LOS MIME TYPES
        case 'application/x-sql':
        case 'text/x-sql':
        case 'text/sql':
          rawContent = await this.extractTextContent(fileBuffer);
          break;

        default:
          throw new Error(`Tipo de archivo no soportado por Acadel: ${mimeType}`);
      }

      // ⭐ VALIDAR CONTENIDO CON SISTEMA CENTRALIZADO ⭐
      const validation = validateTextContentBackend(rawContent, filename);

      if (validation.truncated) {
        console.log(`⚠️ Acadel truncó contenido: ${filename} (${rawContent.length} -> ${FILE_LIMITS.MAX_TEXT_CONTENT})`);
      }

      return validation.content;

    } catch (error) {
      console.error(`❌ Acadel error extrayendo contenido de ${filename}:`, error);
      throw error;
    }
  }


  /**
   * Extrae contenido de un archivo de texto plano
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} encoding - Codificación del archivo
   * @returns {Promise<string>} - Contenido extraído
   */
  async extractTextContent(fileBuffer, encoding = 'utf8') {
    try {
      const content = fileBuffer.toString(encoding);
      return content;
    } catch (error) {
      throw new Error(`Acadel no pudo leer el texto: ${error.message}`);
    }
  }

  /**
   * Extrae contenido de un documento Word (.docx)
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @returns {Promise<string>} - Contenido extraído
   */
  async extractDocxContent(fileBuffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } catch (error) {
      throw new Error(`Acadel no pudo procesar el DOCX: ${error.message}`);
    }
  }

  /**
   * Guarda un archivo en la base de datos
   * @param {Object} fileData - Datos del archivo
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async saveFileToDatabase(fileData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO file_attachments (
          chat_id, user_id, original_name, file_name, file_path, 
          file_size, mime_type, file_extension, attachment_type,
          extracted_content, language, is_processed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING file_id, id
      `;

      const values = [
        fileData.chatId,
        fileData.userId,
        fileData.originalName,
        fileData.fileName,
        fileData.filePath,
        fileData.fileSize,
        fileData.mimeType,
        fileData.fileExtension,
        fileData.attachmentType,
        fileData.extractedContent,
        fileData.language,
        true // is_processed
      ];

      const result = await client.query(insertQuery, values);
      await client.query('COMMIT');

      console.log(`✅ Acadel guardó en BD: ${fileData.originalName} (ID: ${result.rows[0].file_id})`);

      return {
        success: true,
        fileId: result.rows[0].file_id,
        dbId: result.rows[0].id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Acadel error guardando archivo en BD:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 🦫 PROCESA ARCHIVO DESDE URL CON VALIDACIONES ACADEL CENTRALIZADAS
   * @param {string} fileUrl - URL del archivo
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {string} originalName - Nombre original (opcional)
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processFileFromUrl(fileUrl, chatId, userId, originalName = null) {
    let tempFilePath = null;

    try {
      console.log(`🦫 Acadel procesando documento desde URL: ${fileUrl.substring(0, 100)}...`);

      // Verificar si la URL es ya una ruta local del servidor
      if (fileUrl.startsWith('/uploads/')) {
        console.log(`🦫 Acadel: El archivo ya está almacenado localmente: ${fileUrl}`);
        return {
          success: true,
          filePath: fileUrl,
          alreadyLocal: true
        };
      }

      // Preparar directorio y nombres de archivo
      const chatDir = this.getChatDirectory(chatId);
      const fileName = originalName
        ? this.generateUniqueFilename(originalName)
        : this.generateUniqueFilename('document');
      const finalPath = path.join(chatDir, fileName);

      // Crear archivo temporal
      const tempFileName = `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.tmp`;
      tempFilePath = path.join(this.tempDir, tempFileName);

      // Descargar el archivo
      console.log(`🦫 Acadel descargando archivo...`);
      const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: this.maxFileSize
      });

      // Obtener información del archivo
      const fileBuffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const fileSize = fileBuffer.length;

      // ⭐ VALIDAR CON SISTEMA CENTRALIZADO ACADEL ⭐
      const validation = validateFileTypeBackend(fileName, contentType, fileSize);
      if (!validation.valid) {
        throw new Error(`Acadel rechazó el archivo: ${validation.reason}`);
      }

      const fileInfo = this.supportedMimeTypes[contentType];
      if (!fileInfo) {
        // Intentar inferir MIME type por extensión
        const inferredMimeType = inferMimeTypeFromExtensionBackend(fileName);
        const inferredValidation = validateFileTypeBackend(fileName, inferredMimeType, fileSize);

        if (!inferredValidation.valid) {
          throw new Error(`Acadel no puede procesar este tipo de archivo: ${contentType}`);
        }

        console.log(`🦫 Acadel infirió MIME type: ${contentType} -> ${inferredMimeType}`);
        // Usar el tipo inferido
        const inferredFileInfo = this.supportedMimeTypes[inferredMimeType];
        if (inferredFileInfo) {
          fileInfo = inferredFileInfo;
          contentType = inferredMimeType;
        } else {
          throw new Error(`Acadel no soporta el tipo inferido: ${inferredMimeType}`);
        }
      }

      // Guardar archivo temporal
      await fs.promises.writeFile(tempFilePath, fileBuffer);

      // Extraer contenido
      console.log(`🦫 Acadel extrayendo contenido...`);
      const extractedContent = await this.extractContent(fileBuffer, contentType, fileName);
      const language = detectLanguageBackend(fileName, extractedContent);

      // Mover archivo a ubicación final
      await fs.promises.copyFile(tempFilePath, finalPath);

      // Limpiar archivo temporal
      await fs.promises.unlink(tempFilePath);
      tempFilePath = null;

      // Preparar datos para guardar en BD
      const fileData = {
        chatId,
        userId,
        originalName: originalName || fileName,
        fileName,
        filePath: path.join('/uploads/chat_documents', chatId, fileName).replace(/\\/g, '/'),
        fileSize: fileBuffer.length,
        mimeType: contentType,
        fileExtension: fileInfo.extension,
        attachmentType: fileInfo.type,
        extractedContent,
        language
      };

      // Guardar en base de datos
      const dbResult = await this.saveFileToDatabase(fileData);

      console.log(`🎉 Acadel procesó exitosamente: ${originalName || fileName}`);

      return {
        success: true,
        fileId: dbResult.fileId,
        filePath: fileData.filePath,
        extractedContent,
        attachmentType: fileInfo.type,
        language,
        originalName: fileData.originalName,
        fileSize: fileData.fileSize
      };

    } catch (error) {
      console.error('❌ Acadel error procesando archivo:', error);

      // Limpiar archivos temporales
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error('❌ Acadel error limpiando archivo temporal:', cleanupError);
        }
      }

      return {
        success: false,
        error: `Acadel no pudo procesar el archivo: ${error.message}`
      };
    }
  }

  /**
   * 🦫 PROCESA ARCHIVO EN BASE64 CON VALIDACIONES ACADEL CENTRALIZADAS
   * @param {string} dataUrl - Data URL del archivo
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {string} originalName - Nombre original del archivo
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processBase64File(dataUrl, chatId, userId, originalName) {
    let tempFilePath = null;

    try {
      console.log(`🦫 Acadel procesando archivo base64: ${originalName}`);

      // ⭐ VALIDACIONES INICIALES MEJORADAS ⭐
      if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error(`Data URL inválido para ${originalName} - tipo: ${typeof dataUrl}`);
      }

      if (dataUrl.trim() === '') {
        throw new Error(`Data URL vacío para ${originalName}`);
      }

      if (!dataUrl.startsWith('data:')) {
        throw new Error(`Data URL debe comenzar con "data:" para ${originalName}`);
      }

      if (!dataUrl.includes('base64,')) {
        throw new Error(`Data URL debe contener "base64," para ${originalName}`);
      }

      // ⭐ EXTRACCIÓN ROBUSTA CON MÚLTIPLES MÉTODOS DE FALLBACK ⭐
      let mimeType, base64Data;

      try {
        // Método 1: Regex más estricto
        const dataUrlRegex = /^data:([^;]+);base64,(.+)$/;
        const regexMatch = dataUrl.match(dataUrlRegex);

        if (regexMatch && regexMatch.length === 3) {
          mimeType = regexMatch[1].trim();
          base64Data = regexMatch[2].trim();
          console.log(`✅ Acadel: Extracción por regex exitosa - MIME: "${mimeType}"`);
        } else {
          throw new Error('Regex no coincide');
        }
      } catch (regexError) {
        console.warn(`⚠️ Acadel: Extracción por regex falló, intentando método directo...`);

        // Método 2: Extracción directa por índices
        try {
          const dataPrefix = 'data:';
          const base64Separator = ';base64,';

          const dataIndex = dataUrl.indexOf(dataPrefix);
          const base64Index = dataUrl.indexOf(base64Separator);

          if (dataIndex === 0 && base64Index > dataPrefix.length) {
            mimeType = dataUrl.substring(dataPrefix.length, base64Index).trim();
            base64Data = dataUrl.substring(base64Index + base64Separator.length).trim();
            console.log(`✅ Acadel: Extracción directa exitosa - MIME: "${mimeType}"`);
          } else {
            throw new Error(`Marcadores no encontrados correctamente`);
          }
        } catch (directError) {
          throw new Error(`Acadel no pudo extraer MIME type y base64 de ${originalName}`);
        }
      }

      // ⭐ VALIDACIONES POST-EXTRACCIÓN ⭐
      if (!mimeType || mimeType === '') {
        throw new Error(`MIME type vacío extraído para ${originalName}`);
      }

      if (!base64Data || base64Data === '') {
        throw new Error(`Datos base64 vacíos extraídos para ${originalName}`);
      }

      // Normalizar MIME type
      mimeType = mimeType.toLowerCase().trim();

      // ⭐ CONVERTIR BASE64 A BUFFER CON VALIDACIÓN ⭐
      let fileBuffer;
      try {
        fileBuffer = Buffer.from(base64Data, 'base64');

        if (fileBuffer.length === 0) {
          throw new Error('Buffer resultante vacío');
        }

        console.log(`✅ Acadel: Buffer creado - ${fileBuffer.length} bytes para ${originalName}`);
      } catch (bufferError) {
        throw new Error(`Acadel no pudo crear buffer para ${originalName}: ${bufferError.message}`);
      }

      // ⭐ VALIDAR CON SISTEMA CENTRALIZADO ACADEL ⭐
      const validation = validateFileTypeBackend(originalName, mimeType, fileBuffer.length);
      if (!validation.valid) {
        throw new Error(`Acadel rechazó el archivo: ${validation.reason}`);
      }

      // Verificar si el MIME type está soportado o necesita inferencia
      let finalMimeType = mimeType;
      let fileInfo = this.supportedMimeTypes[mimeType];

      if (!fileInfo) {
        console.log(`🦫 Acadel: MIME type no soportado directamente: "${mimeType}", infiriendo...`);
        finalMimeType = inferMimeTypeFromExtensionBackend(originalName);
        fileInfo = this.supportedMimeTypes[finalMimeType];

        if (!fileInfo) {
          throw new Error(`Acadel no soporta el tipo de archivo: "${mimeType}" -> "${finalMimeType}"`);
        }
      }

      // Preparar directorio y nombres de archivo
      const chatDir = this.getChatDirectory(chatId);
      const filename = this.generateUniqueFilename(originalName);
      const finalPath = path.join(chatDir, filename);

      // Crear archivo temporal
      const tempFileName = `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.tmp`;
      tempFilePath = path.join(this.tempDir, tempFileName);

      // Guardar archivo temporal
      await fs.promises.writeFile(tempFilePath, fileBuffer);

      // Extraer contenido
      console.log(`🦫 Acadel extrayendo contenido de ${originalName}...`);
      let extractedContent, language;
      try {
        extractedContent = await this.extractContent(fileBuffer, finalMimeType, filename);
        language = detectLanguageBackend(filename, extractedContent);
        console.log(`✅ Acadel: Contenido extraído - ${extractedContent.length} caracteres`);
      } catch (extractError) {
        console.error(`❌ Acadel error extrayendo contenido de ${originalName}:`, extractError);
        throw new Error(`Acadel no pudo extraer contenido de ${originalName}: ${extractError.message}`);
      }

      // Mover archivo a ubicación final
      try {
        await fs.promises.copyFile(tempFilePath, finalPath);
        console.log(`✅ Acadel: Archivo guardado en ${finalPath}`);
      } catch (saveError) {
        throw new Error(`Acadel no pudo guardar archivo ${originalName}: ${saveError.message}`);
      }

      // Limpiar archivo temporal
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
        tempFilePath = null;
      }

      // Preparar datos para BD
      const fileData = {
        chatId,
        userId,
        originalName,
        fileName: filename,
        filePath: path.join('/uploads/chat_documents', chatId, filename).replace(/\\/g, '/'),
        fileSize: fileBuffer.length,
        mimeType: finalMimeType,
        fileExtension: fileInfo.extension,
        attachmentType: fileInfo.type,
        extractedContent,
        language
      };

      // Guardar en base de datos
      let dbResult;
      try {
        dbResult = await this.saveFileToDatabase(fileData);
        console.log(`✅ Acadel: ${originalName} guardado en BD con ID ${dbResult.fileId}`);
      } catch (dbError) {
        // Si falla BD, limpiar archivo físico
        try {
          await fs.promises.unlink(finalPath);
        } catch (cleanupError) {
          console.error(`❌ Acadel error limpiando archivo tras fallo de BD:`, cleanupError);
        }
        throw new Error(`Acadel no pudo guardar ${originalName} en base de datos: ${dbError.message}`);
      }

      console.log(`🎉 Acadel procesó exitosamente: ${originalName} -> ${dbResult.fileId}`);

      return {
        success: true,
        fileId: dbResult.fileId,
        filePath: fileData.filePath,
        extractedContent,
        attachmentType: fileInfo.type,
        language,
        originalName: fileData.originalName,
        fileSize: fileData.fileSize
      };

    } catch (error) {
      console.error(`❌ Acadel error completo procesando ${originalName}:`, error);

      // Limpieza de archivos temporales
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error(`❌ Acadel error limpiando archivo temporal:`, cleanupError);
        }
      }

      return {
        success: false,
        error: `Acadel no pudo procesar archivo: ${error.message}`,
        originalName: originalName
      };
    }
  }

  /**
   * 🦫 PROCESA MÚLTIPLES DOCUMENTOS CON VALIDACIONES ACADEL
   * @param {Array} content - Contenido del mensaje
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} - Resultados del procesamiento
   */
  async processMultimodalDocuments(content, chatId, userId) {
    if (!content || !Array.isArray(content)) {
      return [];
    }

    // Filtrar items que sean archivos de documento
    const documentItems = content.filter(item =>
      item.type === 'file' ||
      (item.type === 'document' && (item.file_url || item.data_url))
    );

    if (documentItems.length === 0) {
      return [];
    }

    console.log(`🦫 Acadel procesando ${documentItems.length} documentos para chat ${chatId}`);

    // ⭐ VALIDAR CANTIDAD TOTAL CON SISTEMA CENTRALIZADO ⭐
    const countValidation = validateFileCountBackend(documentItems.length);
    if (!countValidation.valid) {
      console.error(`❌ Acadel rechazó cantidad de archivos: ${countValidation.reason}`);
      return [{
        success: false,
        error: countValidation.reason,
        errorCode: countValidation.errorCode
      }];
    }

    // Procesar todos los archivos en paralelo
    const documentPromises = documentItems.map(async (item, index) => {
      console.log(`🦫 Acadel procesando documento ${index + 1}/${documentItems.length}`);

      try {
        let result;

        if (item.file_url) {
          // Archivo desde URL
          result = await this.processFileFromUrl(
            item.file_url,
            chatId,
            userId,
            item.name || item.filename
          );
        } else if (item.data_url) {
          // Archivo en base64
          result = await this.processBase64File(
            item.data_url,
            chatId,
            userId,
            item.name || item.filename || 'documento'
          );
        } else {
          throw new Error('Acadel no encontró URL o datos del archivo');
        }

        return {
          success: result.success,
          originalItem: item,
          ...result
        };

      } catch (error) {
        console.error(`❌ Acadel error procesando documento:`, error);
        return {
          success: false,
          originalItem: item,
          error: error.message
        };
      }
    });

    const results = await Promise.all(documentPromises);

    // Registrar estadísticas
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`📊 Acadel completó procesamiento: ${successCount} exitosos, ${failCount} fallidos`);

    return results;
  }

  /**
   * 🦫 PROCESA DOCUMENTOS PARA RETRY/EDIT SIN GUARDAR NUEVOS ARCHIVOS
   * @param {Array} content - Contenido del mensaje
   * @param {string} chatId - ID del chat
   * @param {number} userId - ID del usuario
   * @param {boolean} isRetryOrEdit - Flag indicando que es retry/edit
   * @returns {Promise<Array>} - Resultados del procesamiento
   */
  async processMultimodalDocumentsForRetryEdit(content, chatId, userId, isRetryOrEdit = true) {
    if (!content || !Array.isArray(content)) {
      return [];
    }

    // Filtrar items que sean archivos de documento
    const documentItems = content.filter(item =>
      item && (
        item.type === 'file' ||
        item.type === 'document' ||
        (item.type === 'application' && (item.file_url || item.data_url)) ||
        item._retrievedFromBackend
      )
    );

    if (documentItems.length === 0) {
      return [];
    }

    console.log(`🦫 Acadel [RETRY/EDIT] procesando ${documentItems.length} documentos para chat ${chatId}`);

    // Procesar documentos con recuperación automática de contenido
    const results = await Promise.all(documentItems.map(async (item, index) => {
      console.log(`🦫 Acadel [RETRY/EDIT] procesando documento ${index + 1}/${documentItems.length}: ${item.name || item.filename || 'documento'}`);

      try {
        // Si es un archivo recuperado del backend, ya está procesado
        if (item._retrievedFromBackend) {
          return {
            success: true,
            originalItem: item,
            fileId: item._originalFileId,
            filePath: item._originalFilePath,
            extractedContent: item.extractedContent || '',
            attachmentType: item._attachmentType || item.attachment_type,
            language: item._language || item.language,
            originalName: item.name || item.filename,
            fileSize: item.file_size || 0
          };
        }

        // Si tiene contenido directo, usarlo
        if (item.extractedContent) {
          return {
            success: true,
            originalItem: item,
            fileId: item.fileId || null,
            filePath: item.filePath || null,
            extractedContent: item.extractedContent,
            attachmentType: item.attachment_type || 'document',
            language: item.language || null,
            originalName: item.name || item.filename || 'documento',
            fileSize: item.fileSize || 0
          };
        }

        // ⭐ NUEVA LÓGICA: Recuperar contenido de BD si tiene fileId ⭐
        if (item.fileId) {
          console.log(`🔍 Acadel [RETRY/EDIT] recuperando contenido desde BD para: ${item.fileId}`);

          const retrievedDoc = await this.getDocumentContentForRetryEdit(item.fileId);

          if (retrievedDoc && retrievedDoc.success) {
            return {
              success: true,
              originalItem: item,
              fileId: retrievedDoc.fileId,
              filePath: retrievedDoc.filePath,
              extractedContent: retrievedDoc.extractedContent,
              attachmentType: retrievedDoc.attachmentType,
              language: retrievedDoc.language,
              originalName: retrievedDoc.originalName,
              fileSize: retrievedDoc.fileSize
            };
          }
        }

        // ⭐ NUEVA LÓGICA: Buscar por nombre si no tiene fileId ⭐
        if ((item.name || item.filename) && !item.fileId) {
          console.log(`🔍 Acadel [RETRY/EDIT] buscando documento por nombre: ${item.name || item.filename}`);

          const client = await pool.connect();
          try {
            const searchQuery = `
              SELECT file_id, original_name, file_name, file_path, file_size, 
                     mime_type, file_extension, attachment_type, extracted_content, 
                     language, created_at
              FROM file_attachments 
              WHERE chat_id = $1 
                AND user_id = $2 
                AND (original_name = $3 OR file_name LIKE $4)
              ORDER BY created_at DESC
              LIMIT 1
            `;

            const searchName = item.name || item.filename;
            const result = await client.query(searchQuery, [
              chatId,
              userId,
              searchName,
              `%${searchName}%`
            ]);

            if (result.rows.length > 0) {
              const doc = result.rows[0];
              console.log(`✅ Acadel [RETRY/EDIT] documento encontrado por nombre: ${doc.original_name}`);

              return {
                success: true,
                originalItem: item,
                fileId: doc.file_id,
                filePath: doc.file_path,
                extractedContent: doc.extracted_content || '',
                attachmentType: doc.attachment_type,
                language: doc.language,
                originalName: doc.original_name,
                fileSize: doc.file_size
              };
            }
          } catch (searchError) {
            console.error(`❌ Acadel error buscando documento por nombre:`, searchError);
          } finally {
            client.release();
          }
        }

        // Si llegamos aquí, no pudimos recuperar el contenido
        console.warn(`⚠️ Acadel [RETRY/EDIT] no pudo recuperar contenido para: ${item.name || item.filename || 'documento sin nombre'}`);

        return {
          success: false,
          originalItem: item,
          error: `Acadel no pudo recuperar contenido del documento: ${item.name || item.filename || 'documento'}`
        };

      } catch (error) {
        console.error(`❌ Acadel [RETRY/EDIT] error procesando documento:`, error);

        return {
          success: false,
          originalItem: item,
          error: error.message
        };
      }
    }));

    // Registrar estadísticas
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`📊 Acadel [RETRY/EDIT] completó: ${successCount} exitosos, ${failCount} fallidos`);

    // Log detallado de documentos exitosos
    const successfulDocs = results.filter(r => r.success);
    successfulDocs.forEach(doc => {
      console.log(`✅ Acadel [RETRY/EDIT] documento exitoso:`, {
        nombre: doc.originalName,
        fileId: doc.fileId,
        contentLength: doc.extractedContent?.length || 0,
        tipo: doc.attachmentType,
        lenguaje: doc.language
      });
    });

    // Log detallado de documentos fallidos
    const failedDocs = results.filter(r => !r.success);
    failedDocs.forEach(doc => {
      console.warn(`❌ Acadel [RETRY/EDIT] documento fallido:`, {
        nombre: doc.originalItem?.name || doc.originalItem?.filename || 'sin nombre',
        error: doc.error,
        fileId: doc.originalItem?.fileId || 'N/A'
      });
    });

    return results;
  }

  /**
   * Obtiene un archivo por su ID
   * @param {string} fileId - ID del archivo
   * @returns {Promise<Object|null>} - Datos del archivo o null
   */
  async getFileById(fileId) {
    const client = await pool.connect();

    try {
      const query = `
        SELECT * FROM file_attachments 
        WHERE file_id = $1
      `;

      const result = await client.query(query, [fileId]);

      if (result.rows.length === 0) {
        return null;
      }

      // Actualizar accessed_at
      await client.query(
        'UPDATE file_attachments SET accessed_at = NOW() WHERE file_id = $1',
        [fileId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('❌ Acadel error obteniendo archivo:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina archivos de un chat
   * @param {string} chatId - ID del chat
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async deleteFilesForChat(chatId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Obtener archivos del chat
      const filesQuery = 'SELECT file_path FROM file_attachments WHERE chat_id = $1';
      const filesResult = await client.query(filesQuery, [chatId]);

      // Eliminar archivos físicos
      for (const row of filesResult.rows) {
        const fullPath = path.join(process.cwd(), row.file_path.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      }

      // Eliminar registros de la BD
      await client.query('DELETE FROM file_attachments WHERE chat_id = $1', [chatId]);

      // Eliminar directorio del chat si está vacío
      const chatDir = path.join(this.chatDocumentsDir, chatId);
      if (fs.existsSync(chatDir)) {
        const files = fs.readdirSync(chatDir);
        if (files.length === 0) {
          fs.rmdirSync(chatDir);
        }
      }

      await client.query('COMMIT');
      console.log(`🦫 Acadel eliminó archivos del chat ${chatId}`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Acadel error eliminando archivos del chat ${chatId}:`, error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica si un tipo MIME está soportado
   * @param {string} mimeType - Tipo MIME a verificar
   * @returns {boolean} - true si está soportado
   */
  isSupportedMimeType(mimeType) {
    return !!this.supportedMimeTypes[mimeType];
  }

  /**
   * 🦫 OBTIENE INFORMACIÓN SOBRE TIPOS SOPORTADOS CON CONFIGURACIÓN ACADEL
   * @returns {Object} - Información de tipos soportados
   */
  getSupportedTypes() {
    console.log(`🦫 Acadel proporcionando información de tipos soportados`);

    return {
      mimeTypes: Object.keys(this.supportedMimeTypes),
      extensions: Object.values(this.supportedMimeTypes).map(info => info.extension),
      types: [...new Set(Object.values(this.supportedMimeTypes).map(info => info.type))],
      limits: {
        maxFileSize: this.maxFileSize,
        maxTextContent: this.maxContentLength,
        maxFilesPerQuery: this.maxFilesPerQuery
      },
      categories: {
        images: {
          mimeTypes: SUPPORTED_FILES.IMAGES.mimeTypes,
          extensions: SUPPORTED_FILES.IMAGES.extensions,
          description: SUPPORTED_FILES.IMAGES.description
        },
        documents: {
          mimeTypes: Object.keys(SUPPORTED_FILES.DOCUMENTS.mimeTypes),
          extensions: SUPPORTED_FILES.DOCUMENTS.extensions,
          description: SUPPORTED_FILES.DOCUMENTS.description
        },
        code: {
          mimeTypes: Object.keys(SUPPORTED_FILES.CODE.mimeTypes),
          extensions: SUPPORTED_FILES.CODE.extensions,
          description: SUPPORTED_FILES.CODE.description
        }
      },
      forbidden: {
        extensions: FORBIDDEN_FILES.BLOCKED_EXTENSIONS,
        mimeTypes: FORBIDDEN_FILES.BLOCKED_MIME_TYPES,
        reasons: FORBIDDEN_FILES.REASONS
      }
    };
  }

  /**
   * Verifica si un archivo existe por su path
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>} - true si existe
   */
  async verifyFileExists(filePath) {
    try {
      // Construir ruta completa del archivo
      const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));

      // Verificar que el archivo existe físicamente
      return fs.existsSync(fullPath);
    } catch (error) {
      console.error('❌ Acadel error verificando existencia de archivo:', error);
      return false;
    }
  }

  /**
   * Obtiene contenido de archivo existente
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<string|null>} - Contenido del archivo o null
   */
  async getExistingFileContent(filePath) {
    try {
      // Construir ruta completa del archivo
      const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));

      // Verificar que el archivo existe
      if (!fs.existsSync(fullPath)) {
        return null;
      }

      // Leer el archivo
      const content = await fs.promises.readFile(fullPath, 'utf8');
      return content;
    } catch (error) {
      console.error('❌ Acadel error leyendo contenido de archivo existente:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export const documentStorageService = new DocumentStorageService();

console.log('🎉 Acadel Document Storage Service cargado y listo');