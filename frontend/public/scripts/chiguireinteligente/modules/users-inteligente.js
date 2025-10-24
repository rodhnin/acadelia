/**
 * Módulo de Gestión de Usuarios Mejorado
 * Permite ver, filtrar y gestionar usuarios con información completa
 */

import { formatCurrency, formatDate, formatUserName } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class UsersModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.users = [];
    this.filteredUsers = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filterSettings = {
      status: '',
      subscription: '',
      country: '',
      university: '',
      search: ''
    };
    this.countries = [];
    this.currentSection = null;
    this.universities = [];
    this.userCountryStats = {};
    this.userProductStats = {};
  }
  
  /**
   * Inicializa el módulo de usuarios
   */
  async init() {
  console.log('Inicializando módulo de usuarios');
  
  // Configurar event listeners
  this.setupEventListeners();
  
  // MODIFICADO: Suscribirse a cambios de fecha pero ignorarlos
  this.eventBus.on('dateRangeChanged', (range) => {
    console.log('Users: Ignorando cambio de rango de fechas. Módulo de usuarios no actualiza por fecha.');
    // No hacer nada con este evento
  });
  
  // Cargar datos iniciales (solo una vez)
  await this.loadUserData();
  
  return true;
}
  
/**
   * Configura event listeners para el módulo
   */
setupEventListeners() {
  // Botón de aplicar filtros - usando delegación de eventos para mayor robustez
  document.addEventListener('click', (e) => {
    const filterButton = e.target.closest('#apply-user-filters');
    if (filterButton && this.currentSection === 'users') {
      console.log('Botón de filtro clickeado en sección de usuarios');
      this.applyFilters();
    }
  });
  
  // Campo de búsqueda
  const searchInput = document.getElementById('user-search');
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && this.currentSection === 'users') {
        this.applyFilters();
      }
    });
  }

    // Añadir botón de reinicio de filtros
this.resetButton = this.ui.addResetFiltersButton(
  'users-section', 
  'reset-user-filters',
  () => this.resetFilters(), 
  '#apply-user-filters'
);

// También puedes escuchar eventos para aplicar filtros
document.addEventListener('click', (e) => {
  const filterButton = e.target.closest('#apply-user-filters');
  if (filterButton && this.currentSection === 'users') {
    // Actualizar estado del botón al aplicar filtros
    setTimeout(() => {
      this.updateResetButtonVisibility();
    }, 100);
  }
});
    
    // Filtro de países - actualizar universidades al cambiar el país
    const countryFilter = document.getElementById('user-country-filter');
    if (countryFilter) {
      countryFilter.addEventListener('change', () => {
        this.updateUniversityOptions(countryFilter.value);
      });
    }
    
    // Botones de paginación
    const prevPageBtn = document.getElementById('user-prev-page');
    const nextPageBtn = document.getElementById('user-next-page');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.updateUsersTable();
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.updateUsersTable();
        }
      });
    }
    
    // Botón de exportación
    const exportBtn = document.getElementById('export-users');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportUsers();
      });
    }
    
    // Eventos desde otros módulos
    this.eventBus.on('dateRangeChanged', (range) => {
      // Actualizar datos si cambia el rango de fechas
      this.refreshUsers();
    });
    
    // Al cambiar de sección
    document.addEventListener('sectionChanged', (e) => {
      if (e.detail.section === 'users') {
        this.currentSection = 'users';
        this.onSectionActivated();
      } else {
        this.currentSection = e.detail.section;
      }
    });
  }
  
/**
 * Refresca los datos de usuarios
 * @param {boolean} forceApi - Fuerza recarga desde API ignorando caché
 */
async refreshUsers(forceApi = false) {
  // Si no se fuerza API y ya tenemos datos, no hacer nada
  if (!forceApi && this.users.length > 0) {
    console.log('Users: Usando datos existentes en memoria');
    this.ui.showSuccessMessage('Usando datos existentes', {
      timeout: 1500,
      icon: 'bi-speedometer'
    });
    
    // Solo actualizar la UI sin recargar datos
    this.calculateUserStats();
    this.applyFilters();
    
    return;
  }
  
  // Solo si se fuerza explícitamente, recargar desde API
  console.log('Users: Solicitando datos frescos desde API');
  
  // Limpiar caché para obtener datos frescos
  this.api.clearCache('users');
  
  // Mostrar indicador de carga
  this.ui.showLoading('Actualizando datos de usuarios...');
  
  try {
    // Destruir gráficos antes de recargar datos
    this.destroyCharts();
    
    // Recargar datos
    await this.loadUserData();
    
    // Ocultar indicador de carga
    this.ui.hideLoading();
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage('Datos actualizados correctamente');
  } catch (error) {
    // Ocultar indicador de carga
    this.ui.hideLoading();
    
    // Mostrar mensaje de error
    this.ui.showErrorMessage('Error al actualizar', 'No se pudieron recargar los datos');
    console.error('Error al actualizar usuarios:', error);
  }
}

 /**
 * Reinicia todos los filtros a sus valores predeterminados
 */
resetFilters() {
  // Reiniciar objeto de filtros
  this.filterSettings = {
    subscription: '',
    country: '',
    university: '',
    search: ''
  };
  
  // Reiniciar elementos del formulario
  const searchInput = document.getElementById('user-search');
  const subscriptionFilter = document.getElementById('user-subscription-filter');
  const countryFilter = document.getElementById('user-country-filter');
  const universityFilter = document.getElementById('user-university-filter');
  
  if (searchInput) searchInput.value = '';
  if (subscriptionFilter) subscriptionFilter.value = '';
  if (countryFilter) countryFilter.value = '';
  if (universityFilter) universityFilter.value = '';
  
  // Resetear paginación
  this.currentPage = 1;
  
  // Notificar al usuario
  this.ui.showSuccessMessage('Filtros reiniciados');
  
  // Recargar datos
  this.applyFilters();
  
  // Actualizar estado del botón
  this.updateResetButtonVisibility();
}

/**
 * Actualiza la visibilidad y estilo del botón de reinicio según los filtros activos
 */
updateResetButtonVisibility() {
  const hasActiveFilters = 
    this.filterSettings.subscription || 
    this.filterSettings.country || 
    this.filterSettings.university || 
    this.filterSettings.search;
  
  this.ui.updateResetButtonState('reset-user-filters', hasActiveFilters);
}
 
 /**
  * Se ejecuta cuando se activa la sección de usuarios
  */
