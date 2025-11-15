import * as AvaService from "../../services/chat/avaService.js";
import activityMenteLogService from "../../services/security/activityMenteLogService.js";
import { avaCacheService } from "../../services/shared/avaCacheService.js";

// Controlador para crear un AVA
export const createAva = async (req, res) => {
  try {
    const { nom_ava, descripcion, id_carrera, slug, embedding_table_name } = req.body;
    // La imagen proviene del middleware de carga de archivos
    const imagen = req.body.imagen; // Añadido por el middleware handleImageUpload
    
    const ava = await AvaService.createAva({ 
      nom_ava, 
      descripcion, 
      id_carrera, 
      imagen, 
      slug, 
      embedding_table_name 
    });
    
    avaCacheService.addToCache(slug);
    
    try {
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "create",
        entity_type: "ava",
        entity_id: ava.id_ava.toString(),
        entity_name: nom_ava,
        description: `Se ha creado el AVA "${nom_ava}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(201).json({ message: "AVA creado con éxito", ava });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controlador para obtener todos los AVAs
export const getAllAvas = async (req, res) => {
  try {
    const avas = await AvaService.getAllAvas();
    res.status(200).json(avas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controlador para obtener los AVAs por carrera
export const getAvasByCarrera = async (req, res) => {
  try {
    const { id_carrera } = req.params;
    const avas = await AvaService.getAvasByCarrera(id_carrera);
    res.status(200).json(avas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controlador para actualizar un AVA
export const updateAva = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero obtenemos el AVA existente para tener su imagen actual
    const avaExistente = await AvaService.getAvaById(id);
    
    if (!avaExistente) {
      return res.status(404).json({ error: "AVA no encontrado" });
    }
    
    const { nom_ava, descripcion, id_carrera, slug } = req.body;
    
    // Si hay una nueva imagen (req.file existe), usar la nueva ruta
    // Si no hay nueva imagen, conservar la imagen existente
    const imagen = req.file ? req.body.imagen : avaExistente.imagen;
    
    // Siempre conservar la tabla de embeddings existente
    const embedding_table_name = avaExistente.embedding_table_name;
    
    const ava = await AvaService.updateAva({ 
      id, 
      nom_ava, 
      descripcion, 
      id_carrera, 
      imagen,
      embedding_table_name, 
      slug 
    });
    
    if (slug && slug !== avaExistente.slug) {
      avaCacheService.removeFromCache(avaExistente.slug);
      avaCacheService.addToCache(slug);
    }
    
    try {
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "update",
        entity_type: "ava",
        entity_id: id.toString(),
        entity_name: nom_ava,
        description: `Se actualizaron los contenidos del AVA "${nom_ava}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(200).json({ message: "AVA actualizado con éxito", ava });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controlador para eliminar un AVA
export const deleteAva = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ava = await AvaService.getAvaById(id);
    const avaName = ava ? ava.nom_ava : `AVA #${id}`;
    const avaSlug = ava ? ava.slug : null;
    
    await AvaService.deleteAva(id);
    
    if (avaSlug) {
      avaCacheService.removeFromCache(avaSlug);
    }
    
    try {
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "delete",
        entity_type: "ava",
        entity_id: id.toString(),
        entity_name: avaName,
        description: `Se ha eliminado el AVA "${avaName}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(200).json({ message: "AVA eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===== NUEVOS CONTROLADORES PARA ADMINISTRACIÓN DE CACHE =====

// Controlador para limpiar cache de AVAs manualmente
export const clearAvaCache = async (req, res) => {
  try {
    avaCacheService.clearCache();
    
    try {
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "system",
        entity_type: "cache",
        entity_id: "ava_cache",
        entity_name: "Cache de AVAs",
        description: "Se ha limpiado manualmente el cache de AVAs",
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
    }
    
    res.status(200).json({ 
      success: true,
      message: "Cache de AVAs limpiado exitosamente",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error clearing AVA cache:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Controlador para obtener estadísticas del cache
export const getCacheStats = async (req, res) => {
  try {
    const stats = avaCacheService.getCacheStats();
    
    res.status(200).json({
      success: true,
      message: "Estadísticas del cache de AVAs",
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};