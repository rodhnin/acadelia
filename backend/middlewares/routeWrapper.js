import { throttle } from './throttleMiddleware.js';

/**
 * Envuelve un router de Express para aplicar throttling a rutas específicas
 * @param {Router} router - El router de Express original
 * @param {Object} config - Configuración de throttling
 * @returns {Router} - El mismo router pero con throttling aplicado
 */
export function wrapRouter(router, config = {}) {
  const originalMethods = {
    get: router.get,
    post: router.post,
    put: router.put,
    delete: router.delete
  };
  
  for (const [method, originalFn] of Object.entries(originalMethods)) {
    router[method] = function(path, ...handlers) {
      const routeConfig = config[path];
      
      if (routeConfig) {
        const { type, timeout, concurrency } = routeConfig;
        
        const throttleMiddleware = throttle(type, timeout, concurrency);
        
        if (handlers.length > 0) {
          const lastHandler = handlers.pop();
          handlers.push(throttleMiddleware);
          handlers.push(lastHandler);
        }
      }
      
      return originalFn.call(router, path, ...handlers);
    };
  }
  
  return router;
}

/**
 * Aplica throttling a un router de Express para operaciones de PDF
 * @param {Router} router - El router de Express
 * @returns {Router} - Router con throttling aplicado
 */
export function withPDFThrottling(router) {
  return wrapRouter(router, {
    '/extract-content/:chatId': {
      type: 'pdf',
      timeout: 180000, // 3 minutos
      concurrency: 3
    },
    '/extract-text/:chatId': {
      type: 'pdf',
      timeout: 120000, // 2 minutos
      concurrency: 5
    }
  });
}

/**
 * Aplica throttling a un router de Express para operaciones de OpenAI
 * @param {Router} router - El router de Express
 * @returns {Router} - Router con throttling aplicado
 */
export function withOpenAIThrottling(router) {
  return wrapRouter(router, {
    '/query-Agent': {
      type: 'openai',
      timeout: 120000,
      concurrency: 10
    },
    '/query-Anatomia': {
      type: 'openai',
      timeout: 120000,
      concurrency: 10
    },
    '/query-Patologia': {
      type: 'openai',
      timeout: 120000,
      concurrency: 10
    },
    '/query-pdf': {
      type: 'openai', 
      timeout: 120000,
      concurrency: 10
    },
    '/query-Fisica': {
      type: 'openai',
      timeout: 120000,
      concurrency: 10
    },
    '/multimodal-Agent': {
      type: 'openai',
      timeout: 120000,
      concurrency: 5 // Menos concurrencia para multimodal
    },
    '/multimodal-Patologia': {
      type: 'openai',
      timeout: 120000,
      concurrency: 5
    },
    '/multimodal-pdf': {
      type: 'openai',
      timeout: 120000,
      concurrency: 5
    },
    '/multimodal-Fisica': {
      type: 'openai',
      timeout: 120000,
      concurrency: 5
    }
  });
}

/**
 * Aplica throttling a un router de Express para operaciones de audio
 * @param {Router} router - El router de Express
 * @returns {Router} - Router con throttling aplicado
 */
export function withAudioThrottling(router) {
  return wrapRouter(router, {
    '/process-audio-file': {
      type: 'audio',
      timeout: 300000, // 5 minutos
      concurrency: 5
    },
    '/process-recorded-audio': {
      type: 'audio',
      timeout: 300000,
      concurrency: 5
    }
  });
}

/**
 * Aplica throttling a un router de Express para operaciones de YouTube
 * @param {Router} router - El router de Express
 * @returns {Router} - Router con throttling aplicado
 */
export function withYouTubeThrottling(router) {
  return wrapRouter(router, {
    '/process-youtube': {
      type: 'youtube',
      timeout: 600000, // 10 minutos
      concurrency: 2
    }
  });
}