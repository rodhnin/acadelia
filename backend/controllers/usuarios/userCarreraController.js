import getUserCarreraService from "../../services/usuarios/userCarreraService.js";

const getAvailableCarreras = async (req, res) => {
  try {
    const { idUser } = req.params;
    
    if (!idUser) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const availableCarreras = await getUserCarreraService.getUserAvailableCarreras(idUser);
    
    if (!availableCarreras || availableCarreras.length === 0) {
      return res.status(404).json({ message: "No available carreras found" });
    }

    res.status(200).json(availableCarreras);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving available carreras",
      error: error.message
    });
  }
};

const getActiveCarreras = async (req, res) => {
  try {
    const { idUser } = req.params;
    
    if (!idUser) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const activeCarreras = await getUserCarreraService.getUserActiveCarreras(idUser);
    
    if (!activeCarreras || activeCarreras.length === 0) {
      return res.status(404).json({ message: "No active carreras found" });
    }

    res.status(200).json(activeCarreras);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving active carreras",
      error: error.message
    });
  }
};

export default {
  getAvailableCarreras,
  getActiveCarreras
};