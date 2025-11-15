
import { handleQueryPDF, handlePDFMultimodalQuery, queryPDFWithoutSaving, handlePDFMultimodalQueryWithoutSaving } from "../../../../services/chat/ias/herramienta/pdfService.js";
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

export const queryPDF = async (req, res) => {
  try {
    console.log('🔍 queryPDF iniciado con TokenManager centralizado');
    
    logToolOperation('PDF_QUERY_START', req.body, {
      endpoint: 'query-pdf',
      method: 'POST',
      toolSlug: 'pdf'
    });

    const validationErrors = validateToolQueryParams(req.body);
    
    const accessInfo = req.accessInfo || {};
    const tokenInfo = req.tokenInfo || {};
    const tokenWarning = req.tokenWarning || null;
    const toolSlug = req.toolSlug || 'pdf';
    const toolId = req.toolId || req.body.herramientaId;
    const toolInfo = req.toolInfo || null;

    const serviceFunction = async (params, skipSaveMode) => {
      if (skipSaveMode) {
        console.log('Modo skipSave activado: generando respuesta de PDF sin guardar mensajes');
        return await queryPDFWithoutSaving(params);
      } else {
        console.log('Procesando consulta PDF normal con guardado en base de datos');
        const result = await handleQueryPDF(params);
        
        // Adaptar estructura de respuesta para PDF
        return {
          success: true,
          type: result.type,
          answer: result.type === 'conversation' ? result.data : undefined,
          exam: result.type === 'exam' ? result.data : undefined,
          data: result.type !== 'conversation' && result.type !== 'exam' ? result.data : undefined,
          chatId: params.chatId,
          timestamp: new Date().toISOString(),
          ...result
        };
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

  } catch (error) {
    console.error('❌ Error crítico en queryPDF:', error);
    
    logToolOperation('PDF_QUERY_CRITICAL_ERROR', req.body, {
      error: error.message,
      stack: error.stack,
      toolSlug: 'pdf'
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      errorType: 'pdf_critical_error',
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

export const queryPDFMultimodal = async (req, res) => {
  try {
    console.log('🔍 queryPDFMultimodal iniciado con TokenManager centralizado');
    
    logToolOperation('PDF_MULTIMODAL_START', req.body, {
      endpoint: 'multimodal-pdf',
      method: 'POST',
      hasContent: !!req.body.content,
      contentLength: Array.isArray(req.body.content) ? req.body.content.length : 0,
      toolSlug: 'pdf'
    });

    const validationErrors = validateToolMultimodalParams(req.body);
    
    const accessInfo = req.accessInfo || {};
    const tokenInfo = req.tokenInfo || {};
    const tokenWarning = req.tokenWarning || null;
    const toolSlug = req.toolSlug || 'pdf';
    const toolId = req.toolId || req.body.herramientaId;
    const toolInfo = req.toolInfo || null;

    const attachmentsSummary = generateAttachmentsSummary(req.body.content || []);
    console.log(`📄 Procesando consulta multimodal de PDF: ${attachmentsSummary}`);
    
    logSecurityEvent('PDF_MULTIMODAL_REQUEST', 'Solicitud multimodal de PDF recibida', {
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
      pdfLimits: accessInfo.toolAccess?.limits || null,
      ip: req.ip
    }, 'low');

    const serviceFunction = async (params) => {
      const result = await handlePDFMultimodalQuery(params);
      
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

  } catch (error) {
    console.error('❌ Error crítico en queryPDFMultimodal:', error);
    
    logToolOperation('PDF_MULTIMODAL_CRITICAL_ERROR', req.body, {
      error: error.message,
      stack: error.stack,
      toolSlug: 'pdf'
    });
    
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
      errorType: 'pdf_multimodal_critical_error',
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

export const queryPDFMultimodalWithoutSaving = async (req, res) => {
  try {
    console.log('🔄 queryPDFMultimodalWithoutSaving iniciado con TokenManager centralizado');
    
    logToolOperation('PDF_MULTIMODAL_WITHOUT_SAVING_START', req.body, {
      endpoint: 'multimodal-pdf-without-saving',
      method: 'POST',
      hasContent: !!req.body.content,
      contentLength: Array.isArray(req.body.content) ? req.body.content.length : 0,
      toolSlug: 'pdf'
    });

    const validationErrors = validateToolMultimodalParams(req.body);
    
    const accessInfo = req.accessInfo || {};
    const tokenInfo = req.tokenInfo || {};
    const tokenWarning = req.tokenWarning || null;
    const toolSlug = req.toolSlug || 'pdf';
    const toolId = req.toolId || req.body.herramientaId;
    const toolInfo = req.toolInfo || null;

    const attachmentsSummary = generateAttachmentsSummary(req.body.content || []);
    console.log(`🔄 Procesando consulta multimodal PDF SIN GUARDAR (retry/edit): ${attachmentsSummary}`);
    
    logSecurityEvent('PDF_MULTIMODAL_WITHOUT_SAVING_REQUEST', 'Solicitud multimodal PDF sin guardar (retry/edit)', {
      userId: req.body.userId || req.user?.id_user,
      herramientaId: req.body.herramientaId,
      toolName: getToolNameById(req.body.herramientaId),
      toolSlug: toolSlug,
      chatId: req.body.chatId,
      attachmentsSummary,
      isPremium: accessInfo.isPremium || false,
      isAdmin: accessInfo.isAdmin || false,
      hasTokenWarning: !!tokenWarning,
      pdfLimits: accessInfo.toolAccess?.limits || null,
      ip: req.ip
    }, 'low');

    const serviceFunction = async (params) => {
      const result = await handlePDFMultimodalQueryWithoutSaving(params);
      
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

  } catch (error) {
    console.error('❌ Error crítico en queryPDFMultimodalWithoutSaving:', error);
    
    logToolOperation('PDF_MULTIMODAL_WITHOUT_SAVING_CRITICAL_ERROR', req.body, {
      error: error.message,
      stack: error.stack,
      toolSlug: 'pdf'
    });
    
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
      errorType: 'pdf_multimodal_without_saving_critical_error',
      processedWithoutSaving: true,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

async function addRecentDocumentsToResult(result, userId) {
  try {
    console.log(`🔍 Buscando documentos recientes para chat PDF: ${result.chatId}`);
    
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
        console.log(`📎 Encontrados ${documentsResult.rows.length} documentos recientes para PDF`);
        
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
        
        console.log(`✅ Documentos agregados a la respuesta de PDF:`, 
          result.documents.map(d => `${d.originalName} (${d.fileId})`));
        
      } else {
        console.log(`ℹ️ No se encontraron documentos recientes para el chat PDF ${result.chatId}`);
        
        result.documents = [];
        result.hasDocuments = false;
        result.documentCount = 0;
      }
      
    } finally {
      client.release();
    }
    
  } catch (docError) {
    console.error('❌ Error al obtener documentos del chat PDF:', docError);
    
    result.documents = [];
    result.hasDocuments = false;
    result.documentCount = 0;
  }
}