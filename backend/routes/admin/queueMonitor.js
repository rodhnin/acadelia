// backend/routes/admin/queueMonitor.js
import express from 'express';
import { getStats, clearStats } from '../../lib/throttleService.js';
import { getQueue } from '../../lib/queueService.js';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';

const router = express.Router();

// TODAS LAS RUTAS AHORA REQUIEREN AUTENTICACIÓN Y ROL DE ADMIN
// Esto protege la administración del sistema contra acceso no autorizado

// Ruta para obtener estadísticas de todas las colas
router.get('/stats', authenticateUser, isAdmin, async (req, res) => {
  try {
    // Obtener estadísticas de uso actual directamente del servicio
    const stats = getStats();
    
    // Obtener algunas estadísticas adicionales de las colas BullMQ
    for (const queueType of Object.keys(stats)) {
      try {
        const queue = getQueue(queueType);
        
        // Obtener conteos reales de la cola para complementar
        const [waiting, active] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount()
        ]);
        
        // Complementar las estadísticas 
        // Pero dar prioridad a los contadores en memoria
        stats[queueType].waiting = waiting || stats[queueType].waiting || 0;
        
        // Intentar obtener trabajos activos verdaderos (no de estadísticas)
        const activeJobs = await queue.getActive();
        
        // Filtrar trabajos que son solo para monitoreo
        const realActiveJobs = activeJobs.filter(job => {
          const data = job.data || {};
          return !data.isMonitoringStat && 
                 !data.isCompletionRecord && 
                 !data.isFailureRecord;
        });
        
        // Si hay discrepancia con los contadores en memoria, ajustar
        if (realActiveJobs.length > 0 && realActiveJobs.length !== stats[queueType].active) {
          console.log(`Ajustando contador activo para ${queueType}: ${stats[queueType].active} -> ${realActiveJobs.length}`);
          // Pero no sobrescribir, solo complementar
          if (stats[queueType].active === 0) {
            stats[queueType].active = realActiveJobs.length;
          }
        }
      } catch (error) {
        console.error(`Error al obtener estadísticas BullMQ para cola ${queueType}:`, error);
      }
    }
    
    res.json({
      success: true,
      timestamp: new Date(),
      stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de colas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// Ruta para limpiar trabajos fallidos y contadores
router.post('/clean/:queueType', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { queueType } = req.params;
    const validTypes = ['throttle-openai', 'throttle-pdf', 'throttle-audio', 'throttle-youtube'];
    
    if (!validTypes.includes(queueType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de cola no válido'
      });
    }
    
    // Limpiar estadísticas del servicio en memoria
    clearStats(queueType);
    
    // Limpiar trabajos fallidos en la cola BullMQ
    const queue = getQueue(queueType);
    
    // Obtener todos los trabajos fallidos y completados
    const [failedJobs, completedJobs] = await Promise.all([
      queue.getFailed(),
      queue.getCompleted()
    ]);
    
    // Eliminar trabajos fallidos
    for (const job of failedJobs) {
      // Solo eliminar si no es un trabajo de estadísticas
      const data = job.data || {};
      if (!data.isMonitoringStat) {
        await job.remove();
      }
    }
    
    // Eliminar trabajos completados (limpieza)
    const completedToRemove = completedJobs.slice(0, -10); // Dejar los últimos 10
    for (const job of completedToRemove) {
      // Solo eliminar si no es un trabajo de estadísticas
      const data = job.data || {};
      if (!data.isMonitoringStat) {
        await job.remove();
      }
    }
    
    res.json({
      success: true,
      message: `Cola ${queueType} limpiada correctamente`
    });
  } catch (error) {
    console.error('Error al limpiar cola:', error);
    res.status(500).json({
      success: false,
      error: 'Error al limpiar cola'
    });
  }
});

// Nueva ruta para obtener trabajos activos detallados de una cola
router.get('/active/:queueType', authenticateUser, isAdmin, async (req, res) => {
  try {
    const { queueType } = req.params;
    const stats = getStats();
    
    if (!stats[queueType]) {
      return res.status(404).json({
        success: false,
        error: `Cola ${queueType} no encontrada`
      });
    }
    
    // Obtener trabajos activos de la cola
    const queue = getQueue(queueType);
    const activeJobs = await queue.getActive();
    
    // Filtrar trabajos que son solo para estadísticas
    const realActiveJobs = activeJobs.filter(job => {
      const data = job.data || {};
      return !data.isMonitoringStat && 
             !data.isCompletionRecord && 
             !data.isFailureRecord;
    }).map(job => ({
      id: job.id,
      timestamp: job.timestamp,
      data: job.data
    }));
    
    res.json({
      success: true,
      activeJobs: realActiveJobs,
      monitorActiveJobs: stats[queueType].activeJobs || []
    });
  } catch (error) {
    console.error('Error al obtener trabajos activos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener trabajos activos'
    });
  }
});

export default router;