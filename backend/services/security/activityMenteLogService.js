// services/activityMenteLogService.js
import pool from "../../lib/dbPool.js";

/**
 * Servicio para gestionar el registro de actividades
 */
const activityMenteLogService = {
  /**
   * Registra una nueva actividad
   * @param {Object} activity - Datos de la actividad
   * @returns {Promise<Object>} - Actividad registrada
   */
  async logActivity(activity) {
    const {
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      id_usuario,
      usuario_nombre
    } = activity;

    const query = `
      INSERT INTO activity_log (
        action_type, entity_type, entity_id, entity_name, 
        description, id_usuario, usuario_nombre
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      action_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      id_usuario,
      usuario_nombre
    ];

    try {
      const { rows } = await pool.query(query, values);
      return { success: true, activity: rows[0] };
    } catch (error) {
      console.error("Error al registrar actividad:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene las actividades más recientes
   * @param {number} limit - Número máximo de actividades a retornar
   * @returns {Promise<Object>} - Lista de actividades
   */
  async getRecentActivities(limit = 10) {
    const query = `
      SELECT * FROM activity_log
      ORDER BY created_at DESC
      LIMIT $1
    `;

    try {
      const { rows } = await pool.query(query, [limit]);
      return { success: true, activities: rows };
    } catch (error) {
      console.error("Error al obtener actividades recientes:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene el nombre completo de un usuario por su ID
   * @param {number} userId - ID del usuario
   * @returns {Promise<string>} - Nombre completo del usuario
   */
  async getUserName(userId) {
    try {
      const query = `
        SELECT p.nombre, p.apellido 
        FROM perfil p 
        WHERE p.id_usuario = $1
      `;
      
      const { rows } = await pool.query(query, [userId]);
      
      if (rows.length > 0) {
        const { nombre, apellido } = rows[0];
        return `${nombre || ''} ${apellido || ''}`.trim();
      }
      
      return "Administrador";
    } catch (error) {
      console.error("Error al obtener nombre de usuario:", error);
      return "Administrador";
    }
  }
};

export default activityMenteLogService;