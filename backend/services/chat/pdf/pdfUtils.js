// src/services/chat/pdf/pdfUtils.js

import fs from 'fs';
import path from 'path';
import { setTimeout } from 'timers';

export const PDFUtils = {
  // Configuración de duración para archivos temporales
  CONFIG: {
    TEMP_FILE_TIMEOUT: 30 * 60 * 1000, // 30 minutos en milisegundos
    CLEANUP_INTERVAL: 10 * 60 * 1000,  // Limpieza cada 10 minutos
    MAX_TEMP_FILES: 1000               // Límite de archivos temporales en memoria
  },

  // Registro de archivos temporales con sus tiempos de expiración
  _tempFiles: new Map(),
  
  // Temporizador para limpieza periódica
  _cleanupInterval: null,

  /**
   * Inicializa el sistema de gestión temporal
   * Se autoejecuta al cargar el módulo
   */
  _initTempFileManager() {
    if (!this._cleanupInterval) {
      console.log(`Iniciando gestor de archivos temporales. Los archivos se eliminarán después de ${this.CONFIG.TEMP_FILE_TIMEOUT/60000} minutos.`);
      
      // Comenzar intervalo de limpieza periódica
      this._cleanupInterval = setInterval(() => {
        this._runTempFileCleanup();
      }, this.CONFIG.CLEANUP_INTERVAL);
      
      // Asegurar que el intervalo no impida que Node.js termine
      this._cleanupInterval.unref();
    }
  },

  /**
   * Ejecuta limpieza de archivos temporales expirados
   * @private
   */
  _runTempFileCleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    let errorCount = 0;
    
    // Recorrer registro de archivos temporales
    for (const [filePath, expirationTime] of this._tempFiles.entries()) {
      if (now >= expirationTime) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
          
          this._tempFiles.delete(filePath);
        } catch (error) {
          errorCount++;
          console.warn(`Error eliminando archivo temporal ${filePath}:`, error.message);
        }
      }
    }
    
    if (cleanedCount > 0 || errorCount > 0) {
      console.log(`Limpieza programada: eliminados ${cleanedCount} archivos temporales expirados. Errores: ${errorCount}`);
    }
  },

  /**
   * Normaliza el texto para el procesamiento
   * @param {string} text - Texto a normalizar
   * @returns {string} - Texto normalizado
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/-\n/g, '')
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },
  
  /**
   * Valida que el archivo sea un PDF válido y no exceda el tamaño máximo
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {number} maxFileSize - Tamaño máximo permitido en bytes
   */
  async validateFile(fileBuffer, maxFileSize) {
    if (fileBuffer.length > maxFileSize) {
      throw new Error(`El archivo excede el tamaño máximo permitido de ${maxFileSize / (1024 * 1024)}MB`);
    }

    const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    if (!fileBuffer.slice(0, 4).equals(pdfSignature)) {
      throw new Error('El archivo no es un PDF válido');
    }
  },
  
  /**
   * Guarda un archivo temporal con tiempo de expiración
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} tmpDir - Directorio temporal
   * @returns {Promise<string>} - Ruta del archivo temporal
   */
  async saveTempFileStream(fileBuffer, tmpDir) {
    try {
      // Asegurar que existe el directorio
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const tempFilePath = path.join(tmpDir, `temp_${timestamp}_${randomStr}.pdf`);
      
      await fs.promises.writeFile(tempFilePath, fileBuffer);
      
      const expirationTime = Date.now() + this.CONFIG.TEMP_FILE_TIMEOUT;
      
      this._tempFiles.set(tempFilePath, expirationTime);
      
      // Control de límite de archivos temporales en memoria
      if (this._tempFiles.size > this.CONFIG.MAX_TEMP_FILES) {
        const oldestKey = this._tempFiles.keys().next().value;
        if (oldestKey) {
          this.cleanupTempFile(oldestKey);
        }
      }
      
      console.log(`Archivo temporal guardado en ${tempFilePath}. Expirará en ${this.CONFIG.TEMP_FILE_TIMEOUT/60000} minutos.`);
      return tempFilePath;
    } catch (error) {
      console.error('Error guardando archivo temporal:', error);
      throw error;
    }
  },
  
  /**
   * Extiende el tiempo de vida de un archivo temporal
   * @param {string} filePath - Ruta del archivo temporal
   * @returns {boolean} - true si se extendió correctamente
   */
  extendTempFileLife(filePath) {
    if (!filePath || !this._tempFiles.has(filePath)) {
      return false;
    }
    
    try {
      const newExpiration = Date.now() + this.CONFIG.TEMP_FILE_TIMEOUT;
      this._tempFiles.set(filePath, newExpiration);
      
      if (fs.existsSync(filePath)) {
        const time = new Date();
        fs.utimesSync(filePath, time, time);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`Error extendiendo vida de archivo temporal ${filePath}:`, error.message);
      return false;
    }
  },
  
  /**
   * Limpia un archivo temporal
   * @param {string} filePath - Ruta del archivo a eliminar
   */
  async cleanupTempFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this._tempFiles.delete(filePath);
        console.log(`Archivo temporal eliminado: ${filePath}`);
      }
    } catch (err) {
      console.error("Error limpiando archivo temporal:", err);
    }
  },
  
  /**
   * Calcula el tamaño promedio de los chunks
   * @param {Array} documents - Documentos procesados
   * @returns {number} - Tamaño promedio en caracteres
   */
  calculateAverageChunkSize(documents) {
    if (!documents || documents.length === 0) return 0;
    return documents.reduce((acc, doc) => acc + (doc.pageContent?.length || 0), 0) / documents.length;
  },
  
  /**
   * Mejora el objeto de error con información adicional
   * @param {Error} error - Error original
   * @param {Object} processingMetrics - Métricas de procesamiento
   * @returns {Error} - Error mejorado
   */
  enhanceError(error, processingMetrics) {
    const enhancedError = new Error(error.message);
    enhancedError.details = {
      type: error.name,
      processingMetrics: processingMetrics,
      timestamp: new Date().toISOString()
    };
    return enhancedError;
  },
  
  /**
   * Elimina archivos temporales antiguos del sistema de archivos
   * @param {string} tmpDir - Directorio de archivos temporales
   * @param {number} maxAge - Edad máxima en milisegundos (opcional)
   * @returns {Promise<number>} - Número de archivos eliminados
   */
  async cleanupOldTempFiles(tmpDir, maxAge = this.CONFIG.TEMP_FILE_TIMEOUT) {
    try {
      if (!fs.existsSync(tmpDir)) {
        return 0;
      }
      
      const files = await fs.promises.readdir(tmpDir);
      let deletedCount = 0;
      const now = Date.now();
      
      for (const file of files) {
        if (!file.startsWith('temp_') || !file.endsWith('.pdf')) {
          continue;
        }
        
        const filePath = path.join(tmpDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          const fileAge = now - stats.mtimeMs;
          
          if (fileAge > maxAge) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            
            // También eliminar del registro interno si existe
            this._tempFiles.delete(filePath);
          }
        } catch (fileError) {
          console.warn(`Error procesando archivo ${file}:`, fileError.message);
        }
      }
      
      if (deletedCount > 0) {
        console.log(`Eliminados ${deletedCount} archivos temporales antiguos de ${tmpDir}`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error limpiando archivos temporales:', error);
      return 0;
    }
  },
  
  /**
   * Obtiene estadísticas de archivos temporales
   * @returns {Object} - Estadísticas de archivos temporales
   */
  getTempFileStats() {
    const now = Date.now();
    const stats = {
      totalFiles: this._tempFiles.size,
      expiringIn: {
        lessThan5Min: 0,
        lessThan15Min: 0,
        lessThan30Min: 0,
        moreThan30Min: 0
      },
      expiredButNotDeleted: 0
    };
    
    for (const [, expirationTime] of this._tempFiles.entries()) {
      const timeRemaining = expirationTime - now;
      
      if (timeRemaining <= 0) {
        stats.expiredButNotDeleted++;
      } else if (timeRemaining < 5 * 60 * 1000) {
        stats.expiringIn.lessThan5Min++;
      } else if (timeRemaining < 15 * 60 * 1000) {
        stats.expiringIn.lessThan15Min++;
      } else if (timeRemaining < 30 * 60 * 1000) {
        stats.expiringIn.lessThan30Min++;
      } else {
        stats.expiringIn.moreThan30Min++;
      }
    }
    
    return stats;
  },

  /**
   * Normaliza una región considerando la escala
   * @param {Object} region - Región a normalizar {x1, y1, x2, y2, scale}
   * @returns {Object} - Región normalizada
   */
  normalizeRegion(region) {
    if (!region) {
      return { x1: 0, y1: 0, x2: 100, y2: 100, scale: 1.0 };
    }
    
    const scale = region.scale || 1.0;
    
    const normalizedRegion = {
      x1: region.x1 / scale,
      y1: region.y1 / scale,
      x2: region.x2 / scale,
      y2: region.y2 / scale,
      scale: scale
    };
    
    // Asegurar que x1 < x2 y y1 < y2
    if (normalizedRegion.x1 > normalizedRegion.x2) {
      [normalizedRegion.x1, normalizedRegion.x2] = [normalizedRegion.x2, normalizedRegion.x1];
    }
    
    if (normalizedRegion.y1 > normalizedRegion.y2) {
      [normalizedRegion.y1, normalizedRegion.y2] = [normalizedRegion.y2, normalizedRegion.y1];
    }
    
    return normalizedRegion;
  }
};

// Inicialización automática del gestor de archivos temporales
PDFUtils._initTempFileManager();

export default PDFUtils;