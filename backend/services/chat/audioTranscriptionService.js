
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openai, embeddings } from '../../lib/openai.js';
import pool from "../../lib/dbPool.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { wasRequestCancelled, clearCancellationFlag } from './chatServices.js';

const execPromise = promisify(exec);

const ROOT_DIR = process.cwd();
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const AUDIO_UPLOADS_DIR = path.join(UPLOADS_DIR, 'audio_playback');
const AUDIO_TEMP_DIR = path.join(ROOT_DIR, 'tmp', 'audio_processing');
const AUDIO_SEGMENTS_DIR = path.join(UPLOADS_DIR, 'audio_segments');
const AUDIO_COMPRESSED_DIR = path.join(UPLOADS_DIR, 'audio_compressed');

// Asegurar que existan los directorios necesarios
[UPLOADS_DIR, AUDIO_UPLOADS_DIR, AUDIO_TEMP_DIR, AUDIO_SEGMENTS_DIR, AUDIO_COMPRESSED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const AudioTranscriptionService = {
  config: {
    maxFileDuration: 60 * 60, // 1 hora máxima en segundos
    chunkSize: 5000,
    chunkOverlap: 1000,
    maxConcurrentEmbeddings: 10,
    validAudioFormats: ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm'],
    tempDir: AUDIO_TEMP_DIR,
    // Rutas a FFmpeg y FFprobe
    ffmpegPath: ffmpegInstaller.path,
    ffprobePath: ffprobeInstaller.path,

    uploadsDir: UPLOADS_DIR,
    audioUploadsDir: AUDIO_UPLOADS_DIR,
    audioSegmentsDir: AUDIO_SEGMENTS_DIR,
    audioCompressedDir: AUDIO_COMPRESSED_DIR
  },

  initMetrics() {
    return {
      startTime: Date.now(),
      totalChunks: 0,
      processedChunks: 0,
      failedChunks: 0,
      transcriptionDuration: 0,
      audioLengthSeconds: 0,
      conversionDuration: 0
    };
  },

  /**
   * Verifica si un archivo es un formato de audio válido
   */
  isValidAudioFormat(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return this.config.validAudioFormats.includes(extension);
  },

  /**
   * Obtiene metadatos de un archivo de audio
   */
  async getAudioMetadata(filePath, originalFilename) {
    try {
      console.log(`Obteniendo metadatos para audio: ${filePath}`);

      const duration = await this.getAudioDuration(filePath);

      const audioId = uuidv4();

      const title = originalFilename
        ? path.basename(originalFilename, path.extname(originalFilename))
        : `Audio grabado ${new Date().toLocaleString()}`;

      return {
        audioId,
        title,
        type: path.extname(filePath).replace('.', '').toUpperCase(),
        duration,
        uploadDate: new Date().toISOString(),
        source: 'user_upload'
      };
    } catch (error) {
      console.warn('Error obteniendo metadatos de audio:', error.message);

      // Datos básicos como último recurso
      return {
        audioId: uuidv4(),
        title: originalFilename ? path.basename(originalFilename) : 'Audio subido',
        type: path.extname(filePath).replace('.', '').toUpperCase() || 'AUDIO',
        duration: 300, // 5 minutos por defecto
        uploadDate: new Date().toISOString(),
        source: 'user_upload'
      };
    }
  },

  /**
   * Convierte el audio a MP3 si es necesario
   */
  async convertToMp3IfNeeded(inputFilePath, originalFilename) {
    // Si ya es MP3, devolver la ruta original
    if (inputFilePath.toLowerCase().endsWith('.mp3')) {
      return { filePath: inputFilePath, wasConverted: false };
    }

    const conversionStartTime = Date.now();

    try {
      console.log(`Convirtiendo audio a MP3: ${inputFilePath}`);
      const outputFilename = `${path.basename(inputFilePath, path.extname(inputFilePath))}_${uuidv4()}.mp3`;
      const outputFilePath = path.join(this.config.tempDir, outputFilename);

      let useSystemFfmpeg = false;
      try {
        await execPromise('ffmpeg -version');
        useSystemFfmpeg = true;
        console.log('Usando ffmpeg del sistema');
      } catch (e) {
        console.log('ffmpeg no disponible en el sistema, usando versión instalada');
      }

      let cmd;
      if (useSystemFfmpeg) {
        cmd = `ffmpeg -i "${inputFilePath}" -ab 128k -ac 2 -ar 44100 "${outputFilePath}"`;
      } else {
        cmd = `"${this.config.ffmpegPath}" -i "${inputFilePath}" -ab 128k -ac 2 -ar 44100 "${outputFilePath}"`;
      }

      console.log(`Ejecutando comando: ${cmd}`);

      const { stdout, stderr } = await execPromise(cmd);

      if (stderr && !stderr.includes('video:') && !stderr.includes('audio:')) {
        console.warn('Advertencias de ffmpeg:', stderr);
      }

      if (!fs.existsSync(outputFilePath)) {
        throw new Error(`El archivo convertido no fue creado: ${outputFilePath}`);
      }

      this.processingMetrics.conversionDuration = Date.now() - conversionStartTime;
      console.log(`Archivo de audio convertido exitosamente en ${outputFilePath}`);

      return { filePath: outputFilePath, wasConverted: true };
    } catch (error) {
      console.error('Error convirtiendo audio a MP3:', error);
      // Si hay error, devolver el archivo original
      return { filePath: inputFilePath, wasConverted: false };
    }
  },

  /**
   * Obtiene la duración de un archivo de audio en segundos
   */
  async getAudioDuration(audioFilePath) {
    try {
      let useSystemFfprobe = false;
      try {
        await execPromise('ffprobe -version');
        useSystemFfprobe = true;
        console.log('Usando ffprobe del sistema');
      } catch (e) {
        console.log('ffprobe no disponible en el sistema, intentando usar versión instalada');
      }

      let cmd;
      if (useSystemFfprobe) {
        cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFilePath}"`;
      } else {
        cmd = `"${this.config.ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFilePath}"`;
      }

      const { stdout } = await execPromise(cmd);
      return parseFloat(stdout.trim());
    } catch (error) {
      console.error('Error obteniendo duración del audio:', error);
      return 0; // Valor por defecto
    }
  },

  /**
   * Transcribe un archivo de audio usando OpenAI Whisper y genera segmentos con marcas de tiempo
   */
  async transcribeAudio(audioFilePath, chatId) {
    try {
      console.log('Preparando archivo de audio para transcripción...');
      const transcriptionStartTime = Date.now();

      if (!chatId) {
        console.warn('⚠️ transcribeAudio: No se proporcionó chatId - las cancelaciones no funcionarán');
      }

      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`El archivo de audio no existe en la ruta: ${audioFilePath}`);
      }

      const stats = fs.statSync(audioFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`Tamaño del archivo de audio: ${fileSizeMB} MB`);

      // Si el archivo es mayor a 24MB, comprimirlo
      let fileToTranscribe = audioFilePath;
      let segmentFiles = [];

      if (stats.size > 24 * 1024 * 1024) {
        console.log('El archivo excede 24MB, se aplicará compresión...');
        fileToTranscribe = await this.compressAudioFile(audioFilePath);

        const compressedStats = fs.statSync(fileToTranscribe);

        // Si aún es demasiado grande, dividir en segmentos
        if (compressedStats.size > 24 * 1024 * 1024) {
          console.log('El archivo comprimido sigue siendo demasiado grande, se dividirá en segmentos...');
          segmentFiles = await this.splitAudioIntoSegments(fileToTranscribe);

          // Si se crearon segmentos, usarlos
          if (segmentFiles.length > 1) {
            console.log(`Usando ${segmentFiles.length} segmentos para transcripción`);
          } else {
            fileToTranscribe = segmentFiles[0];
          }
        }
      }

      // #################### PUNTO CRÍTICO 1 ####################
      if (chatId) {
        console.log(`PUNTO CRÍTICO: Verificando cancelación para chat ${chatId} antes de transcribir...`);
        const isCancelled = await wasRequestCancelled(chatId);
        if (isCancelled) {
          console.log(`CANCELACIÓN DETECTADA justo antes de transcribir para chat ${chatId}`);
          throw new Error('Procesamiento cancelado por el usuario');
        }
      } else {
        console.warn('No se proporcionó chatId para verificar cancelación en transcribeAudio');
      }

      // Si tenemos segmentos, transcribir cada uno y unir los resultados
      if (segmentFiles.length > 1) {
        let completeTranscription = "";
        let timeOffset = 0;

        for (let i = 0; i < segmentFiles.length; i++) {
          // #################### PUNTO CRÍTICO 2 ####################
          if (chatId) {
            const isCancelled = await wasRequestCancelled(chatId);
            if (isCancelled) {
              console.log(`CANCELACIÓN DETECTADA antes del segmento ${i + 1}/${segmentFiles.length} para chat ${chatId}`);
              throw new Error('Procesamiento cancelado por el usuario');
            }
          }

          const segmentFile = segmentFiles[i];
          console.log(`Transcribiendo segmento ${i + 1}/${segmentFiles.length}: ${path.basename(segmentFile)}`);

          if (i > 0) {
            try {
              const duration = await this.getAudioDuration(segmentFiles[i - 1]);
              timeOffset += duration;
            } catch (e) {
              console.warn('No se pudo obtener la duración del segmento:', e);
            }
          }

          // Transcribir este segmento - pasamos explícitamente el chatId
          const segmentTranscription = await this.transcribeSingleFile(segmentFile, chatId);

          // Ajustar las marcas de tiempo con el desplazamiento actual
          const adjustedTranscription = this.adjustTranscriptionTimestamps(segmentTranscription, timeOffset);

          completeTranscription += adjustedTranscription + "\n\n";
        }

        this.processingMetrics.transcriptionDuration = Date.now() - transcriptionStartTime;
        return completeTranscription.trim();
      } else {
        // Si no hay segmentos, transcribir el archivo único - pasamos explícitamente el chatId
        return await this.transcribeSingleFile(fileToTranscribe, chatId);
      }
    } catch (error) {
      console.error('Error transcribiendo audio con Whisper:', error);
      throw error;
    }
  },


  /**
   * Transcribe un único archivo de audio usando la API de OpenAI
   * Modificado para recibir el chatId y verificar cancelación
   */
  async transcribeSingleFile(audioFilePath, chatId) {
    // #################### PUNTO CRÍTICO 3 ####################
    if (chatId) {
      const isCancelled = await wasRequestCancelled(chatId);
      if (isCancelled) {
        console.log(`CANCELACIÓN DETECTADA antes de transcribir archivo individual para chat ${chatId}`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
    }

    const stats = fs.statSync(audioFilePath);
    console.log(`Transcribiendo archivo: ${path.basename(audioFilePath)} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Leer el archivo como stream
    const audioFile = fs.createReadStream(audioFilePath);

    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"]
    });

    return this.formatTranscriptionWithTimestamps(transcriptionResponse);
  },


  /**
   * Comprime un archivo de audio para reducir su tamaño antes de enviarlo a Whisper
   */
  async compressAudioFile(inputFilePath) {
    try {
      const outputFileName = path.basename(inputFilePath, path.extname(inputFilePath)) + '_compressed.mp3';
      const outputFilePath = path.join(this.config.audioCompressedDir, outputFileName);

      console.log(`Comprimiendo archivo de audio: ${inputFilePath} -> ${outputFilePath}`);

      let useSystemFfmpeg = false;
      try {
        await execPromise('ffmpeg -version');
        useSystemFfmpeg = true;
        console.log('Usando ffmpeg del sistema para compresión');
      } catch (e) {
        console.log('ffmpeg no disponible en el sistema, intentando usar versión instalada');
      }

      // Comando ffmpeg para comprimir el audio
      let cmd;
      if (useSystemFfmpeg) {
        cmd = `ffmpeg -i "${inputFilePath}" -ab 64k -ac 1 -ar 16000 "${outputFilePath}"`;
      } else {
        cmd = `"${this.config.ffmpegPath}" -i "${inputFilePath}" -ab 64k -ac 1 -ar 16000 "${outputFilePath}"`;
      }

      console.log(`Ejecutando comando de compresión: ${cmd}`);

      const { stdout, stderr } = await execPromise(cmd);

      if (stderr && !stderr.includes('video:') && !stderr.includes('audio:')) {
        console.warn('Advertencias de ffmpeg:', stderr);
      }

      if (!fs.existsSync(outputFilePath)) {
        throw new Error(`El archivo comprimido no fue creado: ${outputFilePath}`);
      }

      const originalSize = fs.statSync(inputFilePath).size;
      const compressedSize = fs.statSync(outputFilePath).size;
      const reductionPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

      console.log(`Compresión completada. Tamaño original: ${(originalSize / (1024 * 1024)).toFixed(2)}MB, ` +
        `Tamaño comprimido: ${(compressedSize / (1024 * 1024)).toFixed(2)}MB ` +
        `(reducción del ${reductionPercent}%)`);

      return outputFilePath;
    } catch (error) {
      console.error('Error comprimiendo archivo de audio:', error);
      // Si falla la compresión, devolvemos el archivo original
      return inputFilePath;
    }
  },

  /**
   * Divide un archivo de audio largo en segmentos más pequeños
   */
  async splitAudioIntoSegments(inputFilePath, segmentDurationSecs = 600) {
    try {
      const fileId = path.basename(inputFilePath, path.extname(inputFilePath));
      const segmentsDir = path.join(this.config.audioSegmentsDir, fileId);
      if (!fs.existsSync(segmentsDir)) {
        fs.mkdirSync(segmentsDir, { recursive: true });
      }

      const baseFileName = path.basename(inputFilePath, path.extname(inputFilePath));
      const segmentPattern = path.join(segmentsDir, `${baseFileName}_%03d${path.extname(inputFilePath)}`);
      console.log(`Dividiendo archivo de audio en segmentos de ${segmentDurationSecs} segundos`);

      let useSystemFfmpeg = false;
      try {
        await execPromise('ffmpeg -version');
        useSystemFfmpeg = true;
        console.log('Usando ffmpeg del sistema para segmentación');
      } catch (e) {
        console.log('ffmpeg no disponible en el sistema, intentando usar versión instalada');
      }

      // Comando ffmpeg para dividir el audio en segmentos
      let cmd;
      if (useSystemFfmpeg) {
        cmd = `ffmpeg -i "${inputFilePath}" -f segment -segment_time ${segmentDurationSecs} -c copy "${segmentPattern}"`;
      } else {
        cmd = `"${this.config.ffmpegPath}" -i "${inputFilePath}" -f segment -segment_time ${segmentDurationSecs} -c copy "${segmentPattern}"`;
      }

      console.log(`Ejecutando comando de segmentación: ${cmd}`);

      const { stdout, stderr } = await execPromise(cmd);

      if (stderr && !stderr.includes('video:') && !stderr.includes('audio:')) {
        console.warn('Advertencias de ffmpeg:', stderr);
      }

      const segmentFiles = fs.readdirSync(segmentsDir)
        .filter(file => file.startsWith(baseFileName + '_'))
        .map(file => path.join(segmentsDir, file))
        .sort(); // Ordenar para mantener la secuencia

      console.log(`Se crearon ${segmentFiles.length} segmentos de audio`);

      return segmentFiles;
    } catch (error) {
      console.error('Error dividiendo archivo de audio:', error);
      // Si falla la segmentación, devolvemos un array con el archivo original
      return [inputFilePath];
    }
  },

  /**
   * Ajusta las marcas de tiempo en una transcripción con un desplazamiento
   */
  adjustTranscriptionTimestamps(transcription, offsetSeconds) {
    if (!transcription.includes('**[')) {
      return transcription; // No hay marcas de tiempo, retornar tal cual
    }

    return transcription.replace(/\*\*\[(\d+):(\d+)\s*-\s*(\d+):(\d+)\]\*\*/g, (match, startMin, startSec, endMin, endSec) => {
      const startSeconds = parseInt(startMin) * 60 + parseInt(startSec) + offsetSeconds;
      const endSeconds = parseInt(endMin) * 60 + parseInt(endSec) + offsetSeconds;

      const newStartMin = Math.floor(startSeconds / 60);
      const newStartSec = Math.floor(startSeconds % 60);
      const newEndMin = Math.floor(endSeconds / 60);
      const newEndSec = Math.floor(endSeconds % 60);

      return `**[${newStartMin}:${String(newStartSec).padStart(2, '0')} - ${newEndMin}:${String(newEndSec).padStart(2, '0')}]**`;
    });
  },

  /**
   * Formatea la transcripción con marcas de tiempo por segmentos
   */
  formatTranscriptionWithTimestamps(transcriptionResponse) {
    let formattedText = "";

    if (!transcriptionResponse || !transcriptionResponse.segments) {
      console.warn('La respuesta de transcripción no contiene segmentos');
      return transcriptionResponse.text || "";
    }

    for (const segment of transcriptionResponse.segments) {
      const startTime = this.formatTimeToMinSec(segment.start);
      const endTime = this.formatTimeToMinSec(segment.end);

      formattedText += `**[${startTime} - ${endTime}]**\n${segment.text.trim()}\n\n`;
    }

    return formattedText.trim();
  },

  /**
   * Convierte segundos a formato min:seg
   */
  formatTimeToMinSec(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  /**
   * Divide la transcripción en chunks para procesamiento
   */
  async splitTranscriptionToChunks(transcription, metadata) {
    if (!transcription || transcription.trim() === '') {
      return [];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      // Asegurar que los separadores incluyan segmentos completos con sus marcas de tiempo
      separators: ["\n\n", "\n", " ", ""],
    });

    const normalizedTranscription = this.normalizeText(transcription);

    // Segmentar el texto
    const textChunks = await splitter.splitText(normalizedTranscription);

    return textChunks.map((chunk, index) => {
      let processedChunk = chunk;
      if (!chunk.startsWith("**[")) {
        const timestampMatch = chunk.match(/\*\*\[\d+:\d+\s*-\s*\d+:\d+\]\*\*/);
        if (timestampMatch && timestampMatch.index > 0) {
          // Si encontramos una marca de tiempo en medio del chunk, reorganizamos para que empiece con ella
          processedChunk = chunk.substring(timestampMatch.index);
        }
      }

      return {
        pageContent: processedChunk,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: textChunks.length,
          chunkType: 'transcription',
          contentType: 'audio',
          hasTimestamps: processedChunk.includes("**[")
        }
      };
    });
  },


/**
 * Procesa un archivo de audio, lo transcribe y almacena en la base de datos
 * @param {string} audioFilePath - Ruta del archivo de audio
 * @param {number} userId - ID del usuario
 * @param {string} chatId - ID del chat
 * @param {string} originalFilename - Nombre original del archivo
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
async processAudioFile(audioFilePath, userId, chatId, originalFilename, options = {}) {
  this.processingMetrics = this.initMetrics();
  let filesToCleanup = [];

  if (audioFilePath && fs.existsSync(audioFilePath)) {
    filesToCleanup.push(audioFilePath);
  }

  try {
    // VERIFICACIÓN #1: Verificar cancelación al inicio del procesamiento
    const isCancelledAtStart = await wasRequestCancelled(chatId);
    if (isCancelledAtStart) {
      console.log(`Procesamiento de audio cancelado para chat ${chatId} antes de iniciar`);
      throw new Error('Procesamiento cancelado por el usuario');
    }

    if (!this.isValidAudioFormat(audioFilePath)) {
      throw new Error('Formato de audio no válido');
    }

    console.log(`Procesando archivo de audio: ${audioFilePath}`);

    const conversionResult = await this.convertToMp3IfNeeded(audioFilePath, originalFilename);
    const processedAudioPath = conversionResult.filePath;

    // Si se creó un nuevo archivo durante la conversión, marcarlo para limpieza
    if (conversionResult.wasConverted && processedAudioPath !== audioFilePath) {
      filesToCleanup.push(processedAudioPath);
    }

    const audioMetadata = await this.getAudioMetadata(processedAudioPath, originalFilename);

    // VERIFICACIÓN #2: Verificar cancelación antes de guardar archivo para reproducción
    const isCancelledBeforeStoring = await wasRequestCancelled(chatId);
    if (isCancelledBeforeStoring) {
      console.log(`Procesamiento de audio cancelado para chat ${chatId} antes de guardar archivo`);
      throw new Error('Procesamiento cancelado por el usuario');
    }

    // Esta copia NO se eliminará, es la que queda para reproducción
    const playbackUrl = await this.storeAudioFileForPlayback(
      processedAudioPath,
      chatId,
      audioMetadata.audioId
    );

    const combinedMetadata = {
      ...options,
      ...audioMetadata,
      playbackUrl, // Añadir la URL de reproducción
      source: 'audio',
      processingDate: new Date().toISOString()
    };

    this.processingMetrics.audioLengthSeconds = audioMetadata.duration;

    if (audioMetadata.duration > this.config.maxFileDuration) {
      throw new Error(`La duración del audio (${audioMetadata.duration} segundos) excede el máximo permitido (${this.config.maxFileDuration} segundos)`);
    }

    // VERIFICACIÓN #3: Verificar cancelación antes de transcribir (operación costosa)
    const isCancelledBeforeTranscribe = await wasRequestCancelled(chatId);
    if (isCancelledBeforeTranscribe) {
      console.log(`Procesamiento de audio cancelado para chat ${chatId} antes de transcribir`);
      throw new Error('Procesamiento cancelado por el usuario');
    }

    // Transcribir el audio usando Whisper
    console.log("Transcribiendo audio con Whisper...");
    const transcription = await this.transcribeAudio(processedAudioPath, chatId);
    console.log(`Transcripción completa. Longitud: ${transcription.length} caracteres`);

    const segmentsDir = path.join(this.config.audioSegmentsDir, path.basename(processedAudioPath, path.extname(processedAudioPath)));
    if (fs.existsSync(segmentsDir)) {
      try {
        const segmentFiles = fs.readdirSync(segmentsDir)
          .map(file => path.join(segmentsDir, file));

        filesToCleanup.push(...segmentFiles);

        // También marcar el directorio para eliminación
        filesToCleanup.push(segmentsDir);
      } catch (error) {
        console.warn("No se pudieron listar archivos de segmentos para limpieza:", error);
      }
    }

    const compressedFilePath = path.join(
      this.config.audioCompressedDir,
      path.basename(processedAudioPath, path.extname(processedAudioPath)) + '_compressed.mp3'
    );
    if (fs.existsSync(compressedFilePath) && !filesToCleanup.includes(compressedFilePath)) {
      filesToCleanup.push(compressedFilePath);
    }

    // VERIFICACIÓN #4: Verificar cancelación antes de dividir en chunks
    const isCancelledBeforeChunking = await wasRequestCancelled(chatId);
    if (isCancelledBeforeChunking) {
      console.log(`Procesamiento de audio cancelado para chat ${chatId} antes de dividir en chunks`);
      throw new Error('Procesamiento cancelado por el usuario');
    }

    console.log("Dividiendo transcripción en chunks...");
    const chunks = await this.splitTranscriptionToChunks(transcription, combinedMetadata);
    this.processingMetrics.totalChunks = chunks.length;

    // VERIFICACIÓN #5: Verificar cancelación antes de almacenar en BD
    const isCancelledBeforeDB = await wasRequestCancelled(chatId);
    if (isCancelledBeforeDB) {
      console.log(`Procesamiento de audio cancelado para chat ${chatId} antes de almacenar en BD`);
      throw new Error('Procesamiento cancelado por el usuario');
    }

    console.log("Almacenando transcripción en base de datos...");
    await this.storeTranscriptionInDB(chunks, userId, chatId, combinedMetadata);

    try {
      await clearCancellationFlag(chatId);
      console.log(`Banderas de cancelación limpiadas después de procesamiento exitoso para chat ${chatId}`);
    } catch (clearError) {
      console.warn(`Error al limpiar bandera de cancelación: ${clearError.message}`);
    }

    return {
      success: true,
      chunks: chunks.length,
      metadata: combinedMetadata,
      metrics: {
        ...this.processingMetrics,
        processingTime: Date.now() - this.processingMetrics.startTime,
        averageChunkSize: this.calculateAverageChunkSize(chunks)
      }
    };
  } catch (error) {
    console.error('Error procesando archivo de audio:', error);

    // IMPORTANTE: Verificar si el error es por cancelación
    if (error.message == 'Procesamiento cancelado por el usuario') {
      try {
        await clearCancellationFlag(chatId);
        console.log(`Banderas de cancelación limpiadas después de cancelación para chat ${chatId}`);
      } catch (clearError) {
        console.warn(`Error al limpiar bandera de cancelación: ${clearError.message}`);
      }

      const fileName = originalFilename || "El archivo de audio";
      const fileInfo = options && options.fileType ?
        ` (${options.fileType})` : "";

      const safeMetadata = {
        title: originalFilename || "Audio",
        source: "audio",
        type: options.fileType || "audio",
        cancelled: true,
        ...options
      };

      return {
        success: false,
        cancelled: true,
        status: 'cancelled',
        message: `El procesamiento de ${fileName}${fileInfo} fue cancelado por el usuario.`,
        userMessage: `El procesamiento del audio fue cancelado como capibara que decide no salir del agua porque está muy cómodo 🦫💤

Todo bien, mi sistema de análisis sigue funcionando a la perfección. Es como pausar una canción justo en la parte buena - siempre puedes darle play después.

Si quieres procesar este archivo de audio u otro diferente, solo súbelo cuando estés preparado para que mi cerebro universal lo devore completo.`,
        metadata: safeMetadata,
        metrics: {
          ...this.processingMetrics,
          processingTime: Date.now() - this.processingMetrics.startTime,
          cancelled: true
        }
      };
    }

    // Si no es cancelación, pasar el error mejorado
    throw this.enhanceError(error);
  } finally {
    console.log(`Iniciando limpieza de ${filesToCleanup.length} archivos...`);

    const directories = [];

    for (const filePath of filesToCleanup) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            directories.push(filePath);
          } else {
            fs.unlinkSync(filePath);
            console.log(`Archivo eliminado: ${filePath}`);
          }
        }
      } catch (cleanupError) {
        console.error(`Error eliminando ${filePath}:`, cleanupError);
      }
    }

    for (const dir of directories) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmdirSync(dir);
          console.log(`Directorio eliminado: ${dir}`);
        }
      } catch (dirCleanupError) {
        console.error(`Error eliminando directorio ${dir}:`, dirCleanupError);
      }
    }
  }
},

  /**
   * Almacena una copia permanente del archivo de audio para reproducción
   * @param {string} tempFilePath - Ruta temporal del archivo de audio
   * @param {string} chatId - ID del chat
   * @param {string} audioId - ID único del audio
   * @returns {string} - Ruta permanente del archivo
   */
  async storeAudioFileForPlayback(tempFilePath, chatId, audioId) {
    const extension = path.extname(tempFilePath);

    const permanentDir = this.config.audioUploadsDir;

    // Asegurar que el directorio existe
    if (!fs.existsSync(permanentDir)) {
      fs.mkdirSync(permanentDir, { recursive: true });
    }

    const safeFileName = `${chatId.replace(/-/g, '')}_${audioId}${extension}`;
    const permanentPath = path.join(permanentDir, safeFileName);

    fs.copyFileSync(tempFilePath, permanentPath);

    return `/uploads/audio_playback/${safeFileName}`;
  },

  /**
   * Almacena los chunks de transcripción en la base de datos con información de timestamp
   */
  async storeTranscriptionInDB(chunks, userId, chatId, metadata) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const batchSize = 10;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        const embedPromises = batch.map(doc =>
          this.generateEmbedding(doc.pageContent).catch(err => {
            console.error(`Error embedding chunk ${i}:`, err.message);
            return null;
          })
        );
        const embeddingsResults = await Promise.all(embedPromises);

        for (let j = 0; j < batch.length; j++) {
          const doc = batch[j];
          const embedding = embeddingsResults[j];

          if (!embedding) {
            this.processingMetrics.failedChunks++;
            continue;
          }

          try {
            const timestampInfo = this.extractTimestampInfo(doc.pageContent);

            const query = `
              INSERT INTO agentetube (id_user, id_chat, content, metadata, embedding, special_elements)
              VALUES ($1, $2, $3, $4, $5, $6)
            `;

            const params = [
              userId,
              chatId,
              doc.pageContent,
              {
                ...doc.metadata,
                contentType: 'audio',
                source: doc.metadata.source || 'audio',
                hasTimestamps: timestampInfo.length > 0
              },
              `[${embedding.join(',')}]`,
              JSON.stringify({
                timestamps: timestampInfo,
                audioId: metadata.audioId || null
              })
            ];

            await client.query(query, params);
            this.processingMetrics.processedChunks++;

          } catch (insertError) {
            console.error(`Error insertando chunk ${i + j}:`, insertError);
            this.processingMetrics.failedChunks++;
          }
        }
      }

      await client.query('COMMIT');
      return { success: true, processed: this.processingMetrics.processedChunks };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Extrae y procesa marcas de tiempo de un texto transcrito
   */
  extractTimestampInfo(text) {
    const timestampRegex = /\*\*\[(\d+:\d+)\s*-\s*(\d+:\d+)\]\*\*\n([\s\S]*?)(?=\*\*\[|$)/g;
    const timestamps = [];
    let match;

    while ((match = timestampRegex.exec(text)) !== null) {
      const startTime = match[1];
      const endTime = match[2];
      const content = match[3].trim();

      const startSeconds = this.timeStringToSeconds(startTime);
      const endSeconds = this.timeStringToSeconds(endTime);

      timestamps.push({
        startTime,
        endTime,
        startSeconds,
        endSeconds,
        content
      });
    }

    return timestamps;
  },

  /**
   * Convierte una cadena de tiempo MM:SS a segundos
   */
  timeStringToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return (minutes * 60) + seconds;
  },

  /**
   * Genera embedding para un texto usando el servicio de embeddings
   */
  async generateEmbedding(text) {
    if (!text || text.trim() === '') {
      console.warn("Intento de generar embedding para texto vacío");
      return null;
    }

    try {
      const embedding = await embeddings.embedQuery(text);
      return Array.isArray(embedding) ? embedding : null;
    } catch (error) {
      console.error("Error generando embedding:", error.message);
      return null;
    }
  },

  /**
   * Normaliza el texto para uniformidad
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/\n{3,}/g, '\n\n')  // Reemplazar múltiples saltos de línea con doble salto
      .replace(/[^\S\r\n]+/g, ' ')  // Reemplazar múltiples espacios por uno solo
      .trim();
  },

  /**
   * Calcula el tamaño promedio de los chunks
   */
  calculateAverageChunkSize(chunks) {
    if (!chunks || chunks.length === 0) return 0;
    return chunks.reduce((acc, doc) => acc + (doc.pageContent?.length || 0), 0) / chunks.length;
  },

  /**
   * Mejora el error para un mejor diagnóstico
   */
  enhanceError(error) {
    const enhancedError = new Error(error.message);
    enhancedError.details = {
      type: error.name,
      processingMetrics: this.processingMetrics,
      timestamp: new Date().toISOString()
    };
    return enhancedError;
  }
};

export default AudioTranscriptionService;