onSectionActivated() {
  // Si ya tenemos datos, solo actualizar UI sin recargar
  if (this.users && this.users.length > 0) {
    console.log('Users: Usando datos existentes en memoria, sin peticiones adicionales');
    
    // Actualizar gráficos si existen, sin recargar datos
    const countryChartEl = document.getElementById('users-country-chart');
    const productChartEl = document.getElementById('users-product-chart');
    
    if (countryChartEl && productChartEl) {
      // Destruir gráficos existentes para evitar errores
      this.destroyCharts();
      
      // Recrear gráficos con los datos en memoria
      this.initCharts();
    }
    
    // Aplicar filtros sin recargar datos
    this.applyFilters();
    return;
  }
  
  // Solo si no hay datos, cargarlos
  console.log('Users: Cargando datos iniciales');
  this.loadUserData();
}
  
  /**
   * Carga la lista de países y universidades
   */
  async loadCountriesAndUniversities() {
    try {
      // Cargar países
      const response = await this.api.get('/paises');
      if (response.success) {
        this.countries = response.data;
        
        // Actualizar selector de países en el filtro
        this.populateCountrySelect();
      } else {
        console.error('Error al cargar países:', response.error);
      }
      
      return true;
    } catch (error) {
      console.error('Error al cargar países y universidades:', error);
      this.ui.showErrorMessage('Error al cargar datos', 'No se pudieron obtener los países y universidades.');
      return false;
    }
  }
  
  /**
   * Actualiza el selector de países en el filtro
   */
  populateCountrySelect() {
    const countrySelect = document.getElementById('user-country-filter');
    if (!countrySelect || !this.countries.length) return;
    
    // Mantener la opción por defecto
    let options = `<option value="">Todos los países</option>`;
    
    // Añadir opciones de países
    this.countries.forEach(country => {
      options += `<option value="${country.id_pais}">${country.nombre_pais}</option>`;
    });
    
    countrySelect.innerHTML = options;
  }
  
  /**
   * Actualiza el selector de universidades según el país seleccionado
   */
  async updateUniversityOptions(countryId) {
    const universitySelect = document.getElementById('user-university-filter');
    if (!universitySelect) return;
    
    // Opción por defecto
    let options = `<option value="">Todas las universidades</option>`;
    
    if (countryId) {
      try {
        // Cargar universidades del país seleccionado
        const response = await this.api.get(`/paises/${countryId}/universidades`);
        
        if (response.success && response.data.length > 0) {
          this.universities = response.data;
          
          // Añadir opciones de universidades
          this.universities.forEach(univ => {
            options += `<option value="${univ.id_universidad}">${univ.nom_universidad}</option>`;
          });
        }
      } catch (error) {
        console.error('Error al obtener universidades:', error);
      }
    }
    
    universitySelect.innerHTML = options;
  }
  
  /**
   * Carga datos de usuarios desde la API
   */
  async loadUserData() {
    try {
      // Mostrar indicador de carga
      this.ui.updateTable('users-table', [], null, 'Cargando usuarios...');
      
      // Obtener usuarios
      const response = await this.api.get('/usuarios/usuarios');
      let users = [];
      
      if (response && response.length > 0) {
        users = response;
      } else if (response && response.data && response.data.length > 0) {
        users = response.data;
      } else {
        console.warn('La respuesta de usuarios tiene un formato inesperado:', response);
        users = [];
      }
      
      // Enriquecer con datos de perfiles y suscripciones
      this.users = await this.enrichUsersWithCompleteData(users);
      
      // Calcular estadísticas
      this.calculateUserStats();
      
      // Aplicar filtros iniciales - mostrar todos los usuarios automáticamente
      this.applyFilters();
      
      // Inicializar gráficos
      this.initCharts();
      
      return true;
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.ui.showErrorMessage('Error al cargar usuarios', 'No se pudieron obtener los datos de usuarios.');
      return false;
    }
  }
  
/**
 * Enriquece los datos de usuarios con información completa
 * @param {Array} users - Usuarios básicos
 * @returns {Promise<Array>} Usuarios con datos adicionales
 */
