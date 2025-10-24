/**
 * markdown-image-processor.js - Sistema robusto de procesamiento de imágenes en Markdown
 * ✅ VERSIÓN FINAL: Sistema centralizado de URLs fallidas + CSP optimizado
 * ✅ PREVENCIÓN: No reintenta URLs fallidas al recargar
 * ✅ PERSISTENCIA: URLs fallidas se guardan con expiración
 */

import { createElement, setManagedTimeout } from '../../../shared/dom-helpers.js';

// ==========================================
// ✅ CONFIGURACIÓN DEL SISTEMA - OPTIMIZADA
// ==========================================

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
  
  // ✅ NUEVAS CONFIGURACIONES PARA URLs FALLIDAS
  FAILED_URL_EXPIRY: 3600000,       // 1 hora antes de reintentar URL fallida
  MAX_FAILED_URLS: 1000,            // Máximo 1000 URLs fallidas en cache
  CLEANUP_INTERVAL: 300000,         // Limpiar cache cada 5 minutos
  PERMANENT_FAIL_CODES: [403, 404, 410, 451] // Códigos que no se reintentarán
};

// ✅ NUEVO: Sistema para prevenir múltiples llamadas concurrentes
const PROCESSING_CONTAINERS = new Set();

// ==========================================
// ✅ SISTEMA CENTRALIZADO DE URLs FALLIDAS
// ==========================================

class FailedURLManager {
  constructor() {
    this.storageKey = 'acadel_failed_image_urls';
    this.failedUrls = new Map();
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  /**
   * ✅ Marcar URL como fallida con código de error específico
   */
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

  /**
   * ✅ Verificar si URL está marcada como fallida y no ha expirado
   */
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

  /**
   * ✅ Obtener información de fallo de una URL
   */
  getFailureInfo(url) {
    return this.failedUrls.get(url);
  }

  /**
   * ✅ Limpiar URL de la lista de fallidas (para retry manual)
   */
  clearFailedUrl(url) {
    if (this.failedUrls.delete(url)) {
      this.saveToStorage();
      console.log(`🧹 [FAILED-URL] Limpiada manualmente: ${url.substring(0, 50)}...`);
      return true;
    }
    return false;
  }

  /**
   * ✅ Cargar URLs fallidas desde localStorage
   */
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

  /**
   * ✅ Guardar URLs fallidas en localStorage
   */
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

  /**
   * ✅ Limpieza automática de URLs expiradas
   */
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

  /**
   * ✅ Iniciar intervalo de limpieza automática
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, IMAGE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * ✅ Obtener estadísticas de URLs fallidas
   */
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

// ✅ INSTANCIA GLOBAL DEL MANAGER
const failedURLManager = new FailedURLManager();

// ==========================================
// ✅ VALIDACIÓN PROFESIONAL DE URLs + FAILED URLs
// ==========================================

/**
 * ✅ FUNCIÓN MEJORADA: Detecta URLs problemáticas + verifica failed URLs
 */
function isProblematicUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { problematic: true, reason: 'URL inválida' };
  }
  
  // ✅ PRIORIDAD 1: Verificar si está en lista de URLs fallidas
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

/**
 * ✅ MEJORADO: Valida si una URL es procesable (ahora con failed URLs)
 */
export function isValidExternalImageURL(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return false;
  }

  const cleanUrl = url.trim().toLowerCase();

  // Si ya es local, no procesar
  if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('data:')) {
    return false;
  }

  // Solo procesar URLs que empiecen con http:// o https://
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return false;
  }

  // ✅ VERIFICACIÓN MEJORADA: URLs problemáticas + failed URLs
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
      // Marcar como no procesable
      img.classList.remove('image-processing');
      img.removeAttribute('data-needs-storage');
      img.classList.add('invalid-url');
      
      console.log(`⚠️ [FILTER] Imagen con URL inválida filtrada: ${originalSrc}`);
    }
  });
  
  return validImages;
}

// ==========================================
// 🔒 SISTEMA DE LOCKS GLOBAL MEJORADO PARA PARALELISMO
// ==========================================

