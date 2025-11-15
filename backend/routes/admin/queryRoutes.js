// routes/api/queryRoutes.js
import express from 'express';
import { authenticateUser } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/adminMiddleware.js';
import pool from '../../lib/dbPool.js';
import pdfEmbeddingAvaService from '../../services/chat/pdfEmbeddingAvaService.js';

const router = express.Router();

/**
 * @route POST /api/query/embedding
 * @desc Ejecuta una consulta SQL en una tabla de embeddings
 * @access Private (Admin)
 */
router.post(
  '/embedding',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { query, avaId } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una consulta SQL'
        });
      }
      
      if (!avaId) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA'
        });
      }
      
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return res.status(400).json({
          success: false,
          error: avaInfo.error
        });
      }
      
      if (!isQuerySafe(query, avaInfo.tableName)) {
        return res.status(400).json({
          success: false,
          error: 'Consulta no permitida por motivos de seguridad'
        });
      }
      
      const { rows } = await pool.query(query);
      
      // Responder con los resultados
      res.status(200).json({
        success: true,
        data: rows
      });
      
    } catch (error) {
      console.error('Error al ejecutar consulta de embeddings:', error);
      res.status(500).json({
        success: false,
        error: 'Error al ejecutar consulta',
        details: error.message
      });
    }
  }
);

// Endpoint para obtener información de páginas de un archivo
router.post(
  '/embedding/pages',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { avaId, filename } = req.body;
      
      if (!avaId) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un ID de AVA'
        });
      }
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un nombre de archivo'
        });
      }
      
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return res.status(400).json({
          success: false,
          error: avaInfo.error
        });
      }
      
      // Consulta para obtener información básica de todas las páginas
      const query = `
        SELECT 
          (metadata->>'page')::int as page_number,
          created_at
        FROM ${avaInfo.tableName}
        WHERE metadata->>'filename' = $1
        ORDER BY (metadata->>'page')::int ASC
      `;
      
      const { rows } = await pool.query(query, [filename]);
      
      // Responder con los resultados
      res.status(200).json({
        success: true,
        avaId,
        filename,
        totalPages: rows.length,
        pages: rows
      });
      
    } catch (error) {
      console.error('Error al obtener páginas de embedding:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener páginas',
        details: error.message
      });
    }
  }
);

// Endpoint para obtener una página específica
router.post(
  '/embedding/page',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { avaId, filename, pageNumber } = req.body;
      
      if (!avaId || !filename || pageNumber === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere avaId, filename y pageNumber'
        });
      }
      
      const avaInfo = await pdfEmbeddingAvaService.getAvaEmbeddingTable(avaId);
      
      if (!avaInfo.success) {
        return res.status(400).json({
          success: false,
          error: avaInfo.error
        });
      }
      
      // Consulta para obtener el contenido de una página específica
      const query = `
        SELECT content, metadata, created_at
        FROM ${avaInfo.tableName}
        WHERE 
          metadata->>'filename' = $1 AND
          (metadata->>'page')::int = $2
        LIMIT 1
      `;
      
      const { rows } = await pool.query(query, [filename, pageNumber]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Página no encontrada'
        });
      }
      
      // Responder con los resultados
      res.status(200).json({
        success: true,
        data: rows[0]
      });
      
    } catch (error) {
      console.error('Error al obtener página específica de embedding:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener página',
        details: error.message
      });
    }
  }
);

/**
 * Verifica que una consulta sea segura
 * @param {string} query - Consulta SQL
 * @param {string} tableName - Nombre de la tabla permitida
 * @returns {boolean} - true si la consulta es segura
 */
function isQuerySafe(query, tableName) {
  
  const lowerQuery = query.toLowerCase().trim();
  const lowerTableName = tableName.toLowerCase().trim();
  
  console.log("Validando consulta:", lowerQuery);
  console.log("Tabla permitida:", lowerTableName);
  
  if (!lowerQuery.startsWith('select')) {
    console.log("Rechazada: No es una consulta SELECT");
    return false;
  }
  
  // Nota: usamos una verificación menos estricta aquí
  if (!lowerQuery.includes(lowerTableName)) {
    console.log("Rechazada: No incluye la tabla permitida");
    return false;
  }
  
  const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create'];
  if (forbiddenKeywords.some(keyword => lowerQuery.includes(` ${keyword} `))) {
    console.log("Rechazada: Contiene palabra clave prohibida");
    return false;
  }
  
  if (lowerQuery.includes('->>') && !lowerQuery.includes('metadata->>')) {
    console.log("Rechazada: Uso sospechoso del operador ->>");
    return false;
  }
  
  console.log("Consulta aprobada");
  return true;
}

export default router;