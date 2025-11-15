// apiClient.js - Cliente API base con sanitización JSON integrada
export class ApiClient {
  constructor(baseUrl = '/api') {
    // Configuración para entornos
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Desarrollo local
      this.baseUrl = 'http://localhost:5000/api';
    } else {
      // Producción
      this.baseUrl = baseUrl;
    }
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
  
  // NUEVA FUNCIÓN: Sanitización JSON para el frontend
  sanitizeJsonForFrontend(jsonString) {
    if (typeof jsonString !== 'string') {
      return JSON.stringify(jsonString);
    }
    
    let cleaned = jsonString.trim();
    
    cleaned = cleaned.replace(/^\uFEFF/, ''); // BOM
    cleaned = cleaned.replace(/^[\s\u200B-\u200D\uFEFF]/, ''); // Espacios invisibles
    
    cleaned = cleaned.replace(/^[^{[]*/g, '');
    cleaned = cleaned.replace(/[^}\]]*$/g, '');
    
    // Escapar comillas problemáticas básicas
    cleaned = cleaned.replace(/([^\\])"/g, '$1\\"');
    if (cleaned.startsWith('"') && !cleaned.startsWith('\\"')) {
      cleaned = '\\"' + cleaned.substring(1);
    }
    
    cleaned = cleaned.replace(/,\s*,/g, ',');
    
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    return cleaned;
  }
  
  // NUEVA FUNCIÓN: Debug de parsing JSON
  debugJsonParsing(jsonString, context = 'unknown') {
    console.group(`🔍 Debug JSON Parsing - ${context}`);
    
    try {
      console.log('📄 JSON Original:', jsonString.substring(0, 200) + '...');
      console.log('📏 Longitud:', jsonString.length);
      
      const problematicChars = jsonString.match(/[^\x20-\x7E\n\r\t]/g);
      if (problematicChars) {
        console.warn('⚠️ Caracteres problemáticos encontrados:', [...new Set(problematicChars)]);
      }
      
      try {
        const direct = JSON.parse(jsonString);
        console.log('✅ Parseo directo exitoso');
        return direct;
      } catch (directError) {
        console.log('❌ Error en parseo directo:', directError.message);
      }
      
      try {
        const sanitized = this.sanitizeJsonForFrontend(jsonString);
        console.log('🧹 JSON Sanitizado:', sanitized.substring(0, 200) + '...');
        
        const parsed = JSON.parse(sanitized);
        console.log('✅ Parseo con sanitización exitoso');
        return parsed;
      } catch (sanitizeError) {
        console.log('❌ Error incluso con sanitización:', sanitizeError.message);
      }
      
      console.error('💥 No se pudo parsear el JSON de ninguna manera');
      return {
        error: true,
        message: "JSON no procesable",
        originalData: jsonString.substring(0, 100)
      };
      
    } finally {
      console.groupEnd();
    }
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Opciones por defecto
    const defaultOptions = {
      headers: this.defaultHeaders,
      credentials: 'include'
    };
    
    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    const showLoader = options.showLoader !== false;
    if (showLoader && typeof window.showLoader === 'function') {
      window.showLoader('Comunicando con el servidor...');
    }
    
    try {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(requestOptions.method)) {
        const csrfToken = window.CSRF_TOKEN || this.getCsrfTokenFromCookie();
        
        if (csrfToken) {
          requestOptions.headers['X-CSRF-Token'] = csrfToken;
        } else {
          console.warn('CSRF token no encontrado');
        }
      }
      
      const response = await fetch(url, requestOptions);
      
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      // MEJORADO: Parsear respuesta con sanitización robusta
      let data;
      if (isJson) {
        const rawText = await response.text();
        
        try {
          data = JSON.parse(rawText);
          console.log('✅ JSON parseado directamente sin problemas');
        } catch (parseError) {
          console.warn('⚠️ Error parseando JSON, intentando sanitizar:', parseError.message);
          console.log('📄 Contenido problemático:', rawText.substring(0, 300));
          
          try {
            const sanitizedJson = this.sanitizeJsonForFrontend(rawText);
            data = JSON.parse(sanitizedJson);
            console.log('✅ JSON sanitizado y parseado exitosamente');
          } catch (sanitizeError) {
            console.error('❌ Error incluso después de sanitizar:', sanitizeError.message);
            console.log('🔍 Intentando debug completo...');
            
            data = this.debugJsonParsing(rawText, `endpoint-${endpoint}`);
            
            // Si debug también falla, crear objeto de error estructurado
            if (!data || data.error) {
              data = {
                success: false,
                error: "Error procesando respuesta del servidor",
                details: "La respuesta del servidor no pudo ser interpretada como JSON válido",
                raw_response_preview: rawText.substring(0, 200),
                parse_error: parseError.message,
                sanitize_error: sanitizeError.message,
                endpoint: endpoint,
                timestamp: new Date().toISOString()
              };
            }
          }
        }
      } else {
        data = await response.text();
      }
      
      // Si no es exitoso, lanzar error
      if (!response.ok) {
        const errorMessage = (data && typeof data === 'object' && data.error) ? data.error : 'Error en la petición';
        throw new APIError(errorMessage, response.status, data);
      }
      
      return data;
    } catch (error) {
      // Si es nuestro error personalizado, lanzarlo directamente
      if (error instanceof APIError) {
        throw error;
      }
      
      // Si es error de red u otro, crear nuevo APIError
      console.error(`Error en solicitud a ${endpoint}:`, error);
      
      throw new APIError(
        error.message || 'Error de conexión',
        0,
        { originalError: error }
      );
    } finally {
      if (showLoader && typeof window.hideLoader === 'function') {
        window.hideLoader();
      }
    }
  }
  
