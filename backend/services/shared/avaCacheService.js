// backend/services/shared/avaCacheService.js - CORREGIDO

import pool from "../../lib/dbPool.js";

/**
 * 🔧 SERVICIO DE CACHE PARA AVAs - CORREGIDO
 * ✅ SOLUCIONADO: Logging detallado y verificación robusta de slugs
 */
class AvaCacheService {
  constructor() {
    this.avaCache = new Set();
    this.avaDataCache = new Map(); // Cache adicional para datos completos
    this.cacheLastUpdate = 0;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    console.log('🔧 [AVA-CACHE] === INICIALIZANDO SERVICIO DE CACHE ===');
    this.initializeCache();
  }

  async initializeCache() {
    try {
      console.log('🔧 [AVA-CACHE] Iniciando cache...');
      await this.refreshCache();
      console.log('✅ [AVA-CACHE] Cache inicializado correctamente');
    } catch (error) {
      console.error('❌ [AVA-CACHE] Error inicializando cache:', error);
    }
  }

  /**
   * 🔍 VERIFICAR SI UNA RUTA ES UN AVA - CON LOGGING DETALLADO
   */
  async isAvaRoute(slug) {
    try {
      console.log(`🔍 [AVA-CACHE] === VERIFICANDO RUTA: "${slug}" ===`);
      
      await this.updateCacheIfNeeded();
      
      // Normalizar slug para comparación
      const normalizedSlug = slug.toLowerCase().trim();
      const originalSlug = slug.trim();
      
      console.log(`🔍 [AVA-CACHE] Slug original: "${originalSlug}"`);
      console.log(`🔍 [AVA-CACHE] Slug normalizado: "${normalizedSlug}"`);
      console.log(`🔍 [AVA-CACHE] Cache size: ${this.avaCache.size}`);
      
      // Verificar con slug original
      const foundOriginal = this.avaCache.has(originalSlug);
      console.log(`🔍 [AVA-CACHE] ¿Encontrado con slug original? ${foundOriginal}`);
      
      // Verificar con slug normalizado
      const foundNormalized = this.avaCache.has(normalizedSlug);
      console.log(`🔍 [AVA-CACHE] ¿Encontrado con slug normalizado? ${foundNormalized}`);
      
      // Verificar si existe algún slug similar (case-insensitive)
      let foundSimilar = false;
      for (const cachedSlug of this.avaCache) {
        if (cachedSlug.toLowerCase() === normalizedSlug) {
          foundSimilar = true;
          console.log(`🔍 [AVA-CACHE] Encontrado slug similar: "${cachedSlug}" matches "${normalizedSlug}"`);
          break;
        }
      }
      
      const result = foundOriginal || foundNormalized || foundSimilar;
      
      console.log(`🔍 [AVA-CACHE] RESULTADO FINAL para "${slug}": ${result ? 'ES AVA' : 'NO ES AVA'}`);
      
      // Log adicional para debugging
      if (!result) {
        console.log(`🔍 [AVA-CACHE] Slugs disponibles:`, Array.from(this.avaCache).slice(0, 10));
        console.log(`🔍 [AVA-CACHE] Total slugs en cache: ${this.avaCache.size}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ [AVA-CACHE] Error verificando ruta:', error);
      return false;
    }
  }

  /**
   * 🔍 OBTENER DATOS COMPLETOS DE UN AVA POR SLUG - OPTIMIZADO
   */
  async getAvaBySlug(slug) {
    try {
      console.log(`🔍 [AVA-CACHE] === OBTENIENDO DATOS COMPLETOS PARA: "${slug}" ===`);
      
      const normalizedSlug = slug.toLowerCase().trim();
      
      // Verificar cache de datos completos primero
      if (this.avaDataCache.has(normalizedSlug)) {
        console.log(`✅ [AVA-CACHE] Datos encontrados en cache para: "${slug}"`);
        return this.avaDataCache.get(normalizedSlug);
      }
      
      // Si no está en cache, buscar en BD
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT 
            a.id_ava,
            a.nom_ava,
            a.slug,
            a.id_carrera,
            a.descripcion,
            c.nombre as carrera_nombre,
            c.descripcion as carrera_descripcion
          FROM ava a
          INNER JOIN carrera c ON a.id_carrera = c.id_carrera
          WHERE LOWER(a.slug) = $1 OR a.slug = $2
        `;
        
        console.log(`🔍 [AVA-CACHE] Ejecutando query con slugs: "${normalizedSlug}" y "${slug}"`);
        
        const result = await client.query(query, [normalizedSlug, slug]);
        
        console.log(`🔍 [AVA-CACHE] Query resultado: ${result.rows.length} filas`);
        
        if (result.rows.length > 0) {
          const avaData = result.rows[0];
          
          console.log(`✅ [AVA-CACHE] AVA encontrado:`, {
            id_ava: avaData.id_ava,
            nom_ava: avaData.nom_ava,
            slug: avaData.slug,
            id_carrera: avaData.id_carrera,
            carrera_nombre: avaData.carrera_nombre
          });
          
          // Guardar en cache de datos completos
          this.avaDataCache.set(normalizedSlug, avaData);
          
          return avaData;
        } else {
          console.log(`❌ [AVA-CACHE] AVA no encontrado en BD para slug: "${slug}"`);
          return null;
        }
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ [AVA-CACHE] Error obteniendo AVA por slug:', error);
      return null;
    }
  }

  /**
   * 🔄 ACTUALIZAR CACHE SI ES NECESARIO
   */
  async updateCacheIfNeeded() {
    const now = Date.now();
    const cacheAge = now - this.cacheLastUpdate;
    
    console.log(`🔍 [AVA-CACHE] Cache age: ${cacheAge}ms, max age: ${this.CACHE_DURATION}ms`);
    
    if (this.avaCache.size === 0 || cacheAge > this.CACHE_DURATION) {
      console.log('🔄 [AVA-CACHE] Cache necesita actualización');
      await this.refreshCache();
    } else {
      console.log('✅ [AVA-CACHE] Cache está actualizado');
    }
  }

  /**
   * 🔄 ACTUALIZAR CACHE DESDE BD - CON LOGGING DETALLADO
   */
  async refreshCache() {
    console.log(`🔧 [AVA-CACHE] === ACTUALIZANDO CACHE DESDE BD ===`);
    
    try {
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT 
            a.slug,
            a.id_ava,
            a.nom_ava,
            a.id_carrera,
            c.nombre as carrera_nombre
          FROM ava a
          INNER JOIN carrera c ON a.id_carrera = c.id_carrera
          WHERE a.slug IS NOT NULL AND a.slug != ''
          ORDER BY a.slug
        `;
        
        console.log(`🔧 [AVA-CACHE] Ejecutando query para actualizar cache...`);
        
        const result = await client.query(query);
        
        console.log(`🔧 [AVA-CACHE] Query resultado: ${result.rows.length} AVAs encontrados`);
        
        // Limpiar caches anteriores
        this.avaCache.clear();
        this.avaDataCache.clear();
        
        // Llenar caches con nuevos datos
        for (const row of result.rows) {
          const slug = row.slug;
          const normalizedSlug = slug.toLowerCase().trim();
          
          // Cache de slugs (para verificación rápida)
          this.avaCache.add(slug);
          
          // Cache de datos completos (para evitar queries adicionales)
          this.avaDataCache.set(normalizedSlug, {
            id_ava: row.id_ava,
            nom_ava: row.nom_ava,
            slug: row.slug,
            id_carrera: row.id_carrera,
            carrera_nombre: row.carrera_nombre
          });
        }
        
        this.cacheLastUpdate = Date.now();
        
        console.log(`✅ [AVA-CACHE] Cache actualizado exitosamente:`);
        console.log(`   📊 Slugs en cache: ${this.avaCache.size}`);
        console.log(`   📊 Datos completos en cache: ${this.avaDataCache.size}`);
        
        // Log de algunos ejemplos para debugging
        const exampleSlugs = Array.from(this.avaCache).slice(0, 5);
        console.log(`   📋 Ejemplos de slugs:`, exampleSlugs);
        
        // Verificar slugs específicos importantes
        const importantSlugs = ['fisica', 'patologia', 'Semiologia', 'CienciasBasicas'];
        for (const slug of importantSlugs) {
          const found = this.avaCache.has(slug);
          console.log(`   🔍 Slug "${slug}": ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
        }
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ [AVA-CACHE] Error en refreshCache:', error);
      throw error;
    }
  }

  /**
   * 🧹 LIMPIAR CACHE MANUALMENTE
   */
  clearCache() {
    this.avaCache.clear();
    this.avaDataCache.clear();
    this.cacheLastUpdate = 0;
    console.log('🧹 [AVA-CACHE] Cache limpiado manualmente');
  }

  /**
   * ➕ AÑADIR SLUG AL CACHE
   */
  addToCache(slug, avaData = null) {
    this.avaCache.add(slug);
    
    if (avaData) {
      const normalizedSlug = slug.toLowerCase().trim();
      this.avaDataCache.set(normalizedSlug, avaData);
    }
    
    console.log(`➕ [AVA-CACHE] AVA "${slug}" añadido al cache`);
  }

  /**
   * ➖ REMOVER SLUG DEL CACHE
   */
  removeFromCache(slug) {
    this.avaCache.delete(slug);
    
    const normalizedSlug = slug.toLowerCase().trim();
    this.avaDataCache.delete(normalizedSlug);
    
    console.log(`➖ [AVA-CACHE] AVA "${slug}" removido del cache`);
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DEL CACHE
   */
  getCacheStats() {
    return {
      slugsCount: this.avaCache.size,
      dataCount: this.avaDataCache.size,
      lastUpdate: this.cacheLastUpdate ? new Date(this.cacheLastUpdate).toISOString() : 'never',
      cacheAge: this.cacheLastUpdate ? Date.now() - this.cacheLastUpdate : 0,
      maxAge: this.CACHE_DURATION,
      needsRefresh: this.avaCache.size === 0 || (Date.now() - this.cacheLastUpdate) > this.CACHE_DURATION,
      availableSlugs: Array.from(this.avaCache).slice(0, 10) // Primeros 10 para debugging
    };
  }

  /**
   * 🔍 DEBUGGING: BUSCAR SLUG SIMILAR
   */
  findSimilarSlugs(searchSlug) {
    const normalizedSearch = searchSlug.toLowerCase().trim();
    const similar = [];
    
    for (const slug of this.avaCache) {
      const normalizedSlug = slug.toLowerCase().trim();
      if (normalizedSlug.includes(normalizedSearch) || normalizedSearch.includes(normalizedSlug)) {
        similar.push(slug);
      }
    }
    
    return similar;
  }
}

// Exportar singleton
export const avaCacheService = new AvaCacheService();