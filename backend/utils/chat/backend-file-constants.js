/**
 * 📚🦫 CONFIGURACIÓN CENTRALIZADA DE ARCHIVOS - BACKEND ACADEL
 * Constantes y validaciones compartidas para el backend
 * DEBE MANTENER COHERENCIA TOTAL CON EL FRONTEND
 */

// ====== LÍMITES GENERALES ======
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB para todos los archivos
  MAX_TEXT_CONTENT: 100000,        // 100K caracteres máximo de contenido extraído
  MAX_FILES_PER_QUERY: 4,          // Máximo 4 archivos por consulta
  
  // Límites específicos por tipo (todos respetan el límite general)
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,     // 5MB para imágenes
  DOCUMENT_MAX_SIZE: 5 * 1024 * 1024,  // 5MB para documentos
  CODE_MAX_SIZE: 5 * 1024 * 1024       // 5MB para código
};

// ====== TIPOS DE ARCHIVO SOPORTADOS ======
export const SUPPORTED_FILES = {
  IMAGES: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    description: 'Imágenes (JPG, PNG, WebP)',
    type: 'image'
  },
  
  DOCUMENTS: {
    mimeTypes: {
      'text/plain': { extension: 'txt', type: 'document' },
      'text/markdown': { extension: 'md', type: 'document' },
      'text/csv': { extension: 'csv', type: 'document' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'docx', type: 'document' },
      'application/msword': { extension: 'doc', type: 'document' },
      'text/rtf': { extension: 'rtf', type: 'document' }
    },
    extensions: ['txt', 'docx', 'doc', 'md', 'csv', 'rtf'],
    description: 'Documentos (TXT, DOC, DOCX, MD, CSV)',
    type: 'document'
  },
  
  CODE: {
    mimeTypes: {
      'text/javascript': { extension: 'js', type: 'code' },
      'application/javascript': { extension: 'js', type: 'code' },      // ✅ NUEVO
      'application/x-javascript': { extension: 'js', type: 'code' },   // ✅ NUEVO - Este es el que falta
      'text/ecmascript': { extension: 'js', type: 'code' },            // ✅ NUEVO
      'application/ecmascript': { extension: 'js', type: 'code' },     // ✅ NUEVO
      
      'text/typescript': { extension: 'ts', type: 'code' },
      'application/typescript': { extension: 'ts', type: 'code' },     // ✅ NUEVO
      'text/x-typescript': { extension: 'ts', type: 'code' },          // ✅ NUEVO
      
      'text/x-python': { extension: 'py', type: 'code' },
      'application/x-python': { extension: 'py', type: 'code' },       // ✅ NUEVO
      'text/x-python-script': { extension: 'py', type: 'code' },       // ✅ NUEVO
      
      'text/x-java-source': { extension: 'java', type: 'code' },
      'application/x-java': { extension: 'java', type: 'code' },       // ✅ NUEVO
      'text/x-java': { extension: 'java', type: 'code' },              // ✅ NUEVO
      
      'text/x-c': { extension: 'c', type: 'code' },
      'application/x-c': { extension: 'c', type: 'code' },             // ✅ NUEVO
      'text/x-c++': { extension: 'cpp', type: 'code' },
      'application/x-c++': { extension: 'cpp', type: 'code' },         // ✅ NUEVO
      
      'text/x-csharp': { extension: 'cs', type: 'code' },
      'application/x-csharp': { extension: 'cs', type: 'code' },       // ✅ NUEVO
      
      'text/html': { extension: 'html', type: 'code' },
      'application/xhtml+xml': { extension: 'xhtml', type: 'code' },   // ✅ NUEVO
      'text/css': { extension: 'css', type: 'code' },
      
      'text/xml': { extension: 'xml', type: 'document' },
      'application/xml': { extension: 'xml', type: 'document' },       // ✅ NUEVO
      'application/json': { extension: 'json', type: 'code' },
      'text/json': { extension: 'json', type: 'code' },               // ✅ NUEVO
      'application/yaml': { extension: 'yaml', type: 'code' },
      'text/x-yaml': { extension: 'yml', type: 'code' },
      'text/yaml': { extension: 'yaml', type: 'code' },               // ✅ NUEVO
      
      'application/x-sql': { extension: 'sql', type: 'code' },
      'text/x-sql': { extension: 'sql', type: 'code' },
      'text/sql': { extension: 'sql', type: 'code' }                  // ✅ NUEVO
    },
    
    // También actualiza las extensiones para incluir las nuevas variantes
    extensions: [
      // JavaScript y TypeScript
      'js', 'mjs', 'jsx', 'ts', 'tsx',                               // ✅ AGREGADO: mjs, jsx, tsx
      // Python
      'py', 'pyw', 'ipynb',                                          // ✅ AGREGADO: pyw
      // Web
      'html', 'htm', 'xhtml', 'css', 'scss', 'sass',               // ✅ AGREGADO: htm, xhtml, scss, sass
      // Java y C family
      'java', 'c', 'cpp', 'h', 'hpp', 'cs',                        // ✅ AGREGADO: hpp
      // Otros lenguajes
      'php', 'rb', 'go', 'swift', 'rs',
      // Configuración y datos
      'json', 'xml', 'yaml', 'yml', 'toml', 'ini',
      // Scripts y SQL
      'sql', 'sh', 'bash', 'ps1', 'bat'
    ],
    description: 'Archivos de código (JS, PY, HTML, CSS, Java, C++, etc.)',
    type: 'code'
  }
};

