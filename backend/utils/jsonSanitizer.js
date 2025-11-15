// jsonSanitizer.js - Servicio para sanitizar y validar JSON antes de guardarlo
export const jsonSanitizer = {
  /**
   * Sanitiza y valida un JSON antes de guardarlo en la base de datos
   * @param {string|object} input - El JSON como string o objeto
   * @param {object} options - Opciones de sanitización
   * @returns {object} - Objeto sanitizado y válido
   */
  sanitizeJson(input, options = {}) {
    const {
      preserveTemplates = true, // Mantener plantillas {{}} 
      maxStringLength = 15000,  // Longitud máxima de strings (aumentado)
      removeInvalidChars = true, // Remover caracteres inválidos
      validateStructure = true,
      preservePropertyNames = true, // Preservar nombres de propiedades originales
      maxDepth = 10
    } = options;

    try {
      console.log("🧹 Iniciando sanitización de JSON con estructuras complejas...");
      
      // PASO 1: Convertir a string si es necesario
      let jsonString = '';
      if (typeof input === 'string') {
        jsonString = input.trim();
      } else if (typeof input === 'object' && input !== null) {
        jsonString = JSON.stringify(input, null, 2);
      } else {
        throw new Error('Input debe ser string o object');
      }

      // PASO 2: Limpiar caracteres problemáticos al inicio/final
      jsonString = this.cleanJsonBoundaries(jsonString);

      // PASO 3: Escapar caracteres especiales en strings
      jsonString = this.escapeSpecialCharacters(jsonString, preserveTemplates);

      // PASO 4: Validar y corregir estructura JSON
      if (validateStructure) {
        jsonString = this.validateAndFixStructure(jsonString);
      }

      // PASO 5: Parsear para validar
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (parseError) {
        console.warn("⚠️ Error en parseo inicial, intentando reparación automática...");
        jsonString = this.repairJsonString(jsonString);
        parsedJson = JSON.parse(jsonString);
      }

      // PASO 6: Sanitizar contenido del objeto parseado (MEJORADO)
      const sanitizedObject = this.sanitizeObjectContent(parsedJson, {
        maxStringLength,
        removeInvalidChars,
        preserveTemplates,
        preservePropertyNames,
        maxDepth,
        currentDepth: 0
      });

      // PASO 7: Validación final SIN agregar metadatos no deseados
      const finalValidation = this.performFinalValidation(sanitizedObject, {
        skipWarnings: true,
        skipMetadata: true,
        maxDepth
      });
      
      console.log("✅ JSON con estructuras complejas sanitizado exitosamente");
      return {
        success: true,
        data: finalValidation.data,
        warnings: finalValidation.warnings,
        changes: finalValidation.changes
      };

    } catch (error) {
      console.error("❌ Error en sanitización de JSON complejo:", error);
      return {
        success: false,
        error: error.message,
        originalInput: typeof input === 'string' ? input.substring(0, 200) : 'Object',
        fallbackData: this.createFallbackObject(input)
      };
    }
  },

  /**
   * Limpia caracteres problemáticos al inicio y final del JSON
   */
  cleanJsonBoundaries(jsonString) {
    jsonString = jsonString.replace(/^\uFEFF/, ''); // BOM
    jsonString = jsonString.replace(/^[\s\u200B-\u200D\uFEFF]/, ''); // Espacios invisibles
    
    const startMatch = jsonString.match(/^[^{[]*([{[])/);
    if (startMatch) {
      const startIndex = jsonString.indexOf(startMatch[1]);
      jsonString = jsonString.substring(startIndex);
    }

    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let lastValidIndex = -1;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const prevChar = i > 0 ? jsonString[i - 1] : '';
      
      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;

        if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
          lastValidIndex = i;
          break;
        }
      }
    }

    if (lastValidIndex > -1) {
      jsonString = jsonString.substring(0, lastValidIndex + 1);
    }

    return jsonString.trim();
  },

  escapeSpecialCharacters(jsonString, preserveTemplates = true) {
    let result = jsonString;

    result = result.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
      let processedContent = content;
      
      processedContent = processedContent
        .replace(/\\/g, '\\\\')  // Escapar backslashes primero
        .replace(/"/g, '\\"')    // Escapar comillas dobles
        .replace(/\r\n/g, '\\n') // Convertir CRLF a \n
        .replace(/\r/g, '\\n')   // Convertir CR a \n
        .replace(/\n/g, '\\n')   // Escapar saltos de línea
        .replace(/\t/g, '\\t')   // Escapar tabs
        .replace(/\f/g, '\\f')   // Escapar form feeds
        .replace(/\b/g, '\\b');  // Escapar backspaces

      if (preserveTemplates) {
        // Asegurar que las plantillas estén correctamente formateadas
        processedContent = processedContent
          .replace(/\\\{/g, '{')  // Desescapar llaves si fueron escapadas
          .replace(/\\\}/g, '}'); // Desescapar llaves si fueron escapadas
      } else {
        processedContent = processedContent
          .replace(/\{/g, '\\{')
          .replace(/\}/g, '\\}');
      }

      processedContent = processedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      return `"${processedContent}"`;
    });

    return result;
  },

  validateAndFixStructure(jsonString) {
    let result = jsonString;

    result = result.replace(/,\s*,/g, ',');
    
    result = result.replace(/,(\s*[}\]])/g, '$1');
    
    result = result.replace(/}(\s*)"([^"]+)"\s*:/g, '},$1"$2":');
    result = result.replace(/](\s*)"([^"]+)"\s*:/g, '],$1"$2":');
    result = result.replace(/"([^"]+)"\s*:([^,}\]]+)(\s*)"([^"]+)"\s*:/g, '"$1":$2,$3"$4":');

    // Asegurar que las propiedades estén entre comillas
    result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

    return result;
  },

  repairJsonString(jsonString) {
    console.log("🔧 Intentando reparar JSON malformado complejo...");
    
    let repaired = jsonString;

    // Estrategia 1: Corregir comillas sin escapar dentro de strings
    repaired = this.fixUnescapedQuotes(repaired);

    // Estrategia 2: Corregir estructura de arrays y objetos
    repaired = this.fixArrayAndObjectStructure(repaired);

    repaired = this.fixNestedObjects(repaired);

    // Estrategia 4: Si todo falla, intentar extraer un objeto válido
    if (!this.isValidJson(repaired)) {
      repaired = this.extractValidJsonSubset(jsonString);
    }

    return repaired;
  },

  fixNestedObjects(jsonString) {
    let result = jsonString;
    
    const openObjectPattern = /(\w+)"\s*:\s*\{[^}]*$/gm;
    result = result.replace(openObjectPattern, (match) => {
      if (!match.includes('}')) {
        return match + '}';
      }
      return match;
    });
    
    const openArrayPattern = /(\w+)"\s*:\s*\[[^\]]*$/gm;
    result = result.replace(openArrayPattern, (match) => {
      if (!match.includes(']')) {
        return match + ']';
      }
      return match;
    });
    
    return result;
  },

  /**
   * Corrige comillas sin escapar dentro de strings
   */
  fixUnescapedQuotes(jsonString) {
    let result = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const nextChar = jsonString[i + 1];
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        if (!inString) {
          // Comenzando un string
          inString = true;
          result += char;
        } else {
          // Terminando un string o comilla dentro del string
          const restOfLine = jsonString.substring(i + 1).match(/^\s*[,}\]:]/);
          if (restOfLine || nextChar === undefined) {
            // Es una comilla de cierre válida
            inString = false;
            result += char;
          } else {
            // Es una comilla dentro del string, escapar
            result += '\\"';
          }
        }
      } else {
        result += char;
      }
    }
    
    return result;
  },

  /**
   * Corrige estructura de arrays y objetos
   */
  fixArrayAndObjectStructure(jsonString) {
    let result = jsonString;

    const openBraces = (result.match(/\{/g) || []).length;
    const closeBraces = (result.match(/\}/g) || []).length;
    const openBrackets = (result.match(/\[/g) || []).length;
    const closeBrackets = (result.match(/\]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i++) {
      result += '}';
    }

    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      result += ']';
    }

    return result;
  },

  /**
   * Extrae un subconjunto válido del JSON
   */
  extractValidJsonSubset(jsonString) {
    console.log("🎯 Intentando extraer subconjunto válido del JSON complejo...");
    
    const objectMatches = jsonString.match(/\{[^{}]*\}/g);
    if (objectMatches && objectMatches.length > 0) {
      for (const match of objectMatches) {
        if (this.isValidJson(match)) {
          return match;
        }
      }
    }

    return JSON.stringify({
      theme: "Contenido educativo con Capibara Profesor",
      error_recovery: true,
      message: "JSON no pudo ser reparado",
      original_fragment: jsonString.substring(0, 100).replace(/"/g, '\\"')
    });
  },

  /**
   * Verifica si un string es JSON válido
   */
  isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },

  sanitizeObjectContent(obj, options = {}) {
    const { 
      maxStringLength, 
      removeInvalidChars, 
      preserveTemplates, 
      preservePropertyNames = true,
      maxDepth = 10,
      currentDepth = 0
    } = options;
    
    if (currentDepth >= maxDepth) {
      console.warn(`⚠️ Profundidad máxima alcanzada (${maxDepth}), truncando objeto`);
      return "[Objeto demasiado profundo]";
    }
    
    const sanitizeValue = (value, key = '', depth = currentDepth) => {
      if (value === null || value === undefined) {
        return value;
      }
      
      if (typeof value === 'string') {
        let sanitized = value;
        
        // Limitar longitud
        if (maxStringLength && sanitized.length > maxStringLength) {
          sanitized = sanitized.substring(0, maxStringLength) + '...';
        }
        
        if (removeInvalidChars) {
          // Preservar caracteres básicos, espacios, saltos de línea y caracteres especiales útiles
          sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        }
        
        if (!preserveTemplates) {
          sanitized = sanitized.replace(/\{\{([^}]+)\}\}/g, '[TEMPLATE:$1]');
        } else {
          const malformedTemplates = sanitized.match(/\{[^{]|\}[^}]|\{$|^\}/g);
          if (malformedTemplates) {
            console.warn(`⚠️ Plantillas malformadas encontradas en "${key}":`, malformedTemplates);
          }
        }
        
        return sanitized;
      }
      
      if (Array.isArray(value)) {
        return value.map((item, index) => 
          sanitizeValue(item, `${key}[${index}]`, depth + 1)
        );
      }
      
      if (typeof value === 'object') {
        const sanitizedObj = {};
        for (const [objKey, objValue] of Object.entries(value)) {
          let sanitizedKey = objKey;
          if (!preservePropertyNames && removeInvalidChars) {
            sanitizedKey = sanitizedKey.replace(/[^\w\-_$.]/g, '_');
          } else {
            // Mantener la clave original, solo remover caracteres de control si es necesario
            sanitizedKey = objKey.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          }
          
          sanitizedObj[sanitizedKey] = sanitizeValue(objValue, `${key}.${sanitizedKey}`, depth + 1);
        }
        return sanitizedObj;
      }
      
      return value;
    };
    
    return sanitizeValue(obj);
  },

  performFinalValidation(sanitizedObject, options = {}) {
    const { skipWarnings = false, skipMetadata = false, maxDepth = 10 } = options;
    const warnings = [];
    const changes = [];
    
    if (!skipWarnings && sanitizedObject && typeof sanitizedObject === 'object') {
      const marketingValidation = this.validateMarketingStructure(sanitizedObject);
      warnings.push(...marketingValidation.warnings);
      
      const templateWarnings = this.checkUnresolvedTemplates(sanitizedObject);
      warnings.push(...templateWarnings);
      
      const depth = this.calculateObjectDepth(sanitizedObject);
      if (depth > maxDepth) {
        warnings.push(`Objeto con profundidad ${depth} excede el máximo recomendado de ${maxDepth}`);
      }
    }
    
    // NO agregar metadatos al objeto si skipMetadata es true
    let finalObject = sanitizedObject;
    if (!skipMetadata) {
      finalObject = {
        ...sanitizedObject,
        _validation_info: {
          warnings: warnings.length > 0 ? warnings : undefined,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    return {
      data: finalObject,
      warnings,  // Mantener warnings en el resultado para logging
      changes
    };
  },

  validateMarketingStructure(obj) {
    const warnings = [];
    
    const hasMarketingStructure = obj.theme && 
      (obj.video || obj.meme || obj.email || obj.campaign || obj.post || obj.story);
    
    if (hasMarketingStructure) {
      if (!obj.targetAudience) {
        warnings.push('targetAudience recomendado para contenido de marketing');
      } else if (typeof obj.targetAudience === 'object') {
        if (!obj.targetAudience.carrera && !obj.targetAudience.edad) {
          warnings.push('targetAudience debe incluir carrera o edad');
        }
      }
      
      const contentTypes = ['video', 'meme', 'email', 'campaign', 'post', 'story'];
      const foundTypes = contentTypes.filter(type => obj[type]);
      
      if (foundTypes.length === 0) {
        warnings.push('No se encontró estructura específica de contenido');
      } else if (foundTypes.length > 1) {
        warnings.push(`Múltiples tipos de contenido encontrados: ${foundTypes.join(', ')}`);
      }
    }
    
    return { warnings };
  },

  calculateObjectDepth(obj, currentDepth = 0) {
    if (obj === null || typeof obj !== 'object') {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const itemDepth = this.calculateObjectDepth(item, currentDepth + 1);
        maxDepth = Math.max(maxDepth, itemDepth);
      }
    } else {
      for (const value of Object.values(obj)) {
        const valueDepth = this.calculateObjectDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, valueDepth);
      }
    }
    
    return maxDepth;
  },

  /**
   * Verifica plantillas no resueltas en el objeto (solo para logging)
   */
  checkUnresolvedTemplates(obj) {
    const warnings = [];
    
    const checkValue = (value, path = '') => {
      if (typeof value === 'string') {
        const templates = value.match(/\{\{[^}]+\}\}/g);
        if (templates) {
          warnings.push(`Plantillas encontradas en ${path}: ${templates.join(', ')}`);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, val]) => {
          checkValue(val, path ? `${path}.${key}` : key);
        });
      }
    };
    
    checkValue(obj);
    return warnings;
  },

  createFallbackObject(originalInput) {
    const fallback = {
      theme: "Contenido educativo con Capibara Profesor",
      video: {
        target: { carrera: "{{target.carrera}}" },
        titulo: "Contenido educativo de respaldo",
        duracion: "60 segundos",
        hashtags: ["#CapibaraProfesor", "#Acadelia", "#Error"],
        contenido: {
          introduccion: {
            texto: "El contenido original no pudo ser procesado correctamente",
            estilo: "informativo"
          }
        },
        plataforma: "TikTok"
      },
      targetAudience: {
        carrera: "Estudiantes",
        edad: "18-25",
        intereses: ["educación"]
      },
      _error_recovery: true
    };
    
    if (typeof originalInput === 'string') {
      const titleMatch = originalInput.match(/"(?:titulo|title|theme)"\s*:\s*"([^"]+)"/i);
      if (titleMatch) {
        fallback.theme = titleMatch[1];
        fallback.video.titulo = titleMatch[1];
      }
      
      const carreraMatch = originalInput.match(/"carrera"\s*:\s*"([^"]+)"/i);
      if (carreraMatch) {
        fallback.video.target.carrera = carreraMatch[1];
        fallback.targetAudience.carrera = carreraMatch[1];
      }
    }
    
    return fallback;
  }
};

