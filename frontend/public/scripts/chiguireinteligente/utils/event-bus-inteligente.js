/**
 * Sistema de eventos para comunicación entre módulos
 * Implementa el patrón pub/sub (publicar/suscribir)
 */
export class EventBus {
    constructor() {
      this.events = {};
    }
    
    /**
     * Suscribe un callback a un evento específico
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar cuando ocurra el evento
     * @returns {Function} Función para cancelar la suscripción
     */
    on(eventName, callback) {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }
      
      this.events[eventName].push(callback);
      
      return () => {
        this.off(eventName, callback);
      };
    }
    
    /**
     * Cancela la suscripción de un callback a un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a eliminar
     */
    off(eventName, callback) {
      // Si no hay callbacks para este evento, salir
      if (!this.events[eventName]) return;
      
      this.events[eventName] = this.events[eventName].filter(
        cb => cb !== callback
      );
      
      // Si no quedan callbacks, eliminar el array
      if (this.events[eventName].length === 0) {
        delete this.events[eventName];
      }
    }
    
    /**
     * Emite un evento con datos opcionales
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos a pasar a los callbacks
     */
    emit(eventName, data) {
      // Si no hay callbacks para este evento, salir
      if (!this.events[eventName]) return;
      
      Promise.all(
        this.events[eventName].map(callback => {
          return new Promise(resolve => {
            try {
              resolve(callback(data));
            } catch (error) {
              console.error(`Error al ejecutar callback para evento ${eventName}:`, error);
              resolve(null); // Resolver para que no bloquee otros callbacks
            }
          });
        })
      ).catch(error => {
        console.error(`Error general al procesar evento ${eventName}:`, error);
      });
    }
    
    /**
     * Suscribe un callback para ejecutarse una sola vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar una vez
     * @returns {Function} Función para cancelar la suscripción
     */
    once(eventName, callback) {
      const wrapper = (data) => {
        this.off(eventName, wrapper);
        callback(data);
      };
      
      return this.on(eventName, wrapper);
    }
    
    /**
     * Emite un evento y devuelve una promesa
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos a pasar a los callbacks
     * @param {number} timeout - Tiempo máximo de espera (ms)
     * @returns {Promise<any[]>} Promesa con array de resultados
     */
    async emitAsync(eventName, data, timeout = 5000) {
      // Si no hay callbacks para este evento, devolver array vacío
      if (!this.events[eventName]) return [];
      
      const promises = this.events[eventName].map(callback => {
        return new Promise((resolve, reject) => {
          try {
            resolve(callback(data));
          } catch (error) {
            reject(error);
          }
        });
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout de ${timeout}ms para evento ${eventName}`));
        }, timeout);
      });
      
      return Promise.race([
        Promise.all(promises),
        timeoutPromise
      ]);
    }
    
    /**
     * Elimina todos los listeners para un evento
     * @param {string} eventName - Nombre del evento (opcional)
     */
    clear(eventName) {
      if (eventName) {
        delete this.events[eventName];
      } else {
        this.events = {};
      }
    }
    
    /**
     * Obtiene los nombres de eventos registrados
     * @returns {string[]} Array con nombres de eventos
     */
    getEventNames() {
      return Object.keys(this.events);
    }
    
    /**
     * Obtiene el número de listeners para un evento
     * @param {string} eventName - Nombre del evento
     * @returns {number} Número de listeners
     */
    listenerCount(eventName) {
      return this.events[eventName]?.length || 0;
    }
  }