// ====== ARCHIVOS PROHIBIDOS ======
export const FORBIDDEN_FILES = {
  BLOCKED_EXTENSIONS: ['pdf', 'exe', 'msi', 'app', 'deb', 'rpm', 'zip', 'rar', '7z'],
  BLOCKED_MIME_TYPES: [
    'application/pdf',
    'application/x-msdownload',
    'application/x-dosexec',
    'application/x-executable',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ],
  
  REASONS: {
    'pdf': 'Los PDFs no están soportados. Acadel prefiere texto plano para mejor análisis',
    'exe': 'Archivos ejecutables no permitidos por seguridad',
    'msi': 'Instaladores no permitidos por seguridad',
    'app': 'Aplicaciones no permitidas por seguridad',
    'zip': 'Archivos comprimidos no soportados',
    'rar': 'Archivos comprimidos no soportados',
    '7z': 'Archivos comprimidos no soportados'
  }
};

// ====== FUNCIONES DE VALIDACIÓN BACKEND ======

/**
 * 🦫 Valida si un archivo es soportado por extensión y MIME type
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {number} fileSize - Tamaño del archivo en bytes
 * @returns {Object} - {valid: boolean, detectedType: string, reason: string, errorCode: string}
 */
export function validateFileTypeBackend(fileName, mimeType, fileSize) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  console.log(`🦫 Acadel Backend validando: ${fileName} (${mimeType}, ${fileSize} bytes)`);
  
  if (FORBIDDEN_FILES.BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      reason: FORBIDDEN_FILES.REASONS[extension] || 'Tipo de archivo no soportado',
      errorCode: extension === 'pdf' ? 'PDF_NOT_SUPPORTED' : 'EXECUTABLE_BLOCKED',
      detectedType: null
    };
  }
  
  if (FORBIDDEN_FILES.BLOCKED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      reason: 'Tipo MIME no permitido por seguridad',
      errorCode: 'EXECUTABLE_BLOCKED',
      detectedType: null
    };
  }
  
  if (fileSize > FILE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `Archivo demasiado grande (${Math.round(fileSize / 1024 / 1024)}MB, máximo 5MB)`,
      errorCode: 'FILE_TOO_LARGE',
      detectedType: null
    };
  }
  
  let detectedType = null;
  
  if (SUPPORTED_FILES.IMAGES.mimeTypes.includes(mimeType)) {
    detectedType = 'image';
  } else if (SUPPORTED_FILES.DOCUMENTS.mimeTypes[mimeType]) {
    detectedType = 'document';
  } else if (SUPPORTED_FILES.CODE.mimeTypes[mimeType]) {
    detectedType = 'code';
  }
  else if (SUPPORTED_FILES.IMAGES.extensions.includes(extension)) {
    detectedType = 'image';
  } else if (SUPPORTED_FILES.DOCUMENTS.extensions.includes(extension)) {
    detectedType = 'document';
  } else if (SUPPORTED_FILES.CODE.extensions.includes(extension)) {
    detectedType = 'code';
  }
  
  if (!detectedType) {
    return {
      valid: false,
      reason: `Extensión .${extension} con MIME type ${mimeType} no soportada`,
      errorCode: 'UNSUPPORTED_TYPE',
      detectedType: null
    };
  }
  
  console.log(`✅ Acadel Backend: Archivo válido como ${detectedType}`);
  return {
    valid: true,
    detectedType,
    reason: 'Archivo válido',
    errorCode: null
  };
}

