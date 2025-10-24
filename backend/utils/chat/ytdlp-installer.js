// backend/utils/chat/ytdlp-installer.js - ARREGLO PRODUCCIÓN

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BIN_PATH = path.join(__dirname, '..', '..', 'backend', 'bin');

// Asegúrate que el directorio bin existe
if (!fs.existsSync(BIN_PATH)) {
  fs.mkdirSync(BIN_PATH, { recursive: true });
}

/**
 * 🎯 ARREGLO: Detecta y configura yt-dlp según el entorno
 */
export async function installYtDlp() {
  // 🎯 EN PRODUCCIÓN: Usar yt-dlp del sistema
  if (process.env.NODE_ENV === 'production') {
    console.log('🎬 Entorno de producción detectado - usando yt-dlp del sistema');
    
    try {
      // Verificar que yt-dlp del sistema está disponible
      await execPromise('yt-dlp --version');
      console.log('✅ yt-dlp del sistema disponible');
      return 'yt-dlp'; // Comando directo del sistema
    } catch (error) {
      // Si no hay yt-dlp del sistema, intentar el enlace simbólico
      const symlinkPath = path.join(BIN_PATH, 'yt-dlp');
      if (fs.existsSync(symlinkPath)) {
        try {
          await execPromise(`"${symlinkPath}" --version`);
          console.log('✅ Enlace simbólico yt-dlp disponible');
          return symlinkPath;
        } catch (symlinkError) {
          console.error('❌ Enlace simbólico no funcional');
        }
      }
      
      throw new Error('yt-dlp no está disponible en producción. Verifica la instalación del sistema.');
    }
  }

  // 🎯 EN DESARROLLO: Usar instalación dinámica
  console.log('🛠️ Entorno de desarrollo - usando instalación dinámica');
  
  const isWindows = process.platform === 'win32';
  const ytdlpPath = path.join(BIN_PATH, isWindows ? 'yt-dlp.exe' : 'yt-dlp');

  // Si ya existe, verificar que sea ejecutable
  if (fs.existsSync(ytdlpPath)) {
    console.log(`yt-dlp ya existe en ${ytdlpPath}, verificando permisos...`);
    
    if (!isWindows) {
      try {
        // Asegurar que sea ejecutable
        await execPromise(`chmod +x "${ytdlpPath}"`);
        console.log('✅ Permisos de yt-dlp actualizados');
      } catch (error) {
        console.error('⚠️ Error al cambiar permisos:', error);
      }
    }
    
    // Verificar que funciona
    try {
      await execPromise(`"${ytdlpPath}" --version`);
      console.log('✅ yt-dlp existente es funcional');
      return ytdlpPath;
    } catch (error) {
      console.warn('⚠️ yt-dlp existente no funciona, redownloading...');
      // Continuar con la descarga
    }
  }

  console.log('📥 Descargando yt-dlp...');
  
  // URLs directas para la última versión
  const url = isWindows 
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 60000, // 1 minuto timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(ytdlpPath, response.data);
    console.log(`✅ yt-dlp descargado en ${ytdlpPath}`);

    // En sistemas Unix, hacer que el archivo sea ejecutable
    if (!isWindows) {
      await execPromise(`chmod +x "${ytdlpPath}"`);
      console.log('✅ Permisos de yt-dlp configurados');
    }

    // Verificar que funciona
    try {
      await execPromise(`"${ytdlpPath}" --version`);
      console.log('✅ yt-dlp descargado y verificado');
    } catch (verifyError) {
      console.error('❌ yt-dlp descargado pero no funcional:', verifyError.message);
      throw verifyError;
    }

    return ytdlpPath;
  } catch (error) {
    console.error('❌ Error al descargar yt-dlp:', error.message);
    throw new Error(`No se pudo descargar yt-dlp: ${error.message}`);
  }
}

/**
 * 🎯 NUEVO: Detecta automáticamente la mejor ruta de yt-dlp
 */
export async function detectYtdlpPath() {
  // 1. Intentar comando del sistema
  try {
    await execPromise('yt-dlp --version');
    console.log('🎬 yt-dlp del sistema detectado');
    return 'yt-dlp';
  } catch (error) {
    console.log('❌ yt-dlp del sistema no disponible');
  }

  // 2. Intentar enlace simbólico
  const symlinkPath = path.join(BIN_PATH, 'yt-dlp');
  if (fs.existsSync(symlinkPath)) {
    try {
      await execPromise(`"${symlinkPath}" --version`);
      console.log('🔗 Enlace simbólico yt-dlp detectado');
      return symlinkPath;
    } catch (error) {
      console.log('❌ Enlace simbólico no funcional');
    }
  }

  // 3. Intentar instalación local
  const isWindows = process.platform === 'win32';
  const localPath = path.join(BIN_PATH, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
  if (fs.existsSync(localPath)) {
    try {
      await execPromise(`"${localPath}" --version`);
      console.log('📁 yt-dlp local detectado');
      return localPath;
    } catch (error) {
      console.log('❌ yt-dlp local no funcional');
    }
  }

  // 4. Si nada funciona
  return null;
}

/**
 * 🎯 NUEVO: Verifica el estado de yt-dlp
 */
export async function checkYtdlpStatus() {
  const detectedPath = await detectYtdlpPath();
  
  if (!detectedPath) {
    return {
      available: false,
      path: null,
      version: null,
      source: null
    };
  }

  try {
    const { stdout } = await execPromise(`${detectedPath === 'yt-dlp' ? 'yt-dlp' : `"${detectedPath}"`} --version`);
    const version = stdout.trim();
    
    let source = 'unknown';
    if (detectedPath === 'yt-dlp') {
      source = 'system';
    } else if (detectedPath.includes('bin/yt-dlp')) {
      source = fs.lstatSync(detectedPath).isSymbolicLink() ? 'symlink' : 'local';
    }

    return {
      available: true,
      path: detectedPath,
      version,
      source
    };
  } catch (error) {
    return {
      available: false,
      path: detectedPath,
      version: null,
      source: null,
      error: error.message
    };
  }
}

// Exportar la función para obtener la ruta (compatibilidad)
export function getYtdlpPath() {
  if (process.env.NODE_ENV === 'production') {
    return 'yt-dlp'; // Sistema
  }
  return path.join(BIN_PATH, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
}

/**
 * 🎯 NUEVO: Configurar enlace simbólico en producción (para Docker)
 */
export async function setupProductionSymlink() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ setupProductionSymlink solo debe usarse en producción');
    return false;
  }

  try {
    const symlinkPath = path.join(BIN_PATH, 'yt-dlp');
    
    // Verificar si ya existe
    if (fs.existsSync(symlinkPath)) {
      console.log('✅ Enlace simbólico ya existe');
      return true;
    }

    // Crear enlace simbólico al binario del sistema
    await execPromise(`ln -sf /usr/bin/yt-dlp "${symlinkPath}"`);
    
    // Verificar que funciona
    await execPromise(`"${symlinkPath}" --version`);
    
    console.log('✅ Enlace simbólico creado y verificado');
    return true;
  } catch (error) {
    console.error('❌ Error configurando enlace simbólico:', error.message);
    return false;
  }
}

export default {
  installYtDlp,
  getYtdlpPath,
  detectYtdlpPath,
  checkYtdlpStatus,
  setupProductionSymlink
};