async enrichUsersWithCompleteData(users) {
  try {
    // Lista para usuarios enriquecidos
    const enrichedUsers = [];
    
    // Caché de detalles de usuarios para evitar peticiones duplicadas
    const userDetailsCache = {};
    
    // Procesar cada usuario en paralelo para mejor rendimiento
    const enrichPromises = users.map(async (user) => {
      try {
        // Verificar si ya tenemos datos enriquecidos para este usuario
        const cachedUser = this.users.find(u => u.id_user === user.id_user);
        if (cachedUser) {
          console.log(`Reutilizando datos en caché para usuario ${user.id_user}`);
          return cachedUser;
        }
        
        // Si no está en caché, obtener detalles
        let userDetails = null;
        
        // Verificar si ya consultamos este usuario en esta sesión
        if (userDetailsCache[user.id_user]) {
          userDetails = userDetailsCache[user.id_user];
        } else {
          try {
            // Esta es la API que usa el modal y que SÍ incluye last_login
            const detailResponse = await this.api.get(`/perfil/detail/${user.id_user}`);
            
            if (detailResponse.success && detailResponse.data) {
              userDetails = detailResponse.data;
              
              // Guardar en caché para evitar peticiones repetidas
              userDetailsCache[user.id_user] = userDetails;
              
              // Si obtenemos los detalles, actualizar last_login desde userDetails.usuario
              if (userDetails.usuario && userDetails.usuario.last_login) {
                user.last_login = userDetails.usuario.last_login;
              }
            }
          } catch (detailError) {
            console.warn(`No se pudo obtener detalles completos para usuario ${user.id_user}`);
          }
        }
        
        // Obtener perfil con universidad
        let perfil = null;
        try {
          const perfilResponse = await this.api.get(`/perfil/with-university/${user.id_user}`);
          if (perfilResponse.success && perfilResponse.data) {
            perfil = perfilResponse.data;
          }
        } catch (perfilError) {
          if (perfilError.message && perfilError.message.includes('404')) {
            console.info(`Usuario ${user.id_user} no tiene perfil asociado`);
          } else {
            console.warn(`Error inesperado al obtener perfil del usuario ${user.id_user}:`, perfilError);
          }
        }
        
        // Obtener suscripciones
        let subscriptions = [];
        try {
          const subsResponse = await this.api.get(`/payment/user/subscriptions/${user.id_user}`);
          if (subsResponse.success && subsResponse.data) {
            subscriptions = subsResponse.data;
          } else if (Array.isArray(subsResponse)) {
            subscriptions = subsResponse;
          }
        } catch (subsError) {
          console.warn(`No se pudo obtener suscripciones del usuario ${user.id_user}:`, subsError);
        }
        
        // Obtener transacciones
        let transactions = [];
        try {
          const transResponse = await this.api.get(`/payment/user/transactions/${user.id_user}`);
          if (transResponse.success && transResponse.data) {
            transactions = transResponse.data;
          } else if (Array.isArray(transResponse)) {
            transactions = transResponse;
          }
        } catch (transError) {
          console.warn(`No se pudo obtener transacciones del usuario ${user.id_user}:`, transError);
        }
        
        // CORRECCIÓN: Calcular gasto total priorizando amount_eur
        const totalSpend = transactions.reduce((sum, trans) => {
          // Priorizar el uso de amount_eur si está disponible
          if (trans.amount_eur !== undefined && trans.amount_eur !== null) {
            return sum + this.normalizeAmount(trans.amount_eur);
          }
          
          // Si no tiene amount_eur pero tenemos divisa, intentar estimar manualmente
          // (esto es un fallback, idealmente todos deberían tener amount_eur)
          if (trans.currency_code && trans.currency_code !== 'EUR' && trans.exchange_rate) {
            return sum + (this.normalizeAmount(trans.amount) * trans.exchange_rate);
          }
          
          // Si no hay más información, asumimos que amount ya está en EUR
          return sum + this.normalizeAmount(trans.amount);
        }, 0);
      
        // Añadir usuario enriquecido - usando last_login obtenido de perfil/detail
        return {
          ...user,
          nombre: perfil?.nombre || (userDetails?.perfil?.nombre || ''),
          apellido: perfil?.apellido || (userDetails?.perfil?.apellido || ''),
          universidad: perfil?.nom_universidad || '',
          pais: perfil?.nombre_pais || '',
          id_pais: perfil?.id_pais,
          id_universidad: perfil?.id_universidad,
          // Fechas correctas
          fecha_registro: user.created_at || new Date(),
          created_at: user.created_at || new Date(),
          // CLAVE: Usar el last_login obtenido de perfil/detail
          last_login: user.last_login || (userDetails?.usuario?.last_login || null),
          perfil: perfil || userDetails?.perfil || null,
          subscriptions,
          transactions,
          stats: {
            totalSpend,
            subscriptionsCount: subscriptions.length,
            transactionsCount: transactions.length,
            activeSubscriptions: subscriptions.filter(sub => sub.status === 'active').length,
            lastTransaction: transactions.length > 0 ? 
              transactions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] : null,
            lastAccess: user.last_login ? new Date(user.last_login) : null
          }
        };
      } catch (userError) {
        console.error(`Error procesando usuario ${user.id_user}:`, userError);
        // Devolver usuario con datos mínimos
        return {
          ...user,
          nombre: '',
          apellido: '',
          universidad: '',
          pais: '',
          fecha_registro: user.created_at || new Date(),
          subscriptions: [],
          transactions: [],
          stats: {
            totalSpend: 0,
            subscriptionsCount: 0,
            transactionsCount: 0,
            activeSubscriptions: 0,
            lastAccess: null
          }
        };
      }
    });
    
    // Esperar a que todos los usuarios sean procesados
    const results = await Promise.allSettled(enrichPromises);
    
    // Filtrar solo los resultados exitosos
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        enrichedUsers.push(result.value);
      }
    });
    
    return enrichedUsers;
  } catch (error) {
    console.error('Error al enriquecer datos de usuarios:', error);
    return users;
  }
}
  
/**
 * Determina la fecha del último acceso de un usuario
 * @param {Object} user - Usuario
 * @returns {Date} Fecha del último acceso
 */
getLastAccess(user) {
  // Quitar logs excesivos
  
  // 1. Si el usuario tiene last_login directamente
  if (user.last_login) {
    return new Date(user.last_login);
  }
  
  // 2. Si el usuario tiene estructura anidada como en el modal
  if (user.usuario && user.usuario.last_login) {
    return new Date(user.usuario.last_login);
  }
  
  // 3. Si tiene la versión en español
  if (user.ultimo_login) {
    return new Date(user.ultimo_login);
  }
  
  // 4. Si tiene la versión anidada en español
  if (user.usuario && user.usuario.ultimo_login) {
    return new Date(user.usuario.ultimo_login);
  }
  
  // Si no hay nada, retornar null
  return null;
}
  
  /**
   * Normaliza una cantidad monetaria
   * @param {number|string} amount - Cantidad a normalizar
   * @returns {number} Cantidad normalizada
   */
  normalizeAmount(amount) {
    if (!amount) return 0;
    
    // Si es string, convertir a número
    if (typeof amount === 'string') {
      // Si no tiene punto decimal, asumir que está en centavos
      if (!amount.includes('.')) {
        return parseInt(amount) / 100;
      }
      return parseFloat(amount);
    }
    
    return amount;
  }
  
  /**
   * Calcula estadísticas globales de usuarios
   */
  calculateUserStats() {
    // Reiniciar estadísticas
    this.userCountryStats = {};
    this.userProductStats = {};
    
    // Procesar cada usuario
    this.users.forEach(user => {
      // Calcular estadísticas por país
      if (user.pais) {
        if (!this.userCountryStats[user.pais]) {
          this.userCountryStats[user.pais] = {
            name: user.pais,
            id: user.id_pais,
            count: 0,
            totalSpend: 0,
            usersWithSubscriptions: 0
          };
        }
        
        this.userCountryStats[user.pais].count++;
        this.userCountryStats[user.pais].totalSpend += user.stats.totalSpend;
        
        if (user.stats.activeSubscriptions > 0) {
          this.userCountryStats[user.pais].usersWithSubscriptions++;
        }
      }
      
      // CORRECCIÓN: Calcular estadísticas por producto usando amount_eur cuando sea posible
      if (user.subscriptions && user.subscriptions.length > 0) {
        user.subscriptions.forEach(sub => {
          const productId = sub.product_id;
          const productName = sub.product_name || `Producto ${productId}`;
          
          if (!this.userProductStats[productId]) {
            this.userProductStats[productId] = {
              id: productId,
              name: productName,
              count: 0,
              activeCount: 0,
              totalRevenue: 0
            };
          }
          
          this.userProductStats[productId].count++;
          
          if (sub.status === 'active') {
            this.userProductStats[productId].activeCount++;
          }
          
          // CORRECCIÓN: Añadir ingresos del producto priorizando amount_eur
          const transactions = user.transactions.filter(t => t.product_id == productId);
          transactions.forEach(trans => {
            // Priorizar amount_eur
            if (trans.amount_eur !== undefined && trans.amount_eur !== null) {
              this.userProductStats[productId].totalRevenue += this.normalizeAmount(trans.amount_eur);
            }
            // Fallback a conversión manual
            else if (trans.currency_code && trans.currency_code !== 'EUR' && trans.exchange_rate) {
              const convertedAmount = this.normalizeAmount(trans.amount) * trans.exchange_rate;
              this.userProductStats[productId].totalRevenue += convertedAmount;
            }
            // Si no hay más información, asumir que amount ya está en EUR
            else {
              this.userProductStats[productId].totalRevenue += this.normalizeAmount(trans.amount);
            }
          });
        });
      }
    });
  }
  
