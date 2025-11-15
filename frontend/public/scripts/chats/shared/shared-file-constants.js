
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB para todos los archivos
  MAX_TEXT_CONTENT: 100000,        // 100K caracteres máximo de contenido extraído
  MAX_FILES_PER_QUERY: 4,          // Máximo 4 archivos por consulta
  
  // Límites específicos por tipo (todos respetan el límite general)
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,     // 5MB para imágenes
  DOCUMENT_MAX_SIZE: 5 * 1024 * 1024,  // 5MB para documentos
  CODE_MAX_SIZE: 5 * 1024 * 1024       // 5MB para código
};

export const SUPPORTED_FILES = {
  IMAGES: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    description: 'Imágenes (JPG, PNG, WebP)'
  },
  
  DOCUMENTS: {
    mimeTypes: [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/rtf'
    ],
    extensions: ['txt', 'md', 'csv', 'docx', 'doc', 'rtf'],
    description: 'Documentos (TXT, DOC, DOCX, MD, CSV, RTF)'
  },
  
  CODE: {
    extensions: [
      // JavaScript y TypeScript
      'js', 'mjs', 'jsx', 'ts', 'tsx',
      // Python
      'py', 'pyw', 'ipynb',
      // Web
      'html', 'htm', 'xhtml', 'css', 'scss', 'sass',
      // Java y C family
      'java', 'c', 'cpp', 'h', 'hpp', 'cs',
      // Otros lenguajes
      'php', 'rb', 'go', 'swift', 'rs',
      // Configuración y datos
      'json', 'xml', 'yaml', 'yml', 'toml', 'ini',
      // Scripts y SQL
      'sql', 'sh', 'bash', 'ps1', 'bat'
    ],
    mimeTypes: [
      'text/javascript',
      'application/javascript',
      'application/x-javascript',         // ← CLAVE: Este causaba el error
      'text/ecmascript',
      'application/ecmascript',
      
      'text/typescript',
      'application/typescript',
      'text/x-typescript',
      
      'text/x-python',
      'application/x-python',
      'text/x-python-script',
      
      'text/x-java-source',
      'application/x-java',
      'text/x-java',
      
      'text/x-c',
      'application/x-c',
      'text/x-c++',
      'application/x-c++',
      
      'text/x-csharp',
      'application/x-csharp',
      
      'text/html',
      'application/xhtml+xml',
      'text/css',
      
      'application/json',
      'text/json',
      'text/xml',
      'application/xml',
      'application/yaml',
      'text/x-yaml',
      'text/yaml',
      
      'application/x-sql',
      'text/x-sql',
      'text/sql',
      
      'text/plain'
    ],
    description: 'Archivos de código (JS, PY, HTML, CSS, Java, C++, etc.)'
  }
};

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

export const ACADEL_FILE_MESSAGES = {
  UNSUPPORTED_TYPE: {
    title: "¡Archivo rebelde detectado! 🤔",
    message: "Acadel no puede leer este tipo de archivo. Solo acepto imágenes, documentos de texto y código."
  },
  
  PDF_NOT_SUPPORTED: {
    title: "¡PDF Alert! 📋❌",
    message: "Los PDFs son como cajas cerradas para Acadel. ¿Podrías convertirlo a TXT o DOCX? ¡Gracias!"
  },
  
  EXECUTABLE_BLOCKED: {
    title: "¡Archivo peligroso detectado! 🛡️",
    message: "Acadel no acepta archivos ejecutables por seguridad. ¡Solo documentos y código fuente!"
  },
  
  FILE_TOO_LARGE: {
    title: "¡Archivo gigante detectado! 📊",
    message: "Este archivo supera los 5MB. Acadel necesita archivos más ligeros para analizarlos bien."
  },
  
  TEXT_TOO_LONG: {
    title: "¡Texto infinito detectado! 📜",
    message: "Este documento tiene más de 100,000 caracteres. Acadel necesita textos más cortos para dar buenas respuestas."
  },
  
  TOO_MANY_FILES: {
    title: "¡Exceso de archivos! 📚",
    message: "Acadel puede analizar máximo 4 archivos por consulta. ¡Calidad sobre cantidad!"
  },
  
  FILES_READY: {
    title: "¡Archivos listos para Acadel! 🎯",
    message: "Todos los archivos están perfectos. ¡Ahora pregúntame lo que necesites!"
  },
  
  FILE_PROCESSED: {
    title: "¡Archivo procesado! ✨",
    message: "Acadel ya leyó tu archivo y está listo para ayudarte."
  },
  
  FILE_PARTIALLY_READ: {
    title: "¡Archivo recortado! ✂️",
    message: "Tu archivo era muy largo, así que Acadel leyó las primeras partes. ¡Debería ser suficiente!"
  },
  
  FILE_CORRUPTED: {
    title: "¡Archivo dañadito! 🔧",
    message: "Acadel tuvo problemas para leer tu archivo. Puede ser el formato o que esté dañado. ¿Intentas con otro?"
  }
};


