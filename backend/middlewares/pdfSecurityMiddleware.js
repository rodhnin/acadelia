// middlewares/pdfSecurityMiddleware.js
import { fileTypeFromBuffer } from 'file-type';
import { PDFDocument } from 'pdf-lib';

/**
 * Middleware para validación profunda de archivos PDF
 */
export const validatePDFSecurity = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No se ha proporcionado ningún archivo"
      });
    }
    
    // Verificación de Magic Numbers (firmas de archivo)
    const fileBuffer = req.file.buffer;
    
    // 1. Verificar Magic Numbers del PDF
    const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    if (!fileBuffer.slice(0, 4).equals(pdfSignature)) {
      return res.status(400).json({
        success: false,
        error: "El archivo no tiene una firma PDF válida"
      });
    }
    
    // 2. Verificar tipo MIME usando fileType (si está disponible)
    try {
      const detectedType = await fileTypeFromBuffer(fileBuffer);
      if (!detectedType || detectedType.mime !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          error: "El archivo no es un PDF válido según su estructura binaria"
        });
      }
    } catch (typeError) {
      console.warn("Error al detectar tipo de archivo:", typeError);
    }
    
    // 3. Realizar validación estructural del PDF
    try {
      const validationResult = await validatePDFStructure(fileBuffer);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: validationResult.reason
        });
      }
    } catch (validationError) {
      console.error("Error en validación de estructura PDF:", validationError);
      return res.status(400).json({
        success: false,
        error: "Error al validar la estructura del PDF: " + validationError.message
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en validación de seguridad de PDF:', error);
    return res.status(500).json({
      success: false,
      error: "Error procesando el archivo: " + error.message
    });
  }
};

/**
 * Función para validación estructural detallada del PDF
 */
export async function validatePDFStructure(fileBuffer) {
  try {
    await PDFDocument.load(fileBuffer, { 
      ignoreEncryption: false,
      throwOnInvalidObject: true 
    });
    
    const fileContent = fileBuffer.toString('utf-8', 0, Math.min(fileBuffer.length, 5000)); // Solo revisar primeros 5000 bytes
    
    if (/\/JS |\/JavaScript |\/Launch |\/RichMedia |\/SubmitForm |\/GoTo/i.test(fileContent)) {
      return { valid: false, reason: "PDF contiene objetos potencialmente maliciosos" };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: `Error estructural en PDF: ${error.message}` };
  }
}