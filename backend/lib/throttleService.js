// backend/lib/throttleService.js
import { getQueue } from './queueService.js';

// Configuración de concurrencia por tipo de operación
const concurrencyLimits = {
  openai: 10,      // 10 consultas simultaneas a OpenAI
  pdf: 3,          // 3 procesamientos de PDF simultaneos 
  audio: 5,        // 5 transcripciones de audio simultaneas
  youtube: 2       // 2 procesamientos de YouTube simultaneos
};

// Contadores para trabajos activos (se reinician en cada reinicio del servidor)
const activeCounts = {
  openai: 0,
  pdf: 0,
  audio: 0,
  youtube: 0
};

// Contadores para trabajos en espera (se reinician en cada reinicio)
const waitingCounts = {
  openai: 0,
  pdf: 0,
  audio: 0,
  youtube: 0
};

// Contadores históricos para estadísticas (se reinician en cada reinicio)
const statsCounts = {
  openai: { completed: 0, failed: 0 },
  pdf: { completed: 0, failed: 0 },
  audio: { completed: 0, failed: 0 },
  youtube: { completed: 0, failed: 0 }
};

// Registrar último ID para seguimiento de trabajos
let lastJobId = 0;

// Mapa de trabajos activos para seguimiento detallado
const activeJobs = new Map();

// Colas de espera por tipo
const waitingQueues = {
  openai: [],
  pdf: [],
  audio: [],
  youtube: []
};

// Un único identificador para estadísticas (evita crear múltiples trabajos)
const statsJobIds = {
  openai: null,
  pdf: null,
  audio: null,
  youtube: null
};

// Actualizar estadísticas en colas - pero SOLO cuando realmente hay cambios
let lastUpdateTime = 0;
let throttleUpdates = false;

/**
 * Actualiza estadísticas en la cola solo si hay cambios o ha pasado tiempo suficiente
 * @param {boolean} force - Forzar actualización incluso si no hay cambios
 */
async function updateQueueStats(force = false) {
  // Limitar frecuencia de actualizaciones (máximo cada 10 segundos)
  const now = Date.now();
  if (!force && throttleUpdates && (now - lastUpdateTime < 10000)) {
    return;
  }
  
  // Recordar último tiempo de actualización
  lastUpdateTime = now;
  throttleUpdates = true;
  
  // Actualizar cada tipo de cola
  for (const type of ['openai', 'pdf', 'audio', 'youtube']) {
    try {
      const queue = getQueue(`throttle-${type}`);
      
      // La información que queremos registrar en la cola
      const statsData = {
        isMonitoringStat: true, // Marca para identificar
        activeCount: activeCounts[type],
        waitingCount: waitingCounts[type], // Incluir contador de espera
        waitingQueueSize: waitingQueues[type].length,
        completedCount: statsCounts[type].completed,
        failedCount: statsCounts[type].failed,
        timestamp: new Date().toISOString(),
        activeJobs: Array.from(activeJobs.entries())
          .filter(([id, job]) => job.type === type && job.status === 'active')
          .map(([id, job]) => ({ 
            id, 
            startTime: job.startTime,
            duration: Date.now() - job.startTime,
            metadata: job.metadata
          }))
      };
      
      // Actualizar trabajo existente en lugar de crear uno nuevo
      if (statsJobIds[type]) {
        const existingJob = await queue.getJob(statsJobIds[type]);
        if (existingJob) {
          await existingJob.updateData(statsData);
          continue; // No crear uno nuevo
        }
      }
      
      // Si no hay trabajo existente o no se pudo actualizar, crear uno nuevo
      const statJobId = `stats-${type}-monitor`;
      const job = await queue.add(statJobId, statsData, {
        jobId: statJobId, // Usar ID fijo para sobrescribir
        removeOnComplete: false, // No eliminar automáticamente
        removeOnFail: false
      });
      
      // Guardar referencia
      statsJobIds[type] = job.id;
    } catch (error) {
      console.error(`Error al actualizar estadísticas para ${type}:`, error);
    }
  }
  
  // Programar limpieza de trabajos antiguos ocasionalmente
  if (Math.random() < 0.1) { // ~10% de probabilidad
    for (const type of ['openai', 'pdf', 'audio', 'youtube']) {
      try {
        const queue = getQueue(`throttle-${type}`);
        await queue.clean(60000, 'completed');
        await queue.clean(60000, 'failed');
      } catch (error) {
        console.error(`Error al limpiar cola ${type}:`, error);
      }
    }
  }
}

// Inicializar estadísticas
updateQueueStats(true).catch(console.error);

// Programar actualización periódica con baja frecuencia
setInterval(() => {
  updateQueueStats().catch(console.error);
}, 10000); // Solo cada 10 segundos

/**
 * Procesa la cola de espera para un tipo específico
 * @param {string} type - Tipo de operación
 */
