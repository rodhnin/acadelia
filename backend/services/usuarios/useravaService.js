import pool from "../../lib/dbPool.js";

const getUserActiveAvas = async (userId) => {
  try {
    const query = `
      SELECT a.* 
      FROM ava a
      INNER JOIN carrera c ON a.id_carrera = c.id_carrera
      INNER JOIN suscripciones s ON c.id_carrera = s.id_carrera
      WHERE s.id_user = $1 AND s.status IN ('active', 'paused')
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    throw new Error(`Error fetching active AVAs: ${error.message}`);
  }
};

export default {
  getUserActiveAvas
};