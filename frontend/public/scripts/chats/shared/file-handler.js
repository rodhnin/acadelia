/**
 * file-handler.js - Utilidades optimizadas para manejar archivos con configuración centralizada
 * 🦫 ACTUALIZADO PARA PROFESOR ACADEL - Coherencia total entre frontend y backend
 */

import { 
  createElement,
} from './dom-helpers.js';

// ====== IMPORTAR CONFIGURACIÓN CENTRALIZADA ======
import {
  FILE_LIMITS,
  SUPPORTED_FILES,
  FORBIDDEN_FILES,
  ACADEL_FILE_MESSAGES,
  validateFileType,
  validateTextContent,
  validateFileCount
} from './shared-file-constants.js';

// Control para carga de mammoth.js
let mammothLoadPromise = null;

/**
 * 🦫 NOTIFICACIONES ACADEL CENTRALIZADAS
 * Funciones para mostrar notificaciones con personalidad Acadel
 */
function showAcadelError(messageKey, customMessage = null) {
  const message = ACADEL_FILE_MESSAGES[messageKey];
  if (typeof window.acadelError === 'function') {
    window.acadelError(message.title, customMessage || message.message);
  } else {
    console.error('Sistema Acadel:', message.title, '-', customMessage || message.message);
  }
}

function showAcadelSuccess(messageKey, customMessage = null) {
  const message = ACADEL_FILE_MESSAGES[messageKey];
  if (typeof window.acadelExito === 'function') {
    window.acadelExito(message.title, customMessage || message.message);
  } else {
    console.log('Sistema Acadel:', message.title, '-', customMessage || message.message);
  }
}

function showAcadelWarning(messageKey, customMessage = null) {
  const message = ACADEL_FILE_MESSAGES[messageKey];
  if (typeof window.acadelWarning === 'function') {
    window.acadelWarning(message.title, customMessage || message.message);
  } else {
    console.warn('Sistema Acadel:', message.title, '-', customMessage || message.message);
  }
}

/**
 * Obtener la extensión de un archivo
 * @param {string|File} fileOrName - Archivo o nombre de archivo
 * @returns {string} Extensión en minúsculas
 */
export function getFileExtension(fileOrName) {
  const fileName = fileOrName instanceof File ? fileOrName.name : fileOrName;
  return fileName.split('.').pop().toLowerCase();
}

/**
 * 🦫 VALIDACIÓN ACADEL CENTRALIZADA
 * Valida que un archivo cumpla con los estándares de Acadel
 * @param {File} file - Archivo a validar
 * @param {string} expectedType - Tipo esperado ('image', 'document', 'code')
 * @returns {Promise<boolean>} true si el archivo es válido
 */
export async function validateFile(file, expectedType) {
  if (!file) {
    showAcadelError('UNSUPPORTED_TYPE', 'No se ha seleccionado ningún archivo');
    return { valid: false, truncated: false, fileName: '' };
  }

  // PASO 1: Validación básica de tipo y tamaño
  const typeValidation = validateFileType(file, expectedType);
  if (!typeValidation.valid) {
    showAcadelError(typeValidation.messageKey, typeValidation.reason);
    return { valid: false, truncated: false, fileName: file.name };
  }

  // PASO 2: Validación avanzada por contenido (solo para archivos críticos)
  try {
    const { valid, detectedType, fileType } = await verifyFileSignature(file);
    
    if (fileType === 'executable') {
      showAcadelError('EXECUTABLE_BLOCKED');
      return { valid: false, truncated: false, fileName: file.name };
    }
    
    if (fileType === 'pdf') {
      showAcadelError('PDF_NOT_SUPPORTED');
      return { valid: false, truncated: false, fileName: file.name };
    }
    
    // PASO 3: NUEVA VALIDACIÓN PREVIA DEL CONTENIDO PARA ARCHIVOS DE TEXTO
    let contentTruncated = false;
    
    if (expectedType === 'document' || expectedType === 'code') {
      try {
        console.log('🔍 Acadel pre-validando contenido de:', file.name);
        const previewContent = await getFileContentPreview(file, expectedType);
        
        if (previewContent.length > FILE_LIMITS.MAX_TEXT_CONTENT) {
          contentTruncated = true;
          
          showAcadelWarning('FILE_PARTIALLY_READ', 
            `"${file.name}" es muy largo (${previewContent.length.toLocaleString()} caracteres). Acadel leerá solo los primeros ${FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()} caracteres.`
          );
          
          console.log(`🦫 Acadel detectó que "${file.name}" será truncado`);
        }
      } catch (contentError) {
        console.warn('⚠️ No se pudo pre-validar contenido:', contentError);
      }
    }
    
    if (expectedType === 'code') {
      const isText = await isTextFile(file);
      if (!isText) {
        showAcadelError('FILE_CORRUPTED', 'El archivo de código no contiene texto legible');
        return { valid: false, truncated: false, fileName: file.name };
      }
    }
    
    return { 
      valid: true, 
      truncated: contentTruncated, 
      fileName: file.name 
    };
    
  } catch (error) {
    console.warn('Error en verificación avanzada:', error);
    return { valid: true, truncated: false, fileName: file.name };
  }
}

