
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openai, embeddings } from '../../lib/openai.js';
import pool from "../../lib/dbPool.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { wasRequestCancelled, clearCancellationFlag } from './chatServices.js';
import crypto from 'crypto';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../../../');
const uploadsDir = path.join(rootDir, 'uploads/youtube');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const YouTubeAudioService = {
  config: {
    maxFileDuration: 60 * 60, // 1 hora máxima en segundos
    chunkSize: 5000,
    chunkOverlap: 1000,
    maxConcurrentEmbeddings: 10,
    validYouTubeRegex: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
    tempDir: uploadsDir,
    ffmpegPath: process.env.NODE_ENV === 'production' ? 'ffmpeg' : ffmpegInstaller.path,
    ffprobePath: process.env.NODE_ENV === 'production' ? 'ffprobe' : ffprobeInstaller.path,
    rapidApiKey: process.env.RAPIDAPI_KEY,
    rapidApiHost: process.env.RAPIDAPI_HOST || 'youtube-mp3-2025.p.rapidapi.com',
    rapidApiUsername: process.env.RAPIDAPI_USERNAME || 'acadeliasystem',
  },

  initMetrics() {
    return {
      startTime: Date.now(),
      totalChunks: 0,
      processedChunks: 0,
      failedChunks: 0,
      transcriptionDuration: 0,
      audioLengthSeconds: 0,
      downloadDuration: 0,
      conversionDuration: 0,
      retryAttempts: 0,
      strategiesUsed: [],
      systemTools: null,
      browsersAvailable: null,
      // Métricas RapidAPI
      apiCallDuration: 0,
      fileDownloadDuration: 0,
      downloadSource: 'youtube-mp3-2025',
      apiSuccess: false,
      extractedMetadata: null
    };
  },

  /**
   * Verifica si una URL es una URL de YouTube válida
   */
  isValidYouTubeUrl(url) {
    return this.config.validYouTubeRegex.test(url);
  },

  /**
   * Extrae el ID de un video de YouTube de la URL
   */
  extractVideoId(url) {
    try {
      let videoId = null;

      if (url.includes('youtu.be/')) {
        const match = url.match(/youtu\.be\/([^?&]+)/);
        if (match && match[1]) videoId = match[1];
      }
      else if (url.includes('youtube.com/watch')) {
        const match = url.match(/[?&]v=([^?&]+)/);
        if (match && match[1]) videoId = match[1];
      }
      else if (url.includes('youtube.com/embed/')) {
        const match = url.match(/embed\/([^?&/]+)/);
        if (match && match[1]) videoId = match[1];
      }
      else if (url.includes('youtube.com/shorts/')) {
        const match = url.match(/shorts\/([^?&/]+)/);
        if (match && match[1]) videoId = match[1];
      }

      if (videoId) {
        videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
        return videoId.length === 11 ? videoId : null;
      }

      return null;
    } catch (error) {
      console.error('Error extracting video ID:', error);
      return null;
    }
  },

  /**
   * Obtiene metadatos del video usando datos extraídos de la API o fallbacks
   */
  async getVideoMetadata(url, videoId) {
    try {
      console.log(`📡 Preparando metadatos para video ${videoId}...`);

      if (this.extractedMetadata) {
        console.log('✅ Usando metadatos reales de API');

        return {
          videoId: videoId,
          title: this.extractedMetadata.title || `Video de YouTube (${videoId})`,
          channel: this.extractedMetadata.channel || 'Canal desconocido',
          uploadDate: this.parseUploadDate(this.extractedMetadata.uploadDate) || new Date().toISOString().split('T')[0],
          duration: this.parseDuration(this.extractedMetadata.duration) || 300,
          description: (this.extractedMetadata.description || 'Descripción no disponible').substring(0, 500),
          viewCount: this.extractedMetadata.viewCount || 0,
          thumbnail: this.extractedMetadata.thumbnail || null
        };
      }

      return {
        videoId: videoId,
        title: `Video de YouTube (${videoId})`,
        channel: 'Canal desconocido',
        uploadDate: new Date().toISOString().split('T')[0],
        duration: 300,
        description: 'Descripción no disponible',
        viewCount: 0,
        thumbnail: null
      };

    } catch (error) {
      console.warn('⚠️ Error obteniendo metadatos:', error.message);

      return {
        videoId: videoId,
        title: `Video de YouTube (ID: ${videoId})`,
        channel: 'Canal desconocido',
        uploadDate: new Date().toISOString().split('T')[0],
        duration: 300,
        description: 'Descripción no disponible',
        viewCount: 0,
        thumbnail: null
      };
    }
  },

  /**
   * Parsea fecha de subida en diferentes formatos
   */
  parseUploadDate(dateString) {
    if (!dateString) return null;

    try {
      // Formato YYYYMMDD
      if (/^\d{8}$/.test(dateString)) {
        return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
      }

      // Formato ISO
      if (dateString.includes('T') || dateString.includes('-')) {
        return new Date(dateString).toISOString().split('T')[0];
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Parsea duración en diferentes formatos
   */
  parseDuration(duration) {
    if (!duration) return 300;

    // Si ya es número
    if (typeof duration === 'number') return duration;

    // Si es string numérico
    if (/^\d+$/.test(duration)) return parseInt(duration);

    // Formato HH:MM:SS o MM:SS
    const timeMatch = duration.match(/^(?:(\d+):)?(\d+):(\d+)$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || 0);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }

    return 300;
  },

  /**
   * Genera MD5 hash para whitelist
   */
  generateMD5Hash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  },

  async downloadAndConvertToMp3(videoId, url) {
    const downloadStartTime = Date.now();
    let lastError = null;

    const chatId = this.getCurrentChatId?.() || this.processingChatId;
    if (chatId) {
      console.log(`🔍 [${chatId}] Verificando cancelación antes de iniciar descarga...`);
      const isCancelled = await this.checkCancellationOptimized(chatId);
      if (isCancelled) {
        console.log(`🚫 [${chatId}] CANCELACIÓN detectada antes de descarga - ABORTANDO`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
    }

    // APIs simplificadas (solo las que funcionan)
    const apiStrategies = [
      {
        name: 'YouTube MP3 2025 (Principal)',
        execute: async () => await this.downloadWithOriginalAPI(videoId, url)
      },
      {
        name: 'YouTube MP3 v6 (ytjar)',
        execute: async () => await this.downloadWithBackupAPI3(videoId)
      }
    ];

    console.log(`🚀 Descarga iniciada: ${videoId}`);

    // Intento único por API (sin reintentos múltiples)
    for (let i = 0; i < apiStrategies.length; i++) {
      const strategy = apiStrategies[i];

      if (chatId) {
        console.log(`🔍 [${chatId}] Verificando cancelación antes de ${strategy.name}...`);
        const isCancelled = await this.checkCancellationOptimized(chatId);
        if (isCancelled) {
          console.log(`🚫 [${chatId}] CANCELACIÓN detectada antes de ${strategy.name} - ABORTANDO`);
          throw new Error('Procesamiento cancelado por el usuario');
        }
      }

      try {
        console.log(`🔄 ${strategy.name} (${i + 1}/${apiStrategies.length})...`);
        const result = await strategy.execute();

        this.processingMetrics.downloadDuration = Date.now() - downloadStartTime;
        this.processingMetrics.strategiesUsed.push(strategy.name);
        this.processingMetrics.apiSuccess = true;

        console.log(`✅ Descarga exitosa: ${strategy.name}`);
        return result;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ ${strategy.name} falló:`, error.message);

        if (i < apiStrategies.length - 1) {
          console.log(`⏭️ Intentando siguiente API inmediatamente...`);
        }
      }
    }

    this.processingMetrics.apiSuccess = false;
    throw new Error(`Todas las APIs fallaron. Último error: ${lastError?.message || 'Desconocido'}`);
  },

  async downloadWithOriginalAPI(videoId, url) {
    const tempFilePath = path.join(this.config.tempDir, `${videoId}_${uuidv4()}.mp3`);

    console.log('📡 API YouTube MP3 2025...');
    const apiStartTime = Date.now();

    const apiResponse = await axios({
      method: 'GET',
      url: `https://${this.config.rapidApiHost}/v1/social/youtube/audio`,
      params: {
        id: videoId,
        ext: 'mp3',
        quality: '128kbps'
      },
      headers: {
        'X-RapidAPI-Key': this.config.rapidApiKey,
        'X-RapidAPI-Host': this.config.rapidApiHost
      },
      timeout: 15000 // ✅ REDUCIDO de 30000
    });

    this.processingMetrics.apiCallDuration = Date.now() - apiStartTime;

    const audioData = apiResponse.data;

    if (!audioData) {
      throw new Error('API principal falló: Sin datos');
    }

    if (audioData.error && audioData.error !== 'false' && audioData.error !== false) {
      throw new Error(`API principal falló: ${audioData.error}`);
    }

    if (audioData.message && audioData.message.includes('error')) {
      throw new Error(`API principal falló: ${audioData.message}`);
    }

    this.extractedMetadata = {
      title: audioData.title || audioData.video_title || audioData.name || null,
      duration: audioData.lengthSeconds || audioData.duration || audioData.length || null,
      channel: audioData.author || audioData.uploader || audioData.channel || null,
      description: audioData.description || null,
      uploadDate: audioData.upload_date || audioData.published || null,
      viewCount: audioData.viewCount || audioData.view_count || audioData.views || null,
      thumbnail: audioData.thumbnail || audioData.thumb || null
    };

    const downloadUrl = audioData.linkDownload || audioData.linkDownloadProgress ||
      audioData.url || audioData.downloadUrl || audioData.download_url;

    if (!downloadUrl) {
      throw new Error('No se encontró enlace de descarga');
    }

    console.log(`📥 Descargando archivo...`);

    try {
      return await this.downloadFileFromUrl(downloadUrl, tempFilePath);
    } catch (downloadError) {
      if (downloadError.message.includes('invalid or expired token') ||
        downloadError.message.includes('Token de descarga expirado')) {
        throw new Error('Token de descarga expirado en API principal');
      }
      throw downloadError;
    }
  },


  /**
   * BACKUP API 3: YouTube MP3 v6 (ytjar) - ARREGLADA
   */
  async downloadWithBackupAPI3(videoId) {
    const tempFilePath = path.join(this.config.tempDir, `${videoId}_backup3_${uuidv4()}.mp3`);

    const apiResponse = await axios({
      method: 'GET',
      url: 'https://youtube-mp36.p.rapidapi.com/dl',
      params: { id: videoId },
      headers: {
        'X-RapidAPI-Key': this.config.rapidApiKey,
        'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
      },
      timeout: 30000
    });

    const data = apiResponse.data;
    console.log('🔍 Respuesta de ytjar:', data);

    const downloadUrl = data.link || data.download_url || data.url || data.downloadLink || data.mp3;

    if (!downloadUrl) {
      throw new Error('Backup API 3 falló: Sin enlace de descarga en respuesta');
    }

    this.extractedMetadata = {
      title: data.title || null,
      duration: data.duration || null,
      channel: data.channel || null,
      description: null,
      uploadDate: null,
      viewCount: null,
      thumbnail: data.thumbnail || null
    };

    console.log(`📥 Enlace obtenido de Backup API 3: ${downloadUrl.substring(0, 50)}...`);
    return await this.downloadFileFromUrl(downloadUrl, tempFilePath, true);
  },

  /**
   * FUNCIÓN AUXILIAR: Descarga archivo desde URL - VERIFICACIONES REDUCIDAS
   */
  async downloadFileFromUrl(downloadUrl, filePath, useWhitelist = false) {
    console.log('⬇️ Descargando archivo...');
    const fileDownloadStartTime = Date.now();
    const chatId = this.getCurrentChatId?.() || this.processingChatId;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'audio/mpeg, audio/*, */*',
      'Accept-Encoding': 'identity'
    };

    if (useWhitelist && this.config.rapidApiUsername) {
      headers['User-Agent'] += ` ${this.config.rapidApiUsername}`;
      headers['X-RUN'] = this.generateMD5Hash(this.config.rapidApiUsername);
    }

    try {
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 900000,
        maxContentLength: 100 * 1024 * 1024,
        headers: headers,
        validateStatus: (status) => status < 400
      });

      if (response.status !== 200) {
        throw new Error(`Error descargando: HTTP ${response.status}`);
      }

      const writer = fs.createWriteStream(filePath, { highWaterMark: 64 * 1024 });
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        let downloadedBytes = 0;
        let lastCancellationCheck = Date.now();
        const contentLength = parseInt(response.headers['content-length'] || '0');

        response.data.on('data', async (chunk) => {
          downloadedBytes += chunk.length;

          if (chatId && (downloadedBytes % (2 * 1024 * 1024) < chunk.length)) {
            const now = Date.now();

            if (now - lastCancellationCheck > 3000) {
              try {
                const isCancelled = await this.checkCancellationOptimized(chatId);
                if (isCancelled) {
                  console.log(`🚫 [${chatId}] ❌ CANCELACIÓN durante descarga - ABORTANDO`);
                  writer.destroy();
                  response.data.destroy();
                  reject(new Error('Procesamiento cancelado por el usuario'));
                  return;
                }
                lastCancellationCheck = now;
              } catch (checkError) {
                console.warn(`⚠️ [${chatId}] Error verificando cancelación:`, checkError);
              }
            }
          }
        });

        writer.on('finish', () => {
          this.processingMetrics.fileDownloadDuration = Date.now() - fileDownloadStartTime;
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > 1000) {
              console.log(`✅ Descargado: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(filePath);
            } else {
              reject(new Error('Archivo vacío'));
            }
          } else {
            reject(new Error('Archivo no guardado'));
          }
        });

        writer.on('error', (error) => {
          reject(new Error(`Error escribiendo: ${error.message}`));
        });

        setTimeout(() => {
          if (!writer.destroyed) {
            writer.destroy();
            reject(new Error('Timeout escribiendo archivo'));
          }
        }, 90000);
      });

    } catch (error) {
      if (error.message === 'Procesamiento cancelado por el usuario') {
        throw error;
      }
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Token de descarga expirado o inválido');
      }
      throw new Error(`Error descargando: ${error.message}`);
    }
  },

  /**
   * FUNCIÓN PARA OBTENER ESTADÍSTICAS DE LAS APIs - SIMPLIFICADA
   */
  getBackupStats() {
    return [
      { name: 'YouTube MP3 2025 (Principal)', host: this.config.rapidApiHost, status: 'active' },
      { name: 'YouTube MP3 v6 (ytjar)', host: 'youtube-mp36.p.rapidapi.com', status: 'backup' }
    ];
  },

  /**
   * Transcribe un archivo de audio usando OpenAI Whisper y genera segmentos con marcas de tiempo
   */
  async transcribeAudio(audioFilePath, chatId) {
    try {
      console.log(`🎙️ [${chatId}] Preparando transcripción...`);
      const transcriptionStartTime = Date.now();

      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Archivo no existe: ${audioFilePath}`);
      }

      const stats = fs.statSync(audioFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📁 [${chatId}] Tamaño archivo: ${fileSizeMB} MB`);

      let fileToTranscribe = audioFilePath;
      let segmentFiles = [];

      console.log(`🔍 [${chatId}] Verificando cancelación antes de transcribir...`);
      const isCancelled = await this.checkCancellationOptimized(chatId);
      if (isCancelled) {
        console.log(`🚫 [${chatId}] ❌ CANCELACIÓN detectada en transcribeAudio - PARANDO`);
        throw new Error('Procesamiento cancelado por el usuario');
      }

      // Resto del código de transcripción igual...
      if (stats.size > 24 * 1024 * 1024) {
        console.log(`📦 [${chatId}] Comprimiendo...`);
        fileToTranscribe = await this.compressAudioFile(audioFilePath);

        const compressedStats = fs.statSync(fileToTranscribe);
        if (compressedStats.size > 24 * 1024 * 1024) {
          console.log(`✂️ [${chatId}] Segmentando...`);
          segmentFiles = await this.splitAudioIntoSegments(fileToTranscribe);

          if (segmentFiles.length > 1) {
            console.log(`📁 [${chatId}] ${segmentFiles.length} segmentos creados`);
          } else {
            fileToTranscribe = segmentFiles[0];
          }
        }
      }

      // Transcripción
      if (segmentFiles.length > 1) {
        let completeTranscription = "";
        let timeOffset = 0;

        for (let i = 0; i < segmentFiles.length; i++) {
          const isCancelledSegment = await this.checkCancellationOptimized(chatId);
          if (isCancelledSegment) {
            console.log(`🚫 [${chatId}] ❌ CANCELACIÓN en segmento ${i + 1} - PARANDO`);
            throw new Error('Procesamiento cancelado por el usuario');
          }

          const segmentFile = segmentFiles[i];
          console.log(`🎙️ [${chatId}] Transcribiendo segmento ${i + 1}/${segmentFiles.length}`);

          if (i > 0) {
            try {
              const duration = await this.getAudioDuration(segmentFiles[i - 1]);
              timeOffset += duration;
            } catch (e) {
              console.warn(`⚠️ [${chatId}] No se pudo obtener duración:`, e);
            }
          }

          const segmentTranscription = await this.transcribeSingleFile(segmentFile, chatId);
          const adjustedTranscription = this.adjustTranscriptionTimestamps(segmentTranscription, timeOffset);
          completeTranscription += adjustedTranscription + "\n\n";
        }

        this.processingMetrics.transcriptionDuration = Date.now() - transcriptionStartTime;
        return completeTranscription.trim();
      } else {
        return await this.transcribeSingleFile(fileToTranscribe, chatId);
      }
    } catch (error) {
      console.error(`❌ [${chatId}] Error en transcripción:`, error);
      throw error;
    }
  },


  /**
   * 🚀 NUEVO: Obtener estado de procesamiento en tiempo real
   * Esta función optimiza el polling del frontend
   */
  getProcessingStatus(chatId, videoId = null) {
    const metrics = this.processingMetrics || this.initMetrics();
    const now = Date.now();
    const elapsed = now - metrics.startTime;

    let status = 'unknown';
    let progress = 0;
    let estimatedTimeRemaining = null;
    let currentStep = 'Inicializando...';

    if (metrics.apiSuccess && metrics.downloadDuration > 0) {
      if (metrics.transcriptionDuration > 0) {
        if (metrics.processedChunks > 0) {
          status = 'storing';
          currentStep = `Almacenando chunks (${metrics.processedChunks}/${metrics.totalChunks})`;
          progress = metrics.totalChunks > 0 ? (metrics.processedChunks / metrics.totalChunks) * 100 : 90;
        } else {
          status = 'chunking';
          currentStep = 'Dividiendo transcripción en chunks...';
          progress = 75;
        }
      } else {
        status = 'transcribing';
        currentStep = 'Transcribiendo audio con IA...';
        progress = 40 + (elapsed > 30000 ? Math.min(30, (elapsed - 30000) / 1000) : 0);
      }
    } else if (metrics.downloadDuration > 0 || metrics.strategiesUsed.length > 0) {
      status = 'processing_audio';
      currentStep = 'Procesando y convirtiendo audio...';
      progress = 25 + (elapsed > 10000 ? Math.min(15, (elapsed - 10000) / 1000) : 0);
    } else {
      status = 'downloading';
      currentStep = `Descargando desde ${metrics.downloadSource || 'API'}...`;
      progress = Math.min(25, elapsed / 1000);
    }

    if (status === 'downloading') {
      estimatedTimeRemaining = '15-30 segundos';
    } else if (status === 'processing_audio') {
      estimatedTimeRemaining = '20-40 segundos';
    } else if (status === 'transcribing') {
      const audioLength = metrics.audioLengthSeconds || 300;
      const estimatedSeconds = Math.max(10, audioLength / 10);
      estimatedTimeRemaining = `${Math.round(estimatedSeconds)} segundos`;
    } else if (status === 'chunking') {
      estimatedTimeRemaining = '5-10 segundos';
    } else if (status === 'storing') {
      estimatedTimeRemaining = '2-5 segundos';
    }

    return {
      status,
      progress: Math.round(progress),
      currentStep,
      estimatedTimeRemaining,
      elapsed: Math.round(elapsed / 1000),
      metrics: {
        strategiesUsed: metrics.strategiesUsed,
        apiSuccess: metrics.apiSuccess,
        downloadSource: metrics.downloadSource,
        audioLengthSeconds: metrics.audioLengthSeconds,
        totalChunks: metrics.totalChunks,
        processedChunks: metrics.processedChunks,
        failedChunks: metrics.failedChunks
      },
      pollingSuggestion: {
        interval: this.getSuggestedPollingInterval(status, elapsed),
        shouldContinue: status !== 'completed' && status !== 'error' && status !== 'cancelled',
        maxPollingTime: 300000 // 5 minutos máximo
      },
      videoId: videoId,
      chatId: chatId,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 🚀 HELPER: Sugerir intervalo de polling basado en estado
   */
  getSuggestedPollingInterval(status, elapsed) {
    switch (status) {
      case 'downloading':
        return elapsed < 10000 ? 1000 : 2000; // 1s inicial, luego 2s
      case 'processing_audio':
        return 2000; // 2 segundos
      case 'transcribing':
        return 3000; // 3 segundos (proceso más largo)
      case 'chunking':
        return 1000; // 1 segundo (rápido)
      case 'storing':
        return 500; // 500ms (muy rápido)
      default:
        return 2000; // 2 segundos por defecto
    }
  },

  async checkCancellationOptimized(chatId) {
    if (!chatId) return false;

    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count, 
            MAX(cancellation_timestamp) as latest_cancellation,
            EXTRACT(EPOCH FROM (NOW() - MAX(cancellation_timestamp))) as seconds_ago,
            MAX(id) as latest_message_id
     FROM chat_history
     WHERE id_chat = $1 
     AND has_pending_cancellation = true
     AND cancellation_timestamp > NOW() - INTERVAL '8 seconds'`,
        [chatId]
      );

      const cancelCount = parseInt(result.rows[0].count, 10);
      const secondsAgo = parseFloat(result.rows[0].seconds_ago || 999);

      const isCancelled = cancelCount > 0 && secondsAgo < 8;

      if (isCancelled) {
        console.log(`🚫 [${chatId}] ⚡ CANCELACIÓN ACTIVA: hace ${secondsAgo.toFixed(1)}s`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [${chatId}] Error verificando cancelación:`, error);
      return false;
    }
  },

  // 2. REEMPLAZAR downloadAndConvertToMp3() línea ~250 aprox
  async downloadAndConvertToMp3(videoId, url) {
    const downloadStartTime = Date.now();
    let lastError = null;

    const chatId = this.getCurrentChatId?.() || this.processingChatId;
    if (chatId) {
      const isCancelled = await this.checkCancellationOptimized(chatId);
      if (isCancelled) {
        console.log(`🚫 [${chatId}] CANCELACIÓN detectada antes de descarga - ABORTANDO`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
    }

    const apiStrategies = [
      {
        name: 'YouTube MP3 2025 (Principal)',
        execute: async () => await this.downloadWithOriginalAPI(videoId, url)
      },
      {
        name: 'YouTube MP3 v6 (ytjar)',
        execute: async () => await this.downloadWithBackupAPI3(videoId)
      }
    ];

    console.log(`🚀 Descarga iniciada: ${videoId}`);

    for (let i = 0; i < apiStrategies.length; i++) {
      const strategy = apiStrategies[i];

      if (chatId) {
        const isCancelled = await this.checkCancellationOptimized(chatId);
        if (isCancelled) {
          console.log(`🚫 [${chatId}] CANCELACIÓN detectada antes de ${strategy.name} - ABORTANDO`);
          throw new Error('Procesamiento cancelado por el usuario');
        }
      }

      try {
        console.log(`🔄 ${strategy.name} (${i + 1}/${apiStrategies.length})...`);
        const result = await strategy.execute();

        this.processingMetrics.downloadDuration = Date.now() - downloadStartTime;
        this.processingMetrics.strategiesUsed.push(strategy.name);
        this.processingMetrics.apiSuccess = true;

        console.log(`✅ Descarga exitosa: ${strategy.name}`);
        return result;

      } catch (error) {
        if (error.message === 'Procesamiento cancelado por el usuario') {
          throw error;
        }

        lastError = error;
        console.warn(`⚠️ ${strategy.name} falló:`, error.message);

        if (i < apiStrategies.length - 1) {
          console.log(`⏭️ Intentando siguiente API inmediatamente...`);
        }
      }
    }

    this.processingMetrics.apiSuccess = false;
    throw new Error(`Todas las APIs fallaron. Último error: ${lastError?.message || 'Desconocido'}`);
  },

  /**
   * Transcribe un único archivo de audio usando OpenAI Whisper
   * ✅ CORRECCIÓN: Verificaciones de cancelación mínimas para evitar interrupciones
   */
  // 4. CORREGIR transcribeSingleFile() - Verificaciones cada 3 segundos (no 2)
  async transcribeSingleFile(audioFilePath, chatId) {
    if (chatId) {
      const isCancelled = await this.checkCancellationOptimized(chatId);
      if (isCancelled) {
        console.log(`🚫 [${chatId}] CANCELACIÓN antes de transcripción`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
    }

    const stats = fs.statSync(audioFilePath);
    console.log(`🎙️ [${chatId}] Transcribiendo: ${path.basename(audioFilePath)} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

    const audioFile = fs.createReadStream(audioFilePath);

    try {
      console.log(`🤖 [${chatId}] Enviando a OpenAI Whisper...`);

      let cancelCheckInterval;
      const startCancelChecker = () => {
        cancelCheckInterval = setInterval(async () => {
          if (chatId) {
            try {
              const cancelled = await this.checkCancellationOptimized(chatId);
              if (cancelled) {
                console.log(`🚫 [${chatId}] ❌ CANCELACIÓN durante Whisper - ABORTANDO`);
                if (cancelCheckInterval) clearInterval(cancelCheckInterval);
                throw new Error('Procesamiento cancelado por el usuario');
              }
            } catch (error) {
              console.warn(`⚠️ [${chatId}] Error en verificación Whisper:`, error);
            }
          }
        }, 3000); // ✅ Cada 3 segundos (menos agresivo)
      };

      startCancelChecker();

      try {
        const transcriptionResponse = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "es",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"]
        }, {
          timeout: 900000,
          maxRetries: 2
        });

        if (cancelCheckInterval) clearInterval(cancelCheckInterval);

        if (chatId) {
          const isCancelled = await this.checkCancellationOptimized(chatId);
          if (isCancelled) {
            console.log(`🚫 [${chatId}] CANCELACIÓN después de Whisper`);
            throw new Error('Procesamiento cancelado por el usuario');
          }
        }

        console.log(`✅ [${chatId}] Transcripción recibida de OpenAI`);
        return this.formatTranscriptionWithTimestamps(transcriptionResponse);

      } catch (apiError) {
        if (cancelCheckInterval) clearInterval(cancelCheckInterval);

        if (apiError.message && (
          apiError.message.includes('aborted') ||
          apiError.message.includes('cancelled') ||
          apiError.message.includes('Procesamiento cancelado')
        )) {
          throw new Error('Procesamiento cancelado por el usuario');
        }

        console.error(`❌ [${chatId}] Error en API de transcripción:`, apiError.message);
        throw apiError;
      }

    } catch (error) {
      throw error;
    } finally {
      if (audioFile && !audioFile.destroyed) {
        audioFile.destroy();
      }
    }
  },

  /**
   * Comprime un archivo de audio usando ffmpeg
   */
  async compressAudioFile(inputFilePath) {
    try {
      const outputFilePath = inputFilePath.replace(/\.[^/.]+$/, '') + '_compressed.mp3';

      console.log(`Comprimiendo archivo de audio: ${inputFilePath} -> ${outputFilePath}`);

      const cmd = `${this.config.ffmpegPath} -i "${inputFilePath}" -ab 64k -ac 1 -ar 16000 "${outputFilePath}"`;

      console.log(`Ejecutando comando de compresión: ${cmd}`);

      const { stdout, stderr } = await execPromise(cmd, { timeout: 180000 });

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
      return inputFilePath;
    }
  },

  /**
   * Divide un archivo de audio largo en segmentos más pequeños
   */
  async splitAudioIntoSegments(inputFilePath, segmentDurationSecs = 600) {
    try {
      const segmentsDir = path.join(path.dirname(inputFilePath), 'segments');
      if (!fs.existsSync(segmentsDir)) {
        fs.mkdirSync(segmentsDir, { recursive: true });
      }

      const baseFileName = path.basename(inputFilePath, path.extname(inputFilePath));
      const segmentPattern = path.join(segmentsDir, `${baseFileName}_%03d${path.extname(inputFilePath)}`);

      console.log(`Dividiendo archivo de audio en segmentos de ${segmentDurationSecs} segundos`);

      const cmd = `${this.config.ffmpegPath} -i "${inputFilePath}" -f segment -segment_time ${segmentDurationSecs} -c copy "${segmentPattern}"`;

      console.log(`Ejecutando comando de segmentación: ${cmd}`);

      const { stdout, stderr } = await execPromise(cmd);

      if (stderr && !stderr.includes('video:') && !stderr.includes('audio:')) {
        console.warn('Advertencias de ffmpeg:', stderr);
      }

      const segmentFiles = fs.readdirSync(segmentsDir)
        .filter(file => file.startsWith(baseFileName + '_'))
        .map(file => path.join(segmentsDir, file))
        .sort();

      console.log(`Se crearon ${segmentFiles.length} segmentos de audio`);

      return segmentFiles;
    } catch (error) {
      console.error('Error dividiendo archivo de audio:', error);
      return [inputFilePath];
    }
  },

  /**
   * Ajusta las marcas de tiempo en una transcripción con un desplazamiento
   */
  adjustTranscriptionTimestamps(transcription, offsetSeconds) {
    if (!transcription.includes('**[')) {
      return transcription;
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
   * Obtiene la duración de un archivo de audio en segundos
   */
  async getAudioDuration(audioFilePath) {
    try {
      const cmd = `${this.config.ffprobePath} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFilePath}"`;
      const { stdout } = await execPromise(cmd);
      return parseFloat(stdout.trim());
    } catch (error) {
      console.error('Error obteniendo duración del audio:', error);
      return 0;
    }
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
      separators: ["\n\n", "\n", " ", ""],
    });

    const normalizedTranscription = this.normalizeText(transcription);
    const textChunks = await splitter.splitText(normalizedTranscription);

    return textChunks.map((chunk, index) => {
      let processedChunk = chunk;
      if (!chunk.startsWith("**[")) {
        const timestampMatch = chunk.match(/\*\*\[\d+:\d+\s*-\s*\d+:\d+\]\*\*/);
        if (timestampMatch && timestampMatch.index > 0) {
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
   * ⭐ PROCESO PRINCIPAL - COMPLETAMENTE CORREGIDO
   */
  async processYouTubeURL(url, userId, chatId, metadata = {}) {
    this.processingMetrics = this.initMetrics();
    this.extractedMetadata = null;
    this.processingChatId = chatId;
    let audioFilePath = null;
    let combinedMetadata = null;
    let videoId = null;

    try {
      console.log(`🧹 [${chatId}] Limpiando flags antiguos antes de procesar nuevo video...`);
      try {
        await pool.query(
          `UPDATE chat_history
         SET has_pending_cancellation = false,
             cancellation_timestamp = NULL
         WHERE id_chat = $1
         AND has_pending_cancellation = true
         AND cancellation_timestamp < NOW() - INTERVAL '5 seconds'`,
          [chatId]
        );
        console.log(`✅ [${chatId}] Flags antiguos limpiados`);
      } catch (cleanError) {
        console.warn(`⚠️ [${chatId}] Error limpiando flags antiguos:`, cleanError);
      }

      // Validaciones iniciales
      if (!this.isValidYouTubeUrl(url)) {
        throw new Error('URL de YouTube no válida');
      }

      videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('No se pudo extraer el ID del video de YouTube');
      }

      console.log(`🚀 [${chatId}] Procesando video: ${url} (ID: ${videoId})`);

      console.log(`🔍 [${chatId}] VERIFICACIÓN 1: Antes de descarga`);
      const isCancelledBeforeDownload = await this.checkCancellationOptimized(chatId);
      if (isCancelledBeforeDownload) {
        console.log(`🚫 [${chatId}] ❌ CANCELACIÓN detectada antes de descarga - PARANDO`);
        throw new Error('Procesamiento cancelado por el usuario');
      }

      // DESCARGA
      console.log(`📥 [${chatId}] Iniciando descarga...`);
      audioFilePath = await this.downloadAndConvertToMp3(videoId, url);
      console.log(`✅ [${chatId}] Descarga completada: ${audioFilePath}`);

      console.log(`🔍 [${chatId}] VERIFICACIÓN 2: Después de descarga - REVISANDO CANCELACIÓN`);
      const isCancelledAfterDownload = await this.checkCancellationOptimized(chatId);
      if (isCancelledAfterDownload) {
        console.log(`🚫 [${chatId}] ❌ CANCELACIÓN detectada después de descarga - PARANDO AQUÍ`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
      console.log(`✅ [${chatId}] Sin cancelación después de descarga - CONTINUANDO`);

      // METADATOS
      console.log(`📡 [${chatId}] Preparando metadatos...`);
      const videoMetadata = await this.getVideoMetadata(url, videoId);
      combinedMetadata = {
        ...metadata,
        ...videoMetadata,
        source: 'youtube',
        originalUrl: url,
        videoId: videoId,
        processingDate: new Date().toISOString()
      };

      this.processingMetrics.audioLengthSeconds = videoMetadata.duration;

      if (videoMetadata.duration > this.config.maxFileDuration) {
        throw new Error(`La duración del video (${videoMetadata.duration} segundos) excede el máximo permitido`);
      }

      console.log(`🔍 [${chatId}] VERIFICACIÓN 3: Antes de transcripción - REVISANDO CANCELACIÓN`);
      const isCancelledBeforeTranscription = await this.checkCancellationOptimized(chatId);
      if (isCancelledBeforeTranscription) {
        console.log(`🚫 [${chatId}] ❌ CANCELACIÓN detectada antes de transcripción - PARANDO AQUÍ`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
      console.log(`✅ [${chatId}] Sin cancelación antes de transcripción - CONTINUANDO`);

      // TRANSCRIPCIÓN
      console.log(`🎙️ [${chatId}] Iniciando transcripción...`);
      const transcription = await this.transcribeAudio(audioFilePath, chatId);
      console.log(`✅ [${chatId}] Transcripción completada: ${transcription.length} caracteres`);

      console.log(`🔍 [${chatId}] VERIFICACIÓN 4: Después de transcripción - REVISANDO CANCELACIÓN`);
      const isCancelledAfterTranscription = await this.checkCancellationOptimized(chatId);
      if (isCancelledAfterTranscription) {
        console.log(`🚫 [${chatId}] ❌ CANCELACIÓN detectada después de transcripción - PARANDO AQUÍ`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
      console.log(`✅ [${chatId}] Sin cancelación después de transcripción - CONTINUANDO`);

      // CHUNKS
      console.log(`🔄 [${chatId}] Dividiendo en chunks...`);
      const chunks = await this.splitTranscriptionToChunks(transcription, combinedMetadata);
      this.processingMetrics.totalChunks = chunks.length;

      console.log(`🔍 [${chatId}] VERIFICACIÓN 5: Antes de almacenamiento - REVISANDO CANCELACIÓN`);
      const isCancelledBeforeStoring = await this.checkCancellationOptimized(chatId);
      if (isCancelledBeforeStoring) {
        console.log(`🚫 [${chatId}] ❌ CANCELACIÓN detectada antes de almacenamiento - PARANDO AQUÍ`);
        throw new Error('Procesamiento cancelado por el usuario');
      }
      console.log(`✅ [${chatId}] Sin cancelación antes de almacenamiento - CONTINUANDO`);

      console.log(`💾 [${chatId}] Almacenando chunks...`);
      await this.storeTranscriptionInDB(chunks, userId, chatId, combinedMetadata);

      console.log(`🎉 [${chatId}] Procesamiento completado exitosamente`);

      return {
        status: 'success',
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
      console.error(`❌ [${chatId}] Error en procesamiento: ${error.message}`);

      if (error.message === 'Procesamiento cancelado por el usuario') {
        console.log(`🚫 [${chatId}] ⚡ PROCESAMIENTO CANCELADO - Enviando respuesta y limpiando flags`);

        try {
          const chatServices = await import('./chatServices.js');
          await chatServices.clearCancellationFlag(chatId);
          console.log(`✅ [${chatId}] Flags limpiados INMEDIATAMENTE después de cancelación`);
        } catch (clearError) {
          console.warn(`⚠️ [${chatId}] Error limpiando flags:`, clearError.message);
        }

        return {
          status: 'cancelled',
          cancelled: true,
          success: false,
          message: 'Procesamiento cancelado por el usuario',
          userMessage: this.generateCancelledMessage(),
          metadata: combinedMetadata || {
            source: 'youtube',
            originalUrl: url,
            videoId: videoId || this.extractVideoId(url) || 'unknown'
          },
          metrics: {
            ...this.processingMetrics,
            processingTime: Date.now() - this.processingMetrics.startTime,
            cancelled: true
          }
        };
      }

      throw this.enhanceError(error);
    } finally {
      this.processingChatId = null;

      if (audioFilePath && fs.existsSync(audioFilePath)) {
        try {
          fs.unlinkSync(audioFilePath);
          console.log(`🗑️ [${chatId}] Archivo temporal limpiado: ${audioFilePath}`);
        } catch (cleanupError) {
          console.error(`❌ [${chatId}] Error limpiando archivo:`, cleanupError);
        }
      }

      if (videoId) {
        console.log(`🧹 [${chatId}] Cleanup completado para video: ${videoId}`);
      }
    }
  },


  createCancelledResponse(url, metadata, stage, videoId = null, chunks = 0) {
    const safeMetadata = {
      ...metadata,
      source: 'youtube',
      originalUrl: url,
      cancelledAt: new Date().toISOString(),
      videoId: videoId || this.extractVideoId(url) || 'unknown',
      stage: stage,
      ...(chunks > 0 && { chunks })
    };

    if (metadata.herramientaId === 2) { // Solo para Agente
      console.log(`🤖 [AGENTE] YouTube procesado - programando limpieza de flags...`);

      setTimeout(async () => {
        try {
          await pool.query(
            `UPDATE chat_history
         SET has_pending_cancellation = false,
             cancellation_timestamp = NULL
         WHERE id_chat = $1
         AND has_pending_cancellation = true
         AND cancellation_timestamp < NOW() - INTERVAL '10 seconds'`,
            [chatId]
          );
          console.log(`✅ [AGENTE] Flags antiguos limpiados para chat ${chatId}`);
        } catch (e) {
          console.warn(`⚠️ [AGENTE] Error limpiando flags:`, e.message);
        }
      }, 5000);
    }

    return {
      success: true,
      answer: this.generateCancelledMessage(),
      cancelled: true,
      metadata: safeMetadata,
      metrics: {
        ...this.processingMetrics,
        processingTime: Date.now() - this.processingMetrics.startTime,
        cancelled: true,
        cancellationStage: stage
      },
      chatId: metadata.chatId,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Genera mensaje de cancelación
   */
  generateCancelledMessage() {
    const mensajes = [
      `🛑 El procesamiento del video fue cancelado como estudiante que decide no ver "un solo episodio más" en Netflix a las 2 AM 😅

No pasa nada, mi cerebro capibara entiende perfectamente que a veces las prioridades cambian. Es como pausar una película interesante - siempre puedes retomarla después.

Puedes volver a intentarlo con este mismo enlace cuando quieras, o traerme otro video que despierte tu curiosidad académica. Mi capacidad universal de devorar contenido de YouTube sigue intacta usando tecnología de vanguardia.

Para procesar videos, simplemente comparte cualquier enlace de YouTube conmigo. ¡Soy como un traductor universal pero para conocimiento interdisciplinario! 🦫📚`,

      `🦫💤 Proceso cancelado como capibara que decide tomarse una siesta académica inesperada.

Mi sistema sigue funcionando perfectamente, solo que ahora tengo más tiempo para pensar en analogías interdisciplinarias épicas. Es como cuando pausas una conferencia TED porque suena el timbre - puedes continuarla después.

Mi capacidad de análisis universal no se ve afectada. Puedes intentar de nuevo con este video o traerme otro contenido fascinante para devorar.

¿En qué otra área del conocimiento puedo ayudarte mientras tanto? 🚀📚`
    ];

    // Rotar mensajes para variedad
    const index = Date.now() % mensajes.length;
    return mensajes[index];
  },

  /**
   * Almacena los chunks en la base de datos
   */
  async storeTranscriptionInDB(chunks, userId, chatId, metadata) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const batchSize = 10;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const isCancelled = await this.checkCancellationOptimized(chatId);
        if (isCancelled) {
          console.log(`🚫 [${chatId}] CANCELACIÓN detectada durante almacenamiento - lote ${Math.floor(i / batchSize) + 1}`);
          await client.query('ROLLBACK');
          throw new Error('Procesamiento cancelado por el usuario');
        }

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
                source: doc.metadata.source || 'transcription',
                hasTimestamps: timestampInfo.length > 0
              },
              `[${embedding.join(',')}]`,
              JSON.stringify({
                timestamps: timestampInfo,
                videoId: metadata.videoId || null
              })
            ];

            await client.query(query, params);
            this.processingMetrics.processedChunks++;

          } catch (insertError) {
            console.error(`Error insertando chunk ${i + j}:`, insertError);
            this.processingMetrics.failedChunks++;
          }
        }

        console.log(`💾 Progreso almacenamiento: ${Math.min(((i + batchSize) / chunks.length) * 100, 100).toFixed(1)}% (${this.processingMetrics.processedChunks}/${chunks.length} chunks)`);
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
   * Extrae información de marcas de tiempo
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
   * Convierte tiempo MM:SS a segundos
   */
  timeStringToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return (minutes * 60) + seconds;
  },

  /**
   * Genera embedding para texto
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
   * Normaliza texto
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\S\r\n]+/g, ' ')
      .trim();
  },

  /**
   * Calcula tamaño promedio de chunks
   */
  calculateAverageChunkSize(chunks) {
    if (!chunks || chunks.length === 0) return 0;
    return chunks.reduce((acc, doc) => acc + (doc.pageContent?.length || 0), 0) / chunks.length;
  },

  /**
   * Mejora información de errores
   */
  enhanceError(error) {
    const enhancedError = new Error(error.message);
    enhancedError.details = {
      type: error.name,
      processingMetrics: this.processingMetrics,
      timestamp: new Date().toISOString(),
      downloadSource: 'fallback-system'
    };
    return enhancedError;
  },

  getCurrentChatId() {
    return this.processingChatId || null;
  }
};

export default YouTubeAudioService;