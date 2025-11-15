import { Queue, Worker } from 'bullmq';

function getRedisConnection() {
  if (process.env.REDIS_URL) {
    const isUpstash = process.env.REDIS_URL.includes('upstash.io');
    
    if (isUpstash) {
      return {
        host: process.env.REDIS_URL.match(/@([^:/?]+)/)?.[1],
        port: parseInt(process.env.REDIS_URL.match(/:(\d+)(?:[/?]|$)/)?.[1]) || 6379,
        password: process.env.REDIS_URL.match(/redis[s]?:\/\/[^:]*:([^@]+)@/)?.[1],
        family: 6, // IPv6 para Fly.io
        connectTimeout: 10000,
        maxRetriesPerRequest: null
      };
    } else {
      return process.env.REDIS_URL;
    }
  } else {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      connectTimeout: 5000,
      maxRetriesPerRequest: null
    };
  }
}

const connection = getRedisConnection();

// Mapa de colas activas
const queues = new Map();
const workers = new Map();

/**
 * Obtiene o crea una cola
 * @param {string} name - Nombre de la cola
 * @returns {Queue} - Instancia de Cola
 */
export function getQueue(name) {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection }));
    console.log(`Cola ${name} creada`);
  }
  return queues.get(name);
}

/**
 * Crea un worker para una cola
 * @param {string} queueName - Nombre de la cola
 * @param {Function} processor - Función que procesa los trabajos
 * @param {number} concurrency - Número de trabajos simultáneos
 * @returns {Worker} - Instancia de Worker
 */
export function createWorker(queueName, processor, concurrency = 1) {
  if (!workers.has(queueName)) {
    const worker = new Worker(queueName, processor, { 
      connection,
      concurrency,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 }
    });
    
    worker.on('failed', (job, error) => {
      console.error(`Error en trabajo ${job?.id} de la cola ${queueName}:`, error);
    });
    
    workers.set(queueName, worker);
    console.log(`Worker para cola ${queueName} creado con concurrencia ${concurrency}`);
    return worker;
  }
  
  return workers.get(queueName);
}

/**
 * Cierra todas las conexiones
 */
export async function closeAllConnections() {
  for (const worker of workers.values()) {
    await worker.close();
  }
  
  for (const queue of queues.values()) {
    await queue.close();
  }
  
  console.log('Todas las conexiones han sido cerradas');
}

process.on('SIGINT', async () => {
  console.log('SIGINT recibido, cerrando conexiones...');
  await closeAllConnections();
  process.exit(0);
});