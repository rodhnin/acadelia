import getUserActiveAvas from "../../services/usuarios/useravaService.js"; // Cambiado el import

const getActiveUserAvas = async (req, res) => {
  try {
    const { idUser } = req.params;
    
    if (!idUser) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const activeAvas = await getUserActiveAvas.getUserActiveAvas(idUser); // Cambiado el nombre del servicio
    
    if (!activeAvas.length) {
      return res.status(404).json({ message: "No se encontraron AVAs activas para este usuario." });
    }

    res.status(200).json(activeAvas);
  } catch (error) {
    res.status(500).json({
      message: "Error interno al obtener las AVAs activas",
      error: error.message
    });
  }
};

export default {
  getActiveUserAvas
};