// src/services/chat/pdf/pdfConfig.js

import fs from 'fs';
import path from 'path';

// Configuración simplificada para PDF.js (sólo se utiliza para verificación de fuentes)
export const PDFPathConfig = {
  // Rutas para fuentes estándar
  standardFontsPath: path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts'),
  get standardFontDataUrl() {
    return `file:///${this.standardFontsPath.replace(/\\/g, '/')}`;
  },

  // Rutas para CMaps
  cmapsPath: path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'cmaps'),
  get cmapsUrl() {
    return `file:///${this.cmapsPath.replace(/\\/g, '/')}`;
  }
};

/**
 * Verifica que las rutas a las fuentes existan - Utilizado para documentación pero ya no es crítico con Mistral OCR
 */
export function checkFontPaths() {
  try {
    const standardFontsExists = fs.existsSync(PDFPathConfig.standardFontsPath);
    const cmapsExists = fs.existsSync(PDFPathConfig.cmapsPath);
    console.log(`Verificación de rutas de fonts:
      - standard_fonts: ${standardFontsExists ? 'Existe' : 'No existe'}
      - cmaps: ${cmapsExists ? 'Existe' : 'No existe'}`);
    
    if (!standardFontsExists || !cmapsExists) {
      console.warn('Advertencia: Algunas rutas de fuentes no existen. No afecta el procesamiento con Mistral OCR.');
    }
  } catch (e) {
    console.warn('No se pudieron verificar las rutas de fuentes:', e.message);
  }
}

export default { PDFPathConfig, checkFontPaths };