export function validateFileType(file, expectedType = null) {
  const fileName = typeof file === 'string' ? file : file.name;
  const fileSize = typeof file === 'string' ? 0 : file.size;
  const fileMimeType = typeof file === 'string' ? null : file.type;
  const extension = fileName.split('.').pop().toLowerCase();
  
  if (FORBIDDEN_FILES.BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      reason: FORBIDDEN_FILES.REASONS[extension] || 'Tipo de archivo no soportado',
      messageKey: extension === 'pdf' ? 'PDF_NOT_SUPPORTED' : 'EXECUTABLE_BLOCKED'
    };
  }
  
  if (fileMimeType && FORBIDDEN_FILES.BLOCKED_MIME_TYPES.includes(fileMimeType)) {
    return {
      valid: false,
      reason: 'Tipo MIME no permitido por seguridad',
      messageKey: 'EXECUTABLE_BLOCKED'
    };
  }
  
  if (fileSize > FILE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `Archivo demasiado grande (${Math.round(fileSize / 1024 / 1024)}MB, máximo 5MB)`,
      messageKey: 'FILE_TOO_LARGE'
    };
  }
  
  let detectedType = null;
  
  if (fileMimeType) {
    if (SUPPORTED_FILES.IMAGES.mimeTypes.includes(fileMimeType)) {
      detectedType = 'image';
    } else if (SUPPORTED_FILES.DOCUMENTS.mimeTypes.includes(fileMimeType)) {
      detectedType = 'document';
    } else if (SUPPORTED_FILES.CODE.mimeTypes.includes(fileMimeType)) {
      detectedType = 'code';
    }
  }
  
  if (!detectedType) {
    if (SUPPORTED_FILES.IMAGES.extensions.includes(extension)) {
      detectedType = 'image';
    } else if (SUPPORTED_FILES.DOCUMENTS.extensions.includes(extension)) {
      detectedType = 'document';
    } else if (SUPPORTED_FILES.CODE.extensions.includes(extension)) {
      detectedType = 'code';
    }
  }
  
  if (!detectedType) {
    return {
      valid: false,
      reason: `Extensión .${extension}${fileMimeType ? ` con tipo MIME ${fileMimeType}` : ''} no soportada`,
      messageKey: 'UNSUPPORTED_TYPE'
    };
  }
  
  if (expectedType && detectedType !== expectedType) {
    return {
      valid: false,
      reason: `Archivo de tipo ${detectedType}, se esperaba ${expectedType}`,
      messageKey: 'UNSUPPORTED_TYPE'
    };
  }
  
  return {
    valid: true,
    detectedType,
    reason: 'Archivo válido'
  };
}

/**
 * Valida el contenido de texto extraído
 */
export function validateTextContent(content, fileName) {
  if (!content || typeof content !== 'string') {
    return { valid: true, reason: 'Sin contenido de texto', truncated: false };
  }
  
  if (content.length > FILE_LIMITS.MAX_TEXT_CONTENT) {
    return {
      valid: false,
      reason: `Contenido demasiado largo (${content.length.toLocaleString()} caracteres, máximo ${FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()})`,
      messageKey: 'TEXT_TOO_LONG',
      truncated: true,
      truncatedContent: content.substring(0, FILE_LIMITS.MAX_TEXT_CONTENT) + '\n\n[CONTENIDO TRUNCADO POR ACADEL...]'
    };
  }
  
  return { valid: true, reason: 'Contenido válido', truncated: false };
}

/**
 * Valida la cantidad total de archivos
 */
export function validateFileCount(fileCount) {
  if (fileCount > FILE_LIMITS.MAX_FILES_PER_QUERY) {
    return {
      valid: false,
      reason: `Demasiados archivos (${fileCount}, máximo ${FILE_LIMITS.MAX_FILES_PER_QUERY})`,
      messageKey: 'TOO_MANY_FILES'
    };
  }
  
  return { valid: true, reason: 'Cantidad válida' };
}

export function getSupportedTypesInfo() {
  return {
    images: {
      extensions: SUPPORTED_FILES.IMAGES.extensions,
      description: SUPPORTED_FILES.IMAGES.description,
      maxSize: `${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`
    },
    documents: {
      extensions: SUPPORTED_FILES.DOCUMENTS.extensions,
      description: SUPPORTED_FILES.DOCUMENTS.description,
      maxSize: `${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      maxTextContent: `${FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()} caracteres`
    },
    code: {
      extensions: SUPPORTED_FILES.CODE.extensions.slice(0, 15), // Mostrar los primeros 15
      description: SUPPORTED_FILES.CODE.description,
      maxSize: `${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      totalSupported: SUPPORTED_FILES.CODE.extensions.length
    },
    limits: {
      maxFilesPerQuery: FILE_LIMITS.MAX_FILES_PER_QUERY,
      maxFileSize: `${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      maxTextContent: `${FILE_LIMITS.MAX_TEXT_CONTENT.toLocaleString()} caracteres`
    },
    forbidden: {
      pdf: "PDFs no soportados - usa TXT o DOCX",
      executables: "Sin archivos ejecutables por seguridad",
      compressed: "Sin archivos comprimidos (ZIP, RAR, 7Z)"
    }
  };
}

export default {
  FILE_LIMITS,
  SUPPORTED_FILES,
  FORBIDDEN_FILES,
  ACADEL_FILE_MESSAGES,
  validateFileType,
  validateTextContent,
  validateFileCount,
  getSupportedTypesInfo
};