// backend/services/shared/tokenCounterService.js (OPTIMIZADO PARA VELOCIDAD)

import { encoding_for_model } from 'tiktoken';
import { redisService } from '../../lib/redis.js';
import pool from '../../lib/dbPool.js';

/**
 * ⚡ SERVICIO OPTIMIZADO: Contador ultrarrápido de tokens con cache agresivo
 * OBJETIVO: Reducir tiempo de respuesta de 14s a <3s
 */
export class TokenCounterService {
  
  static instance = null;
  
  constructor() {
    if (TokenCounterService.instance) {
      return TokenCounterService.instance;
    }
    
    this.encoders = new Map();
    this.defaultModel = 'gpt-4';
    
    // 🚀 CACHE AGRESIVO - OPTIMIZADO PARA VELOCIDAD
    this.cacheConfig = {
      TTL: 600, // 10 minutos - más agresivo
      keyPrefix: 'tokens_chat:',
      maxIncrementalMessages: 100, // Más flexible
      // ⚡ NUEVO: Cache en memoria para hits ultrarrápidos
      memoryCache: new Map(),
      memoryCacheSize: 1000,
      memoryCacheTTL: 120000 // 2 minutos en memoria
    };
    
    TokenCounterService.instance = this;
  }
  
  /**
   * ⚡ OPTIMIZADO: Encoder con lazy loading y cache
   */
  getEncoder(model = this.defaultModel) {
    if (!this.encoders.has(model)) {
      try {
        const encoder = encoding_for_model(model);
        this.encoders.set(model, encoder);
      } catch (error) {
        console.warn(`⚠️ Encoder fallback para ${model}:`, error.message);
        if (model !== 'gpt-4') {
          return this.getEncoder('gpt-4');
        }
        throw new Error(`Error inicializando tokenizer: ${error.message}`);
      }
    }
    return this.encoders.get(model);
  }
  
  /**
   * ⚡ OPTIMIZADO: Count tokens sin overhead
   */
  countTokens(text, model = this.defaultModel) {
    try {
      if (!text || typeof text !== 'string') return 0;
      
      const encoder = this.getEncoder(model);
      const tokens = encoder.encode(text);
      return tokens.length;
      
    } catch (error) {
      console.error('❌ Error contando tokens:', error);
      return Math.ceil(text.length / 4); // Fallback inmediato
    }
  }

  // ================================
  // 🚀 MÉTODOS OPTIMIZADOS PARA VELOCIDAD
  // ================================

  /**
   * ⚡ ULTRA-OPTIMIZADO: Cache en memoria + Redis + DB lazy
   */
  async countChatTokens(chatId, forceRecalculate = false) {
    const cacheKey = `${this.cacheConfig.keyPrefix}${chatId}`;
    
    try {
      // 🚀 NIVEL 1: Cache en memoria (0.1ms)
      if (!forceRecalculate) {
        const memoryResult = this._getMemoryCache(chatId);
        if (memoryResult) {
          console.log(`⚡ Memory Cache HIT: ${chatId} (${memoryResult.totalTokens} tokens)`);
          return {
            ...memoryResult,
            fromCache: true,
            method: 'memory_ultrafast'
          };
        }
      }

      // 🚀 NIVEL 2: Redis cache (1-2ms)
      if (!forceRecalculate) {
        const cached = await redisService.get(cacheKey);
        if (cached && this._isCacheValid(cached)) {
          console.log(`📦 Redis Cache HIT: ${chatId} (${cached.totalTokens} tokens)`);
          
          // ⚡ Guardar en memoria para próxima vez
          this._setMemoryCache(chatId, cached);
          
          return {
            ...cached,
            fromCache: true,
            method: 'redis_fast'
          };
        }
      }

      // 🚀 NIVEL 3: Cálculo optimizado desde BD (solo si es necesario)
      console.log(`🔄 DB Calculation: ${chatId} - calculando...`);
      const calculated = await this._calculateChatTokensOptimized(chatId);
      
      // ⚡ Guardar en ambos caches
      await this._setCacheAggressive(chatId, calculated);
      
      return {
        ...calculated,
        fromCache: false,
        method: 'calculated_optimized'
      };

    } catch (error) {
      console.error(`❌ Error en countChatTokens para ${chatId}:`, error);
      
      // 🛡️ Fallback ultrarrápido
      return {
        totalTokens: 0,
        messageCount: 0,
        lastMessageId: null,
        fromCache: false,
        method: 'error_fallback'
      };
    }
  }

