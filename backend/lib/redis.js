import Redis from 'ioredis';
import dotenv from 'dotenv';
import { logSecurityEvent } from '../utils/securityLogger.js';

dotenv.config();

// 🆕 Simple Circuit Breaker implementation
class CircuitBreaker {
    constructor(threshold = 5, timeout = 30000) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            console.warn(`🔴 Circuit breaker OPEN after ${this.failureCount} failures`);
        }
    }

    getState() {
        return this.state;
    }
}

class RedisService {
    constructor() {
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 10;
        this.memoryCache = new Map();
        this.memoryCacheTTL = 60000;
        this.connectionPromise = null;
        this.isInitializing = false;

        // 🆕 Circuit Breaker para operaciones críticas
        this.circuitBreaker = new CircuitBreaker(5, 30000);

        // 🆕 Métricas de operaciones
        this.operationMetrics = {
            totalOperations: 0,
            failedOperations: 0,
            circuitBreakerTrips: 0,
            lastResetTime: Date.now()
        };

        this.initializeClient();
    }

    initializeClient() {
        if (this.isInitializing) {
            return this.connectionPromise;
        }

        this.isInitializing = true;

        let redisConfig;

        if (process.env.REDIS_URL) {
            console.log('🚀 Conectando a Redis via REDIS_URL (Fly.io/Upstash)');

            // ⭐ DETECTAR UPSTASH y configurar para FLY.IO
            const isUpstash = process.env.REDIS_URL.includes('upstash.io');
            const isProduction = process.env.NODE_ENV === 'production';

            console.log(`🔍 Upstash detectado: ${isUpstash}, Producción: ${isProduction}`);

            if (isUpstash) {
                // ⭐ CONFIGURACIÓN ESPECÍFICA PARA FLY.IO + UPSTASH
                redisConfig = {
                    host: process.env.REDIS_URL.match(/@([^:/?]+)/)?.[1],
                    port: parseInt(process.env.REDIS_URL.match(/:(\d+)(?:[/?]|$)/)?.[1]) || 6379,
                    password: process.env.REDIS_URL.match(/redis[s]?:\/\/[^:]*:([^@]+)@/)?.[1],
                    family: 6, // ⭐ FORZAR IPv6 para Fly.io
                    // ⭐ NO TLS - Fly.io maneja SSL internamente
                    connectTimeout: 15000,
                    commandTimeout: 10000,
                    lazyConnect: true,
                    maxRetriesPerRequest: 3,
                    enableReadyCheck: true,

                    retryStrategy: (times) => {
                        if (times > this.maxRetries) {
                            console.error(`❌ Redis: Máximo de reintentos alcanzado (${times})`);
                            this.handleNoRedis();
                            return null;
                        }

                        const delay = Math.min(times * 1000 + Math.random() * 1000, 8000);
                        console.log(`🔄 Redis: Intento ${times}/${this.maxRetries}. Reintentando en ${delay}ms...`);
                        return delay;
                    },

                    enableOfflineQueue: false, // ⭐ DESHABILITAR para fallar rápido
                    autoResubscribe: false,
                    autoResendUnfulfilledCommands: false,
                };
            } else {
                redisConfig = {
                    url: process.env.REDIS_URL,
                    connectTimeout: 10000,
                    commandTimeout: 5000,
                    lazyConnect: true,
                    maxRetriesPerRequest: 3,

                    retryStrategy: (times) => {
                        if (times > this.maxRetries) {
                            console.error(`❌ Redis: Máximo de reintentos alcanzado (${times})`);
                            this.handleNoRedis();
                            return null;
                        }

                        const delay = Math.min(times * 500 + Math.random() * 1000, 5000);
                        console.log(`🔄 Redis: Intento ${times}/${this.maxRetries}. Reintentando en ${delay}ms...`);
                        return delay;
                    }
                };
            }

            console.log(`🚀 Configuración Redis:`, {
                host: redisConfig.host || 'via URL',
                port: redisConfig.port || 'via URL',
                hasPassword: !!redisConfig.password,
                passwordPrefix: redisConfig.password ? redisConfig.password.substring(0, 8) + '...' : 'NO PASSWORD',
                hasTLS: false, // ⭐ SIN TLS para Fly.io
                family: redisConfig.family || 'default',
                connectTimeout: redisConfig.connectTimeout,
                isUpstash
            });

        } else {
            // Configuración para Docker/localhost
            const isDocker = process.env.REDIS_HOST === 'redis' || process.env.NODE_ENV === 'production';
            console.log(`🚀 Conectando a Redis ${isDocker ? 'Docker' : 'localhost'}`);

            redisConfig = {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                connectTimeout: isDocker ? 15000 : 5000,
                commandTimeout: isDocker ? 10000 : 5000,
                lazyConnect: true,
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,

                retryStrategy: (times) => {
                    if (times > this.maxRetries) {
                        console.error(`❌ Redis: Máximo de reintentos alcanzado (${times})`);
                        this.handleNoRedis();
                        return null;
                    }

                    const delay = Math.min(times * 500 + Math.random() * 1000, 5000);
                    console.log(`🔄 Redis: Intento ${times}/${this.maxRetries}. Reintentando en ${delay}ms...`);
                    return delay;
                },

                enableOfflineQueue: true,
            };
        }

        try {
            this.client = new Redis(redisConfig);
            this.connectionPromise = this.setupEventListeners();

        } catch (error) {
            console.error('❌ Error al inicializar cliente Redis:', error);
            this.handleNoRedis();
            this.connectionPromise = Promise.resolve(false);
        }

        return this.connectionPromise;
    }

