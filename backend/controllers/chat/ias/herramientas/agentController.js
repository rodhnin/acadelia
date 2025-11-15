
import { handleStudyQuery, handleStudyMultimodalQuery, handleStudyQueryWithoutSaving, handleStudyMultimodalQueryWithoutSaving } from "../../../../services/chat/ias/herramienta/agentService.js";
import { logSecurityEvent } from '../../../../utils/securityLogger.js';
import pool from '../../../../lib/dbPool.js';

import {
  validateToolQueryParams,
  validateToolMultimodalParams,
  logToolOperation,
  getToolNameById,
  generateAttachmentsSummary
} from "../../../../utils/chat/toolutil.js";

import { TokenManager } from "../../../../utils/shared/tokenManager.js";

export const queryAgent = async (req, res) => {
  console.log('🔍 queryAgent iniciado con TokenManager centralizado');

  logToolOperation('AGENT_QUERY_START', req.body, {
    endpoint: 'query-agent',
    method: 'POST',
    toolSlug: 'agente'
  });

  const validationErrors = validateToolQueryParams(req.body);

  const accessInfo = req.accessInfo || {};
  const tokenInfo = req.tokenInfo || {};
  const tokenWarning = req.tokenWarning || null;
  const toolSlug = req.toolSlug || 'agente';
  const toolId = req.toolId || req.body.herramientaId;
  const toolInfo = req.toolInfo || null;

  const serviceFunction = async (params, skipSaveMode) => {
    if (skipSaveMode) {
      console.log('Modo skipSave activado: generando respuesta de Agente sin guardar mensajes');
      const modifiedParams = {
        ...params,
        _skipSaveInternally: true,
        avaId: params.avaId || null,
        herramientaId: params.herramientaId || null
      };
      return await handleStudyQueryWithoutSaving(modifiedParams);
    } else {
      console.log('Procesando consulta Agente normal con guardado en base de datos');
      return await handleStudyQuery({
        userId: params.userId,
        avaId: params.avaId || null,
        herramientaId: params.herramientaId || null,
        chatId: params.chatId,
        query: params.query,
        skipSave: false
      });
    }
  };

  return await TokenManager.handleCompleteToolController(req, res, {
    validationErrors,
    accessInfo,
    tokenInfo,
    tokenWarning,
    toolSlug,
    toolId,
    toolInfo,
    serviceFunction,
    skipSave: req.body.skipSave === true || req.headers['x-skip-save'] === 'true',
    isMultimodal: false,
    getToolNameById
  });
};

export const queryAgentMultimodal = async (req, res) => {
  console.log('🔍 queryAgentMultimodal iniciado con TokenManager centralizado');

  logToolOperation('AGENT_MULTIMODAL_START', req.body, {
    endpoint: 'multimodal-agent',
    method: 'POST',
    hasContent: !!req.body.content,
    contentLength: Array.isArray(req.body.content) ? req.body.content.length : 0,
    toolSlug: 'agente'
  });

  const validationErrors = validateToolMultimodalParams(req.body);

  const accessInfo = req.accessInfo || {};
  const tokenInfo = req.tokenInfo || {};
  const tokenWarning = req.tokenWarning || null;
  const toolSlug = req.toolSlug || 'agente';
  const toolId = req.toolId || req.body.herramientaId;
  const toolInfo = req.toolInfo || null;

  const attachmentsSummary = generateAttachmentsSummary(req.body.content || []);
  console.log(`📄 Procesando consulta multimodal de Agente: ${attachmentsSummary}`);

  logSecurityEvent('AGENT_MULTIMODAL_REQUEST', 'Solicitud multimodal de Agente recibida', {
    userId: req.body.userId || req.user?.id_user,
    herramientaId: req.body.herramientaId,
    toolName: getToolNameById(req.body.herramientaId),
    toolSlug: toolSlug,
    toolId: toolId,
    chatId: req.body.chatId,
    attachmentsSummary,
    isPremium: accessInfo.isPremium || false,
    isAdmin: accessInfo.isAdmin || false,
    hasTokenWarning: !!tokenWarning,
    agentLimits: accessInfo.toolAccess?.limits || null,
    ip: req.ip
  }, 'low');

  const serviceFunction = async (params) => {
    const result = await handleStudyMultimodalQuery({
      userId: params.userId,
      avaId: params.avaId || null,
      herramientaId: params.herramientaId || null,
      chatId: params.chatId,
      content: params.content,
      skipSave: false
    });

    if (result.success && result.chatId) {
      await addRecentDocumentsToResult(result, params.userId || req.user?.id_user);
    }

    return result;
  };

  return await TokenManager.handleCompleteToolController(req, res, {
    validationErrors,
    accessInfo,
    tokenInfo,
    tokenWarning,
    toolSlug,
    toolId,
    toolInfo,
    serviceFunction,
    skipSave: false,
    isMultimodal: true,
    getToolNameById
  });
};

