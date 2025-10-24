// services/chat/embeddingAvaProcessingQueue.js
/**
 * Implementación simple de cola para procesamiento de PDFs
 */
class EmbeddingAvaProcessingQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentTask = null;
  }

  /**
   * Añade una tarea a la cola
   * @param {Function} task - Función a ejecutar
   * @param {Object} metadata - Metadatos de la tarea
   * @returns {Promise} - Promesa que se resolverá cuando se complete la tarea
   */
  async enqueue(task, metadata = {}) {
    return new Promise((resolve, reject) => {
      // Crear objeto de tarea
      const taskObject = {
        task,
        metadata,
        resolve,
        reject,
        added: Date.now()
      };
      
      // Añadir a la cola
      this.queue.push(taskObject);
      console.log(`Tarea añadida a la cola. Cola actual: ${this.queue.length} tareas`);
      
      // Iniciar procesamiento si no hay nada en ejecución
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Procesa las tareas en la cola
   */
  async processQueue() {
    // Si ya está procesando o no hay tareas, salir
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    // Marcar como procesando
    this.processing = true;
    
    try {
      // Obtener la siguiente tarea
      this.currentTask = this.queue.shift();
      const { task, metadata, resolve, reject } = this.currentTask;
      
      console.log(`Procesando tarea (${metadata.avaId || 'sin AVA'}, ${metadata.filename || 'sin archivo'})`);
      
      try {
        // Ejecutar la tarea
        const result = await task();
        
        // Resolver la promesa con el resultado
        resolve(result);
      } catch (error) {
        console.error('Error procesando tarea:', error);
        reject(error);
      }
    } finally {
      // Marcar como no procesando
      this.processing = false;
      this.currentTask = null;
      
      // Si hay más tareas, continuar procesando
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Obtiene el estado actual de la cola
   * @returns {Object} - Estado de la cola
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentTask: this.currentTask ? {
        metadata: this.currentTask.metadata,
        added: this.currentTask.added,
        elapsed: Date.now() - this.currentTask.added
      } : null,
      nextTasks: this.queue.slice(0, 5).map(task => ({
        metadata: task.metadata,
        added: task.added,
        waiting: Date.now() - task.added
      }))
    };
  }
}

// Crear instancia única
const embeddingAvaProcessingQueue = new EmbeddingAvaProcessingQueue();

export default embeddingAvaProcessingQueue;