/**
 * 🦫 Valida el contenido de texto extraído
 * @param {string} content - Contenido de texto
 * @param {string} fileName - Nombre del archivo
 * @returns {Object} - {valid: boolean, content: string, truncated: boolean, reason: string}
 */
export function validateTextContentBackend(content, fileName) {
  console.log(`🦫 Acadel Backend validando contenido: ${fileName} (${content?.length || 0} caracteres)`);
  
  if (!content || typeof content !== 'string') {
    return { 
      valid: true, 
      content: content || '', 
      truncated: false, 
      reason: 'Sin contenido de texto' 
    };
  }
  
  if (content.length > FILE_LIMITS.MAX_TEXT_CONTENT) {
    console.log(`⚠️ Acadel Backend: Contenido truncado para ${fileName} (${content.length} -> ${FILE_LIMITS.MAX_TEXT_CONTENT})`);
    
    const truncatedContent = content.substring(0, FILE_LIMITS.MAX_TEXT_CONTENT) + '\n\n[CONTENIDO TRUNCADO POR ACADEL...]';
    
    return {
      valid: true,
      content: truncatedContent,
      truncated: true,
      reason: `Contenido truncado: ${content.length.toLocaleString()} caracteres reducidos a ${FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()}`
    };
  }
  
  console.log(`✅ Acadel Backend: Contenido válido para ${fileName}`);
  return { 
    valid: true, 
    content: content, 
    truncated: false, 
    reason: 'Contenido válido' 
  };
}

/**
 * 🦫 Valida la cantidad total de archivos en un mensaje
 * @param {number} fileCount - Cantidad de archivos
 * @returns {Object} - {valid: boolean, reason: string, errorCode: string}
 */
export function validateFileCountBackend(fileCount) {
  console.log(`🦫 Acadel Backend validando cantidad: ${fileCount} archivos`);
  
  if (fileCount > FILE_LIMITS.MAX_FILES_PER_QUERY) {
    return {
      valid: false,
      reason: `Demasiados archivos (${fileCount}, máximo ${FILE_LIMITS.MAX_FILES_PER_QUERY})`,
      errorCode: 'TOO_MANY_FILES'
    };
  }
  
  console.log(`✅ Acadel Backend: Cantidad válida`);
  return { 
    valid: true, 
    reason: 'Cantidad válida',
    errorCode: null 
  };
}

/**
 * 🦫 Obtiene la configuración de tipos soportados para endpoints
 * @returns {Object} - Configuración completa para el frontend
 */
export function getSupportedTypesBackend() {
  return {
    mimeTypes: [
      ...SUPPORTED_FILES.IMAGES.mimeTypes,
      ...Object.keys(SUPPORTED_FILES.DOCUMENTS.mimeTypes),
      ...Object.keys(SUPPORTED_FILES.CODE.mimeTypes)
    ],
    extensions: [
      ...SUPPORTED_FILES.IMAGES.extensions,
      ...SUPPORTED_FILES.DOCUMENTS.extensions,
      ...SUPPORTED_FILES.CODE.extensions
    ],
    types: ['image', 'document', 'code'],
    limits: {
      maxFileSize: FILE_LIMITS.MAX_FILE_SIZE,
      maxTextContent: FILE_LIMITS.MAX_TEXT_CONTENT,
      maxFilesPerQuery: FILE_LIMITS.MAX_FILES_PER_QUERY
    },
    categories: {
      images: {
        mimeTypes: SUPPORTED_FILES.IMAGES.mimeTypes,
        extensions: SUPPORTED_FILES.IMAGES.extensions,
        description: SUPPORTED_FILES.IMAGES.description
      },
      documents: {
        mimeTypes: Object.keys(SUPPORTED_FILES.DOCUMENTS.mimeTypes),
        extensions: SUPPORTED_FILES.DOCUMENTS.extensions,
        description: SUPPORTED_FILES.DOCUMENTS.description
      },
      code: {
        mimeTypes: Object.keys(SUPPORTED_FILES.CODE.mimeTypes),
        extensions: SUPPORTED_FILES.CODE.extensions,
        description: SUPPORTED_FILES.CODE.description
      }
    },
    forbidden: {
      extensions: FORBIDDEN_FILES.BLOCKED_EXTENSIONS,
      mimeTypes: FORBIDDEN_FILES.BLOCKED_MIME_TYPES,
      reasons: FORBIDDEN_FILES.REASONS
    }
  };
}