  /**
   * ⚡ OPTIMIZADO: Update incremental ultrarrápido
   */
  async updateChatTokens(chatId, lastKnownMessageId = null) {
    try {
      // 🚀 Intentar cache primero
      const cached = await this._getCacheAggressive(chatId);
      
      if (!cached) {
        return await this.countChatTokens(chatId);
      }

      // 🚀 Obtener solo mensajes nuevos (query optimizada)
      const newMessages = await this._getNewMessagesOptimized(chatId, cached.lastMessageId);
      
      if (newMessages.length === 0) {
        console.log(`✅ Token Update: ${chatId} - Sin mensajes nuevos`);
        return {
          totalTokens: cached.totalTokens,
          messageCount: cached.messageCount,
          lastMessageId: cached.lastMessageId,
          fromCache: true,
          method: 'incremental_no_new'
        };
      }

      // 🚀 Cálculo incremental ultrarrápido
      if (newMessages.length <= this.cacheConfig.maxIncrementalMessages) {
        return await this._calculateIncrementalOptimized(chatId, cached, newMessages);
      }

      // 🚀 Recalcular completo solo si hay demasiados mensajes
      console.log(`🔄 Token Update: ${chatId} - Demasiados mensajes nuevos, recalculando...`);
      return await this.countChatTokens(chatId, true);

    } catch (error) {
      console.error(`❌ Error en updateChatTokens para ${chatId}:`, error);
      return await this.countChatTokens(chatId, true);
    }
  }

  /**
   * ⚡ OPTIMIZADO: Invalidación inteligente
   */
  async invalidateChatCache(chatId) {
    const cacheKey = `${this.cacheConfig.keyPrefix}${chatId}`;
    
    // ⚡ Paralelo: Invalidar memoria y Redis simultáneamente
    const memoryDelete = this._deleteMemoryCache(chatId);
    const redisDelete = redisService.delete(cacheKey);
    
    await Promise.all([memoryDelete, redisDelete]);
    console.log(`🗑️ Token cache invalidated: ${chatId}`);
  }

  /**
   * ⚡ OPTIMIZADO: On message added inteligente
   */
  async onMessageAdded(chatId, messageText) {
    // ⚡ Solo invalidar cache si es un mensaje significativo
    if (!messageText || messageText.length < 10) {
      return; // Skip invalidation for tiny messages
    }
    
    await this.invalidateChatCache(chatId);
    
    const messageTokens = this.countTokens(messageText);
    console.log(`📝 Mensaje añadido a chat ${chatId}: ${messageTokens} tokens - Cache invalidado`);
  }

  // ================================
  // ⚡ MÉTODOS PRIVADOS OPTIMIZADOS
  // ================================

  /**
   * 🚀 NUEVO: Cache en memoria ultrarrápido
   */
  _getMemoryCache(chatId) {
    const data = this.cacheConfig.memoryCache.get(chatId);
    if (!data) return null;
    
    if (Date.now() - data.timestamp > this.cacheConfig.memoryCacheTTL) {
      this.cacheConfig.memoryCache.delete(chatId);
      return null;
    }
    
    return data.value;
  }

  _setMemoryCache(chatId, value) {
    // ⚡ Limpiar cache si está lleno
    if (this.cacheConfig.memoryCache.size >= this.cacheConfig.memoryCacheSize) {
      const oldestKey = this.cacheConfig.memoryCache.keys().next().value;
      this.cacheConfig.memoryCache.delete(oldestKey);
    }
    
    this.cacheConfig.memoryCache.set(chatId, {
      value,
      timestamp: Date.now()
    });
  }

  _deleteMemoryCache(chatId) {
    this.cacheConfig.memoryCache.delete(chatId);
    return Promise.resolve();
  }

