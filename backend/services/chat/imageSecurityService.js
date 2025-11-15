// services/chat/imageSecurityService.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Servicio específico para escaneo de seguridad de imágenes
 */
export const ImageSecurityService = {
  /**
   * Escanea un archivo con ClamAV para detectar malware
   * @param {string} filePath - Ruta al archivo a escanear
   * @returns {Promise<Object>} - Resultado del escaneo
   */
  async scanFile(filePath) {
    try {
      const tempFileName = `img_scan_${Date.now()}_${path.basename(filePath)}`;
      const tempFilePath = `/tmp/${tempFileName}`;
      
      await fs.promises.copyFile(filePath, tempFilePath);
      console.log(`Imagen copiada a ${tempFilePath} para escaneo antivirus`);
      
      // Escanear con clamdscan
      console.log("Iniciando escaneo antivirus de imagen con clamdscan...");
      const clamResult = await this.scanWithClamdscanCommand(tempFilePath);
      
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Archivo temporal de imagen eliminado: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn(`Error limpiando archivo temporal de imagen: ${cleanupError.message}`);
      }
      
      return clamResult;
    } catch (error) {
      console.error("Error en escaneo antivirus de imagen:", error);
      return { clean: true, skipped: true, error: error.message };
    }
  },
  
  /**
   * Método mejorado de escaneo usando el comando clamdscan con opciones avanzadas
   * @param {string} filePath - Ruta al archivo a escanear
   * @returns {Promise<Object>} - Resultado del escaneo
   */
  async scanWithClamdscanCommand(filePath) {
    return new Promise((resolve, reject) => {
      // Variable para rastrear si el proceso ha terminado
      let processCompleted = false;
      
      const clamdscan = spawn('clamdscan', [
        '--fdpass',           // hereda permisos del usuario que ejecuta
        '--stdout',           // vuelca el reporte por stdout
        '--infected',         // solo imprime archivos infectados
        filePath
      ]);      
      
      let output = '';
      
      clamdscan.stdout.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[ClamAV Imagen] ${chunk.trim()}`);
      });
      
      clamdscan.stderr.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[ClamAV Imagen Error] ${chunk.trim()}`);
      });
      
      clamdscan.on('close', code => {
        processCompleted = true;
        console.log(`Código de salida clamdscan para imagen: ${code}, Output: ${output}`);
        
        // code 0: limpio, code 1: virus encontrado, code 2: error
        if (code === 0) {
          resolve({ 
            clean: true, 
            message: 'Imagen limpia', 
            clamav_completed: true 
          });
        } else if (code === 1) {
          const viruses = output.match(/: ([^:]+) FOUND/g) || [];
          resolve({ 
            clean: false, 
            viruses: viruses.map(v => v.replace(/: |\s+FOUND/g, '')),
            message: 'Virus detectado en imagen',
            details: output,
            clamav_completed: true
          });
        } else {
          reject(new Error(`Error en escaneo de imagen (código ${code}): ${output}`));
        }
      });
      
      clamdscan.on('error', err => {
        processCompleted = true;
        console.error("[ClamAV Imagen] Error iniciando proceso:", err);
        reject(err);
      });
      
      // Aumentar timeout y mostrar mejor mensaje
      setTimeout(() => {
        if (!processCompleted) {
          console.log("[ClamAV Imagen] Cancelando escaneo por timeout (60 segundos)");
          clamdscan.kill();
          resolve({ 
            clean: true, 
            skipped: true, 
            message: 'Escaneo antivirus de imagen cancelado por timeout',
            details: 'El análisis de la imagen con ClamAV excedió el tiempo máximo permitido'
          });
        }
      }, 60000); // 60 segundos de timeout
    });
  },
  
  /**
   * Verifica si ClamAV está disponible en el sistema
   * @returns {Promise<boolean>} - true si ClamAV está disponible
   */
  async checkClamAVAvailability() {
    return new Promise(resolve => {
      const clamdscan = spawn('clamdscan', ['--version']);
      
      clamdscan.on('close', code => {
        resolve(code === 0);
      });
      
      clamdscan.on('error', () => {
        resolve(false);
      });
      
      setTimeout(() => resolve(false), 1000);
    });
  },
  
  /**
   * Verifica la firma básica del tipo de archivo para confirmar que es una imagen válida
   * @param {Buffer} buffer - Buffer de la imagen a verificar
   * @returns {Object} - Resultado de la verificación
   */
  verifyImageSignature(buffer) {
    // Magic numbers para tipos comunes de imagen
    const signatures = {
      'jpeg': [[0xFF, 0xD8, 0xFF]],
      'png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
      'gif': [[0x47, 0x49, 0x46, 0x38]]
    };
    
    for (const [format, signatureList] of Object.entries(signatures)) {
      for (const signature of signatureList) {
        let matches = true;
        
        for (let i = 0; i < signature.length; i++) {
          // Si el valor de signature es null, significa que es un comodín
          if (signature[i] === null) continue;
          
          if (i >= buffer.length || buffer[i] !== signature[i]) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          return {
            valid: true,
            format: format,
            message: `Firma válida: formato ${format} verificado`
          };
        }
      }
    }
    
    // No coincide con ninguna firma conocida
    return {
      valid: false,
      format: 'unknown',
      message: 'No se encontró una firma de imagen válida'
    };
  }
};

export default ImageSecurityService;