// src/services/chat/pdf/pdfProcessor.js

import fs from 'fs';
import path from 'path';
import PDFUtils from './pdfUtils.js';
import pdfProcessingQueue from './asyncProcessing.js';
import { MistralOCRService } from '../mistralOCRService.js';
import PDFImageRenderer from './pdfImageRenderer.js';

/**
 * Procesador de PDFs simplificado para trabajar con Mistral OCR
 */
export const PDFProcessor = {
  /**
   * Procesa un PDF con Mistral OCR
   * @param {Object} options - Opciones de procesamiento
   * @param {Buffer} options.fileBuffer - Buffer del archivo PDF
   * @param {string} options.originalFilename - Nombre original del archivo
   * @param {Object} options.metadata - Metadatos adicionales
   * @returns {Promise<Object>} - Resultado del procesamiento OCR
   */
  async processPDFWithMistral({ fileBuffer, originalFilename, metadata = {} }) {
    console.log(`Procesando PDF con Mistral OCR: ${originalFilename}`);
    
    try {
      // Usar la cola de procesamiento para tareas intensivas
      const { result } = await pdfProcessingQueue.enqueue(
        async () => {
          // Procesar con Mistral OCR
          const ocrResult = await MistralOCRService.processPDFWithOCR({
            fileBuffer,
            originalFilename
          });
          
          if (!ocrResult.success) {
            throw new Error(`Error en procesamiento OCR con Mistral: ${ocrResult.error}`);
          }
          
          return ocrResult;
        },
        {
          priority: 2, // Alta prioridad
          pdfId: metadata.pdfId || originalFilename,
          timeout: 120000, // 2 minutos para OCR
          maxAttempts: 2
        }
      );
      
      return result;
    } catch (error) {
      console.error('Error procesando PDF con Mistral OCR:', error);
      throw error;
    }
  },
  
  /**
   * Genera una vista previa de una página específica del PDF
   * @param {string} pdfPath - Ruta al archivo PDF
   * @param {number} pageNum - Número de página
   * @param {Object} options - Opciones de renderizado
   * @returns {Promise<Buffer>} - Buffer de la imagen generada
   */
  async generatePagePreview(pdfPath, pageNum, options = {}) {
    try {
      const {
        width = 800,
        height = null,
        crop = null,
        format = 'png'
      } = options;
      
      // Verificar que el archivo existe
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`El archivo PDF no existe: ${pdfPath}`);
      }
      
      // Extender la vida útil del archivo temporal si está siendo utilizado
      PDFUtils.extendTempFileLife(pdfPath);
      
      console.log(`Generando vista previa para página ${pageNum} de ${pdfPath}`);
      
      // Usar la cola de procesamiento para tareas de renderizado
      const { result: imageBuffer } = await pdfProcessingQueue.enqueue(
        async () => {
          try {
            // Verificar disponibilidad de pdftocairo
            const pdftocairoAvailable = await PDFImageRenderer.checkPdftocairoAvailability();
            
            if (!pdftocairoAvailable) {
              throw new Error('pdftocairo no está disponible para renderizado de PDF');
            }
            
            // Renderizar página con pdftocairo
            const rawImageBuffer = await PDFImageRenderer.renderWithPdftocairo(
              pdfPath,
              pageNum,
              width
            );
            
            // Procesar imagen si es necesario (recortar, redimensionar)
            if (crop || (height && height > 0)) {
              return await PDFImageRenderer.processImage(rawImageBuffer, {
                width, 
                height,
                crop
              });
            }
            
            return rawImageBuffer;
          } catch (renderError) {
            console.error(`Error renderizando página ${pageNum}:`, renderError);
            throw renderError;
          }
        },
        {
          priority: 1, // Prioridad media
          pdfId: path.basename(pdfPath),
          timeout: 30000, // 30 segundos máximo
          maxAttempts: 2
        }
      );
      
      return imageBuffer;
    } catch (error) {
      console.error(`Error generando vista previa para página ${pageNum}:`, error);
      throw error;
    }
  },
  
  async extractTextFromRegion(pdfPath, pageNum, region, options = {}) {
    try {
      // Como Mistral OCR no soporta extracción por coordenadas específicas,
      // devolvemos un mensaje informativo
      
      console.log(`Solicitud de extracción de texto para región en página ${pageNum}: (${region.x1},${region.y1})-(${region.x2},${region.y2})`);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(pdfPath)) {
        return {
          success: false,
          error: `El archivo PDF no existe: ${pdfPath}`
        };
      }
      
      // Extender la vida útil del archivo temporal si está siendo utilizado
      PDFUtils.extendTempFileLife(pdfPath);
      
      // Como alternativa, podemos:
      // 1. Generar una vista previa de la región específica
      // 2. Devolver el texto completo de la página con una nota
      
      // Generar vista previa de la región para uso del cliente
      const previewOptions = {
        width: Math.abs(region.x2 - region.x1) * (region.scale || 1),
        crop: {
          x: Math.min(region.x1, region.x2) * (region.scale || 1),
          y: Math.min(region.y1, region.y2) * (region.scale || 1),
          width: Math.abs(region.x2 - region.x1) * (region.scale || 1),
          height: Math.abs(region.y2 - region.y1) * (region.scale || 1)
        }
      };
      
      // Intentar generar la vista previa (sólo para mostrar la región seleccionada)
      let previewUrl = null;
      try {
        // Usar la cola de procesamiento para tareas intensivas
        const { result: previewBuffer } = await pdfProcessingQueue.enqueue(
          async () => {
            return await this.generatePagePreview(pdfPath, pageNum, previewOptions);
          },
          {
            priority: 1, // Prioridad media
            pdfId: path.basename(pdfPath),
            timeout: 30000, // 30 segundos máximo
            maxAttempts: 2
          }
        );
        
        // Aquí podríamos guardar la imagen temporal y devolver su URL
        // Pero para simplificar, sólo indicamos que la vista previa está disponible
        previewUrl = `/api/file/preview?pdfPath=${encodeURIComponent(pdfPath)}&page=${pageNum}&region=${JSON.stringify(region)}`;
      } catch (previewError) {
        console.warn('Error generando vista previa de región:', previewError.message);
      }
      
      return {
        success: true,
        contentType: 'text',
        selectedText: "La extracción de texto por coordenadas específicas no está disponible con Mistral OCR. Se requiere implementar una solución alternativa si esta funcionalidad es crítica.",
        metadata: {
          page: pageNum,
          region: region,
          previewUrl: previewUrl,
          note: "Mistral OCR no soporta extracción por coordenadas. Considere extraer el texto completo de la página."
        }
      };
    } catch (error) {
      console.error('Error en extractTextFromRegion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }


};

export default PDFProcessor;