/**
 * 🆕 NUEVA FUNCIÓN: Obtiene una vista previa del contenido del archivo
 * Para validar el tamaño antes de procesar completamente
 * @param {File} file - Archivo a pre-validar
 * @param {string} fileType - Tipo de archivo ('document' o 'code')
 * @returns {Promise<string>} Contenido del archivo (puede ser parcial)
 */
async function getFileContentPreview(file, fileType) {
  return new Promise((resolve, reject) => {
    const extension = getFileExtension(file);
    const reader = new FileReader();
    
    if (extension === 'txt' || fileType === 'code') {
      reader.onload = (event) => {
        resolve(event.target.result || '');
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    }
    else if (extension === 'doc' || extension === 'docx') {
      reader.onload = async (event) => {
        try {
          if (typeof mammoth === 'undefined') {
            await loadMammothJs();
          }
          
          if (typeof mammoth !== 'undefined') {
            const result = await mammoth.extractRawText({
              arrayBuffer: event.target.result
            });
            resolve(result.value || '');
          } else {
            // Si mammoth no está disponible, estimar por tamaño de archivo
            const estimatedChars = Math.floor(file.size / 2); // Estimación aproximada
            resolve('x'.repeat(estimatedChars)); // String de estimación
          }
        } catch (error) {
          // Si falla, estimar por tamaño
          const estimatedChars = Math.floor(file.size / 2);
          resolve('x'.repeat(estimatedChars));
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo documento'));
      reader.readAsArrayBuffer(file);
    }
    else {
      const estimatedChars = Math.floor(file.size / 2);
      resolve('x'.repeat(estimatedChars));
    }
  });
}


/**
 * 🦫 VALIDACIÓN DE CONTENIDO DE TEXTO ACADEL
 * Valida límites de contenido de texto con notificaciones Acadel
 * @param {string} content - Contenido de texto 
 * @param {string} fileName - Nombre del archivo
 * @returns {Object} - {valid: boolean, content: string, truncated: boolean}
 */
export function validateContentLimits(content, fileName) {
  console.log('🔍 Acadel validando contenido:', fileName, 'Caracteres:', content?.length || 0);
  
  if (!content || typeof content !== 'string') {
    return { valid: true, content: content, truncated: false };
  }

  const validation = validateTextContent(content, fileName);
  
  if (!validation.valid) {
    if (validation.truncated) {
      showAcadelWarning('FILE_PARTIALLY_READ', 
        `"${fileName}" era muy largo (${content.length.toLocaleString()} caracteres). Acadel leyó los primeros ${FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()}.`
      );
      return { 
        valid: true, 
        content: validation.truncatedContent, 
        truncated: true 
      };
    } else {
      showAcadelError('TEXT_TOO_LONG', validation.reason);
      return { valid: false, content: null, truncated: false };
    }
  }

  return { valid: true, content: content, truncated: false };
}

/**
 * 🦫 VALIDACIÓN DE CANTIDAD DE ARCHIVOS ACADEL
 * @param {number} currentCount - Cantidad actual de archivos
 * @returns {boolean} true si es válido
 */
export function validateFileCountLimit(currentCount) {
  const validation = validateFileCount(currentCount);
  
  if (!validation.valid) {
    showAcadelError('TOO_MANY_FILES', validation.reason);
    return false;
  }
  
  return true;
}

/**
 * Convierte y comprime una imagen a formato Base64
 * @param {File} file - Archivo de imagen
 * @param {Object} options - Opciones de compresión
 * @returns {Promise<string>} Cadena Base64 de la imagen comprimida
 */
export function imageToBase64(file, options = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      reject(new Error('Se requiere un archivo válido'));
      return;
    }

    if (!SUPPORTED_FILES.IMAGES.mimeTypes.includes(file.type)) {
      showAcadelError('UNSUPPORTED_TYPE', 
        `Solo acepto ${SUPPORTED_FILES.IMAGES.description}`);
      reject(new Error('Tipo de imagen no soportado'));
      return;
    }

    if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
      showAcadelError('FILE_TOO_LARGE', 
        `La imagen debe ser menor a ${FILE_LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)}MB`);
      reject(new Error('Imagen demasiado grande'));
      return;
    }

    const maxWidth = options.maxWidth || 800;
    const maxHeight = options.maxHeight || 800;
    const quality = options.quality || 0.7;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Liberar el objeto URL después de cargar la imagen
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;
      
      // Escalar si es necesario
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let outputFormat = 'image/jpeg';
        if (file.type === 'image/png' && !options.forceJpeg) {
          outputFormat = 'image/png';
        } else if (file.type === 'image/webp' && !options.forceJpeg) {
          outputFormat = 'image/webp';
        }
        
        const base64 = canvas.toDataURL(outputFormat, quality);
        
        canvas.width = 0;
        canvas.height = 0;
        
        resolve(base64);
      } catch (error) {
        showAcadelError('FILE_CORRUPTED', 'Error al procesar la imagen');
        reject(new Error('Error al procesar la imagen: ' + error.message));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      showAcadelError('FILE_CORRUPTED', 'La imagen está dañada o corrupta');
      reject(new Error('Error al cargar la imagen'));
    };

    img.src = url;
  });
}

