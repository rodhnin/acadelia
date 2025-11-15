// controllers/usuarios/paisesUniControllers.js - Versión expandida

import pool from "../../lib/dbPool.js"; // Importa el pool de conexión

export const getAllPaises = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM pais ORDER BY nombre_pais");
    
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error al obtener países:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getPaisById = async (req, res) => {
  const { idPais } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM pais WHERE id_pais = $1",
      [idPais]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "País no encontrado" 
      });
    }
    
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("Error al obtener país:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getUniversidadesByPais = async (req, res) => {
  const { idPais } = req.params;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM universidad WHERE id_pais = $1 ORDER BY nom_universidad",
      [idPais]
    );
    
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error al obtener universidades:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getUniversidadById = async (req, res) => {
  const { idUniversidad } = req.params;

  try {
    const query = `
      SELECT u.*, p.nombre_pais 
      FROM universidad u
      JOIN pais p ON u.id_pais = p.id_pais
      WHERE u.id_universidad = $1
    `;
    
    const { rows } = await pool.query(query, [idUniversidad]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Universidad no encontrada" 
      });
    }
    
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("Error al obtener universidad:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getUsersByPais = async (req, res) => {
  const { idPais } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const offset = (page - 1) * limit;

  try {
    // Consulta que une todas las tablas necesarias
    const query = `
      SELECT u.id_user, u.correo, p.nombre, p.apellido, 
             univ.nom_universidad, pais.nombre_pais,
             COUNT(s.id) as suscripciones_activas,
             (SELECT COUNT(*) FROM transaccion t WHERE t.id_user = u.id_user) as total_transacciones
      FROM usuario u
      LEFT JOIN perfil p ON u.id_user = p.id_usuario
      LEFT JOIN universidad univ ON p.id_universidad = univ.id_universidad
      LEFT JOIN pais ON univ.id_pais = pais.id_pais
      LEFT JOIN suscripcion s ON u.id_user = s.id_user AND s.status = 'active'
      WHERE pais.id_pais = $1
      GROUP BY u.id_user, u.correo, p.nombre, p.apellido, univ.nom_universidad, pais.nombre_pais
      ORDER BY u.id_user
      LIMIT $2 OFFSET $3
    `;
    
    const { rows } = await pool.query(query, [idPais, limit, offset]);
    
    // Consulta para obtener el total de usuarios
    const countQuery = `
      SELECT COUNT(DISTINCT u.id_user) as total
      FROM usuario u
      LEFT JOIN perfil p ON u.id_user = p.id_usuario
      LEFT JOIN universidad univ ON p.id_universidad = univ.id_universidad
      LEFT JOIN pais ON univ.id_pais = pais.id_pais
      WHERE pais.id_pais = $1
    `;
    
    const countResult = await pool.query(countQuery, [idPais]);
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener usuarios por país:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getUsersByUniversidad = async (req, res) => {
  const { idUniversidad } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const offset = (page - 1) * limit;

  try {
    // Consulta que une todas las tablas necesarias
    const query = `
      SELECT u.id_user, u.correo, p.nombre, p.apellido, 
             univ.nom_universidad, pais.nombre_pais,
             COUNT(s.id) as suscripciones_activas,
             (SELECT COUNT(*) FROM transaccion t WHERE t.id_user = u.id_user) as total_transacciones
      FROM usuario u
      LEFT JOIN perfil p ON u.id_user = p.id_usuario
      LEFT JOIN universidad univ ON p.id_universidad = univ.id_universidad
      LEFT JOIN pais ON univ.id_pais = pais.id_pais
      LEFT JOIN suscripcion s ON u.id_user = s.id_user AND s.status = 'active'
      WHERE univ.id_universidad = $1
      GROUP BY u.id_user, u.correo, p.nombre, p.apellido, univ.nom_universidad, pais.nombre_pais
      ORDER BY u.id_user
      LIMIT $2 OFFSET $3
    `;
    
    const { rows } = await pool.query(query, [idUniversidad, limit, offset]);
    
    // Consulta para obtener el total de usuarios
    const countQuery = `
      SELECT COUNT(DISTINCT u.id_user) as total
      FROM usuario u
      LEFT JOIN perfil p ON u.id_user = p.id_usuario
      LEFT JOIN universidad univ ON p.id_universidad = univ.id_universidad
      WHERE univ.id_universidad = $1
    `;
    
    const countResult = await pool.query(countQuery, [idUniversidad]);
    const total = parseInt(countResult.rows[0].total);
    
    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener usuarios por universidad:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const getUniversidadesWithUserCount = async (req, res) => {
  try {
    const query = `
      SELECT u.id_universidad, u.nom_universidad, p.id_pais, p.nombre_pais,
             COUNT(DISTINCT perfil.id_usuario) as total_usuarios
      FROM universidad u
      LEFT JOIN pais p ON u.id_pais = p.id_pais
      LEFT JOIN perfil ON u.id_universidad = perfil.id_universidad
      GROUP BY u.id_universidad, u.nom_universidad, p.id_pais, p.nombre_pais
      ORDER BY total_usuarios DESC
    `;
    
    const { rows } = await pool.query(query);
    
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error al obtener universidades con conteo de usuarios:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};