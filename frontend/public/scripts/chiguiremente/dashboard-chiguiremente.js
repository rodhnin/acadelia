// Módulo de Dashboard
import { fetchWithCSRF, truncateText } from './utils-chiguiremente.js';

// Estado del dashboard
const state = {
    stats: {
        carrerasCount: 0,
        avasCount: 0,
        herramientasCount: 0
    },
    featuredCarreras: []
};

/**
 * Inicializa el módulo de dashboard
 */
export function initDashboardModule() {
    console.log('Inicializando módulo de dashboard...');
    
    document.addEventListener('viewActivated', (event) => {
        if (event.detail.view === 'dashboard') {
            loadDashboardData();
        }
    });
    
    // Si estamos en la vista dashboard, cargar datos
    if (window.location.hash === '#dashboard' || !window.location.hash) {
        loadDashboardData();
    }
}

/**
 * Carga estadísticas generales
 */
async function loadStats() {
    try {
        const [carrerasResponse, avasResponse, herramientasResponse] = await Promise.all([
            fetchWithCSRF('/api/carrera/carrera'),
            fetchWithCSRF('/api/avas'),
            fetchWithCSRF('/api/herramientas')
        ]);
        
        state.stats.carrerasCount = Array.isArray(carrerasResponse) ? carrerasResponse.length : 0;
        state.stats.avasCount = Array.isArray(avasResponse) ? avasResponse.length : 0;
        state.stats.herramientasCount = Array.isArray(herramientasResponse) ? herramientasResponse.length : 0;
        
        updateStatsUI();
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

/**
 * Actualiza la UI con las estadísticas
 */
function updateStatsUI() {
    const carrerasCountElement = document.getElementById('dashboard-carreras-count');
    const avasCountElement = document.getElementById('dashboard-avas-count');
    const herramientasCountElement = document.getElementById('dashboard-herramientas-count');
    
    if (carrerasCountElement) carrerasCountElement.textContent = state.stats.carrerasCount;
    if (avasCountElement) avasCountElement.textContent = state.stats.avasCount;
    if (herramientasCountElement) herramientasCountElement.textContent = state.stats.herramientasCount;
}

async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadFeaturedCarreras(),
            loadRecentActivities()
        ]);
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
    }
}

async function loadRecentActivities() {
    try {
        const activityTimeline = document.querySelector('.activity-timeline');
        if (activityTimeline) {
            activityTimeline.innerHTML = `
                <div class="empty-state small">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <p>Cargando actividades recientes...</p>
                </div>
            `;
        }
        
        const response = await fetchWithCSRF('/api/activitymente?limit=10');
        
        if (!response.success || !Array.isArray(response.activities)) {
            throw new Error('Formato de respuesta inválido');
        }
        
        updateRecentActivitiesUI(response.activities);
    } catch (error) {
        console.error('Error al cargar actividades recientes:', error);
        
        const activityTimeline = document.querySelector('.activity-timeline');
        if (activityTimeline) {
            activityTimeline.innerHTML = `
                <div class="empty-state small">
                    <i class='bx bx-error'></i>
                    <p>No se pudieron cargar las actividades recientes</p>
                </div>
            `;
        }
    }
}

