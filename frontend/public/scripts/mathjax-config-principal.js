/**
 * mathjax-config-principal.js - VERSIÓN CORREGIDA
 * Configuración principal de MathJax sin errores de "Package"
 */

// ✅ VERIFICAR si MathJax ya está configurado para evitar conflictos
if (!window.MathJax) {
    console.log('🧮 Configurando MathJax...');
    
    window.MathJax = { 
        loader: { 
            load: ['[tex]/ams', 'input/tex', 'output/chtml'],
            // ✅ AÑADIR: Configuración del loader para evitar errores
            ready: function() {
                console.log('MathJax loader configurado correctamente');
            }
        }, 
        tex: { 
            packages: {'[+]': ['ams', 'physics', 'autoload']},
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
            // ✅ CORREGIDO: Configuración segura de autoload
            autoload: {
                color: [],
                colorv2: ['color'],
                cancel: ['cancel', 'bcancel', 'xcancel']
            },
            macros: {
                'sen': '\\sin',
                'degree': '^{\\circ}',
                'arctg': '\\arctan',
                'tg': '\\tan'
            }
        },
        // ✅ NUEVA: Configuración CHTML para evitar warnings obsoletos
        chtml: {
            scale: 1,
            minScale: 0.5,
            matchFontHeight: true,
            displayAlign: 'center',
            displayIndent: '0',
            // ✅ IMPORTANTE: Configuración de fuentes para evitar problemas
            fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2'
        },
        // ✅ NUEVA: Configuración para suprimir warnings
        options: {
            ignoreHtmlClass: 'tex2jax_ignore',
            processHtmlClass: 'tex2jax_process',
            renderActions: {
                addMenu: [0, '', ''],
                // ✅ Suprimir warnings de mathvariant obsoleto
                checkLoading: [1, (doc) => {
                    // Silenciar warnings específicos
                    const originalWarn = console.warn;
                    console.warn = function(message) {
                        if (typeof message === 'string' && 
                            (message.includes('mathvariant') || 
                             message.includes('obsoleto') ||
                             message.includes('deprecated'))) {
                            return; // Suprimir warning específico
                        }
                        originalWarn.apply(console, arguments);
                    };
                }, '']
            }
        },
        // ✅ CORREGIDO: Startup configuration sin conflictos
        startup: {
            typeset: true,
            ready: function() {
                console.log('🎯 MathJax: Agente Acadel listo para renderizar matemáticas');
                
                // ✅ IMPORTANTE: Llamar defaultReady de forma segura
                try {
                    if (window.MathJax.startup && 
                        typeof window.MathJax.startup.defaultReady === 'function') {
                        window.MathJax.startup.defaultReady();
                    }
                } catch (error) {
                    console.warn('⚠️ Error en defaultReady (no crítico):', error);
                }
                
                // ✅ Notificar que está listo
                if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('mathjax-ready', {
                        detail: { version: window.MathJax.version || 'unknown' }
                    }));
                }
            }
        }
    };
} else {
    console.warn('⚠️ MathJax ya está configurado, omitiendo reconfiguración');
    
    // ✅ Si ya existe, al menos añadir los macros faltantes
    if (window.MathJax.tex && window.MathJax.tex.macros) {
        Object.assign(window.MathJax.tex.macros, {
            'sen': '\\sin',
            'degree': '^{\\circ}',
            'arctg': '\\arctan',
            'tg': '\\tan'
        });
    }
}

// ✅ NUEVA: Función de utilidad para verificar estado de MathJax
window.checkMathJaxStatus = function() {
    const status = {
        configured: !!window.MathJax,
        loaded: !!(window.MathJax && window.MathJax.typesetPromise),
        version: window.MathJax ? window.MathJax.version : null,
        ready: !!(window.MathJax && window.MathJax.startup && window.MathJax.startup.document)
    };
    
    console.table(status);
    return status;
};

// ✅ NUEVA: Función para limpiar configuración en caso de problemas
window.resetMathJaxConfig = function() {
    console.log('🔄 Reseteando configuración de MathJax...');
    
    // Remover scripts existentes
    const scripts = document.querySelectorAll('script[src*="mathjax"]');
    scripts.forEach(script => script.remove());
    
    // Limpiar objeto global
    if (window.MathJax) {
        delete window.MathJax;
    }
    
    console.log('✅ Configuración reseteada. Recarga la página para reconfigurar.');
};