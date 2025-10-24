// services/usuarios/transactionService.js
import pool from "../../lib/dbPool.js";

export const getUserTransactions = async (userId) => {
    try {
        const query = `
            SELECT 
                ht.*,
                u.correo,
                u.google_id
            FROM historial_transacciones ht
            INNER JOIN usuario u ON ht.id_user = u.id_user
            WHERE ht.id_user = $1
            ORDER BY ht.updated_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error al obtener las transacciones: ${error.message}`);
    }
};

