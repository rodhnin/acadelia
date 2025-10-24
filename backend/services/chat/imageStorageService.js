// backend/services/chat/imageStorageService.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import sharp from 'sharp';
import ImageSecurityService from './imageSecurityService.js'; // Importar el servicio específico para imágenes

/**
 * Servicio para almacenar y optimizar imágenes enviadas en chats multimodales
 */
class ImageStorageService {
  constructor() {
    // Configuración de rutas
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.chatImagesDir = path.join(this.uploadsDir, 'chat_images');
    this.tempDir = path.join(process.cwd(), 'tmp', 'image_security');

    // Configuración de optimización
    this.maxImageWidth = 1600;
    this.compressionQuality = 85;
    this.maxImageSizeBytes = 5 * 1024 * 1024; // 5MB

    // Configuración de seguridad
    this.antivirusScanEnabled = true;

    // Inicialización
    this.ensureDirectoriesExist();

    // Limpieza de inicio (sin await para no bloquear constructor)
    this.performStartupCleanup().catch(error => {
      console.warn('Error en limpieza de inicio:', error.message);
    });
  }

  /**
   * Asegura que existan los directorios necesarios
   */
  ensureDirectoriesExist() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    if (!fs.existsSync(this.chatImagesDir)) {
      fs.mkdirSync(this.chatImagesDir, { recursive: true });
    }

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Crea un directorio específico para el chat si no existe
   * @param {string} chatId - ID del chat
   * @returns {string} - Ruta del directorio para el chat
   */
  getChatDirectory(chatId) {
    const chatDir = path.join(this.chatImagesDir, chatId);

    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }

