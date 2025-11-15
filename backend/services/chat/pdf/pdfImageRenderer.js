// src/services/chat/pdf/pdfImageRenderer.js

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import sharp from 'sharp';
import os from 'os'; // Importamos el módulo os para detectar el sistema operativo

const execPromise = util.promisify(exec);

/**
 * Determina la ruta de pdftocairo basado en el sistema operativo
 * @returns {string} - Ruta a pdftocairo
 */
const getPdftocairoPath = () => {
  if (process.env.PDFTOCAIRO_PATH) {
    return process.env.PDFTOCAIRO_PATH;
  }
  
  const platform = os.platform();
  
  // En sistemas Linux/Ubuntu, pdftocairo suele estar en /usr/bin
  if (platform === 'linux') {
    return '/usr/bin/pdftocairo';
  }
  
  // En Windows, usamos la ruta por defecto de la instalación de poppler
  if (platform === 'win32') {
    return 'C:\\Program Files\\poppler-24.08.0\\Library\\bin\\pdftocairo.exe';
  }
  
  // En macOS, si está instalado con homebrew
  if (platform === 'darwin') {
    return '/usr/local/bin/pdftocairo';
  }
  
  // Si no reconocemos el sistema, devolvemos 'pdftocairo' para que se busque en el PATH
  return 'pdftocairo';
};

// Configuración para pdftocairo
const PDFTOCAIRO_PATH = getPdftocairoPath();

/**
 * Servicio para renderizar PDFs como imágenes
 * Mantiene compatibilidad con el nuevo sistema Mistral OCR
 */
