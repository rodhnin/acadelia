// services/chat/avaService.js
import pool from "../../lib/dbPool.js";
import { createEmbeddingTable, deleteEmbeddingTable } from "./embeddingAvaService.js";

const createAva = async ({ nom_ava, descripcion, id_carrera, imagen, slug, embedding_table_name }) => {
  if (!nom_ava) throw new Error("El nombre del AVA es obligatorio");
  if (!id_carrera) throw new Error("El ID de la carrera es obligatorio");
  if (!slug) throw new Error("El slug del AVA es obligatorio");

  // Verificar si ya existe un AVA con este nombre
  const checkQuery = "SELECT id_ava FROM ava WHERE nom_ava = $1";
  const checkResult = await pool.query(checkQuery, [nom_ava]);
  
  if (checkResult.rows.length > 0) {
    throw new Error("Ya existe un AVA con este nombre");
  }

  // Iniciar una transacción para garantizar que todo se complete correctamente
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtener el siguiente ID disponible
    const nextIdQuery = "SELECT COALESCE(MAX(id_ava), 0) + 1 AS next_id FROM ava";
    const nextIdResult = await client.query(nextIdQuery);
    const nextId = nextIdResult.rows[0].next_id;
    
    // Usar el nombre de tabla proporcionado o generar uno automáticamente si no se proporciona
    let embeddingTableName;
    if (embedding_table_name && embedding_table_name.trim() !== '') {
      // Validar y formatear el nombre de tabla proporcionado para evitar problemas
      embeddingTableName = embedding_table_name.trim()
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .toLowerCase();
      
      // Asegurar que tenga el prefijo 'emb_' para consistencia
      if (!embeddingTableName.startsWith('emb_')) {
        embeddingTableName = 'emb_' + embeddingTableName;
      }
    } else {
      // Si no se proporciona un nombre, crear uno basado en el slug y el ID
      embeddingTableName = await createEmbeddingTable(slug, nextId);
    }
    
    // Verificar si la tabla ya existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `;
    const tableExists = await client.query(checkTableQuery, [embeddingTableName]);
    
    if (tableExists.rows[0].exists) {
      throw new Error(`La tabla de embeddings ${embeddingTableName} ya existe. Por favor elige otro nombre.`);
    }
    
    // Crear la tabla de embeddings con el nombre seleccionado
    await client.query(`
      -- Asegurar que la extensión pgvector está habilitada
      CREATE EXTENSION IF NOT EXISTS vector;
      
      -- Crear la tabla para almacenar los documentos y embeddings
      CREATE TABLE ${embeddingTableName} (
        id BIGSERIAL PRIMARY KEY,
        content TEXT,
        metadata JSONB,
        embedding VECTOR(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Crear la función para búsqueda por similitud
      CREATE OR REPLACE FUNCTION match_${embeddingTableName} (
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
          ${embeddingTableName}.id,
          ${embeddingTableName}.content,
          ${embeddingTableName}.metadata,
          1 - (${embeddingTableName}.embedding <=> query_embedding) AS similarity
        FROM ${embeddingTableName}
        WHERE ${embeddingTableName}.metadata @> filter
        ORDER BY ${embeddingTableName}.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
      
      -- Crear la función para búsqueda por palabras clave
      CREATE OR REPLACE FUNCTION kw_match_${embeddingTableName}(
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
            ${embeddingTableName}.id, 
            ${embeddingTableName}.content, 
            ${embeddingTableName}.metadata, 
            ts_rank(to_tsvector(${embeddingTableName}.content), plainto_tsquery($1)) AS similarity
          FROM ${embeddingTableName}
          WHERE to_tsvector(${embeddingTableName}.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Crear índice para mejorar el rendimiento de las consultas
      CREATE INDEX ON ${embeddingTableName} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `);
    
    // Insertar el nuevo AVA incluyendo el nombre de la tabla de embeddings
    const insertQuery = `
      INSERT INTO ava (id_ava, nom_ava, descripcion, id_carrera, imagen, slug, embedding_table_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [nextId, nom_ava, descripcion, id_carrera, imagen, slug, embeddingTableName];
    const { rows } = await client.query(insertQuery, values);
    
    await client.query('COMMIT');
    return rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al crear AVA:", error);
    throw new Error(`No se pudo crear el AVA: ${error.message}`);
    
  } finally {
    client.release();
  }
};

const getAllAvas = async () => {
  const query = "SELECT * FROM ava";
  const { rows } = await pool.query(query);
  return rows;
};

const getAvasByCarrera = async (id_carrera) => {
  if (!id_carrera) throw new Error("El ID de la carrera es obligatorio");

  try {
    const query = "SELECT * FROM ava WHERE id_carrera = $1";
    const { rows } = await pool.query(query, [id_carrera]);
    return rows;
  } catch (error) {
    console.error("Error al obtener las AVAs por carrera:", error);
    throw new Error("No se pudieron obtener las AVAs.");
  }
};

const updateAva = async ({ id, nom_ava, descripcion, id_carrera, imagen, slug }) => {
  if (!id) throw new Error("El ID del AVA es obligatorio");
  if (!nom_ava) throw new Error("El nombre del AVA es obligatorio");
  if (!id_carrera) throw new Error("El ID de la carrera es obligatorio");

  const query = `
    UPDATE ava
    SET nom_ava = $1, descripcion = $2, id_carrera = $3, imagen = $4, slug = $5
    WHERE id_ava = $6
    RETURNING *;
  `;
  const values = [nom_ava, descripcion, id_carrera, imagen, slug, id];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const deleteAva = async (id) => {
  if (!id) throw new Error("El ID del AVA es obligatorio");

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtener la información del AVA, incluyendo el nombre de su tabla de embeddings
    const getAvaQuery = "SELECT * FROM ava WHERE id_ava = $1";
    const avaResult = await client.query(getAvaQuery, [id]);
    
    if (avaResult.rowCount === 0) {
      throw new Error("No se encontró el AVA a eliminar.");
    }
    
    const ava = avaResult.rows[0];
    
    // Eliminar la tabla de embeddings asociada si existe
    if (ava.embedding_table_name) {
      await deleteEmbeddingTable(ava.embedding_table_name);
    }
    
    // Eliminar el AVA
    const deleteAvaQuery = "DELETE FROM ava WHERE id_ava = $1 RETURNING *;";
    await client.query(deleteAvaQuery, [id]);
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error al eliminar AVA:", error);
    throw new Error(`No se pudo eliminar el AVA: ${error.message}`);
    
  } finally {
    client.release();
  }
};

// Obtener un AVA por ID
const getAvaById = async (id) => {
  if (!id) throw new Error("El ID del AVA es obligatorio");

  const query = "SELECT * FROM ava WHERE id_ava = $1";
  const { rows } = await pool.query(query, [id]);
  
  if (rows.length === 0) {
    throw new Error("No se encontró el AVA con el ID especificado.");
  }
  
  return rows[0];
};

export { createAva, getAllAvas, getAvasByCarrera, updateAva, deleteAva, getAvaById };