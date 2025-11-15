// services/chat/pdfEmbeddingAvaService.js
import { Mistral } from '@mistralai/mistralai';
import { MistralConfig } from '../../lib/mistralConfig.js';
import { embeddings } from '../../lib/openai.js';
import pool from '../../lib/dbPool.js';

/**
 * Servicio para procesar PDFs y guardar su contenido en tablas de embeddings de AVAs
 */
const pdfEmbeddingAvaService = {
  /**
   * Inicializa el cliente de Mistral
   * @param {string} apiKey - La API key de Mistral (opcional, por defecto usa la de config)
   * @returns {Mistral} - Cliente inicializado
   */
  initMistralClient(apiKey = MistralConfig.apiKey) {
    if (!apiKey) {
      throw new Error('API key de Mistral no proporcionada');
    }
    return new Mistral({ apiKey });
  },

  /**
   * Procesa un archivo PDF con Mistral OCR y guarda su contenido en la tabla de embeddings del AVA
   * @param {Object} options - Opciones de procesamiento
   * @param {Buffer} options.fileBuffer - Buffer del archivo PDF
   * @param {number} options.avaId - ID del AVA donde guardar los embeddings
   * @param {number} options.userId - ID del usuario que sube el archivo
   * @param {string} options.filename - Nombre original del archivo
   * @param {Function} options.progressCallback - Función para reportar progreso (opcional)
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async processPDF({ fileBuffer, avaId, userId, filename = 'document.pdf', progressCallback = null }) {
    const startTime = Date.now();
    
    const updateProgress = (progress, message) => {
      if (typeof progressCallback === 'function') {
        progressCallback(progress, message);
      }
    };
    
    try {
      // 1. Verificar que el AVA existe y tiene una tabla de embeddings
      updateProgress(5, 'Verificando tabla de embeddings');
      const avaInfo = await this.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return {
          success: false,
          error: avaInfo.error || 'No se pudo obtener información del AVA'
        };
      }
      
      const embeddingTableName = avaInfo.tableName;
      console.log(`Usando tabla de embeddings: ${embeddingTableName}`);
      
      // 2. Iniciar cliente de Mistral
      updateProgress(10, 'Conectando con Mistral OCR');
      const client = this.initMistralClient();
      
      // 3. Subir el archivo a Mistral
      updateProgress(20, 'Subiendo archivo a Mistral OCR');
      console.log(`Subiendo archivo a Mistral: ${filename}`);
      const uploadedFile = await client.files.upload({
        file: {
          fileName: filename,
          content: fileBuffer,
        },
        purpose: "ocr"
      });
      
      console.log(`Archivo subido con éxito. ID: ${uploadedFile.id}`);
      
      // 4. Obtener URL firmada para el archivo
      updateProgress(30, 'Obteniendo URL firmada');
      const signedUrl = await client.files.getSignedUrl({
        fileId: uploadedFile.id,
      });
      
      // 5. Procesar con OCR
      updateProgress(40, 'Procesando con OCR');
      console.log("Procesando archivo con OCR...");
      const ocrResponse = await client.ocr.process({
        model: MistralConfig.model,
        document: {
          type: "document_url",
          documentUrl: signedUrl.url,
        },
        include_image_base64: MistralConfig.ocrOptions?.includeImageBase64 || false
      });
      
      updateProgress(60, 'Extracción OCR completada');
      
      if (!ocrResponse.pages || !Array.isArray(ocrResponse.pages)) {
        console.warn("La respuesta OCR no contiene la estructura esperada de páginas");
        return {
          success: false,
          error: 'La respuesta de Mistral OCR no contiene la estructura esperada',
          details: 'No se encontraron páginas en la respuesta'
        };
      }
      
      // 6. Procesar cada página y guardar en la tabla de embeddings
      console.log(`Procesando ${ocrResponse.pages.length} páginas...`);
      updateProgress(70, `Procesando ${ocrResponse.pages.length} páginas`);
      
      const results = [];
      let totalPages = ocrResponse.pages.length;
      
      for (let i = 0; i < ocrResponse.pages.length; i++) {
        const page = ocrResponse.pages[i];
        const pageNumber = i + 1;
        
        if (!page.markdown) {
          console.warn(`Página ${pageNumber} sin contenido`);
          continue;
        }
        
        updateProgress(70 + (i / totalPages) * 20, `Procesando página ${pageNumber} de ${totalPages}`);
        
        const metadata = {
          filename: filename,
          page: pageNumber,
          totalPages: totalPages,
          userId: userId,
          avaId: avaId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          source: 'mistral_ocr'
        };
        
        console.log(`Generando embedding para página ${pageNumber}`);
        const embedding = await this.generateEmbedding(page.markdown);
        
        if (!embedding) {
          console.warn(`No se pudo generar embedding para página ${pageNumber}`);
          continue;
        }
        
        const savedPage = await this.saveToEmbeddingTable(
          embeddingTableName,
          page.markdown,
          metadata,
          embedding
        );
        
        results.push({
          page: pageNumber,
          success: savedPage.success,
          id: savedPage.id
        });
      }
      
      updateProgress(95, 'Finalizando procesamiento');
      
      // 7. Limpiar el archivo de Mistral si es necesario (opcional)
      // await this.deleteMistralFile(uploadedFile.id);
      
      // 8. Retornar resultado
      const processingTime = Date.now() - startTime;
      
      updateProgress(100, 'Procesamiento completado');
      
      return {
        success: true,
        pages: results.length,
        successfulPages: results.filter(r => r.success).length,
        failedPages: results.filter(r => !r.success).length,
        processingTime: processingTime,
        metadata: {
          filename: filename,
          avaId: avaId,
          userId: userId,
          tableName: embeddingTableName,
          mistralFileId: uploadedFile.id
        },
        pageResults: results
      };
    } catch (error) {
      console.error('Error procesando PDF:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack
      };
    }
  },
  
  /**
   * Obtiene el nombre de la tabla de embeddings para un AVA
   * @param {number} avaId - ID del AVA
   * @returns {Promise<Object>} - Información de la tabla de embeddings
   */
  async getAvaEmbeddingTable(avaId) {
    try {
      const query = `
        SELECT id_ava, nom_ava, embedding_table_name 
        FROM ava 
        WHERE id_ava = $1
      `;
      
      const result = await pool.query(query, [avaId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: `No se encontró AVA con ID ${avaId}`
        };
      }
      
      const ava = result.rows[0];
      
      if (!ava.embedding_table_name) {
        return {
          success: false,
          error: `El AVA con ID ${avaId} no tiene una tabla de embeddings configurada`
        };
      }
      
      return {
        success: true,
        avaId: ava.id_ava,
        avaName: ava.nom_ava,
        tableName: ava.embedding_table_name
      };
    } catch (error) {
      console.error('Error obteniendo tabla de embeddings:', error);
      return {
        success: false,
        error: `Error obteniendo tabla de embeddings: ${error.message}`
      };
    }
  },
  
  /**
   * Genera un embedding para un texto utilizando OpenAI
   * @param {string} text - Texto para generar embedding
   * @returns {Promise<Array<number>>} - Vector de embedding
   */
  async generateEmbedding(text) {
    try {
      // Limitar el texto si es muy largo (el modelo embedding tiene límites)
      const maxLength = 8000; // Ajustar según el modelo
      const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;
      
      const result = await embeddings.embedQuery(truncatedText);
      return result;
    } catch (error) {
      console.error('Error generando embedding:', error);
      return null;
    }
  },
  
  /**
   * Guarda un documento en la tabla de embeddings
   * @param {string} tableName - Nombre de la tabla de embeddings
   * @param {string} content - Contenido del documento
   * @param {Object} metadata - Metadatos del documento
   * @param {Array<number>} embedding - Vector de embedding
   * @returns {Promise<Object>} - Resultado de la operación
   */
async saveToEmbeddingTable(tableName, content, metadata, embedding) {
  try {
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `;
    
    const tableExists = await pool.query(tableCheckQuery, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      throw new Error(`La tabla ${tableName} no existe`);
    }
    
    // Este formato es el que funciona en PDFStorageService.js
    let formattedEmbedding;
    
    if (Array.isArray(embedding)) {
      // Si es un array, formatearlo como string con corchetes
      formattedEmbedding = `[${embedding.join(',')}]`;
    } else if (typeof embedding === 'string') {
      // Si ya es un string, asegurarse de que use corchetes en lugar de llaves
      if (embedding.startsWith('{') && embedding.endsWith('}')) {
        formattedEmbedding = `[${embedding.substring(1, embedding.length - 1)}]`;
      } else if (!embedding.startsWith('[')) {
        formattedEmbedding = `[${embedding}]`;
      } else {
        formattedEmbedding = embedding;
      }
    } else {
      // Si no es array ni string, intentar convertirlo
      formattedEmbedding = `[${Object.values(embedding).join(',')}]`;
    }
    
    console.log(`Guardando embedding en formato correcto para pgvector: ${formattedEmbedding.substring(0, 50)}...`);
    
    const query = `
      INSERT INTO ${tableName} (content, metadata, embedding)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    
    const values = [
      content,
      metadata,
      formattedEmbedding  // Usar el embedding formateado correctamente
    ];
    
    const result = await pool.query(query, values);
    
    return {
      success: true,
      id: result.rows[0].id
    };
  } catch (error) {
    console.error(`Error guardando en tabla ${tableName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
},
  
  /**
   * Elimina un archivo de Mistral
   * @param {string} fileId - ID del archivo en Mistral
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async deleteMistralFile(fileId) {
    try {
      const client = this.initMistralClient();
      await client.files.delete({
        fileId: fileId
      });
      
      return {
        success: true,
        message: `Archivo ${fileId} eliminado de Mistral`
      };
    } catch (error) {
      console.error(`Error eliminando archivo de Mistral:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Cuenta cuántos documentos hay en la tabla de embeddings para un archivo específico
   * @param {number} avaId - ID del AVA
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<Object>} - Resultado del conteo
   */
  async countDocuments(avaId, filename) {
    try {
      const tableInfo = await this.getAvaEmbeddingTable(avaId);
      
      if (!tableInfo.success) {
        return tableInfo; // Devuelve el error
      }
      
      const query = `
        SELECT COUNT(*) as count
        FROM ${tableInfo.tableName}
        WHERE metadata->>'filename' = $1
      `;
      
      const result = await pool.query(query, [filename]);
      
      return {
        success: true,
        count: parseInt(result.rows[0].count),
        tableName: tableInfo.tableName
      };
    } catch (error) {
      console.error('Error contando documentos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Elimina los documentos de un archivo específico
   * @param {number} avaId - ID del AVA
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deleteDocuments(avaId, filename) {
    try {
      const tableInfo = await this.getAvaEmbeddingTable(avaId);
      
      if (!tableInfo.success) {
        return tableInfo; // Devuelve el error
      }
      
      const query = `
        DELETE FROM ${tableInfo.tableName}
        WHERE metadata->>'filename' = $1
        RETURNING id
      `;
      
      const result = await pool.query(query, [filename]);
      
      return {
        success: true,
        deleted: result.rows.length,
        tableName: tableInfo.tableName
      };
    } catch (error) {
      console.error('Error eliminando documentos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Lista los archivos procesados para un AVA
   * @param {number} avaId - ID del AVA
   * @returns {Promise<Object>} - Lista de archivos procesados
   */
  async listProcessedFiles(avaId) {
    try {
      const tableInfo = await this.getAvaEmbeddingTable(avaId);
      
      if (!tableInfo.success) {
        return tableInfo; // Devuelve el error
      }
      
      // Consultar archivos únicos
      const query = `
        SELECT 
          metadata->>'filename' as filename,
          COUNT(*) as pages,
          MAX(created_at) as last_updated,
          MIN(created_at) as uploaded_at
        FROM ${tableInfo.tableName}
        WHERE metadata->>'filename' IS NOT NULL
        GROUP BY metadata->>'filename'
        ORDER BY uploaded_at DESC
      `;
      
      const result = await pool.query(query);
      
      return {
        success: true,
        files: result.rows,
        count: result.rows.length,
        tableName: tableInfo.tableName
      };
    } catch (error) {
      console.error('Error listando archivos procesados:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default pdfEmbeddingAvaService;