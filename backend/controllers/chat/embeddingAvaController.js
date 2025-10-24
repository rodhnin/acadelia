// controllers/chat/embeddingAvaController.js
import pdfEmbeddingAvaService from '../../services/chat/pdfEmbeddingAvaService.js';
import crypto from 'crypto';
import embeddingAvaProcessingQueue from '../../services/chat/embeddingAvaProcessingQueue.js';
import pool from '../../lib/dbPool.js';
import activityMenteLogService from '../../services/security/activityMenteLogService.js';

// Mapa para almacenar el estado de procesamiento
const processingStatus = new Map();

/**
 * Controlador para gestionar PDFs en tablas de embeddings de AVAs
 */
const embeddingAvaController = {
  /**
   * Sube y procesa un PDF para un AVA específico
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async uploadPDF(req, res) {
    try {
      // Verificar que se haya enviado un archivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No se ha enviado ningún archivo'
        });
      }
      
      // Obtener parámetros
      const avaId = parseInt(req.params.avaId);
      const userId = parseInt(req.body.userId || req.query.userId || req.user?.id_user);
      
      // Validar parámetros
      if (!avaId || isNaN(avaId)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA válido'
        });
      }
      
      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de usuario válido'
        });
      }
      
      // Verificar que el archivo sea un PDF
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          error: 'El archivo debe ser un PDF'
        });
      }
      
      // Verificar si el AVA tiene una tabla de embeddings
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return res.status(400).json({
          success: false,
          error: avaInfo.error
        });
      }
      
      // Generar un ID único para el procesamiento
      const processId = crypto.randomUUID();
      
      // Registrar el inicio del procesamiento
      processingStatus.set(processId, {
        avaId,
        userId,
        filename: req.file.originalname,
        startTime: Date.now(),
        status: 'pending',
        progress: 0,
        message: 'Procesamiento en cola'
      });
      
      // Responder inmediatamente con el ID de procesamiento
      res.status(202).json({
        success: true,
        message: 'PDF en cola de procesamiento',
        processId,
        status: 'pending',
        progress: 0,
        avaInfo: {
          id: avaInfo.avaId,
          name: avaInfo.avaName,
          embeddingTable: avaInfo.tableName
        }
      });

      // Registrar actividad
      try {
        // Obtener nombre de usuario mediante el servicio
        const userName = await activityMenteLogService.getUserName(userId);
        
        // Registrar actividad
        await activityMenteLogService.logActivity({
          action_type: "upload",
          entity_type: "embedding",
          entity_id: `${avaId}:${processId}`,
          entity_name: avaInfo.avaName,
          description: `Se ha subido el documento "${req.file.originalname}" para el AVA "${avaInfo.avaName}"`,
          id_usuario: userId,
          usuario_nombre: userName || "Administrador"
        });
      } catch (logError) {
        console.error('Error al registrar actividad:', logError);
        // No interrumpimos el flujo si falla el registro de actividad
      }
      
      // Procesar el PDF de forma asíncrona
      this.processPDFAsync(processId, req.file.buffer, avaId, userId, req.file.originalname);
      
    } catch (error) {
      console.error('Error al subir PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Error al procesar la solicitud',
        details: error.message
      });
    }
  },
  
  /**
   * Procesa un PDF de forma asíncrona
   * @param {string} processId - ID del proceso
   * @param {Buffer} fileBuffer - Buffer del archivo PDF
   * @param {number} avaId - ID del AVA
   * @param {number} userId - ID del usuario
   * @param {string} filename - Nombre original del archivo
   */
  async processPDFAsync(processId, fileBuffer, avaId, userId, filename) {
    try {
      // Actualizar estado a "en cola"
      this.updateProcessStatus(processId, 0, 'En cola de procesamiento', 'queued');
      
      // Función de callback para actualizar el progreso
      const progressCallback = (progress, message) => {
        this.updateProcessStatus(processId, progress, message);
      };
      
      // Encolar el procesamiento
      await embeddingAvaProcessingQueue.enqueue(
        async () => {
          // Actualizar estado a "procesando"
          this.updateProcessStatus(processId, 5, 'Iniciando procesamiento', 'processing');
          
          // Procesar el PDF
          const result = await pdfEmbeddingAvaService.processPDF({
            fileBuffer,
            avaId,
            userId,
            filename,
            progressCallback
          });
          
          // Actualizar estado según el resultado
          if (result.success) {
            this.updateProcessStatus(
              processId, 
              100, 
              `Procesamiento completado: ${result.pages} páginas procesadas`,
              'completed'
            );
            
            // Guardar el resultado
            const statusInfo = processingStatus.get(processId);
            if (statusInfo) {
              statusInfo.result = result;
              processingStatus.set(processId, statusInfo);
            }
          } else {
            this.updateProcessStatus(
              processId, 
              0, 
              `Error: ${result.error}`, 
              'error'
            );
          }
          
          return result;
        },
        { processId, avaId, userId, filename }
      );
      
    } catch (error) {
      console.error('Error en procesamiento asíncrono:', error);
      this.updateProcessStatus(
        processId, 
        0, 
        `Error en procesamiento: ${error.message}`, 
        'error'
      );
    }
  },

  /**
   * Elimina una página específica de un embedding
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async deleteEmbeddingPage(req, res) {
    try {
      const avaId = parseInt(req.params.avaId);
      const pageIdentifier = req.params.pageIdentifier;
      const userId = parseInt(req.body.userId || req.query.userId || req.user?.id_user);
      
      if (!avaId || isNaN(avaId)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA válido'
        });
      }
      
      if (!pageIdentifier) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un identificador de página válido'
        });
      }
      
      // Extraer el nombre de archivo y número de página del identificador
      const [filename, pagePart] = pageIdentifier.split('#page=');
      const pageNumber = parseInt(pagePart);
      
      if (!filename || isNaN(pageNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de identificador de página inválido'
        });
      }
      
      // Obtener información de la tabla
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return res.status(400).json({
          success: false,
          error: avaInfo.error
        });
      }
      
      // Eliminar la página específica
      const query = `
        DELETE FROM ${avaInfo.tableName}
        WHERE 
          metadata->>'filename' = $1 AND
          (metadata->>'page')::int = $2
        RETURNING id
      `;
      
      const { rowCount, rows } = await pool.query(query, [filename, pageNumber]);
      
      if (rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró la página especificada'
        });
      }

      // Registrar actividad
      try {
        // Obtener nombre de usuario
        const userName = await activityMenteLogService.getUserName(userId);
        
        await activityMenteLogService.logActivity({
          action_type: "delete",
          entity_type: "embedding_page",
          entity_id: `${avaId}:${filename}#${pageNumber}`,
          entity_name: avaInfo.avaName,
          description: `Se ha eliminado la página ${pageNumber} del documento "${filename}" del AVA "${avaInfo.avaName}"`,
          id_usuario: userId,
          usuario_nombre: userName || "Administrador"
        });
      } catch (logError) {
        console.error('Error al registrar actividad:', logError);
        // No interrumpimos el flujo si falla el registro
      }
      
      // Responder con éxito
      res.status(200).json({
        success: true,
        avaId,
        filename,
        pageNumber,
        deletedCount: rowCount,
        message: `Se ha eliminado la página ${pageNumber} del archivo ${filename}`
      });
      
    } catch (error) {
      console.error('Error al eliminar página de embedding:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar página',
        details: error.message
      });
    }
  },

  /**
   * Obtiene el estado de la cola de procesamiento
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getQueueStatus(req, res) {
    try {
      // Obtener estado de la cola
      const queueStatus = embeddingAvaProcessingQueue.getStatus();
      
      // Responder con el estado
      res.status(200).json({
        success: true,
        queueStatus
      });
      
    } catch (error) {
      console.error('Error al obtener estado de la cola:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estado de la cola',
        details: error.message
      });
    }
  },
    
  /**
   * Actualiza el estado de un proceso
   * @param {string} processId - ID del proceso
   * @param {number} progress - Porcentaje de progreso (0-100)
   * @param {string} message - Mensaje descriptivo
   * @param {string} status - Estado del proceso (pending, processing, completed, error)
   */
  updateProcessStatus(processId, progress, message, status = null) {
    const statusInfo = processingStatus.get(processId);
    
    if (statusInfo) {
      statusInfo.progress = progress;
      statusInfo.message = message;
      
      // Actualizar estado solo si se proporciona uno nuevo
      if (status) {
        statusInfo.status = status;
      } else if (progress === 100) {
        statusInfo.status = 'completed';
      } else if (progress > 0) {
        statusInfo.status = 'processing';
      }
      
      statusInfo.updatedAt = Date.now();
      processingStatus.set(processId, statusInfo);
    }
  },
  
  /**
   * Obtiene el estado de procesamiento de un PDF
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getProcessingStatus(req, res) {
    try {
      const { processId } = req.params;
      
      if (!processId) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere ID de proceso'
        });
      }
      
      // Obtener estado actual
      const status = processingStatus.get(processId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró información para el ID de proceso proporcionado'
        });
      }
      
      // Calcular tiempo transcurrido
      const elapsedTime = Date.now() - status.startTime;
      
      // Responder con el estado actual
      res.status(200).json({
        success: true,
        processId,
        status: status.status,
        progress: status.progress,
        message: status.message,
        avaId: status.avaId,
        filename: status.filename,
        elapsedTime,
        startTime: status.startTime,
        // Incluir resultado si está completo
        result: status.status === 'completed' ? status.result : undefined
      });
      
    } catch (error) {
      console.error('Error al obtener estado de procesamiento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estado de procesamiento',
        details: error.message
      });
    }
  },
  
  /**
   * Lista los PDFs procesados para un AVA
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async listPDFs(req, res) {
    try {
      const avaId = parseInt(req.params.avaId);
      
      if (!avaId || isNaN(avaId)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA válido'
        });
      }
      
      // Obtener la lista de archivos procesados
      const result = await pdfEmbeddingAvaService.listProcessedFiles(avaId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      // Responder con la lista de archivos
      res.status(200).json({
        success: true,
        avaId,
        count: result.count,
        files: result.files
      });
      
    } catch (error) {
      console.error('Error al listar PDFs:', error);
      res.status(500).json({
        success: false,
        error: 'Error al listar PDFs',
        details: error.message
      });
    }
  },
  
  /**
   * Elimina un PDF procesado
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async deletePDF(req, res) {
    try {
      const avaId = parseInt(req.params.avaId);
      const { filename } = req.params;
      const userId = parseInt(req.body.userId || req.query.userId || req.user?.id_user);
      
      if (!avaId || isNaN(avaId)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA válido'
        });
      }
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere el nombre del archivo'
        });
      }
      
      // Obtener información de la tabla
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      // Eliminar documentos del PDF
      const result = await pdfEmbeddingAvaService.deleteDocuments(avaId, filename);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      // Registrar actividad
      try {
        // Obtener nombre de usuario
        const userName = await activityMenteLogService.getUserName(userId);
        
        await activityMenteLogService.logActivity({
          action_type: "delete",
          entity_type: "embedding",
          entity_id: `${avaId}:${filename}`,
          entity_name: avaInfo.success ? avaInfo.avaName : `AVA #${avaId}`,
          description: `Se ha eliminado el documento "${filename}" del AVA "${avaInfo.success ? avaInfo.avaName : `#${avaId}`}"`,
          id_usuario: userId,
          usuario_nombre: userName || "Administrador"
        });
      } catch (logError) {
        console.error('Error al registrar actividad:', logError);
        // No interrumpimos el flujo si falla el registro
      }
      
      // Responder con el resultado
      res.status(200).json({
        success: true,
        avaId,
        filename,
        deletedPages: result.deleted,
        message: `Se eliminaron ${result.deleted} páginas del archivo ${filename}`
      });
      
    } catch (error) {
      console.error('Error al eliminar PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar PDF',
        details: error.message
      });
    }
  },
  
  /**
   * Obtiene estadísticas de los PDFs procesados para un AVA
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getPDFStats(req, res) {
    try {
      const avaId = parseInt(req.params.avaId);
      
      if (!avaId || isNaN(avaId)) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA válido'
        });
      }
      
      // Obtener información de la tabla
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return res.status(400).json({
          success: false,
          error: avaInfo.error
        });
      }
      
      // Obtener estadísticas básicas
      const query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT metadata->>'filename') as unique_files,
          MIN(created_at) as oldest_document,
          MAX(created_at) as newest_document
        FROM ${avaInfo.tableName};
      `;
      
      const { rows } = await pool.query(query);
      
      // Responder con las estadísticas
      res.status(200).json({
        success: true,
        avaId,
        avaName: avaInfo.avaName,
        tableName: avaInfo.tableName,
        stats: rows[0]
      });
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas',
        details: error.message
      });
    }
  }
};

export default embeddingAvaController;