    return chatDir;
  }

  /**
   * Genera un nombre de archivo único para la imagen
   * @param {string} originalUrl - URL original de la imagen
   * @returns {string} - Nombre de archivo único
   */
  generateUniqueFilename(originalUrl) {
    // Generar un hash del URL original para evitar duplicados
    const hash = crypto.createHash('md5').update(originalUrl).digest('hex');
    const timestamp = Date.now();
    return `image_${timestamp}_${hash.substring(0, 8)}.webp`; // Usar WebP por defecto
  }

  /**
   * *** NUEVO: Convierte imagen local a base64 para retry/edit ***
   * @param {string} localPath - Ruta local de la imagen
   * @returns {Promise<Object>} - Resultado con base64
   */
  async convertLocalImageToBase64(localPath) {
    try {
      console.log(`🔄 Convirtiendo imagen local a base64 para retry/edit: ${localPath}`);

      // Construir ruta completa del archivo
      const fullPath = path.join(process.cwd(), localPath.replace(/^\//, ''));

      // Verificar que el archivo existe
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ Archivo de imagen no encontrado: ${fullPath}`);
        return {
          success: false,
          error: 'Archivo de imagen no encontrado'
        };
      }

      // Leer el archivo
      const imageBuffer = fs.readFileSync(fullPath);

      // Determinar el tipo MIME basado en la extensión
      const extension = path.extname(fullPath).toLowerCase();
      let mimeType = 'image/webp'; // Por defecto

      switch (extension) {
        case '.png':
          mimeType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        default:
          mimeType = 'image/webp';
      }

      // Convertir a base64
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      console.log(`✅ Imagen convertida a base64 exitosamente: ${localPath} (${mimeType}, ${Math.round(base64Data.length / 1024)}KB)`);

      return {
        success: true,
        dataUrl: dataUrl,
        mimeType: mimeType,
        size: imageBuffer.length,
        originalPath: localPath
      };

    } catch (error) {
      console.error(`❌ Error convirtiendo imagen local a base64:`, error);
      return {
        success: false,
        error: `Error convirtiendo imagen: ${error.message}`
      };
    }
  }

  /**
   * Escanea una imagen con antivirus
   * @param {string} filePath - Ruta al archivo a escanear
   * @returns {Promise<Object>} - Resultado del escaneo
   */
  async scanImageWithAntivirus(filePath) {
    if (!this.antivirusScanEnabled) {
      return { clean: true, skipped: true, message: 'Escaneo antivirus deshabilitado' };
    }

    try {
      console.log(`Escaneando imagen con antivirus: ${filePath}`);
      // Usar el servicio específico para imágenes para escanear
      const scanResult = await ImageSecurityService.scanFile(filePath);
      console.log(`Resultado del escaneo antivirus: ${scanResult.clean ? 'Limpio' : 'Infectado'}`);
      return scanResult;
    } catch (error) {
      console.error('Error en escaneo antivirus de imagen:', error);
      return {
        clean: true,
        skipped: true,
        error: error.message,
        message: 'Error durante el escaneo antivirus'
      };
    }
  }

  /**
   * ✅ FUNCIÓN SIMPLIFICADA: optimizeImage ahora usa la función central
   */
  async optimizeImage(input, outputPath) {
    try {
      return await this.processWithSharp(input, outputPath);
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      return false;
    }
  }

  /**
   * ✅ FUNCIÓN CENTRAL: Manejo seguro de instancias Sharp
   */
  async processWithSharp(input, outputPath) {
    let sharpInstance = null;

    try {
      sharpInstance = sharp(input);
      const metadata = await sharpInstance.metadata();

      let transformer = sharpInstance;

      // Redimensionar si es necesario
      if (metadata.width > this.maxImageWidth) {
        transformer = transformer.resize({
          width: this.maxImageWidth,
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convertir a WebP
      transformer = transformer.webp({
        quality: this.compressionQuality,
        effort: 6
      });

      // Usar buffer para evitar handles de archivo
      const optimizedBuffer = await transformer.toBuffer();

      // Escribir archivo
      await fs.promises.writeFile(outputPath, optimizedBuffer);

      return true;
    } finally {
      // ✅ CRÍTICO: Siempre liberar recursos
      if (sharpInstance) {
        try {
          sharpInstance.destroy();
        } catch (error) {
          console.warn('Error liberando Sharp:', error.message);
        }
      }
      // Pausa para liberación de handles en Windows
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * ✅ FUNCIÓN UNIFICADA: Eliminación segura de archivos temporales
   */
  async safeDeleteTempFile(filePath, maxRetries = 5) {
    if (!filePath || !fs.existsSync(filePath)) {
      return true;
    }

    // Pausa inicial para liberación de handles
    await new Promise(resolve => setTimeout(resolve, 150));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!fs.existsSync(filePath)) {
          return true;
        }

        await fs.promises.unlink(filePath);
        console.log(`✅ Archivo temporal eliminado: ${path.basename(filePath)}`);
        return true;
      } catch (error) {
        const isWindowsError = ['EBUSY', 'ENOENT', 'EPERM', 'EMFILE'].includes(error.code);

        if (isWindowsError && attempt < maxRetries) {
          const waitTime = Math.min(500 * Math.pow(2, attempt), 3000);
          console.log(`⏳ Reintentando eliminación en ${waitTime}ms (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          console.warn(`⚠️ Eliminación fallida: ${path.basename(filePath)} - ${error.code}`);
          this.scheduleDelayedCleanup(filePath);
          return false;
        }
      }
    }
    return false;
  }

  /**
   * ✅ FUNCIÓN SIMPLIFICADA: Limpieza retrasada (reemplaza las múltiples funciones)
   */
  scheduleDelayedCleanup(filePath) {
    const fileName = path.basename(filePath);

    // Limpieza a los 30 segundos
    setTimeout(async () => {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log(`🧹 Limpieza retrasada exitosa: ${fileName}`);
        }
      } catch (error) {
        console.log(`⚠️ Limpieza retrasada falló: ${fileName} - ${error.code}`);
        // Marcar para limpieza al reinicio si falla
        this.markForStartupCleanup(filePath);
      }
    }, 30000);
  }

  /**
   * ✅ FUNCIÓN SIMPLIFICADA: Marcar para limpieza al inicio
   */
  markForStartupCleanup(filePath) {
    try {
      const cleanupFile = path.join(this.tempDir, 'cleanup_queue.txt');
      fs.appendFileSync(cleanupFile, `${filePath}\n`);
    } catch (error) {
      console.warn(`⚠️ No se pudo marcar archivo: ${error.message}`);
    }
  }

  /**
   * ✅ FUNCIÓN DE INICIO: Limpieza de archivos huérfanos
   */
  async performStartupCleanup() {
    try {
      const cleanupFile = path.join(this.tempDir, 'cleanup_queue.txt');

      if (!fs.existsSync(cleanupFile)) return;

      const content = fs.readFileSync(cleanupFile, 'utf8');
      const filePaths = content.split('\n').filter(line => line.trim());

      let cleanedCount = 0;
      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          try {
            await fs.promises.unlink(filePath);
            cleanedCount++;
          } catch (error) {
            console.log(`⚠️ Archivo huérfano persistente: ${path.basename(filePath)}`);
          }
        }
      }

      fs.unlinkSync(cleanupFile);

      if (cleanedCount > 0) {
        console.log(`🧹 Limpieza de inicio: ${cleanedCount} archivos eliminados`);
      }
    } catch (error) {
      console.warn(`⚠️ Error en limpieza de inicio: ${error.message}`);
    }
  }

  /**
   * ✅ FUNCIÓN PRINCIPAL OPTIMIZADA: Sin redundancias
   */
  async saveImageFromUrl(imageUrl, chatId, isRetryOrEdit = false) {
    let tempFilePath = null;

    try {
      // Detectar si la URL es una ruta local
      if (imageUrl.startsWith('/uploads/')) {
        console.log(`Imagen local: ${imageUrl}`);

        if (isRetryOrEdit) {
          const base64Result = await this.convertLocalImageToBase64(imageUrl);
          return {
            success: base64Result.success,
            filePath: base64Result.success ? imageUrl : null,
            dataUrl: base64Result.dataUrl,
            error: base64Result.error,
            securityInfo: {
              localPath: true,
              convertedToBase64: base64Result.success
            }
          };
        }

        return {
          success: true,
          filePath: imageUrl,
          error: null,
          securityInfo: { localPath: true }
        };
      }

      // Procesar data URLs
      if (imageUrl.startsWith('data:image')) {
        return await this.saveBase64Image(imageUrl, chatId);
      }

      // Configuración de archivos
      const chatDir = this.getChatDirectory(chatId);
      const filename = this.generateUniqueFilename(imageUrl);
      const finalPath = path.join(chatDir, filename);

      const tempFileName = `temp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.tmp`;
      tempFilePath = path.join(this.tempDir, tempFileName);

      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Descargar imagen
      console.log(`Descargando imagen desde: ${imageUrl.substring(0, 100)}...`);
      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: this.maxImageSizeBytes
      });

      const imageBuffer = Buffer.from(response.data);

      // Verificar firma
      const signatureCheck = ImageSecurityService.verifyImageSignature(imageBuffer);
      if (!signatureCheck.valid) {
        return {
          success: false,
          filePath: null,
          error: `Archivo no válido: ${signatureCheck.message}`,
          securityInfo: { format: signatureCheck.format }
        };
      }

      // Escribir archivo temporal
      try {
        await fs.promises.writeFile(tempFilePath, imageBuffer, { flag: 'wx' });
      } catch (writeError) {
        if (writeError.code === 'EEXIST') {
          const newName = `temp_${Date.now()}_${crypto.randomBytes(12).toString('hex')}.tmp`;
          tempFilePath = path.join(this.tempDir, newName);
          await fs.promises.writeFile(tempFilePath, imageBuffer, { flag: 'wx' });
        } else {
          throw writeError;
        }
      }

      // Escanear con antivirus
      const scanResult = await this.scanImageWithAntivirus(tempFilePath);
      if (!scanResult.clean && !scanResult.skipped) {
        await this.safeDeleteTempFile(tempFilePath);
        return {
          success: false,
          filePath: null,
          error: `Contenido malicioso detectado: ${scanResult.message}`,
          securityInfo: { scanResult }
        };
      }

      // ✅ OPTIMIZACIÓN: Usar función central para procesar con Sharp
      console.log(`Optimizando imagen: ${tempFilePath} -> ${finalPath}`);
      const optimized = await this.processWithSharp(imageBuffer, finalPath);

      // ✅ LIMPIEZA UNIFICADA: Una sola llamada
      await this.safeDeleteTempFile(tempFilePath);
      tempFilePath = null;

      if (!optimized) {
        return {
          success: false,
          filePath: null,
          error: 'Error al optimizar la imagen',
          securityInfo: { optimizationFailed: true }
        };
      }

      const relativePath = path.join('/uploads/chat_images', chatId, filename);
      console.log(`✅ Imagen procesada: ${relativePath}`);

      return {
        success: true,
        filePath: relativePath.replace(/\\/g, '/'),
        error: null,
        securityInfo: {
          scanned: !scanResult.skipped,
          clean: scanResult.clean,
          sanitized: true,
          format: signatureCheck.format
        }
      };
    } catch (error) {
      console.error('Error procesando imagen:', error);

      if (tempFilePath) {
        await this.safeDeleteTempFile(tempFilePath);
      }

      return {
        success: false,
        filePath: null,
        error: `Error: ${error.message}`,
        securityInfo: { error: error.message }
      };
    }
  }


  /**
   * Busca si una imagen ya existe en el sistema
   * @param {string} imageUrl - URL de la imagen
   * @param {string} chatId - ID del chat
   * @returns {Promise<string|null>} - Ruta de la imagen si existe, null si no
   */
  async findExistingImage(imageUrl, chatId) {
    try {
      // NUEVA VERIFICACIÓN: Si la URL ya es una ruta local, verificar que existe
      if (imageUrl.startsWith('/uploads/')) {
        const fullPath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          console.log(`✅ Ruta local verificada: ${imageUrl}`);
          return imageUrl;
        } else {
          console.log(`❌ Ruta local no existe: ${imageUrl}`);
          return null;
        }
      }

      // *** MEJORADO: Cache en memoria para búsquedas recientes ***
      const cacheKey = `${chatId}:${crypto.createHash('md5').update(imageUrl).digest('hex')}`;

      if (!this._searchCache) {
        this._searchCache = new Map();
      }

      // Verificar cache en memoria (válido por 30 segundos)
      const cached = this._searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 30000) {
        console.log(`📦 Cache búsqueda hit: ${cached.result || 'null'}`);
        return cached.result;
      }

      // Generar hash de la URL para buscar
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const hashPrefix = hash.substring(0, 8);

      // Obtener el directorio del chat
      const chatDir = this.getChatDirectory(chatId);

      let result = null;

      // Verificar si existen archivos con este hash
      if (fs.existsSync(chatDir)) {
        const files = fs.readdirSync(chatDir);

        // Buscar archivos que contengan el hash en su nombre
        const matchingFiles = files.filter(filename =>
          filename.includes(hashPrefix) && filename.endsWith('.webp')
        );

        if (matchingFiles.length > 0) {
          // *** NUEVO: Verificar que el archivo realmente existe y es válido ***
          for (const fileName of matchingFiles) {
            const fullPath = path.join(chatDir, fileName);
            if (fs.existsSync(fullPath)) {
              const stats = fs.statSync(fullPath);
              if (stats.size > 0) { // Archivo no vacío
                result = path.join('/uploads/chat_images', chatId, fileName).replace(/\\/g, '/');
                console.log(`✅ Imagen existente encontrada y verificada: ${result}`);
                break;
              }
            }
          }
        }
      }

      // *** NUEVO: Guardar en cache en memoria ***
      this._searchCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      // *** NUEVO: Limpiar cache periódicamente ***
      if (this._searchCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of this._searchCache.entries()) {
          if (now - value.timestamp > 60000) { // Limpiar entradas > 1 minuto
            this._searchCache.delete(key);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Error buscando imagen existente:', error);
      return null;
    }
  }

  /**
   * Procesa imágenes en formato base64 con escaneo antivirus
   * @param {string} dataUrl - Data URL (base64) de la imagen
   * @param {string} chatId - ID del chat
   * @returns {Promise<{success: boolean, filePath: string, error: string|null, securityInfo: Object}>} - Resultado
   */
  async saveBase64Image(dataUrl, chatId) {
    let tempFilePath = null;

    try {
      // Extraer los datos binarios del data URL
      const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        return {
          success: false,
          filePath: null,
          error: 'Formato de data URL inválido',
          securityInfo: {
            issues: ['Formato de data URL inválido']
          }
        };
      }

      // Extraer tipo MIME y datos
      const mimeType = matches[1];
      const base64Data = matches[2];

      // Verificar que es una imagen
      if (!mimeType.startsWith('image/')) {
        return {
          success: false,
          filePath: null,
          error: 'El data URL no corresponde a una imagen',
          securityInfo: {
            issues: ['Tipo MIME no válido para una imagen']
          }
        };
      }

      // Preparar directorio y nombres de archivo
      const chatDir = this.getChatDirectory(chatId);
      const filename = this.generateUniqueFilename(dataUrl.substring(0, 50));
      const finalFilePath = path.join(chatDir, filename);

      // Crear nombre único para archivo temporal
      const tempFileName = `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.tmp`;
      tempFilePath = path.join(this.tempDir, tempFileName);

      // Asegurar que existe el directorio temporal
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Convertir base64 a buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Verificar tamaño máximo
      if (imageBuffer.length > this.maxImageSizeBytes) {
        return {
          success: false,
          filePath: null,
          error: `Imagen demasiado grande (máximo ${this.maxImageSizeBytes / (1024 * 1024)}MB)`,
          securityInfo: {
            issues: ['Imagen demasiado grande']
          }
        };
      }

      // Verificar firma de archivo para confirmar que es una imagen válida
      const signatureCheck = ImageSecurityService.verifyImageSignature(imageBuffer);

      if (!signatureCheck.valid) {
        return {
          success: false,
          filePath: null,
          error: `Archivo no válido: ${signatureCheck.message}`,
          securityInfo: {
            format: signatureCheck.format,
            message: signatureCheck.message
          }
        };
      }

      // Guardar en archivo temporal para escaneo
      await fs.promises.writeFile(tempFilePath, imageBuffer);

      // ESCANEAR CON ANTIVIRUS
      console.log(`Escaneando imagen base64 con antivirus: ${tempFilePath}`);
      const scanResult = await this.scanImageWithAntivirus(tempFilePath);

      // Si se encuentra malware, rechazar la imagen
      if (!scanResult.clean && !scanResult.skipped) {
        console.log(`🚨 Malware detectado en imagen base64: ${scanResult.message || 'Amenaza desconocida'}`);

        // Eliminar archivo temporal
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
          tempFilePath = null;
        }

        return {
          success: false,
          filePath: null,
          error: `Se detectó contenido malicioso en la imagen: ${scanResult.message || 'Amenaza desconocida'}`,
          securityInfo: {
            scanResult
          }
        };
      }

      // Optimizar la imagen
      console.log(`Optimizando imagen base64: ${tempFilePath} -> ${finalFilePath}`);
      const optimized = await this.optimizeImage(tempFilePath, finalFilePath);

      // Eliminar archivo temporal
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
        tempFilePath = null;
      }

      // Si la optimización falló, intentar guardar directamente
      if (!optimized && !fs.existsSync(finalFilePath)) {
        console.log(`⚠️ Optimización fallida, guardando imagen original`);
        await fs.promises.writeFile(finalFilePath, imageBuffer);
      }

      // Generar ruta relativa para guardar en BD
      const relativePath = path.join('/uploads/chat_images', chatId, filename);
      console.log(`✅ Imagen base64 procesada y guardada: ${relativePath}`);

      return {
        success: true,
        filePath: relativePath.replace(/\\/g, '/'), // Asegurar formato de ruta compatible
        error: null,
        securityInfo: {
          scanned: !scanResult.skipped,
          clean: scanResult.clean,
          sanitized: optimized,
          format: signatureCheck.format
        }
      };
    } catch (error) {
      console.error('Error al procesar imagen base64:', error);

      // Limpieza de archivos temporales en caso de error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error('Error limpiando archivo temporal:', cleanupError);
        }
      }

      return {
        success: false,
        filePath: null,
        error: `Error al procesar imagen base64: ${error.message}`,
        securityInfo: {
          error: error.message
        }
      };
    }
  }

  /**
   * *** MODIFICADO: Procesa múltiples imágenes con flag para retry/edit ***
   * @param {Array} content - Contenido del mensaje (con items tipo image_url)
   * @param {string} chatId - ID del chat
   * @param {boolean} isRetryOrEdit - Si es un retry o edit (NUEVO PARÁMETRO)
   * @returns {Promise<Array>} - Array con las imágenes procesadas y sus rutas
   */
  async processMultimodalImages(content, chatId, isRetryOrEdit = false) {
    if (!content || !Array.isArray(content)) {
      return [];
    }

    const imageItems = content.filter(item => item.type === 'image_url');

    if (imageItems.length === 0) {
      return [];
    }

    console.log(`🖼️ Procesando ${imageItems.length} imágenes para chat ${chatId} ${isRetryOrEdit ? '(RETRY/EDIT)' : ''} con escaneo antivirus`);

    // Procesar todas las imágenes en paralelo
    const imagePromises = imageItems.map(async (item, index) => {
      console.log(`Procesando imagen ${index + 1}/${imageItems.length} ${isRetryOrEdit ? '(retry/edit)' : ''}`);

      // Determinar la URL de la imagen según formato
      const imageUrl = typeof item.image_url === 'string'
        ? item.image_url
        : (item.image_url?.url || null);

      if (!imageUrl) {
        return {
          success: false,
          originalItem: item,
          savedPath: null,
          error: 'URL de imagen no válida',
          securityInfo: {
            scanned: false,
            issues: ['URL de imagen no válida']
          }
        };
      }

      // *** MODIFICADO: Pasar flag de retry/edit ***
      const result = await this.saveImageFromUrl(imageUrl, chatId, isRetryOrEdit);

      return {
        success: result.success,
        originalItem: item,
        savedPath: result.filePath,
        dataUrl: result.dataUrl, // *** NUEVO: Incluir base64 cuando aplique ***
        error: result.error,
        securityInfo: result.securityInfo || {}
      };
    });

    const results = await Promise.all(imagePromises);

    // Registrar estadísticas de procesamiento
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const securityIssues = results.filter(r =>
      r.securityInfo && r.securityInfo.scanResult &&
      !r.securityInfo.scanResult.clean && !r.securityInfo.scanResult.skipped
    ).length;

    console.log(`📊 Imágenes procesadas: ${successCount} exitosas, ${failCount} fallidas, ${securityIssues} con problemas de seguridad`);

    return results;
  }

  /**
   * Elimina las imágenes asociadas a un chat cuando se elimina el chat
   * @param {string} chatId - ID del chat
   * @returns {Promise<boolean>} - true si se eliminaron correctamente
   */
  async deleteImagesForChat(chatId) {
    try {
      const chatDir = path.join(this.chatImagesDir, chatId);

      if (fs.existsSync(chatDir)) {
        // Eliminar directorio recursivamente
        this.deleteFolderRecursive(chatDir);
        console.log(`Imágenes eliminadas para chat ${chatId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error al eliminar imágenes para chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Elimina un directorio y todo su contenido
   * @param {string} dir - Directorio a eliminar
   */
  deleteFolderRecursive(dir) {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const curPath = path.join(dir, file);

        if (fs.lstatSync(curPath).isDirectory()) {
          // Recursivamente eliminar subdirectorio
          this.deleteFolderRecursive(curPath);
        } else {
          // Eliminar archivo
          fs.unlinkSync(curPath);
        }
      });

      // Eliminar directorio vacío
      fs.rmdirSync(dir);
    }
  }
}

// Exportar instancia singleton
export const imageStorageService = new ImageStorageService();