const PDFImageRenderer = {
  /**
   * Verifica si el sistema es Linux/Ubuntu
   * @returns {boolean} - true si el sistema es Linux
   */
  isLinux() {
    return os.platform() === 'linux';
  },
  
  /**
   * Verifica si el sistema es específicamente Ubuntu
   * @returns {Promise<boolean>} - true si el sistema es Ubuntu
   */
  async isUbuntu() {
    if (!this.isLinux()) return false;
    
    try {
      const { stdout } = await execPromise('cat /etc/os-release');
      return stdout.toLowerCase().includes('ubuntu');
    } catch (error) {
      console.error("Error verificando si es Ubuntu:", error);
      return false;
    }
  },
  
  /**
   * Instala pdftocairo en sistemas Linux/Ubuntu
   * @returns {Promise<boolean>} - true si la instalación fue exitosa
   */
  async installPdftocairo() {
    if (!this.isLinux()) {
      console.log("La instalación automática solo está disponible en sistemas Linux");
      return false;
    }
    
    try {
      console.log("Intentando instalar pdftocairo (poppler-utils)...");
      
      const isRoot = process.getuid && process.getuid() === 0;
      const sudoPrefix = isRoot ? '' : 'sudo ';
      
      // En Ubuntu y otras distribuciones basadas en Debian, el paquete es poppler-utils
      const { stdout, stderr } = await execPromise(`${sudoPrefix}apt-get update && ${sudoPrefix}apt-get install -y poppler-utils`);
      
      console.log("Instalación completada:", stdout);
      if (stderr) console.warn("Advertencias durante la instalación:", stderr);
      
      return await this.checkPdftocairoAvailability();
    } catch (error) {
      console.error("Error instalando pdftocairo:", error);
      return false;
    }
  },
  
  /**
   * Verifica si hay actualizaciones disponibles para pdftocairo
   * @returns {Promise<boolean>} - true si hay actualizaciones disponibles
   */
  async checkForUpdates() {
    if (!this.isLinux()) {
      console.log("La verificación de actualizaciones solo está disponible en sistemas Linux");
      return false;
    }
    
    try {
      // En Ubuntu y otras distribuciones basadas en Debian
      const { stdout } = await execPromise('apt-get update && apt list --upgradable | grep poppler-utils');
      return stdout.includes('poppler-utils');
    } catch (error) {
      // Si el comando no encuentra actualizaciones, retorna código de error
      // pero eso no significa que haya un error real
      return false;
    }
  },
  
  /**
   * Actualiza pdftocairo en sistemas Linux/Ubuntu
   * @returns {Promise<boolean>} - true si la actualización fue exitosa
   */
  async updatePdftocairo() {
    if (!this.isLinux()) {
      console.log("La actualización automática solo está disponible en sistemas Linux");
      return false;
    }
    
    try {
      console.log("Verificando actualizaciones para pdftocairo (poppler-utils)...");
      const needsUpdate = await this.checkForUpdates();
      
      if (!needsUpdate) {
        console.log("pdftocairo (poppler-utils) ya está actualizado.");
        return true;
      }
      
      console.log("Actualizando pdftocairo (poppler-utils)...");
      
      const isRoot = process.getuid && process.getuid() === 0;
      const sudoPrefix = isRoot ? '' : 'sudo ';
      
      const { stdout, stderr } = await execPromise(`${sudoPrefix}apt-get update && ${sudoPrefix}apt-get install -y --only-upgrade poppler-utils`);
      
      console.log("Actualización completada:", stdout);
      if (stderr) console.warn("Advertencias durante la actualización:", stderr);
      
      return true;
    } catch (error) {
      console.error("Error actualizando pdftocairo:", error);
      return false;
    }
  },

  /**
   * Verificar si pdftocairo está disponible en el sistema
   * @returns {Promise<boolean>} - true si pdftocairo está disponible
   */
  async checkPdftocairoAvailability() {
    try {
      console.log("Verificando pdftocairo en:", PDFTOCAIRO_PATH);
      
      // Si estamos en Linux, primero intentar con el comando 'which'
      if (this.isLinux()) {
        try {
          await execPromise('which pdftocairo');
          console.log("pdftocairo encontrado en PATH");
          return true;
        } catch (whichError) {
          console.log("pdftocairo no encontrado en PATH, verificando ruta específica");
        }
      }
      
      const fileExists = fs.existsSync(PDFTOCAIRO_PATH);
      if (!fileExists) {
        console.error("El archivo pdftocairo no existe en la ruta especificada");
        
        // Si estamos en Linux, intentar instalarlo automáticamente
        if (this.isLinux()) {
          console.log("Intentando instalar pdftocairo automáticamente...");
          return await this.installPdftocairo();
        }
        
        return false;
      }
      
      // Usamos -h (help) en lugar de --version porque pdftocairo no soporta --version
      const command = this.isLinux() ? `${PDFTOCAIRO_PATH} -h` : `"${PDFTOCAIRO_PATH}" -h`;
      const { stdout, stderr } = await execPromise(command);
      
      // Si obtenemos alguna salida, consideramos que pdftocairo está disponible
      // La opción -h mostrará la ayuda, que contendrá "pdftocairo" en alguna parte
      const output = stdout || stderr;
      const isAvailable = output.includes('pdftocairo');
      
      if (isAvailable) {
        console.log("pdftocairo está disponible");
        
        // Si estamos en Linux, verificar si hay actualizaciones disponibles
        if (this.isLinux()) {
          const needsUpdate = await this.checkForUpdates();
          if (needsUpdate) {
            console.log("Hay actualizaciones disponibles para pdftocairo");
            await this.updatePdftocairo();
          }
        }
      } else {
        console.error("No se pudo confirmar la disponibilidad de pdftocairo");
      }
      
      return isAvailable;
    } catch (error) {
      // Si el error es porque no se encontró el ejecutable, es un error legítimo
      if (error.code === 'ENOENT') {
        console.error("pdftocairo no está instalado o no se encuentra en la ruta especificada");
        
        // Si estamos en Linux, intentar instalarlo automáticamente
        if (this.isLinux()) {
          console.log("Intentando instalar pdftocairo automáticamente...");
          return await this.installPdftocairo();
        }
        
        return false;
      }
      
      // Si el código de error es diferente, puede ser que pdftocairo esté disponible
      // pero requiera parámetros específicos (como es el caso)
      console.log("pdftocairo parece estar disponible, pero ocurrió un error en la verificación:", error.message);
      
      // Verificamos si el error contiene información sobre pdftocairo
      if (error.stderr && (error.stderr.includes('pdftocairo') || error.stderr.includes('output format'))) {
        console.log("Se ha detectado pdftocairo (del mensaje de error)");
        return true;
      }
      
      console.error("No se pudo confirmar la disponibilidad de pdftocairo");
      return false;
    }
  },

  /**
   * Renderiza una página específica de un PDF como imagen
   * @param {string} pdfPath - Ruta al archivo PDF
   * @param {number} pageNum - Número de página
   * @param {number} width - Ancho deseado (0 para tamaño original)
   * @returns {Promise<Buffer>} - Buffer de la imagen generada
   */
  async renderWithPdftocairo(pdfPath, pageNum, width = 0) {
    const tempDir = path.dirname(pdfPath);
    
    const validPageNum = Number.isInteger(Number(pageNum)) && Number(pageNum) > 0 ? Number(pageNum) : 1;
    
    const tempFileName = `temp_render_${Date.now()}_page_${validPageNum}`;
    const tempOutputPath = path.join(tempDir, tempFileName);
    
    let command;
    if (this.isLinux()) {
      command = `${PDFTOCAIRO_PATH} -png -singlefile`;
    } else {
      // En Windows, usar comillas dobles para manejar espacios
      command = `"${PDFTOCAIRO_PATH}" -png -singlefile`;
    }
    
    if (width > 0) {
      command += ` -scale-to-x ${width} -scale-to-y -1`;
    }
    
    if (this.isLinux()) {
      command += ` -f ${validPageNum} -l ${validPageNum} "${pdfPath}" "${tempOutputPath}"`;
    } else {
      command += ` -f ${validPageNum} -l ${validPageNum} "${pdfPath}" "${tempOutputPath}"`;
    }
    
    console.log("Ejecutando comando:", command);
    
    try {
      await execPromise(command);
      
      const outputPngPath = `${tempOutputPath}.png`;
      if (!fs.existsSync(outputPngPath)) {
        throw new Error(`No se generó el archivo PNG esperado: ${outputPngPath}`);
      }
      
      // Leer el archivo generado
      const imageBuffer = await fs.promises.readFile(outputPngPath);
      
      try {
        await fs.promises.unlink(outputPngPath);
      } catch (cleanupErr) {
        console.warn(`No se pudo eliminar archivo temporal: ${outputPngPath}`, cleanupErr);
      }
      
      return imageBuffer;
    } catch (error) {
      console.error('Error renderizando PDF con pdftocairo:', error);
      throw new Error(`Error al renderizar PDF: ${error.message}`);
    }
  },

  /**
   * Procesa una imagen - recorta, redimensiona, etc.
   * @param {Buffer} imageBuffer - Buffer de la imagen original
   * @param {Object} options - Opciones de procesamiento
   * @returns {Promise<Buffer>} - Buffer de la imagen procesada
   */
  async processImage(imageBuffer, options = {}) {
    const { width, height, crop } = options;
    
    try {
      let processor = sharp(imageBuffer);
      
      // Recortar si se especifican coordenadas
      if (crop && crop.width && crop.height) {
        processor = processor.extract({
          left: Math.round(crop.x || 0),
          top: Math.round(crop.y || 0),
          width: Math.round(crop.width),
          height: Math.round(crop.height)
        });
      }
      
      // Redimensionar si se especifican dimensiones
      if (width || height) {
        processor = processor.resize(
          width ? parseInt(width) : null, 
          height ? parseInt(height) : null, 
          { fit: 'inside', withoutEnlargement: true }
        );
      }
      
      return await processor.toBuffer();
    } catch (error) {
      console.error("Error procesando imagen:", error);
      return imageBuffer; // Devolver imagen original si hay error
    }
  },
  
  /**
   * Intenta extraer una imagen de una página específica del PDF
   * Útil para la integración con Mistral OCR cuando se necesitan vistas previas
   * @param {string} pdfPath - Ruta al archivo PDF
   * @param {number} pageNum - Número de página
   * @param {Object} options - Opciones de extracción
   * @returns {Promise<Object>} - Resultado de la extracción con detalles
   */
  async extractPageImage(pdfPath, pageNum, options = {}) {
    try {
      const startTime = Date.now();
      const { width = 800, format = 'png' } = options;
      
      const pdftocairoAvailable = await this.checkPdftocairoAvailability();
      
      if (!pdftocairoAvailable) {
        return {
          success: false,
          error: 'pdftocairo no está disponible para renderizar PDFs',
          alternativeMessage: 'El servicio de vista previa no está disponible actualmente'
        };
      }
      
      const imageBuffer = await this.renderWithPdftocairo(pdfPath, pageNum, width);
      
      const finalImage = options.crop || options.height
        ? await this.processImage(imageBuffer, options)
        : imageBuffer;
      
      return {
        success: true,
        imageBuffer: finalImage,
        format: format,
        page: pageNum,
        width: width,
        processingTime: Date.now() - startTime,
        contentType: `image/${format}`
      };
    } catch (error) {
      console.error(`Error extrayendo imagen de página ${pageNum}:`, error);
      return {
        success: false,
        error: error.message,
        page: pageNum
      };
    }
  },
  
  /**
   * Renderiza una región específica de una página
   * @param {string} pdfPath - Ruta al archivo PDF
   * @param {number} pageNum - Número de página
   * @param {Object} region - Coordenadas de la región {x1, y1, x2, y2, scale}
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Resultado con imagen de la región
   */
  async renderRegion(pdfPath, pageNum, region, options = {}) {
    try {
      // Primero, rendererizar la página completa a una resolución adecuada
      const scale = region.scale || 1;
      const pageWidth = options.fullPageWidth || 1200; // Resolución razonable
      
      const pageImage = await this.renderWithPdftocairo(pdfPath, pageNum, pageWidth);
      
      const cropOptions = {
        x: Math.min(region.x1, region.x2) * scale,
        y: Math.min(region.y1, region.y2) * scale,
        width: Math.abs(region.x2 - region.x1) * scale,
        height: Math.abs(region.y2 - region.y1) * scale
      };
      
      // Recortar la región específica
      const regionImage = await this.processImage(pageImage, {
        crop: cropOptions
      });
      
      return {
        success: true,
        imageBuffer: regionImage,
        format: options.format || 'png',
        page: pageNum,
        region: region,
        processingTime: Date.now() - options.startTime || 0,
        contentType: `image/${options.format || 'png'}`
      };
    } catch (error) {
      console.error(`Error renderizando región de página ${pageNum}:`, error);
      return {
        success: false,
        error: error.message,
        page: pageNum,
        region: region
      };
    }
  }
};

export default PDFImageRenderer;