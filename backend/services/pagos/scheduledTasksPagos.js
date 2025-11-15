// services/pagos/scheduledTasks.js
import pool from "../../lib/dbPool.js";
import { reportsService } from "./reportsService.js";

/**
 * Inicializa las tareas programadas relacionadas con informes
 */
export async function initReportScheduledTasks() {
  try {
    console.log('Inicializando tareas programadas de informes...');
    
    const configResult = await pool.query(
      'SELECT value FROM config WHERE key = $1',
      ['automatic_reports']
    );
    
    // Si no hay configuración o está deshabilitada, salir
    if (configResult.rows.length === 0 || !configResult.rows[0].value.enabled) {
      console.log('No hay configuración de informes automáticos o está deshabilitada');
      return;
    }
    
    const config = configResult.rows[0].value;
    
    // Programar tarea
    if (config.enabled && config.cronExpression) {
      console.log(`Programando generación automática de informes: ${config.cronExpression}`);
      
      const job = reportsService.scheduleAutomaticReports({
        cronExpression: config.cronExpression,
        recipients: config.recipients || [],
        title: config.title || 'Informe Integral Mensual Automático',
        createdBy: config.updatedBy || null
      });
      
      console.log('Tarea de informes automáticos programada correctamente');
    }
  } catch (error) {
    console.error('Error al inicializar tareas programadas de informes:', error);
  }
}

export default {
  initReportScheduledTasks
};