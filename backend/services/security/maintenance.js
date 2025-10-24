// backend/services/maintenance.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const flagFilePath = path.join(__dirname, '..', '..', 'maintenance.flag');

export const isMaintenanceMode = () => {
  try {
    // Verificar si el archivo existe
    if (fs.existsSync(flagFilePath)) {
      const content = fs.readFileSync(flagFilePath, 'utf8').trim();
      return content === 'true';
    }
    return false;
  } catch (error) {
    console.error('Error verificando modo mantenimiento:', error);
    return false;
  }
};

export const setMaintenanceMode = (enable) => {
  try {
    fs.writeFileSync(flagFilePath, enable ? 'true' : 'false');
    return true;
  } catch (error) {
    console.error('Error configurando modo mantenimiento:', error);
    return false;
  }
};