/**
 * 🦫 Detecta el lenguaje de programación basado en la extensión
 * @param {string} fileName - Nombre del archivo
 * @param {string} content - Contenido del archivo (opcional)
 * @returns {string|null} - Lenguaje detectado o null
 */
export function detectLanguageBackend(fileName, content = '') {
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Mapeo de extensiones a lenguajes
  const extensionMap = {
    // JavaScript y TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    
    // Python
    'py': 'python',
    'ipynb': 'python',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'sass': 'css',
    
    // Java y familia C
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'cs': 'csharp',
    
    // Otros lenguajes
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    
    // Configuración y datos
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    
    // Scripts y SQL
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'ps1': 'powershell',
    'bat': 'batch',
    
    // Documentos
    'md': 'markdown',
    'txt': 'text',
    'csv': 'csv',
    'rtf': 'rtf'
  };

  if (extensionMap[extension]) {
    console.log(`🦫 Acadel Backend detectó lenguaje: ${extensionMap[extension]} para .${extension}`);
    return extensionMap[extension];
  }

  // Detección básica por contenido para archivos sin extensión clara
  if (content) {
    const lowerContent = content.toLowerCase().substring(0, 1000);
    
    if (lowerContent.includes('function') && lowerContent.includes('{')) {
      console.log(`🦫 Acadel Backend detectó JavaScript por contenido`);
      return 'javascript';
    }
    if (lowerContent.includes('def ') && lowerContent.includes(':')) {
      console.log(`🦫 Acadel Backend detectó Python por contenido`);
      return 'python';
    }
    if (lowerContent.includes('public class') || lowerContent.includes('import java')) {
      console.log(`🦫 Acadel Backend detectó Java por contenido`);
      return 'java';
    }
    if (lowerContent.includes('<!doctype') || lowerContent.includes('<html')) {
      console.log(`🦫 Acadel Backend detectó HTML por contenido`);
      return 'html';
    }
    if (lowerContent.includes('select ') || lowerContent.includes('create table')) {
      console.log(`🦫 Acadel Backend detectó SQL por contenido`);
      return 'sql';
    }
  }

  console.log(`🦫 Acadel Backend: No se pudo detectar lenguaje para .${extension}`);
  return null;
}

/**
 * 🦫 Infiere MIME type basado en la extensión del archivo
 * @param {string} fileName - Nombre del archivo
 * @returns {string} - MIME type inferido
 */
export function inferMimeTypeFromExtensionBackend(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const extensionToMimeType = {
    // Imágenes
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    
    // Documentos
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'rtf': 'text/rtf',
    
    // Código
    'js': 'text/javascript',
    'jsx': 'text/javascript',
    'ts': 'text/typescript',
    'tsx': 'text/typescript',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'cs': 'text/x-csharp',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'php': 'text/x-php',
    'rb': 'text/x-ruby',
    'xml': 'text/xml',
    'json': 'application/json',
    'yaml': 'application/yaml',
    'yml': 'text/x-yaml',
    'sql': 'application/x-sql',
    'sh': 'text/x-shellscript',
    'bash': 'text/x-shellscript'
  };
  
  const inferredType = extensionToMimeType[extension];
  
  if (inferredType) {
    console.log(`🦫 Acadel Backend infirió MIME type: ${extension} -> ${inferredType}`);
    return inferredType;
  }
  
  console.log(`🦫 Acadel Backend: MIME type no encontrado para .${extension}, usando text/plain`);
  return 'text/plain';
}

/**
 * 🦫 Crea configuración de supportedMimeTypes para documentStorageService
 * @returns {Object} - Configuración compatible con el servicio existente
 */
export function createSupportedMimeTypesConfig() {
  const config = {};
  
  Object.entries(SUPPORTED_FILES.DOCUMENTS.mimeTypes).forEach(([mimeType, info]) => {
    config[mimeType] = info;
  });
  
  Object.entries(SUPPORTED_FILES.CODE.mimeTypes).forEach(([mimeType, info]) => {
    config[mimeType] = info;
  });
  
  console.log(`🦫 Acadel Backend creó configuración de ${Object.keys(config).length} tipos MIME`);
  return config;
}

// ====== EXPORTAR PARA USO EN SERVICIOS ======
export default {
  FILE_LIMITS,
  SUPPORTED_FILES,
  FORBIDDEN_FILES,
  validateFileTypeBackend,
  validateTextContentBackend,
  validateFileCountBackend,
  getSupportedTypesBackend,
  detectLanguageBackend,
  inferMimeTypeFromExtensionBackend,
  createSupportedMimeTypesConfig
};