// Funciones de utilidad para integración fácil

export function sanitizeMarketingContent(content, options = {}) {
  const defaultOptions = {
    preserveTemplates: true,
    maxStringLength: 20000,  // Aumentado para contenido complejo
    removeInvalidChars: true,
    validateStructure: true,
    preservePropertyNames: true,
    maxDepth: 15
  };
  
  return jsonSanitizer.sanitizeJson(content, { ...defaultOptions, ...options });
}

export function sanitizeAIGeneratedContent(aiResponse, options = {}) {
  const aiSpecificOptions = {
    preserveTemplates: true,
    maxStringLength: 25000, // IA puede generar contenido más largo y complejo
    removeInvalidChars: true,
    validateStructure: true,
    preservePropertyNames: true,
    maxDepth: 20,
    ...options
  };
  
  const result = jsonSanitizer.sanitizeJson(aiResponse, aiSpecificOptions);
  
  if (result.success) {
    console.log("🤖 Contenido de IA con estructuras complejas sanitizado exitosamente");
    if (result.warnings.length > 0) {
      console.warn("⚠️ Advertencias en contenido de IA:", result.warnings);
    }
  } else {
    console.error("❌ Error sanitizando contenido de IA complejo:", result.error);
  }
  
  return result;
}

export function sanitizationMiddleware(options = {}) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      try {
        const sanitized = sanitizeMarketingContent(req.body, {
          maxDepth: 15, // Límite para requests
          ...options
        });
        if (sanitized.success) {
          req.body = sanitized.data;
          req.sanitizationWarnings = sanitized.warnings;
        } else {
          req.body = sanitized.fallbackData;
          req.sanitizationError = sanitized.error;
        }
      } catch (error) {
        console.error("Error en middleware de sanitización:", error);
      }
    }
    next();
  };
}


export function hasErrorRecovery(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  return !!(data.error_recovery || 
           data._error_recovery || 
           data.errorRecovery ||
           data['error-recovery']);
}

export function isBackupContent(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Patrones que indican contenido de respaldo
  const backupPatterns = [
    'JSON no pudo ser reparado',
    'Contenido no pudo ser procesado',
    'Error generando respuesta',
    'original_fragment',
    'error_recovery',
    '_error_recovery'
  ];
  
  const dataString = JSON.stringify(data).toLowerCase();
  
  return backupPatterns.some(pattern => 
    dataString.includes(pattern.toLowerCase())
  );
}
