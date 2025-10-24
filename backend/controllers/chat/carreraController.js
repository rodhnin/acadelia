import {
  createCarrera,
  getAllCarreras,
  getCarreraById,
  updateCarrera,
  deleteCarrera,
} from "../../services/chat/carreraService.js";
import activityMenteLogService from "../../services/security/activityMenteLogService.js";

const create = async (req, res) => {
  try {
    const { nombre, descripcion, month, year, imagen } = req.body;
    const nuevaCarrera = await createCarrera({ nombre, descripcion, month, year, imagen });
    
    // Registrar actividad
    try {
      // Obtener ID de usuario del request o un valor predeterminado
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      // Obtener nombre de usuario mediante el servicio
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "create",
        entity_type: "carrera",
        entity_id: nuevaCarrera.id_carrera.toString(),
        entity_name: nombre,
        description: `Se ha creado la carrera "${nombre}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(201).json(nuevaCarrera);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const carreras = await getAllCarreras();
    res.status(200).json(carreras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const { id_carrera } = req.params;
    const carrera = await getCarreraById(id_carrera);
    res.status(200).json(carrera);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id_carrera } = req.params;
    
    // Primero obtenemos la carrera existente para tener su imagen actual
    const carreraExistente = await getCarreraById(id_carrera);
    
    if (!carreraExistente) {
      return res.status(404).json({ message: "Carrera no encontrada" });
    }
    
    const { nombre, descripcion, month, year } = req.body;
    
    // Si hay una nueva imagen (req.file existe), usar la nueva ruta
    // Si no hay nueva imagen, conservar la imagen existente
    const imagen = req.file ? req.body.imagen : carreraExistente.imagen;
    
    const carreraActualizada = await updateCarrera({ 
      id_carrera, 
      nombre, 
      descripcion, 
      month, 
      year, 
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
        entity_type: "carrera",
        entity_id: id_carrera.toString(),
        entity_name: nombre,
        description: `Se ha actualizado la carrera "${nombre}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(200).json(carreraActualizada);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id_carrera } = req.params;
    
    // Obtener información de la carrera antes de eliminarla
    const carrera = await getCarreraById(id_carrera);
    const nombreCarrera = carrera ? carrera.nombre : `Carrera #${id_carrera}`;
    
    await deleteCarrera(id_carrera);
    
    // Registrar actividad
    try {
      // Obtener ID de usuario del request o un valor predeterminado
      const userId = req.body.userId || req.query.userId || req.user?.id_user;
      
      // Obtener nombre de usuario mediante el servicio
      const userName = userId ? await activityMenteLogService.getUserName(userId) : "Administrador";
      
      await activityMenteLogService.logActivity({
        action_type: "delete",
        entity_type: "carrera",
        entity_id: id_carrera.toString(),
        entity_name: nombreCarrera,
        description: `Se ha eliminado la carrera "${nombreCarrera}"`,
        id_usuario: userId,
        usuario_nombre: userName
      });
    } catch (logError) {
      console.error("Error al registrar actividad:", logError);
      // No interrumpimos el flujo principal si falla el registro
    }
    
    res.status(204).end(); // No content response
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

export { create, getAll, getById, update, remove };