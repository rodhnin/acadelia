// profilesModal.js - Modal de perfiles con eliminación completa - VERSIÓN CORREGIDA
import { getProfiles, deleteProfile, deleteAllProfiles } from '../api/marketingAPI.js';

// Variables globales para el manejo de la modal
let profilesData = [];
let filteredProfiles = [];
let currentView = 'grid'; // 'grid' o 'table'
let personalityChart = null;

// Referencias para cleanup de event listeners
let activeEventListeners = new Set();

// Colores para gráficos de personalidades
const PERSONALITY_COLORS = {
  'ENFP': '#FF6B6B',
  'INFP': '#4ECDC4',
  'ENFJ': '#45B7D1',
  'INFJ': '#96CEB4',
  'ENTP': '#FFEAA7',
  'INTP': '#DDA0DD',
  'ENTJ': '#FF7675',
  'INTJ': '#74B9FF',
  'ESFP': '#FD79A8',
  'ISFP': '#FDCB6E',
  'ESFJ': '#6C5CE7',
  'ISFJ': '#A29BFE',
  'ESTP': '#00B894',
  'ISTP': '#00CEC9',
  'ESTJ': '#E17055',
  'ISTJ': '#81ECEC',
  'Desconocido': '#B2BEC3'
};

export function initProfilesModal() {
  console.log('🎯 Inicializando modal de perfiles...');
  
  const profilesModal = document.getElementById('profilesModal');
  if (profilesModal) {
    profilesModal.addEventListener('modal:open', handleProfilesModalOpen);
    console.log('✅ Event listener configurado para modal de perfiles');
  } else {
    console.error('❌ Modal de perfiles no encontrada');
  }
}

function cleanupEventListeners() {
  console.log('🧹 Limpiando event listeners...');
  
  activeEventListeners.forEach(cleanup => {
    try {
      cleanup();
    } catch (error) {
      console.warn('⚠️ Error limpiando event listener:', error);
    }
  });
  
  activeEventListeners.clear();
}

function addEventListenerWithCleanup(element, event, handler, options = false) {
  element.addEventListener(event, handler, options);
  
  const cleanup = () => {
    element.removeEventListener(event, handler, options);
  };
  
  activeEventListeners.add(cleanup);
  return cleanup;
}

async function handleProfilesModalOpen() {
  console.log('📂 Abriendo modal de perfiles...');
  
  try {
    cleanupEventListeners();
    
    showProfilesLoading();
    
    await loadProfilesData();
    
    renderProfilesDashboard();
    
    setupProfilesEvents();
    
    console.log('✅ Modal de perfiles cargada correctamente');
  } catch (error) {
    console.error('❌ Error cargando modal de perfiles:', error);
    showProfilesError(error.message);
  }
}

function showProfilesLoading() {
  const modalBody = document.querySelector('#profilesModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="profiles-loading">
        <div class="spinner"></div>
        <p>Cargando análisis de perfiles...</p>
      </div>
    `;
  }
}

function showProfilesError(message) {
  const modalBody = document.querySelector('#profilesModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="profiles-no-data">
        <i class='bx bx-error-circle'></i>
        <span>Error cargando perfiles: ${message}</span>
        <button onclick="handleProfilesModalOpen()" style="margin-top: 16px; padding: 8px 16px; background: var(--color-primary-light); color: white; border: none; border-radius: 6px; cursor: pointer;">
          Reintentar
        </button>
      </div>
    `;
  }
}

async function loadProfilesData() {
  console.log('📊 Cargando datos de perfiles...');
  
  try {
    const response = await getProfiles();
    
    if (response && response.success && response.profiles) {
      profilesData = response.profiles;
      filteredProfiles = [...profilesData];
      
      console.log(`✅ ${profilesData.length} perfiles cargados`);
      console.log('📋 Muestra de datos:', profilesData.slice(0, 2));
      
      return profilesData;
    } else {
      throw new Error('No se pudieron cargar los perfiles');
    }
  } catch (error) {
    console.error('❌ Error cargando perfiles:', error);
    
    // Datos de fallback para desarrollo
    profilesData = [
      {
        id: 'profile-1',
        metadata: {
          edad: 20,
          nombre: 'Martín Salas',
          carrera: 'publicidad',
          hobbies: ['actualización de portafolio', 'creación de mini campañas', 'contenido en LinkedIn'],
          actitudes: ['iniciativa', 'coordinador de proyectos'],
          intereses: ['agencia creativa', 'conexión de marcas con temas sociales'],
          ubicacion: 'Santiago',
          personalidad: 'ENFP – Martín parece ser una persona creativa y proactiva...',
          nivel_academico: 'segundo semestre',
          tipo_personalidad: 'ENFP',
          rasgos_personalidad: ['creativo', 'iniciador', 'comunicativo', 'adaptable', 'sociable']
        }
      },
      {
        id: 'profile-2',
        metadata: {
          edad: 19,
          nombre: 'Julián',
          carrera: 'comunicación',
          enfoque: 'publicidad',
          hobbies: ['redes sociales', 'campañas', 'diseño visual', 'fotografía'],
          actitudes: ['entusiasta', 'creativo', 'propositivo', 'líder en presentaciones'],
          intereses: ['trabajar con marcas emergentes', 'enfoque humano y social'],
          ubicación: 'Guadalajara',
          personalidad: 'ENFP – Julián es un comunicador entusiasta y creativo...',
          tipo_personalidad: 'ENFP',
          rasgos_personalidad: ['creativo', 'entusiasta', 'proactivo', 'social', 'líder']
        }
      }
    ];
    
    filteredProfiles = [...profilesData];
    console.log('🔄 Usando datos de fallback');
  }
}