export const queryAgentMultimodalWithoutSaving = async (req, res) => {
  console.log('🔄 queryAgentMultimodalWithoutSaving iniciado con TokenManager centralizado');

  logToolOperation('AGENT_MULTIMODAL_WITHOUT_SAVING_START', req.body, {
    endpoint: 'multimodal-agent-without-saving',
    method: 'POST',
    hasContent: !!req.body.content,
    contentLength: Array.isArray(req.body.content) ? req.body.content.length : 0,
    toolSlug: 'agente'
  });

  const validationErrors = validateToolMultimodalParams(req.body);

  const accessInfo = req.accessInfo || {};
  const tokenInfo = req.tokenInfo || {};
  const tokenWarning = req.tokenWarning || null;
  const toolSlug = req.toolSlug || 'agente';
  const toolId = req.toolId || req.body.herramientaId;
  const toolInfo = req.toolInfo || null;

  const attachmentsSummary = generateAttachmentsSummary(req.body.content || []);
  console.log(`🔄 Procesando consulta multimodal de Agente SIN GUARDAR (retry/edit): ${attachmentsSummary}`);

  logSecurityEvent('AGENT_MULTIMODAL_WITHOUT_SAVING', 'Solicitud multimodal de Agente sin guardar (retry/edit)', {
    userId: req.body.userId || req.user?.id_user,
    herramientaId: req.body.herramientaId,
    toolName: getToolNameById(req.body.herramientaId),
    toolSlug: toolSlug,
    chatId: req.body.chatId,
    attachmentsSummary,
    isPremium: accessInfo.isPremium || false,
    isAdmin: accessInfo.isAdmin || false,
    hasTokenWarning: !!tokenWarning,
    agentLimits: accessInfo.toolAccess?.limits || null,
    ip: req.ip
  }, 'low');

  const serviceFunction = async (params) => {
    const result = await handleStudyMultimodalQueryWithoutSaving({
      userId: params.userId,
      avaId: params.avaId || null,
      herramientaId: params.herramientaId || null,
      chatId: params.chatId,
      content: params.content
    });

    if (result.success) {
      result.processedWithoutSaving = true;
    }

    return result;
  };

  return await TokenManager.handleCompleteToolController(req, res, {
    validationErrors,
    accessInfo,
    tokenInfo,
    tokenWarning,
    toolSlug,
    toolId,
    toolInfo,
    serviceFunction,
    skipSave: true, // Siempre true para este endpoint
    isMultimodal: true,
    getToolNameById
  });
};

async function addRecentDocumentsToResult(result, userId) {
  try {
    console.log(`🔍 Buscando documentos recientes para chat Agente: ${result.chatId}`);

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

      const documentsResult = await client.query(documentsQuery, [result.chatId, userId]);

      if (documentsResult.rows.length > 0) {
        console.log(`📎 Encontrados ${documentsResult.rows.length} documentos recientes para Agente`);

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

        console.log(`✅ Documentos agregados a la respuesta de Agente:`,
          result.documents.map(d => `${d.originalName} (${d.fileId})`));

      } else {
        console.log(`ℹ️ No se encontraron documentos recientes para el chat Agente ${result.chatId}`);

        result.documents = [];
        result.hasDocuments = false;
        result.documentCount = 0;
      }

    } finally {
      client.release();
    }

  } catch (docError) {
    console.error('❌ Error al obtener documentos del chat Agente:', docError);

    result.documents = [];
    result.hasDocuments = false;
    result.documentCount = 0;
  }
}