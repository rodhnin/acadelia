
import schedule from 'node-schedule';
import { UserService } from "./userService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

class CleanupServiceUsers {
  constructor() {
    this.isInitialized = false;
    this.job = null;
  }

  /**
   * Inicializa el servicio de limpieza automática
   * @returns {Promise<boolean>} Resultado de la inicialización
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('Servicio de limpieza ya está inicializado');
        return true;
      }

      // Programar la tarea para ejecutarse todos los días a las 3:00 AM
      this.job = schedule.scheduleJob('0 3 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Ejecutando limpieza automática de usuarios no verificados...`);
        await this.runCleanup();
      });

      console.log('✅ Servicio de limpieza de usuarios no verificados inicializado');
      console.log(`📅 Próxima ejecución: ${this.job.nextInvocation()}`);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error al inicializar servicio de limpieza:', error);
      return false;
    }
  }

  /**
   * Ejecuta el proceso de limpieza
   * @returns {Promise<Array>} Lista de usuarios eliminados
   */
  async runCleanup() {
    try {
      const deletedUsers = await UserService.cleanupUnverifiedUsers();
      
      if (deletedUsers.length > 0) {
        logSecurityEvent('UNVERIFIED_USERS_CLEANUP', 'Eliminación automática de usuarios no verificados', {
          usersCount: deletedUsers.length,
          userIds: deletedUsers.map(user => user.id_user)
        }, 'medium');
        
        console.log(`✓ Se eliminaron ${deletedUsers.length} usuarios no verificados`);
        console.log("IDs eliminados:", deletedUsers.map(user => user.id_user).join(", "));
      } else {
        console.log("✓ No se encontraron usuarios no verificados para eliminar");
      }
      
      return deletedUsers;
    } catch (error) {
      console.error("❌ Error en limpieza automática:", error);
      
      logSecurityEvent('CLEANUP_ERROR', 'Error en limpieza automática de usuarios', {
        error: error.message
      }, 'high');
      
      return [];
    }
  }

  /**
   * Ejecuta la limpieza inmediatamente (para uso manual o API)
   * @returns {Promise<Array>} Lista de usuarios eliminados
   */
  async runManualCleanup() {
    console.log(`[${new Date().toISOString()}] Ejecutando limpieza manual de usuarios no verificados...`);
    return await this.runCleanup();
  }

  /**
   * Detiene el servicio de limpieza
   */
  stop() {
    if (this.job) {
      this.job.cancel();
      this.job = null;
      this.isInitialized = false;
      console.log('Servicio de limpieza detenido');
    }
  }
}

export const cleanupServiceUsers = new CleanupServiceUsers();