/**
 * Configuración para el servicio de Mistral OCR
 */
export const MistralConfig = {
  // Configuración de API
  apiKey: process.env.MISTRAL_API_KEY,
  
  // Modelo a utilizar
  model: 'mistral-ocr-latest',
  
  // Opciones de OCR
  ocrOptions: {
    // Si se deben incluir imágenes en base64 en la respuesta
    includeImageBase64: false,
    
    // Formato de salida preferido (markdown es el predeterminado)
    outputFormat: 'markdown',
    
    // Tiempo máximo para esperar resultados (en ms)
    timeout: 60000 // 1 minuto
  },
  
  // Opciones de procesamiento de documentos
  processingOptions: {
    // Número máximo de intentos de procesamiento
    maxRetries: 3,
    
    // Retraso entre reintentos (en ms)
    retryDelay: 2000
  }
};

export default MistralConfig;