function processWaitingQueue(type) {
  const limit = concurrencyLimits[type];
  
  // Mientras haya espacio y trabajos en espera
  while (activeCounts[type] < limit && waitingQueues[type].length > 0) {
    const waitingJob = waitingQueues[type].shift(); // Tomar el primero de la cola
    
    // Actualizar contadores
    waitingCounts[type]--;
    activeCounts[type]++;
    
    // Actualizar estado del trabajo
    waitingJob.job.status = 'active';
    waitingJob.job.startTime = Date.now();
    
    console.log(`Trabajo ${waitingJob.id} movido de espera a activo para ${type}. Activos: ${activeCounts[type]}/${limit}, En espera: ${waitingCounts[type]}`);
    
    // Resolver la promesa para continuar la ejecución
    waitingJob.resolve(waitingJob.id);
  }
  
  // Actualizar estadísticas si hubo cambios
  updateQueueStats(true).catch(console.error);
}

// Revisar colas de espera periódicamente
setInterval(() => {
  for (const type of ['openai', 'pdf', 'audio', 'youtube']) {
    if (waitingQueues[type].length > 0) {
      processWaitingQueue(type);
    }
  }
}, 1000); // Cada segundo (más frecuente para minimizar esperas)

/**
 * Genera un ID único para un trabajo
 * @returns {string} - ID único
 */
function generateJobId() {
  lastJobId++;
  return `job-${Date.now()}-${lastJobId}`;
}

/**
 * Adquiere un semáforo para un tipo de operación
 * Si no hay disponibilidad, espera en la cola
 * @param {string} type - Tipo de operación (openai, pdf, audio, youtube)
 * @param {Object} metadata - Metadatos del trabajo
 * @param {boolean} waitIfFull - Si es true, espera en cola; si es false, rechaza inmediatamente
 * @param {number} maxWaitTime - Tiempo máximo de espera en ms (0 = sin límite)
 * @returns {Promise<string|null>} - ID del trabajo o null si no hay disponibilidad
 */
export async function acquireSemaphore(type, metadata = {}, waitIfFull = true, maxWaitTime = 30000) {
  const limit = concurrencyLimits[type] || 5;
  const jobId = generateJobId();
  
  // Si hay espacio disponible, adquirir inmediatamente
  if (activeCounts[type] < limit) {
    activeCounts[type]++;
    
    // Registrar trabajo activo con metadatos
    activeJobs.set(jobId, {
      type,
      startTime: Date.now(),
      metadata,
      status: 'active'
    });
    
    console.log(`Semáforo adquirido para ${type} (${jobId}). Activos: ${activeCounts[type]}/${limit}`);
    
    // Actualizar estadísticas cuando hay un nuevo trabajo
    updateQueueStats(true).catch(console.error);
    
    return jobId;
  }
  
  // Si no queremos esperar, rechazar inmediatamente
  if (!waitIfFull) {
    console.log(`Límite de concurrencia alcanzado para ${type}: ${activeCounts[type]}/${limit}`);
    return null;
  }
  
  // Si queremos esperar, agregar a la cola de espera
  return new Promise((resolve, reject) => {
    // Crear timeout si es necesario
    let timeoutId = null;
    if (maxWaitTime > 0) {
      timeoutId = setTimeout(() => {
        // Buscar y eliminar de la cola de espera
        const index = waitingQueues[type].findIndex(waiting => waiting.id === jobId);
        if (index !== -1) {
          waitingQueues[type].splice(index, 1);
          waitingCounts[type]--;
          console.log(`Timeout para trabajo ${jobId} en espera para ${type}. En espera: ${waitingCounts[type]}`);
          updateQueueStats(true).catch(console.error);
        }
        
        reject(new Error(`Tiempo de espera excedido (${maxWaitTime}ms)`));
      }, maxWaitTime);
    }
    
    // Registrar trabajo en espera
    const waitingJob = {
      id: jobId,
      job: {
        type,
        queuedAt: Date.now(),
        metadata,
        status: 'waiting'
      },
      resolve,
      reject,
      timeoutId
    };
    
    // Agregar a la cola
    waitingQueues[type].push(waitingJob);
    waitingCounts[type]++;
    
    // Registrar en el mapa de trabajos para seguimiento
    activeJobs.set(jobId, waitingJob.job);
    
    console.log(`Trabajo ${jobId} puesto en espera para ${type}. En espera: ${waitingCounts[type]}`);
    
    // Actualizar estadísticas
    updateQueueStats(true).catch(console.error);
    
    // Intentar procesar la cola inmediatamente (por si acaso)
    processWaitingQueue(type);
  });
}

/**
 * Libera un semáforo marcando el trabajo como completado
 * @param {string} jobId - ID del trabajo
 * @param {Object} result - Resultado del trabajo
 */
