
import { createElement, setManagedTimeout } from '../../shared/dom-helpers.js';


export const IMAGE_CONFIG = {
  BATCH_SIZE: 6,                    
  PARALLEL_LIMIT: 6,                
  REALTIME_THRESHOLD: 6,            
  REALTIME_DELAY: 100,              
  BATCH_DELAY: 200,                 
  RETRY_DELAY: 2000,                
  MAX_RETRIES: 2,                   
  CACHE_DURATION: 30000,            
  TIMEOUT: 15000,                   
  PARALLEL_CHUNK_DELAY: 300,
  
  FAILED_URL_EXPIRY: 3600000,       // 1 hora antes de reintentar URL fallida
  MAX_FAILED_URLS: 1000,            // Máximo 1000 URLs fallidas en cache
  CLEANUP_INTERVAL: 300000,         // Limpiar cache cada 5 minutos
  PERMANENT_FAIL_CODES: [403, 404, 410, 451] // Códigos que no se reintentarán
};

const PROCESSING_CONTAINERS = new Set();


class FailedURLManager {
  constructor() {
    this.storageKey = 'acadel_failed_image_urls';
    this.failedUrls = new Map();
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  markAsFailed(url, errorCode = null, errorMessage = null) {
    const now = Date.now();
    const isPermanent = errorCode && IMAGE_CONFIG.PERMANENT_FAIL_CODES.includes(errorCode);
    
    const failureInfo = {
      url,
      timestamp: now,
      expiresAt: isPermanent ? (now + (24 * 3600000)) : (now + IMAGE_CONFIG.FAILED_URL_EXPIRY), // 24h para permanentes, 1h para temporales
      errorCode,
      errorMessage,
      isPermanent,
      attempts: (this.failedUrls.get(url)?.attempts || 0) + 1
    };
    
    this.failedUrls.set(url, failureInfo);
    this.saveToStorage();
    
    console.log(`🚫 [FAILED-URL] Marcada como fallida: ${url.substring(0, 50)}... (${errorCode}) - Expira: ${isPermanent ? '24h' : '1h'}`);
  }

  isFailedUrl(url) {
    const failureInfo = this.failedUrls.get(url);
    if (!failureInfo) return false;
    
    const now = Date.now();
    if (now > failureInfo.expiresAt) {
      this.failedUrls.delete(url);
      this.saveToStorage();
      console.log(`⏰ [FAILED-URL] Expirada, permitiendo reintento: ${url.substring(0, 50)}...`);
      return false;
    }
    
    console.log(`⏭️ [FAILED-URL] URL en lista de fallidas, saltando: ${url.substring(0, 50)}... (${failureInfo.attempts} intentos)`);
    return true;
  }

  getFailureInfo(url) {
    return this.failedUrls.get(url);
  }

  clearFailedUrl(url) {
    if (this.failedUrls.delete(url)) {
      this.saveToStorage();
      console.log(`🧹 [FAILED-URL] Limpiada manualmente: ${url.substring(0, 50)}...`);
      return true;
    }
    return false;
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.failedUrls = new Map(data.urls || []);
        console.log(`💾 [FAILED-URL] Cargadas ${this.failedUrls.size} URLs fallidas desde storage`);
      }
    } catch (e) {
      console.warn('⚠️ [FAILED-URL] Error cargando URLs fallidas:', e);
      this.failedUrls = new Map();
    }
  }

  saveToStorage() {
    try {
      const data = {
        urls: Array.from(this.failedUrls.entries()),
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('⚠️ [FAILED-URL] Error guardando URLs fallidas:', e);
    }
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [url, info] of this.failedUrls.entries()) {
      if (now > info.expiresAt) {
        this.failedUrls.delete(url);
        cleanedCount++;
      }
    }
    
    // Limitar tamaño del cache
    if (this.failedUrls.size > IMAGE_CONFIG.MAX_FAILED_URLS) {
      const sortedEntries = Array.from(this.failedUrls.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = sortedEntries.slice(0, this.failedUrls.size - IMAGE_CONFIG.MAX_FAILED_URLS);
      toDelete.forEach(([url]) => this.failedUrls.delete(url));
      
      cleanedCount += toDelete.length;
    }
    
    if (cleanedCount > 0) {
      this.saveToStorage();
      console.log(`🧹 [FAILED-URL] Limpieza automática: ${cleanedCount} URLs eliminadas, ${this.failedUrls.size} restantes`);
    }
  }

  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, IMAGE_CONFIG.CLEANUP_INTERVAL);
  }

  getStats() {
    const now = Date.now();
    let permanent = 0;
    let temporary = 0;
    let expired = 0;
    
    for (const info of this.failedUrls.values()) {
      if (now > info.expiresAt) {
        expired++;
      } else if (info.isPermanent) {
        permanent++;
      } else {
        temporary++;
      }
    }
    
    return {
      total: this.failedUrls.size,
      permanent,
      temporary,
      expired
    };
  }
}

const failedURLManager = new FailedURLManager();


function isProblematicUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { problematic: true, reason: 'URL inválida' };
  }
  
  if (failedURLManager.isFailedUrl(imageUrl)) {
    const failureInfo = failedURLManager.getFailureInfo(imageUrl);
    return { 
      problematic: true, 
      reason: `URL en lista de fallidas (${failureInfo.attempts} intentos, error: ${failureInfo.errorCode})`,
      isFailedUrl: true
    };
  }
  
  const problematicPatterns = [
    // Sitios que regularmente devuelven 403/404
    /render\.fineartamerica\.com/i,
    /fineartamerica\.com/i,
    /deviantart\.com/i,
    /pinterest\.com/i,
    /instagram\.com/i,
    /facebook\.com/i,
    
    // URLs temporales que ya expiraron
    /image_\d+_[a-f0-9]+\.(webp|jpg|png)$/i,
    
    // URLs locales en contexto remoto
    /localhost:/,
    /127\.0\.0\.1:/,
    /192\.168\./,
    /10\.0\./,
    
    // Placeholder URLs
    /placeholder\.(com|net|org)/i,
    /example\.(com|net|org)/i,
    /test\.(com|net|org)/i,
    /dummy\.(com|net|org)/i,
    
    // URLs que requieren autenticación especial
    /cdn\.discordapp\.com.*\/attachments/i,
    /media\.discordapp\.net/i
  ];
  
  for (const pattern of problematicPatterns) {
    if (pattern.test(imageUrl)) {
      return { 
        problematic: true, 
        reason: 'URL filtrada por patrón conocido problemático' 
      };
    }
  }
  
  return { problematic: false };
}