/**
 * Extrae texto de un archivo de documento
 * @param {File} file - Archivo de texto
 * @returns {Promise<string>} Texto extraído del archivo
 */
export function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      reject(new Error('Se requiere un archivo válido'));
      return;
    }
    
    if (file.size > FILE_LIMITS.DOCUMENT_MAX_SIZE) {
      showAcadelError('FILE_TOO_LARGE', 
        `El documento debe ser menor a ${FILE_LIMITS.DOCUMENT_MAX_SIZE / (1024 * 1024)}MB`);
      reject(new Error('Documento demasiado grande'));
      return;
    }
    
    const extension = getFileExtension(file);
    
    if (!SUPPORTED_FILES.DOCUMENTS.extensions.includes(extension)) {
      showAcadelError('UNSUPPORTED_TYPE', 
        `Solo acepto ${SUPPORTED_FILES.DOCUMENTS.description}`);
      reject(new Error('Formato de documento no soportado'));
      return;
    }
    
    const reader = new FileReader();
    
    if (extension === 'txt') {
      reader.onload = (event) => {
        const content = event.target.result;
        const validation = validateContentLimits(content, file.name);
        
        if (!validation.valid) {
          reject(new Error('Contenido demasiado largo'));
          return;
        }
        
        if (validation.truncated) {
          console.log('🦫 Acadel truncó el contenido por ser muy largo');
        }
        
        resolve(validation.content);
      };
      
      reader.onerror = (error) => {
        showAcadelError('FILE_CORRUPTED', 'Error al leer el archivo TXT');
        reject(new Error('Error al leer el archivo: ' + error));
      };
      
      reader.readAsText(file);
    } 
    else if (extension === 'doc' || extension === 'docx') {
      reader.onload = async (event) => {
        try {
          // Cargamos mammoth.js dinámicamente si no está cargado
          await loadMammothJs();
          
          if (typeof mammoth === 'undefined') {
            throw new Error('La biblioteca Mammoth no se cargó correctamente');
          }
          
          const result = await mammoth.extractRawText({
            arrayBuffer: event.target.result
          });
          
          const content = result.value;
          const validation = validateContentLimits(content, file.name);
          
          if (!validation.valid) {
            reject(new Error('Contenido del documento demasiado largo'));
            return;
          }
          
          if (validation.truncated) {
            console.log('🦫 Acadel truncó el documento por ser muy largo');
          }
          
          resolve(validation.content);
        } catch (error) {
          showAcadelError('FILE_CORRUPTED', 
            'Error al procesar el documento DOCX. ¿Está dañado?');
          reject(new Error('Error al procesar archivo DOCX: ' + error.message));
        }
      };
      
      reader.onerror = (error) => {
        showAcadelError('FILE_CORRUPTED', 'Error al leer el documento');
        reject(new Error('Error al leer el archivo: ' + error));
      };
      
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Extrae texto de un archivo de código
 * @param {File} file - Archivo de código
 * @returns {Promise<string>} Texto del código extraído
 */
export function extractCodeFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      reject(new Error('Se requiere un archivo válido'));
      return;
    }
    
    if (file.size > FILE_LIMITS.CODE_MAX_SIZE) {
      showAcadelError('FILE_TOO_LARGE', 
        `El archivo de código debe ser menor a ${FILE_LIMITS.CODE_MAX_SIZE / (1024 * 1024)}MB`);
      reject(new Error('Archivo de código demasiado grande'));
      return;
    }
    
    const extension = getFileExtension(file);
    if (!SUPPORTED_FILES.CODE.extensions.includes(extension)) {
      showAcadelError('UNSUPPORTED_TYPE', 
        `Extensión .${extension} no soportada para código. Acepto: ${SUPPORTED_FILES.CODE.extensions.slice(0, 8).join(', ')}...`);
      reject(new Error(`Extensión de archivo de código no soportada: ${extension}`));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target.result;
      const validation = validateContentLimits(content, file.name);
      
      if (!validation.valid) {
        reject(new Error('Código demasiado largo'));
        return;
      }
      
      if (validation.truncated) {
        console.log('🦫 Acadel truncó el código por ser muy largo');
      }
      
      resolve(validation.content);
    };
    
    reader.onerror = (error) => {
      showAcadelError('FILE_CORRUPTED', 'Error al leer el archivo de código');
      reject(new Error('Error al leer el archivo de código: ' + error));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Carga dinámicamente la biblioteca mammoth.js para procesar archivos DOCX
 * @returns {Promise<void>}
 */
function loadMammothJs() {
  if (mammothLoadPromise) {
    return mammothLoadPromise;
  }
  
  if (typeof mammoth !== 'undefined') {
    return Promise.resolve();
  }
  
  mammothLoadPromise = new Promise((resolve, reject) => {
    const script = createElement('script', {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.21/mammoth.browser.min.js'
    });
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = () => {
      mammothLoadPromise = null;
      showAcadelError('FILE_CORRUPTED', 'No se pudo cargar el procesador de documentos DOCX');
      reject(new Error('No se pudo cargar Mammoth.js'));
    };
    
    document.head.appendChild(script);
  });
  
  return mammothLoadPromise;
}

/**
 * Formatea el tamaño de archivo a formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado (ej: "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  
  const units = ['KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = -1;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return size.toFixed(1) + ' ' + units[unitIndex];
}

/**
 * Trunca un nombre de archivo si excede la longitud máxima
 * @param {string} fileName - Nombre del archivo a truncar
 * @param {number} maxLength - Longitud máxima permitida (por defecto 25)
 * @returns {string} Nombre truncado o el original si no excede el límite
 */
export function truncateFileName(fileName, maxLength = 25) {
  if (!fileName || typeof fileName !== 'string') return '';
  
  if (fileName.length <= maxLength) return fileName;
  
  const lastDotIndex = fileName.lastIndexOf('.');
  let extension = '';
  let basename = fileName;
  
  if (lastDotIndex !== -1) {
    extension = fileName.substring(lastDotIndex);
    basename = fileName.substring(0, lastDotIndex);
  }
  
  const extensionLength = extension.length;
  const availableChars = maxLength - 3 - extensionLength;
  
  if (availableChars <= 0) {
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  const charsStart = Math.ceil(availableChars / 2);
  const charsEnd = Math.floor(availableChars / 2);
  
  return basename.substring(0, charsStart) + 
         '...' + 
         basename.substring(basename.length - charsEnd) + 
         extension;
}

/**
 * Detecta el tipo de archivo de código y devuelve un icono apropiado
 * @param {string} filename - Nombre del archivo
 * @returns {string} Nombre de la clase del icono de Boxicons
 */
export function getCodeFileIcon(filename) {
  if (!filename || typeof filename !== 'string') return 'bx-code-alt';
  
  const extension = getFileExtension(filename);
  
  const iconMap = {
    // JavaScript y TypeScript
    'js': 'bxl-javascript',
    'ts': 'bxl-typescript',
    'jsx': 'bxl-react',
    'tsx': 'bxl-react',
    'json': 'bx-code-curly',
    
    // HTML y CSS
    'html': 'bxl-html5',
    'htm': 'bxl-html5',
    'css': 'bxl-css3',
    'scss': 'bxl-css3',
    'sass': 'bxl-css3',
    
    // Python
    'py': 'bxl-python',
    'ipynb': 'bxl-python',
    
    // Java
    'java': 'bxl-java',
    
    // PHP
    'php': 'bxl-php',
    
    // C, C++, C#
    'c': 'bx-code-block',
    'cpp': 'bx-code-block',
    'h': 'bx-code-block',
    'cs': 'bx-code-block',
    
    // Otros lenguajes
    'go': 'bx-code-alt',
    'rs': 'bx-code-alt',
    'swift': 'bx-code',
    
    // Shell scripts
    'sh': 'bx-terminal',
    'bash': 'bx-terminal',
    'ps1': 'bx-terminal',
    'bat': 'bx-terminal',
    
    // XML, configuración
    'xml': 'bx-code-curly',
    'yml': 'bx-code-curly',
    'yaml': 'bx-code-curly',
    'toml': 'bx-code-curly',
    'ini': 'bx-code-curly',
    
    // SQL
    'sql': 'bx-data',
    
    // Por defecto
    'default': 'bx-code-alt'
  };
  
  return iconMap[extension] || iconMap.default;
}

/**
 * Genera una previsualización HTML para un archivo de código
 * @param {File} file - Archivo de código
 * @param {string} fileId - ID único para el archivo
 * @returns {Promise<string>} HTML de previsualización
 */
export function generateCodePreview(file, fileId) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Archivo no válido'));
      return;
    }
    
    const fileIcon = getCodeFileIcon(file.name);
    
    const html = `
      <div class="file-preview document-preview code-preview" data-file-id="${fileId}" data-file-type="code" data-file-name="${file.name}">
        <i class='bx ${fileIcon}'></i>
        <div class="document-preview-name">${file.name}</div>
        <button class="file-preview-remove" aria-label="Eliminar" data-file-id="${fileId}">
          <i class='bx bx-x'></i>
        </button>
      </div>
    `;
    
    resolve(html);
  });
}