export function completeSemaphore(jobId, result = {}) {
  if (!activeJobs.has(jobId)) {
    console.warn(`Intento de completar trabajo inexistente: ${jobId}`);
    return false;
  }
  
  const job = activeJobs.get(jobId);
  const { type } = job;
  
  // Decrementar contador activo
  if (activeCounts[type] > 0) {
    activeCounts[type]--;
  }
  
  // Actualizar contadores de estadísticas
  statsCounts[type].completed++;
  
  // Actualizar estado del trabajo
  job.status = 'completed';
  job.endTime = Date.now();
  job.result = result;
  job.duration = job.endTime - job.startTime;
  
  console.log(`Trabajo ${jobId} completado para ${type}. Duración: ${job.duration}ms`);
  
  // NO crear nuevos jobs en la cola - solo actualizar estadísticas
  // Mantener historial de trabajos completados, pero limpiar periódicamente
  setTimeout(() => {
    activeJobs.delete(jobId);
  }, 60000); // Eliminar de historial después de 1 minuto
  
  // Procesar cola de espera para ver si podemos activar algún trabajo
  processWaitingQueue(type);
  
  // Actualizar estadísticas cuando se completa un trabajo
  updateQueueStats(true).catch(console.error);
  
  return true;
}

/**
 * Libera un semáforo marcando el trabajo como fallido
 * @param {string} jobId - ID del trabajo
 * @param {Error|string} error - Error que causó la falla
 */
export function failSemaphore(jobId, error = 'Error desconocido') {
  if (!activeJobs.has(jobId)) {
    console.warn(`Intento de fallar trabajo inexistente: ${jobId}`);
    return false;
  }
  
  const job = activeJobs.get(jobId);
  const { type } = job;
  
  // Decrementar contador activo
  if (activeCounts[type] > 0) {
    activeCounts[type]--;
  }
  
  // Actualizar contadores de estadísticas
  statsCounts[type].failed++;
  
  // Actualizar estado del trabajo
  job.status = 'failed';
  job.endTime = Date.now();
  job.error = error instanceof Error ? error.message : error;
  job.duration = job.endTime - job.startTime;
  
  console.log(`Trabajo ${jobId} fallido para ${type}. Error: ${job.error}`);
  
  // NO crear nuevos jobs en la cola - solo actualizar estadísticas
  // Mantener historial de trabajos fallidos, pero limpiar periódicamente
  setTimeout(() => {
    activeJobs.delete(jobId);
  }, 300000); // Eliminar de historial después de 5 minutos (más tiempo para revisar errores)
  
  // Procesar cola de espera para ver si podemos activar algún trabajo
  processWaitingQueue(type);
  
  // Actualizar estadísticas cuando falla un trabajo
  updateQueueStats(true).catch(console.error);
  
  return true;
}

/**
 * Obtiene estadísticas actuales de uso
 * @returns {Object} - Estadísticas de uso por tipo
 */
export function getStats() {
  const stats = {};
  
  for (const [type, count] of Object.entries(activeCounts)) {
    stats[`throttle-${type}`] = {
      active: count,
      waiting: waitingCounts[type], // Usar contadores de espera reales
      completed: statsCounts[type].completed,
      failed: statsCounts[type].failed,
      total: count + waitingCounts[type],
      // Trabajos activos detallados
      activeJobs: Array.from(activeJobs.entries())
        .filter(([id, job]) => job.type === type && job.status === 'active')
        .map(([id, job]) => ({
          id,
          startTime: job.startTime,
          duration: Date.now() - job.startTime,
          metadata: job.metadata
        })),
      // Trabajos en espera detallados
      waitingJobs: Array.from(activeJobs.entries())
        .filter(([id, job]) => job.type === type && job.status === 'waiting')
        .map(([id, job]) => ({
          id,
          queuedAt: job.queuedAt,
          waitingTime: Date.now() - job.queuedAt,
          metadata: job.metadata
        }))
    };
  }
  
  return stats;
}

/**
 * Obtiene historial de todos los trabajos (para depuración)
 * @returns {Array} - Lista de todos los trabajos
 */
export function getAllJobs() {
  return Array.from(activeJobs.entries()).map(([id, job]) => ({
    id,
    type: job.type,
    status: job.status,
    startTime: job.startTime,
    queuedAt: job.queuedAt,
    endTime: job.endTime,
    duration: job.endTime ? job.endTime - job.startTime : (job.status === 'active' ? Date.now() - job.startTime : 0),
    waitingTime: job.status === 'waiting' ? Date.now() - job.queuedAt : 0,
    metadata: job.metadata,
    result: job.result,
    error: job.error
  }));
}

/**
 * Limpia estadísticas para un tipo de cola
 * @param {string} type - Tipo de cola
 */
export function clearStats(type) {
  // Extraer "throttle-" del tipo si está presente
  const cleanType = type.replace('throttle-', '');
  
  if (statsCounts[cleanType]) {
    statsCounts[cleanType].completed = 0;
    statsCounts[cleanType].failed = 0;
    console.log(`Estadísticas limpiadas para ${cleanType}`);
    
    // Forzar actualización de estadísticas
    updateQueueStats(true).catch(console.error);
    
    return true;
  }
  
  return false;
}

// Exportar límites de concurrencia (para lectura)
export const limits = { ...concurrencyLimits };