export function isValidExternalImageURL(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return false;
  }

  const cleanUrl = url.trim().toLowerCase();

  // Si ya es local, no procesar
  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('data:')) {
    return false;
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return false;
  }

  const urlCheck = isProblematicUrl(url);
  if (urlCheck.problematic) {
    console.log(`🚫 [VALIDATION] ${urlCheck.reason}: ${url.substring(0, 50)}...`);
    return false;
  }

  return true;
}

/**
 * Filtra imágenes válidas para procesamiento
 */
export function filterValidImages(images) {
  const validImages = [];
  
  images.forEach(img => {
    const originalSrc = img.dataset.originalSrc || img.src;
    
    if (isValidExternalImageURL(originalSrc)) {
      validImages.push(img);
    } else {
      img.classList.remove('image-processing');
      img.removeAttribute('data-needs-storage');
      img.classList.add('invalid-url');
      
      console.log(`⚠️ [FILTER] Imagen con URL inválida filtrada: ${originalSrc}`);
    }
  });
  
  return validImages;
}


const GLOBAL_IMAGE_LOCKS = {
  _locks: new Map(),
  _cache: new Map(),
  _stats: { hits: 0, misses: 0, concurrent: 0, parallel: 0 },

  async processWithLock(chatId, originalSrc, processingFunction) {
    const lockKey = `${chatId}:${this._hashUrl(originalSrc)}`;
    
    // 1. VERIFICACIÓN TRIPLE DE CACHE (más agresiva)
    const cached = this._checkAllCaches(chatId, originalSrc);
    if (cached) {
      this._stats.hits++;
      console.log(`💾 [LOCK] Cache hit inmediato: ${originalSrc.substring(0, 50)}... (hits: ${this._stats.hits})`);
      return { success: true, filePath: cached, fromCache: true };
    }
    
    // 2. VERIFICAR SI YA ESTÁ SIENDO PROCESADA
    if (this._locks.has(lockKey)) {
      this._stats.concurrent++;
      console.log(`⏳ [LOCK] Esperando procesamiento en curso: ${originalSrc.substring(0, 50)}... (concurrent: ${this._stats.concurrent})`);
      
      try {
        const result = await this._locks.get(lockKey);
        console.log(`✅ [LOCK] Resultado de procesamiento concurrente recibido`);
        return result;
      } catch (error) {
        console.log(`❌ [LOCK] Error en procesamiento concurrente: ${error.message}`);
        this._locks.delete(lockKey);
      }
    }
    
    // 3. CREAR NUEVO LOCK Y PROCESAR
    this._stats.misses++;
    this._stats.parallel++;
    console.log(`🔒 [LOCK] Iniciando procesamiento paralelo: ${originalSrc.substring(0, 50)}... (parallel: ${this._stats.parallel})`);
    
    const processingPromise = (async () => {
      try {
        const result = await processingFunction();
        
        if (result.success && result.filePath) {
          this._updateAllCaches(chatId, originalSrc, result.filePath);
        }
        
        return result;
      } catch (error) {
        console.error(`❌ [LOCK] Error en procesamiento: ${error.message}`);
        throw error;
      } finally {
        this._stats.parallel--;
        setTimeout(() => {
          if (this._locks.has(lockKey)) {
            this._locks.delete(lockKey);
            console.log(`🧹 [LOCK] Lock limpiado: ${lockKey.substring(0, 50)}...`);
          }
        }, 2000);
      }
    })();
    
    this._locks.set(lockKey, processingPromise);
    
    return await processingPromise;
  },

  _checkAllCaches(chatId, originalSrc) {
    const cache1 = imageUrlCache.get(chatId, originalSrc, 'path');
    if (cache1) return cache1;
    
    const lockKey = `${chatId}:${this._hashUrl(originalSrc)}`;
    const cache2 = this._cache.get(lockKey);
    if (cache2 && (Date.now() - cache2.timestamp) < IMAGE_CONFIG.CACHE_DURATION) {
      return cache2.filePath;
    }
    
    if (originalSrc.startsWith('/uploads/')) {
      return originalSrc;
    }
    
    return null;
  },

  _updateAllCaches(chatId, originalSrc, filePath) {
    imageUrlCache.set(chatId, originalSrc, filePath, 'path');
    
    const lockKey = `${chatId}:${this._hashUrl(originalSrc)}`;
    this._cache.set(lockKey, {
      filePath,
      timestamp: Date.now()
    });
  },

  _hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },

  cleanup() {
    const now = Date.now();
    
    for (const [key, value] of this._cache.entries()) {
      if (now - value.timestamp > IMAGE_CONFIG.CACHE_DURATION) {
        this._cache.delete(key);
      }
    }
    
    console.log(`🧹 [LOCK] Limpieza periódica - Cache: ${this._cache.size}, Locks: ${this._locks.size}, Parallel: ${this._stats.parallel}`);
  }
};

// Limpieza periódica cada 30 segundos
setInterval(() => GLOBAL_IMAGE_LOCKS.cleanup(), 30000);


