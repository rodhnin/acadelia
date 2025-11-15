import { redisService } from '../../lib/redis.js';
import pool from '../../lib/dbPool.js';

class PriceService {
    constructor() {
        this.CACHE_KEYS = {
            ALL_COURSES: 'courses:all',
            COURSE_DETAILS: (courseId) => `course:${courseId}`,
            PRICES_BY_COUNTRY: (country) => `prices:${country}`
        };

        this.CACHE_TIMES = {
            DEFAULT: 7200,    // 2 horas
            LONG_TERM: 86400, // 24 horas
            PRICES: 3600      // 1 hora para precios
        };
    }

    async getAllCourses() {
        const cacheKey = this.CACHE_KEYS.ALL_COURSES;
        
        const cachedCourses = await redisService.get(cacheKey);
        if (cachedCourses) return cachedCourses;

        try {
            const query = `
                SELECT 
                    id_carrera, 
                    nombre, 
                    descripcion, 
                    month, 
                    year
                FROM carrera
            `;
            
            const { rows } = await pool.query(query);

            await redisService.set(
                cacheKey, 
                rows, 
                this.CACHE_TIMES.LONG_TERM
            );

            return rows;
        } catch (error) {
            console.error('Error obteniendo cursos:', error);
            throw error;
        }
    }

    async getCourseById(courseId) {
        const cacheKey = this.CACHE_KEYS.COURSE_DETAILS(courseId);
        
        const cachedCourse = await redisService.get(cacheKey);
        if (cachedCourse) return cachedCourse;

        try {
            const query = `
                SELECT 
                    id_carrera, 
                    nombre, 
                    descripcion, 
                    month, 
                    year
                FROM carrera
                WHERE id_carrera = $1
            `;
            
            const { rows } = await pool.query(query, [courseId]);

            if (rows.length === 0) return null;

            await redisService.set(
                cacheKey, 
                rows[0], 
                this.CACHE_TIMES.DEFAULT
            );

            return rows[0];
        } catch (error) {
            console.error(`Error obteniendo curso ${courseId}:`, error);
            throw error;
        }
    }

    async clearCache() {
        await redisService.clearAll();
        return true;
    }
}

export const priceService = new PriceService();