const GLOBAL_IMAGE_LOCKS = {
  _locks: new Map(),
  _cache: new Map(),
  _stats: { hits: 0, misses: 0, concurrent: 0, parallel: 0 },

  /**
   * ✅ FUNCIÓN PRINCIPAL: Procesar imagen con lock garantizado
   */
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
        // Continuar con procesamiento nuevo
      }
    }
    
    // 3. CREAR NUEVO LOCK Y PROCESAR
    this._stats.misses++;
    this._stats.parallel++;
    console.log(`🔒 [LOCK] Iniciando procesamiento paralelo: ${originalSrc.substring(0, 50)}... (parallel: ${this._stats.parallel})`);
    
    const processingPromise = (async () => {
      try {
        const result = await processingFunction();
        
        // Guardar en TODOS los caches si es exitoso
        if (result.success && result.filePath) {
          this._updateAllCaches(chatId, originalSrc, result.filePath);
        }
        
        return result;
      } catch (error) {
        console.error(`❌ [LOCK] Error en procesamiento: ${error.message}`);
        throw error;
      } finally {
        this._stats.parallel--;
        // Cleanup automático del lock
        setTimeout(() => {
          if (this._locks.has(lockKey)) {
            this._locks.delete(lockKey);
            console.log(`🧹 [LOCK] Lock limpiado: ${lockKey.substring(0, 50)}...`);
          }
        }, 2000);
      }
    })();
    
    // Establecer lock
    this._locks.set(lockKey, processingPromise);
    
    return await processingPromise;
  },

  /**
   * ✅ VERIFICACIÓN TRIPLE DE CACHE
   */
  _checkAllCaches(chatId, originalSrc) {
    // Cache 1: imageUrlCache principal
    const cache1 = imageUrlCache.get(chatId, originalSrc, 'path');
    if (cache1) return cache1;
    
    // Cache 2: Cache interno del lock
    const lockKey = `${chatId}:${this._hashUrl(originalSrc)}`;
    const cache2 = this._cache.get(lockKey);
    if (cache2 && (Date.now() - cache2.timestamp) < IMAGE_CONFIG.CACHE_DURATION) {
      return cache2.filePath;
    }
    
    // Cache 3: Verificación de URL local
    if (originalSrc.startsWith('/uploads/')) {
      return originalSrc;
    }
    
    return null;
  },

  /**
   * ✅ ACTUALIZACIÓN MÚLTIPLE DE CACHES
   */
  _updateAllCaches(chatId, originalSrc, filePath) {
    // Cache 1: imageUrlCache principal
    imageUrlCache.set(chatId, originalSrc, filePath, 'path');
    
    // Cache 2: Cache interno
    const lockKey = `${chatId}:${this._hashUrl(originalSrc)}`;
    this._cache.set(lockKey, {
      filePath,
      timestamp: Date.now()
    });
  },

  /**
   * ✅ HASH MEJORADO
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
   * ✅ LIMPIEZA PERIÓDICA
   */
  cleanup() {
    const now = Date.now();
    
    // Limpiar cache interno
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

// ==========================================
// SISTEMA DE CACHE UNIFICADO (MEJORADO)
// ==========================================

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
        // ✅ REDIRIGIR AL SISTEMA CENTRALIZADO
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

// Inicializar el caché al cargar el módulo
imageUrlCache.loadFromStorage();

// ==========================================
// DETECCIÓN DE ERRORES TEMPORALES + ANÁLISIS DE CÓDIGOS HTTP
// ==========================================

/**
 * ✅ MEJORADO: Detecta errores temporales de red que ameritan retry + códigos HTTP
 */
export function isTemporaryError(errorMessage, httpStatus = null) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return false;
  }
  
  // ✅ VERIFICAR CÓDIGOS HTTP PERMANENTES
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

/**
 * ✅ NUEVA: Extraer código HTTP de mensaje de error
 */
function extractHttpStatusFromError(errorMessage) {
  if (!errorMessage) return null;
  
  const statusMatch = errorMessage.match(/status[:\s]*(\d{3})/i) || 
                     errorMessage.match(/(\d{3})[:\s]*error/i) ||
                     errorMessage.match(/HTTP[:\s]*(\d{3})/i);
  
  return statusMatch ? parseInt(statusMatch[1]) : null;
}

// ==========================================
// ✅ PROCESAMIENTO CON LOCKS Y REINTENTOS MEJORADO
// ==========================================

/**
 * ✅ FUNCIÓN PRINCIPAL MEJORADA: Procesa una imagen con sistema de locks y análisis de errores
 */