export const imageUrlCache = {
  _cache: {},
  _failedUrls: {},
  _searchCache: new Map(),

  /**
   * Método unificado para obtener valores del cache
   */
  get(chatId, url, type = 'path') {
    if (!chatId || !url) return null;
    const key = this._key(chatId, url);
    
    switch (type) {
      case 'path':
        return this._cache[key] || null;
      case 'failed':
        return this._failedUrls[key] === true;
      default:
        return null;
    }
  },

  /**
   * Método unificado para establecer valores en el cache
   */
  set(chatId, url, value, type = 'path') {
    if (!chatId || !url) return;
    const key = this._key(chatId, url);
    
    switch (type) {
      case 'path':
        this._cache[key] = value;
        this._persistToStorage('imageUrlCache', this._cache);
        break;
      case 'failed':
        if (value) {
          failedURLManager.markAsFailed(url);
        } else {
          failedURLManager.clearFailedUrl(url);
        }
        break;
    }
  },

  /**
   * Verifica si existe una entrada en el cache
   */
  has(chatId, url, type = 'path') {
    if (type === 'failed') {
      return failedURLManager.isFailedUrl(url);
    }
    return this.get(chatId, url, type) !== null && this.get(chatId, url, type) !== false;
  },

  /**
   * Limpia una entrada específica del cache
   */
  clear(chatId, url, type = 'path') {
    if (!chatId || !url) return;
    const key = this._key(chatId, url);
    
    switch (type) {
      case 'path':
        delete this._cache[key];
        this._persistToStorage('imageUrlCache', this._cache);
        break;
      case 'failed':
        failedURLManager.clearFailedUrl(url);
        break;
    }
  },

  /**
   * Métodos de compatibilidad para mantener API existente
   */
  getLocalPath(chatId, url) { return this.get(chatId, url, 'path'); },
  isFailedUrl(chatId, url) { return failedURLManager.isFailedUrl(url); },
  markAsFailed(chatId, url) { failedURLManager.markAsFailed(url); },
  storeLocalPath(chatId, url, localPath) { this.set(chatId, url, localPath, 'path'); },
  clearEntry(chatId, url) { this.clear(chatId, url, 'path'); },

  /**
   * Carga el caché desde localStorage
   */
  loadFromStorage() {
    try {
      this._cache = JSON.parse(localStorage.getItem('imageUrlCache') || '{}');
      console.log(`📦 [CACHE] Cargado: ${Object.keys(this._cache).length} entradas de imágenes`);
    } catch (e) {
      console.warn('⚠️ [CACHE] Error cargando cache:', e);
      this._cache = {};
    }
  },

  /**
   * Genera clave única para el cache (método privado unificado)
   */
  _key(chatId, url) {
    return `${chatId}:${this._hashUrl(url)}`;
  },

  /**
   * Genera hash para URL (método privado)
   */
  _hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },

  /**
   * Persiste datos en localStorage (método privado)
   */
  _persistToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`⚠️ [CACHE] Error guardando ${key}:`, e);
    }
  }
};

imageUrlCache.loadFromStorage();

// DETECCIÓN DE ERRORES TEMPORALES + ANÁLISIS DE CÓDIGOS HTTP

export function isTemporaryError(errorMessage, httpStatus = null) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return false;
  }
  
  if (httpStatus && IMAGE_CONFIG.PERMANENT_FAIL_CODES.includes(httpStatus)) {
    return false; // No es temporal, es permanente
  }
  
  const temporaryErrorPatterns = [
    'EAI_AGAIN',          // Error DNS temporal
    'ENOTFOUND',          // DNS no encontrado temporalmente  
    'ECONNRESET',         // Conexión reseteada por el servidor
    'ECONNREFUSED',       // Conexión rechazada temporalmente
    'ETIMEDOUT',          // Timeout de conexión
    'socket hang up',     // Socket cerrado inesperadamente
    'network timeout',    // Timeout de red
    'DNS resolution',     // Problemas de resolución DNS
    'temporary failure',  // Fallo temporal general
    'ENETUNREACH',        // Red no alcanzable
    'EHOSTUNREACH'        // Host no alcanzable
  ];
  
  return temporaryErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

function extractHttpStatusFromError(errorMessage) {
  if (!errorMessage) return null;
  
  const statusMatch = errorMessage.match(/status[:\s]*(\d{3})/i) || 
                     errorMessage.match(/(\d{3})[:\s]*error/i) ||
                     errorMessage.match(/HTTP[:\s]*(\d{3})/i);
  
  return statusMatch ? parseInt(statusMatch[1]) : null;
}


export async function processImageWithRetry(originalSrc, chatId, maxRetries = IMAGE_CONFIG.MAX_RETRIES) {
  if (!isValidExternalImageURL(originalSrc)) {
    console.log(`🚫 [RETRY] URL no válida, saltando procesamiento: ${originalSrc.substring(0, 50)}...`);
    return { 
      success: false, 
      error: 'URL no válida o filtrada',
      silent: true 
    };
  }

  return await GLOBAL_IMAGE_LOCKS.processWithLock(chatId, originalSrc, async () => {
    let lastError = null;
    let httpStatus = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 [RETRY] Intento ${attempt}/${maxRetries + 1} para: ${originalSrc.substring(0, 30)}...`);
        
        // Importación dinámica para evitar dependencias circulares
        const { saveMarkdownImage } = await import('../api/messages-matematico.js');
        const result = await saveMarkdownImage(originalSrc, chatId);
        
        if (result.success) {
          if (attempt > 1) {
            console.log(`✅ [RETRY] Éxito en intento ${attempt}: ${originalSrc.substring(0, 30)}...`);
          }
          return result;
        } else {
          lastError = result.error;
          httpStatus = extractHttpStatusFromError(result.error);
          
          if (httpStatus && IMAGE_CONFIG.PERMANENT_FAIL_CODES.includes(httpStatus)) {
            console.log(`🚫 [RETRY] Error permanente (${httpStatus}), marcando como fallida: ${result.error}`);
            failedURLManager.markAsFailed(originalSrc, httpStatus, result.error);
            return result;
          }
          
          if (!isTemporaryError(result.error, httpStatus)) {
            console.log(`🚫 [RETRY] Error no temporal, no reintentar: ${result.error}`);
            failedURLManager.markAsFailed(originalSrc, httpStatus, result.error);
            return result;
          }
          
          if (attempt <= maxRetries) {
            console.log(`⏳ [RETRY] Error temporal, reintentando en ${IMAGE_CONFIG.RETRY_DELAY/1000}s: ${result.error}`);
            await new Promise(resolve => setTimeout(resolve, IMAGE_CONFIG.RETRY_DELAY));
          } else {
            console.log(`❌ [RETRY] Máximo de reintentos alcanzado: ${result.error}`);
            failedURLManager.markAsFailed(originalSrc, httpStatus, result.error);
            return result;
          }
        }
      } catch (error) {
        lastError = error.message;
        httpStatus = extractHttpStatusFromError(error.message);
        
        if (httpStatus && IMAGE_CONFIG.PERMANENT_FAIL_CODES.includes(httpStatus)) {
          console.log(`🚫 [RETRY] Error permanente en catch (${httpStatus}), marcando como fallida`);
          failedURLManager.markAsFailed(originalSrc, httpStatus, error.message);
          return { success: false, error: error.message, silent: true };
        }
        
        if (isTemporaryError(error.message, httpStatus) && attempt <= maxRetries) {
          console.log(`⏳ [RETRY] Error de red temporal, reintentando en ${IMAGE_CONFIG.RETRY_DELAY/1000}s: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, IMAGE_CONFIG.RETRY_DELAY));
        } else {
          console.log(`❌ [RETRY] Error final: ${error.message}`);
          failedURLManager.markAsFailed(originalSrc, httpStatus, error.message);
          return { 
            success: false, 
            error: error.message,
            silent: true 
          };
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    failedURLManager.markAsFailed(originalSrc, httpStatus, lastError);
    return { 
      success: false, 
      error: lastError || 'Todos los reintentos fallaron',
      silent: true 
    };
  });
}

