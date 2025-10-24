// backend/services/usuarios/scheduledUsersTasksService.js
import pool from "../../lib/dbPool.js";
import { TermsService } from "./termsService.js";

export class ScheduledUsersTasksService {
    /**
     * Ejecuta las tareas programadas pendientes
     * @returns {Promise<Object>} - Resultados de la ejecución
     */
    static async executeScheduledUsersTasks() {
        try {
            // 1. Obtener tareas pendientes que ya deban ejecutarse
            const tasksQuery = `
                SELECT id, task_type, payload
                FROM scheduled_tasks
                WHERE status = 'pending' AND execute_at <= NOW()
            `;
            
            const { rows } = await pool.query(tasksQuery);
            
            // 2. Si no hay tareas, terminar
            if (rows.length === 0) {
                return {
                    success: true,
                    tasksExecuted: 0,
                    message: "No hay tareas pendientes"
                };
            }
            
            // 3. Ejecutar cada tarea
            let executed = 0;
            let failed = 0;
            
            for (const task of rows) {
                try {
                    let result;
                    
                    // Ejecutar según el tipo de tarea
                    if (task.task_type === 'auto_terms_acceptance') {
                        const payload = JSON.parse(task.payload);
                        result = await TermsService.executeAutoAcceptance(payload.termsVersion);
                    }
                    // Aquí pueden agregarse más tipos de tareas en el futuro
                    
                    // Marcar como completada
                    await pool.query(
                        `UPDATE scheduled_tasks 
                         SET status = 'completed', 
                             executed_at = NOW(),
                             result = $1 
                         WHERE id = $2`,
                        [JSON.stringify(result), task.id]
                    );
                    
                    executed++;
                } catch (error) {
                    console.error(`Error ejecutando tarea ${task.id}:`, error);
                    
                    // Marcar como fallida
                    await pool.query(
                        `UPDATE scheduled_tasks 
                         SET status = 'failed', 
                             executed_at = NOW(),
                             result = $1 
                         WHERE id = $2`,
                        [JSON.stringify({ error: error.message }), task.id]
                    );
                    
                    failed++;
                }
            }
            
            return {
                success: true,
                tasksExecuted: executed,
                tasksFailed: failed,
                totalTasks: rows.length
            };
        } catch (error) {
            console.error('Error ejecutando tareas programadas:', error);
            throw error;
        }
    }
}

export default ScheduledUsersTasksService;