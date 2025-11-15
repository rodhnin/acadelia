// src/controllers/usuarios/perfilController.js - Clean Code Version
import * as perfilService from "../../services/usuarios/perfilService.js";
import { logSecurityEvent } from '../../utils/securityLogger.js';

/**
 * Obtener todos los roles disponibles
 */
export const getRoles = async (req, res) => {
    try {
        const roles = await perfilService.getAllRoles();
        
        res.status(200).json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error("Error obteniendo roles:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener roles" 
        });
    }
};

/**
 * Crear nuevo perfil
 */
export const createPerfil = async (req, res) => {
    try {
        // Validaciones HTTP básicas
        const validationError = validateCreatePerfilInput(req.body);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const perfil = await perfilService.createPerfil(req.body);
        
        logSecurityEvent('PROFILE_CREATED', 'Perfil creado', {
            userId: req.body.id_usuario || req.user?.id_user,
            profileId: perfil.id_usuario,
            ip: req.ip
        }, 'medium');
        
        res.status(201).json({ 
            success: true,
            message: "Perfil creado con éxito", 
            data: perfil 
        });
    } catch (error) {
        console.error("Error en createPerfil controller:", error);
        
        logSecurityEvent('PROFILE_CREATION_ERROR', 'Error creando perfil', {
            userId: req.body.id_usuario || req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        const statusCode = error.message.includes('no existe') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: error.message 
        });
    }
};

/**
 * Actualizar perfil existente
 */
export const updatePerfil = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validaciones HTTP básicas
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                error: "ID de usuario inválido"
            });
        }

        const validationError = validateUpdatePerfilInput(req.body);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const perfil = await perfilService.updatePerfil({ id, ...req.body });
        
        logSecurityEvent('PROFILE_UPDATED', 'Perfil actualizado', {
            profileId: id,
            userId: req.body.id_usuario || req.user?.id_user,
            ip: req.ip
        }, 'medium');
        
        res.status(200).json({ 
            success: true,
            message: "Perfil actualizado con éxito", 
            data: perfil 
        });
    } catch (error) {
        console.error("Error en updatePerfil controller:", error);
        
        logSecurityEvent('PROFILE_UPDATE_ERROR', 'Error actualizando perfil', {
            profileId: req.params.id,
            userId: req.body.id_usuario || req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        const statusCode = error.message.includes('no existe') || error.message.includes('no encontrado') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: error.message 
        });
    }
};

/**
 * Obtener perfiles (todos o por id_usuario)
 */
export const getPerfiles = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        let perfiles;

        if (id_usuario) {
            if (isNaN(parseInt(id_usuario))) {
                return res.status(400).json({
                    success: false,
                    error: "ID de usuario inválido"
                });
            }
            
            perfiles = await perfilService.getPerfilById(id_usuario);
            if (!perfiles) {
                return res.status(404).json({ 
                    success: false,
                    error: "Perfil no encontrado" 
                });
            }
        } else {
            perfiles = await perfilService.getAllPerfiles();
        }

        res.status(200).json({
            success: true,
            data: perfiles
        });
    } catch (error) {
        console.error("Error al obtener perfiles:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Error interno del servidor" 
        });
    }
};

/**
 * Obtener todos los perfiles
 */
export const getAllPerfiles = async (req, res) => {
    try {
        const perfiles = await perfilService.getAllPerfiles();
        
        logSecurityEvent('ALL_PROFILES_ACCESS', 'Acceso a todos los perfiles', {
            userId: req.user?.id_user,
            ip: req.ip
        }, 'medium');
        
        res.status(200).json({
            success: true,
            data: perfiles
        });
    } catch (error) {
        console.error("Error en getAllPerfiles controller:", error);
        
        logSecurityEvent('PROFILES_ACCESS_ERROR', 'Error accediendo a todos los perfiles', {
            userId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

/**
 * Eliminar perfil
 */
export const deletePerfil = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                error: "ID de usuario inválido"
            });
        }

        await perfilService.deletePerfil(id);
        
        logSecurityEvent('PROFILE_DELETED', 'Perfil eliminado', {
            profileId: id,
            userId: req.user?.id_user,
            ip: req.ip
        }, 'high');
        
        res.status(200).json({ 
            success: true,
            message: "Perfil eliminado con éxito" 
        });
    } catch (error) {
        console.error("Error en deletePerfil controller:", error);
        
        logSecurityEvent('PROFILE_DELETION_ERROR', 'Error eliminando perfil', {
            profileId: req.params.id,
            userId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

/**
 * Obtener perfil con información de universidad - DELEGADA AL SERVICIO
 */
export const getPerfilWithUniversity = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        
        if (!id_usuario || isNaN(parseInt(id_usuario))) {
            return res.status(400).json({ 
                success: false,
                error: "Se requiere el ID de usuario" 
            });
        }
        
        const result = await perfilService.getPerfilWithUniversityInfo(parseInt(id_usuario));
        
        res.status(200).json({
            success: true,
            data: result.data,
            message: result.message
        });
    } catch (error) {
        console.error("Error en getPerfilWithUniversity controller:", error);
        res.status(500).json({ 
            success: false,
            error: "Error interno del servidor: " + error.message 
        });
    }
};

/**
 * Obtener detalles completos del perfil de usuario - DELEGADA AL SERVICIO
 */
export const getPerfilDetailsByUserId = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        
        if (!id_usuario || isNaN(parseInt(id_usuario))) {
            return res.status(400).json({ 
                success: false,
                error: "Se requiere el ID de usuario" 
            });
        }
        
        const userDetails = await perfilService.getCompleteUserDetails(parseInt(id_usuario));
        
        res.status(200).json({
            success: true,
            data: userDetails
        });
    } catch (error) {
        console.error("Error en getPerfilDetailsByUserId controller:", error);
        res.status(500).json({ 
            success: false,
            error: "Error interno del servidor" 
        });
    }
};

// ========================================
// FUNCIONES HELPER PRIVADAS DEL CONTROLLER
// ========================================

/**
 * Validar entrada HTTP para creación de perfil
 */
function validateCreatePerfilInput(data) {
    const { id_usuario, id_rol, nombre, apellido, id_pais, nacimiento, id_universidad } = data;
    
    const requiredFields = ['id_usuario', 'id_rol', 'nombre', 'apellido', 'id_pais', 'nacimiento', 'id_universidad'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        return {
            success: false,
            error: "Campos obligatorios faltantes: " + missingFields.join(', ')
        };
    }
    
    if (isNaN(parseInt(id_usuario))) {
        return {
            success: false,
            error: "ID de usuario debe ser un número válido"
        };
    }
    
    if (isNaN(parseInt(id_rol))) {
        return {
            success: false,
            error: "ID de rol debe ser un número válido"
        };
    }
    
    return null;
}

/**
 * Validar entrada HTTP para actualización de perfil
 */
function validateUpdatePerfilInput(data) {
    const { id_rol, id_pais, id_universidad } = data;
    
    if (id_rol !== undefined && isNaN(parseInt(id_rol))) {
        return {
            success: false,
            error: "ID de rol debe ser un número válido"
        };
    }
    
    if (id_pais !== undefined && isNaN(parseInt(id_pais))) {
        return {
            success: false,
            error: "ID de país debe ser un número válido"
        };
    }
    
    if (id_universidad !== undefined && isNaN(parseInt(id_universidad))) {
        return {
            success: false,
            error: "ID de universidad debe ser un número válido"
        };
    }
    
    return null;
}