// ACTUALIZACIÓN VISUAL DE IMÁGENES

export function updateImageDisplay(img, newSrc = null) {
  if (!img || !img.isConnected) {
    console.warn('⚠️ [DISPLAY] Imagen no válida o desconectada del DOM');
    return;
  }
  
  console.log(`🔄 [DISPLAY] Actualizando visualización de imagen: ${newSrc || img.src}`);
  
  if (newSrc) {
    img.src = newSrc;
    img.dataset.originalSrc = newSrc;
  }
  
  img.classList.remove('error-processed', 'failed-image', 'image-processing', 'external-image');
  img.classList.add('stored-image', 'loaded');
  
  img.style.display = '';
  img.style.visibility = 'visible';
  img.style.opacity = '1';
  img.removeAttribute('data-needs-storage');
  
  const container = img.closest('.markdown-image-container, .image-preview');
  if (container) {
    const placeholders = container.querySelectorAll('.expired-image-placeholder, .image-placeholder, .mermaid-loading');
    placeholders.forEach(placeholder => {
      placeholder.style.display = 'none';
      setTimeout(() => {
        if (placeholder.parentNode) {
          placeholder.remove();
        }
      }, 50);
    });
    
    const overlay = container.querySelector('.image-overlay, .markdown-image-wrapper');
    if (overlay) {
      overlay.style.display = '';
      overlay.style.visibility = 'visible';
    }
    
    if (!container.hasAttribute('data-preview-click-handler')) {
      container.setAttribute('data-preview-click-handler', 'true');
      container.style.cursor = 'pointer';
    }
  }
  
  img.offsetHeight;
  img.offsetWidth;
  
  const chatId = getChatId();
  const imageSrc = newSrc || img.src;
  if (imageSrc && imageSrc.startsWith('/uploads/') && chatId) {
    const originalSrc = img.dataset.originalSrc || img.getAttribute('data-original-src');
    if (originalSrc && !originalSrc.startsWith('/uploads/')) {
      imageUrlCache.set(chatId, originalSrc, imageSrc, 'path');
      console.log(`💾 [DISPLAY] Cache actualizado: ${originalSrc} -> ${imageSrc}`);
    }
  }
  
  console.log(`✅ [DISPLAY] Imagen visible exitosamente: ${imageSrc}`);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('imageDisplayUpdated', {
      detail: { img, src: imageSrc, container }
    }));
  }
}