/**
 * Actualiza la tabla de usuarios con los datos filtrados
 */
updateUsersTable() {
  // Calcular índices de paginación
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredUsers.length);
  
  // Obtener datos de la página actual
  const pageData = this.filteredUsers.slice(startIndex, endIndex);
  
  // DEBUG
  if (pageData.length > 0) {
    console.log('TABLA - Ejemplo de usuario:', pageData[0]);
    console.log('TABLA - ¿Tiene last_login?', !!pageData[0].last_login);
    console.log('TABLA - Valor de last_login:', pageData[0].last_login);
  }
  
  // Renderizar tabla
  this.ui.updateTable('users-table', pageData, (user) => {
    // Formatear last_login - asegurarnos de convertirlo a Date si es string
    let lastLoginDate = null;
    if (user.last_login) {
      lastLoginDate = user.last_login instanceof Date ? 
                    user.last_login : 
                    new Date(user.last_login);
    }
    
    // Formatear suscripciones
    let subscriptionsDisplay;
    if (user.stats.subscriptionsCount === 0) {
      subscriptionsDisplay = '0';
    } else if (user.stats.activeSubscriptions === user.stats.subscriptionsCount) {
      // Si todas las suscripciones están activas, mostrar solo un número
      subscriptionsDisplay = `${user.stats.activeSubscriptions}`;
    } else {
      // Si hay diferencia entre activas y total, mostrar ambos números
      subscriptionsDisplay = `${user.stats.activeSubscriptions} / ${user.stats.subscriptionsCount}`;
    }
    
    // CORRECCIÓN: Explícitamente indicar EUR en el formateo de currency para el gasto total
    return `
      <td>${user.id_user}</td>
      <td>${user.correo}</td>
      <td>${formatUserName(user)}</td>
      <td>${formatDate(user.created_at || user.fecha_registro || new Date(), 'short')}</td>
      <td>${subscriptionsDisplay}</td>
      <td>${formatCurrency(user.stats.totalSpend, 'EUR')}</td>
      <td>${lastLoginDate ? formatDate(lastLoginDate, 'short') : 'No disponible'}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary user-action" data-action="view" data-id="${user.id_user}">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-info user-action" data-action="subscriptions" data-id="${user.id_user}">
            <i class="bi bi-card-checklist"></i>
          </button>
          <button class="btn btn-sm btn-outline-warning user-action" data-action="transactions" data-id="${user.id_user}">
            <i class="bi bi-credit-card"></i>
          </button>
        </div>
      </td>
    `;
  });
  
  // Configurar botones de acción
  this.setupActionButtons();
  
  // Actualizar paginación
  this.ui.updatePagination('user', startIndex + 1, endIndex, this.filteredUsers.length);
  
  // Actualizar estado de botones de paginación
  const prevButton = document.getElementById('user-prev-page');
  const nextButton = document.getElementById('user-next-page');
  
  if (prevButton) {
    prevButton.disabled = this.currentPage === 1;
  }
  
  if (nextButton) {
    const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    nextButton.disabled = this.currentPage >= totalPages;
  }
}
  
  /**
   * Configura los botones de acción en la tabla
   */
  setupActionButtons() {
    const actionButtons = document.querySelectorAll('.user-action');
    
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = button.getAttribute('data-action');
        const userId = button.getAttribute('data-id');
        
        // Manejar acciones
        switch (action) {
          case 'view':
            this.viewUserDetails(userId);
            break;
          case 'subscriptions':
            this.viewUserSubscriptions(userId);
            break;
          case 'transactions':
            this.viewUserTransactions(userId);
            break;
        }
      });
    });
  }
  
/**
 * Muestra detalles de un usuario
 * @param {string} userId - ID del usuario
 */
