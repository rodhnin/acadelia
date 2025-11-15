/**
 * Módulo para gestionar el mapa de IPs bloqueadas
 */

/**
 * URLs para capas del mapa
 */
const MAP_CONFIG = {
    mapTileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapDarkTileLayer: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    defaultZoom: 2,
    defaultCenter: [20, 0], // Aproximadamente el centro del mapa mundial
    maxZoom: 18
};

/**
 * Instancia del mapa de Leaflet
 * @type {Object}
 */
let securityMap = null;

/**
 * Capa de azulejos (tiles) actual
 * @type {Object}
 */
let currentTileLayer = null;

/**
 * Marcadores añadidos al mapa
 * @type {Array<Object>}
 */
let mapMarkers = [];

/**
 * Capa de marcadores para gestionar grupos
 * @type {Object}
 */
let markerLayer = null;

/**
 * Inicializa el mapa de seguridad
 * @param {string} elementId - ID del elemento HTML donde se mostrará el mapa
 * @param {boolean} [darkMode=false] - Si se debe utilizar el tema oscuro
 * @returns {Object} Instancia del mapa
 */
export function initMap(elementId = 'security-map', darkMode = false) {
    const mapElement = document.getElementById(elementId);
    
    if (!mapElement) {
        console.error(`Elemento con ID ${elementId} no encontrado`);
        return null;
    }
    
    // Si ya existe, destruirlo primero
    if (securityMap) {
        securityMap.remove();
        securityMap = null;
        mapMarkers = [];
    }
    
    securityMap = L.map(elementId, {
        center: MAP_CONFIG.defaultCenter,
        zoom: MAP_CONFIG.defaultZoom,
        zoomControl: true
    });
    
    const tileUrl = darkMode ? MAP_CONFIG.mapDarkTileLayer : MAP_CONFIG.mapTileLayer;
    
    currentTileLayer = L.tileLayer(tileUrl, {
        attribution: MAP_CONFIG.attribution,
        maxZoom: MAP_CONFIG.maxZoom
    }).addTo(securityMap);
    
    markerLayer = L.layerGroup().addTo(securityMap);
    
    return securityMap;
}

/**
 * Actualiza el tema del mapa
 * @param {boolean} darkMode - Si se debe utilizar el tema oscuro
 */
export function updateMapTheme(darkMode) {
    if (!securityMap) return;
    
    const tileUrl = darkMode ? MAP_CONFIG.mapDarkTileLayer : MAP_CONFIG.mapTileLayer;
    
    if (currentTileLayer) {
        securityMap.removeLayer(currentTileLayer);
    }
    
    currentTileLayer = L.tileLayer(tileUrl, {
        attribution: MAP_CONFIG.attribution,
        maxZoom: MAP_CONFIG.maxZoom
    }).addTo(securityMap);
}

/**
 * Añade un marcador al mapa
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {Object} data - Datos para el popup
 * @returns {Object} Marcador creado
 */
export function addMarker(lat, lng, data = {}) {
    if (!securityMap) return null;
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.warn('Coordenadas inválidas para marcador:', lat, lng);
        return null;
    }
    
    const icon = L.divIcon({
        className: 'security-map-marker',
        html: `<div class="map-marker ${data.severity ? 'marker-' + data.severity : 'marker-default'}"><i class="bi bi-ban"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
    
    const marker = L.marker([lat, lng], { icon }).addTo(markerLayer);
    
    let popupContent = `
        <div class="map-popup">
            <h5 class="popup-title">${data.ip || 'IP Desconocida'}</h5>
    `;
    
    if (data.location) {
        popupContent += `<p><i class="bi bi-geo-alt"></i> ${data.location}</p>`;
    }
    
    if (data.reason) {
        popupContent += `<p><i class="bi bi-shield-exclamation"></i> ${data.reason}</p>`;
    }
    
    if (data.expiresIn) {
        popupContent += `<p><i class="bi bi-clock"></i> Expira en: ${data.expiresIn}</p>`;
    }
    
    if (data.id) {
        popupContent += `<p><i class="bi bi-hash"></i> ID: ${data.id}</p>`;
    }
    
    if (data.actions) {
        popupContent += `<div class="popup-actions">`;
        
        if (data.actions.unblock) {
            popupContent += `<button class="btn btn-sm btn-danger unblock-ip-btn" data-ip="${data.ip}">Desbloquear</button>`;
        }
        
        if (data.actions.details) {
            popupContent += `<button class="btn btn-sm btn-secondary details-ip-btn" data-ip="${data.ip}">Detalles</button>`;
        }
        
        popupContent += `</div>`;
    }
    
    popupContent += `</div>`;
    
    marker.bindPopup(popupContent);
    
    marker._securityData = data;
    mapMarkers.push(marker);
    
    marker.on('popupopen', function() {
        const popup = this.getPopup();
        const container = popup.getContent();
        
        if (typeof container === 'string') {
            return; // Si es string, no podemos añadir eventos
        }
        
        const unblockBtn = container.querySelector('.unblock-ip-btn');
        if (unblockBtn) {
            unblockBtn.addEventListener('click', function() {
                const ip = this.getAttribute('data-ip');
                if (ip && typeof window.unblockIPHandler === 'function') {
                    window.unblockIPHandler(ip);
                }
            });
        }
        
        const detailsBtn = container.querySelector('.details-ip-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', function() {
                const ip = this.getAttribute('data-ip');
                if (ip && typeof window.showIPDetailsHandler === 'function') {
                    window.showIPDetailsHandler(ip);
                }
            });
        }
    });
    
    return marker;
}

/**
 * Limpia todos los marcadores del mapa
 */
export function clearMarkers() {
    if (markerLayer) {
        markerLayer.clearLayers();
    }
    mapMarkers = [];
}

/**
 * Centra el mapa en un punto específico
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} [zoom] - Nivel de zoom
 */
export function centerMap(lat, lng, zoom) {
    if (!securityMap) return;
    
    if (zoom) {
        securityMap.setView([lat, lng], zoom);
    } else {
        securityMap.panTo([lat, lng]);
    }
}

/**
 * Ajusta el zoom para mostrar todos los marcadores
 */
export function fitMarkers() {
    if (!securityMap || mapMarkers.length === 0) return;
    
    const group = L.featureGroup(mapMarkers);
    securityMap.fitBounds(group.getBounds(), {
        padding: [50, 50]
    });
}

/**
 * Obtiene la instancia del mapa
 * @returns {Object} Instancia del mapa
 */
export function getMap() {
    return securityMap;
}

/**
 * Obtiene los marcadores actuales
 * @returns {Array<Object>} Lista de marcadores
 */
export function getMarkers() {
    return mapMarkers;
}

/**
 * Establece manejadores para las acciones del mapa
 * @param {Object} handlers - Objeto con manejadores de eventos
 */
export function setMapHandlers(handlers) {
    if (handlers.unblockIP && typeof handlers.unblockIP === 'function') {
        window.unblockIPHandler = handlers.unblockIP;
    }
    
    if (handlers.showIPDetails && typeof handlers.showIPDetails === 'function') {
        window.showIPDetailsHandler = handlers.showIPDetails;
    }
}