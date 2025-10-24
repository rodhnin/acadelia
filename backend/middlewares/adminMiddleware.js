// backend/middlewares/adminMiddleware.js
import pool from "../lib/dbPool.js"; // Pool de conexión a la base de datos
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtener la ruta base del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Función helper para manejar 403 (Acceso prohibido)
const handle403 = (req, res) => {
    // Verificar si es una solicitud a la API
    if (req.path.startsWith('/api/') || req.xhr || req.get('accept')?.includes('application/json')) {
        return res.status(403).json({ 
            success: false, 
            error: 'Acceso denegado: se requiere rol de administrador', 
            status: 403 
        });
    }
    
    // Para solicitudes de páginas, mostrar la página 403
    const errorPath = path.join(projectRoot, 'frontend', 'views', 'error', '403.html');
    if (fs.existsSync(errorPath)) {
        return res.status(403).sendFile(errorPath);
    }
    
    // Si no existe la página 403 personalizada, enviar una respuesta básica
    res.status(403).send('Acceso prohibido');
};

export const isAdmin = async (req, res, next) => {
    try {
        // Verificar si el usuario está autenticado
        if (!req.user || !req.user.id_user) {
            console.log("Error: Usuario no autenticado");
            return res.status(401).json({ error: "Usuario no autenticado" });
        }

        // Si el id_rol está en el token y es admin, continuar
        if (req.user.id_rol === 3) {
            console.log("✅ Usuario verificado como admin por token JWT");
            return next();
        }
        
        // Si no, verificar en base de datos
        console.log("⚠️ Verificando rol en base de datos...");
        
        const rolQuery = `
            SELECT id_rol 
            FROM perfil 
            WHERE id_usuario = $1
        `;
        
        const result = await pool.query(rolQuery, [req.user.id_user]);
        console.log("Resultado de consulta BD:", result.rows);
        
        if (result.rows.length === 0 || result.rows[0].id_rol !== 3) {
            console.log("❌ No es admin según BD");
            return handle403(req, res);
        }
        
        console.log("✅ Usuario verificado como admin por BD");
        next();
        
    } catch (error) {
        console.error("Error verificando rol de administrador:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};