    async setupEventListeners() {
        return new Promise((resolve) => {
            // ⭐ TIMEOUT DE CONEXIÓN INICIAL OPTIMIZADO PARA FLY.IO
            const isUpstash = process.env.REDIS_URL?.includes('upstash.io');
            const connectionTimeout = setTimeout(() => {
                console.warn('⚠️ Redis: Timeout de conexión inicial, cambiando a modo fallback');
                this.handleNoRedis();
                resolve(false);
            }, isUpstash ? 20000 : 15000); // Más tiempo para Fly.io

            this.client.on('error', (err) => {
                console.error('❌ Redis Error:', err.message);
                this.isConnected = false;
                this.operationMetrics.failedOperations++;

                // ⭐ LOG ESPECÍFICO PARA FLY.IO/UPSTASH
                if (err.code === 'ECONNREFUSED') {
                    console.log('🔴 Redis: Conexión rechazada. Verificar que Redis esté ejecutándose.');
                } else if (err.code === 'ETIMEDOUT') {
                    console.log('🟡 Redis: Timeout de conexión. Red lenta o Redis sobrecargado.');
                } else if (err.code === 'ENOTFOUND') {
                    console.log('🔴 Redis: Host no encontrado. Verificar configuración Redis.');
                } else if (err.message.includes('AUTH')) {
                    console.log('🔐 Redis: Error de autenticación. Verificar password en REDIS_URL');
                } else if (err.message.includes('SSL') || err.message.includes('TLS') ||
                    err.message.includes('wrong version number')) {
                    console.log('🔒 Redis: Error SSL/TLS. Verificar configuración TLS para Upstash');
                }

                logSecurityEvent('REDIS_CONNECTION_ERROR', 'Error en conexión a Redis', {
                    error: err.message,
                    code: err.code,
                    host: process.env.REDIS_HOST || 'via REDIS_URL',
                    isUpstash: process.env.REDIS_URL?.includes('upstash.io')
                }, 'high');
            });

            this.client.on('connect', () => {
                console.log('🟢 Redis: Cliente conectado exitosamente');
                clearTimeout(connectionTimeout);
                this.isConnected = true;
                this.retryCount = 0;
                this.isInitializing = false;
                resolve(true);
            });

            this.client.on('ready', () => {
                console.log('✅ Redis: Listo para recibir comandos');
                this.isConnected = true;

                // ⭐ VERIFICAR CONEXIÓN CON PING
                this.client.ping()
                    .then(() => console.log('🏓 Redis: PING exitoso'))
                    .catch(err => console.warn('⚠️ Redis: PING falló:', err.message));
            });

            this.client.on('reconnecting', (delay) => {
                console.log(`🔄 Redis: Reconectando en ${delay}ms...`);
            });

            this.client.on('close', () => {
                console.log('🔴 Redis: Conexión cerrada');
                this.isConnected = false;
            });

            // ⭐ INTENTO DE CONEXIÓN INICIAL
            this.client.connect().catch((err) => {
                console.error('❌ Redis: Error en conexión inicial:', err.message);

                // ⭐ DIAGNÓSTICO ESPECÍFICO PARA FLY.IO
                if (isUpstash) {
                    console.error('🔍 Upstash Debug Info:', {
                        redisUrl: process.env.REDIS_URL ? 'PRESENTE' : 'AUSENTE',
                        urlPrefix: process.env.REDIS_URL?.substring(0, 20) + '...',
                        errorCode: err.code,
                        errorMessage: err.message
                    });
                }

                clearTimeout(connectionTimeout);
                this.handleNoRedis();
                resolve(false);
            });

            // ⭐ MANEJO DE CIERRE GRACIOSO
            process.on('SIGINT', () => {
                console.log('🔄 Cerrando conexión Redis...');
                if (this.client) {
                    this.client.quit().then(() => {
                        console.log('✅ Redis: Conexión cerrada correctamente');
                    });
                }
            });

            process.on('SIGTERM', () => {
                if (this.client) {
                    this.client.quit();
                }
            });
        });
    }

