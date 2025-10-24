// backend/controllers/chat/documentController.js
import { 
    getChatDocuments, 
    getDocumentContent, 
    searchDocumentsInChat,
    getDocumentStats,
    hasDocumentsInChat,
    getRecentDocuments 
} from '../../utils/chat/chat.js';
import { documentStorageService } from '../../services/chat/documentStorageService.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

// ====== IMPORTAR CONFIGURACIÓN CENTRALIZADA ACADEL ======
import {
  FILE_LIMITS,
  SUPPORTED_FILES,
  FORBIDDEN_FILES,
  validateFileTypeBackend,
  validateTextContentBackend,
  validateFileCountBackend,
  getSupportedTypesBackend
} from '../../utils/chat/backend-file-constants.js';

/**
 * 🦫 FUNCIONES DE RESPUESTA ACADEL CENTRALIZADAS
 * Para mantener coherencia en las respuestas del backend
 */
function createAcadelErrorResponse(res, statusCode, errorCode, customMessage = null) {
  const errorMessages = {
    'UNSUPPORTED_TYPE': {
      title: "¡Archivo rebelde detectado! 🤔",
      message: "Acadel no puede leer este tipo de archivo. Solo acepto imágenes, documentos de texto y código."
    },
    'PDF_NOT_SUPPORTED': {
      title: "¡PDF Alert! 📋❌",
      message: "Los PDFs son como cajas cerradas para Acadel. ¿Podrías convertirlo a TXT o DOCX? ¡Gracias!"
    },
    'EXECUTABLE_BLOCKED': {
      title: "¡Archivo peligroso detectado! 🛡️",
      message: "Acadel no acepta archivos ejecutables por seguridad. ¡Solo documentos y código fuente!"
    },
    'FILE_TOO_LARGE': {
      title: "¡Archivo gigante detectado! 📊",
      message: "Este archivo supera los 5MB. Acadel necesita archivos más ligeros para analizarlos bien."
    },
    'TEXT_TOO_LONG': {
      title: "¡Texto infinito detectado! 📜",
      message: "Este documento tiene más de 100,000 caracteres. Acadel necesita textos más cortos para dar buenas respuestas."
    },
    'TOO_MANY_FILES': {
      title: "¡Exceso de archivos! 📚",
      message: "Acadel puede analizar máximo 4 archivos por consulta. ¡Calidad sobre cantidad!"
    },
    'FILE_CORRUPTED': {
      title: "¡Archivo dañadito! 🔧",
      message: "Acadel tuvo problemas para leer tu archivo. Puede ser el formato o que esté dañado. ¿Intentas con otro?"
    },
    'NOT_FOUND': {
      title: "¡Archivo perdido! 🔍",
      message: "Acadel no encuentra ese archivo. Puede que se haya movido o eliminado."
    },
    'PERMISSION_DENIED': {
      title: "¡Sin permisos! 🚫",
      message: "Acadel no puede acceder a ese archivo. Solo puedes ver tus propios documentos."
    }
  };

  const errorInfo = errorMessages[errorCode] || errorMessages['FILE_CORRUPTED'];
  
  return res.status(statusCode).json({
    success: false,
    error: customMessage || errorInfo.message,
    acadel: {
      title: errorInfo.title,
      message: customMessage || errorInfo.message,
      errorCode: errorCode
    }
  });
}

function createAcadelSuccessResponse(res, data, successCode = 'FILES_READY', customMessage = null) {
  const successMessages = {
    'FILES_READY': {
      title: "¡Archivos listos para Acadel! 🎯",
      message: "Todos los archivos están perfectos. ¡Ahora pregúntame lo que necesites!"
    },
    'FILE_PROCESSED': {
      title: "¡Archivo procesado! ✨",
      message: "Acadel ya leyó tu archivo y está listo para ayudarte."
    },
    'CONTENT_RETRIEVED': {
      title: "¡Contenido recuperado! 📖",
      message: "Acadel encontró el contenido que buscabas."
    }
  };

  const successInfo = successMessages[successCode] || successMessages['FILES_READY'];
  
  return res.json({
    success: true,
    ...data,
    acadel: {
      title: successInfo.title,
      message: customMessage || successInfo.message,
      successCode: successCode
    }
  });
}