function renderProfilesDashboard() {
  console.log('🎨 Renderizando dashboard de perfiles...');
  
  const modalBody = document.querySelector('#profilesModal .modal-body');
  if (!modalBody) return;
  
  const analytics = processProfilesAnalytics();
  
  modalBody.innerHTML = `
    <div class="profiles-dashboard-container">
      ${renderProfilesHeader()}
      ${renderProfilesSummaryCards(analytics)}
      ${renderProfilesMainContent(analytics)}
    </div>
    
    <!-- Modal de confirmación para eliminar perfil específico -->
    <div class="profile-delete-modal" id="profileDeleteModal">
      <div class="profile-delete-content">
        <div class="profile-delete-header">
          <h3>🗑️ Eliminar Perfil</h3>
          <button class="profile-delete-close">×</button>
        </div>
        <div class="profile-delete-body">
          <div class="profile-delete-warning">
            <i class='bx bx-info-circle'></i>
            <p><strong>¿Estás seguro?</strong> Esta acción eliminará este perfil permanentemente.</p>
          </div>
          <div class="profile-delete-preview">
            <h4>Perfil a eliminar:</h4>
            <div class="profile-delete-preview-content"></div>
          </div>
          <div class="profile-delete-confirmation">
            <p>Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div class="profile-delete-footer">
          <button class="profile-delete-cancel">Cancelar</button>
          <button class="profile-delete-confirm">Sí, eliminar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación para eliminar todos los perfiles -->
    <div class="profiles-reset-modal" id="profilesResetModal">
      <div class="profiles-reset-content">
        <div class="profiles-reset-header">
          <h3>⚠️ Eliminar Todos los Perfiles</h3>
          <button class="profiles-reset-close">×</button>
        </div>
        <div class="profiles-reset-body">
          <div class="profiles-reset-warning">
            <i class='bx bx-error-circle'></i>
            <p><strong>¡ATENCIÓN!</strong> Esta acción eliminará todos los perfiles de usuario.</p>
          </div>
          <div class="profiles-reset-details">
            <h4>Esto significa que se perderán:</h4>
            <ul>
              <li>Todos los perfiles de usuario (${profilesData.length} perfiles)</li>
              <li>Toda la información demográfica recopilada</li>
              <li>Análisis de personalidades y comportamientos</li>
              <li>Datos de segmentación de audiencia</li>
            </ul>
          </div>
          <div class="profiles-reset-confirmation">
            <h4>¿Estás seguro de que quieres continuar?</h4>
            <p>Esta acción es <strong>irreversible</strong> y eliminará toda la base de datos de perfiles.</p>
          </div>
        </div>
        <div class="profiles-reset-footer">
          <button class="profiles-reset-cancel">Cancelar</button>
          <button class="profiles-reset-confirm">Sí, eliminar todos</button>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    initializeProfilesCharts(analytics);
  }, 100);
}

function renderProfilesHeader() {
  return `
    <div class="profiles-dashboard-header">
      <h1>Análisis de Perfiles</h1>
      <div class="profiles-dashboard-controls">
        <div class="profiles-search-bar">
          <i class='bx bx-search'></i>
          <input type="text" id="profiles-search-input" class="profiles-search-input" placeholder="Buscar perfiles...">
        </div>
        <select id="profiles-filter-select" class="profiles-filter-select">
          <option value="">Todas las carreras</option>
          <option value="publicidad">Publicidad</option>
          <option value="comunicación">Comunicación</option>
          <option value="marketing">Marketing</option>
          <option value="diseño">Diseño</option>
        </select>
        <select id="profiles-personality-filter" class="profiles-filter-select">
          <option value="">Todas las personalidades</option>
          <option value="ENFP">ENFP</option>
          <option value="INFP">INFP</option>
          <option value="ENFJ">ENFJ</option>
          <option value="INFJ">INFJ</option>
        </select>
        <button id="profiles-refresh-btn" class="profiles-refresh-button" title="Actualizar datos">
          <i class='bx bx-refresh'></i>
        </button>
        <button id="profiles-reset-btn" class="profiles-reset-button" title="Eliminar todos los perfiles">
          <i class='bx bx-trash'></i>
          <span>Eliminar Todos</span>
        </button>
      </div>
    </div>
  `;
}

function renderProfilesSummaryCards(analytics) {
  return `
    <div class="profiles-summary-cards">
      <div class="profiles-summary-card">
        <div class="profiles-card-icon">👥</div>
        <div class="profiles-card-value">${analytics.totalProfiles}</div>
        <div class="profiles-card-label">Total Perfiles</div>
      </div>
      <div class="profiles-summary-card">
        <div class="profiles-card-icon">🎓</div>
        <div class="profiles-card-value">${analytics.avgAge.toFixed(1)}</div>
        <div class="profiles-card-label">Edad Promedio</div>
      </div>
      <div class="profiles-summary-card">
        <div class="profiles-card-icon">🎯</div>
        <div class="profiles-card-value">${analytics.topPersonality}</div>
        <div class="profiles-card-label">Personalidad Dominante</div>
      </div>
      <div class="profiles-summary-card">
        <div class="profiles-card-icon">🏢</div>
        <div class="profiles-card-value">${analytics.topCareer}</div>
        <div class="profiles-card-label">Carrera Principal</div>
      </div>
      <div class="profiles-summary-card">
        <div class="profiles-card-icon">🌍</div>
        <div class="profiles-card-value">${analytics.topLocation}</div>
        <div class="profiles-card-label">Ubicación Principal</div>
      </div>
    </div>
  `;
}

function renderProfilesMainContent(analytics) {
  return `
    <div class="profiles-main-grid">
      <!-- Lista de Perfiles (prioridad principal) -->
      <div class="profiles-list-section">
        <div class="profiles-list-header">
          <h2><i class='bx bx-list-ul'></i> Perfiles Registrados</h2>
          <div class="profiles-list-controls">
            <div class="profiles-view-toggle">
              <button class="profiles-view-btn ${currentView === 'grid' ? 'active' : ''}" data-view="grid">
                <i class='bx bx-grid-alt'></i>
              </button>
              <button class="profiles-view-btn ${currentView === 'table' ? 'active' : ''}" data-view="table">
                <i class='bx bx-list-ul'></i>
              </button>
            </div>
          </div>
        </div>
        <div class="profiles-content" id="profiles-content">
          ${renderProfilesContent()}
        </div>
      </div>
      
      <!-- Análisis de Personalidades -->
      <div class="profiles-analytics-section">
        <h2><i class='bx bx-brain'></i> Distribución de Personalidades</h2>
        <div class="profiles-chart-wrapper">
          <div class="personality-chart-container">
            <div class="personality-chart-canvas">
              <canvas id="personality-chart"></canvas>
            </div>
            <div class="personality-stats">
              ${Object.entries(analytics.personalityDistribution)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => `
                  <div class="personality-stat-item">
                    <div class="personality-stat-color" style="background-color: ${PERSONALITY_COLORS[type]}"></div>
                    <div class="personality-stat-label">${type}</div>
                    <div class="personality-stat-count">${count} persona${count !== 1 ? 's' : ''}</div>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Distribución por Carreras -->
      <div class="profiles-analytics-section">
        <h2><i class='bx bx-briefcase'></i> Carreras y Especialidades</h2>
        <div class="career-distribution">
          ${Object.entries(analytics.careerDistribution)
            .sort(([,a], [,b]) => b - a)
            .map(([career, count]) => `
              <div class="career-item">
                <div class="career-info">
                  <div class="career-name">${capitalizeFirst(career)}</div>
                  <div class="career-level">${analytics.careerLevels[career] || 'Varios niveles'}</div>
                </div>
                <div class="career-count">${count}</div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderProfilesContent() {
  if (filteredProfiles.length === 0) {
    return `
      <div class="profiles-no-data">
        <i class='bx bx-user-x'></i>
        <span>No se encontraron perfiles</span>
      </div>
    `;
  }
  
  if (currentView === 'grid') {
    return `
      <div class="profiles-grid">
        ${filteredProfiles.map(profile => renderProfileCard(profile)).join('')}
      </div>
    `;
  } else {
    return renderProfilesTable();
  }
}

function renderProfileCard(profile) {
  const metadata = profile.metadata || {};
  const hobbies = metadata.hobbies || [];
  const personalityType = metadata.tipo_personalidad || metadata.type_personalidad || 'N/A';
  
  return `
    <div class="profile-card" data-id="${profile.id}">
      <div class="profile-card-header">
        <div class="profile-card-info">
          <div class="profile-card-name">${metadata.nombre || 'Sin nombre'}</div>
          <div class="profile-card-career">${capitalizeFirst(metadata.carrera || 'Sin carrera')}</div>
        </div>
        <div class="profile-card-actions">
          <div class="profile-card-personality">${personalityType}</div>
          <button class="profile-card-delete" data-profile-id="${profile.id}" title="Eliminar perfil">
            <i class='bx bx-trash'></i>
          </button>
        </div>
      </div>
      
      <div class="profile-card-details">
        ${metadata.edad ? `
          <div class="profile-detail-row">
            <i class='bx bx-calendar'></i>
            <span>${metadata.edad} años</span>
          </div>
        ` : ''}
        
        ${metadata.nivel_academico ? `
          <div class="profile-detail-row">
            <i class='bx bx-graduation'></i>
            <span>${capitalizeFirst(metadata.nivel_academico)}</span>
          </div>
        ` : ''}
        
        ${metadata.ubicacion || metadata.ubicación ? `
          <div class="profile-detail-row">
            <i class='bx bx-map'></i>
            <span>${metadata.ubicacion || metadata.ubicación}</span>
          </div>
        ` : ''}
      </div>
      
      ${hobbies.length > 0 ? `
        <div class="profile-hobbies">
          ${hobbies.slice(0, 3).map(hobby => `
            <span class="profile-hobby-tag">${hobby}</span>
          `).join('')}
          ${hobbies.length > 3 ? `<span class="profile-hobby-tag">+${hobbies.length - 3} más</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function renderProfilesTable() {
  return `
    <table class="profiles-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Carrera</th>
          <th>Personalidad</th>
          <th>Edad</th>
          <th>Ubicación</th>
          <th>Nivel</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${filteredProfiles.map(profile => {
          const metadata = profile.metadata || {};
          return `
            <tr data-id="${profile.id}">
              <td>${metadata.nombre || 'Sin nombre'}</td>
              <td>${capitalizeFirst(metadata.carrera || 'Sin carrera')}</td>
              <td>${metadata.tipo_personalidad || metadata.type_personalidad || 'N/A'}</td>
              <td>${metadata.edad || 'N/A'}</td>
              <td>${metadata.ubicacion || metadata.ubicación || 'N/A'}</td>
              <td>${capitalizeFirst(metadata.nivel_academico || 'N/A')}</td>
              <td class="profile-actions-cell">
                <button class="profile-action-btn profile-view-btn" data-profile-id="${profile.id}" title="Ver detalles">
                  <i class='bx bx-show'></i>
                </button>
                <button class="profile-action-btn profile-delete-btn" data-profile-id="${profile.id}" title="Eliminar">
                  <i class='bx bx-trash'></i>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function setupProfilesEvents() {
  console.log('🔧 Configurando eventos de perfiles...');
  
  // Búsqueda
  const searchInput = document.getElementById('profiles-search-input');
  if (searchInput) {
    addEventListenerWithCleanup(searchInput, 'input', handleProfilesSearch);
  }
  
  // Filtros
  const careerFilter = document.getElementById('profiles-filter-select');
  if (careerFilter) {
    addEventListenerWithCleanup(careerFilter, 'change', handleProfilesFilter);
  }
  
  const personalityFilter = document.getElementById('profiles-personality-filter');
  if (personalityFilter) {
    addEventListenerWithCleanup(personalityFilter, 'change', handleProfilesFilter);
  }
  
  // Botón de actualizar
  const refreshBtn = document.getElementById('profiles-refresh-btn');
  if (refreshBtn) {
    addEventListenerWithCleanup(refreshBtn, 'click', handleProfilesRefresh);
  }
  
  // Botón de eliminar todos
  const resetBtn = document.getElementById('profiles-reset-btn');
  if (resetBtn) {
    addEventListenerWithCleanup(resetBtn, 'click', showResetProfilesModal);
  }
  
  // Cambio de vista
  const viewButtons = document.querySelectorAll('.profiles-view-btn');
  viewButtons.forEach(btn => {
    addEventListenerWithCleanup(btn, 'click', handleViewChange);
  });
  
  const modalBody = document.querySelector('#profilesModal .modal-body');
  if (modalBody) {
    addEventListenerWithCleanup(modalBody, 'click', handleModalBodyClick);
  }
  
  console.log('✅ Eventos configurados');
}

function handleModalBodyClick(e) {
  // Prevenir propagación para botones de acción
  if (e.target.closest('.profile-action-btn') || e.target.closest('.profile-card-delete')) {
    e.stopPropagation();
  }
  
  if (e.target.closest('.profile-card') && !e.target.closest('.profile-card-delete')) {
    const profileId = e.target.closest('.profile-card').dataset.id;
    if (profileId) {
      console.log('🎯 Abriendo detalles desde grid view:', profileId);
      showProfileDetails(profileId);
    }
    return;
  }
  
  if (e.target.closest('.profile-view-btn')) {
    const profileId = e.target.closest('.profile-view-btn').dataset.profileId;
    if (profileId) {
      console.log('🎯 Abriendo detalles desde table view button:', profileId);
      showProfileDetails(profileId);
    }
    return;
  }
  
  if (e.target.closest('.profile-card-delete') || e.target.closest('.profile-delete-btn')) {
    e.preventDefault();
    e.stopPropagation();
    const profileId = e.target.closest('[data-profile-id]').dataset.profileId;
    if (profileId) {
      console.log('🗑️ Iniciando eliminación desde click:', profileId);
      handleDeleteProfile(profileId);
    }
    return;
  }
}

function showResetProfilesModal() {
  console.log('🚀 Mostrando modal de reseteo...');
  
  const resetModal = document.querySelector('#profilesResetModal');
  if (!resetModal) {
    console.error('❌ Modal de reseteo no encontrada');
    return;
  }
  
  if (resetModal._cleanup) {
    resetModal._cleanup();
  }
  
  const confirmBtn = resetModal.querySelector('.profiles-reset-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar todos';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  const closeBtn = resetModal.querySelector('.profiles-reset-close');
  const cancelBtn = resetModal.querySelector('.profiles-reset-cancel');
  
  if (!closeBtn || !cancelBtn || !confirmBtn) {
    console.error('❌ Botones de modal de reseteo no encontrados');
    return;
  }
  
  const closeHandler = () => {
    console.log('🚪 Cerrando modal de reseteo');
    closeResetProfilesModal(resetModal);
  };
  
  const confirmHandler = () => {
    console.log('✅ Confirmando reseteo masivo');
    handleResetAllProfiles(resetModal);
  };
  
  const handleEsc = (e) => {
    if (e.key === 'Escape' && resetModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('⌨️ ESC presionado en modal de reseteo');
      closeHandler();
    }
  };
  
  const handleOutsideClick = (e) => {
    if (e.target === resetModal) {
      console.log('🖱️ Click fuera de modal de reseteo');
      closeHandler();
    }
  };
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  resetModal.addEventListener('click', handleOutsideClick);
  
  // ESC con máxima prioridad
  document.addEventListener('keydown', handleEsc, true);
  
  resetModal._cleanup = () => {
    closeBtn.removeEventListener('click', closeHandler);
    cancelBtn.removeEventListener('click', closeHandler);
    confirmBtn.removeEventListener('click', confirmHandler);
    resetModal.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEsc, true);
    delete resetModal._cleanup;
  };
  
  resetModal.classList.add('active');
  console.log('✅ Modal de reseteo activada');
}

function closeResetProfilesModal(resetModal) {
  console.log('🚪 Cerrando modal de reseteo...');
  
  const confirmBtn = resetModal.querySelector('.profiles-reset-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar todos';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  resetModal.classList.remove('active');
  
  if (resetModal._cleanup) {
    resetModal._cleanup();
  }
  
  console.log('✅ Modal de reseteo cerrada y limpiada');
}

async function handleDeleteProfile(profileId) {
  console.log('🗑️ Iniciando eliminación de perfil:', profileId);
  
  const profile = profilesData.find(p => p.id === profileId);
  if (!profile) {
    console.warn('❌ Perfil no encontrado:', profileId);
    if (window.showNotification) {
      window.showNotification('Error: Perfil no encontrado', 'error', 3000);
    }
    return;
  }
  
  console.log('✅ Perfil encontrado, mostrando modal de confirmación');
  showDeleteProfileModal(profile);
}

function showDeleteProfileModal(profile) {
  console.log('🚀 Mostrando modal de eliminar para:', profile.metadata?.nombre || profile.id);
  
  const deleteModal = document.querySelector('#profileDeleteModal');
  if (!deleteModal) {
    console.error('❌ Modal de eliminar no encontrada');
    return;
  }
  
  if (deleteModal._cleanup) {
    deleteModal._cleanup();
  }
  
  const confirmBtn = deleteModal.querySelector('.profile-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  // Llenar preview del perfil (resto del código igual)
  const previewDiv = deleteModal.querySelector('.profile-delete-preview-content');
  if (previewDiv) {
    const metadata = profile.metadata || {};
    previewDiv.innerHTML = `
      <div class="profile-preview-card">
        <div class="profile-preview-header">
          <div class="profile-preview-name">${metadata.nombre || 'Sin nombre'}</div>
          <div class="profile-preview-career">${capitalizeFirst(metadata.carrera || 'Sin carrera')}</div>
        </div>
        <div class="profile-preview-details">
          ${metadata.edad ? `<span>Edad: ${metadata.edad} años</span>` : ''}
          ${metadata.tipo_personalidad ? `<span>Personalidad: ${metadata.tipo_personalidad}</span>` : ''}
          ${metadata.ubicacion || metadata.ubicación ? `<span>Ubicación: ${metadata.ubicacion || metadata.ubicación}</span>` : ''}
        </div>
      </div>
    `;
  }
  
  const closeBtn = deleteModal.querySelector('.profile-delete-close');
  const cancelBtn = deleteModal.querySelector('.profile-delete-cancel');
  
  if (!closeBtn || !cancelBtn || !confirmBtn) {
    console.error('❌ Botones de modal de eliminar no encontrados');
    return;
  }
  
  const closeHandler = () => {
    console.log('🚪 Cerrando modal de eliminar');
    closeDeleteProfileModal(deleteModal);
  };
  
  const confirmHandler = () => {
    console.log('✅ Confirmando eliminación de perfil');
    confirmDeleteProfile(profile.id, deleteModal);
  };
  
  const handleEsc = (e) => {
    if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('⌨️ ESC presionado en modal de eliminar');
      closeHandler();
    }
  };
  
  const handleOutsideClick = (e) => {
    if (e.target === deleteModal) {
      console.log('🖱️ Click fuera de modal de eliminar');
      closeHandler();
    }
  };
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  deleteModal.addEventListener('click', handleOutsideClick);
  
  // ESC con máxima prioridad
  document.addEventListener('keydown', handleEsc, true);
  
  deleteModal._cleanup = () => {
    closeBtn.removeEventListener('click', closeHandler);
    cancelBtn.removeEventListener('click', closeHandler);
    confirmBtn.removeEventListener('click', confirmHandler);
    deleteModal.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEsc, true);
    delete deleteModal._cleanup;
  };
  
  deleteModal.classList.add('active');
  console.log('✅ Modal de eliminar activada');
}

function closeDeleteProfileModal(deleteModal) {
  console.log('🚪 Cerrando modal de eliminar...');
  
  const confirmBtn = deleteModal.querySelector('.profile-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  deleteModal.classList.remove('active');
  
  if (deleteModal._cleanup) {
    deleteModal._cleanup();
  }
  
  console.log('✅ Modal de eliminar cerrada y limpiada');
}

function resetAllDeleteModals() {
  console.log('🔄 Reseteando todas las modales de eliminación...');
  
  const deleteModal = document.querySelector('#profileDeleteModal');
  if (deleteModal) {
    const confirmBtn = deleteModal.querySelector('.profile-delete-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Sí, eliminar';
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    deleteModal.classList.remove('active');
    
    if (deleteModal._cleanup) {
      deleteModal._cleanup();
    }
  }
  
  const resetModal = document.querySelector('#profilesResetModal');
  if (resetModal) {
    const confirmBtn = resetModal.querySelector('.profiles-reset-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Sí, eliminar todos';
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    resetModal.classList.remove('active');
    
    if (resetModal._cleanup) {
      resetModal._cleanup();
    }
  }
  
  console.log('✅ Todas las modales de eliminación reseteadas');
}


async function handleResetAllProfiles(resetModal) {
  console.log('🔥 Iniciando eliminación masiva...');
  
  const confirmBtn = resetModal.querySelector('.profiles-reset-confirm');
  
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar todos',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    const response = await deleteAllProfiles();
    
    if (response && response.success) {
      if (confirmBtn) {
        confirmBtn.textContent = originalButtonState.text;
        confirmBtn.disabled = originalButtonState.disabled;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeResetProfilesModal(resetModal);
      }, 100);
      
      // Recargar datos
      await loadProfilesData();
      applyFilters();
      
      if (window.showNotification) {
        window.showNotification('Todos los perfiles eliminados correctamente', 'success', 3000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error eliminando todos los perfiles:', error);
    
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar los perfiles: ' + error.message, 'error', 5000);
    }
  }
}

async function confirmDeleteProfile(profileId, deleteModal) {
  console.log('🔥 Confirmando eliminación de perfil:', profileId);
  
  const confirmBtn = deleteModal.querySelector('.profile-delete-confirm');
  
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    const response = await deleteProfile(profileId);
    console.log('📥 Respuesta de eliminación:', response);
    
    if (response && response.success) {
      if (confirmBtn) {
        confirmBtn.textContent = originalButtonState.text;
        confirmBtn.disabled = originalButtonState.disabled;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeDeleteProfileModal(deleteModal);
      }, 100);
      
      // Recargar datos y actualizar vista
      await loadProfilesData();
      applyFilters();
      
      if (window.showNotification) {
        window.showNotification('Perfil eliminado correctamente', 'success', 2000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error eliminando perfil:', error);
    
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar el perfil: ' + error.message, 'error', 5000);
    }
  }
}

// Resto de funciones sin cambios...
function processProfilesAnalytics() {
  console.log('📊 Procesando analytics de perfiles...');
  
  const analytics = {
    totalProfiles: profilesData.length,
    avgAge: 0,
    personalityDistribution: {},
    careerDistribution: {},
    locationDistribution: {},
    careerLevels: {},
    topPersonality: 'N/A',
    topCareer: 'N/A',
    topLocation: 'N/A'
  };
  
  if (profilesData.length === 0) return analytics;
  
  let totalAge = 0;
  let ageCount = 0;
  
  profilesData.forEach(profile => {
    const metadata = profile.metadata || {};
    
    // Edad promedio
    if (metadata.edad) {
      totalAge += metadata.edad;
      ageCount++;
    }
    
    // Distribución de personalidades
    const personality = metadata.tipo_personalidad || metadata.type_personalidad || 'Desconocido';
    analytics.personalityDistribution[personality] = (analytics.personalityDistribution[personality] || 0) + 1;
    
    // Distribución de carreras
    const career = metadata.carrera || 'Sin carrera';
    analytics.careerDistribution[career] = (analytics.careerDistribution[career] || 0) + 1;
    
    // Niveles académicos por carrera
    if (metadata.carrera && metadata.nivel_academico) {
      if (!analytics.careerLevels[metadata.carrera]) {
        analytics.careerLevels[metadata.carrera] = metadata.nivel_academico;
      }
    }
    
    // Distribución de ubicaciones
    const location = metadata.ubicacion || metadata.ubicación || 'Sin ubicación';
    analytics.locationDistribution[location] = (analytics.locationDistribution[location] || 0) + 1;
  });
  
  analytics.avgAge = ageCount > 0 ? totalAge / ageCount : 0;
  
  // Encontrar los más comunes
  analytics.topPersonality = Object.keys(analytics.personalityDistribution)
    .reduce((a, b) => analytics.personalityDistribution[a] > analytics.personalityDistribution[b] ? a : b, 'N/A');
    
  analytics.topCareer = Object.keys(analytics.careerDistribution)
    .reduce((a, b) => analytics.careerDistribution[a] > analytics.careerDistribution[b] ? a : b, 'N/A');
    
  analytics.topLocation = Object.keys(analytics.locationDistribution)
    .reduce((a, b) => analytics.locationDistribution[a] > analytics.locationDistribution[b] ? a : b, 'N/A');
  
  console.log('📈 Analytics procesados:', analytics);
  return analytics;
}

function initializeProfilesCharts(analytics) {
  console.log('📊 Inicializando gráfico de personalidades...');
  
  const ctx = document.getElementById('personality-chart');
  if (!ctx) {
    console.warn('⚠️ Canvas de personalidades no encontrado');
    return;
  }
  
  // Destruir gráfico anterior si existe
  if (personalityChart) {
    personalityChart.destroy();
  }
  
  const personalityData = Object.entries(analytics.personalityDistribution);
  const labels = personalityData.map(([type]) => type);
  const data = personalityData.map(([, count]) => count);
  const colors = personalityData.map(([type]) => PERSONALITY_COLORS[type] || '#B2BEC3');
  
  personalityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue('--color-background') || '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false // Lo ocultamos porque tenemos nuestra propia leyenda
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed * 100) / total).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
  
  console.log('✅ Gráfico de personalidades inicializado');
}

function handleProfilesSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim();
  applyFilters(searchTerm);
}

function handleProfilesFilter() {
  const careerFilter = document.getElementById('profiles-filter-select')?.value || '';
  const personalityFilter = document.getElementById('profiles-personality-filter')?.value || '';
  const searchTerm = document.querySelector('.profiles-search-input')?.value.toLowerCase() || '';
  
  filteredProfiles = profilesData.filter(profile => {
    const metadata = profile.metadata || {};
    
    const matchesCareer = !careerFilter || (metadata.carrera || '').toLowerCase().includes(careerFilter.toLowerCase());
    const matchesPersonality = !personalityFilter || (metadata.tipo_personalidad || metadata.type_personalidad || '') === personalityFilter;
    
    const searchableText = [
      metadata.nombre,
      metadata.carrera,
      metadata.tipo_personalidad,
      metadata.ubicacion,
      metadata.ubicación,
      ...(metadata.hobbies || []),
      ...(metadata.rasgos_personalidad || [])
    ].filter(Boolean).join(' ').toLowerCase();
    
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    
    return matchesCareer && matchesPersonality && matchesSearch;
  });
  
  updateProfilesView();
}

function applyFilters(searchTerm = '') {
  const careerFilter = document.getElementById('profiles-filter-select')?.value || '';
  const personalityFilter = document.getElementById('profiles-personality-filter')?.value || '';
  
  filteredProfiles = profilesData.filter(profile => {
    const metadata = profile.metadata || {};
    
    const matchesCareer = !careerFilter || (metadata.carrera || '').toLowerCase().includes(careerFilter.toLowerCase());
    const matchesPersonality = !personalityFilter || (metadata.tipo_personalidad || metadata.type_personalidad || '') === personalityFilter;
    
    if (searchTerm) {
      const searchableText = [
        metadata.nombre,
        metadata.carrera,
        metadata.tipo_personalidad,
        metadata.ubicacion,
        metadata.ubicación,
        ...(metadata.hobbies || []),
        ...(metadata.rasgos_personalidad || [])
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    return matchesCareer && matchesPersonality;
  });
  
  updateProfilesView();
}

async function handleProfilesRefresh() {
  console.log('🔄 Actualizando datos de perfiles...');
  
  try {
    showProfilesLoading();
    
    cleanupEventListeners();
    
    await loadProfilesData();
    renderProfilesDashboard();
    setupProfilesEvents();
    
    if (window.showNotification) {
      window.showNotification('Perfiles actualizados correctamente', 'success');
    }
  } catch (error) {
    console.error('❌ Error actualizando perfiles:', error);
    if (window.showNotification) {
      window.showNotification('Error actualizando perfiles', 'error');
    }
  }
}

function handleViewChange(event) {
  const newView = event.currentTarget.getAttribute('data-view');
  
  document.querySelectorAll('.profiles-view-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.currentTarget.classList.add('active');
  
  currentView = newView;
  updateProfilesView();
}

function updateProfilesView() {
  const profilesContent = document.getElementById('profiles-content');
  if (profilesContent) {
    profilesContent.innerHTML = renderProfilesContent();
    // NO llamamos a setupProfileCardEvents() porque ya tenemos delegación de eventos
  }
}

function showProfileDetails(profileId) {
  const profile = profilesData.find(p => p.id === profileId);
  if (!profile) {
    console.warn('❌ Perfil no encontrado:', profileId);
    return;
  }
  
  const metadata = profile.metadata || {};
  console.log('👤 Mostrando detalles del perfil:', metadata.nombre || profileId);
  
  createProfileDetailModal(profile);
}

function createProfileDetailModal(profile) {
  const metadata = profile.metadata || {};
  
  console.log('🎯 Creando modal de detalles para:', metadata.nombre || profile.id);
  
  const existingModal = document.getElementById('profile-detail-modal');
  if (existingModal) {
    console.log('🧹 Removiendo modal anterior');
    closeProfileDetailModal(existingModal);
  }
  
  const modal = document.createElement('div');
  modal.id = 'profile-detail-modal';
  modal.className = 'profile-detail-modal';
  
  modal.innerHTML = `
    <div class="profile-detail-content">
      <div class="profile-detail-header">
        <button class="profile-detail-close" title="Cerrar detalles">&times;</button>
        <div class="profile-detail-main-info">
          <div class="profile-detail-name">${metadata.nombre || 'Sin nombre'}</div>
          <div class="profile-detail-career">${capitalizeFirst(metadata.carrera || 'Sin carrera')}</div>
          <div class="profile-detail-personality-badge">
            ${metadata.tipo_personalidad || metadata.type_personalidad || 'Personalidad no definida'}
          </div>
        </div>
      </div>
      
      <div class="profile-detail-body">
        ${renderProfileDetailSections(metadata)}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  console.log('✅ Modal de detalles agregada al DOM');
  
  setupProfileDetailEvents(modal);
  
  setTimeout(() => {
    modal.classList.add('active');
    console.log('🎭 Modal de detalles activada');
  }, 10);
  
  return modal;
}

function renderProfileDetailSections(metadata) {
  const sections = [];
  
  // Información básica
  sections.push(`
    <div class="profile-detail-section">
      <h3><i class='bx bx-user'></i> Información Personal</h3>
      <div class="profile-detail-grid">
        ${metadata.edad ? `
          <div class="profile-detail-item">
            <div class="profile-detail-item-label">Edad</div>
            <div class="profile-detail-item-value">${metadata.edad} años</div>
          </div>
        ` : ''}
        ${metadata.nivel_academico ? `
          <div class="profile-detail-item">
            <div class="profile-detail-item-label">Nivel Académico</div>
            <div class="profile-detail-item-value">${capitalizeFirst(metadata.nivel_academico)}</div>
          </div>
        ` : ''}
        ${metadata.curso ? `
          <div class="profile-detail-item">
            <div class="profile-detail-item-label">Curso/Año</div>
            <div class="profile-detail-item-value">${metadata.curso}</div>
          </div>
        ` : ''}
        ${metadata.ubicacion || metadata.ubicación ? `
          <div class="profile-detail-item">
            <div class="profile-detail-item-label">Ubicación</div>
            <div class="profile-detail-item-value">${metadata.ubicacion || metadata.ubicación}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `);
  
  // Hobbies e intereses
  if (metadata.hobbies && metadata.hobbies.length > 0) {
    sections.push(`
      <div class="profile-detail-section">
        <h3><i class='bx bx-heart'></i> Hobbies e Intereses</h3>
        <div class="profile-detail-tags">
          ${metadata.hobbies.map(hobby => `
            <span class="profile-detail-tag">${hobby}</span>
          `).join('')}
        </div>
      </div>
    `);
  }
  
  // Actitudes
  if (metadata.actitudes && metadata.actitudes.length > 0) {
    sections.push(`
      <div class="profile-detail-section">
        <h3><i class='bx bx-trending-up'></i> Actitudes</h3>
        <div class="profile-detail-tags">
          ${metadata.actitudes.map(actitud => `
            <span class="profile-detail-tag">${actitud}</span>
          `).join('')}
        </div>
      </div>
    `);
  }
  
  // Intereses específicos
  if (metadata.intereses && metadata.intereses.length > 0) {
    sections.push(`
      <div class="profile-detail-section">
        <h3><i class='bx bx-target-lock'></i> Intereses Específicos</h3>
        <div class="profile-detail-tags">
          ${metadata.intereses.map(interes => `
            <span class="profile-detail-tag">${interes}</span>
          `).join('')}
        </div>
      </div>
    `);
  }
  
  // Rasgos de personalidad
  if (metadata.rasgos_personalidad && metadata.rasgos_personalidad.length > 0) {
    sections.push(`
      <div class="profile-detail-section">
        <h3><i class='bx bx-brain'></i> Rasgos de Personalidad</h3>
        <div class="profile-detail-tags">
          ${metadata.rasgos_personalidad.map(rasgo => `
            <span class="profile-detail-tag">${rasgo}</span>
          `).join('')}
        </div>
      </div>
    `);
  }
  
  // Descripción de personalidad
  if (metadata.personalidad) {
    sections.push(`
      <div class="profile-detail-section">
        <h3><i class='bx bx-book-open'></i> Análisis de Personalidad</h3>
        <div class="profile-detail-personality-description">
          ${metadata.personalidad}
        </div>
      </div>
    `);
  }
  
  // Datos adicionales
  const additionalData = {};
  const excludeKeys = ['nombre', 'edad', 'carrera', 'nivel_academico', 'curso', 'ubicacion', 'ubicación', 
                       'hobbies', 'actitudes', 'intereses', 'rasgos_personalidad', 'personalidad', 
                       'tipo_personalidad', 'type_personalidad'];
  
  Object.keys(metadata).forEach(key => {
    if (!excludeKeys.includes(key) && metadata[key]) {
      additionalData[key] = metadata[key];
    }
  });
  
  if (Object.keys(additionalData).length > 0) {
    sections.push(`
      <div class="profile-detail-section">
        <h3><i class='bx bx-info-circle'></i> Información Adicional</h3>
        <div class="profile-detail-grid">
          ${Object.entries(additionalData).map(([key, value]) => `
            <div class="profile-detail-item">
              <div class="profile-detail-item-label">${capitalizeFirst(key.replace(/_/g, ' '))}</div>
              <div class="profile-detail-item-value">
                ${Array.isArray(value) ? value.join(', ') : 
                  typeof value === 'object' ? JSON.stringify(value, null, 2) : 
                  value.toString()}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  }
  
  // JSON completo (para desarrolladores)
  sections.push(`
    <div class="profile-detail-section">
      <h3><i class='bx bx-code-alt'></i> Datos Completos (JSON)</h3>
      <div class="profile-detail-json">
        <pre>${JSON.stringify(metadata, null, 2)}</pre>
      </div>
    </div>
  `);
  
  return sections.join('');
}

function setupProfileDetailEvents(modal) {
  if (modal._cleanup) {
    modal._cleanup();
  }
  
  const closeBtn = modal.querySelector('.profile-detail-close');
  const content = modal.querySelector('.profile-detail-content');
  
  const closeHandler = (e) => {
    e?.stopPropagation();
    closeProfileDetailModal(modal);
  };
  
  const handleOutsideClick = (e) => {
    if (e.target === modal) {
      e.stopPropagation();
      closeHandler();
    }
  };
  
  const preventInsideClick = (e) => {
    e.stopPropagation();
  };
  
  const handleEsc = (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeHandler);
  }
  
  modal.addEventListener('click', handleOutsideClick);
  
  if (content) {
    content.addEventListener('click', preventInsideClick);
  }
  
  // ESC con máxima prioridad
  document.addEventListener('keydown', handleEsc, true);
  
  modal._cleanup = () => {
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    modal.removeEventListener('click', handleOutsideClick);
    if (content) content.removeEventListener('click', preventInsideClick);
    document.removeEventListener('keydown', handleEsc, true);
    delete modal._cleanup;
  };
}

function closeProfileDetailModal(modal) {
  if (!modal) {
    console.warn('⚠️ Intentando cerrar modal null/undefined');
    return;
  }
  
  console.log('🚪 Cerrando modal de detalles...');
  
  modal.classList.remove('active');
  
  if (modal._cleanup) {
    modal._cleanup();
  }
  
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
      console.log('✅ Modal de detalles removida del DOM');
    }
  }, 300);
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Exponer funciones necesarias globalmente
if (typeof window !== 'undefined') {
  window.initProfilesModal = initProfilesModal;
  window.handleProfilesModalOpen = handleProfilesModalOpen;
  window.showProfileDetails = showProfileDetails;
  window.createProfileDetailModal = createProfileDetailModal;
  window.closeProfileDetailModal = closeProfileDetailModal;
}

// Auto-inicializar si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilesModal);
} else {
  initProfilesModal();
}

// 🆕 FUNCIÓN DE RESET PARA CONTENT MODAL
function resetProfilesModalState() {
  console.log('🔄 Reiniciando estado de profiles modal...');
  
  if (typeof profilesData !== 'undefined') {
    profilesData = [];
  }
  if (typeof filteredProfiles !== 'undefined') {
    filteredProfiles = [];
  }
  if (typeof currentView !== 'undefined') {
    currentView = 'grid';
  }
  
  // Destruir gráfico de personalidades
  if (typeof personalityChart !== 'undefined' && personalityChart) {
    try {
      personalityChart.destroy();
      personalityChart = null;
    } catch (e) {
      console.warn('Error destruyendo personalityChart:', e);
    }
  }
  
  if (typeof activeEventListeners !== 'undefined' && activeEventListeners instanceof Set) {
    activeEventListeners.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('⚠️ Error limpiando event listener:', error);
      }
    });
    activeEventListeners.clear();
  }
  
  resetAllDeleteModals();
  
  console.log('✅ Estado de profiles modal reiniciado completamente');
}

// Exponer función globalmente para profiles modal
if (typeof window !== 'undefined') {
  window.initProfilesModal = initProfilesModal;
  window.handleProfilesModalOpen = handleProfilesModalOpen;
  window.showProfileDetails = showProfileDetails;
  window.createProfileDetailModal = createProfileDetailModal;
  window.closeProfileDetailModal = closeProfileDetailModal;
  
  window.resetAllDeleteModals = resetAllDeleteModals;
  
  if (!window.profilesModal) {
    window.profilesModal = {};
  }
  window.profilesModal.reset = resetProfilesModalState;
  window.profilesModal.resetDeleteModals = resetAllDeleteModals;
}