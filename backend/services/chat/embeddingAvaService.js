// services/chat/embeddingAvaService.js
import pool from "../../lib/dbPool.js";

/**
 * Crea una nueva tabla de embeddings para un AVA específico
 * @param {string} avaSlug - El slug del AVA para nombrar la tabla
 * @param {number} avaId - El ID del AVA para referencia
 * @returns {string} El nombre de la tabla creada
 */
export const createEmbeddingTable = async (avaSlug, avaId) => {
  const baseTableName = avaSlug.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  const tableName = `emb_${baseTableName}_${avaId}`;
  
  try {
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `;
    const tableExists = await pool.query(checkTableQuery, [tableName]);
    
    if (tableExists.rows[0].exists) {
      throw new Error(`La tabla de embeddings ${tableName} ya existe`);
    }
    
    const createTableQuery = `
      -- Asegurar que la extensión pgvector está habilitada
      CREATE EXTENSION IF NOT EXISTS vector;
      
      -- Crear la tabla para almacenar los documentos y embeddings
      CREATE TABLE ${tableName} (
        id BIGSERIAL PRIMARY KEY,
        content TEXT,
        metadata JSONB,
        embedding VECTOR(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Crear la función para búsqueda por similitud
      CREATE OR REPLACE FUNCTION match_${tableName} (
        query_embedding VECTOR(1536),
        match_count INT DEFAULT NULL,
        filter JSONB DEFAULT '{}'
      ) RETURNS TABLE (
        id BIGINT,
        content TEXT,
        metadata JSONB,
        similarity FLOAT
      )
      LANGUAGE plpgsql
      AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          ${tableName}.id,
          ${tableName}.content,
          ${tableName}.metadata,
          1 - (${tableName}.embedding <=> query_embedding) AS similarity
        FROM ${tableName}
        WHERE ${tableName}.metadata @> filter
        ORDER BY ${tableName}.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
      
      -- Crear la función para búsqueda por palabras clave
      CREATE OR REPLACE FUNCTION kw_match_${tableName}(
        query_text TEXT, 
        match_count INT
      )
      RETURNS TABLE (
        id BIGINT, 
        content TEXT, 
        metadata JSONB, 
        similarity REAL
      )
      AS $$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            ${tableName}.id, 
            ${tableName}.content, 
            ${tableName}.metadata, 
            ts_rank(to_tsvector(${tableName}.content), plainto_tsquery($1)) AS similarity
          FROM ${tableName}
          WHERE to_tsvector(${tableName}.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Crear índice para mejorar el rendimiento de las consultas
      CREATE INDEX ON ${tableName} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `;
    
    await pool.query(createTableQuery);
    
    return tableName;
  } catch (error) {
    console.error("Error al crear la tabla de embeddings:", error);
    throw new Error(`No se pudo crear la tabla de embeddings: ${error.message}`);
  }
};

/**
 * Inserta contenido con embeddings en la tabla específica de un AVA
 * @param {string} tableName - El nombre de la tabla donde insertar
 * @param {string} content - El contenido del documento
 * @param {Object} metadata - Metadatos asociados al documento
 * @param {Array} embedding - Vector de embedding
 * @returns {Object} El documento insertado
 */
export const insertEmbedding = async (tableName, content, metadata, embedding) => {
  try {
    const query = `
      INSERT INTO ${tableName} (content, metadata, embedding)
      VALUES ($1, $2, $3)
      RETURNING id, content, metadata, created_at;
    `;
    
    const values = [content, metadata, embedding];
    const { rows } = await pool.query(query, values);
    
    return rows[0];
  } catch (error) {
    console.error(`Error al insertar embedding en ${tableName}:`, error);
    throw new Error(`No se pudo insertar el embedding: ${error.message}`);
  }
};

/**
 * Busca documentos similares en la tabla de embeddings de un AVA
 * @param {string} tableName - El nombre de la tabla donde buscar
 * @param {Array} queryEmbedding - Vector de embedding para la consulta
 * @param {number} limit - Número máximo de resultados
 * @param {Object} filter - Filtro de metadatos opcional
 * @returns {Array} Documentos similares encontrados
 */
export const searchSimilarDocuments = async (tableName, queryEmbedding, limit = 5, filter = {}) => {
  try {
    const query = `
      SELECT * FROM match_${tableName}($1, $2, $3);
    `;
    
    const values = [queryEmbedding, limit, filter];
    const { rows } = await pool.query(query, values);
    
    return rows;
  } catch (error) {
    console.error(`Error al buscar documentos similares en ${tableName}:`, error);
    throw new Error(`Error en la búsqueda de similitud: ${error.message}`);
  }
};

/**
 * Elimina una tabla de embeddings
 * @param {string} tableName - El nombre de la tabla a eliminar
 */
export const deleteEmbeddingTable = async (tableName) => {
  try {
    if (!tableName.startsWith('emb_')) {
      throw new Error('Nombre de tabla inválido');
    }
    
    const dropFunctionsQuery = `
      DROP FUNCTION IF EXISTS match_${tableName};
      DROP FUNCTION IF EXISTS kw_match_${tableName};
    `;
    await pool.query(dropFunctionsQuery);
    
    const dropTableQuery = `DROP TABLE IF EXISTS ${tableName};`;
    await pool.query(dropTableQuery);
    
    return true;
  } catch (error) {
    console.error(`Error al eliminar la tabla ${tableName}:`, error);
    throw new Error(`No se pudo eliminar la tabla: ${error.message}`);
  }
};

export default {
  createEmbeddingTable,
  insertEmbedding,
  searchSimilarDocuments,
  deleteEmbeddingTable
};