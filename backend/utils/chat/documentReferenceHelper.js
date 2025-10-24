// backend/utils/chat/documentReferenceHelper.js

/**
 * Genera una referencia JSON para documentos que se guarda en chat_history
 * Esta función ayuda a crear referencias consistentes a documentos adjuntos
 */

/**
 * Crea una referencia de documento para guardar en el chat
 * @param {Object} documentResult - Resultado del procesamiento del documento
 * @returns {Object} - Referencia del documento
 */
export const createDocumentReference = (documentResult) => {
    return {
        type: 'document_reference',
        fileId: documentResult.fileId,
        originalName: documentResult.originalName,
        attachmentType: documentResult.attachmentType,
        language: documentResult.language,
        fileSize: documentResult.fileSize,
        filePath: documentResult.filePath,
        hasContent: !!documentResult.extractedContent,
        contentLength: documentResult.extractedContent ? documentResult.extractedContent.length : 0,
        processedAt: new Date().toISOString()
    };
};

/**
 * Crea una referencia de imagen para guardar en el chat
 * @param {Object} imageResult - Resultado del procesamiento de la imagen
 * @returns {Object} - Referencia de la imagen
 */
export const createImageReference = (imageResult) => {
    return {
        type: 'image_reference',
        path: imageResult.savedPath,
        security: imageResult.securityInfo ? {
            scanned: imageResult.securityInfo.scanned || false,
            clean: imageResult.securityInfo.clean || true
        } : undefined,
        processedAt: new Date().toISOString()
    };
};

/**
 * Genera el JSON completo para un mensaje multimodal con archivos adjuntos
 * @param {string} extractedText - Texto extraído del mensaje
 * @param {Array} processedImages - Imágenes procesadas
 * @param {Array} processedDocuments - Documentos procesados
 * @param {Array} processingErrors - Errores durante el procesamiento
 * @param {number} imagesWithVirusCount - Cantidad de imágenes bloqueadas por antivirus
 * @returns {Object} - JSON completo para guardar en chat_history
 */
export const createMultimodalMessageReference = ({
    extractedText = "",
    processedImages = [],
    processedDocuments = [],
    processingErrors = [],
    imagesWithVirusCount = 0
}) => {
    const hasImages = processedImages.length > 0;
    const hasDocuments = processedDocuments.length > 0;
    const successfulImages = processedImages.filter(img => img.success);
    const successfulDocuments = processedDocuments.filter(doc => doc.success);
    
    return {
        text: extractedText || "Consulta con archivos adjuntos",
        hasImage: hasImages,
        hasDocuments: hasDocuments,
        
        // Contadores
        imageCount: successfulImages.length,
        documentCount: successfulDocuments.length,
        totalImageCount: processedImages.length,
        totalDocumentCount: processedDocuments.length,
        
        // Referencias a imágenes exitosas
        images: successfulImages.map(img => createImageReference(img)),
        
        // NUEVO: Referencias a documentos exitosos
        documents: successfulDocuments.map(doc => createDocumentReference(doc)),
        
        // Errores de procesamiento
        processingErrors: [
            ...processedImages.filter(img => !img.success).map(img => ({
                type: 'image',
                originalName: img.originalItem?.name || 'imagen',
                error: img.error
            })),
            ...processedDocuments.filter(doc => !doc.success).map(doc => ({
                type: 'document',
                originalName: doc.originalItem?.name || doc.originalItem?.filename || 'documento',
                error: doc.error
            }))
        ],
        
        // Información de seguridad
        securityInfo: imagesWithVirusCount > 0 ? {
            blockedByAntivirus: imagesWithVirusCount
        } : undefined,
        
        // Metadatos
        processedAt: new Date().toISOString(),
        version: "1.0" // Para futuras actualizaciones del formato
    };
};

/**
 * Extrae información de documentos de un mensaje multimodal guardado
 * @param {string} messageJson - JSON del mensaje multimodal
 * @returns {Array} - Lista de documentos referenciados
 */
export const extractDocumentReferencesFromMessage = (messageJson) => {
    try {
        const message = typeof messageJson === 'string' ? JSON.parse(messageJson) : messageJson;
        
        if (!message.documents || !Array.isArray(message.documents)) {
            return [];
        }
        
        return message.documents.map(doc => ({
            fileId: doc.fileId,
            originalName: doc.originalName,
            attachmentType: doc.attachmentType,
            language: doc.language,
            fileSize: doc.fileSize,
            hasContent: doc.hasContent,
            processedAt: doc.processedAt
        }));
    } catch (error) {
        console.error("Error extrayendo referencias de documentos:", error);
        return [];
    }
};

