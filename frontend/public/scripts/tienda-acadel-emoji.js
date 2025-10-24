/**
 * tienda-acadel-emoji.js - Sistema de emojis del Profesor Acadel para Tienda
 * Script independiente compatible con CSP - SIN módulos ES6
 * Detecta y cambia capibaras AL INSTANTE en la tienda
 */

(function() {
    'use strict';
    
    // Evitar inicialización múltiple
    if (window.TiendaAcadelEmojiLoaded) {
        return;
    }
    window.TiendaAcadelEmojiLoaded = true;

    class TiendaAcadelEmojiSystem {
        constructor() {
            this.initialized = false;
            this.processing = false;
            this.processedElements = new WeakSet();
            
            // 🎯 Ruta de tu imagen de capibara
            this.capibaraImagePath = '/images/capibara-emoji.webp';
            
            this.ultraFastObserver = null;
            this.backupInterval = null;
            
            // Bind methods para evitar problemas de contexto
            this.processElementInstantly = this.processElementInstantly.bind(this);
            this.replaceCapibaraInTextNode = this.replaceCapibaraInTextNode.bind(this);
        }

        /**
         * Inicialización del sistema Acadel para tienda
         */
        async init() {
            console.log('🦫 Tienda Script: Cargando sistema de emojis del Profesor Acadel...');
            
            try {
                // Verificar que la imagen existe
                await this.preloadCapibaraImage();
                
                // CSS para la imagen
                this.addImageCSS();
                
                // Observer ULTRA RÁPIDO para tiempo real
                this.setupUltraFastObserver();
                
                // Observer adicional para capturas perdidas
                this.setupBackupObserver();
                
                // Procesar contenido existente
                this.replaceExistingCapibaras();
                
                this.initialized = true;
                console.log('✅ Tienda Script: Sistema Acadel emoji activado');
                return true;
                
            } catch (error) {
                console.warn('⚠️ Tienda Script: No se pudo cargar el sistema Acadel emoji:', error);
                console.warn('📁 Tienda Script: Verifica que la imagen esté en:', this.capibaraImagePath);
                return false;
            }
        }

        /**
         * Precargar imagen para verificar que existe
         */
        preloadCapibaraImage() {
            return new Promise((resolve, reject) => {
                const img = new Image();
                
                img.onload = () => {
                    console.log('📸 Tienda Script: Imagen Acadel precargada exitosamente');
                    resolve();
                };
                
                img.onerror = () => {
                    reject(new Error(`Tienda Script: No se encontró la imagen: ${this.capibaraImagePath}`));
                };
                
                img.src = this.capibaraImagePath;
            });
        }

        /**
         * CSS para la imagen del capibara
         */
        addImageCSS() {
            if (document.getElementById('tienda-script-acadel-emoji-styles')) return;

            const style = document.createElement('style');
            style.id = 'tienda-script-acadel-emoji-styles';
            style.textContent = `
                /* Imagen real del capibara Acadel para tienda */
                .tienda-acadel-emoji-image {
                    height: 2em;
                    width: 2em;
                    margin: 0 0.05em 0 0.1em;
                    vertical-align: -0.5em;
                    display: inline-block;
                    object-fit: contain;
                    user-select: none;
                    draggable: false;
                    pointer-events: none;
                    border-radius: 2px;
                }
                
                /* Efecto hover */
                .tienda-acadel-emoji-image:hover {
                    transform: scale(1.05);
                    transition: transform 0.2s ease;
                }
                
                /* Estilos específicos para elementos de la tienda */
                .content-box .tienda-acadel-emoji-image,
                .ava-comparison .tienda-acadel-emoji-image,
                .comparison-header .tienda-acadel-emoji-image,
                .testimonial-card .tienda-acadel-emoji-image {
                    height: 1.5em;
                    width: 1.5em;
                    vertical-align: -0.3em;
                }
                
                /* Para títulos */
                h1 .tienda-acadel-emoji-image,
                h2 .tienda-acadel-emoji-image,
                h3 .tienda-acadel-emoji-image {
                    height: 1.2em;
                    width: 1.2em;
                    vertical-align: -0.2em;
                }
                
                /* Para texto en botones */
                .btn .tienda-acadel-emoji-image,
                button .tienda-acadel-emoji-image {
                    height: 1em;
                    width: 1em;
                    vertical-align: -0.1em;
                }
                
                /* Para párrafos */
                p .tienda-acadel-emoji-image {
                    height: 1.2em;
                    width: 1.2em;
                    vertical-align: -0.2em;
                }
            `;
            
            document.head.appendChild(style);
            console.log('🎨 Tienda Script: CSS Acadel emoji aplicado');
        }

        /**
         * Detectar emoji de capibara en texto
         */
        containsCapibara(text) {
            if (!text || typeof text !== 'string') return false;
            return text.includes('🦫');
        }

        /**
         * Observer ULTRA RÁPIDO principal
         */
        setupUltraFastObserver() {
            if (this.ultraFastObserver) return;

            this.ultraFastObserver = new MutationObserver((mutations) => {
                // Procesar inmediatamente
                mutations.forEach(mutation => {
                    // Procesar nodos agregados
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processElementInstantly(node);
                        } else if (node.nodeType === Node.TEXT_NODE && this.containsCapibara(node.textContent)) {
                            this.replaceCapibaraInTextNode(node);
                        }
                    });
                    
                    // Procesar cambios de texto
                    if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
                        if (this.containsCapibara(mutation.target.textContent)) {
                            this.replaceCapibaraInTextNode(mutation.target);
                        }
                    }
                });
            });

            // Observar todo el body
            this.ultraFastObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false,
                attributeOldValue: false,
                characterDataOldValue: false
            });

            console.log('⚡ Tienda Script: Observer Acadel ULTRA RÁPIDO activado');
        }

        /**
         * Observer de backup para capturas perdidas
         */
        setupBackupObserver() {
            this.backupInterval = setInterval(() => {
                if (this.processing) return;
                
                // Buscar capibaras sin procesar
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            return this.containsCapibara(node.textContent) && 
                                   !node.parentElement?.querySelector('.tienda-acadel-emoji-image') ? 
                                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                        }
                    },
                    false
                );

                let foundUnprocessed = false;
                let node;
                while (node = walker.nextNode()) {
                    this.replaceCapibaraInTextNode(node);
                    foundUnprocessed = true;
                }
                
                if (foundUnprocessed) {
                    console.log('🔄 Tienda Script Backup: Capturados capibaras perdidos');
                }
            }, 150); // Cada 150ms para no ser muy agresivo

            console.log('🛡️ Tienda Script: Observer de backup activado');
        }

        /**
         * Procesar elemento instantáneamente
         */
        processElementInstantly(element) {
            if (!element || !this.initialized) return;
            
            try {
                // Buscar todos los nodos de texto con capibaras
                const walker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            return this.containsCapibara(node.textContent) ? 
                                NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                        }
                    },
                    false
                );

                const textNodes = [];
                let node;
                while (node = walker.nextNode()) {
                    textNodes.push(node);
                }

                // Procesar todos los nodos encontrados
                textNodes.forEach(textNode => {
                    this.replaceCapibaraInTextNode(textNode);
                });
                
            } catch (error) {
                console.warn('⚠️ Tienda Script: Error procesando elemento:', error);
            }
        }

        /**
         * Reemplazar capibara en nodo de texto
         */
        replaceCapibaraInTextNode(textNode) {
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
            
            const text = textNode.textContent;
            if (!this.containsCapibara(text)) return;

            try {
                console.log('🦫 Tienda Script: ¡Profesor Acadel detectado! Reemplazando...');
                
                // Crear fragment para nuevos nodos
                const fragment = document.createDocumentFragment();
                
                // Dividir texto por emoji
                const parts = text.split('🦫');
                
                for (let i = 0; i < parts.length; i++) {
                    // Agregar texto antes del emoji
                    if (parts[i]) {
                        fragment.appendChild(document.createTextNode(parts[i]));
                    }
                    
                    // Agregar imagen (excepto última parte)
                    if (i < parts.length - 1) {
                        const img = document.createElement('img');
                        img.className = 'tienda-acadel-emoji-image';
                        img.src = this.capibaraImagePath;
                        img.alt = '🦫';
                        img.title = 'Capibara Profesor Acadel';
                        img.draggable = false;
                        
                        fragment.appendChild(img);
                    }
                }
                
                // Reemplazar nodo original
                textNode.parentNode.replaceChild(fragment, textNode);
                
                console.log('✅ Tienda Script: Profesor Acadel reemplazado');
                
            } catch (error) {
                console.warn('⚠️ Tienda Script: Error reemplazando Acadel:', error);
            }
        }

        /**
         * Procesar contenido existente
         */
        replaceExistingCapibaras() {
            if (!this.initialized) return;
            
            console.log('🔄 Tienda Script: Buscando Profesor Acadel...');
            
            // Procesar todo el body
            this.processElementInstantly(document.body);
            
            console.log('✅ Tienda Script: Procesamiento inicial completado');
        }

        /**
         * Función de test
         */
        testAcadelEmoji() {
            const testDiv = document.createElement('div');
            testDiv.innerHTML = '¡Test 🦫 Acadel en tienda funcionando!';
            testDiv.style.cssText = 'position: fixed; top: 20px; left: 20px; background: #fff; padding: 15px; border: 2px solid #656d4a; border-radius: 8px; z-index: 9999; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); color: #333;';
            document.body.appendChild(testDiv);
            
            // Procesar inmediatamente
            this.processElementInstantly(testDiv);
            
            // Remover después de 5 segundos
            setTimeout(() => testDiv.remove(), 5000);
            
            console.log('🦫 Tienda Script: Test ejecutado');
        }

        /**
         * Limpiar recursos
         */
        destroy() {
            if (this.ultraFastObserver) {
                this.ultraFastObserver.disconnect();
                this.ultraFastObserver = null;
            }
            
            if (this.backupInterval) {
                clearInterval(this.backupInterval);
                this.backupInterval = null;
            }
            
            this.processedElements = new WeakSet();
            this.processing = false;
            this.initialized = false;
        }
    }

    // ================= INICIALIZACIÓN AUTOMÁTICA =================
    
    // Crear instancia global
    const tiendaEmojiSystem = new TiendaAcadelEmojiSystem();
    
    // Hacer disponible globalmente
    window.tiendaAcadelEmoji = tiendaEmojiSystem;
    
    // Funciones de utilidad globales
    window.testTiendaAcadelEmoji = () => tiendaEmojiSystem.testAcadelEmoji();
    
    // Función de inicialización
    async function initTiendaEmojiSystem() {
        console.log('🦫 Tienda Script: Inicializando sistema...');
        
        try {
            const success = await tiendaEmojiSystem.init();
            
            if (success) {
                console.log('✅ Tienda Script: Sistema Acadel emoji listo');
                
                // Procesar después de un breve delay
                setTimeout(() => {
                    tiendaEmojiSystem.replaceExistingCapibaras();
                }, 300);
                
            } else {
                console.warn('⚠️ Tienda Script: No se pudo inicializar');
            }
        } catch (error) {
            console.error('❌ Tienda Script: Error de inicialización:', error);
        }
    }
    
    // Inicializar cuando esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initTiendaEmojiSystem, 500);
        });
    } else {
        // DOM ya está listo
        setTimeout(initTiendaEmojiSystem, 100);
    }
    
    // También inicializar en el evento load como backup
    window.addEventListener('load', () => {
        if (!tiendaEmojiSystem.initialized) {
            setTimeout(initTiendaEmojiSystem, 200);
        }
    });

})();