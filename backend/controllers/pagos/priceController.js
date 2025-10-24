// backend/controllers/pagos/priceController.js
import { priceService } from '../../services/pagos/priceService.js';
import { logSecurityEvent } from '../../utils/securityLogger.js';

export const getAllCourses = async (req, res) => {
    try {
        const courses = await priceService.getAllCourses();
        res.json(courses);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error obteniendo cursos', 
            error: error.message 
        });
    }
};

export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await priceService.getCourseById(id);
        
        if (!course) {
            return res.status(404).json({ message: 'Curso no encontrado' });
        }
        
        res.json(course);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error obteniendo curso', 
            error: error.message 
        });
    }
};

export const clearCache = async (req, res) => {
    try {
        await priceService.clearCache();
        
        // Log de limpieza de caché
        logSecurityEvent('CACHE_CLEARED', 'Caché de precios limpiado', {
            userId: req.user?.id_user,
            ip: req.ip
        }, 'medium');
        
        res.json({ message: 'Caché limpiado exitosamente' });
    } catch (error) {
        // Log de error en limpieza de caché
        logSecurityEvent('CACHE_CLEAR_ERROR', 'Error al limpiar caché de precios', {
            userId: req.user?.id_user,
            error: error.message,
            ip: req.ip
        }, 'medium');
        
        res.status(500).json({ 
            message: 'Error limpiando caché', 
            error: error.message 
        });
    }
};
