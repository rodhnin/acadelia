import pool from "../../lib/dbPool.js";

// CACHÉ Y CONSTANTES (MANTENIDAS IGUAL)

let rolesCache = null;
let rolesCacheTime = null;
const CACHE_TTL = 3600000; // 1 hora

// FUNCIONES EXPORTADAS (MISMOS NOMBRES, REFACTORIZADAS INTERNAMENTE)

/**
 * Función para obtener todos los roles (REFACTORIZADA - sin cambio de interfaz)
 */
export const getAllRoles = async () => {
    if (rolesCache && rolesCacheTime && (Date.now() - rolesCacheTime < CACHE_TTL)) {
        return rolesCache;
    }
    
    const client = await pool.connect();
    try {
        const query = "SELECT id_rol, rol FROM rol";
        const { rows } = await client.query(query);
        
        const rolesObject = {};
        rows.forEach(rol => {
            rolesObject[rol.id_rol] = rol.rol;
        });
        
        rolesCache = rolesObject;
        rolesCacheTime = Date.now();
        
        return rolesObject;
    } catch (error) {
        console.error('Error en getAllRoles:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Crear o actualizar perfil (FUNCIÓN CORREGIDA PARA MANEJAR PERFILES EXISTENTES)
 */
export const createPerfil = async ({
    id_usuario,
    id_rol,
    nombre,
    apellido,
    id_pais,
    nacimiento,
    id_universidad,
}) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        if (!id_usuario || !id_rol || !nombre || !apellido || !id_pais || !nacimiento || !id_universidad) {
            throw new Error("Todos los campos obligatorios deben ser proporcionados");
        }

        const existingProfileQuery = "SELECT id_usuario, id_rol FROM perfil WHERE id_usuario = $1";
        const existingResult = await client.query(existingProfileQuery, [id_usuario]);
        
        let result;
        
        if (existingResult.rows.length > 0) {
            console.log(`✅ Perfil existente encontrado para usuario ${id_usuario}, actualizando...`);
            
            await validateForeignKeysOptimized([
                ['usuario', id_usuario, 'El usuario no existe'],
                ['rol', id_rol, 'El rol no existe'],
                ['pais', id_pais, 'El país no existe'],
                ['universidad', id_universidad, 'La universidad no existe']
            ], client);

            await client.query('SET statement_timeout = 10000');
            
            const updateQuery = `
                UPDATE perfil 
                SET id_rol = $2, nombre = $3, apellido = $4, id_pais = $5, nacimiento = $6, id_universidad = $7
                WHERE id_usuario = $1
                RETURNING *;
            `;
            const values = [id_usuario, id_rol, nombre, apellido, id_pais, nacimiento, id_universidad];
            const { rows } = await client.query(updateQuery, values);
            result = rows[0];
            
            console.log(`✅ Perfil actualizado exitosamente para usuario ${id_usuario}`);
        } else {
            console.log(`✅ Creando nuevo perfil para usuario ${id_usuario}...`);
            
            await validateForeignKeysOptimized([
                ['usuario', id_usuario, 'El usuario no existe'],
                ['rol', id_rol, 'El rol no existe'],
                ['pais', id_pais, 'El país no existe'],
                ['universidad', id_universidad, 'La universidad no existe']
            ], client);

            await client.query('SET statement_timeout = 10000');
            
            const insertQuery = `
                INSERT INTO perfil 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const values = [id_usuario, id_rol, nombre, apellido, id_pais, nacimiento, id_universidad];
            const { rows } = await client.query(insertQuery, values);
            result = rows[0];
            
            console.log(`✅ Perfil creado exitosamente para usuario ${id_usuario}`);
        }
        
        await client.query('COMMIT');
        
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en createPerfil:', error);
        throw error;
    } finally {
        try {
            await client.query('SET statement_timeout = DEFAULT');
        } catch (e) {
            console.error('Error al resetear statement_timeout:', e);
        }
        client.release();
    }
};

/**
 * Actualizar perfil (REFACTORIZADA - con transacciones)
 */
export const updatePerfil = async ({
    id,
    id_rol,
    nombre,
    apellido,
    id_pais,
    nacimiento,
    id_universidad,
}) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        if (!id) throw new Error("ID de usuario obligatorio");

        await validateForeignKeysOptimized([
            ['rol', id_rol, 'El rol no existe'],
            ['pais', id_pais, 'El país no existe'],
            ['universidad', id_universidad, 'La universidad no existe']
        ], client);

        await client.query('SET statement_timeout = 10000');
        
        const query = `
            UPDATE perfil 
            SET id_rol = $1, nombre = $2, apellido = $3, id_pais = $4, nacimiento = $5, id_universidad = $6
            WHERE id_usuario = $7
            RETURNING *;
        `;
        const values = [id_rol, nombre, apellido, id_pais, nacimiento, id_universidad, id];

        const { rows } = await client.query(query, values);
        if (rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error("Perfil no encontrado");
        }
        
        await client.query('COMMIT');
        
        return rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en updatePerfil:', error);
        throw error;
    } finally {
        try {
            await client.query('SET statement_timeout = DEFAULT');
        } catch (e) {
            console.error('Error al resetear statement_timeout:', e);
        }
        client.release();
    }
};

/**
 * Obtener perfil por ID (SIN CAMBIOS - funcionaba bien)
 */
export const getPerfilById = async (id_usuario) => {
    const client = await pool.connect();
    try {
        const query = "SELECT * FROM perfil WHERE id_usuario = $1";
        const { rows } = await client.query(query, [id_usuario]);
        return rows[0];
    } catch (error) {
        console.error('Error en getPerfilById:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const isProfileComplete = async (id_usuario) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT id_usuario, nombre, apellido, id_pais, nacimiento, id_universidad 
            FROM perfil 
            WHERE id_usuario = $1
        `;
        const { rows } = await client.query(query, [id_usuario]);
        
        if (rows.length === 0) {
            return { exists: false, isComplete: false };
        }
        
        const profile = rows[0];
        const isComplete = !!(
            profile.nombre && 
            profile.apellido && 
            profile.id_pais && 
            profile.nacimiento && 
            profile.id_universidad
        );
        
        return { 
            exists: true, 
            isComplete,
            profile: profile
        };
    } catch (error) {
        console.error('Error en isProfileComplete:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Obtener todos los perfiles (SIN CAMBIOS - funcionaba bien)
 */
export const getAllPerfiles = async () => {
    const client = await pool.connect();
    try {
        await client.query('SET statement_timeout = 15000');
        
        const query = "SELECT * FROM perfil";
        const { rows } = await client.query(query);
        return rows;
    } catch (error) {
        console.error('Error en getAllPerfiles:', error);
        throw error;
    } finally {
        try {
            await client.query('SET statement_timeout = DEFAULT');
        } catch (e) {
            console.error('Error al resetear statement_timeout:', e);
        }
        client.release();
    }
};

/**
 * Versión con paginación (MANTENIDA IGUAL - funcionalidad extra)
 */
export const getAllPerfilesPaginado = async (page = 1, limit = 20) => {
    const client = await pool.connect();
    try {
        const offset = (page - 1) * limit;
        
        const query = "SELECT * FROM perfil ORDER BY id_usuario LIMIT $1 OFFSET $2";
        const { rows } = await client.query(query, [limit, offset]);
        
        const countQuery = "SELECT COUNT(*) FROM perfil";
        const countResult = await client.query(countQuery);
        const total = parseInt(countResult.rows[0].count);
        
        return {
            perfiles: rows,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                perPage: limit
            }
        };
    } catch (error) {
        console.error('Error en getAllPerfilesPaginado:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Eliminar perfil (REFACTORIZADA - con transacciones)
 */
export const deletePerfil = async (id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        if (!id) {
            throw new Error("El ID de usuario es obligatorio");
        }

        const checkQuery = "SELECT 1 FROM perfil WHERE id_usuario = $1";
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error("El perfil no existe");
        }
        
        await client.query('SET statement_timeout = 10000');
        
        const query = "DELETE FROM perfil WHERE id_usuario = $1";
        await client.query(query, [id]);
        
        await client.query('COMMIT');
        
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en deletePerfil:', error);
        throw error;
    } finally {
        try {
            await client.query('SET statement_timeout = DEFAULT');
        } catch (e) {
            console.error('Error al resetear statement_timeout:', e);
        }
        client.release();
    }
};

export const getPerfilWithUniversityInfo = async (id_usuario) => {
    const client = await pool.connect();
    
    try {
        const userQuery = `SELECT * FROM usuario WHERE id_user = $1`;
        const userResult = await client.query(userQuery, [id_usuario]);
        
        if (userResult.rows.length === 0) {
            throw new Error("Usuario no encontrado");
        }
        
        // Consulta que une perfil, universidad y país - con LEFT JOIN para casos sin datos
        const query = `
            SELECT u.id_user as id_usuario, p.id_rol, p.nombre, p.apellido, 
                   p.id_pais, p.nacimiento, p.id_universidad,
                   univ.nom_universidad, 
                   pais.nombre_pais
            FROM usuario u
            LEFT JOIN perfil p ON u.id_user = p.id_usuario
            LEFT JOIN universidad univ ON p.id_universidad = univ.id_universidad
            LEFT JOIN pais pais ON p.id_pais = pais.id_pais
            WHERE u.id_user = $1
        `;
        
        const { rows } = await client.query(query, [id_usuario]);
        
        // Si no hay perfil, devolver datos básicos del usuario
        if (rows.length === 0 || !rows[0].nombre) {
            return {
                data: {
                    id_usuario: parseInt(id_usuario),
                    nombre: null,
                    apellido: null,
                    id_universidad: null,
                    nom_universidad: null,
                    id_pais: null,
                    nombre_pais: null
                },
                message: "Usuario sin perfil completo"
            };
        }
        
        return {
            data: rows[0]
        };
    } catch (error) {
        console.error("Error al obtener perfil con universidad:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const getCompleteUserDetails = async (id_usuario) => {
    const client = await pool.connect();
    
    try {
        // Consulta para obtener datos del usuario
        const userQuery = `
            SELECT id_user, correo, created_at, last_login, created_at
            FROM usuario 
            WHERE id_user = $1
        `;
        const userResult = await client.query(userQuery, [id_usuario]);
        
        if (userResult.rows.length === 0) {
            throw new Error("Usuario no encontrado");
        }
        
        const user = userResult.rows[0];
        
        // Estructura básica de respuesta
        const userDetails = {
            usuario: {
                id_user: user.id_user,
                correo: user.correo || 'Sin correo',
                fecha_registro: user.created_at || new Date(),
                created_at: user.created_at || new Date(),
                ultimo_login: user.last_login || null,
                last_login: user.last_login || null,
            },
            perfil: null,
            suscripciones: {
                activas: [],
                total: 0
            },
            transacciones: {
                recientes: [],
                total: 0
            }
        };
        
        // Consulta para obtener datos del perfil
        try {
            const perfilQuery = `
                SELECT p.*, u.nom_universidad, u.id_pais, pa.nombre_pais 
                FROM perfil p
                LEFT JOIN universidad u ON p.id_universidad = u.id_universidad
                LEFT JOIN pais pa ON u.id_pais = pa.id_pais
                WHERE p.id_usuario = $1
            `;
            
            const perfilResult = await client.query(perfilQuery, [id_usuario]);
            if (perfilResult.rows.length > 0) {
                userDetails.perfil = perfilResult.rows[0];
            }
        } catch (perfilError) {
        }
        
        // Consulta para obtener suscripciones activas
        try {
            const subsQuery = `
                SELECT s.*, 
                       c.nombre as carrera_nombre 
                FROM suscripciones s
                LEFT JOIN carrera c ON s.id_carrera = c.id_carrera
                WHERE s.id_user = $1 AND s.status = 'active'
            `;
            
            const subsResult = await client.query(subsQuery, [id_usuario]);
            userDetails.suscripciones.activas = subsResult.rows || [];
            userDetails.suscripciones.total = subsResult.rows.length || 0;
        } catch (subsError) {
        }
        
        // Consulta para obtener historial de transacciones
        try {
            const transQuery = `
                SELECT * 
                FROM historial_transacciones
                WHERE id_user = $1
                ORDER BY updated_at DESC
                LIMIT 10
            `;
            
            const transResult = await client.query(transQuery, [id_usuario]);
            userDetails.transacciones.recientes = transResult.rows || [];
            userDetails.transacciones.total = transResult.rows.length || 0;
        } catch (transError) {
        }
        
        return userDetails;
    } catch (error) {
        console.error("Error al obtener detalles del perfil:", error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Función utilitaria para ejecutar cualquier consulta (MANTENIDA IGUAL)
 */
export const executeQuery = async (queryText, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(queryText, params);
        return result.rows;
    } catch (error) {
        console.error('Error ejecutando consulta:', error);
        throw error;
    } finally {
        client.release();
    }
};

// FUNCIONES HELPER PRIVADAS (REFACTORIZADAS)

const validateForeignKeysOptimized = async (keys, client) => {
    try {
        if (!keys || keys.length === 0) return true;
        
        const queries = [];
        const params = [];
        let paramIndex = 1;
        const errorMessages = {};
        
        for (const [table, id, errorMessage] of keys) {
            if (id === undefined || id === null) {
                throw new Error(errorMessage);
            }
            
            const idFieldName = table === 'usuario' ? 'id_user' : `id_${table}`;
            queries.push(`SELECT '${table}' as table_name, COUNT(1) > 0 as exists FROM ${table} WHERE ${idFieldName} = $${paramIndex++}`);
            params.push(id);
            errorMessages[table] = errorMessage;
        }
        
        const combinedQuery = queries.join(" UNION ALL ");
        const { rows } = await client.query(combinedQuery, params);
        
        for (const row of rows) {
            if (!row.exists) {
                throw new Error(errorMessages[row.table_name]);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error validando claves foráneas:', error);
        throw error;
    }
};