    // 🆕 Wrapper para operaciones con Circuit Breaker
    async executeWithCircuitBreaker(operation, operationName = 'redis_operation') {
        this.operationMetrics.totalOperations++;

        try {
            if (this.circuitBreaker.state === 'OPEN') {
                console.warn(`🔴 Circuit breaker OPEN, usando fallback para ${operationName}`);
                throw new Error('Circuit breaker is OPEN');
            }

            return await this.circuitBreaker.execute(operation);
        } catch (error) {
            if (this.circuitBreaker.state === 'OPEN') {
                this.operationMetrics.circuitBreakerTrips++;
            }
            this.operationMetrics.failedOperations++;
            throw error;
        }
    }

    // ⭐ VERIFICAR SALUD DE REDIS
    async healthCheck() {
        if (!this.isConnected || !this.client) {
            return {
                status: 'disconnected',
                latency: null,
                provider: process.env.REDIS_URL?.includes('upstash.io') ? 'upstash' : 'other',
                circuitBreaker: this.circuitBreaker.getState(),
                metrics: this.operationMetrics
            };
        }

        try {
            const start = Date.now();
            await this.client.ping();
            const latency = Date.now() - start;

            return {
                status: 'connected',
                latency,
                provider: process.env.REDIS_URL?.includes('upstash.io') ? 'upstash' : 'other',
                circuitBreaker: this.circuitBreaker.getState(),
                metrics: this.operationMetrics,
                memory: await this.getMemoryInfo()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                latency: null,
                provider: process.env.REDIS_URL?.includes('upstash.io') ? 'upstash' : 'other',
                circuitBreaker: this.circuitBreaker.getState(),
                metrics: this.operationMetrics
            };
        }
    }

    async getMemoryInfo() {
        try {
            const info = await this.client.info('memory');
            const memoryLines = info.split('\r\n');
            const memoryData = {};

            memoryLines.forEach(line => {
                if (line.includes('used_memory_human')) {
                    memoryData.used = line.split(':')[1];
                }
                if (line.includes('maxmemory_human')) {
                    memoryData.max = line.split(':')[1];
                }
            });

            return memoryData;
        } catch (error) {
            return null;
        }
    }