export async function processImageWithRetry(originalSrc, chatId, maxRetries = IMAGE_CONFIG.MAX_RETRIES) {
  // ✅ VALIDACIÓN PROFESIONAL INTEGRADA: Verificar URL antes de procesar
  if (!isValidExternalImageURL(originalSrc)) {
    console.log(`🚫 [RETRY] URL no válida, saltando procesamiento: ${originalSrc.substring(0, 50)}...`);
    return { 
      success: false, 
      error: 'URL no válida o filtrada',
      silent: true 
    };
  }

  // ✅ USAR SISTEMA DE LOCKS GLOBAL
  return await GLOBAL_IMAGE_LOCKS.processWithLock(chatId, originalSrc, async () => {
    let lastError = null;
    let httpStatus = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 [RETRY] Intento ${attempt}/${maxRetries + 1} para: ${originalSrc.substring(0, 30)}...`);
        
        // Importación dinámica para evitar dependencias circulares
        const { saveMarkdownImage } = await import('../api/messages-pdf.js');
        const result = await saveMarkdownImage(originalSrc, chatId);
        
        if (result.success) {
          if (attempt > 1) {
            console.log(`✅ [RETRY] Éxito en intento ${attempt}: ${originalSrc.substring(0, 30)}...`);
          }
          return result;
        } else {
          lastError = result.error;
          httpStatus = extractHttpStatusFromError(result.error);
          
          // ✅ ANÁLISIS INTELIGENTE DE ERRORES
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

// ==========================================
// ACTUALIZACIÓN VISUAL DE IMÁGENES
// ==========================================

/**
 * ✅ FUNCIÓN CORREGIDA: Actualiza inmediatamente la visualización de una imagen después de descarga exitosa
 */
export function updateImageDisplay(img, newSrc = null) {
  if (!img || !img.isConnected) {
    console.warn('⚠️ [DISPLAY] Imagen no válida o desconectada del DOM');
    return;
  }
  
  console.log(`🔄 [DISPLAY] Actualizando visualización de imagen: ${newSrc || img.src}`);
  
  // ✅ FORZAR ACTUALIZACIÓN DEL SRC SI SE PROPORCIONA
  if (newSrc) {
    img.src = newSrc;
    img.dataset.originalSrc = newSrc;
  }
  
  // ✅ LIMPIAR TODOS LOS ESTADOS DE ERROR Y PROCESAMIENTO
  img.classList.remove('error-processed', 'failed-image', 'image-processing', 'external-image');
  img.classList.add('stored-image', 'loaded');
  
  // ✅ FORZAR VISIBILIDAD INMEDIATA
  img.style.display = '';
  img.style.visibility = 'visible';
  img.style.opacity = '1';
  img.removeAttribute('data-needs-storage');
  
  // ✅ MANEJO DEL CONTENEDOR
  const container = img.closest('.markdown-image-container, .image-preview');
  if (container) {
    // Eliminar TODOS los placeholders
    const placeholders = container.querySelectorAll('.expired-image-placeholder, .image-placeholder, .mermaid-loading');
    placeholders.forEach(placeholder => {
      placeholder.style.display = 'none';
      setTimeout(() => {
        if (placeholder.parentNode) {
          placeholder.remove();
        }
      }, 50);
    });
    
    // Mostrar overlay de preview si existe
    const overlay = container.querySelector('.image-overlay, .markdown-image-wrapper');
    if (overlay) {
      overlay.style.display = '';
      overlay.style.visibility = 'visible';
    }
    
    // ✅ ASEGURAR CLICK HANDLER
    if (!container.hasAttribute('data-preview-click-handler')) {
      container.setAttribute('data-preview-click-handler', 'true');
      container.style.cursor = 'pointer';
    }
  }
  
  // ✅ FORZAR REFLOW PARA ACTUALIZACIÓN INMEDIATA
  img.offsetHeight;
  img.offsetWidth;
  
  // ✅ ACTUALIZAR CACHE INMEDIATAMENTE
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
  
  // ✅ EMITIR EVENTO PERSONALIZADO PARA DEBUGGING
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('imageDisplayUpdated', {
      detail: { img, src: imageSrc, container }
    }));
  }
}

// ==========================================
// ✅ PROCESAMIENTO EN TIEMPO REAL CON PARALELISMO CONTROLADO
// ==========================================

/**
 * ✅ NUEVO: Procesa imágenes en paralelo con límite controlado + failed URLs
 */
export async function processImagesRealTime(container, externalImages, chatId) {
  console.log(`🖼️ [REALTIME] Procesando ${externalImages.length} imágenes con paralelismo controlado (max: ${IMAGE_CONFIG.PARALLEL_LIMIT})`);
  
  const results = {
    total: externalImages.length,
    successful: 0,
    failed: 0,
    fromCache: 0,
    skippedFailed: 0
  };
  
  // ✅ PROCESAR EN CHUNKS DE TAMAÑO PARALLEL_LIMIT
  for (let i = 0; i < externalImages.length; i += IMAGE_CONFIG.PARALLEL_LIMIT) {
    const chunk = Array.from(externalImages).slice(i, i + IMAGE_CONFIG.PARALLEL_LIMIT);
    console.log(`🖼️ [REALTIME] Procesando chunk ${Math.floor(i / IMAGE_CONFIG.PARALLEL_LIMIT) + 1}: ${chunk.length} imágenes en paralelo`);
    
    // Procesar chunk en paralelo
    const chunkPromises = chunk.map(async (img, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      const originalSrc = img.dataset.originalSrc || img.src;
      
      // ✅ VALIDACIÓN INTEGRADA: Verificar antes de procesar
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
      
      // ✅ MARCAR COMO PROCESANDO VISUALMENTE
      img.classList.add('image-processing');
      img.style.opacity = '0.7';
      
      // ✅ USAR SISTEMA DE LOCKS MEJORADO
      const result = await processImageWithRetry(originalSrc, chatId);
      
      // ✅ ACTUALIZACIÓN INMEDIATA Y FORZADA DEL DOM
      if (result.success && result.filePath) {
        console.log(`🎯 [REALTIME] Actualizando DOM para imagen ${globalIndex + 1}: ${result.filePath}`);
        
        // ✅ ACTUALIZACIÓN INMEDIATA DEL SRC
        img.src = result.filePath;
        img.dataset.originalSrc = result.filePath;
        
        // ✅ LIMPIAR ATRIBUTOS Y CLASES
        img.removeAttribute('data-needs-storage');
        img.classList.remove('external-image', 'image-processing');
        img.classList.add('stored-image', 'loaded');
        
        // ✅ FORZAR VISIBILIDAD INMEDIATA
        img.style.opacity = '1';
        img.style.visibility = 'visible';
        img.style.display = '';
        
        // ✅ LLAMAR FUNCIÓN DE ACTUALIZACIÓN
        updateImageDisplay(img, result.filePath);
        
        // ✅ FORZAR MÚLTIPLES REFLOWS
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
    
    // Esperar a que termine el chunk completo
    await Promise.allSettled(chunkPromises);
    
    // ✅ VERIFICACIÓN POST-CHUNK: Asegurar que las imágenes sean visibles
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
  
  // ✅ VERIFICACIÓN FINAL: Forzar visibilidad de todas las imágenes procesadas
  setTimeout(() => {
    console.log(`🔍 [FINAL-CHECK] Verificando visibilidad de ${results.successful} imágenes procesadas`);
    container.querySelectorAll('img.stored-image').forEach(img => {
      if (img.src.startsWith('/uploads/')) {
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = '';
        
        // Eliminar cualquier placeholder residual
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

// ==========================================
// ✅ PROCESAMIENTO POR LOTES CON PARALELISMO MEJORADO
// ==========================================

/**
 * ✅ NUEVO: Procesa múltiples imágenes con paralelismo controlado + failed URLs
 */
export async function processImagesBatch(container, externalImages, chatId) {
  console.log(`📦 [BATCH] Procesando ${externalImages.length} imágenes con paralelismo controlado (max: ${IMAGE_CONFIG.PARALLEL_LIMIT})`);
  
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFromCache = 0;
  let totalSkippedFailed = 0;
  
  // ✅ PROCESAMIENTO EN CHUNKS PARALELOS CONTROLADOS
  for (let i = 0; i < externalImages.length; i += IMAGE_CONFIG.PARALLEL_LIMIT) {
    const chunk = Array.from(externalImages).slice(i, i + IMAGE_CONFIG.PARALLEL_LIMIT);
    const chunkNumber = Math.floor(i / IMAGE_CONFIG.PARALLEL_LIMIT) + 1;
    const totalChunks = Math.ceil(externalImages.length / IMAGE_CONFIG.PARALLEL_LIMIT);
    
    console.log(`📦 [BATCH] Procesando chunk ${chunkNumber}/${totalChunks}: ${chunk.length} imágenes en paralelo`);
    
    // Procesar todas las imágenes del chunk en paralelo
    const chunkPromises = chunk.map(async (img, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      const originalSrc = img.dataset.originalSrc || img.src;
      
      // ✅ VALIDACIÓN PROFESIONAL INTEGRADA + FAILED URLs
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
      
      // ✅ VERIFICACIÓN DE CACHE MÁS AGRESIVA
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
      
      // ✅ USAR SISTEMA DE LOCKS Y RETRY MEJORADO
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
    
    // Esperar a que termine todo el chunk
    const chunkResults = await Promise.allSettled(chunkPromises);
    
    // Contar resultados del chunk
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
  
  // ✅ MOSTRAR ESTADÍSTICAS DE URLs FALLIDAS
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

// ==========================================
// ✅ FUNCIÓN PRINCIPAL OPTIMIZADA CON PARALELISMO Y PROTECCIÓN CONTRA CONCURRENCIA
// ==========================================

/**
 * ✅ FUNCIÓN CORREGIDA: processImagesOptimized con protección contra múltiples llamadas + failed URLs
 */
export async function processImagesOptimized(container, externalImages = null) {
  // ✅ VERIFICAR si ya se está procesando este contenedor
  const containerKey = container.dataset.containerId || container.outerHTML.slice(0, 100);
  
  if (PROCESSING_CONTAINERS.has(containerKey)) {
    console.log('🚫 [OPTIMIZED] Contenedor ya está siendo procesado, ignorando llamada duplicada');
    return { total: 0, successful: 0, failed: 0, skipped: true };
  }

  // ✅ MARCAR como en procesamiento
  PROCESSING_CONTAINERS.add(containerKey);
  
  try {
    if (!externalImages) {
      externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
    }
    
    if (externalImages.length === 0) {
      console.log('🖼️ [OPTIMIZED] No hay imágenes externas para procesar');
      return { total: 0, successful: 0, failed: 0 };
    }

    // Filtrar imágenes válidas (ahora con validación profesional integrada + failed URLs)
    const validImages = filterValidImages(externalImages);
    
    if (validImages.length === 0) {
      console.log('🖼️ [OPTIMIZED] No hay imágenes válidas para procesar después del filtrado');
      return { total: 0, successful: 0, failed: 0 };
    }

    const chatId = getChatId();
    
    console.log(`🚀 [OPTIMIZED] Procesando ${validImages.length} imágenes válidas con paralelismo (max: ${IMAGE_CONFIG.PARALLEL_LIMIT}) - ${externalImages.length - validImages.length} filtradas`);
    
    // ✅ NUEVA LÓGICA: Usar paralelismo siempre, ajustado por configuración
    let result;
    if (validImages.length <= IMAGE_CONFIG.REALTIME_THRESHOLD) {
      result = await processImagesRealTime(container, validImages, chatId);
    } else {
      result = await processImagesBatch(container, validImages, chatId);
    }
    
    return result;
    
  } finally {
    // ✅ LIBERAR el lock después de un delay para evitar reentrada inmediata
    setTimeout(() => {
      PROCESSING_CONTAINERS.delete(containerKey);
    }, 1000); // 1 segundo de "cooldown"
  }
}

// ==========================================
// UTILIDADES
// ==========================================

/**
 * ✅ FUNCIÓN CORREGIDA: getChatId() prioriza el estado actual
 */
export function getChatId() {
  try {
    // ✅ PRIORIDAD 1: Chat temporal para primer mensaje con archivos
    if (window.tempChatIdForFiles) {
      console.log('🆔 Usando chat temporal para archivos:', window.tempChatIdForFiles);
      return window.tempChatIdForFiles;
    }
    
    // ✅ PRIORIDAD 2: Estado actual del chat
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
    
    // ✅ PRIORIDAD 3: URL como fallback
    const urlMatch = window.location.pathname.match(/\/[^\/]+\/([a-f0-9-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    
    // ✅ FALLBACK: default_chat
    console.warn('⚠️ [UTILS] No se pudo determinar el chatId, usando default_chat');
    return 'default_chat';
    
  } catch (e) {
    console.warn('⚠️ [UTILS] Error al determinar el chatId:', e);
    return 'default_chat';
  }
}

// ==========================================
// INICIALIZACIÓN Y HANDLERS DE VISTA PREVIA
// ==========================================

/**
 * ✅ FUNCIÓN CORREGIDA: initializeImagePreviewHandlers sin múltiples llamadas
 */
export function initializeImagePreviewHandlers(container) {
  // ✅ VERIFICAR si ya fue inicializado
  if (container.hasAttribute('data-images-initialized')) {
    console.log('📦 [INIT] Contenedor ya inicializado, saltando');
    return;
  }
  
  // ✅ MARCAR como inicializado
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

    // ✅ DETECCIÓN MEJORADA de imágenes locales con verificación de cache
    const imageSrc = image.src || image.dataset.originalSrc;
    const chatId = getChatId();
    
    // Verificar en todos los caches disponibles
    const cachedPath = GLOBAL_IMAGE_LOCKS._checkAllCaches(chatId, imageSrc);
    
    if (cachedPath || (imageSrc && imageSrc.startsWith('/uploads/'))) {
      const finalPath = cachedPath || imageSrc;
      image.src = finalPath;
      image.classList.add('stored-image', 'loaded');
      image.style.visibility = 'visible';
      image.style.opacity = '1';
      
      // Eliminar placeholders inmediatamente
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

    // Manejo de errores
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

  // ✅ PROCESAMIENTO AUTOMÁTICO SOLO UNA VEZ
  const externalImages = container.querySelectorAll('img.markdown-image[data-needs-storage="true"]');
  if (externalImages.length > 0) {
    console.log(`🔄 [INIT] Iniciando procesamiento automático de ${externalImages.length} imágenes externas con paralelismo`);
    processImagesOptimized(container, externalImages);
  }
}

// ==========================================
// MANEJO DE ERRORES DE IMÁGENES
// ==========================================

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

  // ✅ MARCAR EN SISTEMA CENTRALIZADO DE URLs FALLIDAS
  if (settings.chatId && imageSrc && !imageSrc.startsWith('/uploads/')) {
    failedURLManager.markAsFailed(imageSrc, null, 'Error de carga en imagen');
  }

  // Ocultar la imagen
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

// ==========================================
// ✅ NUEVAS FUNCIONES DE DEBUGGING Y MANAGEMENT
// ==========================================

/**
 * ✅ NUEVA: Verifica y repara la visualización de imágenes procesadas
 */
export function verifyAndRepairImageDisplay(container = document) {
  console.log('🔧 [REPAIR] Verificando y reparando visualización de imágenes...');
  
  const processedImages = container.querySelectorAll('img.stored-image, img[src^="/uploads/"]');
  let repairedCount = 0;
  
  processedImages.forEach(img => {
    if (img.src.startsWith('/uploads/')) {
      // ✅ REPARAR VISIBILIDAD
      if (img.style.visibility === 'hidden' || img.style.opacity === '0' || img.style.display === 'none') {
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.style.display = '';
        img.classList.add('stored-image');
        img.classList.remove('image-processing', 'external-image');
        repairedCount++;
        console.log(`🔧 [REPAIR] Imagen reparada: ${img.src}`);
      }
      
      // ✅ ELIMINAR PLACEHOLDERS RESIDUALES
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

/**
 * ✅ NUEVA: Gestión centralizada de URLs fallidas
 */
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

/**
 * ✅ NUEVA: Debugging de estado de imágenes en tiempo real
 */
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
    
    // Verificar imágenes que deberían estar visibles pero no lo están
    stored.forEach(img => {
      if (img.src.startsWith('/uploads/') && (img.style.visibility === 'hidden' || img.style.opacity === '0')) {
        console.warn(`⚠️ [MONITOR] Imagen almacenada pero oculta: ${img.src}`);
        updateImageDisplay(img);
      }
    });
  };
  
  const monitorInterval = setInterval(monitor, interval);
  
  // Detener después de 30 segundos
  setTimeout(() => {
    clearInterval(monitorInterval);
    window._imageMonitoringActive = false;
    console.log('🛑 [MONITOR] Monitoreo de imágenes detenido');
  }, 30000);
  
  console.log('🎯 [MONITOR] Monitoreo de imágenes iniciado');
  return monitorInterval;
}

// ==========================================
// ✅ INICIALIZACIÓN AUTOMÁTICA EN EL DOM
// ==========================================

// ✅ AUTO-REPARACIÓN cada 5 segundos durante los primeros 30 segundos
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
  
  // ✅ EVENTO DE DEBUGGING TEMPORAL
  window.addEventListener('imageDisplayUpdated', (e) => {
    console.log('🎉 [EVENT] Imagen actualizada:', e.detail);
  });
  
  // ✅ FUNCIONES GLOBALES PARA DEBUGGING Y MANAGEMENT
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

// ==========================================
// ✅ EXPORTACIONES PRINCIPALES CON PARALELISMO Y FAILED URLS
// ==========================================

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
  // ✅ NUEVAS EXPORTACIONES
  GLOBAL_IMAGE_LOCKS,
  processImageWithRetry,
  processImagesRealTime,
  processImagesBatch,
  verifyAndRepairImageDisplay,
  manageFailedUrls,
  startImageMonitoring,
  failedURLManager
};