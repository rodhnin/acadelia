/**
 * event-bus.js - Sistema centralizado de eventos para la comunicación entre módulos
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    // Contador para IDs únicos de suscripciones
    this.idCounter = 0;
  }

  /**
   * Registra un callback para un evento específico
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar cuando se emita el evento
   * @returns {number} ID de la suscripción para cancelación
   */
  on(event, callback) {
    if (!event || typeof event !== 'string') {
      return -1; // ID inválido
    }
    
    if (typeof callback !== 'function') {
      return -1; // ID inválido
    }
    
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const id = ++this.idCounter;
    
    this.events.get(event).push({ id, callback });
    
    return id;
  }

  /**
   * Emite un evento con datos opcionales
   * @param {string} event - Nombre del evento a emitir
   * @param {*} data - Datos a pasar a los callbacks
   */
  emit(event, data) {
    if (!event || typeof event !== 'string' || !this.events.has(event)) {
      return;
    }
    
    const callbacks = [...this.events.get(event)];
    
    callbacks.forEach(({ callback }) => {
      try {
        callback(data);
      } catch (error) {
        // Evitar que un error en un callback interrumpa los demás
        // Producción: eliminar o reemplazar con un sistema de logs centralizado
      }
    });
  }
  
  /**
   * Elimina un listener específico por su ID
   * @param {number} id - ID de la suscripción a eliminar
   * @returns {boolean} True si se eliminó correctamente
   */
  off(id) {
    if (!id || id <= 0) {
      return false;
    }
    
    let removed = false;
    
    for (const [event, callbacks] of this.events.entries()) {
      const index = callbacks.findIndex(cb => cb.id === id);
      
      if (index !== -1) {
        callbacks.splice(index, 1);
        removed = true;
        
        // Si no quedan callbacks para este evento, eliminar el evento
        if (callbacks.length === 0) {
          this.events.delete(event);
        }
        
        break;
      }
    }
    
    return removed;
  }
  
  /**
   * Elimina todos los listeners para un evento específico
   * @param {string} event - Nombre del evento
   * @returns {boolean} True si se encontró y eliminó el evento
   */
  offEvent(event) {
    if (!event || typeof event !== 'string') {
      return false;
    }
    
    return this.events.delete(event);
  }
  
  /**
   * Registra un callback que se ejecutará solo una vez
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar cuando se emita el evento
   * @returns {number} ID de la suscripción
   */
  once(event, callback) {
    if (!event || typeof event !== 'string' || typeof callback !== 'function') {
      return -1;
    }
    
    const wrappedCallback = (data) => {
      this.off(id);
      callback(data);
    };
    
    const id = this.on(event, wrappedCallback);
    return id;
  }
}

export const eventBus = new EventBus();

export default eventBus;