function updateRecentActivitiesUI(activities) {
    const activityTimeline = document.querySelector('.activity-timeline');
    
    if (!activityTimeline) return;
    
    activityTimeline.innerHTML = '';
    
    // Si no hay actividades, mostrar mensaje
    if (activities.length === 0) {
        activityTimeline.innerHTML = `
            <div class="empty-state small">
                <i class='bx bx-history'></i>
                <p>No hay actividades recientes</p>
            </div>
        `;
        return;
    }
    
    activities.forEach(activity => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        let iconClass = 'bx-info-circle';
        let iconType = 'info-icon';
        
        if (activity.action_type === 'create') {
            iconClass = 'bx-plus';
            iconType = 'create-icon';
        } else if (activity.action_type === 'update') {
            iconClass = 'bx-edit';
            iconType = 'edit-icon';
        } else if (activity.action_type === 'delete') {
            iconClass = 'bx-trash';
            iconType = 'delete-icon';
        } else if (activity.action_type === 'upload') {
            iconClass = 'bx-upload';
            iconType = 'upload-icon';
        }
        
        const relativeTime = formatRelativeTime(new Date(activity.created_at));
        
        let title = 'Actividad Registrada';
        let entityBadge = '';
        
        if (activity.action_type === 'create') {
            if (activity.entity_type === 'carrera') title = 'Nueva Carrera Creada';
            if (activity.entity_type === 'ava') title = 'Nuevo AVA Creado';
            if (activity.entity_type === 'herramienta') title = 'Nueva Herramienta Creada';
            if (activity.entity_type === 'embedding') title = 'Nuevo Documento Subido';
        } else if (activity.action_type === 'update') {
            if (activity.entity_type === 'carrera') title = 'Carrera Actualizada';
            if (activity.entity_type === 'ava') title = 'AVA Actualizado';
            if (activity.entity_type === 'herramienta') title = 'Herramienta Actualizada';
        } else if (activity.action_type === 'delete') {
            if (activity.entity_type === 'carrera') title = 'Carrera Eliminada';
            if (activity.entity_type === 'ava') title = 'AVA Eliminado';
            if (activity.entity_type === 'herramienta') title = 'Herramienta Eliminada';
            if (activity.entity_type === 'embedding') title = 'Documento Eliminado';
            if (activity.entity_type === 'embedding_page') title = 'Página Eliminada';
        } else if (activity.action_type === 'upload') {
            title = 'Nuevos Documentos';
        }
        
        if (activity.entity_type === 'carrera') {
            entityBadge = `<span class="entity-badge carrera-badge"><i class='bx bxs-graduation'></i> Carrera</span>`;
        } else if (activity.entity_type === 'ava') {
            entityBadge = `<span class="entity-badge ava-badge"><i class='bx bx-book-content'></i> AVA</span>`;
        } else if (activity.entity_type === 'herramienta') {
            entityBadge = `<span class="entity-badge herramienta-badge"><i class='bx bx-wrench'></i> Herramienta</span>`;
        } else if (activity.entity_type === 'embedding' || activity.entity_type === 'embedding_page') {
            entityBadge = `<span class="entity-badge documento-badge"><i class='bx bx-file'></i> Documento</span>`;
        }
        
        const exactDate = formatExactDate(new Date(activity.created_at));
        
        timelineItem.innerHTML = `
            <div class="timeline-icon ${iconType}">
                <i class='bx ${iconClass}'></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <h4>${title}</h4>
                    ${entityBadge}
                </div>
                <div class="timeline-entity-name">
                    <span class="entity-name">"${activity.entity_name || ''}"</span>
                    <span class="entity-id">#${activity.entity_id}</span>
                </div>
                <p class="timeline-description">${activity.description}</p>
                <div class="timeline-meta">
                    <span class="timeline-time" title="${exactDate}">${relativeTime}</span>
                    <span class="timeline-user">
                        <i class='bx bx-user'></i> ${activity.usuario_nombre || 'Sistema'}
                    </span>
                </div>
            </div>
        `;
        
        activityTimeline.appendChild(timelineItem);
    });
    
    const refreshButton = document.querySelector('.activity-control-button');
    if (refreshButton) {
        refreshButton.removeEventListener('click', loadRecentActivities);
        refreshButton.addEventListener('click', loadRecentActivities);
    }
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
        return `${date.toLocaleDateString()}`;
    } else if (diffDays > 0) {
        return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    } else if (diffHours > 0) {
        return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    } else if (diffMins > 0) {
        return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    } else {
        return 'Hace unos segundos';
    }
}

// Nueva función para formatear la fecha exacta
function formatExactDate(date) {
    // Opciones para el formato de fecha
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    };
    
    return date.toLocaleDateString('es-ES', options);
}

/**
 * Carga las carreras destacadas para el dashboard
 */
async function loadFeaturedCarreras() {
    try {
        const carreras = await fetchWithCSRF('/api/carrera/carrera');
        
        if (!Array.isArray(carreras)) {
            throw new Error('Formato de respuesta inválido');
        }
        
        // Tomar hasta 6 carreras para mostrar
        state.featuredCarreras = carreras.slice(0, 6);
        
        updateFeaturedCarrerasUI();
    } catch (error) {
        console.error('Error al cargar carreras destacadas:', error);
    }
}

/**
 * Actualiza la UI con las carreras destacadas
 */