  getCsrfTokenFromCookie() {
    const cookies = document.cookie.split('; ');
    const csrfCookie = cookies.find(cookie => cookie.startsWith('XSRF-TOKEN='));
    
    if (csrfCookie) {
      return decodeURIComponent(csrfCookie.split('=')[1]);
    }
    
    return null;
  }
  
  // Métodos para cada verbo HTTP
  async get(endpoint, params = {}, options = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, { method: 'GET', ...options });
  }
  
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }
  
  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }
  
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
  
  // Método para peticiones con streaming (para respuestas por partes) - MEJORADO
  async stream(endpoint, data = {}, onChunk, onComplete, onError) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      if (typeof window.showLoader === 'function') {
        window.showLoader('Esperando respuesta...');
      }
      
      const csrfToken = window.CSRF_TOKEN || this.getCsrfTokenFromCookie();
      
      const controller = new AbortController();
      const signal = controller.signal;
      
      const headers = {
        ...this.defaultHeaders,
        'X-CSRF-Token': csrfToken || '',
        'Accept': 'text/plain',  // Importante para streaming
        'Cache-Control': 'no-cache'
      };
      
      console.log(`Iniciando stream a ${url} con datos:`, data);
      
      // Asegurarse de que userId está incluido en la solicitud
      const dataWithUserId = {
        ...data,
        userId: data.userId || window.USER_ID || 1 // Valor predeterminado para desarrollo
      };
      
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(dataWithUserId),
        headers: headers,
        credentials: 'include',
        signal: signal
      });
      
      if (typeof window.hideLoader === 'function') {
        window.hideLoader();
      }
      
      if (!response.ok) {
        // MEJORADO: Intentar obtener detalles del error con sanitización
        let errorText = await response.text();
        let errorDetail;
        
        try {
          // Si es JSON, parsearlo con sanitización
          errorDetail = JSON.parse(errorText);
        } catch (e) {
          try {
            const sanitizedError = this.sanitizeJsonForFrontend(errorText);
            errorDetail = JSON.parse(sanitizedError);
          } catch (e2) {
            // Si no es JSON válido, usar como texto
            errorDetail = { 
              error: errorText || `Error ${response.status}: ${response.statusText}`,
              raw_error: errorText.substring(0, 200)
            };
          }
        }
        
        console.error(`Error en respuesta streaming: ${response.status} ${response.statusText}`, errorDetail);
        
        throw new APIError(
          errorDetail.error || `Error ${response.status}: ${response.statusText}`,
          response.status,
          errorDetail
        );
      }
      
      console.log("Respuesta de streaming recibida con status:", response.status);
      
      if (!response.body) {
        throw new Error('ReadableStream no soportado o no disponible en la respuesta');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log("Stream completado");
            if (onComplete) onComplete();
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          if (chunk && chunk.trim() !== '') {
            console.log("Chunk recibido:", chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""));
            if (onChunk) onChunk(chunk);
          }
        }
      } catch (streamError) {
        console.error("Error durante la lectura del stream:", streamError);
        if (onError) {
          onError(new APIError(
            streamError.message || 'Error en el streaming',
            0,
            { originalError: streamError }
          ));
        }
      }
      
      return controller; // Devolver el controller para poder abortar si es necesario
    } catch (error) {
      console.error(`Error en stream a ${endpoint}:`, error);
      
      if (typeof window.hideLoader === 'function') {
        window.hideLoader();
      }
      
      // Si hay manejador de errores, usarlo
      if (onError) {
        onError(error instanceof APIError ? error : new APIError(
          error.message || 'Error de conexión',
          0,
          { originalError: error }
        ));
      }
      
      // En modo de desarrollo, simular streaming como fallback
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log("Iniciando simulación de streaming como fallback en modo desarrollo");
        this.simulateStreaming(
          `[Respuesta simulada] No se pudo conectar con el servidor. Esto es una simulación temporal mientras se resuelve la conexión con el backend.
          
Detalles del error: ${error.message}
          
Posibles soluciones:
1. Verifica que el servidor backend esté funcionando en el puerto correcto
2. Comprueba que el endpoint ${endpoint} esté implementado correctamente
3. Revisa los logs del servidor para más información`,
          onChunk,
          onComplete
        );
      }
    }
  }

  simulateStreaming(text, onChunk, onComplete, delay = 30) {
    const words = text.split(' ');
    let index = 0;
    
    const sendNextWord = () => {
      if (index < words.length) {
        onChunk((index === 0 ? '' : ' ') + words[index]);
        index++;
        setTimeout(sendNextWord, delay);
      } else {
        if (onComplete) onComplete();
      }
    };
    
    sendNextWord();
  }
  
  // NUEVA FUNCIÓN: Verificar configuración de sanitización
  verifyJsonSanitizationSetup() {
    console.group('🔧 Verificación de Configuración JSON');
    
    const testCases = [
      // Caso 1: JSON válido
      '{"test": "valid"}',
      
      // Caso 2: JSON con comillas problemáticas
      '{"test": "value with "quotes""}',
      
      // Caso 3: JSON con caracteres especiales
      '{"test": "¡Hola! ¿Cómo estás?"}',
      
      // Caso 4: JSON con saltos de línea
      '{"code": "function test() {\\n  return true;\\n}"}',
      
      // Caso 5: JSON truncado
      '{"test": "incomplete"'
    ];
    
    testCases.forEach((testCase, index) => {
      console.log(`Test ${index + 1}:`, testCase.substring(0, 30) + '...');
      
      try {
        const result = this.debugJsonParsing(testCase, `test-${index + 1}`);
        console.log(result && !result.error ? '✅ Éxito' : '❌ Fallo');
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
    });
    
    console.groupEnd();
    console.log('✅ Verificación de sanitización JSON completada. Revisa los logs anteriores para detalles.');
  }
}

// Clase personalizada para errores de API
export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// NUEVA FUNCIÓN: Función de utilidad para sanitizar respuestas JSON
export function sanitizeJsonResponse(response) {
  try {
    // Si ya es un objeto, devolverlo
    if (typeof response === 'object' && response !== null) {
      return response;
    }
    
    // Si es string, intentar sanitizar y parsear
    if (typeof response === 'string') {
      const apiInstance = new ApiClient();
      const sanitized = apiInstance.sanitizeJsonForFrontend(response);
      return JSON.parse(sanitized);
    }
    
    return response;
  } catch (error) {
    console.error("❌ No se pudo sanitizar el JSON:", error.message);
    
    return {
      error: true,
      message: "Error procesando respuesta del servidor",
      originalError: error.message,
      rawResponse: typeof response === 'string' ? response.substring(0, 200) : 'Non-string response',
      timestamp: new Date().toISOString()
    };
  }
}

// Instancia global del cliente API
export const api = new ApiClient();