    // 🆕 Método simplificado para operaciones múltiples
    async executeSimple(operations) {
        return this.executeWithCircuitBreaker(async () => {
            if (!this.isConnected) {
                throw new Error('Redis no disponible');
            }

            const results = [];
            for (const op of operations) {
                let result;

                switch (op.type) {
                    case 'set':
                        if (op.expiry) {
                            result = await this.set(op.key, op.value, op.expiry);
                        } else {
                            result = await this.set(op.key, op.value);
                        }
                        break;

                    case 'delete':
                        result = await this.delete(op.key);
                        break;

                    case 'get':
                        result = await this.get(op.key);
                        break;

                    default:
                        throw new Error(`Operación no soportada: ${op.type}`);
                }

                results.push(result);
            }

            return results;
        }, 'simple_operations');
    }


    async get(key) {
        if (!this.isConnected) {
            if (!this.isInitializing) {
                console.log('🔄 Redis: Intentando reconectar para operación GET...');
                await this.initializeClient();
            }

            if (!this.isConnected) {
                return null;
            }
        }

        const memoryData = this.memoryCache.get(key);
        if (memoryData && memoryData.expiry > Date.now()) {
            return memoryData.value;
        }

        try {
            const value = await this.executeWithCircuitBreaker(async () => {
                return await Promise.race([
                    this.client.get(key),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('GET timeout')), 8000)
                    )
                ]);
            }, 'get_operation');

            if (!value) return null;

            let parsedValue;

            if (typeof value === 'string' &&
                (value.startsWith('ey') || key.includes('token') || key.includes('Token'))) {
                parsedValue = value;

                if (key.includes('current_token') && process.env.NODE_ENV === 'development') {
                    console.log(`📖 Token recuperado: ${key.substring(0, 30)}...`);
                }
            } else {
                try {
                    parsedValue = JSON.parse(value);
                } catch (parseError) {
                    console.warn(`⚠️ Error parsing Redis value for key ${key.substring(0, 50)}..., usando valor raw`);
                    parsedValue = value;
                }
            }

            this.memoryCache.set(key, {
                value: parsedValue,
                expiry: Date.now() + this.memoryCacheTTL
            });

            return parsedValue;

        } catch (error) {
            console.error(`❌ Redis GET error for key ${key.substring(0, 50)}...:`, error.message);

            const memoryData = this.memoryCache.get(key);
            if (memoryData) {
                console.log(`📦 Usando caché de memoria para ${key.substring(0, 30)}...`);
                return memoryData.value;
            }

            return null;
        }
    }

    async set(key, value, expireTime = 3600, skipStringify = false) {
        if (!this.isConnected) {
            if (!this.isInitializing) {
                console.log('🔄 Redis: Intentando reconectar para operación SET...');
                await this.initializeClient();
            }

            if (!this.isConnected) {
                this.memoryCache.set(key, {
                    value: value,
                    expiry: Date.now() + (expireTime * 1000)
                });
                return false;
            }
        }

        try {
            const isToken = skipStringify ||
                (typeof value === 'string' &&
                    (value.startsWith('ey') || key.includes('token') || key.includes('Token')));

            const valueToStore = isToken ? value : JSON.stringify(value);

            if (key.includes('current_token') && process.env.NODE_ENV === 'development') {
                console.log(`💾 Guardando token: ${key.substring(0, 30)}... | Es JWT: ${isToken}`);
            }

            await this.executeWithCircuitBreaker(async () => {
                return await Promise.race([
                    this.client.set(key, valueToStore, 'EX', expireTime),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('SET timeout')), 8000)
                    )
                ]);
            }, 'set_operation');

            this.memoryCache.set(key, {
                value: value,
                expiry: Date.now() + (expireTime * 1000)
            });

            return true;

        } catch (error) {
            console.error(`❌ Redis SET error for key ${key.substring(0, 50)}...:`, error.message);

            this.memoryCache.set(key, {
                value: value,
                expiry: Date.now() + (expireTime * 1000)
            });

            return false;
        }
    }

    async deleteByPattern(pattern) {
        if (!this.isConnected) {
            console.log(`🔴 Redis no disponible, ignorando eliminación por patrón: ${pattern}`);
            return 0;
        }

        try {
            return await this.executeWithCircuitBreaker(async () => {
                let cursor = '0';
                let deletedCount = 0;
                const maxIterations = 1000;
                let iterations = 0;

                do {
                    iterations++;
                    if (iterations > maxIterations) {
                        console.warn(`⚠️ SCAN pattern ${pattern}: Máximo de iteraciones alcanzado`);
                        break;
                    }

                    const [nextCursor, keys] = await Promise.race([
                        this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('SCAN timeout')), 15000)
                        )
                    ]);

                    cursor = nextCursor;

                    if (keys && keys.length > 0) {
                        await Promise.race([
                            this.client.del(...keys),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('DELETE timeout')), 8000)
                            )
                        ]);

                        deletedCount += keys.length;

                        if (keys.length > 10) {
                            console.log(`🗑️ Eliminadas ${keys.length} claves, total: ${deletedCount}`);
                        }
                    }

                } while (cursor !== '0');

                if (deletedCount > 0) {
                    console.log(`✅ Eliminación completa: ${deletedCount} claves para patrón: ${pattern}`);
                }

                return deletedCount;
            }, 'delete_by_pattern');

        } catch (error) {
            if (pattern.includes('token') || pattern.includes('Token')) {
                logSecurityEvent('TOKEN_DELETE_ERROR', 'Error en eliminación masiva de tokens', {
                    pattern: pattern,
                    error: error.message
                }, 'high');
            }

            console.error(`❌ Error eliminando claves por patrón ${pattern}:`, error.message);
            return 0;
        }
    }

    async delete(key) {
        if (!this.isConnected) {
            this.memoryCache.delete(key);
            return false;
        }

        try {
            await this.executeWithCircuitBreaker(async () => {
                return await Promise.race([
                    this.client.del(key),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('DELETE timeout')), 5000)
                    )
                ]);
            }, 'delete_operation');

            this.memoryCache.delete(key);
            return true;

        } catch (error) {
            console.error(`❌ Redis DELETE error for key ${key.substring(0, 50)}...:`, error.message);
            this.memoryCache.delete(key);
            return false;
        }
    }

    async clear() {
        if (!this.isConnected) {
            this.memoryCache.clear();
            return false;
        }

        try {
            await this.executeWithCircuitBreaker(async () => {
                return await this.client.flushall();
            }, 'clear_operation');

            this.memoryCache.clear();
            return true;
        } catch (error) {
            console.error('❌ Error clearing Redis cache:', error.message);
            this.memoryCache.clear();
            return false;
        }
    }

    handleNoRedis() {
        console.log('🟡 Redis: Operando en modo fallback (solo memoria)');
        this.isConnected = false;

        this.memoryCache = new Map();

        if (!this.memoryCleanupInterval) {
            this.memoryCleanupInterval = setInterval(() => {
                const now = Date.now();
                let cleanedCount = 0;

                for (const [key, data] of this.memoryCache) {
                    if (data.expiry && data.expiry < now) {
                        this.memoryCache.delete(key);
                        cleanedCount++;
                    }
                }

                if (cleanedCount > 0) {
                    console.log(`🧹 Limpieza de memoria: ${cleanedCount} entradas expiradas`);
                }
            }, 60000);
        }

        console.log(`📊 Caché en memoria: ${this.memoryCache.size} entradas`);
    }

    isReady() {
        return this.isConnected && this.circuitBreaker.state !== 'OPEN';
    }

    getStats() {
        return {
            connected: this.isConnected,
            circuitBreakerState: this.circuitBreaker.getState(),
            memoryCache: {
                size: this.memoryCache.size,
                sizeBytes: JSON.stringify([...this.memoryCache]).length
            },
            metrics: this.operationMetrics,
            retryCount: this.retryCount,
            provider: process.env.REDIS_URL?.includes('upstash.io') ? 'upstash' : 'other',
            host: process.env.REDIS_HOST || 'via REDIS_URL',
            port: process.env.REDIS_PORT || 'via REDIS_URL'
        };
    }

    // 🆕 Método para resetear métricas
    resetMetrics() {
        this.operationMetrics = {
            totalOperations: 0,
            failedOperations: 0,
            circuitBreakerTrips: 0,
            lastResetTime: Date.now()
        };
    }

    // ======== MÉTODOS PDF CACHE ========

    async invalidatePdfCache(pdfId) {
        if (!this.isConnected) {
            console.log(`🔴 Cache no disponible, ignorando invalidación para PDF ${pdfId}`);
            return false;
        }

        try {
            const patterns = [
                `pdf:${pdfId}*`,
                `pdf_extract:*:*:*:${pdfId}:*`,
            ];

            let totalDeleted = 0;
            for (const pattern of patterns) {
                const deleted = await this.deleteByPattern(pattern);
                totalDeleted += deleted;
            }

            console.log(`🗑️ Invalidación completa PDF ${pdfId}: ${totalDeleted} claves`);
            return true;
        } catch (error) {
            console.error(`❌ Error invalidando caché completo para PDF ${pdfId}:`, error.message);
            return false;
        }
    }

    async getRegionCache(pdfId, page, x1, y1, x2, y2) {
        const key = `pdf:${pdfId}:region:${page}:${x1}:${y1}:${x2}:${y2}`;
        return await this.get(key);
    }

    async setRegionCache(pdfId, page, x1, y1, x2, y2, data) {
        const key = `pdf:${pdfId}:region:${page}:${x1}:${y1}:${x2}:${y2}`;
        return await this.set(key, data, 3600);
    }

    async deleteRegionCache(pdfId, page, x1, y1, x2, y2) {
        const key = `pdf:${pdfId}:region:${page}:${x1}:${y1}:${x2}:${y2}`;
        return await this.delete(key);
    }

    async deletePageCache(pdfId, page) {
        if (!this.isConnected) return false;
        const pattern = `pdf:${pdfId}:page:${page}:*`;

        try {
            const deleted = await this.deleteByPattern(pattern);
            if (deleted > 0) {
                console.log(`🗑️ Eliminadas ${deleted} claves de caché para página ${page}`);
            }
            return true;
        } catch (error) {
            console.error(`❌ Error eliminando caché de página ${page}:`, error.message);
            return false;
        }
    }

    async getReadyPages(pdfId) {
        if (!this.isConnected) return [];

        const key = `pdf:${pdfId}:ready_pages`;
        try {
            const cached = await this.get(key);
            return Array.isArray(cached) ? cached : [];
        } catch (error) {
            console.warn(`⚠️ Error obteniendo páginas listas de caché: ${error.message}`);
            return [];
        }
    }

    async addReadyPage(pdfId, pageNumber) {
        if (!this.isConnected) return [];

        try {
            const key = `pdf:${pdfId}:ready_pages`;
            const readyPages = await this.getReadyPages(pdfId);

            if (!readyPages.includes(pageNumber)) {
                readyPages.push(pageNumber);
                readyPages.sort((a, b) => a - b);
                await this.set(key, readyPages, 7200);
                console.log(`✅ Página ${pageNumber} añadida a caché para PDF ${pdfId}`);
            }

            return readyPages;
        } catch (error) {
            console.warn(`⚠️ Error añadiendo página a caché: ${error.message}`);
            return [];
        }
    }

    // ======== MÉTODOS DE EXTRACCIÓN ========

    _generateExtractionKey(operation, chatId, userId, pdfId, options = {}) {
        const normalizedOptions = {};
        Object.keys(options).sort().forEach(key => {
            if (options[key] !== undefined && options[key] !== null) {
                normalizedOptions[key] = options[key];
            }
        });

        const optionsHash = Object.keys(normalizedOptions).length > 0
            ? btoa(JSON.stringify(normalizedOptions)).slice(0, 12)
            : 'default';

        return `pdf_extract:${operation}:${chatId}:${userId}:${pdfId || 'any'}:${optionsHash}`;
    }

    async getTextExtractionCache(chatId, userId, pdfId, options = {}) {
        const key = this._generateExtractionKey('text', chatId, userId, pdfId, options);
        const cached = await this.get(key);

        if (cached) {
            console.log(`📦 Cache HIT (text): ${chatId}/${pdfId}`);
            return { ...cached, fromCache: true };
        }

        console.log(`🔄 Cache MISS (text): ${chatId}/${pdfId}`);
        return null;
    }

    async setTextExtractionCache(chatId, userId, pdfId, options, result, ttl = 3600) {
        const key = this._generateExtractionKey('text', chatId, userId, pdfId, options);
        const success = await this.set(key, result, ttl);

        if (success) {
            console.log(`💾 Cached text extraction: ${chatId}/${pdfId}`);
        }

        return success;
    }

    async getContentExtractionCache(chatId, userId, pdfId, options = {}) {
        const key = this._generateExtractionKey('content', chatId, userId, pdfId, options);
        const cached = await this.get(key);

        if (cached) {
            console.log(`📦 Cache HIT (content): ${chatId}/${pdfId}`);
            return { ...cached, fromCache: true };
        }

        console.log(`🔄 Cache MISS (content): ${chatId}/${pdfId}`);
        return null;
    }

    async setContentExtractionCache(chatId, userId, pdfId, options, result, ttl = 7200) {
        const key = this._generateExtractionKey('content', chatId, userId, pdfId, options);
        const success = await this.set(key, result, ttl);

        if (success) {
            console.log(`💾 Cached content extraction: ${chatId}/${pdfId}`);
        }

        return success;
    }

    async getRegionExtractionCache(chatId, userId, pdfId, page, x1, y1, x2, y2, scale = 1) {
        const options = { page, x1, y1, x2, y2, scale };
        const key = this._generateExtractionKey('region', chatId, userId, pdfId, options);
        const cached = await this.get(key);

        if (cached) {
            console.log(`📦 Cache HIT (region): ${chatId}/${pdfId}/page${page}`);
            return { ...cached, fromCache: true };
        }

        console.log(`🔄 Cache MISS (region): ${chatId}/${pdfId}/page${page}`);
        return null;
    }

    async setRegionExtractionCache(chatId, userId, pdfId, page, x1, y1, x2, y2, scale, data, ttl = 1800) {
        const options = { page, x1, y1, x2, y2, scale };
        const key = this._generateExtractionKey('region', chatId, userId, pdfId, options);
        const success = await this.set(key, data, ttl);

        if (success) {
            console.log(`💾 Cached region extraction: ${chatId}/${pdfId}/page${page}`);
        }

        return success;
    }

    async invalidateExtractionCache(chatId, userId = '*', pdfId = '*') {
        if (!this.isConnected) {
            console.log(`🔴 Cache no disponible, ignorando invalidación de extracciones para ${chatId}`);
            return 0;
        }

        try {
            const patterns = [
                `pdf_extract:text:${chatId}:${userId}:${pdfId}:*`,
                `pdf_extract:content:${chatId}:${userId}:${pdfId}:*`,
                `pdf_extract:region:${chatId}:${userId}:${pdfId}:*`
            ];

            let totalDeleted = 0;
            for (const pattern of patterns) {
                const deleted = await this.deleteByPattern(pattern);
                totalDeleted += deleted;
            }

            console.log(`🗑️ Invalidadas ${totalDeleted} claves de extracción para chatId=${chatId}`);
            return totalDeleted;
        } catch (error) {
            console.error(`❌ Error invalidando caché de extracciones:`, error.message);
            return 0;
        }
    }
}

export const redisService = new RedisService();