/**
 * 🦫 Obtiene documentos de un chat específico
 */
export const getChatDocumentsController = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id_user;
        
        console.log(`🦫 Acadel obteniendo documentos del chat: ${chatId} para usuario: ${userId}`);
        
        const documents = await getChatDocuments(chatId, userId);
        
        // Log de seguridad
        logSecurityEvent('DOCUMENT_LIST_VIEW', 'Listado de documentos de chat', {
            userId,
            chatId,
            documentCount: documents.length,
            ip: req.ip
        }, 'low');
        
        createAcadelSuccessResponse(res, {
            documents,
            count: documents.length
        }, 'CONTENT_RETRIEVED', `Acadel encontró ${documents.length} documento${documents.length !== 1 ? 's' : ''} en este chat`);
        
    } catch (error) {
        console.error('❌ Acadel error obteniendo documentos del chat:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas accediendo a los documentos del chat');
    }
};

/**
 * 🦫 Obtiene el contenido de un documento específico
 */
export const getDocumentContentController = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.id_user;
        
        console.log(`🦫 Acadel obteniendo contenido del documento: ${fileId}`);
        
        const document = await getDocumentContent(fileId, userId);
        
        if (!document) {
            return createAcadelErrorResponse(res, 404, 'NOT_FOUND');
        }
        
        // Validar contenido si existe
        if (document.extracted_content) {
            const validation = validateTextContentBackend(document.extracted_content, document.original_name);
            if (validation.truncated) {
                console.log(`⚠️ Acadel: Contenido truncado para vista: ${document.original_name}`);
                document.extracted_content = validation.content;
                document.content_truncated = true;
            }
        }
        
        // Log de acceso
        logSecurityEvent('DOCUMENT_CONTENT_VIEW', 'Visualización de contenido de documento', {
            userId,
            fileId,
            fileName: document.original_name,
            ip: req.ip
        }, 'low');
        
        createAcadelSuccessResponse(res, {
            document
        }, 'CONTENT_RETRIEVED', `Acadel recuperó el contenido de "${document.original_name}"`);
        
    } catch (error) {
        console.error('❌ Acadel error obteniendo contenido del documento:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas accediendo al contenido del documento');
    }
};

/**
 * 🦫 Busca documentos en un chat
 */
export const searchDocumentsController = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { q: searchTerm } = req.query;
        const userId = req.user.id_user;
        
        console.log(`🦫 Acadel buscando documentos en chat ${chatId} con término: "${searchTerm}"`);
        
        if (!searchTerm || searchTerm.trim().length < 2) {
            return createAcadelErrorResponse(res, 400, 'FILE_CORRUPTED', 'Acadel necesita al menos 2 caracteres para buscar');
        }
        
        const documents = await searchDocumentsInChat(chatId, userId, searchTerm.trim());
        
        // Log de búsqueda
        logSecurityEvent('DOCUMENT_SEARCH', 'Búsqueda de documentos', {
            userId,
            chatId,
            searchTerm: searchTerm.trim(),
            resultsCount: documents.length,
            ip: req.ip
        }, 'low');
        
        createAcadelSuccessResponse(res, {
            documents,
            searchTerm: searchTerm.trim(),
            count: documents.length
        }, 'CONTENT_RETRIEVED', `Acadel encontró ${documents.length} documento${documents.length !== 1 ? 's' : ''} que coincide${documents.length === 1 ? '' : 'n'} con "${searchTerm.trim()}"`);
        
    } catch (error) {
        console.error('❌ Acadel error buscando documentos:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas realizando la búsqueda');
    }
};

/**
 * 🦫 Obtiene estadísticas de documentos del usuario
 */
