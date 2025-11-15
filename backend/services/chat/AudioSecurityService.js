// services/AudioSecurityService.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Servicio para escaneo de seguridad y validación de archivos de audio
 */
export const AudioSecurityService = {
  /**
   * Escanea un archivo con ClamAV
   * @param {string} filePath - Ruta al archivo a escanear
   * @returns {Promise<Object>} - Resultado del escaneo
   */
  async scanFile(filePath) {
    try {
      const tempFileName = `scan_${Date.now()}_${path.basename(filePath)}`;
      const tempFilePath = `/tmp/${tempFileName}`;
      
      await fs.promises.copyFile(filePath, tempFilePath);
      console.log(`Archivo copiado a ${tempFilePath} para escaneo`);
      
      // Escanear con clamdscan
      console.log("Iniciando escaneo con clamdscan...");
      const clamResult = await this.scanWithClamdscanCommand(tempFilePath);
      
      // Si ClamAV no detectó nada, realizar verificación adicional específica para audio
      if (clamResult.clean && !clamResult.skipped) {
        console.log("ClamAV no detectó amenazas, realizando verificación adicional de audio...");
        
        try {
          const additionalCheckPromise = new Promise(async (resolve) => {
            try {
              // Leer el archivo para verificación adicional
              const fileBuffer = await fs.promises.readFile(tempFilePath);
              
              // Limitar el tamaño de verificación para archivos grandes
              const maxSize = Math.min(fileBuffer.length, 10 * 1024 * 1024); // 10MB máximo
              const bufferToCheck = fileBuffer.slice(0, maxSize);
              
              const additionalCheck = await this.checkForSuspiciousAudioContent(bufferToCheck);
              resolve(additionalCheck);
            } catch (err) {
              console.error("Error en verificación adicional de audio:", err);
              resolve({ suspicious: false, error: err.message });
            }
          });
          
          const timeoutPromise = new Promise(resolve => {
            setTimeout(() => {
              resolve({ 
                suspicious: false, 
                skipped: true, 
                message: "Verificación adicional de audio cancelada por timeout" 
              });
            }, 15000);
          });
          
          // Utilizar Promise.race para tomar el que termine primero
          const additionalCheck = await Promise.race([additionalCheckPromise, timeoutPromise]);
          
          if (additionalCheck.skipped) {
            console.log("Verificación adicional de audio cancelada por timeout");
          } else if (additionalCheck.suspicious && additionalCheck.riskScore >= 2) {
            console.log(`Verificación adicional encontró contenido sospechoso: ${additionalCheck.message}`);
            clamResult.clean = false;
            clamResult.message = `Contenido potencialmente malicioso detectado en audio (${additionalCheck.severityLevel})`;
            clamResult.viruses = [...(clamResult.viruses || []), 'Audio con contenido sospechoso'];
            clamResult.additionalInfo = additionalCheck;
          } else {
            console.log(`Verificación adicional de audio: ${additionalCheck.message}`);
            // Aunque no sea lo suficientemente sospechoso para bloquearlo, incluir la info en el resultado
            if (additionalCheck.riskScore > 0) {
              clamResult.securityNotes = additionalCheck;
            }
          }
        } catch (verificationError) {
          console.error("Error general en verificación adicional de audio:", verificationError);
        }
      }
      
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Archivo temporal eliminado: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn(`Error limpiando archivo temporal: ${cleanupError.message}`);
      }
      
      return clamResult;
    } catch (error) {
      console.error("Error en escaneo antivirus para audio:", error);
      return { clean: true, skipped: true, error: error.message };
    }
  },
  
  /**
   * Verifica si hay contenido sospechoso en un archivo de audio
   * @param {Buffer} audioBuffer - Buffer del audio a analizar
   * @returns {Promise<Object>} - Resultado de la verificación
   */
  async checkForSuspiciousAudioContent(audioBuffer) {
    try {
      console.log("Analizando contenido potencialmente malicioso en archivo de audio...");
      
      const headerHex = audioBuffer.slice(0, 500).toString('hex');
      
      console.log(`Audio analizado: tamaño=${audioBuffer.length} bytes`);
      
      // 1. Verificación de firmas de archivos de audio válidos
      const validAudioSignatures = [
        // Firmas MP3
        { pattern: '494433', name: 'id3-tag', type: 'mp3' }, // ID3
        { pattern: 'fffb', name: 'mp3-frame', type: 'mp3' }, // MPEG frame sync
        { pattern: 'fff3', name: 'mp3-frame-alt', type: 'mp3' }, // Alternate MP3 frame sync
        
        // Firmas WAV
        { pattern: '52494646', name: 'riff-header', type: 'wav' }, // RIFF
        { pattern: '57415645', name: 'wave-format', type: 'wav' }, // WAVE
        
        // Firmas FLAC
        { pattern: '664c6143', name: 'flac-header', type: 'flac' }, // fLaC
        
        // Firmas OGG
        { pattern: '4f676753', name: 'ogg-header', type: 'ogg' }, // OggS
        
        // Firmas M4A/AAC
        { pattern: '667479704d3441', name: 'm4a-header', type: 'm4a' }, // ftypM4A
        { pattern: '667479704d534e56', name: 'mp4-header', type: 'm4a' }, // ftypMSNV
        
        // Firmas WEBM
        { pattern: '1a45dfa3', name: 'webm-header', type: 'webm' } // EBML header
      ];
      
      let hasValidAudioSignature = false;
      let detectedAudioType = null;
      
      for (const { pattern, name, type } of validAudioSignatures) {
        if (headerHex.toLowerCase().startsWith(pattern) || headerHex.toLowerCase().includes(pattern.toLowerCase())) {
          hasValidAudioSignature = true;
          detectedAudioType = type;
          console.log(`Firma de audio válida detectada: ${name} (${type})`);
          break;
        }
      }
      
      // 2. Patrones sospechosos específicos para archivos de audio
      // MEJORA: Patrones más específicos y completos para reducir falsos positivos
      const suspiciousPatterns = [
        // Firmas de ejecutables embebidos en audio - más específicos
        { 
          pattern: '4d5a90000300000004000000ffff', 
          name: 'pe-exe-header', 
          score: 10, 
          description: 'Ejecutable Windows PE detectado' 
        },
        { 
          pattern: '7f454c46010101', 
          name: 'elf-header-full', 
          score: 10, 
          description: 'Ejecutable Linux ELF detectado' 
        },
        { 
          pattern: '504b0304140000000800', 
          name: 'zip-header-full', 
          score: 5, 
          description: 'Archivo ZIP embebido (posible código oculto)' 
        },
        
        // Firmas de scripting en metadatos - más específicas
        { 
          pattern: '3c736372697074203e', 
          name: 'html-script-tag', 
          score: 7, 
          description: 'Tag <script> en metadatos' 
        },
        { 
          pattern: '6a61766173637269707420616c657274', 
          name: 'javascript-alert', 
          score: 7, 
          description: 'JavaScript alert en metadatos' 
        },
                
        { 
          pattern: 'e8000000005b31c9', 
          name: 'shellcode-specific', 
          score: 9, 
          description: 'Patrón específico de shellcode malicioso' 
        },
        
        // Troyanos específicos conocidos en audio
        { 
          pattern: '6d59536f756e644d616c77617265', 
          name: 'known-audio-trojan', 
          score: 10, 
          description: 'Malware de audio conocido detectado' 
        }
      ];
      
      // 3. Verificar si hay firmas sospechosas
      let riskScore = 0;
      let detections = {};
      
      // Si no tiene una firma de audio válida, esto es muy sospechoso
      if (!hasValidAudioSignature) {
        detections['invalid-audio-signature'] = true;
        riskScore += 5;
        console.log('⚠️ No se detectó una firma de audio válida');
      }
      
      // MEJORA: Usar dos estrategias diferentes según el tamaño del archivo
      if (audioBuffer.length < 10 * 1024 * 1024) { // Para archivos < 10MB
        const fullHex = audioBuffer.toString('hex');
        
        for (const { pattern, name, score, description } of suspiciousPatterns) {
          if (fullHex.toLowerCase().includes(pattern.toLowerCase())) {
            console.log(`⚠️ Patrón sospechoso detectado: ${name} - ${description}`);
            detections[name] = true;
            riskScore += score;
          }
        }
      } else {
        const checkPoints = [
          0, // Inicio del archivo
          Math.floor(audioBuffer.length * 0.25), // 25% del archivo
          Math.floor(audioBuffer.length * 0.5), // Mitad del archivo
          Math.floor(audioBuffer.length * 0.75), // 75% del archivo
          Math.max(0, audioBuffer.length - 4096) // Final del archivo
        ];
        
        for (const checkPoint of checkPoints) {
          const segmentSize = 4096; // 4KB por segmento
          const segment = audioBuffer.slice(checkPoint, checkPoint + segmentSize);
          const segmentHex = segment.toString('hex');
          
          for (const { pattern, name, score, description } of suspiciousPatterns) {
            if (segmentHex.toLowerCase().includes(pattern.toLowerCase())) {
              console.log(`⚠️ Patrón sospechoso detectado en offset ${checkPoint}: ${name} - ${description}`);
              detections[name] = true;
              riskScore += score;
            }
          }
        }
      }
      
      // 4. MEJORA: Para archivos MP3 con ID3, ignorar ciertos patrones comunes
      // que pueden aparecer legítimamente en los metadatos
      if (detectedAudioType === 'mp3' && headerHex.includes('494433')) {
        // Si es un MP3 con ID3 tag y se detectó 'mz-exe' o 'shellcode-pattern',
        
        if (detections['pe-exe-header'] && headerHex.includes('4d5a90000300000004000000ffff')) {
          console.log('ℹ️ Verificando posible falso positivo en ID3 tag...');
          
          const headerAnalysis = this.analyzeID3Context(headerHex);
          
          // Si es parte de un ID3 frame legítimo, ignorar la detección
          if (headerAnalysis.isLikelyID3Data) {
            delete detections['pe-exe-header'];
            console.log('✅ Falso positivo descartado: Secuencia MZ es parte legítima de datos ID3');
            riskScore -= 10; // Reducir la puntuación
          }
        }
      }
      
      // 5. MEJORA: Detección de inconsistencias de formato más precisa
      if (detectedAudioType && audioBuffer.length < 4000) {
        console.log(`⚠️ Archivo de audio ${detectedAudioType} sospechosamente pequeño: ${audioBuffer.length} bytes`);
        detections['suspiciously-small'] = true;
        riskScore += 3;
      }
      
      // 6. MEJORA: Verificación de ratio de datos más precisa
      if (audioBuffer.length > 10000) {
        const sampleSize = 10000;
        const uniqueBytes = new Set();
        
        // Tomar muestras de diferentes partes del archivo
        for (let i = 0; i < sampleSize; i += 10) {
          const index = Math.floor(i / 10 * audioBuffer.length / 1000);
          if (index < audioBuffer.length) {
            uniqueBytes.add(audioBuffer[index]);
          }
        }
        
        const uniqueRatio = uniqueBytes.size / 256; // Proporción de valores únicos respecto del total posible
        
        // AJUSTE: Reducir umbral para considerar esta anomalía
        if (uniqueRatio < 0.03) {  // Reducido de 0.05 a 0.03
          console.log(`⚠️ Variabilidad sospechosamente baja: ${uniqueRatio.toFixed(4)}`);
          detections['low-entropy'] = true;
          riskScore += 4;
        }
      }
      
      // 7. AJUSTE: Actualizar los niveles de severidad
      let severityLevel = "seguro";
      if (riskScore >= 10) {
        severityLevel = "altamente malicioso";
      } else if (riskScore >= 7) {
        severityLevel = "potencialmente malicioso";
      } else if (riskScore >= 3) {
        severityLevel = "sospechoso";
      } else {
        severityLevel = "seguro";
      }

      // AJUSTE: Aumentar el umbral para considerar un archivo como sospechoso
      const hasSuspiciousContent = riskScore >= 5;  // Aumentado de 3 a 5
      
      return {
        suspicious: hasSuspiciousContent,
        riskScore,
        severityLevel,
        detections,
        detectedAudioType,
        hasValidSignature: hasValidAudioSignature,
        message: hasSuspiciousContent 
          ? `Se encontró contenido ${severityLevel} en el archivo de audio (puntuación: ${riskScore})` 
          : `No se encontraron patrones maliciosos significativos (puntuación: ${riskScore})`,
        detectionDetails: Object.keys(detections)
      };
    } catch (error) {
      console.error("Error verificando contenido de audio:", error);
      return { 
        suspicious: false, 
        error: error.message, 
        message: 'Error durante análisis de seguridad de audio' 
      };
    }
  },

    /**
   * Analiza el contexto donde se encontró una coincidencia en un ID3 tag
   * para determinar si es un falso positivo
   * @param {string} hexData - Datos del encabezado en hexadecimal
   * @returns {Object} - Resultado del análisis
   */
    analyzeID3Context(hexData) {
      if (!hexData.includes('494433')) {
        return { isLikelyID3Data: false };
      }
      
      // Estructura típica de ID3 (ID3 + versión + flags + tamaño)
      const id3HeaderPattern = /494433[0-9a-f]{2}[0-9a-f]{2}[0-9a-f]{8}/i;
      const hasID3Structure = id3HeaderPattern.test(hexData);
      
      const knownID3Frames = [
        'APIC', // Imagen embebida - 41504943
        'COMM', // Comentario - 434f4d4d
        'PRIV', // Datos privados - 50524956
        'USLT', // Letra no sincronizada - 55534c54
        'TXXX', // Texto definido por usuario - 54585858
        'WXXX'  // URL definida por usuario - 57585858
      ];
      
      let isInKnownFrame = false;
      
      for (const frame of knownID3Frames) {
        const frameHex = Buffer.from(frame).toString('hex').toUpperCase();
        if (hexData.toUpperCase().includes(frameHex)) {
          isInKnownFrame = true;
          break;
        }
      }
      
      return {
        isLikelyID3Data: hasID3Structure || isInKnownFrame,
        hasID3Structure,
        isInKnownFrame
      };
    },
  
  /**
   * Verifica si un archivo es un tipo de audio válido basado en su firma
   * @param {Buffer} buffer - Buffer de archivo para analizar
   * @returns {Object} - Resultado con tipo de audio detectado o falso
   */
  identifyAudioType(buffer) {
    // Mapeo de firmas conocidas de archivos de audio
    const signatures = [
      { bytes: [0x49, 0x44, 0x33], mime: 'audio/mpeg', extension: '.mp3', offset: 0, name: 'MP3 (ID3)' },
      { bytes: [0xFF, 0xFB], mime: 'audio/mpeg', extension: '.mp3', offset: 0, name: 'MP3 (sin ID3)' },
      { bytes: [0xFF, 0xF3], mime: 'audio/mpeg', extension: '.mp3', offset: 0, name: 'MP3 variante' },
      { bytes: [0xFF, 0xF2], mime: 'audio/mpeg', extension: '.mp3', offset: 0, name: 'MP3 variante' },
      { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'audio/wav', extension: '.wav', offset: 0, name: 'WAV (RIFF)' },
      { bytes: [0x4F, 0x67, 0x67, 0x53], mime: 'audio/ogg', extension: '.ogg', offset: 0, name: 'OGG' },
      { bytes: [0x66, 0x4C, 0x61, 0x43], mime: 'audio/flac', extension: '.flac', offset: 0, name: 'FLAC' },
      // AAC y M4A tienen firmas más complejas
      { bytes: [0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], mime: 'audio/m4a', extension: '.m4a', offset: 4, name: 'M4A' },
      { bytes: [0x1A, 0x45, 0xDF, 0xA3], mime: 'audio/webm', extension: '.webm', offset: 0, name: 'WEBM' }
    ];

    if (!buffer || buffer.length < 8) {
      return { valid: false, reason: 'Archivo demasiado pequeño para ser un audio válido' };
    }

    for (const sig of signatures) {
      let match = true;
      const offsetToCheck = sig.offset || 0;
      
      if (buffer.length < offsetToCheck + sig.bytes.length) {
        continue;
      }
      
      for (let i = 0; i < sig.bytes.length; i++) {
        if (buffer[offsetToCheck + i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        return {
          valid: true,
          mime: sig.mime,
          extension: sig.extension,
          name: sig.name
        };
      }
    }

    // Si el archivo tiene un tamaño razonable para ser audio pero no coincide con ninguna firma,
    // podría ser un formato no reconocido pero legítimo
    if (buffer.length > 100000) {
      return { 
        valid: false, 
        possibleAudio: true,
        reason: 'Formato de audio no reconocido o sin firma estándar' 
      };
    }

    return { valid: false, reason: 'No se reconoce como un archivo de audio válido' };
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
        '--fdpass',             // Hereda permisos del usuario que ejecuta
        '--stdout',             // Vuelca el reporte por stdout
        '--infected',
        filePath
      ]);
      
      
      let output = '';
      
      clamdscan.stdout.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[ClamAV] ${chunk.trim()}`);
      });
      
      clamdscan.stderr.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[ClamAV Error] ${chunk.trim()}`);
      });
      
      clamdscan.on('close', code => {
        processCompleted = true;
        console.log(`Código de salida clamdscan: ${code}, Output: ${output}`);
        
        // code 0: limpio, code 1: virus encontrado, code 2: error
        if (code === 0) {
          resolve({ clean: true, message: 'Archivo limpio', clamav_completed: true });
        } else if (code === 1) {
          const viruses = output.match(/: ([^:]+) FOUND/g) || [];
          resolve({ 
            clean: false, 
            viruses: viruses.map(v => v.replace(/: |\s+FOUND/g, '')),
            message: 'Virus detectado',
            details: output,
            clamav_completed: true
          });
        } else {
          reject(new Error(`Error en escaneo (código ${code}): ${output}`));
        }
      });
      
      clamdscan.on('error', err => {
        processCompleted = true;
        console.error("[ClamAV] Error iniciando proceso:", err);
        reject(err);
      });
      
      // Aumentar timeout y mostrar mejor mensaje
      setTimeout(() => {
        if (!processCompleted) {
          console.log("[ClamAV] Cancelando escaneo ClamAV por timeout (30 segundos)");
          clamdscan.kill();
          resolve({ 
            clean: true, 
            skipped: true, 
            message: 'Escaneo ClamAV cancelado por timeout',
            details: 'El análisis del archivo con ClamAV excedió el tiempo máximo permitido'
          });
        }
      }, 30000); // 30 segundos de timeout
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
  }
};

export default AudioSecurityService;