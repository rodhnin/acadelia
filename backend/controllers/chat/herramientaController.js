import {
  obtenerHerramientas,
  crearHerramienta,
  obtenerHerramientaPorId,
  actualizarHerramienta,
  eliminarHerramienta
} from "../../services/chat/herramientaService.js";
import activityMenteLogService from "../../services/security/activityMenteLogService.js";

export async function obtenerTodasLasHerramientas(req, res) {
  try {
    const herramientas = await obtenerHerramientas();
    res.json(herramientas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function crearNuevaHerramienta(req, res) {
  try {
    const { nombre, descripcion, slug } = req.body;
    // La imagen proviene del middleware de carga de archivos
    const imagen = req.body.imagen; // Añadido por el middleware handleImageUpload
    
    const herramienta = await crearHerramienta({ nombre, descripcion, slug, imagen });
    
    // Registrar actividad
    try {
      // Obtener ID de usuario del request o un valor predeterminado
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      // Obtener nombre de usuario mediante el servicio
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "create",
        entity_type: "herramienta",
        entity_id: herramienta.id.toString(),
        entity_name: nombre,
        description: `Se ha creado la herramienta "${nombre}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(201).json({ message: "Herramienta creada con éxito", herramienta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function obtenerHerramientaById(req, res) {
  try {
    const { id } = req.params;
    const herramienta = await obtenerHerramientaPorId(id);
    res.json(herramienta);
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: error.message });
  }
}

export async function actualizarHerramientaById(req, res) {
  try {
    const { id } = req.params;
    
    // Primero obtenemos la herramienta existente para tener su imagen actual
    const herramientaExistente = await obtenerHerramientaPorId(id);
    
    if (!herramientaExistente) {
      return res.status(404).json({ error: "Herramienta no encontrada" });
    }
    
    const { nombre, descripcion, slug } = req.body;
    
    // Si hay una nueva imagen (req.file existe), usar la nueva ruta
    // Si no hay nueva imagen, conservar la imagen existente
    const imagen = req.file ? req.body.imagen : herramientaExistente.imagen;
    
    const herramienta = await actualizarHerramienta({ 
      id, 
      nombre, 
      descripcion, 
      slug, 
      imagen 
    });
    
    // Registrar actividad
    try {
      // Obtener ID de usuario del request o un valor predeterminado
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      // Obtener nombre de usuario mediante el servicio
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "update",
        entity_type: "herramienta",
        entity_id: id.toString(),
        entity_name: nombre,
        description: `Se ha actualizado la herramienta "${nombre}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.json({ message: "Herramienta actualizada con éxito", herramienta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function eliminarHerramientaById(req, res) {
  try {
    const { id } = req.params;
    
    // Obtener información de la herramienta antes de eliminarla
    const herramienta = await obtenerHerramientaPorId(id);
    const nombreHerramienta = herramienta ? herramienta.nombre : `Herramienta #${id}`;
    
    await eliminarHerramienta(id);
    
    // Registrar actividad
    try {
      // Obtener ID de usuario del request o un valor predeterminado
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      // Obtener nombre de usuario mediante el servicio
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "delete",
        entity_type: "herramienta",
        entity_id: id.toString(),
        entity_name: nombreHerramienta,
        description: `Se ha eliminado la herramienta "${nombreHerramienta}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.json({ message: "Herramienta eliminada con éxito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}