export async function processImagesRealTime(container, externalImages, chatId) {
  console.log(`🖼️ [REALTIME] Procesando ${externalImages.length} imágenes con paralelismo controlado (max: ${IMAGE_CONFIG.PARALLEL_LIMIT})`);
  
  const results = {
    total: externalImages.length,
    successful: 0,
    failed: 0,
    fromCache: 0,
    skippedFailed: 0
  };
  
  for (let i = 0; i < externalImages.length; i += IMAGE_CONFIG.PARALLEL_LIMIT) {
    const chunk = Array.from(externalImages).slice(i, i + IMAGE_CONFIG.PARALLEL_LIMIT);
    console.log(`🖼️ [REALTIME] Procesando chunk ${Math.floor(i / IMAGE_CONFIG.PARALLEL_LIMIT) + 1}: ${chunk.length} imágenes en paralelo`);
    
    const chunkPromises = chunk.map(async (img, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      const originalSrc = img.dataset.originalSrc || img.src;
      
      if (!isValidExternalImageURL(originalSrc)) {
        img.removeAttribute('data-needs-storage');
        img.classList.add('invalid-url');
        
        const urlCheck = isProblematicUrl(originalSrc);
        if (urlCheck.isFailedUrl) {
          results.skippedFailed++;
          console.log(`⏭️ [REALTIME] URL en lista de fallidas saltada: ${originalSrc.substring(0, 50)}...`);
        } else {
          console.log(`🚫 [REALTIME] URL filtrada: ${originalSrc.substring(0, 50)}...`);
        }
        return { success: false, reason: 'invalid_url' };
      }

      console.log(`🖼️ [REALTIME] Procesando imagen ${globalIndex + 1}/${externalImages.length}: ${originalSrc.substring(0, 50)}...`);
      
      img.classList.add('image-processing');
      img.style.opacity = '0.7';
      
      const result = await processImageWithRetry(originalSrc, chatId);
      
      if (result.success && result.filePath) {
        console.log(`🎯 [REALTIME] Actualizando DOM para imagen ${globalIndex + 1}: ${result.filePath}`);
        
        img.src = result.filePath;
        img.dataset.originalSrc = result.filePath;
        
        img.removeAttribute('data-needs-storage');
        img.classList.remove('external-image', 'image-processing');
        img.classList.add('stored-image', 'loaded');
        
        img.style.opacity = '1';
        img.style.visibility = 'visible';
        img.style.display = '';
        
        updateImageDisplay(img, result.filePath);
        
        img.offsetHeight;
        setTimeout(() => img.offsetHeight, 10);
        setTimeout(() => img.offsetHeight, 50);
        
        console.log(`✅ [REALTIME] Imagen ${globalIndex + 1} procesada y VISIBLE: ${result.filePath}`);
        
        if (result.fromCache) {
          results.fromCache++;
        }
        results.successful++;
      } else {
        img.classList.remove('image-processing');
        img.style.opacity = '0.5';
        img.removeAttribute('data-needs-storage');
        results.failed++;
        
        if (!result.silent) {
          console.log(`🔇 [REALTIME] Imagen ${globalIndex + 1} no procesable: ${result.error || 'Error desconocido'}`);
        }
      }
      
      return result;
    });
    
    await Promise.allSettled(chunkPromises);
    
    setTimeout(() => {
      chunk.forEach(img => {
        if (img.classList.contains('stored-image') && img.src.startsWith('/uploads/')) {
          img.style.visibility = 'visible';
          img.style.opacity = '1';
          img.style.display = '';
          console.log(`🔍 [POST-CHUNK] Verificando visibilidad: ${img.src}`);
        }
      });
    }, 100);
    
    // Delay entre chunks si hay más por procesar
    if (i + IMAGE_CONFIG.PARALLEL_LIMIT < externalImages.length) {
      console.log(`⏳ [REALTIME] Esperando ${IMAGE_CONFIG.PARALLEL_CHUNK_DELAY}ms antes del siguiente chunk...`);
      await new Promise(resolve => setTimeout(resolve, IMAGE_CONFIG.PARALLEL_CHUNK_DELAY));
    }
  }
  
  setTimeout(() => {
    console.log(`🔍 [FINAL-CHECK] Verificando visibilidad de ${results.successful} imágenes procesadas`);
    container.querySelectorAll('img.stored-image').forEach(img => {
      if (img.src.startsWith('/uploads/')) {
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = '';
        
        const container = img.closest('.markdown-image-container');
        if (container) {
          const placeholders = container.querySelectorAll('.image-placeholder, .expired-image-placeholder');
          placeholders.forEach(p => p.remove());
        }
      }
    });
  }, 500);
  
  console.log(`🎉 [REALTIME] Procesamiento paralelo completado: ${results.successful}/${results.total} exitosas, ${results.fromCache} desde cache, ${results.skippedFailed} URLs fallidas saltadas`);
  return results;
}


export async function processImagesBatch(container, externalImages, chatId) {
  console.log(`📦 [BATCH] Procesando ${externalImages.length} imágenes con paralelismo controlado (max: ${IMAGE_CONFIG.PARALLEL_LIMIT})`);
  
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFromCache = 0;
  let totalSkippedFailed = 0;
  
  for (let i = 0; i < externalImages.length; i += IMAGE_CONFIG.PARALLEL_LIMIT) {
    const chunk = Array.from(externalImages).slice(i, i + IMAGE_CONFIG.PARALLEL_LIMIT);
    const chunkNumber = Math.floor(i / IMAGE_CONFIG.PARALLEL_LIMIT) + 1;
    const totalChunks = Math.ceil(externalImages.length / IMAGE_CONFIG.PARALLEL_LIMIT);
    
    console.log(`📦 [BATCH] Procesando chunk ${chunkNumber}/${totalChunks}: ${chunk.length} imágenes en paralelo`);
    
    const chunkPromises = chunk.map(async (img, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      const originalSrc = img.dataset.originalSrc || img.src;
      
      if (!isValidExternalImageURL(originalSrc)) {
        img.removeAttribute('data-needs-storage');
        img.classList.add('invalid-url');
        
        const urlCheck = isProblematicUrl(originalSrc);
        if (urlCheck.isFailedUrl) {
          console.log(`⏭️ [BATCH] URL en lista de fallidas saltada: ${originalSrc.substring(0, 50)}...`);
          return { success: false, processed: true, reason: 'failed_url', skippedFailed: true };
        } else {
          console.log(`🚫 [BATCH] URL filtrada: ${originalSrc.substring(0, 50)}...`);
          return { success: false, processed: true, reason: 'invalid_url' };
        }
      }
      
      const cachedPath = GLOBAL_IMAGE_LOCKS._checkAllCaches(chatId, originalSrc);
      if (cachedPath) {
        img.src = cachedPath;
        img.dataset.originalSrc = cachedPath;
        img.classList.remove('external-image');
        img.classList.add('stored-image');
        updateImageDisplay(img);
        console.log(`💾 [BATCH] Cache hit para imagen ${globalIndex + 1}: ${cachedPath}`);
        return { success: true, processed: true, fromCache: true, filePath: cachedPath };
      }
      
      img.classList.add('image-processing');
      
      console.log(`📥 [BATCH] Descargando imagen ${globalIndex + 1}: ${originalSrc.substring(0, 50)}...`);
      
      const result = await processImageWithRetry(originalSrc, chatId);
      
      if (result.success && result.filePath) {
        img.src = result.filePath;
        img.dataset.originalSrc = result.filePath;
        img.removeAttribute('data-needs-storage');
        img.classList.remove('external-image', 'image-processing');
        img.classList.add('stored-image');
        
        updateImageDisplay(img);
        
        console.log(`✅ [BATCH] Imagen ${globalIndex + 1} guardada: ${result.filePath}`);
        return { success: true, processed: true, filePath: result.filePath };
      } else {
        img.classList.remove('image-processing');
        img.removeAttribute('data-needs-storage');
        console.log(`🔇 [BATCH] Imagen ${globalIndex + 1} no procesable: ${result.error || 'Error desconocido'}`);
        return { success: false, processed: true, error: result.error };
      }
    });
    
    const chunkResults = await Promise.allSettled(chunkPromises);
    
    chunkResults.forEach(promiseResult => {
      if (promiseResult.status === 'fulfilled' && promiseResult.value.processed) {
        totalProcessed++;
        if (promiseResult.value.success) {
          totalSuccessful++;
          if (promiseResult.value.fromCache) {
            totalFromCache++;
          }
        }
        if (promiseResult.value.skippedFailed) {
          totalSkippedFailed++;
        }
      }
    });
    
    console.log(`📊 [BATCH] Chunk ${chunkNumber} completado: ${chunkResults.filter(r => r.status === 'fulfilled' && r.value.success).length}/${chunk.length} exitosas`);
    
    // Delay entre chunks si hay más por procesar
    if (i + IMAGE_CONFIG.PARALLEL_LIMIT < externalImages.length) {
      console.log(`⏳ [BATCH] Esperando ${IMAGE_CONFIG.PARALLEL_CHUNK_DELAY}ms antes del siguiente chunk...`);
      await new Promise(resolve => setTimeout(resolve, IMAGE_CONFIG.PARALLEL_CHUNK_DELAY));
    }
  }
  
  console.log(`🎉 [BATCH] Procesamiento paralelo completado: ${totalSuccessful}/${totalProcessed} imágenes guardadas, ${totalFromCache} desde cache, ${totalSkippedFailed} URLs fallidas saltadas`);
  console.log(`📊 [STATS] Cache hits: ${GLOBAL_IMAGE_LOCKS._stats.hits}, misses: ${GLOBAL_IMAGE_LOCKS._stats.misses}, concurrent: ${GLOBAL_IMAGE_LOCKS._stats.concurrent}, parallel: ${GLOBAL_IMAGE_LOCKS._stats.parallel}`);
  
  const failedStats = failedURLManager.getStats();
  if (failedStats.total > 0) {
    console.log(`📊 [FAILED-URLS] Total: ${failedStats.total}, Permanentes: ${failedStats.permanent}, Temporales: ${failedStats.temporary}, Expiradas: ${failedStats.expired}`);
  }
  
  // Notificación de éxito
  if (totalSuccessful > 0 && typeof window !== 'undefined' && window.acadelSuccess) {
    let message = `${totalSuccessful} imágenes guardadas exitosamente (${totalFromCache} desde cache)`;
    if (totalSkippedFailed > 0) {
      message += `, ${totalSkippedFailed} URLs fallidas saltadas`;
    }
    
    window.acadelSuccess(
      "🖼️ Imágenes procesadas",
      message
    );
  }
  
  return {
    total: totalProcessed,
    successful: totalSuccessful,
    failed: totalProcessed - totalSuccessful,
    fromCache: totalFromCache,
    skippedFailed: totalSkippedFailed
  };
}