function updateFeaturedCarrerasUI() {
    const container = document.getElementById('dashboard-carreras');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Si no hay carreras, mostrar mensaje
    if (state.featuredCarreras.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-search'></i>
                <p class="empty-state-message">No hay carreras disponibles</p>
                <p class="empty-state-description">Las carreras creadas aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    state.featuredCarreras.forEach(carrera => {
        // Imagen predeterminada si no tiene
        const imageSrc = carrera.imagen || '/images/default-carrera.jpg';
        
        const carreraCard = document.createElement('div');
        carreraCard.className = 'dashboard-card';
        
        // Descripción truncada si es muy larga
        const descripcion = truncateText(carrera.descripcion || 'Sin descripción disponible', 100);
        
        // Códigos Paddle truncados a 5 caracteres
        const monthCode = carrera.month ? truncateText(carrera.month, 5) : 'N/A';
        const yearCode = carrera.year ? truncateText(carrera.year, 5) : 'N/A';
        
        carreraCard.innerHTML = `
            <div class="card-image">
                <img src="${imageSrc}" alt="${carrera.nombre}" data-fallback="/images/placeholder.jpg">
            </div>
            <div class="card-content">
                <h3 class="card-title">${carrera.nombre}</h3>
                <p class="card-description">${descripcion}</p>
                <div class="card-meta">
                    <div class="paddle-codes">
                        <div class="paddle-code-wrapper">
                            <i class='bx bx-code'></i>
                            <span class="paddle-code">${monthCode}</span>
                        </div>
                        <div class="paddle-code-wrapper">
                            <i class='bx bx-code-alt'></i>
                            <span class="paddle-code">${yearCode}</span>
                        </div>
                    </div>
                    <div class="avas-counter">
                        <i class='bx bx-book-content'></i>
                        <span id="avas-count-${carrera.id_carrera}" class="avas-count-badge">Cargando...</span>
                    </div>
                </div>
            </div>
            <div class="card-actions">
                <button class="card-button view-avas" data-id="${carrera.id_carrera}">
                    <i class='bx bx-show'></i>
                    <span>Ver AVAs</span>
                </button>
                <button class="card-button edit-carrera" data-id="${carrera.id_carrera}">
                    <i class='bx bx-edit'></i>
                    <span>Editar</span>
                </button>
            </div>
        `;
        
        container.appendChild(carreraCard);
        
        const imageElement = carreraCard.querySelector('img');
        if (imageElement) {
            setupImageErrorHandler(imageElement);
        }
        
        loadAVAsCountForCarrera(carrera.id_carrera);
        
        const editButton = carreraCard.querySelector('.edit-carrera');
        const viewAVAsButton = carreraCard.querySelector('.view-avas');
        
        if (editButton) {
            editButton.addEventListener('click', () => {
                handleEditCarrera(carrera.id_carrera);
            });
        }
        
        if (viewAVAsButton) {
            viewAVAsButton.addEventListener('click', () => {
                handleViewAVAs(carrera.id_carrera, carrera.nombre);
            });
        }
    });
}

/**
 * Configura el manejo de errores de imagen (reemplazo de onerror inline)
 * @param {HTMLImageElement} imageElement - Elemento de imagen
 */
function setupImageErrorHandler(imageElement) {
    imageElement.addEventListener('error', function() {
        const fallbackSrc = this.getAttribute('data-fallback');
        if (fallbackSrc && this.src !== fallbackSrc) {
            this.src = fallbackSrc;
        }
    });
    
    // También manejar el evento load para casos donde la imagen se carga correctamente
    imageElement.addEventListener('load', function() {
        this.classList.add('loaded');
    });
}

/**
 * Maneja la acción de editar carrera
 * @param {number} carreraId - ID de la carrera
 */
function handleEditCarrera(carreraId) {
    // Navegar a la vista de edición y pasar ID de carrera
    window.location.hash = 'edition';
    
    sessionStorage.setItem('editCarreraId', carreraId);
    
    // Asegurarse de que la pestaña de carreras esté activa
    setTimeout(() => {
        const carreraTab = document.querySelector('[data-tab="edit-carrera-tab"]');
        if (carreraTab) {
            carreraTab.click();
        }
    }, 100);
}

/**
 * Maneja la acción de ver AVAs
 * @param {number} carreraId - ID de la carrera
 * @param {string} carreraName - Nombre de la carrera
 */
function handleViewAVAs(carreraId, carreraName) {
    const navigationState = {
        targetTab: 'edit-ava-tab',
        carreraId: carreraId,
        carreraName: carreraName
    };
    
    localStorage.setItem('navigationState', JSON.stringify(navigationState));
    
    // Navegar a la vista de edición
    window.location.hash = 'edition';
}

/**
 * Carga y muestra el conteo de AVAs para una carrera específica
 */
async function loadAVAsCountForCarrera(carreraId) {
    try {
        const avas = await fetchWithCSRF(`/api/avas/carrera/${carreraId}`);
        
        const countElement = document.getElementById(`avas-count-${carreraId}`);
        if (countElement) {
            const count = Array.isArray(avas) ? avas.length : 0;
            countElement.textContent = `${count} AVA${count !== 1 ? 's' : ''}`;
            
            if (count > 0) {
                countElement.classList.add('has-avas');
            }
        }
    } catch (error) {
        console.error(`Error al cargar AVAs para carrera ${carreraId}:`, error);
        
        const countElement = document.getElementById(`avas-count-${carreraId}`);
        if (countElement) {
            countElement.textContent = 'Error';
            countElement.classList.add('error');
        }
    }
}