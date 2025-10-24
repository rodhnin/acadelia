/**
 * Módulo para la sección de IPs bloqueadas
 */

import { getBlockedIPs, blockIP, unblockIP, unblockAllIPs, exportSecurityEvents } from '../utils/api.js';
import { initMap, addMarker, clearMarkers, fitMarkers, updateMapTheme, setMapHandlers } from '../utils/maps.js';
import { formatTimeRemaining } from '../utils/formatters.js';
import { createTableRow, downloadBlob } from '../utils/dom.js';
import { showNotification } from '../utils/notifications.js';
import modals from '../ui/modals.js';
import theme from '../ui/theme.js';

const blockedIps = {
    /**
     * Estado del módulo
     */
    state: {
        blockedIPs: [],
        isLoading: false,
        map: null,
        initialized: false
    },

    /**
     * Inicializa el módulo de IPs bloqueadas
     */
    async init() {
        // Mostrar indicador de carga
        this.showLoading(true);
        
        try {
            // Inicializar mapa si no se ha hecho ya
            if (!this.state.map) {
                const isDarkMode = theme.isDarkTheme();
                this.state.map = initMap('security-map', isDarkMode);
                
                // Configurar manejadores para acciones del mapa
                setMapHandlers({
                    unblockIP: (ip) => this.handleUnblockIP(ip),
                    showIPDetails: (ip) => this.showIPDetails(ip)
                });
            }
            
            // Cargar IPs bloqueadas
            await this.loadBlockedIPs();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Marcar como inicializado
            this.state.initialized = true;
            
            // Aplicar tema actual al mapa
            const isDarkMode = theme.isDarkTheme();
            updateMapTheme(isDarkMode);
        } catch (error) {
            console.error('Error inicializando módulo de IPs bloqueadas:', error);
            showNotification('Error', 'No se pudo inicializar el módulo de IPs bloqueadas', 'error');
        } finally {
            // Ocultar indicador de carga
            this.showLoading(false);
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Botón de actualizar IPs bloqueadas
        document.getElementById('refresh-ips-btn')?.addEventListener('click', () => {
            this.loadBlockedIPs();
        });
        
        // Validación para desbloqueo de todas las IPs
        const unblockConfirmInput = document.getElementById('unblock-confirmation');
        const confirmUnblockAllBtn = document.getElementById('confirm-unblock-all');
        
        if (unblockConfirmInput && confirmUnblockAllBtn) {
            unblockConfirmInput.addEventListener('input', (e) => {
                confirmUnblockAllBtn.disabled = e.target.value !== 'DESBLOQUEAR';
            });
        }
        
        // Botón confirmar desbloqueo de todas las IPs
        confirmUnblockAllBtn?.addEventListener('click', () => {
            this.handleUnblockAllIPs();
        });
        
        // Botón de exportar IPs bloqueadas
        document.getElementById('export-ips-btn')?.addEventListener('click', () => {
            this.exportBlockedIPs();
        });
        
        // Escuchar evento global de bloqueo de IP
        window.addEventListener('ipBlocked', () => {
            // Recargar IPs bloqueadas cuando se bloquee una nueva
            this.loadBlockedIPs();
        });
        
        // Escuchar cambios de tema para actualizar el mapa
        window.addEventListener('themechange', (e) => {
            updateMapTheme(e.detail.theme === 'dark');
        });
    },

    /**
     * Carga las IPs bloqueadas
     */
    async loadBlockedIPs() {
        try {
            // Mostrar indicador de carga
            this.state.isLoading = true;
            this.showLoading(true);
            
            // Obtener IPs bloqueadas
            const blockedIPs = await getBlockedIPs();
            
            // Enriquecer con datos de geolocalización si faltan
            const enrichedIPs = await this.enrichGeoData(blockedIPs);
            
            // Actualizar estado
            this.state.blockedIPs = enrichedIPs;
            
            // Actualizar contador
            document.getElementById('blocked-count').textContent = `${enrichedIPs.length} IPs`;
            
            // Renderizar tabla
            this.renderBlockedIPsTable(enrichedIPs);
            
            // Actualizar mapa
            this.updateMap(enrichedIPs);
            
            // Ocultar indicador de carga
            this.state.isLoading = false;
            this.showLoading(false);
        } catch (error) {
            console.error('Error cargando IPs bloqueadas:', error);
            showNotification('Error', 'No se pudieron cargar las IPs bloqueadas', 'error');
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Enriquece las IPs con datos de geolocalización si faltan
     * @param {Array} blockedIPs - Lista de IPs bloqueadas
     * @returns {Array} IPs enriquecidas con datos de geolocalización
     */
    async enrichGeoData(blockedIPs) {
        if (!blockedIPs || blockedIPs.length === 0) return [];
        
        try {
            // Usar un servicio de geolocalización para las IPs que faltan coordenadas
            // Intentamos obtener las coordenadas para todas las IPs que no las tienen
            const enrichedIPs = await Promise.all(blockedIPs.map(async (ip) => {
                // Si ya tiene coordenadas, devolver tal cual
                if (ip.latitude && ip.longitude) {
                    return ip;
                }
                
                try {
                    // Si tiene ubicación pero no coordenadas, intentar geocodificar
                    if (ip.location) {
                        const coords = await this.geocodeLocation(ip.location);
                        if (coords) {
                            return {
                                ...ip,
                                latitude: coords.lat,
                                longitude: coords.lng
                            };
                        }
                    }
                    
                    // Si no tiene ubicación o no se pudo geocodificar, intentar geoIP
                    const geoData = await this.getGeoIP(ip.ip);
                    if (geoData) {
                        return {
                            ...ip,
                            latitude: geoData.lat,
                            longitude: geoData.lng,
                            location: geoData.location || ip.location
                        };
                    }
                } catch (error) {
                    console.warn(`Error enriqueciendo datos geo para IP ${ip.ip}:`, error);
                }
                
                // Si todo falla, devolver IP original
                return ip;
            }));
            
            return enrichedIPs;
        } catch (error) {
            console.error('Error enriqueciendo datos de geolocalización:', error);
            return blockedIPs; // Devolver original si algo falla
        }
    },

    /**
     * Intenta geocodificar una ubicación textual
     * @param {string} location - Texto de ubicación
     * @returns {Object|null} Coordenadas {lat, lng} o null
     */
    async geocodeLocation(location) {
        // Esta es una implementación simulada para el frontend
        // En una implementación real, podrías usar un servicio como MapBox, Google Maps, etc.
        
        // Mapa de ubicaciones comunes para demo
        const geoCache = {
            'Madrid, España': { lat: 40.4165, lng: -3.7026 },
            'Madrid, Spain': { lat: 40.4165, lng: -3.7026 },
            'Barcelona, España': { lat: 41.3851, lng: 2.1734 },
            'Barcelona, Spain': { lat: 41.3851, lng: 2.1734 },
            'New York, USA': { lat: 40.7128, lng: -74.0060 },
            'London, UK': { lat: 51.5074, lng: -0.1278 },
            'Paris, France': { lat: 48.8566, lng: 2.3522 },
            'Tokyo, Japan': { lat: 35.6762, lng: 139.6503 },
            'Beijing, China': { lat: 39.9042, lng: 116.4074 },
            'Moscow, Russia': { lat: 55.7558, lng: 37.6173 },
            'Sydney, Australia': { lat: -33.8688, lng: 151.2093 },
            'Rio de Janeiro, Brazil': { lat: -22.9068, lng: -43.1729 },
            'Cape Town, South Africa': { lat: -33.9249, lng: 18.4241 },
            'Mexico City, Mexico': { lat: 19.4326, lng: -99.1332 },
            'Buenos Aires, Argentina': { lat: -34.6037, lng: -58.3816 },
            'Lima, Peru': { lat: -12.0464, lng: -77.0428 },
            'Bogota, Colombia': { lat: 4.7110, lng: -74.0721 },
            'Toronto, Canada': { lat: 43.6532, lng: -79.3832 }
        };
        
        // Buscar ubicación exacta
        if (location in geoCache) {
            return geoCache[location];
        }
        
        // Buscar ubicación parcial
        for (const [cachedLocation, coords] of Object.entries(geoCache)) {
            if (location.includes(cachedLocation) || cachedLocation.includes(location)) {
                return coords;
            }
        }
        
        // Si no se encuentra, devolver null
        return null;
    },

    /**
     * Obtiene información geográfica de una IP
     * @param {string} ip - Dirección IP
     * @returns {Object|null} Datos geográficos o null
     */
    async getGeoIP(ip) {
        try {
            // En una implementación real, se usaría un servicio como ipstack, ipify, etc.
            // Aquí generamos datos de forma aleatoria para algunas IPs (demo)
            
            // Generar datos aleatorios basados en la IP para que sean consistentes
            // Esto es solo para simulación, en una implementación real usarías un servicio real
            
            // Generar hash simple para la IP
            const ipHash = ip.split('.').reduce((acc, octet) => acc + parseInt(octet, 10), 0);
            
            // Usar el hash para asignar una ubicación fija a cada IP
            const locations = [
                { location: 'Madrid, España', lat: 40.4165, lng: -3.7026 },
                { location: 'Barcelona, España', lat: 41.3851, lng: 2.1734 },
                { location: 'Valencia, España', lat: 39.4699, lng: -0.3763 },
                { location: 'Sevilla, España', lat: 37.3891, lng: -5.9845 },
                { location: 'Bilbao, España', lat: 43.2630, lng: -2.9350 },
                { location: 'Paris, France', lat: 48.8566, lng: 2.3522 },
                { location: 'London, UK', lat: 51.5074, lng: -0.1278 },
                { location: 'Berlin, Germany', lat: 52.5200, lng: 13.4050 },
                { location: 'Rome, Italy', lat: 41.9028, lng: 12.4964 },
                { location: 'New York, USA', lat: 40.7128, lng: -74.0060 }
            ];
            
            // Seleccionar ubicación basada en el hash
            const locationIndex = ipHash % locations.length;
            return locations[locationIndex];
        } catch (error) {
            console.warn(`Error obteniendo geoIP para ${ip}:`, error);
            return null;
        }
    },

    /**
     * Renderiza la tabla de IPs bloqueadas
     * @param {Array} blockedIPs - Lista de IPs bloqueadas
     */
    renderBlockedIPsTable(blockedIPs) {
        const tableBody = document.getElementById('blocked-ips-table');
        if (!tableBody) return;
        
        // Limpiar tabla
        tableBody.innerHTML = '';
        
        if (blockedIPs.length === 0) {
            // Mostrar mensaje si no hay IPs bloqueadas
            const emptyRow = createTableRow([
                { colspan: 5, className: 'text-center', text: 'No hay IPs bloqueadas actualmente' }
            ]);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Añadir filas de IPs bloqueadas
        blockedIPs.forEach(ip => {
            const row = createTableRow([
                { text: ip.ip, className: 'text-nowrap' },
                { text: ip.location || 'Desconocida', className: 'text-nowrap' },
                { text: ip.reason || '-', className: 'text-truncate', style: { maxWidth: '300px' } },
                { text: formatTimeRemaining(ip.ttl), className: 'text-nowrap' },
                { 
                    html: `
                        <button class="btn btn-sm btn-danger unblock-ip-btn" data-ip="${ip.ip}">
                            <i class="bi bi-unlock me-1"></i> Desbloquear
                        </button>
                    `,
                    className: 'text-end'
                }
            ]);
            
            tableBody.appendChild(row);
            
            // Añadir event listener al botón de desbloqueo
            const unblockBtn = row.querySelector('.unblock-ip-btn');
            if (unblockBtn) {
                unblockBtn.addEventListener('click', () => {
                    this.handleUnblockIP(ip.ip);
                });
            }
        });
    },

    /**
     * Actualiza el mapa con las IPs bloqueadas
     * @param {Array} blockedIPs - Lista de IPs bloqueadas
     */
    updateMap(blockedIPs) {
        // Limpiar marcadores existentes
        clearMarkers();
        
        // Si no hay IPs, no hacer nada más
        if (blockedIPs.length === 0) return;
        
        // Añadir nuevos marcadores
        let markersAdded = 0;
        
        blockedIPs.forEach(ip => {
            // Añadir marcador si tiene coordenadas
            if (ip.latitude && ip.longitude) {
                addMarker(ip.latitude, ip.longitude, {
                    ip: ip.ip,
                    location: ip.location || 'Ubicación desconocida',
                    reason: ip.reason || 'Razón no especificada',
                    expiresIn: formatTimeRemaining(ip.ttl),
                    severity: 'high',
                    actions: {
                        unblock: true
                    }
                });
                markersAdded++;
            }
        });
        
        // Solo ajustar zoom si se añadieron marcadores
        if (markersAdded > 0) {
            fitMarkers();
        }
    },

    /**
     * Maneja la acción de desbloquear una IP
     * @param {string} ip - Dirección IP a desbloquear
     */
    async handleUnblockIP(ip) {
        try {
            // Mostrar confirmación
            if (!confirm(`¿Estás seguro de desbloquear la IP ${ip}?`)) {
                return;
            }
            
            // Llamar a la API
            const result = await unblockIP(ip);
            
            if (result && result.success) {
                showNotification('Éxito', `IP ${ip} desbloqueada correctamente`, 'success');
                
                // Recargar IPs bloqueadas
                this.loadBlockedIPs();
            } else {
                showNotification('Error', result?.error || 'No se pudo desbloquear la IP', 'error');
            }
        } catch (error) {
            console.error('Error desbloqueando IP:', error);
            showNotification('Error', 'No se pudo desbloquear la IP', 'error');
        }
    },

    /**
     * Maneja la acción de desbloquear todas las IPs
     */
    async handleUnblockAllIPs() {
        try {
            // Cerrar modal de confirmación
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmUnblockAllModal'));
            if (modal) modal.hide();
            
            // Limpiar campo de confirmación
            const unblockConfirmInput = document.getElementById('unblock-confirmation');
            if (unblockConfirmInput) unblockConfirmInput.value = '';
            
            // Deshabilitar botón de confirmación
            const confirmUnblockAllBtn = document.getElementById('confirm-unblock-all');
            if (confirmUnblockAllBtn) confirmUnblockAllBtn.disabled = true;
            
            // Mostrar notificación
            showNotification('Info', 'Desbloqueando todas las IPs...', 'info');
            
            // Llamar a la API
            const result = await unblockAllIPs();
            
            if (result && result.success) {
                const count = result.count || this.state.blockedIPs.length || 'todas las';
                showNotification('Éxito', `${count} IPs desbloqueadas correctamente`, 'success');
                
                // Recargar IPs bloqueadas
                this.loadBlockedIPs();
            } else {
                showNotification('Error', result?.error || 'No se pudieron desbloquear las IPs', 'error');
            }
        } catch (error) {
            console.error('Error desbloqueando todas las IPs:', error);
            showNotification('Error', 'No se pudieron desbloquear las IPs', 'error');
        }
    },

    /**
     * Muestra detalles adicionales de una IP
     * @param {string} ip - Dirección IP
     */
    showIPDetails(ip) {
        const ipData = this.state.blockedIPs.find(item => item.ip === ip);
        
        if (ipData) {
            // Aquí podríamos mostrar un modal con más detalles
            // Por simplicidad, mostramos una notificación
            showNotification(
                'Detalles de IP',
                `IP: ${ipData.ip}\nUbicación: ${ipData.location || 'Desconocida'}\nRazón: ${ipData.reason || '-'}\nExpira en: ${formatTimeRemaining(ipData.ttl)}`,
                'info',
                10000
            );
        }
    },

    /**
     * Exporta las IPs bloqueadas
     */
    async exportBlockedIPs() {
        try {
            // Obtener formato seleccionado
            const format = document.getElementById('export-format')?.value || 'csv';
            
            // Intentar usar la API de exportación si existe
            try {
                // Usar la API específica para exportar IPs bloqueadas
                const filters = {
                    eventType: 'BLOCKED_IP'
                };
                
                const blob = await exportSecurityEvents(filters, format);
                
                // Generar nombre de archivo
                const date = new Date().toISOString().split('T')[0];
                const filename = `ips_bloqueadas_${date}.${format}`;
                
                // Descargar archivo
                downloadBlob(blob, filename);
                
                // Mostrar notificación
                showNotification('Éxito', 'Exportación completada', 'success');
                return;
            } catch (apiError) {
                console.warn('API de exportación no disponible, usando exportación local:', apiError);
            }
            
            // Si la API falla, exportar localmente
            // Generar nombre de archivo
            const date = new Date().toISOString().split('T')[0];
            const filename = `ips_bloqueadas_${date}.${format}`;
            
            // Crear contenido según formato
            let content;
            let mimeType;
            
            if (format === 'csv') {
                // Formato CSV
                const headers = ['IP', 'Ubicación', 'Razón', 'Expira En', 'TTL'];
                const rows = this.state.blockedIPs.map(ip => [
                    ip.ip,
                    ip.location || 'Desconocida',
                    ip.reason || '-',
                    formatTimeRemaining(ip.ttl),
                    ip.ttl
                ]);
                
                content = [headers, ...rows]
                    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                    .join('\n');
                
                mimeType = 'text/csv;charset=utf-8;';
            } else if (format === 'json') {
                // Formato JSON
                content = JSON.stringify(this.state.blockedIPs, null, 2);
                mimeType = 'application/json;charset=utf-8;';
            } else if (format === 'excel') {
                // Para Excel, intentamos usar la librería sheetjs si está disponible
                try {
                    const XLSX = window.XLSX;
                    if (!XLSX) throw new Error('Librería XLSX no disponible');
                    
                    const ws = XLSX.utils.json_to_sheet(this.state.blockedIPs);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'IPs Bloqueadas');
                    
                    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    content = new Uint8Array(excelBuffer);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                } catch (xlsxError) {
                    console.warn('Error generando Excel, usando CSV:', xlsxError);
                    showNotification('Advertencia', 'Formato Excel no disponible, usando CSV', 'warning');
                    
                    // Cambiar a CSV y llamar de nuevo a esta función
                    document.getElementById('export-format').value = 'csv';
                    return this.exportBlockedIPs();
                }
            } else {
                // Otros formatos no implementados, usar CSV por defecto
                showNotification('Advertencia', 'Formato no soportado, usando CSV', 'warning');
                document.getElementById('export-format').value = 'csv';
                return this.exportBlockedIPs();
            }
            
            // Crear blob
            const blob = new Blob([content], { type: mimeType });
            
            // Descargar archivo
            downloadBlob(blob, filename);
            
            // Mostrar notificación
            showNotification('Éxito', 'Exportación completada', 'success');
        } catch (error) {
            console.error('Error exportando IPs bloqueadas:', error);
            showNotification('Error', 'No se pudieron exportar las IPs bloqueadas', 'error');
        }
    },

    /**
     * Muestra u oculta indicadores de carga
     * @param {boolean} show - Si se deben mostrar los indicadores
     */
    showLoading(show) {
        const tableBody = document.getElementById('blocked-ips-table');
        if (!tableBody) return;
        
        if (show) {
            // Mostrar indicador de carga
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando IPs bloqueadas...</td></tr>';
        }
    },

    /**
     * Refresca el mapa cuando se cambia a esta sección
     */
    onSectionActivated() {
        // Si el módulo está inicializado, refrescar el mapa
        if (this.state.initialized && this.state.map) {
            this.state.map.invalidateSize();
            
            // Cargar datos si es necesario
            if (this.state.blockedIPs.length === 0) {
                this.loadBlockedIPs();
            }
        }
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        // Limpiar event listeners
        document.getElementById('refresh-ips-btn')?.removeEventListener('click', () => this.loadBlockedIPs());
        document.getElementById('confirm-unblock-all')?.removeEventListener('click', () => this.handleUnblockAllIPs());
        document.getElementById('export-ips-btn')?.removeEventListener('click', () => this.exportBlockedIPs());
        
        window.removeEventListener('ipBlocked', () => this.loadBlockedIPs());
        window.removeEventListener('themechange', (e) => updateMapTheme(e.detail.theme === 'dark'));
    }
};

export default blockedIps;