/**
 * Genera una previsualización HTML para un archivo
 * @param {File} file - Archivo (imagen o documento)
 * @param {string} fileId - ID único para el archivo
 * @returns {Promise<string>} HTML de previsualización
 */
export function generateFilePreview(file, fileId) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Archivo no válido'));
      return;
    }
    
    if (file.type.match(/^image\//)) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const html = `
          <div class="file-preview image-preview-container" data-file-id="${fileId}" data-file-type="image" data-file-name="${file.name}">
            <img src="${e.target.result}" class="image-preview" alt="${file.name}">
            <button class="file-preview-remove" aria-label="Eliminar" data-file-id="${fileId}">
              <i class='bx bx-x'></i>
            </button>
          </div>
        `;
        
        resolve(html);
      };
      
      reader.onerror = () => reject(new Error('Error al leer la imagen'));
      reader.readAsDataURL(file);
    }
    else {
      const extension = getFileExtension(file);
      const icon = extension === 'docx' || extension === 'doc' ? 'bxs-file-doc' : 'bxs-file-txt';
      
      const html = `
        <div class="file-preview document-preview" data-file-id="${fileId}" data-file-type="document" data-file-name="${file.name}">
          <i class='bx ${icon}'></i>
          <div class="document-preview-name">${file.name}</div>
          <button class="file-preview-remove" aria-label="Eliminar" data-file-id="${fileId}">
            <i class='bx bx-x'></i>
          </button>
        </div>
      `;
      
      resolve(html);
    }
  });
}

/**
 * Crear un archivo a partir de un blob y un nombre
 * @param {Blob} blob - Blob del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} type - Tipo MIME del archivo
 * @returns {File} Objeto File creado
 */
export function createFileFromBlob(blob, fileName, type) {
  if (!blob || !fileName) {
    throw new Error('Se requiere un blob y nombre de archivo');
  }
  return new File([blob], fileName, { type: type || 'application/octet-stream' });
}

/**
 * Verifica magic numbers para validar el tipo de archivo real
 * @param {File|Blob} file - Archivo a verificar
 * @returns {Promise<{valid: boolean, detectedType: string, fileType: string}>}
 */
export async function verifyFileSignature(file) {
  const signatures = {
    // Imágenes
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38]],
    
    // Documentos
    'text/plain': null,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 
      [[0x50, 0x4B, 0x03, 0x04]],
    
    // Archivos prohibidos
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/x-msdownload': [[0x4D, 0x5A]],
    'application/x-dosexec': [[0x4D, 0x5A]]
  };
  
  const bytesToRead = 12;
  const arrayBuffer = await file.slice(0, bytesToRead).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  let detectedType = null;
  
  for (const [mimeType, signatureList] of Object.entries(signatures)) {
    if (mimeType === 'text/plain') {
      if (await isTextFile(file)) {
        detectedType = mimeType;
        break;
      }
      continue;
    }
    
    if (!signatureList) continue;
    
    for (const signature of signatureList) {
      let matches = true;
      
      for (let i = 0; i < signature.length; i++) {
        if (signature[i] === null) continue;
        
        if (bytes[i] !== signature[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        detectedType = mimeType;
        break;
      }
    }
    
    if (detectedType) break;
  }
  
  let fileType = 'unknown';
  if (detectedType?.startsWith('image/')) fileType = 'image';
  else if (detectedType === 'text/plain') fileType = 'document';
  else if (detectedType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') 
    fileType = 'document';
  else if (detectedType === 'application/pdf') fileType = 'pdf';
  else if (detectedType?.includes('exec') || detectedType?.includes('download')) 
    fileType = 'executable';
  
  return {
    valid: detectedType !== null,
    detectedType: detectedType || 'unknown',
    fileType
  };
}

/**
 * Verifica si un archivo parece ser texto plano
 * @param {File|Blob} file - Archivo a verificar
 * @returns {Promise<boolean>}
 */
async function isTextFile(file) {
  try {
    const sampleSize = 1024;
    const blob = file.slice(0, sampleSize);
    const textSample = await blob.text();
    
    const nonPrintableCount = textSample
      .split('')
      .filter(char => {
        const code = char.charCodeAt(0);
        return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code > 126;
      })
      .length;
    
    const threshold = sampleSize * 0.1;
    return nonPrintableCount < threshold;
  } catch (error) {
    return false;
  }
}

// ====== EXPORTAR TODO ======
export default {
  imageToBase64,
  extractTextFromFile,
  extractCodeFromFile,
  formatFileSize,
  generateFilePreview,
  generateCodePreview,
  validateFile,
  validateContentLimits,
  validateFileCountLimit,
  createFileFromBlob,
  truncateFileName,
  getCodeFileIcon,
  getFileExtension,
  verifyFileSignature
};