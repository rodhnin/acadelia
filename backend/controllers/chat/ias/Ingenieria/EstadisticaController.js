
import { handleStatisticsQuery, handleStatisticsMultimodalQuery, handleStatisticsQueryWithoutSaving, handleStatisticsMultimodalQueryWithoutSaving } from "../../../../services/chat/ias/ingenieria/estadisticaService.js";
import { validateQueryParams, validateMultimodalParams, generateAttachmentsSummary } from "../../../../utils/chat/mathematicutils.js";
import { logSecurityEvent } from '../../../../utils/securityLogger.js';
import pool from '../../../../lib/dbPool.js';
import { TokenManager } from "../../../../utils/shared/tokenManager.js";

export const queryEstadistica = async (req, res) => {
  const validationErrors = validateQueryParams(req.body);
  const avaAccessInfo = req.accessInfo?.avaAccess || {};
  const tokenInfo = req.tokenInfo || {};
  const tokenWarning = req.tokenWarning || null;

  await TokenManager.handleCompleteAvaController(req, res, {
    validationErrors,
    avaAccessInfo,
    tokenInfo,
    tokenWarning,
    avaType: 'estadistica',
    defaultAvaName: 'Estadística y Probabilidad',
    serviceFunction: async (params) => {
      const skipSave = params.skipSave === true || req.headers['x-skip-save'] === 'true';
      if (skipSave) {
        const modifiedParams = { ...params, _skipSaveInternally: true };
        return await handleStatisticsQueryWithoutSaving(modifiedParams);
      } else {
        return await handleStatisticsQuery(params);
      }
    },
    skipSave: req.body.skipSave === true || req.headers['x-skip-save'] === 'true',
    isMultimodal: false
  });
};

export const queryEstadisticaMultimodal = async (req, res) => {
  const validationErrors = validateMultimodalParams(req.body);
  const avaAccessInfo = req.accessInfo?.avaAccess || {};
  const tokenInfo = req.tokenInfo || {};
  const tokenWarning = req.tokenWarning || null;

  await TokenManager.handleCompleteAvaController(req, res, {
    validationErrors,
    avaAccessInfo,
    tokenInfo,
    tokenWarning,
    avaType: 'estadistica_multimodal',
    defaultAvaName: 'Estadística y Probabilidad',
    serviceFunction: async (params) => {
      const result = await handleStatisticsMultimodalQuery(params);
      
      if (result.error) {
        logSecurityEvent('ESTADISTICA_MULTIMODAL_CONTROLLED_ERROR', 'Error controlado en consulta multimodal de estadística', {
          userId: params.userId || req.user?.id_user,
          error: result.error,
          ip: req.ip
        }, 'medium');
        
        return result;
      }

      if (result.success && result.chatId) {
        try {
          const client = await pool.connect();
          
          try {
            const documentsQuery = `
              SELECT file_id, original_name, file_name, file_size, mime_type, 
                     file_extension, attachment_type, language, 
                     is_processed, created_at, extracted_content,
                     file_path
              FROM file_attachments 
              WHERE chat_id = $1 
                AND user_id = $2 
                AND created_at >= NOW() - INTERVAL '2 minutes'
              ORDER BY created_at DESC
            `;
            
            const userId = params.userId || req.user?.id_user;
            const documentsResult = await client.query(documentsQuery, [result.chatId, userId]);
            
            if (documentsResult.rows.length > 0) {
              result.documents = documentsResult.rows.map(doc => ({
                type: "document_reference",
                fileId: doc.file_id,
                originalName: doc.original_name,
                attachmentType: doc.attachment_type,
                language: doc.language,
                fileSize: doc.file_size,
                filePath: doc.file_path,
                hasContent: !!doc.extracted_content,
                contentLength: doc.extracted_content ? doc.extracted_content.length : 0,
                processedAt: doc.created_at
              }));
              
              result.hasDocuments = true;
              result.documentCount = documentsResult.rows.length;
              result.totalDocumentCount = documentsResult.rows.length;
            } else {
              result.documents = [];
              result.hasDocuments = false;
              result.documentCount = 0;
            }
            
          } finally {
            client.release();
          }
          
        } catch (docError) {
          console.error('❌ Error al obtener documentos del chat:', docError);
          result.documents = [];
          result.hasDocuments = false;
          result.documentCount = 0;
        }
      }

      return result;
    },
    skipSave: false,
    isMultimodal: true
  });
};

export const queryEstadisticaMultimodalWithoutSaving = async (req, res) => {
  const validationErrors = validateMultimodalParams(req.body);
  const avaAccessInfo = req.accessInfo?.avaAccess || {};
  const tokenInfo = req.tokenInfo || {};
  const tokenWarning = req.tokenWarning || null;

  await TokenManager.handleCompleteAvaController(req, res, {
    validationErrors,
    avaAccessInfo,
    tokenInfo,
    tokenWarning,
    avaType: 'estadistica_multimodal_without_saving',
    defaultAvaName: 'Estadística y Probabilidad',
    serviceFunction: async (params) => {
      const result = await handleStatisticsMultimodalQueryWithoutSaving(params);
      
      if (result.error) {
        logSecurityEvent('ESTADISTICA_MULTIMODAL_WITHOUT_SAVING_ERROR', 'Error controlado en consulta multimodal de estadística sin guardar', {
          userId: params.userId || req.user?.id_user,
          error: result.error,
          ip: req.ip
        }, 'medium');
      }

      return result;
    },
    skipSave: true,
    isMultimodal: true
  });
};