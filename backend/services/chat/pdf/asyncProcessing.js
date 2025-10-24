// src/services/chat/pdf/asyncProcessing.js

/**
 * Sistema de procesamiento asíncrono para la extracción de PDF.
 * Implementa cola de procesamiento y gestión de recursos.
 */

class AsyncProcessingQueue {
  constructor(options = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent || 4,
      timeout: options.timeout || 10000, // 10 segundos por tarea
      defaultPriority: options.defaultPriority || 1,
      ...options
    };

    // Cola de tareas pendientes, ordenadas por prioridad
    this.queue = [];

    // Tareas actualmente en ejecución
    this.running = new Map();

    // Contadores y métricas
    this.metrics = {
      completed: 0,
      failed: 0,
      timeout: 0,
      totalProcessingTime: 0,
      maxCpuUsage: 0,
      maxMemoryUsage: 0
    };

    // Iniciar procesamiento
    this._processQueue();
  }

  /**
   * Añade una tarea a la cola de procesamiento
   * @param {Function} task - Función asíncrona a ejecutar
   * @param {Object} options - Opciones para la tarea
   * @returns {Promise} - Promesa que se resuelve cuando la tarea finaliza
   */
  async enqueue(task, options = {}) {
    const taskId = Date.now() + Math.random().toString(36).substring(7);
    const priority = options.priority || this.options.defaultPriority;

    // Crear promesa que se resolverá cuando la tarea se complete
    const promise = new Promise((resolve, reject) => {
      // Añadir tarea a la cola con su prioridad
      this.queue.push({
        id: taskId,
        task,
        options,
        priority,
        resolve,
        reject,
        enqueueTime: Date.now(),
        attempts: 0,
        maxAttempts: options.maxAttempts || 3
      });
    });

    // ⭐ Priorización mejorada
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      // full_pdf > first_page > batch > unknown
      const typeOrder = { 'full_pdf': 4, 'first_page': 3, 'batch': 2, 'unknown': 1 };
      const orderA = typeOrder[a.pageType] || 1;
      const orderB = typeOrder[b.pageType] || 1;

      return orderB - orderA;
    });

    this._processQueue();

    return promise;
  }

  /**
   * Cancela una tarea específica
   * @param {string} taskId - ID de la tarea a cancelar
   * @returns {boolean} - true si se canceló exitosamente
   */
  cancel(taskId) {
    // Buscar en la cola pendiente
    const index = this.queue.findIndex(item => item.id === taskId);
    if (index >= 0) {
      const task = this.queue[index];
      this.queue.splice(index, 1);
      task.reject(new Error('Task cancelled'));
      return true;
    }

    // Buscar en tareas en ejecución
    if (this.running.has(taskId)) {
      const runningTask = this.running.get(taskId);
      // Cancelar timeout y rechazar promesa
      clearTimeout(runningTask.timeoutId);
      runningTask.reject(new Error('Task cancelled'));
      this.running.delete(taskId);
      return true;
    }

    return false;
  }

  /**
   * Cancela todas las tareas relacionadas con un chatId específico de manera robusta
   * @param {string} chatId - ID del chat
   * @returns {Promise<Object>} - Resultado de la cancelación
   */
  async cancelTasksForChat(chatId) {
    console.log(`🔄 Iniciando cancelación robusta de tareas para chatId=${chatId}`);
    let cancelCount = 0;
    let runningTaskIds = [];

    // MEJORA 1: Verificar si el chatId es válido
    if (!chatId || typeof chatId !== 'string') {
      console.error(`❌ chatId inválido para cancelación: ${chatId}`);
      return { success: false, cancelled: 0, error: 'chatId inválido' };
    }

    // MEJORA 2: Lista de criterios de coincidencia para mayor efectividad
    // Esto ayuda a manejar diferentes formatos o lugares donde puede estar el chatId
    const matchPatterns = [
      chatId,                    // Coincidencia exacta
      chatId.substring(0, 8),    // Primeros 8 caracteres (común en UUIDs)
      `${chatId}_`               // chatId seguido de guión bajo (formato común)
    ];

    // Función de ayuda para verificar si una tarea coincide con los patrones
    const taskMatches = (task) => {
      if (!task || !task.options) return false;

      // Revisar en pdfId y otros campos comunes
      const fieldsToCheck = [
        task.options.pdfId,
        task.options.chatId,
        task.options.id,
        JSON.stringify(task.options)  // Búsqueda en la serialización completa
      ];

      for (const field of fieldsToCheck) {
        if (!field) continue;

        for (const pattern of matchPatterns) {
          if (field.includes(pattern)) {
            return true;
          }
        }
      }

      return false;
    };

    // MEJORA 3: Cancelar primero tareas en ejecución, ya que son más críticas
    console.log(`🔍 Buscando tareas en ejecución para ${chatId}`);
    for (const [taskId, runningTask] of this.running.entries()) {
      if (taskMatches(runningTask)) {
        // Limpiar timeout
        if (runningTask.timeoutId) {
          clearTimeout(runningTask.timeoutId);
        }

        // Rechazar la promesa con mensaje específico de cancelación
        try {
          if (typeof runningTask.reject === 'function') {
            runningTask.reject(new Error(`Task cancelled by user for chatId=${chatId}`));
          }
        } catch (rejectError) {
          console.warn(`⚠️ Error al rechazar promesa para tarea ${taskId}: ${rejectError.message}`);
        }

        // Registrar para eliminación posterior
        runningTaskIds.push(taskId);
        cancelCount++;
        console.log(`✅ Tarea en ejecución ${taskId} marcada para cancelación`);
      }
    }

    // Eliminar las tareas en ejecución (en un segundo paso para evitar problemas de iteración)
    for (const taskId of runningTaskIds) {
      this.running.delete(taskId);
      console.log(`🗑️ Tarea en ejecución ${taskId} eliminada`);
    }

    // MEJORA 4: Cancelar tareas pendientes con mayor rigurosidad
    console.log(`🔍 Buscando tareas pendientes para ${chatId} en cola de ${this.queue.length} tareas`);
    // Hacemos una copia para evitar problemas al modificar mientras iteramos
    const queueCopy = [...this.queue];
    let pendingTasksCancelled = 0;

    for (let i = 0; i < queueCopy.length; i++) {
      const task = queueCopy[i];

      if (taskMatches(task)) {
        // Buscar el índice actual en la cola original (puede haber cambiado)
        const currentIndex = this.queue.findIndex(t => t.id === task.id);

        if (currentIndex >= 0) {
          // Eliminar de la cola
          this.queue.splice(currentIndex, 1);

          // Rechazar la promesa con mensaje específico
          try {
            if (typeof task.reject === 'function') {
              task.reject(new Error(`Task cancelled by user for chatId=${chatId}`));
            }
          } catch (rejectError) {
            console.warn(`⚠️ Error al rechazar promesa para tarea ${task.id}: ${rejectError.message}`);
          }

          pendingTasksCancelled++;
          cancelCount++;
          console.log(`✅ Tarea pendiente ${task.id} cancelada`);
        }
      }
    }

    // MEJORA 5: Verificación final para asegurarnos que no queden tareas residuales
    let remainingMatches = this.queue.filter(taskMatches).length;
    if (remainingMatches > 0) {
      console.warn(`⚠️ Quedan ${remainingMatches} tareas residuales que coinciden con ${chatId}. Segundo intento...`);

      // Filtrar la cola para mantener solo las tareas que NO coinciden
      this.queue = this.queue.filter(task => !taskMatches(task));

      const additionalCancelled = remainingMatches;
      cancelCount += additionalCancelled;
      console.log(`✅ Eliminadas ${additionalCancelled} tareas residuales`);
    }

    // MEJORA 6: Comprobar que realmente no quedan tareas
    remainingMatches = this.queue.filter(taskMatches).length +
      Array.from(this.running.values()).filter(taskMatches).length;

    console.log(`✅ Cancelación completada: ${cancelCount} tareas (${pendingTasksCancelled} pendientes, ${cancelCount - pendingTasksCancelled} en ejecución)`);
    console.log(`ℹ️ Quedan ${remainingMatches} tareas que coinciden con ${chatId}`);

    // MEJORA 7: Reclamar recursos del sistema para asegurar que no queden procesos
    if (global.gc && typeof global.gc === 'function') {
      try {
        global.gc();
        console.log(`🧹 Garbage collector ejecutado para liberar recursos`);
      } catch (gcError) {
        console.warn(`⚠️ Error al ejecutar garbage collector: ${gcError.message}`);
      }
    }

    return {
      success: true,
      cancelled: cancelCount,
      pending: pendingTasksCancelled,
      running: cancelCount - pendingTasksCancelled,
      remaining: remainingMatches
    };
  }

  /**
   * Procesa la cola de tareas asincrónicas
   * @private
   */
  async _processQueue() {
    // Si no hay tareas pendientes o ya estamos al máximo de concurrencia, no hacer nada
    if (this.queue.length === 0 || this.running.size >= this.options.maxConcurrent) {
      return;
    }

    // Obtener la próxima tarea (mayor prioridad)
    const taskItem = this.queue.shift();
    const { id, task, options, resolve, reject, enqueueTime } = taskItem;

    // Crear timeout para la tarea
    const timeoutMs = options.timeout || this.options.timeout;
    const timeoutId = setTimeout(() => {
      // Si la tarea no ha completado en el tiempo límite
      this.running.delete(id);
      this.metrics.timeout++;

      // Si hay más intentos disponibles, volver a encolar con menor prioridad
      if (taskItem.attempts < taskItem.maxAttempts) {
        taskItem.attempts++;
        taskItem.priority = Math.max(0, taskItem.priority - 1); // Reducir prioridad
        this.queue.push(taskItem);
        this.queue.sort((a, b) => b.priority - a.priority);
      } else {
        // Rechazar definitivamente si excedió los intentos
        reject(new Error(`Task timeout after ${timeoutMs}ms and ${taskItem.maxAttempts} attempts`));
      }

      // Continuar procesando la cola
      this._processQueue();
    }, timeoutMs);

    // Registrar tarea en ejecución
    this.running.set(id, {
      startTime: Date.now(),
      timeoutId,
      options,
      reject
    });

    // Ejecutar la tarea
    try {
      const startTime = Date.now();
      const waitTime = startTime - enqueueTime;

      // Ejecutar la tarea real
      const result = await task();

      // Limpiar y registrar éxito
      clearTimeout(timeoutId);
      this.running.delete(id);

      // Actualizar métricas
      const processingTime = Date.now() - startTime;
      this.metrics.completed++;
      this.metrics.totalProcessingTime += processingTime;

      // Resolver la promesa con resultado y metadatos
      resolve({
        result,
        metadata: {
          processingTime,
          waitTime,
          priority: taskItem.priority,
          attempts: taskItem.attempts + 1
        }
      });
    } catch (error) {
      // Limpiar y registrar error
      clearTimeout(timeoutId);
      this.running.delete(id);
      this.metrics.failed++;

      // Rechazar la promesa con el error
      reject(error);
    } finally {
      // Continuar procesando la cola
      this._processQueue();
    }
  }

  /**
   * Obtiene las métricas actuales del procesamiento
   * @returns {Object} - Objeto con métricas
   */
  getMetrics() {
    const totalTasks = this.metrics.completed + this.metrics.failed;
    const averageProcessingTime = totalTasks > 0
      ? this.metrics.totalProcessingTime / totalTasks
      : 0;

    return {
      ...this.metrics,
      queueLength: this.queue.length,
      runningTasks: this.running.size,
      averageProcessingTime
    };
  }

  /**
   * Ajusta dinámicamente el número máximo de tareas concurrentes
   * @param {number} newMax - Nuevo valor máximo
   */
  setMaxConcurrent(newMax) {
    if (newMax >= 1) {
      this.options.maxConcurrent = newMax;
      // Intentar procesar más tareas si se aumentó el límite
      this._processQueue();
    }
  }
}

// Instancia global para uso en toda la aplicación
const pdfProcessingQueue = new AsyncProcessingQueue({
  maxConcurrent: parseInt(process.env.PDF_MAX_CONCURRENT || '4'),
  timeout: parseInt(process.env.PDF_PROCESSING_TIMEOUT || '30000'), // 30 segundos
  defaultPriority: 1
});

export default pdfProcessingQueue;