export const getDocumentStatsController = async (req, res) => {
    try {
        const userId = req.user.id_user;
        
        console.log(`🦫 Acadel obteniendo estadísticas de documentos para usuario: ${userId}`);
        
        const stats = await getDocumentStats(userId);
        
        const formattedStats = {
            totalDocuments: parseInt(stats.total_documents) || 0,
            textDocuments: parseInt(stats.text_documents) || 0,
            codeFiles: parseInt(stats.code_files) || 0,
            totalSize: parseInt(stats.total_size) || 0,
            chatsWithDocuments: parseInt(stats.chats_with_documents) || 0,
            differentLanguages: parseInt(stats.different_languages) || 0,
            // ⭐ AGREGAR LÍMITES ACADEL ⭐
            limits: {
                maxFileSize: FILE_LIMITS.MAX_FILE_SIZE,
                maxTextContent: FILE_LIMITS.MAX_TEXT_CONTENT,
                maxFilesPerQuery: FILE_LIMITS.MAX_FILES_PER_QUERY,
                maxFileSizeMB: Math.round(FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024),
                maxTextContentFormatted: FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()
            }
        };
        
        // Log de estadísticas
        logSecurityEvent('DOCUMENT_STATS_VIEW', 'Visualización de estadísticas de documentos', {
            userId,
            totalDocuments: formattedStats.totalDocuments,
            ip: req.ip
        }, 'low');
        
        createAcadelSuccessResponse(res, {
            stats: formattedStats
        }, 'CONTENT_RETRIEVED', `Acadel recopiló las estadísticas de tus ${formattedStats.totalDocuments} documento${formattedStats.totalDocuments !== 1 ? 's' : ''}`);
        
    } catch (error) {
        console.error('❌ Acadel error obteniendo estadísticas de documentos:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas recopilando las estadísticas');
    }
};

/**
 * 🦫 Verifica si un chat tiene documentos
 */
export const checkChatHasDocumentsController = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id_user;
        
        console.log(`🦫 Acadel verificando documentos en chat: ${chatId}`);
        
        const hasDocuments = await hasDocumentsInChat(chatId, userId);
        
        createAcadelSuccessResponse(res, {
            hasDocuments
        }, 'CONTENT_RETRIEVED', hasDocuments ? 'Este chat tiene documentos adjuntos' : 'Este chat no tiene documentos adjuntos');
        
    } catch (error) {
        console.error('❌ Acadel error verificando documentos en chat:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas verificando los documentos del chat');
    }
};

/**
 * 🦫 Obtiene documentos recientes del usuario
 */
export const getRecentDocumentsController = async (req, res) => {
    try {
        const userId = req.user.id_user;
        let limit = parseInt(req.query.limit) || 10;
        
        // ⭐ VALIDAR LÍMITE CON CONFIGURACIÓN ACADEL ⭐
        if (limit > 50) {
            return createAcadelErrorResponse(res, 400, 'TOO_MANY_FILES', 'Acadel puede mostrar máximo 50 documentos recientes');
        }
        
        if (limit < 1) {
            limit = 10;
        }
        
        console.log(`🦫 Acadel obteniendo ${limit} documentos recientes para usuario: ${userId}`);
        
        const documents = await getRecentDocuments(userId, limit);
        
        // Log de acceso a recientes
        logSecurityEvent('DOCUMENT_RECENT_VIEW', 'Visualización de documentos recientes', {
            userId,
            limit,
            documentsCount: documents.length,
            ip: req.ip
        }, 'low');
        
        createAcadelSuccessResponse(res, {
            documents,
            count: documents.length
        }, 'CONTENT_RETRIEVED', `Acadel encontró ${documents.length} documento${documents.length !== 1 ? 's' : ''} reciente${documents.length !== 1 ? 's' : ''}`);
        
    } catch (error) {
        console.error('❌ Acadel error obteniendo documentos recientes:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas obteniendo los documentos recientes');
    }
};

/**
 * 🦫 Obtiene información sobre tipos de archivo soportados
 */
