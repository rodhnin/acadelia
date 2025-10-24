// Security and Access Control Module

(function() {
    class AccessManager {
        constructor() {
            this.CARRERAS_MAP = new Map();
            this.isRedirecting = false;
            this.CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache
        }

        /**
         * Redirect to principal page
         */
        redirect() {
            if (!this.isRedirecting) {
                this.isRedirecting = true;
                window.location.replace('/principal');
            }
        }

        /**
         * Fetch carreras with intelligent caching
         */
        async fetchCarreras() {
            const cacheKey = 'carreras_cache';
            const cachedData = this.getCachedData(cacheKey);

            if (cachedData) {
                return new Map(Object.entries(cachedData));
            }

            try {
                const carrerasResponse = await fetch('/api/carrera/carrera', {
                    cache: 'no-store'
                });
            
                if (!carrerasResponse.ok) {
                    this.redirect();
                    return null;
                }
            
                const carreras = await carrerasResponse.json();
                const avasResults = await Promise.all(
                    carreras.map(carrera => this.fetchAvasForCarrera(carrera))
                );
            
                const carrerasMap = this.buildCarrerasMap(carreras, avasResults);
                
                this.setCachedData(cacheKey, Object.fromEntries(carrerasMap));
                return carrerasMap;

            } catch (error) {
                console.error('Error fetching carreras:', error);
                this.redirect();
                return null;
            }
        }

        /**
         * Fetch AVAs for a specific carrera
         * @param {Object} carrera 
         * @returns {Promise<Array|null>}
         */
        async fetchAvasForCarrera(carrera) {
            try {
                const avaResponse = await fetch(`/api/avas/carrera/${carrera.id_carrera}`, {
                    cache: 'force-cache'
                });
                return avaResponse.ok ? await avaResponse.json() : null;
            } catch {
                return null;
            }
        }

        /**
         * Build carreras map from fetched data
         * @param {Array} carreras 
         * @param {Array} avasResults 
         * @returns {Map}
         */
        buildCarrerasMap(carreras, avasResults) {
            const carrerasMap = new Map();

            avasResults.forEach((avas, index) => {
                const carrera = carreras[index];
                
                (avas || []).forEach(ava => {
                    if (ava?.slug) {
                        const slug = ava.slug.toLowerCase().trim();
                        carrerasMap.set(slug, {
                            id_carrera: carrera.id_carrera,
                            id_ava: ava.id_ava,
                            nombre_carrera: carrera.nombre || '',
                            nombre_ava: ava.nombre || ''
                        });
                    }
                });
            });

            return carrerasMap;
        }

        /**
         * Validate current AVA from URL
         * @returns {Object|null}
         */
        validateCurrentAva() {
            const pathSegments = window.location.pathname.split('/');
            const avaSlug = pathSegments[pathSegments.length - 1]
                .replace(/\$/, '')
                .toLowerCase()
                .trim();
            
            return this.CARRERAS_MAP.get(avaSlug) || null;
        }

        /**
         * Verify user authentication
         * @returns {Promise<string|null>}
         */
        async verifyUserSession() {
            try {
                const authResponse = await fetch('/api/usuarios/authenticate', {
                    credentials: 'include',
                    redirect: 'error'
                });
                
                if (!authResponse.ok) {
                    this.redirect();
                    return null;
                }
                
                const userData = await authResponse.json();
                return userData?.id_user || null;

            } catch {
                this.redirect();
                return null;
            }
        }

        /**
         * Get user's active subscriptions
         * @param {string} userId 
         * @returns {Promise<Array|null>}
         */
        async getUserSubscriptions(userId) {
            try {
                const premiumResponse = await fetch(`/api/acceso/premium-status/${userId}`, {
                    cache: 'no-cache'
                });
                
                if (!premiumResponse.ok) {
                    this.redirect();
                    return null;
                }
                
                const subscriptions = await premiumResponse.json();
                
                if (!Array.isArray(subscriptions) || !subscriptions.length) {
                    this.redirect();
                    return null;
                }

                return subscriptions.filter(sub => 
                    sub.success && 
                    sub.isPremium && 
                    sub.status === 'active' &&
                    new Date(sub.expiration) > new Date()
                );

            } catch {
                this.redirect();
                return null;
            }
        }

        /**
         * Check if user has access to specific carrera
         * @param {Array} subscriptions 
         * @param {string} id_carrera 
         * @returns {boolean}
         */
        hasAccessToCarrera(subscriptions, id_carrera) {
            return subscriptions.some(sub => sub.id_carrera === id_carrera);
        }

        /**
         * Comprehensive security check
         */
        async securityCheck() {
            // 1. Block initial rendering
            document.documentElement.style.visibility = 'hidden';
            
            try {
                // 2. Fetch and build carreras map
                this.CARRERAS_MAP = await this.fetchCarreras();
                if (!this.CARRERAS_MAP) return;
                
                // 3. Validate current AVA
                const currentAva = this.validateCurrentAva();
                if (!currentAva) return;
                
                // 4. Verify active session
                const userId = await this.verifyUserSession();
                if (!userId) return;
                
                // 5. Get active subscriptions
                const activeSubscriptions = await this.getUserSubscriptions(userId);
                if (!activeSubscriptions) return;
                
                // 6. Verify access to current carrera
                if (!this.hasAccessToCarrera(activeSubscriptions, currentAva.id_carrera)) {
                    this.redirect();
                    return;
                }
                
                // 7. Store access information
                this.storeAccessInfo(activeSubscriptions, currentAva);
                
                // 8. Show content
                document.documentElement.style.visibility = 'visible';

            } catch (error) {
                console.error('Security check failed:', error);
                this.redirect();
            }
        }

        /**
         * Store access information in sessionStorage
         * @param {Array} activeSubscriptions 
         * @param {Object} currentAva 
         */
        storeAccessInfo(activeSubscriptions, currentAva) {
            try {
                sessionStorage.setItem('userSubscriptions', JSON.stringify(activeSubscriptions));
                sessionStorage.setItem('currentAva', JSON.stringify(currentAva));
            } catch {
                console.warn('Could not store information in sessionStorage');
            }
        }

        /**
         * Get user's accessible careers
         * @returns {Array}
         */
        getUserAccessibleCareers() {
            try {
                const subscriptions = JSON.parse(sessionStorage.getItem('userSubscriptions') || '[]');
                return subscriptions.map(sub => sub.id_carrera);
            } catch {
                return [];
            }
        }

        /**
         * Get current AVA information
         * @returns {Object|null}
         */
        getCurrentAvaInfo() {
            try {
                return JSON.parse(sessionStorage.getItem('currentAva'));
            } catch {
                return null;
            }
        }

        /**
         * Cached data management
         */
        getCachedData(key) {
            const cachedItem = localStorage.getItem(key);
            if (!cachedItem) return null;

            const { timestamp, data } = JSON.parse(cachedItem);
            
            // Check if cache is still valid
            if (Date.now() - timestamp < this.CACHE_DURATION) {
                return data;
            }

            // Remove expired cache
            localStorage.removeItem(key);
            return null;
        }

        /**
         * Set cached data with timestamp
         * @param {string} key 
         * @param {*} data 
         */
        setCachedData(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify({
                    timestamp: Date.now(),
                    data
                }));
            } catch {
                console.warn('Could not set cache data');
            }
        }
    }

    // Create global AccessManager instance
    window.accessManager = new AccessManager();

    // Initialize with security timeout
    document.addEventListener('DOMContentLoaded', () => {
        window.accessManager.securityCheck().catch(() => window.accessManager.redirect());
        
        // Security timeout
        setTimeout(() => {
            if (document.documentElement.style.visibility !== 'visible') {
                window.accessManager.redirect();
            }
        }, 3000);
    });
})();