/**
 * Extrae información de imágenes de un mensaje multimodal guardado
 * @param {string} messageJson - JSON del mensaje multimodal
 * @returns {Array} - Lista de imágenes referenciadas
 */
export const extractImageReferencesFromMessage = (messageJson) => {
    try {
        const message = typeof messageJson === 'string' ? JSON.parse(messageJson) : messageJson;
        
        if (!message.images || !Array.isArray(message.images)) {
            return [];
        }
        
        return message.images.map(img => ({
            path: img.path,
            security: img.security,
            processedAt: img.processedAt
        }));
    } catch (error) {
        console.error("Error extrayendo referencias de imágenes:", error);
        return [];
    }
};

/**
 * Genera un resumen legible de archivos adjuntos para mostrar en el frontend
 * @param {string} messageJson - JSON del mensaje multimodal
 * @returns {Object} - Resumen de archivos adjuntos
 */
export const generateAttachmentsSummaryFromMessage = (messageJson) => {
    try {
        const message = typeof messageJson === 'string' ? JSON.parse(messageJson) : messageJson;
        
        const documents = extractDocumentReferencesFromMessage(message);
        const images = extractImageReferencesFromMessage(message);
        
        return {
            hasAttachments: documents.length > 0 || images.length > 0,
            documentCount: documents.length,
            imageCount: images.length,
            totalAttachments: documents.length + images.length,
            
            // Resumen de documentos
            documentSummary: documents.length > 0 ? {
                count: documents.length,
                types: [...new Set(documents.map(doc => doc.attachmentType))],
                languages: [...new Set(documents.map(doc => doc.language).filter(Boolean))],
                names: documents.slice(0, 3).map(doc => doc.originalName) // Solo primeros 3
            } : null,
            
            // Resumen de imágenes
            imageSummary: images.length > 0 ? {
                count: images.length,
                scanned: images.filter(img => img.security?.scanned).length,
                clean: images.filter(img => img.security?.clean).length
            } : null,
            
            // Errores si los hay
            hasErrors: message.processingErrors && message.processingErrors.length > 0,
            errorCount: message.processingErrors ? message.processingErrors.length : 0
        };
    } catch (error) {
        console.error("Error generando resumen de archivos adjuntos:", error);
        return {
            hasAttachments: false,
            documentCount: 0,
            imageCount: 0,
            totalAttachments: 0,
            documentSummary: null,
            imageSummary: null,
            hasErrors: true,
            errorCount: 1
        };
    }
};

/**
 * EJEMPLO DE ESTRUCTURA JSON GUARDADA EN CHAT_HISTORY:
 * 
 * {
 *   "text": "Analiza este código y el documento adjunto",
 *   "hasImage": false,
 *   "hasDocuments": true,
 *   "imageCount": 0,
 *   "documentCount": 2,
 *   "totalImageCount": 0,
 *   "totalDocumentCount": 2,
 *   "images": [],
 *   "documents": [
 *     {
 *       "type": "document_reference",
 *       "fileId": "123e4567-e89b-12d3-a456-426614174000",
 *       "originalName": "algorithm.py",
 *       "attachmentType": "code",
 *       "language": "python",
 *       "fileSize": 2048,
 *       "filePath": "/uploads/chat_documents/abc123/algorithm_1234567890_abcd1234.py",
 *       "hasContent": true,
 *       "contentLength": 1850,
 *       "processedAt": "2024-01-15T10:30:00Z"
 *     },
 *     {
 *       "type": "document_reference",
 *       "fileId": "987f6543-e21c-43d2-b456-123456789abc",
 *       "originalName": "manual.docx",
 *       "attachmentType": "document",
 *       "language": null,
 *       "fileSize": 15360,
 *       "filePath": "/uploads/chat_documents/abc123/manual_1234567890_efgh5678.docx",
 *       "hasContent": true,
 *       "contentLength": 5200,
 *       "processedAt": "2024-01-15T10:30:01Z"
 *     }
 *   ],
 *   "processingErrors": [],
 *   "securityInfo": null,
 *   "processedAt": "2024-01-15T10:30:01Z",
 *   "version": "1.0"
 * }
 */