export const getSupportedTypesController = async (req, res) => {
    try {
        console.log('🦫 Acadel proporcionando información de tipos soportados');
        
        const supportedTypes = documentStorageService.getSupportedTypes();
        
        // ⭐ AGREGAR INFORMACIÓN ADICIONAL DE ACADEL ⭐
        const acadelInfo = {
            ...supportedTypes,
            acadel: {
                title: "¡Tipos de archivo que Acadel acepta! 📚",
                message: "Acadel está listo para ayudarte con estos tipos de archivos",
                recommendations: [
                    "📄 Documentos: TXT y DOCX funcionan perfectamente",
                    "💻 Código: Todos los lenguajes populares están soportados",
                    "🖼️ Imágenes: JPG, PNG y WebP para consultas visuales",
                    "🚫 PDFs: No soportados, convierte a TXT o DOCX",
                    "📊 Límites: Máximo 5MB por archivo, 4 archivos por consulta"
                ]
            }
        };
        
        createAcadelSuccessResponse(res, acadelInfo, 'CONTENT_RETRIEVED', 'Acadel te muestra todos los tipos de archivo que puede procesar');
        
    } catch (error) {
        console.error('❌ Acadel error obteniendo tipos soportados:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo problemas obteniendo la información de tipos soportados');
    }
};

/**
 * 🦫 Procesa archivos individuales con validaciones Acadel centralizadas
 */
export const processDocumentController = async (req, res) => {
    try {
        const { fileUrl, chatId, originalName } = req.body;
        const userId = req.user.id_user;
        
        console.log(`🦫 Acadel procesando documento manual: ${originalName || 'sin nombre'}`);
        
        if (!fileUrl || !chatId) {
            return createAcadelErrorResponse(res, 400, 'FILE_CORRUPTED', 'Acadel necesita la URL del archivo y el ID del chat');
        }
        
        // ⭐ VALIDACIÓN PREVIA CON SISTEMA CENTRALIZADO ⭐
        if (originalName) {
            // Extraer información básica para validación previa
            const extension = originalName.split('.').pop().toLowerCase();
            
            // Verificar si está prohibido
            if (FORBIDDEN_FILES.BLOCKED_EXTENSIONS.includes(extension)) {
                const reason = FORBIDDEN_FILES.REASONS[extension];
                const errorCode = extension === 'pdf' ? 'PDF_NOT_SUPPORTED' : 'EXECUTABLE_BLOCKED';
                return createAcadelErrorResponse(res, 400, errorCode, reason);
            }
        }
        
        // Log de procesamiento manual
        logSecurityEvent('DOCUMENT_MANUAL_PROCESS', 'Procesamiento manual de documento', {
            userId,
            chatId,
            fileUrl: fileUrl.substring(0, 100),
            originalName,
            ip: req.ip
        }, 'low');
        
        const result = await documentStorageService.processFileFromUrl(
            fileUrl, 
            chatId, 
            userId, 
            originalName
        );
        
        if (result.success) {
            // ⭐ RESPUESTA EXITOSA CON INFORMACIÓN ACADEL ⭐
            createAcadelSuccessResponse(res, {
                file: {
                    fileId: result.fileId,
                    filePath: result.filePath,
                    originalName: result.originalName,
                    attachmentType: result.attachmentType,
                    language: result.language,
                    fileSize: result.fileSize,
                    hasContent: !!result.extractedContent,
                    contentLength: result.extractedContent ? result.extractedContent.length : 0
                }
            }, 'FILE_PROCESSED', `Acadel procesó exitosamente "${result.originalName || originalName}"`);
        } else {
            // ⭐ DETERMINAR TIPO DE ERROR PARA RESPUESTA ACADEL ⭐
            let errorCode = 'FILE_CORRUPTED';
            
            if (result.error.includes('demasiado grande')) {
                errorCode = 'FILE_TOO_LARGE';
            } else if (result.error.includes('no soportado')) {
                errorCode = 'UNSUPPORTED_TYPE';
            } else if (result.error.includes('PDF')) {
                errorCode = 'PDF_NOT_SUPPORTED';
            } else if (result.error.includes('ejecutable')) {
                errorCode = 'EXECUTABLE_BLOCKED';
            }
            
            createAcadelErrorResponse(res, 400, errorCode, result.error);
        }
    } catch (error) {
        console.error('❌ Acadel error procesando documento:', error);
        createAcadelErrorResponse(res, 500, 'FILE_CORRUPTED', 'Acadel tuvo un error interno procesando el documento');
    }
};