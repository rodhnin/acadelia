// src/services/chat/pdf/index.js

// Este archivo facilita la importación de todos los módulos PDF

// Configuración y utilidades básicas
export { PDFPathConfig, checkFontPaths } from './pdfConfig.js';
export { PDFUtils } from './pdfUtils.js';

// Procesamiento asíncrono
import pdfProcessingQueue from './asyncProcessing.js';
export { pdfProcessingQueue };

// Módulos principales
export { default as PDFProcessor } from './pdfProcessor.js';
export { default as PDFStorageService } from './pdfStorageService.js';
export { default as PDFImageRenderer } from './pdfImageRenderer.js';

// Importar componentes de caché
import redisService from '../../../lib/redis.js';
export { redisService };

// Exportación por defecto que incluye todos los módulos
export default {
  PDFPathConfig,
  checkFontPaths,
  PDFProcessor,
  PDFStorageService,
  PDFUtils,
  PDFImageRenderer,
  pdfProcessingQueue,
  redisService
};