export async function processImagesOptimized(container, externalImages = null) {
  const containerKey = container.dataset.containerId || container.outerHTML.slice(0, 100);
  
  if (PROCESSING_CONTAINERS.has(containerKey)) {
    console.log('🚫 [OPTIMIZED] Contenedor ya está siendo procesado, ignorando llamada duplicada');
    return { total: 0, successful: 0, failed: 0, skipped: true };
  }

  PROCESSING_CONTAINERS.add(containerKey);
  
  try {
    if (!externalImages) {
      externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
    }
    
    if (externalImages.length === 0) {
      console.log('🖼️ [OPTIMIZED] No hay imágenes externas para procesar');
      return { total: 0, successful: 0, failed: 0 };
    }

    const validImages = filterValidImages(externalImages);
    
    if (validImages.length === 0) {
      console.log('🖼️ [OPTIMIZED] No hay imágenes válidas para procesar después del filtrado');
      return { total: 0, successful: 0, failed: 0 };
    }

    const chatId = getChatId();
    
    console.log(`🚀 [OPTIMIZED] Procesando ${validImages.length} imágenes válidas con paralelismo (max: ${IMAGE_CONFIG.PARALLEL_LIMIT}) - ${externalImages.length - validImages.length} filtradas`);
    
    let result;
    if (validImages.length <= IMAGE_CONFIG.REALTIME_THRESHOLD) {
      result = await processImagesRealTime(container, validImages, chatId);
    } else {
      result = await processImagesBatch(container, validImages, chatId);
    }
    
    return result;
    
  } finally {
    setTimeout(() => {
      PROCESSING_CONTAINERS.delete(containerKey);
    }, 1000); // 1 segundo de "cooldown"
  }
}

// UTILIDADES

