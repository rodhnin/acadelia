// securityService.js - VERSIÓN MEJORADA
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

/**
 * Servicio para escaneo de seguridad de PDF
 * Versión mejorada con sistema de puntuación y menos falsos positivos
 */
export const pdfSecurityService = {
  // Configuración de puntuación de amenazas
  THREAT_CONFIG: {
    // Umbral a partir del cual un archivo se considera malicioso
    THRESHOLD: 60,
    
    // Puntuaciones para diferentes tipos de amenazas
    SCORES: {
      EXECUTABLE_HEADER: 100,        // Encabezado de ejecutable (hallazgo definitivo)
      MALICIOUS_JS_PATTERN: 40,      // Patrón de JavaScript claramente malicioso
      SUSPICIOUS_JS_PATTERN: 20,     // Patrón de JavaScript sospechoso
      AUTO_ACTION_JS: 30,            // Acción automática con JavaScript
      LAUNCH_ACTION: 50,             // Acción de lanzamiento de aplicación
      EMBEDDED_FILE: 30,             // Archivo embebido
      SUSPICIOUS_PATTERN: 15,        // Patrón sospechoso general
      SQL_INJECTION: 25,             // Patrón de inyección SQL
      CLAMAV_DETECTION: 100          // Detección positiva de ClamAV
    }
  },
  
  // Lista blanca de patrones de JavaScript seguros comúnmente usados en formularios PDF
  JS_WHITELIST: [
    // Patrones de JavaScript seguros para formularios
    /this\.(?:getField|resetForm)\s*\(/i,
    /event\.(?:target|value|change|source|rc)/i,
    /AFNumber_Format|AFSpecial_Format|AFDate_Format/i,
    /AFMergeChange|AFMakeNumber/i,
    /\.setFocus\(\)/i,
    /util\.printd\(/i
  ],
  
  /**
   * Escanea un archivo con un enfoque avanzado de puntuación de amenazas
   * @param {string} filePath - Ruta al archivo a escanear
   * @returns {Promise<Object>} - Resultado del escaneo
   */
  async scanFile(filePath) {
    try {
      const tempFileName = `scan_${Date.now()}_${path.basename(filePath)}`;
      const tempFilePath = `/tmp/${tempFileName}`;
      
      await fs.promises.copyFile(filePath, tempFilePath);
      console.log(`Archivo copiado a ${tempFilePath} para escaneo`);
      
      const scanResult = {
        threatScore: 0,
        findings: [],
        clean: true,
        message: "Archivo seguro",
        metadata: { filePath },
        isTruncated: false
      };

      // Leer contenido del archivo
      const fileContent = await fs.promises.readFile(tempFilePath);
      const fileSize = fileContent.length;
      
      // Limitar a 10MB para el análisis inicial del contenido
      const MAX_ANALYSIS_SIZE = 10 * 1024 * 1024;
      const analysisContent = fileContent.slice(0, Math.min(fileSize, MAX_ANALYSIS_SIZE));
      scanResult.isTruncated = fileSize > MAX_ANALYSIS_SIZE;
      
      const fileString = analysisContent.toString('utf8', 0, analysisContent.length);
      const fileHex = analysisContent.toString('hex', 0, Math.min(analysisContent.length, 20000));
      
      if (!this.isPDF(fileContent)) {
        this.addFinding(scanResult, "NO_PDF", 100, "El archivo no es un PDF válido");
        await this.cleanupTempFile(tempFilePath);
        return this.finalizeResult(scanResult);
      }
      
      // 1. ESCANEO AVANZADO DE BINARIOS Y EJECUTABLES
      await this.scanForExecutables(scanResult, fileContent, fileHex);
      
      // Salir temprano si ya se encontró algo definitivo
      if (scanResult.threatScore >= this.THREAT_CONFIG.THRESHOLD) {
        await this.cleanupTempFile(tempFilePath);
        return this.finalizeResult(scanResult);
      }
      
      // 2. ANÁLISIS DE ESTRUCTURA DE PDF
      await this.analyzePDFStructure(scanResult, fileContent, fileString);
      
      // Salir temprano si ya se encontró algo definitivo
      if (scanResult.threatScore >= this.THREAT_CONFIG.THRESHOLD) {
        await this.cleanupTempFile(tempFilePath);
        return this.finalizeResult(scanResult);
      }
      
      // 3. ESCANEO ANTIVIRUS CON CLAMAV
      const clamResult = await this.scanWithClamdscanCommand(tempFilePath);
      if (!clamResult.clean) {
        this.addFinding(
          scanResult, 
          "CLAMAV_DETECTION", 
          this.THREAT_CONFIG.SCORES.CLAMAV_DETECTION,
          `ClamAV detectó: ${clamResult.viruses?.join(', ') || 'amenaza desconocida'}`
        );
      }
      
      await this.cleanupTempFile(tempFilePath);
      
      return this.finalizeResult(scanResult);
    } catch (error) {
      console.error("Error en escaneo de seguridad:", error);
      return { 
        clean: false, 
        error: error.message, 
        message: "Error durante el escaneo de seguridad" 
      };
    }
  },
  
  /**
   * Verifica si un buffer contiene un PDF válido
   * @param {Buffer} buffer - Buffer a verificar
   * @returns {boolean} - true si es un PDF válido
   */
  isPDF(buffer) {
    try {
      const signature = buffer.toString('utf8', 0, 8);
      return /^%PDF-1\.[0-9]/.test(signature);
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Escanea el contenido en busca de ejecutables y binarios maliciosos
   * @param {Object} scanResult - Resultado del escaneo a actualizar
   * @param {Buffer} fileContent - Contenido del archivo
   * @param {string} fileHex - Contenido del archivo en formato hexadecimal
   */
  async scanForExecutables(scanResult, fileContent, fileHex) {
    console.log("Realizando escaneo avanzado de binarios y ejecutables...");
    
    // Patrones de encabezados de archivos ejecutables (definitivos)
    const executablePatterns = [
      { 
        pattern: '4d5a', 
        name: "Ejecutable Windows (MZ)", 
        type: "EXECUTABLE_HEADER",
        context: "primeros_bytes" 
      },
      { 
        pattern: '7f454c46', 
        name: "Ejecutable Linux (ELF)", 
        type: "EXECUTABLE_HEADER",
        context: "primeros_bytes"
      },
      { 
        pattern: 'cafebabe', 
        name: "Archivo Java Class", 
        type: "EXECUTABLE_HEADER",
        context: "primeros_bytes"
      },
      { 
        pattern: '504b0304', 
        name: "Archivo ZIP/JAR", 
        type: "SUSPICIOUS_PATTERN",
        context: "contenido_stream" 
      }
    ];
    
    const headerHex = fileHex.substring(0, 1000);
    for (const {pattern, name, type, context} of executablePatterns) {
      if (context === "primeros_bytes" && headerHex.includes(pattern.toLowerCase())) {
        this.addFinding(
          scanResult, 
          type, 
          this.THREAT_CONFIG.SCORES.EXECUTABLE_HEADER,
          `Encabezado de ejecutable detectado: ${name}`
        );
        return; // Salir temprano, hallazgo definitivo
      }
    }
    
    // Esto reduce falsos positivos al ignorar texto normal que podría coincidir
    const streamMatches = this.extractPDFStreams(fileContent);
    if (streamMatches && streamMatches.length > 0) {
      const streamContent = Buffer.concat(streamMatches);
      const streamHex = streamContent.toString('hex');
      
      for (const {pattern, name, type, context} of executablePatterns) {
        if (context === "contenido_stream" && streamHex.includes(pattern.toLowerCase())) {
          this.addFinding(
            scanResult, 
            type,
            this.THREAT_CONFIG.SCORES[type],
            `Contenido sospechoso en stream: ${name}`
          );
        }
      }
    }
  },
  
  /**
   * Extrae los streams de un PDF para análisis específico
   * @param {Buffer} pdfBuffer - Buffer del PDF
   * @returns {Array<Buffer>} - Array de buffers de streams
   */
  extractPDFStreams(pdfBuffer) {
    try {
      const pdfString = pdfBuffer.toString('utf8');
      const streams = [];
      
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      
      while ((match = streamRegex.exec(pdfString)) !== null) {
        if (match[1]) {
          streams.push(Buffer.from(match[1]));
        }
      }
      
      return streams;
    } catch (error) {
      console.error("Error extrayendo streams de PDF:", error);
      return [];
    }
  },
  
  /**
   * Analiza la estructura del PDF para detectar características peligrosas
   * @param {Object} scanResult - Resultado del escaneo a actualizar
   * @param {Buffer} fileContent - Contenido del archivo
   * @param {string} fileString - Contenido del archivo como string
   */
  async analyzePDFStructure(scanResult, fileContent, fileString) {
    console.log("Analizando estructura del PDF...");
    
    try {
      const pdfDoc = await PDFDocument.load(fileContent, { 
        ignoreEncryption: true,
        updateMetadata: false
      });
      
      await this.analyzePDFObjects(scanResult, fileString);
      
    } catch (error) {
      console.warn("Error en análisis estructural del PDF:", error);
      this.addFinding(
        scanResult, 
        "CORRUPT_STRUCTURE", 
        10, // Puntuación baja - podría ser corrupción legítima
        "Estructura de PDF corrupta o no estándar"
      );
    }
  },

  /**
   * Analiza objetos PDF en busca de contenido malicioso con análisis contextual
   * @param {Object} scanResult - Resultado del escaneo a actualizar
   * @param {string} fileString - Contenido del archivo como string
   */
  async analyzePDFObjects(scanResult, fileString) {
    // Patrones maliciosos de JavaScript en PDF con contexto
    const jsPatterns = [
      // JavaScript claramente malicioso - puntuación alta
      { 
        regex: /\/JS\s*\([\s\S]*?eval\s*\(/i, 
        name: "JavaScript con eval()", 
        type: "MALICIOUS_JS_PATTERN" 
      },
      { 
        regex: /\/JavaScript\s*\([\s\S]*?eval\s*\(/i, 
        name: "JavaScript con eval()", 
        type: "MALICIOUS_JS_PATTERN" 
      },
      { 
        regex: /\/JS\s*\([\s\S]*?this\["eval"\]/i, 
        name: "JavaScript con eval ofuscado", 
        type: "MALICIOUS_JS_PATTERN" 
      },
      { 
        regex: /util\.printf[\s\S]*?%.*?%[\s\S]*?%/i, 
        name: "Exploit util.printf", 
        type: "MALICIOUS_JS_PATTERN" 
      },
      { 
        regex: /Collab\.collectEmailInfo/i, 
        name: "Recolección de email", 
        type: "MALICIOUS_JS_PATTERN" 
      },
      { 
        regex: /app\.launchURL/i, 
        name: "Lanzamiento de URL", 
        type: "SUSPICIOUS_JS_PATTERN" 
      },
      
      // JavaScript potencialmente sospechoso - puntuación media
      { 
        regex: /getAnnots?\s*\(\s*\)/i, 
        name: "Acceso a anotaciones", 
        type: "SUSPICIOUS_JS_PATTERN" 
      },
      { 
        regex: /app\.openDoc/i, 
        name: "Apertura de documento", 
        type: "SUSPICIOUS_JS_PATTERN" 
      },
      { 
        regex: /app\.execMenuItem/i, 
        name: "Ejecución de menú", 
        type: "SUSPICIOUS_JS_PATTERN" 
      }
    ];
    
    for (const {regex, name, type} of jsPatterns) {
      if (regex.test(fileString)) {
        if (!this.isInJavaScriptWhitelist(fileString, regex)) {
          this.addFinding(
            scanResult, 
            type, 
            this.THREAT_CONFIG.SCORES[type],
            `JavaScript potencialmente malicioso: ${name}`
          );
        }
      }
    }
    
    const autoActionJsRegex = /\/OpenAction\s*<<[\s\S]*?\/S\s*\/JavaScript/i;
    const documentAAJsRegex = /\/AA\s*<<[\s\S]*?\/S\s*\/JavaScript/i;
    
    if (autoActionJsRegex.test(fileString) || documentAAJsRegex.test(fileString)) {
      this.addFinding(
        scanResult, 
        "AUTO_ACTION_JS", 
        this.THREAT_CONFIG.SCORES.AUTO_ACTION_JS,
        "Acciones automáticas con JavaScript"
      );
    }
    
    const launchActionRegex = /\/Launch\s*<<[\s\S]*?\/[FW][\s\S]*?\(/i;
    if (launchActionRegex.test(fileString)) {
      this.addFinding(
        scanResult, 
        "LAUNCH_ACTION", 
        this.THREAT_CONFIG.SCORES.LAUNCH_ACTION,
        "Acción de lanzamiento de aplicación"
      );
    }
    
    const embeddedFileRegex = /\/EmbeddedFiles[\s\S]*?\/Names/i;
    if (embeddedFileRegex.test(fileString)) {
      const fileSpecRegex = /\/Type\s*\/Filespec[\s\S]*?\/F\s*\((.*?)\)/g;
      let match;
      let foundDangerous = false;
      
      while ((match = fileSpecRegex.exec(fileString)) !== null) {
        const filename = match[1] || "";
        if (/\.(exe|dll|bat|vbs|ps1|sh|cmd|msi|scr)$/i.test(filename)) {
          this.addFinding(
            scanResult, 
            "EMBEDDED_FILE", 
            this.THREAT_CONFIG.SCORES.EMBEDDED_FILE,
            `Archivo embebido peligroso: ${filename}`
          );
          foundDangerous = true;
        }
      }
      
      // Si hay archivos embebidos pero no parecen peligrosos, agregar con puntuación baja
      if (!foundDangerous && embeddedFileRegex.test(fileString)) {
        this.addFinding(
          scanResult, 
          "EMBEDDED_FILE", 
          10, // Puntuación baja para archivos que no parecen peligrosos
          "Archivo embebido (podría ser inofensivo)"
        );
      }
    }
    
    // Esto reduce falsos positivos cuando el PDF es sobre SQL legítimo
    const sqlInjectionPatterns = [
      { 
        regex: /UNION\s+SELECT.{0,20}FROM/i, 
        name: "UNION SELECT" 
      },
      { 
        regex: /OR\s+1\s*=\s*1--/i, 
        name: "OR 1=1" 
      },
      { 
        regex: /'\s+OR\s+'1'\s*=\s*'1/i, 
        name: "' OR '1'='1" 
      },
      { 
        regex: /;\s*exec\s+/i, 
        name: "; exec" 
      }
    ];
    
    const jsContexts = [
      /\/JavaScript\s*\(([\s\S]*?)\)/gi,
      /\/JS\s*\(([\s\S]*?)\)/gi,
      /stream\r?\n([\s\S]*?)\r?\nendstream/gi
    ];
    
    for (const contextRegex of jsContexts) {
      let contextMatch;
      while ((contextMatch = contextRegex.exec(fileString)) !== null) {
        const contextContent = contextMatch[1] || "";
        
        for (const {regex, name} of sqlInjectionPatterns) {
          if (regex.test(contextContent)) {
            this.addFinding(
              scanResult, 
              "SQL_INJECTION", 
              this.THREAT_CONFIG.SCORES.SQL_INJECTION,
              `Posible SQL Injection: ${name}`
            );
          }
        }
      }
    }
  },
  
  /**
   * Verifica si un patrón de JavaScript está en la lista blanca
   * @param {string} content - Contenido del archivo
   * @param {RegExp} suspiciousPattern - Patrón sospechoso encontrado
   * @returns {boolean} - true si está en la lista blanca
   */
  isInJavaScriptWhitelist(content, suspiciousPattern) {
    const match = suspiciousPattern.exec(content);
    if (!match) return false;
    
    const startIndex = Math.max(0, match.index - 100);
    const endIndex = Math.min(content.length, match.index + match[0].length + 100);
    const context = content.substring(startIndex, endIndex);
    
    for (const whitelistPattern of this.JS_WHITELIST) {
      if (whitelistPattern.test(context)) {
        console.log(`Patrón en lista blanca encontrado: ${whitelistPattern}`);
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Escanea archivo con ClamAV
   * @param {string} filePath - Ruta al archivo
   * @returns {Promise<Object>} - Resultado del escaneo
   */
  async scanWithClamdscanCommand(filePath) {
    return new Promise((resolve, reject) => {
      let processCompleted = false;
      
      console.log("Ejecutando escaneo ClamAV...");
      
      const clamdscan = spawn('clamdscan', [
        '--fdpass',
        '--stdout',
        '--infected',
        filePath
      ]);
      
      let output = '';
      
      clamdscan.stdout.on('data', data => {
        output += data.toString();
      });
      
      clamdscan.stderr.on('data', data => {
        output += data.toString();
      });
      
      clamdscan.on('close', code => {
        processCompleted = true;
        
        // code 0: limpio, code 1: virus encontrado, code 2: error
        if (code === 0) {
          resolve({ clean: true, message: 'Archivo limpio según ClamAV' });
        } else if (code === 1) {
          const viruses = output.match(/: ([^:]+) FOUND/g) || [];
          resolve({ 
            clean: false, 
            viruses: viruses.map(v => v.replace(/: |\s+FOUND/g, '')),
            message: 'Virus detectado por ClamAV'
          });
        } else {
          // Error en ClamAV - no tratar como detección positiva
          console.warn(`Error en escaneo ClamAV (código ${code}): ${output}`);
          resolve({ 
            clean: true, 
            warning: `Error en ClamAV: ${output || 'desconocido'}`,
            message: 'Error en escaneo antivirus, verificación parcial'
          });
        }
      });
      
      clamdscan.on('error', err => {
        processCompleted = true;
        console.warn("[ClamAV] Error iniciando proceso:", err);
        // Si ClamAV no está disponible, no bloquear el archivo
        resolve({ 
          clean: true, 
          warning: `ClamAV no disponible: ${err.message}`,
          message: 'Verificación antivirus no disponible'
        });
      });
      
      // Timeout de 30 segundos
      setTimeout(() => {
        if (!processCompleted) {
          console.log("[ClamAV] Cancelando escaneo por timeout");
          clamdscan.kill();
          resolve({ 
            clean: true, 
            warning: 'Timeout en escaneo ClamAV',
            message: 'Timeout en escaneo antivirus'
          });
        }
      }, 30000);
    });
  },
  
  /**
   * Agrega un hallazgo al resultado del escaneo
   * @param {Object} result - Resultado del escaneo
   * @param {string} type - Tipo de hallazgo
   * @param {number} score - Puntuación de amenaza
   * @param {string} description - Descripción del hallazgo
   */
  addFinding(result, type, score, description) {
    result.findings.push({
      type,
      score,
      description,
      timestamp: new Date().toISOString()
    });
    
    result.threatScore += score;
    console.log(`Hallazgo: ${description} (score: ${score}, total: ${result.threatScore})`);
  },
  
  /**
   * Limpia archivo temporal
   * @param {string} filePath - Ruta al archivo temporal
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.promises.unlink(filePath);
      console.log(`Archivo temporal eliminado: ${filePath}`);
    } catch (e) {
      console.warn(`Error eliminando archivo temporal: ${e.message}`);
    }
  },
  
  /**
   * Finaliza el resultado del escaneo basado en la puntuación de amenaza
   * @param {Object} result - Resultado del escaneo
   * @returns {Object} - Resultado final
   */
  finalizeResult(result) {
    if (result.threatScore >= this.THREAT_CONFIG.THRESHOLD) {
      result.clean = false;
      
      const topFindings = result.findings
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(f => f.description);
      
      result.message = `Contenido malicioso detectado: ${topFindings.join(', ')}`;
      result.viruses = result.findings.map(f => f.description);
    } else if (result.threatScore > 0) {
      // Archivo con algunas características sospechosas pero bajo el umbral
      result.clean = true;
      result.suspicious = true;
      result.message = `Archivo potencialmente sospechoso (puntuación: ${result.threatScore}/${this.THREAT_CONFIG.THRESHOLD})`;
    } else {
      // Archivo completamente limpio
      result.clean = true;
      result.message = "Archivo seguro";
    }
    
    return result;
  },

  /**
   * Limpia metadatos del PDF
   * @param {Buffer} pdfBuffer - Buffer del PDF original
   * @returns {Promise<Buffer>} - Buffer del PDF limpiado
   */
  async cleanPDFMetadata(pdfBuffer) {
    try {
      if (!this.isPDF(pdfBuffer)) {
        console.warn("El archivo no parece ser un PDF válido");
        return pdfBuffer;
      }
      
      const pdfDoc = await PDFDocument.load(pdfBuffer, { 
        ignoreEncryption: true 
      });
      
      const originalMetadata = {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        keywords: pdfDoc.getKeywords(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer()
      };
      
      console.log("Limpiando metadatos de PDF:", originalMetadata);
      
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]); // Debe ser un array, no una cadena
      pdfDoc.setCreator('PDF System');
      pdfDoc.setProducer('PDF System');
      
      const cleanPdfBytes = await pdfDoc.save();
      return Buffer.from(cleanPdfBytes);
    } catch (error) {
      console.error("Error limpiando metadatos:", error);
      return pdfBuffer; // En caso de error, devolver el buffer original
    }
  },
  
  /**
   * Sanitiza un PDF usando qpdf
   * @param {string} inputPath - Ruta al archivo PDF original
   * @param {string} outputPath - Ruta para guardar el PDF sanitizado
   * @returns {Promise<boolean>} - true si la sanitización fue exitosa
   */
  async sanitizePDF(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      this.checkQPDFAvailability().then(qpdfAvailable => {
        if (!qpdfAvailable) {
          console.warn("qpdf no está disponible. Omitiendo sanitización.");
          fs.copyFile(inputPath, outputPath, err => {
            if (err) {
              reject(new Error(`Error copiando archivo: ${err.message}`));
            } else {
              resolve(false); // Sanitización omitida
            }
          });
          return;
        }
        
        const qpdf = spawn('qpdf', [
          '--linearize',                 // Optimiza y repara estructura
          '--decrypt',                   // Elimina encriptación
          '--remove-restrictions',       // Elimina restricciones
          '--suppress-recovery',         // Evita recuperación automática de archivos dañados
          inputPath,                     // Archivo de entrada
          outputPath                     // Archivo de salida
        ]);
        
        let errorOutput = '';
        
        qpdf.stderr.on('data', data => {
          errorOutput += data.toString();
        });
        
        qpdf.on('close', code => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`Sanitización fallida con código ${code}: ${errorOutput}`));
          }
        });
        
        qpdf.on('error', err => {
          reject(new Error(`Error ejecutando qpdf: ${err.message}`));
        });
      }).catch(err => {
        console.error("Error verificando disponibilidad de qpdf:", err);
        reject(new Error("Error verificando disponibilidad de qpdf"));
      });
    });
  },
  
  /**
   * Verifica si qpdf está disponible en el sistema
   * @returns {Promise<boolean>} - true si qpdf está disponible
   */
  async checkQPDFAvailability() {
    return new Promise(resolve => {
      const qpdf = spawn('qpdf', ['--version']);
      
      qpdf.on('close', code => {
        resolve(code === 0);
      });
      
      qpdf.on('error', () => {
        resolve(false);
      });
      
      // Timeout
      setTimeout(() => resolve(false), 1000);
    });
  }
};

export default pdfSecurityService;