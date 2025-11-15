import pool from "../lib/dbPool.js";

/**
 * Verifica si un usuario es menor de edad según su perfil
 * @param {number} userId - ID del usuario
 * @returns {Promise<boolean>} - true si es menor de edad, false si es mayor o desconocido
 */
export async function isMinor(userId) {
  if (!userId) return false;
  
  try {
    const query = `
      SELECT nacimiento 
      FROM perfil 
      WHERE id_usuario = $1
    `;
    
    const { rows } = await pool.query(query, [userId]);
    
    if (rows.length === 0 || !rows[0].nacimiento) {
      return false; // No hay perfil o fecha de nacimiento
    }
    
    const birthDate = new Date(rows[0].nacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    
    // Ajustar por mes y día
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Considerar menor de edad si tiene menos de 16 años (estándar GDPR)
    return age < 16;
  } catch (error) {
    console.error("Error verificando edad del usuario:", error);
    return false; // En caso de error, asumir que no es menor
  }
}

/**
 * Obtiene la edad de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<number|null>} - Edad del usuario o null si no se encuentra
 */
export async function getUserAge(userId) {
  if (!userId) return null;
  
  try {
    const query = `
      SELECT nacimiento 
      FROM perfil 
      WHERE id_usuario = $1
    `;
    
    const { rows } = await pool.query(query, [userId]);
    
    if (rows.length === 0 || !rows[0].nacimiento) {
      return null; // No hay perfil o fecha de nacimiento
    }
    
    const birthDate = new Date(rows[0].nacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    
    // Ajustar por mes y día
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error("Error obteniendo edad del usuario:", error);
    return null;
  }
}