export function getChatId() {
  try {
    if (window.tempChatIdForFiles) {
      console.log('🆔 Usando chat temporal para archivos:', window.tempChatIdForFiles);
      return window.tempChatIdForFiles;
    }
    
    if (typeof window !== 'undefined') {
      // Método 1: Estado global directo
      if (window.app?.state?.currentChat?.id) {
        return window.app.state.currentChat.id;
      }
      
      // Método 2: Función getState si está disponible
      if (typeof getState === 'function') {
        const currentChatId = getState('currentChatId');
        if (currentChatId && currentChatId !== 'null' && currentChatId !== null) {
          return currentChatId;
        }
      }
      
      // Método 3: Estado desde módulo importado
      if (typeof window.getState === 'function') {
        const currentChat = window.getState('currentChat');
        if (currentChat?.id) {
          return currentChat.id;
        }
      }
    }
    
    const urlMatch = window.location.pathname.match(/\/[^\/]+\/([a-f0-9-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    
    console.warn('⚠️ [UTILS] No se pudo determinar el chatId, usando default_chat');
    return 'default_chat';
    
  } catch (e) {
    console.warn('⚠️ [UTILS] Error al determinar el chatId:', e);
    return 'default_chat';
  }
}

// INICIALIZACIÓN Y HANDLERS DE VISTA PREVIA

export function initializeImagePreviewHandlers(container) {
  if (container.hasAttribute('data-images-initialized')) {
    console.log('📦 [INIT] Contenedor ya inicializado, saltando');
    return;
  }
  
  container.setAttribute('data-images-initialized', 'true');
  
  const imageContainers = container.querySelectorAll('.markdown-image-container, .image-preview');
  if (imageContainers.length === 0) return;

  const isMultimodal = container.closest('.multimodal-container') !== null;
  const imageCount = container.querySelectorAll('img.markdown-image').length;

  imageContainers.forEach(imageContainer => {
    const image = imageContainer.querySelector('img, .markdown-image');
    if (!image) return;

    // Exclusión para imágenes multimodales ya procesadas
    if (image.closest('.chat-image-item') || 
        image.closest('.multimodal-container .unified-attachments')) {
      return;
    }

    const imageSrc = image.src || image.dataset.originalSrc;
    const chatId = getChatId();
    
    const cachedPath = GLOBAL_IMAGE_LOCKS._checkAllCaches(chatId, imageSrc);
    
    if (cachedPath || (imageSrc && imageSrc.startsWith('/uploads/'))) {
      const finalPath = cachedPath || imageSrc;
      image.src = finalPath;
      image.classList.add('stored-image', 'loaded');
      image.style.visibility = 'visible';
      image.style.opacity = '1';
      
      const placeholder = imageContainer.querySelector('.expired-image-placeholder, .image-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
        placeholder.remove();
      }
      
      console.log(`✅ [INIT] Imagen local/cache detectada: ${finalPath}`);
    }

    // Limpieza de placeholders duplicados
    const placeholders = imageContainer.querySelectorAll('.expired-image-placeholder');
    if (placeholders.length > 1) {
      for (let i = 1; i < placeholders.length; i++) {
        placeholders[i].remove();
      }
    }

    // Prevención de event handlers duplicados
    if (image.hasAttribute('data-preview-handler')) return;
    image.setAttribute('data-preview-handler', 'true');

    // Event listeners para carga
    image.addEventListener('load', () => {
      image.classList.add('loaded');
      image.style.visibility = 'visible';
      image.style.opacity = '1';
      
      const placeholder = imageContainer.querySelector('.expired-image-placeholder, .image-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
        setTimeout(() => placeholder.remove(), 100);
      }
      
      console.log(`✅ [INIT] Imagen cargada: ${image.src}`);
    });

    image.addEventListener('error', () => {
      const imageSrc = image.src || image.dataset.originalSrc;
      if (!imageSrc || !imageSrc.startsWith('/uploads/')) {
        handleImageError(image, 'inline', { isMultimodal, imageCount, chatId: getChatId() });
      } else {
        console.warn(`⚠️ [INIT] Imagen local falló: ${imageSrc}`);
      }
    });

    // Configuración de click handlers para vista previa
    if (!imageContainer.hasAttribute('data-preview-click-handler')) {
      imageContainer.setAttribute('data-preview-click-handler', 'true');
      imageContainer.style.cursor = 'pointer';

      imageContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (image.complete && image.naturalWidth === 0) {
          console.log('ℹ️ [INIT] Imagen no disponible para vista previa');
          return;
        }

        if (typeof window.showFullImage === 'function') {
          window.showFullImage(image.getAttribute('data-original-src') || image.src);
        }
      });
    }

    // Verificación inmediata del estado
    if (image.complete) {
      if (image.naturalWidth > 0) {
        image.classList.add('loaded');
        image.style.visibility = 'visible';
        image.style.opacity = '1';
        
        const placeholder = imageContainer.querySelector('.expired-image-placeholder, .image-placeholder');
        if (placeholder) {
          placeholder.style.display = 'none';
          placeholder.remove();
        }
      } else {
        const imageSrc = image.src || image.dataset.originalSrc;
        if (!imageSrc || !imageSrc.startsWith('/uploads/')) {
          image.dispatchEvent(new Event('error'));
        }
      }
    }
  });

  const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
  if (externalImages.length > 0) {
    console.log(`🔄 [INIT] Iniciando procesamiento automático de ${externalImages.length} imágenes externas con paralelismo`);
    processImagesOptimized(container, externalImages);
  }
}


/**
 * Maneja errores de carga de imágenes con placeholders
 */
export function handleImageError(img, mode = 'inline', options = {}) {
  if (!img || !img.isConnected) return null;

  const imageSrc = img.dataset.originalSrc || img.src;
  if (imageSrc && imageSrc.startsWith('/uploads/')) {
    console.log(`ℹ️ [ERROR] Imagen local con problema temporal, no crear placeholder: ${imageSrc}`);
    return null;
  }

  if (img.classList.contains('error-processed')) return null;
  img.classList.add('error-processed');

  const settings = { ...options };

  if (settings.chatId && imageSrc && !imageSrc.startsWith('/uploads/')) {
    failedURLManager.markAsFailed(imageSrc, null, 'Error de carga en imagen');
  }

  img.style.display = 'none';
  img.removeAttribute('data-needs-storage');
  img.classList.remove('external-image');
  img.classList.add('failed-image');

  if (mode === 'inline') {
    const container = img.closest('.markdown-image-container, .image-preview');
    if (!container) return null;

    let placeholder = container.querySelector('.expired-image-placeholder');
    if (placeholder) {
      placeholder.style.display = 'flex';
      return placeholder;
    }

    if (!imageSrc || imageSrc.startsWith('/uploads/')) {
      console.log(`ℹ️ [ERROR] No crear placeholder para imagen local: ${imageSrc}`);
      return null;
    }

    placeholder = createImageErrorPlaceholder();
    placeholder.style.cursor = 'pointer';
    container.appendChild(placeholder);

    placeholder.addEventListener('click', () => {
      showErrorModal({ title: settings.modalTitle });
    });

    return placeholder;
  }

  return null;
}

/**
 * Crea un placeholder para imágenes con error
 */
function createImageErrorPlaceholder() {
  const placeholder = createElement('div', {
    className: 'expired-image-placeholder',
    style: {
      display: 'flex',
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '8px'
    }
  });
  
  const icon = createElement('i', {
    className: 'bx bx-image-off',
    style: {
      fontSize: '1.5rem',
      color: '#e74c3c'
    }
  });
  
  const text = createElement('span', {
    style: {
      fontSize: '0.9rem',
      color: '#666'
    }
  }, '👻 Imagen fantasma detectada');
  
  placeholder.appendChild(icon);
  placeholder.appendChild(text);
  
  return placeholder;
}

/**
 * Muestra modal de error para imágenes
 */
function showErrorModal(options = {}) {
  const title = options.title || 'Imagen invisible! 👻 Acadel no puede identificar esta imagen.';
  
  if (typeof window !== 'undefined' && window.acadelWarning) {
    window.acadelWarning(
      "👻 Imagen fantasma", 
      "Acadel no pudo cargar la imagen. Parece que se volvió invisible."
    );
  }
}


export function verifyAndRepairImageDisplay(container = document) {
  console.log('🔧 [REPAIR] Verificando y reparando visualización de imágenes...');
  
  const processedImages = container.querySelectorAll('img.stored-image, img[src^="/uploads/"]');
  let repairedCount = 0;
  
  processedImages.forEach(img => {
    if (img.src.startsWith('/uploads/')) {
      if (img.style.visibility === 'hidden' || img.style.opacity === '0' || img.style.display === 'none') {
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = '';
        img.classList.add('stored-image');
        img.classList.remove('image-processing', 'external-image');
        repairedCount++;
        console.log(`🔧 [REPAIR] Imagen reparada: ${img.src}`);
      }
      
      const container = img.closest('.markdown-image-container, .image-preview');
      if (container) {
        const placeholders = container.querySelectorAll('.image-placeholder, .expired-image-placeholder, .mermaid-loading');
        placeholders.forEach(placeholder => placeholder.remove());
      }
    }
  });
  
  if (repairedCount > 0) {
    console.log(`✅ [REPAIR] ${repairedCount} imágenes reparadas`);
  } else {
    console.log(`✅ [REPAIR] Todas las imágenes están correctamente visibles`);
  }
  
  return repairedCount;
}

export function manageFailedUrls() {
  return {
    getStats: () => failedURLManager.getStats(),
    clearAll: () => {
      failedURLManager.failedUrls.clear();
      failedURLManager.saveToStorage();
      console.log('🧹 [FAILED-URLS] Todas las URLs fallidas limpiadas');
    },
    clearUrl: (url) => failedURLManager.clearFailedUrl(url),
    listFailed: () => Array.from(failedURLManager.failedUrls.entries()),
    cleanup: () => failedURLManager.cleanup()
  };
}

export function startImageMonitoring(interval = 2000) {
  if (window._imageMonitoringActive) return;
  window._imageMonitoringActive = true;
  
  const monitor = () => {
    const allImages = document.querySelectorAll('img.markdown-image');
    const external = document.querySelectorAll('img.markdown-image.external-image');
    const processing = document.querySelectorAll('img.markdown-image.image-processing');
    const stored = document.querySelectorAll('img.markdown-image.stored-image');
    const needsStorage = document.querySelectorAll('img[data-needs-storage="true"]');
    
    const failedStats = failedURLManager.getStats();
    
    console.log(`📊 [MONITOR] Imágenes: ${allImages.length} total, ${external.length} externas, ${processing.length} procesando, ${stored.length} almacenadas, ${needsStorage.length} pendientes`);
    console.log(`📊 [MONITOR] URLs fallidas: ${failedStats.total} total (${failedStats.permanent} permanentes, ${failedStats.temporary} temporales)`);
    
    stored.forEach(img => {
      if (img.src.startsWith('/uploads/') && (img.style.visibility === 'hidden' || img.style.opacity === '0')) {
        console.warn(`⚠️ [MONITOR] Imagen almacenada pero oculta: ${img.src}`);
        updateImageDisplay(img);
      }
    });
  };
  
  const monitorInterval = setInterval(monitor, interval);
  
  setTimeout(() => {
    clearInterval(monitorInterval);
    window._imageMonitoringActive = false;
    console.log('🛑 [MONITOR] Monitoreo de imágenes detenido');
  }, 30000);
  
  console.log('🎯 [MONITOR] Monitoreo de imágenes iniciado');
  return monitorInterval;
}


if (typeof window !== 'undefined') {
  let repairCount = 0;
  const maxRepairs = 6; // 6 x 5s = 30s
  
  const autoRepair = setInterval(() => {
    verifyAndRepairImageDisplay();
    repairCount++;
    
    if (repairCount >= maxRepairs) {
      clearInterval(autoRepair);
      console.log('🛑 [AUTO-REPAIR] Auto-reparación detenida después de 30s');
    }
  }, 5000);
  
  window.addEventListener('imageDisplayUpdated', (e) => {
    console.log('🎉 [EVENT] Imagen actualizada:', e.detail);
  });
  
  window.debugImages = {
    verify: () => verifyAndRepairImageDisplay(),
    monitor: (interval) => startImageMonitoring(interval),
    updateDisplay: (img, src) => updateImageDisplay(img, src),
    failedUrls: manageFailedUrls(),
    stats: () => {
      const stats = {
        total: document.querySelectorAll('img.markdown-image').length,
        external: document.querySelectorAll('img.markdown-image.external-image').length,
        processing: document.querySelectorAll('img.markdown-image.image-processing').length,
        stored: document.querySelectorAll('img.markdown-image.stored-image').length,
        needsStorage: document.querySelectorAll('img[data-needs-storage="true"]').length
      };
      const failedStats = failedURLManager.getStats();
      console.table({...stats, ...failedStats});
      return {...stats, failed: failedStats};
    }
  };
}


export default {
  processImagesOptimized,
  initializeImagePreviewHandlers,
  imageUrlCache,
  updateImageDisplay,
  filterValidImages,
  isValidExternalImageURL,
  getChatId,
  handleImageError,
  IMAGE_CONFIG,
  GLOBAL_IMAGE_LOCKS,
  processImageWithRetry,
  processImagesRealTime,
  processImagesBatch,
  verifyAndRepairImageDisplay,
  manageFailedUrls,
  startImageMonitoring,
  failedURLManager
};