async viewUserDetails(userId) {
  try {
    // Mostrar loader
    this.ui.showLoading('Cargando detalles de usuario...');
    
    // Obtener detalles completos del perfil
    let userDetails = null;
    try {
      const response = await this.api.get(`/perfil/detail/${userId}`);
      
      if (response.success && response.data) {
        userDetails = response.data;
        
        // DEBUG: Ver estructura exacta recibida del modal
        console.log('ESTRUCTURA EXACTA MODAL:', JSON.stringify(userDetails, null, 2));
      }
    } catch (error) {
      console.error('Error al obtener detalles del usuario:', error);
    }
    
    // Si no tenemos detalles, al menos intentar conseguir info básica del usuario
    if (!userDetails) {
      try {
        const basicUserResponse = await this.api.get(`/usuarios/usuarios/${userId}`);
        if (basicUserResponse) {
          // Crear estructura básica con datos mínimos
          userDetails = {
            usuario: basicUserResponse,
            perfil: null,
            suscripciones: { activas: [], total: 0 },
            transacciones: { recientes: [], total: 0 }
          };
        }
      } catch (basicError) {
        console.error('No se pudo obtener datos básicos:', basicError);
      }
    }
    
    // Ocultar loader
    this.ui.hideLoading();
    
    // Si no tenemos datos, mostrar mensaje
    if (!userDetails) {
      this.ui.showErrorMessage('Información no disponible', 'No se pudieron cargar los detalles del usuario.');
      return;
    }
    
    // En caso de que userDetails exista pero usuario sea null
    if (!userDetails.usuario) {
      userDetails.usuario = { id_user: userId };
    }
    
    // Verificar si ya existe un modal
    let modalElement = document.getElementById('userDetailsModal');
    
    if (!modalElement) {
      // Crear modal si no existe
      const modalHTML = `
        <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Detalles del Usuario</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body" id="userDetailsContent">
                <!-- El contenido se cargará dinámicamente -->
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Añadir modal al DOM
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      modalElement = document.getElementById('userDetailsModal');
    }
    
    // DEBUG: Ver exactamente qué se pasa a getLastAccess
    const user = userDetails.usuario || {};
    console.log('MODAL - usuario pasado a getLastAccess:', user);
    
    // Determinar último acceso: usar last_login si existe, o calcular uno basado en otras propiedades
    const lastAccess = this.getLastAccess(user);
    console.log('MODAL - lastAccess obtenido:', lastAccess);

    // Actualizar contenido del modal
    const modalContent = document.getElementById('userDetailsContent');
    
    if (modalContent) {
      // Obtener datos seguros para el modal (con valores por defecto)
      const user = userDetails.usuario || {};
      const perfil = userDetails.perfil || {};
      const suscripciones = userDetails.suscripciones || { activas: [], total: 0 };
      const transacciones = userDetails.transacciones || { recientes: [], total: 0 };
      
      // Determinar último acceso: usar last_login si existe, o calcular uno basado en otras propiedades
      const lastAccess = this.getLastAccess(user);
      
      // CORRECCIÓN: Convertir los montos de transacciones a EUR en el modal
      // Procesamos las transacciones para asegurarnos que usamos valores en EUR
      if (transacciones.recientes && transacciones.recientes.length > 0) {
        transacciones.recientes.forEach(trans => {
          // Si hay amount_eur, usarlo directamente
          if (trans.amount_eur !== undefined && trans.amount_eur !== null) {
            trans._displayAmount = this.normalizeAmount(trans.amount_eur);
          }
          // Si hay tasa de cambio, convertir manualmente
          else if (trans.currency_code && trans.currency_code !== 'EUR' && trans.exchange_rate) {
            trans._displayAmount = this.normalizeAmount(trans.amount) * trans.exchange_rate;
          }
          // Si no hay información de conversión, usar amount directamente
          else {
            trans._displayAmount = this.normalizeAmount(trans.amount);
          }
        });
      }
      
      // Generar HTML para el modal con verificación de datos null/undefined
      modalContent.innerHTML = `
        <div class="user-details">
          <div class="row">
            <div class="col-md-6">
              <h6 class="fw-bold">Información básica</h6>
              <div class="mb-3">
                <p><strong>ID:</strong> ${user.id_user || userId || 'No disponible'}</p>
                <p><strong>Correo:</strong> ${user.correo || 'No disponible'}</p>
                <p><strong>Nombre:</strong> ${perfil.nombre || 'No especificado'} ${perfil.apellido || ''}</p>
                <p><strong>Fecha Registro:</strong> ${formatDate(user.fecha_registro || user.created_at || new Date(), 'full')}</p>
                <p><strong>Último Acceso:</strong> ${formatDate(lastAccess, 'full')}</p>
              </div>
            </div>
            <div class="col-md-6">
              <h6 class="fw-bold">Información académica</h6>
              <div class="mb-3">
                <p><strong>Universidad:</strong> ${perfil.nom_universidad || 'No especificada'}</p>
                <p><strong>País:</strong> ${perfil.nombre_pais || 'No especificado'}</p>
              </div>
            </div>
          </div>
          
          <div class="row mt-3">
            <div class="col-12">
              <h6 class="fw-bold">Suscripciones (${suscripciones.total || 0})</h6>
              ${suscripciones.activas && suscripciones.activas.length > 0 ? `
                <div class="table-container">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Producto</th>
                        <th>Estado</th>
                        <th>Próximo Cobro</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${suscripciones.activas.map(sub => `
                        <tr>
                          <td>${sub.subscription_id || sub.id || 'N/A'}</td>
                          <td>${sub.carrera_nombre || sub.product_name || 'N/A'}</td>
                          <td><span class="badge bg-success">Activa</span></td>
                          <td>${sub.next_billed_at ? formatDate(sub.next_billed_at, 'short') : 'N/A'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p>No hay suscripciones activas para este usuario</p>'}
            </div>
          </div>
          
          <div class="row mt-3">
            <div class="col-12">
              <h6 class="fw-bold">Transacciones recientes (${transacciones.total || 0})</h6>
              ${transacciones.recientes && transacciones.recientes.length > 0 ? `
                <div class="table-container">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${transacciones.recientes.slice(0, 5).map(trans => `
                        <tr>
                          <td>${trans.transaction_id || 'N/A'}</td>
                          <td>${trans.updated_at ? formatDate(trans.updated_at, 'short') : 'N/A'}</td>
                          <td>${trans.product_name || 'N/A'}</td>
                          <td>${formatCurrency(trans._displayAmount || this.normalizeAmount(trans.amount_eur || trans.amount), 'EUR')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p>No hay transacciones recientes para este usuario</p>'}
            </div>
          </div>
        </div>
      `;
    }
    
    // Mostrar modal
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
// Solución para el problema de accesibilidad con aria-hidden
// Usar una función con nombre para poder eliminarla correctamente
const handleModalHidden = function() {
  // Enfocar un elemento fuera del modal (por ejemplo, el body)
  document.body.focus();
  // Eliminar este evento correctamente
  modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
};

// Añadir el event listener con la función nombrada
modalElement.addEventListener('hidden.bs.modal', handleModalHidden);
    
  } catch (error) {
    this.ui.hideLoading();
    console.error('Error al obtener detalles del usuario:', error);
    this.ui.showErrorMessage('Error', 'No se pudieron cargar los detalles del usuario');
  }
}
  
  /**
   * Muestra las suscripciones de un usuario
   * @param {string} userId - ID del usuario
   */
  viewUserSubscriptions(userId) {
    // Emitir evento para filtrar suscripciones por usuario
    this.eventBus.emit('showSubscriptionsByUser', { userId });
    
    // Cambiar a la sección de suscripciones
    const subscriptionsLink = document.querySelector(`.nav-link[data-section="subscriptions"]`);
    if (subscriptionsLink) {
      subscriptionsLink.click();
    }
  }
  
  /**
   * Muestra las transacciones de un usuario
   * @param {string} userId - ID del usuario
   */
  viewUserTransactions(userId) {
    // Emitir evento para filtrar transacciones por usuario
    this.eventBus.emit('showTransactionsByUser', { userId });
    
    // Cambiar a la sección de transacciones
    const transactionsLink = document.querySelector(`.nav-link[data-section="transactions"]`);
    if (transactionsLink) {
      transactionsLink.click();
    }
  }
  
/**
 * Aplica filtros a los usuarios
 */
applyFilters() {
  // Verificar que estamos en la sección correcta
  if (this.currentSection !== 'users') {
    console.warn('Intentando aplicar filtros de usuarios fuera de la sección de usuarios');
    return;
  }

  // Obtener valores de filtros
  const subscriptionFilter = document.getElementById('user-subscription-filter')?.value || '';
  const countryFilter = document.getElementById('user-country-filter')?.value || '';
  const universityFilter = document.getElementById('user-university-filter')?.value || '';
  const searchFilter = document.getElementById('user-search')?.value || '';
  
  console.log('Aplicando filtros en sección de usuarios:', {
    subscription: subscriptionFilter,
    country: countryFilter,
    university: universityFilter,
    search: searchFilter
  });
  
  // Actualizar configuración de filtros
  this.filterSettings = {
    subscription: subscriptionFilter,
    country: countryFilter,
    university: universityFilter,
    search: searchFilter
  };
  
  // Resetear paginación
  this.currentPage = 1;
  
  // Verificar que tenemos datos para filtrar
  if (!this.users || this.users.length === 0) {
    console.warn('No hay usuarios para filtrar');
    this.filteredUsers = [];
    this.updateUsersTable();
    return;
  }
  
  // Aplicar filtros
  this.filteredUsers = this.users.filter(user => {
    
    // Filtro por suscripción (con/sin)
    if (subscriptionFilter) {
      const hasActiveSubs = user.stats.activeSubscriptions > 0;
      
      if ((subscriptionFilter === 'with' && !hasActiveSubs) ||
          (subscriptionFilter === 'without' && hasActiveSubs)) {
        return false;
      }
    }
    
    // Filtro por país
    if (countryFilter && (!user.id_pais || user.id_pais != countryFilter)) {
      return false;
    }
    
    // Filtro por universidad
    if (universityFilter && (!user.id_universidad || user.id_universidad != universityFilter)) {
      return false;
    }
    
    // Filtro por búsqueda (ID, correo, nombre o apellido)
    if (searchFilter) {
      const searchTerm = searchFilter.toLowerCase();
      
      // Buscar en varios campos
      const matchesId = user.id_user?.toString().includes(searchTerm);
      const matchesEmail = user.correo?.toLowerCase().includes(searchTerm);
      const matchesName = 
        (user.nombre && user.nombre.toLowerCase().includes(searchTerm)) ||
        (user.apellido && user.apellido.toLowerCase().includes(searchTerm));
      
      if (!matchesId && !matchesEmail && !matchesName) {
        return false;
      }
    }
    
    return true;
  });
  
  console.log(`Filtrado completado: ${this.filteredUsers.length} de ${this.users.length} usuarios`);
  
  // Ordenar por fecha de registro (más recientes primero)
  this.filteredUsers.sort((a, b) => {
    const dateA = new Date(a.fecha_registro || a.created_at || 0);
    const dateB = new Date(b.fecha_registro || b.created_at || 0);
    return dateB - dateA;
  });
  
  // Actualizar tabla
  this.updateUsersTable();
  
  // Actualizar gráficos
  this.updateCharts();
  this.updateResetButtonVisibility();
}
  
/**
 * Inicializa los gráficos del módulo
 */
initCharts() {
  if (!this.users || this.users.length === 0) return;
  
  // Destruir gráficos existentes para evitar errores
  this.destroyCharts();
  
  // Inicializar gráfico de países
  this.initCountryChart();
  
  // Inicializar gráfico de productos
  this.initProductChart();
}

/**
 * Destruye los gráficos existentes para evitar errores de duplicidad
 */
destroyCharts() {
  // Destruir gráfico de países si existe
  if (this.charts && this.charts.country) {
    this.charts.country.destroy();
    this.charts.country = null;
  }
  
  // Destruir gráfico de productos si existe
  if (this.charts && this.charts.product) {
    this.charts.product.destroy();
    this.charts.product = null;
  }
}

  
  /**
 * Inicializa el gráfico de usuarios por país
 */
initCountryChart() {
  const ctx = document.getElementById('users-country-chart');
  if (!ctx) return;
  
  // Asegurarnos de que cualquier gráfico previo en este canvas sea destruido
  Chart.getChart(ctx)?.destroy();
  
  // Convertir estadísticas a array y ordenar
  const countryData = Object.values(this.userCountryStats)
    .sort((a, b) => b.count - a.count);
  
  // Si no hay datos o está vacío, mostrar mensaje
  if (!countryData || countryData.length === 0) {
    this.charts.country = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Usuarios',
          data: [0],
          backgroundColor: '#6c757d'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    return;
  }
    
    // Limitar a los 10 principales países
    const topCountries = countryData.slice(0, 10);
    
    // Preparar datos para el gráfico
    const labels = topCountries.map(c => c.name);
    const userData = topCountries.map(c => c.count);
    const subscriptionData = topCountries.map(c => c.usersWithSubscriptions);
    
    // Crear configuración
    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Usuarios',
            data: userData,
            backgroundColor: '#656d4a'
          },
          {
            label: 'Con Suscripción',
            data: subscriptionData,
            backgroundColor: '#582f0e'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: false,
            grid: {
              display: false
            }
          },
          y: {
            stacked: false,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };
    
    // Crear gráfico
    this.charts.country = new Chart(ctx, config);
  }
  
  /**
   * Inicializa el gráfico de usuarios por producto
   */
  initProductChart() {
    const ctx = document.getElementById('users-product-chart');
    if (!ctx) return;

    Chart.getChart(ctx)?.destroy();
    
    // Convertir estadísticas a array y ordenar
    const productData = Object.values(this.userProductStats)
      .sort((a, b) => b.count - a.count);
    
    // Si no hay datos o está vacío, mostrar mensaje
    if (!productData || productData.length === 0) {
      this.charts.product = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: ['#6c757d']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      return;
    }
    
    // Limitar a los 5 principales productos
    const topProducts = productData.slice(0, 5);
    
    // Preparar datos para el gráfico
    const labels = topProducts.map(p => p.name);
    const userData = topProducts.map(p => p.count);
    const colors = [
      '#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90'
    ];
    
    // CORRECCIÓN: Actualizar el tooltip para mostrar claramente que los montos están en EUR
    const config = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: userData,
            backgroundColor: colors
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const product = topProducts[context.dataIndex];
                const count = context.raw;
                const active = product.activeCount;
                const percent = Math.round((count / productData.reduce((sum, p) => sum + p.count, 0)) * 100);
                
                return [
                  `Total: ${count} usuarios (${percent}%)`,
                  `Activos: ${active} usuarios`,
                  `Ingresos: ${formatCurrency(product.totalRevenue, 'EUR')}`
                ];
              }
            }
          }
        }
      }
    };
    
    // Crear gráfico
    this.charts.product = new Chart(ctx, config);
  }
  
  /**
   * Actualiza los gráficos con datos filtrados
   */
  updateCharts() {
    // Si no hay gráficos inicializados, crearlos
    if (!this.charts.country || !this.charts.product) {
      this.initCharts();
      return;
    }
    
    // Recalcular estadísticas para usuarios filtrados
    const filteredCountryStats = {};
    const filteredProductStats = {};
    
    // Procesar solo los usuarios filtrados
    this.filteredUsers.forEach(user => {
      // Estadísticas por país
      if (user.pais) {
        if (!filteredCountryStats[user.pais]) {
          filteredCountryStats[user.pais] = {
            name: user.pais,
            count: 0,
            usersWithSubscriptions: 0
          };
        }
        
        filteredCountryStats[user.pais].count++;
        
        if (user.stats.activeSubscriptions > 0) {
          filteredCountryStats[user.pais].usersWithSubscriptions++;
        }
      }
      
      // Estadísticas por producto
      if (user.subscriptions && user.subscriptions.length > 0) {
        user.subscriptions.forEach(sub => {
          const productId = sub.product_id;
          const productName = sub.product_name || `Producto ${productId}`;
          
          if (!filteredProductStats[productId]) {
            filteredProductStats[productId] = {
              id: productId,
              name: productName,
              count: 0,
              activeCount: 0
            };
          }
          
          filteredProductStats[productId].count++;
          
          if (sub.status === 'active') {
            filteredProductStats[productId].activeCount++;
          }
        });
      }
    });
    
    // Actualizar gráfico de países
    this.updateCountryChart(filteredCountryStats);
    
    // Actualizar gráfico de productos
    this.updateProductChart(filteredProductStats);
  }
  
  /**
   * Actualiza el gráfico de usuarios por país
   * @param {Object} countryStats - Estadísticas por país
   */
  updateCountryChart(countryStats) {
    if (!this.charts.country) return;
    
    // Convertir estadísticas a array y ordenar
    const countryData = Object.values(countryStats)
      .sort((a, b) => b.count - a.count);
    
    // Si no hay datos, mostrar mensaje
    if (countryData.length === 0) {
      this.charts.country.data.labels = ['Sin datos'];
      this.charts.country.data.datasets[0].data = [0];
      this.charts.country.data.datasets[0].backgroundColor = '#6c757d';
      this.charts.country.data.datasets.splice(1, 1); // Eliminar segundo dataset si existe
      this.charts.country.update();
      return;
    }
    
    // Limitar a los 10 principales países
    const topCountries = countryData.slice(0, 10);
    
    // Preparar datos para el gráfico
    const labels = topCountries.map(c => c.name);
    const userData = topCountries.map(c => c.count);
    const subscriptionData = topCountries.map(c => c.usersWithSubscriptions);
    
    // Actualizar datos
    this.charts.country.data.labels = labels;
    this.charts.country.data.datasets[0].data = userData;
    
    // Asegurar que existen dos datasets
    if (this.charts.country.data.datasets.length < 2) {
      this.charts.country.data.datasets.push({
        label: 'Con Suscripción',
        data: subscriptionData,
        backgroundColor: '#582f0e'
      });
    } else {
      this.charts.country.data.datasets[1].data = subscriptionData;
    }
    
    // Actualizar gráfico
    this.charts.country.update();
  }
  
  /**
   * Actualiza el gráfico de usuarios por producto
   * @param {Object} productStats - Estadísticas por producto
   */
  updateProductChart(productStats) {
    if (!this.charts.product) return;
    
    // Convertir estadísticas a array y ordenar
    const productData = Object.values(productStats)
      .sort((a, b) => b.count - a.count);
    
    // Si no hay datos, mostrar mensaje
    if (productData.length === 0) {
      this.charts.product.data.labels = ['Sin datos'];
      this.charts.product.data.datasets[0].data = [1];
      this.charts.product.data.datasets[0].backgroundColor = ['#6c757d'];
      this.charts.product.update();
      return;
    }
    
    // Limitar a los 5 principales productos
    const topProducts = productData.slice(0, 5);
    
    // Preparar datos para el gráfico
    const labels = topProducts.map(p => p.name);
    const userData = topProducts.map(p => p.count);
    const colors = [
      '#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90'
    ].slice(0, topProducts.length);
    
    // Actualizar datos
    this.charts.product.data.labels = labels;
    this.charts.product.data.datasets[0].data = userData;
    this.charts.product.data.datasets[0].backgroundColor = colors;
    
    // Actualizar gráfico
    this.charts.product.update();
  }
  
  /**
   * Redimensiona los gráficos
   */
  resizeCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }
  
  /**
   * Refresca los datos de usuarios
   */
  async refreshUsers() {
    // Limpiar caché para obtener datos frescos
    this.api.clearCache('users');
    
    // Mostrar indicador de carga
    this.ui.showLoading('Actualizando datos de usuarios...');
    
    // Recargar datos
    await this.loadUserData();
    
    // Ocultar indicador de carga
    this.ui.hideLoading();
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage('Datos actualizados correctamente');
  }
  
/**
 * Exporta los datos de usuarios con formato avanzado y ajuste forzado al ancho de página
 */
exportUsers() {
  try {
    // Obtener formato seleccionado o usar formato preferido del usuario
    const selectedFormat = document.getElementById('export-format')?.value;
    const format = selectedFormat || exportManager.getPreferredFormat('excel');
    
    console.log(`Exportando usuarios en formato: ${format}`);
    
    // Datos a exportar - asegurarse que los valores numéricos sean números
    const data = this.filteredUsers.map(user => {
      return {
        'ID': user.id_user,
        'Correo': user.correo,
        'Nombre': user.nombre || '',
        'Apellido': user.apellido || '',
        'País': user.pais || '',
        'Universidad': user.universidad || '',
        'Registro': formatDate(user.fecha_registro || new Date(), 'YYYY-MM-DD'),
        'Suscripciones Activas': Number(user.stats.activeSubscriptions || 0),
        'Total Suscripciones': Number(user.stats.subscriptionsCount || 0),
        'Transacciones': Number(user.stats.transactionsCount || 0),
        'Gasto Total (EUR)': Number(user.stats.totalSpend || 0),
        'Último Acceso': formatDate(user.stats.lastAccess, 'YYYY-MM-DD HH:mm')
      };
    });
    
    // Identificar usuarios inactivos (que tenían suscripciones pero ahora no tienen activas)
    const inactiveUsers = data.filter(user => 
      user['Total Suscripciones'] > 0 && user['Suscripciones Activas'] === 0
    );
    
    // Calcular estadísticas para el resumen
    const totalUsers = data.length;
    const inactiveCount = inactiveUsers.length;
    const inactivePercentage = totalUsers > 0 ? ((inactiveCount / totalUsers) * 100).toFixed(2) : 0;
    
    // Calcular gasto total de usuarios inactivos
    const inactiveSpend = inactiveUsers.reduce((sum, user) => sum + user['Gasto Total (EUR)'], 0);
    
    // Calcular transacciones totales de usuarios inactivos
    const inactiveTransactions = inactiveUsers.reduce((sum, user) => sum + user['Transacciones'], 0);
    
    // Calcular promedio de gasto por usuario inactivo
    const avgInactiveSpend = inactiveCount > 0 ? (inactiveSpend / inactiveCount).toFixed(2) : 0;
    
    // Título con posible rango de fechas
    let title = 'Reporte de Usuarios';
    let dateRangeInfo = '';
    
    if (this.filterSettings?.startDate && this.filterSettings?.endDate) {
      const startDate = new Date(this.filterSettings.startDate).toLocaleDateString();
      const endDate = new Date(this.filterSettings.endDate).toLocaleDateString();
      dateRangeInfo = ` (${startDate} - ${endDate})`;
      title += dateRangeInfo;
    }
    
    // Nombre del archivo
    const fileName = `usuarios_${new Date().toISOString().slice(0, 10)}`;
    
    // Columnas que deben tener totales
    const columnsWithTotals = ['Suscripciones Activas', 'Transacciones', 'Gasto Total (EUR)'];
    
    // Opciones específicas para formato PDF
    const pdfOptions = {
      pdf: {
        // Usar A4 para PDF para más espacio horizontal
        pageSize: 'A4',
        orientation: 'landscape',
        // Activar la optimización para tablas anchas
        optimizeForWideTables: true,
        // Usar reducción agresiva de fuente
        fontSizeReduction: 'large',
        // Activar compresión
        compressImages: true,
        // CLAVE: Forzar ajuste a página
        fitToPage: true,
        // Márgenes mínimos [izq, sup, der, inf]
        margins: [5, 10, 5, 10]
      }
    };
    
    // Definir anchos explícitos para el cálculo de ajuste forzado
    // Estos valores serán usados como guía pero el algoritmo se asegurará
    // de que todo quepa en la página
    const columnWidths = {
      'ID': 25,
      'Correo': 80,
      'Nombre': 50,
      'Apellido': 50,
      'País': 35,
      'Universidad': 60,
      'Registro': 45,
      'Suscripciones Activas': 40,
      'Total Suscripciones': 40,
      'Transacciones': 40,
      'Gasto Total (EUR)': 50,
      'Último Acceso': 60
    };
    
    // Opciones de truncamiento para PDF
    const truncateOptions = format === 'pdf' ? {
      truncateText: {
        'Correo': 20,
        'Nombre': 10,
        'Apellido': 10,
        'Universidad': 10,
        'Último Acceso': 14
      }
    } : {};
    
    // Opciones de formato para tipos de datos específicos
    const dataFormats = {
      // Formato para moneda
      currencyFormats: {
        'Gasto Total (EUR)': '€#,##0.00'
      },
      // Formato para números enteros
      integerFormats: {
        'Suscripciones Activas': '#,##0',
        'Total Suscripciones': '#,##0',
        'Transacciones': '#,##0'
      }
    };
    
    // Análisis de usuarios inactivos
    const userAnalysis = {
      inactiveUserSummary: {
        count: inactiveCount,
        percentage: inactivePercentage,
        totalSpend: inactiveSpend,
        avgSpend: avgInactiveSpend,
        transactionsCount: inactiveTransactions,
        title: 'ANÁLISIS DE RETENCIÓN DE USUARIOS',
        description: `De los ${totalUsers} usuarios totales, ${inactiveCount} han dejado de usar la plataforma.`
      }
    };
    
    // Exportar con formato avanzado y configuración personalizada
    exportManager.exportData(data, {
      fileName,
      format,
      sheetName: 'Usuarios',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: title,
      columnsWithTotals: columnsWithTotals,
      // Definir anchos de columna como guía
      columnWidths: columnWidths,
      // Integrar todas las opciones de formato
      ...dataFormats,
      // Opciones para resaltar usuarios inactivos
      highlightInactiveUsers: true,
      inactiveUserColor: 'ffebee',
      // Incluir análisis completo
      ...userAnalysis,
      // Opciones de truncamiento de texto para PDF
      ...truncateOptions,
      // Incluir opciones específicas para PDF si es el formato seleccionado
      ...(format === 'pdf' ? pdfOptions : {})
    });
    
    this.ui.showSuccessMessage(`Usuarios exportados correctamente en formato ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error al exportar usuarios:', error);
    this.ui.showErrorMessage('Error al exportar', 'No se pudieron exportar los datos de usuarios.');
  }
}
}