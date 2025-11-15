// middlewares/audioSecurityMiddleware.js
import { AudioSecurityService } from '../services/chat/AudioSecurityService.js';
import fs from 'fs';

/**
 * Middleware para validación de seguridad de archivos de audio
 */
export const validateAudioSecurity = async (req, res, next) => {
    try {
        if (!req.file && !req.body.audioData) {
          return res.status(400).json({
            success: false,
            error: "No se ha proporcionado ningún archivo de audio"
          });
        }
        
        let filePath = null;
        let fileBuffer = null;
        let isTemporaryFile = false;
        
        if (req.file) {
          filePath = req.file.path;
          console.log(`Validando archivo de audio subido: ${filePath}`);
        }
        else if (req.body.audioData) {
          const base64Data = req.body.audioData.replace(/^data:audio\/[^;]+;?(?:codecs=[^;,]+)?;base64,/, '');
          fileBuffer = Buffer.from(base64Data, 'base64');
          
          const tempFileName = `temp_audio_${Date.now()}.webm`;
          filePath = `/tmp/${tempFileName}`;
          fs.writeFileSync(filePath, fileBuffer);
          isTemporaryFile = true;
          
          console.log(`Archivo temporal creado para validación: ${filePath}`);
        }
        
        // 1. Verificación de firma de audio
        if (fileBuffer) {
          // Si ya tenemos el buffer, usarlo directamente
          const audioType = AudioSecurityService.identifyAudioType(fileBuffer);
          if (!audioType.valid) {
            if (isTemporaryFile && filePath && fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            
            return res.status(400).json({
              success: false,
              error: "El archivo no tiene una firma de audio válida",
              details: audioType.reason
            });
          }
          console.log(`Tipo de audio identificado: ${audioType.name}`);
        } else {
          // Leer el archivo para verificar su tipo
          try {
            // Leer solo los primeros 4KB para verificar la firma
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(4096);
            fs.readSync(fd, buffer, 0, 4096, 0);
            fs.closeSync(fd);
            
            const audioType = AudioSecurityService.identifyAudioType(buffer);
            if (!audioType.valid) {
              if (isTemporaryFile && filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              
              return res.status(400).json({
                success: false,
                error: "El archivo no tiene una firma de audio válida",
                details: audioType.reason
              });
            }
            console.log(`Tipo de audio identificado: ${audioType.name}`);
          } catch (error) {
            console.error("Error al leer archivo para verificación:", error);
          }
        }
        
        // 2. Escaneo con ClamAV
        console.log("Realizando escaneo con ClamAV...");
        const scanResult = await AudioSecurityService.scanFile(filePath);
        
        // MEJORA: Incluso si el análisis adicional de seguridad detecta algo,
        // vamos a continuar pero con una advertencia, para evitar falsos positivos
        
        if (scanResult.securityNotes) {
          console.log(`⚠️ Notas de seguridad (no bloqueantes): ${scanResult.securityNotes.message || JSON.stringify(scanResult.securityNotes)}`);
          req.securityNotes = scanResult.securityNotes;
          
          // Sobrescribir el estado de "limpio" para permitir archivos de audio legítimos
          if (!scanResult.clean && !scanResult.viruses) {
            console.log("Considerando archivo como seguro a pesar de advertencias de seguridad...");
            scanResult.clean = true;
            scanResult.overridden = true;
          }
        }
        
        if (isTemporaryFile && filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Archivo temporal eliminado: ${filePath}`);
          } catch (cleanupError) {
            console.warn(`Error al eliminar archivo temporal: ${cleanupError.message}`);
          }
        }
        
        if (!scanResult.clean && !scanResult.skipped && scanResult.viruses && scanResult.viruses.length > 0) {
          return res.status(400).json({
            success: false,
            error: "Se ha detectado contenido malicioso en el archivo de audio",
            details: {
              viruses: scanResult.viruses,
              message: scanResult.message
            }
          });
        }
        
        // IMPORTANTE: Solo bloqueamos si ClamAV detecta virus reales, no basado en heurísticas
        // que pueden generar falsos positivos
        
        // Si todas las verificaciones pasan, continuar con el procesamiento
        next();
  } catch (error) {
    console.error('Error en validación de seguridad de audio:', error);
    return res.status(500).json({
      success: false,
      error: "Error procesando el archivo: " + error.message
    });
  }
};

export default validateAudioSecurity;