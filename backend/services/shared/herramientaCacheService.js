
import pool from "../../lib/dbPool.js";

class HerramientaCacheService {
  constructor() {
    this.cache = new Map();
    this.lastUpdate = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    this.initializeCache();
  }

  /**
   * Inicializa el cache de herramientas
   */
  async initializeCache() {
    try {
      await this.refreshCache();
      console.log('✅ Cache de herramientas inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando cache de herramientas:', error);
    }
  }

  /**
   * Actualiza el cache desde la base de datos
   */
  async refreshCache() {
    try {
      const query = `
        SELECT 
          id,
          nombre,
          slug,
          descripcion
        FROM herramienta
        ORDER BY nombre
      `;
      
      const { rows } = await pool.query(query);
      
      this.cache.clear();
      
      // Llenar cache con nuevos datos
      for (const herramienta of rows) {
        const normalizedSlug = herramienta.slug.toLowerCase().trim();
        
        this.cache.set(normalizedSlug, {
          id: herramienta.id,
          nombre: herramienta.nombre,
          slug: herramienta.slug,
          descripcion: herramienta.descripcion,
          normalizedSlug: normalizedSlug
        });
      }
      
      this.lastUpdate = Date.now();
      
      console.log(`🔧 Cache de herramientas actualizado: ${rows.length} herramientas cargadas`);
      console.log('📋 Herramientas en cache:', Array.from(this.cache.keys()));
      
    } catch (error) {
      console.error('❌ Error actualizando cache de herramientas:', error);
      throw error;
    }
  }

  /**
   * Verifica si el cache necesita actualizarse
   */
  needsRefresh() {
    if (!this.lastUpdate) return true;
    return (Date.now() - this.lastUpdate) > this.CACHE_DURATION;
  }

  /**
   * Verifica si una ruta (slug) corresponde a una herramienta
   * @param {string} slug - El slug a verificar
   * @returns {boolean} - true si es una herramienta
   */
  async isHerramientaRoute(slug) {
    try {
      if (this.needsRefresh()) {
        await this.refreshCache();
      }
      
      const normalizedSlug = slug.toLowerCase().trim();
      
      const isHerramienta = this.cache.has(normalizedSlug);
      
      console.log(`🔍 Verificando herramienta "${slug}" (normalizado: "${normalizedSlug}"): ${isHerramienta ? 'SÍ' : 'NO'}`);
      
      return isHerramienta;
      
    } catch (error) {
      console.error('❌ Error verificando ruta de herramienta:', error);
      // En caso de error, asumir que no es una herramienta para mantener seguridad
      return false;
    }
  }

  /**
   * Obtiene información completa de una herramienta por slug
   * @param {string} slug - El slug de la herramienta
   * @returns {Object|null} - Datos de la herramienta o null si no existe
   */
  async getHerramientaBySlug(slug) {
    try {
      if (this.needsRefresh()) {
        await this.refreshCache();
      }
      
      const normalizedSlug = slug.toLowerCase().trim();
      
      const herramienta = this.cache.get(normalizedSlug);
      
      if (herramienta) {
        console.log(`✅ Herramienta encontrada: ${herramienta.nombre} (ID: ${herramienta.id})`);
        return herramienta;
      }
      
      console.log(`❌ Herramienta no encontrada: "${slug}"`);
      return null;
      
    } catch (error) {
      console.error('❌ Error obteniendo herramienta por slug:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las herramientas en cache
   * @returns {Array} - Array con todas las herramientas
   */
  getAllHerramientas() {
    return Array.from(this.cache.values());
  }

  /**
   * Obtiene todos los slugs de herramientas
   * @returns {Array} - Array con todos los slugs
   */
  getAllSlugs() {
    return Array.from(this.cache.keys());
  }

  /**
   * Limpia el cache manualmente
   */
  clearCache() {
    this.cache.clear();
    this.lastUpdate = null;
    console.log('🧹 Cache de herramientas limpiado manualmente');
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {Object} - Información sobre el estado del cache
   */
  getCacheStats() {
    return {
      count: this.cache.size,
      lastUpdate: this.lastUpdate,
      needsRefresh: this.needsRefresh(),
      herramientas: this.getAllSlugs()
    };
  }
}

export const herramientaCacheService = new HerramientaCacheService();