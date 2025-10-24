// frontend/js/csrf-utils.js - REEMPLAZAR TODO
(function() {
    'use strict';
    
    console.log("🔒 [CSRF] Sistema simplificado inicializando...");
    
    const CSRF_ENDPOINT = '/api/csrf-token';
    const CACHE_DURATION = 30000; // 30 segundos
    
    let cachedToken = null;
    let cacheExpiry = 0;
    
    /**
     * Verificar si es dominio de confianza
     */
    const isTrustedDomain = (url) => {
        const trustedDomains = ['paddle.com', 'sandbox-api.paddle.com', 'sandbox.paddle.com', 'checkout.paddle.com'];
        try {
            const host = new URL(url, location.origin).hostname;
            return trustedDomains.some(d => host === d || host.endsWith('.' + d));
        } catch { return false; }
    };
    
    /**
     * Obtener token de la cookie
     */
    const getTokenFromCookie = () => {
        const now = Date.now();
        if (cachedToken && now < cacheExpiry) {
            return cachedToken;
        }
        
        const cookies = document.cookie.split('; ');
        const csrfCookie = cookies.find(row => row.startsWith('XSRF-TOKEN='));
        
        if (csrfCookie) {
            const token = decodeURIComponent(csrfCookie.split('=')[1]);
            if (token.length === 40) {
                cachedToken = token;
                cacheExpiry = now + CACHE_DURATION;
                return token;
            }
        }
        
        cachedToken = null;
        cacheExpiry = 0;
        return null;
    };
    
    /**
     * Obtener token del servidor si es necesario
     */
    const getFreshToken = async () => {
        try {
            const response = await fetch(CSRF_ENDPOINT, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (data.csrfToken && data.csrfToken.length === 40) {
                cachedToken = data.csrfToken;
                cacheExpiry = Date.now() + CACHE_DURATION;
                return data.csrfToken;
            }
            
            throw new Error('Token inválido del servidor');
        } catch (e) {
            console.error('Error obteniendo token:', e);
            return null;
        }
    };
    
    /**
     * Interceptor de fetch simplificado
     */
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        // Solo para peticiones que modifican datos, excluyendo dominios de confianza
        if (options.method && 
            ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase()) &&
            !url.includes('/api/csrf-') &&
            !isTrustedDomain(url)) {
            
            // Asegurar credentials
            options.credentials = options.credentials || 'include';
            
            // Obtener token
            let token = getTokenFromCookie();
            
            // Si no hay token, intentar obtener uno
            if (!token) {
                console.log('🔒 [CSRF] No hay token, obteniendo uno nuevo...');
                token = await getFreshToken();
            }
            
            if (token) {
                options.headers = {
                    ...(options.headers || {}),
                    'X-CSRF-Token': token
                };
            }
        }
        
        return originalFetch(url, options);
    };
    
    /**
     * API pública simplificada
     */
    window.csrfUtils = {
        getToken: getTokenFromCookie,
        getFreshToken,
        clearCache: () => {
            cachedToken = null;
            cacheExpiry = 0;
        },
        fetch: window.fetch,
        isTrustedDomain // Exponer la función por si es útil
    };
    
    // Verificar token inicial
    setTimeout(async () => {
        const token = getTokenFromCookie();
        if (!token) {
            console.log('🔒 [CSRF] No hay token inicial, obteniendo uno...');
            await getFreshToken();
        } else {
            console.log('🔒 [CSRF] Token inicial presente');
        }
    }, 100);
    
    console.log('✅ [CSRF] Sistema simplificado cargado');
})();