  /**
   * ⚡ OPTIMIZADO: Cálculo desde BD con query mejorada
   */
  async _calculateChatTokensOptimized(chatId) {
    const client = await pool.connect();
    
    try {
      // 🚀 Query optimizada - solo columnas necesarias, índice en id_chat
      const messagesQuery = `
        SELECT id, message
        FROM chat_history 
        WHERE id_chat = $1
        AND message IS NOT NULL 
        AND message != ''
        ORDER BY timestamp ASC
      `;
      
      const result = await client.query(messagesQuery, [chatId]);
      const messages = result.rows;
      
      let totalTokens = 0;
      let lastMessageId = null;
      
      // ⚡ Procesamiento optimizado en lotes
      for (const message of messages) {
        if (message.message && message.message.trim()) {
          totalTokens += this.countTokens(message.message);
          lastMessageId = message.id;
        }
      }
      
      console.log(`🧮 Calculated tokens for ${chatId}: ${totalTokens} tokens from ${messages.length} messages`);
      
      return {
        totalTokens,
        messageCount: messages.length,
        lastMessageId,
        calculatedAt: Date.now()
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * ⚡ OPTIMIZADO: Mensajes nuevos con query mejorada
   */
  async _getNewMessagesOptimized(chatId, lastMessageId) {
    const client = await pool.connect();
    
    try {
      // 🚀 Query optimizada con LIMIT para evitar cargar demasiados
      const query = `
        SELECT id, message
        FROM chat_history 
        WHERE id_chat = $1 
        AND id > $2
        AND message IS NOT NULL 
        AND message != ''
        ORDER BY timestamp ASC
        LIMIT 200
      `;
      
      const result = await client.query(query, [chatId, lastMessageId || 0]);
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  /**
   * ⚡ OPTIMIZADO: Cálculo incremental mejorado
   */
  async _calculateIncrementalOptimized(chatId, cached, newMessages) {
    let incrementalTokens = 0;
    let lastMessageId = cached.lastMessageId;
    
    // ⚡ Procesamiento en lotes para mejor rendimiento
    for (const message of newMessages) {
      if (message.message && message.message.trim()) {
        incrementalTokens += this.countTokens(message.message);
        lastMessageId = message.id;
      }
    }
    
    const result = {
      totalTokens: cached.totalTokens + incrementalTokens,
      messageCount: cached.messageCount + newMessages.length,
      lastMessageId,
      calculatedAt: Date.now()
    };
    
    // ⚡ Guardar en cache agresivo
    await this._setCacheAggressive(chatId, result);
    
    console.log(`➕ Token Incremental: ${chatId} - Added ${incrementalTokens} tokens from ${newMessages.length} new messages`);
    
    return {
      ...result,
      fromCache: false,
      method: 'incremental_optimized',
      incrementalTokens,
      newMessagesCount: newMessages.length
    };
  }

  /**
   * ⚡ OPTIMIZADO: Cache agresivo (memoria + Redis)
   */
  async _getCacheAggressive(chatId) {
    // 🚀 Intentar memoria primero
    const memoryResult = this._getMemoryCache(chatId);
    if (memoryResult) {
      return memoryResult;
    }
    
    // 🚀 Intentar Redis
    const cacheKey = `${this.cacheConfig.keyPrefix}${chatId}`;
    const cached = await redisService.get(cacheKey);
    
    if (cached && this._isCacheValid(cached)) {
      // ⚡ Guardar en memoria para próxima vez
      this._setMemoryCache(chatId, cached);
      return cached;
    }
    
    return null;
  }

  async _setCacheAggressive(chatId, result) {
    const cacheKey = `${this.cacheConfig.keyPrefix}${chatId}`;
    
    // ⚡ Guardar en paralelo: memoria y Redis
    const memorySet = this._setMemoryCache(chatId, result);
    const redisSet = redisService.set(cacheKey, result, this.cacheConfig.TTL);
    
    await Promise.all([memorySet, redisSet]);
  }

  /**
   * ⚡ OPTIMIZADO: Validación de cache más flexible
   */
  _isCacheValid(cached) {
    if (!cached || !cached.calculatedAt) return false;
    
    const age = Date.now() - cached.calculatedAt;
    return age < (this.cacheConfig.TTL * 1000);
  }

  // ================================
  // ✅ MÉTODOS ORIGINALES OPTIMIZADOS
  // ================================

  /**
   * ⚡ OPTIMIZADO: Estimación de respuesta más rápida
   */
  estimateResponseTokens(queryText, responseType = 'normal', model = this.defaultModel) {
    const queryTokens = this.countTokens(queryText, model);
    
    // ⚡ Factores optimizados y más precisos
    const factors = {
      "normal": 2.0,           
      "exam": 3.5,             
      "multimodal": 2.5,       
      "problem_solving": 3.0,   
      "theory_deep_dive": 3.8,  
      "concept_explanation": 1.6, 
      "edit": 1.3,             
      "replace": 1.8           
    };
    
    const factor = factors[responseType] || 2.0;
    const baseEstimate = Math.max(100, queryTokens * factor);
    
    // ⚡ Ajustes simples y rápidos
    let multiplier = 1.0;
    const lower = queryText.toLowerCase();
    
    if (lower.includes('explicar') || lower.includes('cómo')) multiplier = 1.1;
    if (lower.includes('examen')) multiplier = 1.6;
    if (lower.includes('resolver')) multiplier = 1.2;
    
    const finalEstimate = Math.ceil(baseEstimate * multiplier);
    
    console.log(`📊 Estimación respuesta: query=${queryTokens} tokens, tipo=${responseType}, estimado=${finalEstimate} tokens`);
    
    return finalEstimate;
  }

  /**
   * ⚡ OPTIMIZADO: Validación rápida
   */
  validateTokenLimit(text, currentTokens, maxTokens, model = this.defaultModel) {
    const textTokens = this.countTokens(text, model);
    const totalTokens = currentTokens + textTokens;
    
    return {
      textTokens,
      currentTokens,
      totalTokens,
      maxTokens,
      remaining: Math.max(0, maxTokens - totalTokens),
      percentage: (totalTokens / maxTokens) * 100,
      exceedsLimit: totalTokens > maxTokens,
      approachingLimit: totalTokens > (maxTokens * 0.8),
      model
    };
  }

  /**
   * ⚡ OPTIMIZADO: Truncate sin overhead
   */
  truncateToTokenLimit(text, maxTokens, model = this.defaultModel) {
    try {
      const encoder = this.getEncoder(model);
      const tokens = encoder.encode(text);
      
      if (tokens.length <= maxTokens) {
        return {
          text,
          originalTokens: tokens.length,
          finalTokens: tokens.length,
          wasTruncated: false
        };
      }
      
      const truncatedTokens = tokens.slice(0, maxTokens);
      const truncatedText = encoder.decode(truncatedTokens);
      
      return {
        text: truncatedText,
        originalTokens: tokens.length,
        finalTokens: truncatedTokens.length,
        wasTruncated: true,
        tokensRemoved: tokens.length - truncatedTokens.length
      };
      
    } catch (error) {
      console.error('❌ Error truncando por tokens:', error);
      
      // ⚡ Fallback ultrarrápido
      const estimatedTokens = this.countTokens(text, model);
      if (estimatedTokens <= maxTokens) {
        return { text, originalTokens: estimatedTokens, finalTokens: estimatedTokens, wasTruncated: false };
      }
      
      const ratio = maxTokens / estimatedTokens;
      const truncatedText = text.substring(0, Math.floor(text.length * ratio));
      
      return {
        text: truncatedText,
        originalTokens: estimatedTokens,
        finalTokens: this.countTokens(truncatedText, model),
        wasTruncated: true,
        method: 'fallback_characters'
      };
    }
  }

  // ================================
  // 📊 MÉTODOS DE ADMINISTRACIÓN OPTIMIZADOS
  // ================================

  /**
   * ⚡ OPTIMIZADO: Stats rápidas
   */
  async getCacheStats() {
    return {
      service: 'TokenCounterService',
      cache: {
        redisConnected: redisService.isReady(),
        TTL: this.cacheConfig.TTL,
        keyPrefix: this.cacheConfig.keyPrefix,
        maxIncrementalMessages: this.cacheConfig.maxIncrementalMessages,
        memoryCache: {
          size: this.cacheConfig.memoryCache.size,
          maxSize: this.cacheConfig.memoryCacheSize,
          ttl: this.cacheConfig.memoryCacheTTL
        }
      },
      encoders: {
        loadedModels: Array.from(this.encoders.keys()),
        defaultModel: this.defaultModel,
        isReady: this.encoders.size > 0
      },
      version: '3.0.0-ultrafast'
    };
  }

  /**
   * ⚡ OPTIMIZADO: Limpieza rápida
   */
  async clearCachePattern(pattern = '*') {
    if (!redisService.isReady()) {
      console.warn('Redis no disponible para limpiar cache');
      return 0;
    }

    // ⚡ Limpiar memoria también
    if (pattern === '*') {
      this.cacheConfig.memoryCache.clear();
    }

    const fullPattern = `${this.cacheConfig.keyPrefix}${pattern}`;
    const deleted = await redisService.deleteByPattern(fullPattern);
    console.log(`🧹 Cache limpiado: ${deleted} claves eliminadas con patrón ${fullPattern}`);
    return deleted;
  }
  
  /**
   * ⚡ OPTIMIZADO: Cleanup más eficiente
   */
  cleanup() {
    // ⚡ Limpiar memoria cache
    this.cacheConfig.memoryCache.clear();
    
    // ⚡ Limpiar encoders
    for (const [model, encoder] of this.encoders) {
      try {
        encoder.free();
        console.log(`🧹 Encoder liberado para modelo: ${model}`);
      } catch (error) {
        console.warn(`⚠️ Error liberando encoder ${model}:`, error.message);
      }
    }
    
    this.encoders.clear();
  }
  
  /**
   * ⚡ OPTIMIZADO: Status con métricas
   */
  getStatus() {
    return {
      loadedModels: Array.from(this.encoders.keys()),
      defaultModel: this.defaultModel,
      isReady: this.encoders.size > 0,
      cache: {
        enabled: redisService.isReady(),
        TTL: this.cacheConfig.TTL,
        keyPrefix: this.cacheConfig.keyPrefix,
        memory: {
          size: this.cacheConfig.memoryCache.size,
          maxSize: this.cacheConfig.memoryCacheSize
        }
      },
      memoryUsage: process.memoryUsage?.() || null,
      version: '3.0.0-ultrafast'
    };
  }
}

// ✅ Singleton instance optimizado
export const tokenCounter = new TokenCounterService();