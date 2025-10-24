import pool from '../../lib/dbPool.js';

const getUserAvailableCarreras = async (idUser) => {
  try {
    // Primero obtenemos todas las carreras excepto las que tienen suscripción activa o pausada
    const query = `
      SELECT c.* 
      FROM carrera c
      WHERE NOT EXISTS (
        SELECT 1 
        FROM suscripciones s 
        WHERE s.id_user = $1 
        AND s.id_carrera = c.id_carrera
        AND s.status IN ('active', 'paused')
      )
    `;

    const { rows } = await pool.query(query, [idUser]);
    return rows;
  } catch (error) {
    throw new Error(`Error en getUserAvailableCarreras: ${error.message}`);
  }
};

const getUserActiveCarreras = async (idUser) => {
  try {
    // Obtenemos todas las carreras a las que el usuario tiene suscripción activa o pausada
    const query = `
      SELECT c.* 
      FROM carrera c
      INNER JOIN suscripciones s ON c.id_carrera = s.id_carrera
      WHERE s.id_user = $1 
      AND s.status IN ('active', 'paused')
    `;

    const { rows } = await pool.query(query, [idUser]);
    return rows;
  } catch (error) {
    throw new Error(`Error en getUserActiveCarreras: ${error.message}`);
  }
};

export default {
  getUserAvailableCarreras,
  getUserActiveCarreras
};