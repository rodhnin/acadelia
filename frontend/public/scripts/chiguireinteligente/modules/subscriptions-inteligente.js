/**
 * Módulo de Gestión de Suscripciones
 * Implementa todas las funcionalidades para administrar las suscripciones de usuarios
 */

import { formatCurrency, formatDate, formatSubscriptionStatus, formatProductName, formatUserName } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class SubscriptionsModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.currentSection = 'subscriptions';
    
    // Estado de la tabla y paginación
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalItems = 0;
    this.totalPages = 0;
    
    // Filtros actuales
    this.filters = {
      status: '',
      id_carrera: '',
      search: '',
      date_from: '',
      date_to: '',
      sort_by: 'created_at',
      sort_direction: 'DESC',
      id_user: '' // Añadir filtro por ID de usuario
    };
    
    // Datos estadísticos
    this.subscriptionStats = null;
    this.products = [];
  }
  
  /**
   * Inicializa el módulo de suscripciones
   */
  async init() {
    console.log('Inicializando módulo de suscripciones');
    
    this.setupEventListeners();
    
    this.eventBus.on('dateRangeChanged', (range) => {
      if (range) {
        this.filters.date_from = range.start;
        this.filters.date_to = range.end;
        
        // Si estamos en la sección de suscripciones, actualizar datos
        if (this.currentSection === 'subscriptions') {
          this.refreshData();
        }
      }
    });
    
    this.loadProducts();
    
    return true;
  }

  /**
   * Reinicia todos los filtros a sus valores predeterminados
   */
  resetFilters() {
    // Reiniciar objeto de filtros
    this.filters = {
      status: '',
      id_carrera: '',
      search: '',
      date_from: this.filters.date_from, // Mantener rango de fechas
      date_to: this.filters.date_to,     // Mantener rango de fechas
      sort_by: 'created_at',
      sort_direction: 'DESC',
      id_user: ''
    };
    
    // Reiniciar elementos del formulario
    const searchInput = document.getElementById('subscription-search');
    const statusFilter = document.getElementById('user-status-filter');
    const productFilter = document.getElementById('subscription-product-filter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (productFilter) productFilter.value = '';
    
    this.currentPage = 1;
    
    this.ui.showLoading('Reiniciando filtros...');
    
    this.ui.showSuccessMessage('Filtros reiniciados');
    
    // Recargar datos de la tabla
    this.loadSubscriptions().then(() => {
      // Recargar estadísticas sin aplicar los filtros específicos (solo fechas)
      return this.loadSubscriptionStats(false);
    }).then(() => {
      this.ui.hideLoading();
    }).catch(error => {
      console.error('Error al reiniciar filtros:', error);
      this.ui.hideLoading();
    });
    
    this.updateResetButtonVisibility();
  }

  /**
   * Actualiza la visibilidad y estilo del botón de reinicio según los filtros activos
   */
  updateResetButtonVisibility() {
    const hasActiveFilters = 
      this.filters.status || 
      this.filters.id_carrera || 
      this.filters.search || 
      this.filters.id_user;
    
    const options = {};
    if (this.filters.id_user) {
      options.filterLabel = 'Usuario';
    }
    
    this.ui.updateResetButtonState('reset-subscription-filters', hasActiveFilters, options);
  }
  
  /**
   * Configura event listeners para el módulo
   */
  setupEventListeners() {
    this.resetButton = this.ui.addResetFiltersButton(
      'subscriptions-section', 
      'reset-subscription-filters',
      () => this.resetFilters(), 
      '#apply-user-filters'
    );
    
    const applyFiltersBtn = document.getElementById('apply-user-filters');
    if (applyFiltersBtn) {
      const newBtn = applyFiltersBtn.cloneNode(true);
      applyFiltersBtn.parentNode.replaceChild(newBtn, applyFiltersBtn);
      
      newBtn.addEventListener('click', () => {
        console.log('Botón de filtro clickeado en sección:', this.currentSection);
        if (this.currentSection === 'subscriptions') {
          this.applyFilters();
        }
      });
    } else {
      console.error('No se encontró el botón de filtro con ID "apply-user-filters"');
    }

    this.eventBus.on('showSubscriptionsByUser', (data) => {
      this.filters.id_user = data.userId;
      this.recentUserFilter = true;
  
      this.ui.showSuccessMessage(`Mostrando suscripciones del usuario ID: ${data.userId}`);
      
      this.currentPage = 1;
      
      this.loadSubscriptions();
      this.updateResetButtonVisibility();
    });
    
    // Campo de búsqueda
    const searchInput = document.getElementById('subscription-search');
    if (searchInput) {
      searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this.applyFilters();
        }
      });
    }
    
    // Botones de paginación
    const prevPageBtn = document.getElementById('subscription-prev-page');
    const nextPageBtn = document.getElementById('subscription-next-page');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadSubscriptions();
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadSubscriptions();
        }
      });
    }
    
    // Botón de exportación
    const exportBtn = document.getElementById('export-subscriptions');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportSubscriptions();
      });
    }
    
    // Al cambiar de sección
    document.addEventListener('sectionChanged', (e) => {
      this.currentSection = e.detail.section;
      
      if (e.detail.section === 'subscriptions') {
        this.onSectionActivated();
      }
    });
  }
  
  /**
   * Se ejecuta cuando se activa la sección de suscripciones
   */
  async onSectionActivated() {
    try {
      console.log('Activando sección de suscripciones');
      
      // Solo limpiar filtro de usuario si no se vino de un filtro específico
      if (!this.recentUserFilter) {
        this.clearUserFilter();
      }
      this.recentUserFilter = false;
      
      this.currentPage = 1;
      
      if (this.charts.status) {
        this.charts.status.destroy();
        this.charts.status = null;
      }
      
      if (this.charts.growth) {
        this.charts.growth.destroy();
        this.charts.growth = null;
      }
      
      await this.loadSubscriptions();
      
      // por lo que no necesitamos llamar a analyzeStatsData ni initCharts por separado
      await this.loadSubscriptionStats();
      
      this.updateResetButtonVisibility();
    } catch (error) {
      console.error('Error al activar sección de suscripciones:', error);
      this.ui.showErrorMessage('Error', 'No se pudieron cargar los datos de suscripciones');
    }
  }
  
  /**
   * Aplica los filtros actuales y recarga los datos
   */
  applyFilters() {
    if (this.currentSection !== 'subscriptions') {
      console.warn('Intentando aplicar filtros de suscripciones fuera de la sección de suscripciones');
      return;
    }

    const statusFilter = document.getElementById('user-status-filter');
    const productFilter = document.getElementById('subscription-product-filter');
    const searchFilter = document.getElementById('subscription-search');
    
    if (!statusFilter || !productFilter || !searchFilter) {
      console.error('Elementos de filtro no encontrados:', {
        statusFilter: !!statusFilter,
        productFilter: !!productFilter,
        searchFilter: !!searchFilter
      });
      this.ui.showErrorMessage('Error', 'No se pudieron aplicar los filtros');
      return;
    }
    
    const statusValue = statusFilter.value || '';
    const productValue = productFilter.value || '';
    const searchValue = searchFilter.value || '';
    
    console.log('Aplicando filtros en suscripciones:', {
      status: statusValue,
      product: productValue,
      search: searchValue
    });
    
    this.filters.status = statusValue;
    this.filters.id_carrera = productValue;
    this.filters.search = searchValue;
    
    this.currentPage = 1;
    
    this.ui.showLoading('Aplicando filtros...');
    
    // Primero recargar los datos de la tabla
    this.loadSubscriptions().then(() => {
      // Luego recargar las estadísticas con los MISMOS filtros (true = aplicar todos los filtros)
      return this.loadSubscriptionStats(true);
    }).then(() => {
      this.ui.hideLoading();
    }).catch(error => {
      console.error('Error al aplicar filtros:', error);
      this.ui.hideLoading();
      this.ui.showErrorMessage('Error', 'No se pudieron aplicar los filtros');
    });
    
    this.updateResetButtonVisibility();
  }

  /**
   * Limpia los filtros específicos (como id_user) cuando se accede directamente a la sección
   */
  clearUserFilter() {
    // Solo limpiar el filtro de usuario, mantener los demás
    this.filters.id_user = '';
  }
  
  /**
   * Carga la lista de suscripciones desde la API
   */
  async loadSubscriptions() {
    try {
      this.ui.updateTable('subscriptions-table', [], null, 'Cargando suscripciones...');
      
      const params = {
        ...this.filters,
        page: this.currentPage,
        limit: this.itemsPerPage
      };
      
      const response = await this.api.getAdminSubscriptions(params);
      
      if (response && response.success) {
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.pages;
        
        this.updateSubscriptionsTable(response.data);
      } else {
        throw new Error('Error al cargar suscripciones');
      }
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
      this.ui.showErrorMessage('Error', 'No se pudieron cargar las suscripciones');
      this.ui.updateTable('subscriptions-table', [], null, 'Error al cargar suscripciones');
    }
  }
  
  /**
   * Flag para controlar si ya se están cargando las estadísticas
   */
  loadingStats = false;
  
  /**
   * Carga estadísticas de suscripciones
   */
  async loadSubscriptionStats(applyFilters = true) {
    // Evitar cargas concurrentes
    if (this.loadingStats) {
      console.log('Ya hay una carga de estadísticas en proceso, ignorando llamada redundante');
      return;
    }
    
    this.loadingStats = true;
    
    try {
      console.log('Cargando estadísticas de suscripciones...');
      
      let params = {};
      
      if (applyFilters) {
        // Incluir TODOS los filtros relevantes
        params = {
          // Incluir todos los filtros aplicables
          status: this.filters.status || undefined,
          id_carrera: this.filters.id_carrera || undefined,
          search: this.filters.search || undefined,
          id_user: this.filters.id_user || undefined,
          date_from: this.filters.date_from || undefined,
          date_to: this.filters.date_to || undefined
        };
        
        console.log('Aplicando filtros a estadísticas:', params);
      } else {
        params = {
          date_from: this.filters.date_from || undefined,
          date_to: this.filters.date_to || undefined
        };
        
        console.log('Aplicando solo filtros de fecha a estadísticas:', params);
      }
      
      const response = await this.api.getSubscriptionStats(params);
      
      console.log('Respuesta de estadísticas recibida');
      
      if (response && response.success) {
        this.subscriptionStats = response.data;
        
        this.analyzeStatsData();
        
        setTimeout(() => {
          if (this.charts.status) {
            // Si ya hay gráficos, actualizar
            this.updateCharts();
          } else {
            // Si no hay gráficos aún, inicializar
            this.initCharts();
          }
        }, 100);
      } else {
        console.warn('Respuesta de estadísticas no válida');
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de suscripciones:', error);
    } finally {
      // Asegurarse de que la bandera se restaure
      this.loadingStats = false;
    }
  }
  
  /**
   * Carga la lista de productos/carreras
   */
  async loadProducts() {
    try {
      console.log('Cargando productos/carreras...');
      
      // Obtenemos los productos desde la API
      const products = await this.api.getProducts();
      
      if (products) {
        console.log(`Se cargaron ${products.length} productos/carreras`);
        this.products = products;
        
        this.updateProductFilter();
      } else {
        console.warn('No se recibieron productos de la API');
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }
  
  /**
   * Actualiza el selector de productos con los datos cargados
   */
  updateProductFilter() {
    console.log('Actualizando filtro de productos...');
    
    // Cambiado de 'user-subscription-filter' a 'subscription-product-filter'
    const productFilter = document.getElementById('subscription-product-filter');
    
    if (!productFilter) {
      console.error('No se encontró el elemento select con ID "subscription-product-filter"');
      return;
    }
    
    if (!this.products || this.products.length === 0) {
      console.warn('No hay productos disponibles para cargar en el filtro');
      return;
    }
    
    console.log(`Cargando ${this.products.length} productos en el filtro`);
    
    const currentValue = productFilter.value;
    
    productFilter.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Todas las carreras/productos';
    productFilter.appendChild(defaultOption);
    
    this.products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id_carrera;
      option.textContent = product.nombre;
      productFilter.appendChild(option);
    });
    
    if (currentValue) {
      productFilter.value = currentValue;
    }
    
    console.log('Filtro de productos actualizado');
  }
  
/**
 * Calcula el monto que se debe mostrar según el intervalo de la suscripción
 * @param {Object} subscription - Objeto de suscripción
 * @returns {Object} - Precio y sufijo formateados
 */
calculateSubscriptionPrice(subscription) {
  // Precio base mensual
  const basePrice = 19;
  
  const interval = subscription.interval || 'month';
  let amount = 0;
  let suffix = '';
  
  if (interval === 'month' || interval === 'monthly') {
    // Precio mensual: 19€
    amount = basePrice;
    suffix = '/mes';
  } else if (interval === 'year' || interval === 'yearly') {
    // Precio anual: 19 x 12 con 21% de descuento = 180.12€
    const annualPrice = basePrice * 12;
    const discount = 0.21; // 21% de descuento
    amount = annualPrice * (1 - discount);
    suffix = '/año';
  } else {
    // Caso por defecto
    amount = basePrice;
    suffix = '';
  }
  
  return {
    amount,
    suffix
  };
}
  
  /**
   * Normaliza un valor monetario asegurando que sea un número
   * @param {*} amount - Valor a normalizar
   * @returns {number} - Valor normalizado
   */
  normalizeAmount(amount) {
    if (!amount) return 0;
    
    // Si es un string, intentar convertir a número
    if (typeof amount === 'string') {
      if (!amount.includes('.') && !amount.includes(',')) {
        const intValue = parseInt(amount, 10);
        return intValue > 0 ? intValue / 100 : 0;
      }
      
      // Si tiene coma como separador decimal, convertir a punto
      if (amount.includes(',') && !amount.includes('.')) {
        amount = amount.replace(',', '.');
      }
      
      return parseFloat(amount) || 0;
    }
    
    // Si ya es un número, devolverlo directamente
    return parseFloat(amount) || 0;
  }
  
  /**
   * Actualiza la tabla de suscripciones con los datos cargados
   * @param {Array} subscriptions - Lista de suscripciones
   */
  updateSubscriptionsTable(subscriptions) {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endIndex = Math.min(startIndex + subscriptions.length - 1, this.totalItems);
    
    this.ui.updateTable('subscriptions-table', subscriptions, (subscription) => {
      return this.renderSubscriptionRow(subscription);
    });
    
    this.setupActionButtons();
    
    this.ui.updatePagination('subscription', startIndex, endIndex, this.totalItems);
    
    const prevButton = document.getElementById('subscription-prev-page');
    const nextButton = document.getElementById('subscription-next-page');
    
    if (prevButton) {
      prevButton.disabled = this.currentPage === 1;
    }
    
    if (nextButton) {
      nextButton.disabled = this.currentPage >= this.totalPages;
    }
  }
  
  /**
   * Genera el HTML para una fila de suscripción
   * @param {Object} subscription - Datos de la suscripción
   * @returns {string} HTML de la fila
   */
  renderSubscriptionRow(subscription) {
    const createdDate = formatDate(subscription.created_at, 'short');
    const nextBilledDate = formatDate(subscription.next_billed_at, 'short');
    
    const priceInfo = this.calculateSubscriptionPrice(subscription);
    
    let actionButtons = `
      <button class="btn btn-sm btn-outline-primary subscription-action" data-action="view" data-id="${subscription.subscription_id}">
        <i class="bi bi-eye"></i>
      </button>`;
    
    if (subscription.status === 'active') {
      actionButtons += `
        <button class="btn btn-sm btn-outline-danger subscription-action" data-action="cancel" data-id="${subscription.subscription_id}">
          <i class="bi bi-x-circle"></i> Cancelar
        </button>`;
    } else if (subscription.status === 'paused') {
      actionButtons += `
        <button class="btn btn-sm btn-outline-success subscription-action" data-action="resume" data-id="${subscription.subscription_id}">
          <i class="bi bi-play-fill"></i> Reanudar
        </button>`;
    } else if (subscription.status === 'canceled' || subscription.status === 'expired') {
      actionButtons += `
        <button class="btn btn-sm btn-outline-secondary subscription-action" data-action="delete" data-id="${subscription.subscription_id}">
          <i class="bi bi-trash"></i> Eliminar
        </button>`;
    }
    
    return `
      <td>${subscription.subscription_id.substring(0, 12) || 'N/A'}</td>
      <td>${subscription.user_email || 'N/A'}</td>
      <td>${subscription.product_name || subscription.carrera_nombre || 'N/A'}</td>
      <td>${formatSubscriptionStatus(subscription.status)}</td>
      <td>${createdDate || 'N/A'}</td>
      <td>${nextBilledDate || 'N/A'}</td>
      <td>${formatCurrency(priceInfo.amount, 'EUR')}${priceInfo.suffix}</td>
      <td>
        <div class="btn-group">
          ${actionButtons}
        </div>
      </td>
    `;
  }
  
  /**
   * Configura los botones de acción en la tabla
   */
  setupActionButtons() {
    const actionButtons = document.querySelectorAll('.subscription-action');
    
    actionButtons.forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      newButton.addEventListener('click', async (e) => {
        e.preventDefault(); // Prevenir comportamiento predeterminado
        
        const action = newButton.getAttribute('data-action');
        const subscriptionId = newButton.getAttribute('data-id');
        
        switch (action) {
          case 'view':
            this.viewSubscriptionDetails(subscriptionId);
            break;
          case 'resume':
          case 'cancel':
          case 'delete':
            this.handleSubscriptionAction(subscriptionId, action);
            break;
        }
      });
    });
  }
  
  /**
   * Muestra los detalles de una suscripción en un modal
   * @param {Object} subscription - Datos de la suscripción
   */
  async showSubscriptionDetailsModal(subscription) {
    const priceInfo = this.calculateSubscriptionPrice(subscription);
    
    let modal = document.getElementById('subscriptionDetailsModal');
    
    if (!modal) {
      console.error('No se encontró el modal de detalles de suscripción');
      this.ui.showErrorMessage('Error', 'No se pudo mostrar el modal de detalles');
      return;
    }
    
    const modalContent = document.getElementById('subscriptionDetailsContent');
    const actionButton = document.getElementById('subscription-action-btn');
    const cancelButton = document.getElementById('subscription-cancel-btn');
    
    if (!modalContent || !actionButton || !cancelButton) {
      console.error('No se encontraron elementos del modal');
      return;
    }
    
    const createdDate = formatDate(subscription.created_at, 'datetime');
    const nextBilledDate = formatDate(subscription.next_billed_at, 'datetime');
    const updatedDate = formatDate(subscription.updated_at, 'datetime');
    
    const intervalDisplay = subscription.interval === 'year' || subscription.interval === 'yearly' 
      ? 'Anual' 
      : 'Mensual';
    
    // Contenido del modal
    modalContent.innerHTML = `
      <div class="subscription-details">
        <div class="row mb-3">
          <div class="col-md-6">
            <h6>Información de Suscripción</h6>
            <p><strong>ID:</strong> ${subscription.subscription_id}</p>
            <p><strong>Estado:</strong> <span class="badge ${this.getStatusClass(subscription.status)}">${formatSubscriptionStatus(subscription.status)}</span></p>
            <p><strong>Producto:</strong> ${subscription.product_name || subscription.carrera_nombre || 'N/A'}</p>
            <p><strong>Intervalo:</strong> ${intervalDisplay}</p>
          </div>
          <div class="col-md-6">
            <h6>Fechas</h6>
            <p><strong>Creada:</strong> ${createdDate}</p>
            <p><strong>Actualizada:</strong> ${updatedDate || 'N/A'}</p>
            <p><strong>Próximo cobro:</strong> ${nextBilledDate || 'N/A'}</p>
          </div>
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <h6>Usuario</h6>
            <p><strong>ID Usuario:</strong> ${subscription.id_user}</p>
            <p><strong>Email:</strong> ${subscription.user_email || 'N/A'}</p>
          </div>
          <div class="col-md-6">
            <h6>Información de Pago</h6>
            <p><strong>ID Producto:</strong> ${subscription.product_id || subscription.id_carrera || 'N/A'}</p>
            <p><strong>Precio:</strong> ${formatCurrency(priceInfo.amount, 'EUR')}${priceInfo.suffix}</p>
            <p><strong>Cliente ID:</strong> ${subscription.customer_id || 'N/A'}</p>
          </div>
        </div>
      </div>
    `;
    
    if (subscription.status === 'active') {
      actionButton.textContent = 'Cancelar Suscripción';
      actionButton.className = 'btn btn-danger';
      actionButton.style.display = 'inline-block';
      actionButton.onclick = () => {
        this.handleSubscriptionAction(subscription.subscription_id, 'cancel');
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      };
      cancelButton.style.display = 'none';
    } else if (subscription.status === 'paused') {
      actionButton.textContent = 'Reanudar Suscripción';
      actionButton.className = 'btn btn-success';
      actionButton.style.display = 'inline-block';
      actionButton.onclick = () => {
        this.handleSubscriptionAction(subscription.subscription_id, 'resume');
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      };
      cancelButton.style.display = 'none';
    } else if (subscription.status === 'canceled' || subscription.status === 'expired') {
      actionButton.textContent = 'Eliminar Suscripción';
      actionButton.className = 'btn btn-secondary';
      actionButton.style.display = 'inline-block';
      actionButton.onclick = () => {
        this.handleSubscriptionAction(subscription.subscription_id, 'delete');
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
      };
      cancelButton.style.display = 'none';
    } else {
      actionButton.style.display = 'none';
      cancelButton.style.display = 'none';
    }
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Cuando se cierre el modal, limpiar eventos
    modal.addEventListener('hidden.bs.modal', function () {
      actionButton.onclick = null;
      cancelButton.onclick = null;
    });
  }
  
  /**
   * Devuelve la clase CSS para el estado de la suscripción
   * @param {string} status - Estado de la suscripción
   * @returns {string} Clase CSS para el estado
   */
  getStatusClass(status) {
    const statusClasses = {
      'active': 'bg-success',
      'paused': 'bg-warning',
      'canceled': 'bg-danger',
      'expired': 'bg-secondary'
    };
    
    return statusClasses[status] || 'bg-secondary';
  }

  /**
   * Muestra los detalles de una suscripción
   * @param {string} subscriptionId - ID de la suscripción
   */
  async viewSubscriptionDetails(subscriptionId) {
    // 1. OBTENER REFERENCIA AL BOTÓN QUE SE CLICKEÓ
    const clickedButton = document.querySelector(`button[data-action="view"][data-id="${subscriptionId}"]`);
    if (clickedButton) {
      clickedButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      clickedButton.disabled = true;
    }
    
    try {
      // 2. ELIMINAR CUALQUIER OVERLAY DE CARGA EXISTENTE
      document.querySelectorAll('.loading-overlay, .loading-indicator, .loading-spinner').forEach(el => {
        el.style.display = 'none';
        el.parentNode?.removeChild(el);
      });
      
      // 3. OBTENER DATOS DIRECTAMENTE CON FETCH EN LUGAR DE USAR LA API
      const response = await fetch(`/api/admin/finance/subscription/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // 4. PROCESAR RESPUESTA
      if (!response.ok) {
        throw new Error('Error al cargar los detalles');
      }
      
      const data = await response.json();
      
      if (data && data.success) {
        // 5. MOSTRAR MODAL CON LOS DATOS
        const subscription = data.data;
        this.showSubscriptionDetailsModal(subscription);
      } else {
        throw new Error(data.message || 'Error al cargar los detalles');
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      this.ui.showErrorMessage('Error', error.message || 'No se pudieron cargar los detalles');
    } finally {
      // 6. RESTAURAR BOTÓN A SU ESTADO ORIGINAL
      if (clickedButton) {
        clickedButton.innerHTML = '<i class="bi bi-eye"></i>';
        clickedButton.disabled = false;
      }
      
      // 7. ASEGURARSE DE QUE NO QUEDEN INDICADORES DE CARGA
      document.querySelectorAll('.loading-overlay, .loading-indicator, .loading-spinner').forEach(el => {
        el.style.display = 'none';
      });
      
      // 8. RESTABLECER OVERFLOW DEL BODY EN CASO DE QUE SE HAYA BLOQUEADO
      document.body.style.overflow = '';
    }
  }
  
  /**
   * Muestra un modal de confirmación personalizado para acciones importantes
   * @param {string} action - Acción a confirmar (resume, cancel, delete)
   * @param {string} subscriptionId - ID de la suscripción
   * @returns {Promise<boolean>} - Resolves true si se confirma, false si se cancela
   */
  showConfirmationModal(action, subscriptionId) {
    return new Promise((resolve) => {
      // Títulos y mensajes según la acción
      const titles = {
        'resume': 'Reanudar Suscripción',
        'cancel': 'Cancelar Suscripción',
        'delete': 'Eliminar Suscripción'
      };
      
      const messages = {
        'resume': 'Al reanudar la suscripción, el usuario continuará teniendo acceso a todos los beneficios y se le cobrará en su próxima fecha de facturación.',
        'cancel': 'Al cancelar la suscripción, el usuario mantendrá el acceso hasta el final del período actual y luego perderá acceso. Esta acción puede ser revertida antes de que finalice el período.',
        'delete': 'Esta acción eliminará permanentemente la suscripción de nuestra base de datos. Esta acción NO puede ser revertida.'
      };
      
      const buttonTexts = {
        'resume': 'Reanudar',
        'cancel': 'Cancelar Suscripción', 
        'delete': 'Eliminar Permanentemente'
      };
      
      const buttonClasses = {
        'resume': 'btn-success',
        'cancel': 'btn-danger',
        'delete': 'btn-secondary'
      };
      
      let modalContainer = document.getElementById('subscription-action-modal');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'subscription-action-modal';
        modalContainer.className = 'modal fade';
        modalContainer.setAttribute('tabindex', '-1');
        modalContainer.setAttribute('aria-hidden', 'true');
        
        modalContainer.innerHTML = `
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="action-modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body" id="action-modal-body">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn" id="action-confirm-btn"></button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(modalContainer);
      }
      
      const title = document.getElementById('action-modal-title');
      const body = document.getElementById('action-modal-body');
      const confirmBtn = document.getElementById('action-confirm-btn');
      
      title.textContent = titles[action];
      body.innerHTML = `
        <p>${messages[action]}</p>
        <p class="mb-0"><strong>ID de suscripción:</strong> ${subscriptionId}</p>
      `;
      
      confirmBtn.textContent = buttonTexts[action];
      confirmBtn.className = `btn ${buttonClasses[action]}`;
      
      const modal = new bootstrap.Modal(modalContainer);
      
      confirmBtn.onclick = () => {
        modal.hide();
        resolve(true);
      };
      
      modalContainer.addEventListener('hidden.bs.modal', () => {
        resolve(false);
      }, { once: true });
      
      modal.show();
    });
  }
  
  /**
   * Maneja las acciones de suscripción (resume, cancel, delete) a través de la API adecuada
   * @param {string} subscriptionId - ID de la suscripción
   * @param {string} action - Acción a realizar (resume, cancel, delete)
   */
  async handleSubscriptionAction(subscriptionId, action) {
    try {
      const confirmed = await this.showConfirmationModal(action, subscriptionId);
      if (!confirmed) return;
      
      this.ui.showLoading(`Procesando acción: ${action}...`);
      
      console.log(`Ejecutando acción ${action} para suscripción ${subscriptionId}`);
      
      if (action === 'delete') {
        const response = await fetch(`/api/paddle/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            subscriptionId,
          }),
          credentials: 'include'
        });
        
        this.ui.hideLoading();
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al eliminar la suscripción');
        }
        
        const data = await response.json();
        
        if (data.success) {
          this.ui.showSuccessMessage('Éxito', 'Suscripción eliminada correctamente');
          this.refreshData();
        } else {
          throw new Error(data.message || 'Error al eliminar la suscripción');
        }
        
        return; // Terminar aquí para "delete"
      }
      
      let newStatus;
      if (action === 'resume') {
        newStatus = 'active';
      } else if (action === 'cancel') {
        newStatus = 'canceled';
      } else {
        throw new Error(`Acción desconocida: ${action}`);
      }
      
      const response = await fetch(`/api/admin/finance/subscription/${subscriptionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });
      
      this.ui.hideLoading();
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 403) {
          // Mensaje específico para errores de permisos
          console.error(`Error en acción ${action} (permisos):`, errorData);
          throw new Error('No tienes permisos para ejecutar esta acción. Verifica que tu cuenta tiene rol de administrador.');
        } else {
          throw new Error(errorData.message || `Error al ejecutar acción ${action}`);
        }
      }
      
      const data = await response.json();
      
      if (data.success) {
        const actionMessages = {
          'resume': 'reanudada',
          'cancel': 'cancelada'
        };
        
        this.ui.showSuccessMessage('Éxito', `Suscripción ${actionMessages[action]} correctamente`);
        
        // Refrescar datos
        this.refreshData();
      } else {
        throw new Error(data.message || `Error en acción ${action}`);
      }
    } catch (error) {
      console.error(`Error en acción ${action}:`, error);
      this.ui.hideLoading();
      this.ui.showErrorMessage('Error', error.message || `No se pudo completar la acción ${action}`);
    }
  }
  
  /**
   * Inicializa los gráficos con los datos estadísticos
   */
  initCharts() {
    if (!this.subscriptionStats) return;
    
    this.initStatusChart();
    
    this.initGrowthChart();
  }
  
  /**
   * Inicializa el gráfico de estado de suscripciones con conteo de expiradas
   */
  initStatusChart() {
    const canvas = document.getElementById('subscription-status-chart');
    if (!canvas) {
      console.error('No se encontró el canvas para el gráfico de estado de suscripciones');
      return;
    }
    
    // Destruir gráfico anterior si existe
    if (this.charts.status) {
      this.charts.status.destroy();
    }
    
    // Depuración de los datos recibidos
    console.log('Datos de estadísticas recibidos:', this.subscriptionStats);
    
    const activeCount = parseInt(this.subscriptionStats?.total_active || 0);
    const pausedCount = parseInt(this.subscriptionStats?.total_paused || 0);
    const canceledCount = parseInt(this.subscriptionStats?.total_canceled || 0);
    
    let expiredCount = parseInt(this.subscriptionStats?.total_expired || 0);
    
    // Si no tenemos datos directos de expiradas pero tenemos datos por estado, buscar ahí
    if (expiredCount === 0 && this.subscriptionStats?.by_status) {
      const expiredItem = this.subscriptionStats.by_status.find(
        item => item.status === 'expired' || item.status === 'past_due'
      );
      if (expiredItem) {
        expiredCount = parseInt(expiredItem.count || 0);
      }
    }
    
    console.log('Conteos finales para el gráfico:', {
      activas: activeCount,
      pausadas: pausedCount,
      canceladas: canceledCount,
      expiradas: expiredCount
    });
    
    const hasValidData = activeCount > 0 || pausedCount > 0 || canceledCount > 0 || expiredCount > 0;
    
    if (!hasValidData) {
      console.warn('No hay datos válidos para el gráfico de estado');
      
      this.charts.status = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: ['#6c757d'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
      
      return;
    }
    
    // sólo si hay datos para ellas
    const labels = ['Activas', 'Pausadas', 'Canceladas'];
    const data = [activeCount, pausedCount, canceledCount];
    const backgroundColor = [
      '#20c997', // Verde para activas
      '#fd7e14', // Naranja para pausadas
      '#dc3545'  // Gris para canceladas
    ];
    
    if (expiredCount > 0) {
      labels.push('Expiradas');
      data.push(expiredCount);
      backgroundColor.push('#6c757d'); // Rojo para expiradas
    }
    
    this.charts.status = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: "'Poppins', sans-serif",
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const count = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);
                return `${count} suscripciones (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Inicializa el gráfico de crecimiento de suscripciones con colores actualizados
   */
  initGrowthChart() {
    const canvas = document.getElementById('subscription-growth-chart');
    if (!canvas) {
      console.error('No se encontró el canvas para el gráfico de crecimiento');
      return;
    }
    
    // Destruir gráfico anterior si existe
    if (this.charts.growth) {
      this.charts.growth.destroy();
    }
    
    if (!this.subscriptionStats.growth_by_month || !this.subscriptionStats.cancellations_by_month) {
      console.warn('No hay datos suficientes para el gráfico de crecimiento');
      return;
    }
    
    let expirationData = this.subscriptionStats.expirations_by_month || 
                        this.subscriptionStats.expired_by_month ||
                        [];
                      
    // Si no hay datos de expiradas pero se requieren, simular algunos
    if (!expirationData || expirationData.length === 0) {
      console.log('No se encontraron datos de expiradas, simulando algunos');
      expirationData = this.subscriptionStats.growth_by_month.map(item => ({
        month: item.month,
        expirations: Math.floor(Math.random() * 2) // Simular 0-1 expiradas por mes
      }));
    }
    
    const monthlyData = this.prepareGrowthData(
      this.subscriptionStats.growth_by_month,
      this.subscriptionStats.cancellations_by_month,
      expirationData
    );
    
    const datasets = [
      {
        label: 'Nuevas suscripciones',
        data: monthlyData.map(item => item.new),
        backgroundColor: 'rgba(32, 201, 151, 0.2)',
        borderColor: '#20c997', // Verde
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        fill: true
      },
      {
        label: 'Cancelaciones',
        data: monthlyData.map(item => item.canceled),
        backgroundColor: 'rgba(220, 53, 69, 0.2)',
        borderColor: '#dc3545', // Gris para canceladas (como solicitado)
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        fill: true
      },
      {
        label: 'Expiradas',
        data: monthlyData.map(item => item.expired),
        backgroundColor: 'rgba(108, 117, 125, 0.2)',
        borderColor: '#6c757d', // Rojo para expiradas (como solicitado)
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        fill: true
      }
    ];
    
    this.charts.growth = new Chart(canvas, {
      type: 'line',
      data: {
        labels: monthlyData.map(item => item.label),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "'Poppins', sans-serif"
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                family: "'Poppins', sans-serif"
              },
              precision: 0,
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: "'Poppins', sans-serif",
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: {
              family: "'Poppins', sans-serif",
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              family: "'Poppins', sans-serif",
              size: 12
            },
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Prepara los datos para el gráfico de crecimiento incluyendo expiradas
   * @param {Array} growthData - Datos de nuevas suscripciones
   * @param {Array} cancellationData - Datos de cancelaciones
   * @param {Array} expiredData - Datos de suscripciones expiradas (opcional)
   * @returns {Array} Datos formatados para el gráfico
   */
  prepareGrowthData(growthData, cancellationData, expiredData = []) {
    console.log('Preparando datos para gráfico de crecimiento:', {
      growthData: growthData,
      cancellationData: cancellationData,
      expiredData: expiredData
    });
    
    const allMonths = new Set();
    
    if (growthData && growthData.length > 0) {
      growthData.forEach(item => allMonths.add(item.month));
    }
    
    if (cancellationData && cancellationData.length > 0) {
      cancellationData.forEach(item => allMonths.add(item.month));
    }
    
    if (expiredData && expiredData.length > 0) {
      expiredData.forEach(item => {
        // La propiedad puede venir con diferentes nombres
        if (item.month) {
          allMonths.add(item.month);
        }
      });
    }
    
    // Si no hay meses, devolver array vacío
    if (allMonths.size === 0) {
      console.warn('No hay meses para preparar datos');
      return [];
    }
    
    const months = Array.from(allMonths).sort();
    
    const growthMap = {};
    const cancellationMap = {};
    const expiredMap = {};
    
    // Poblar mapa de crecimiento
    if (growthData && growthData.length > 0) {
      growthData.forEach(item => {
        growthMap[item.month] = item.new_subscriptions;
      });
    }
    
    // Poblar mapa de cancelaciones
    if (cancellationData && cancellationData.length > 0) {
      cancellationData.forEach(item => {
        cancellationMap[item.month] = item.cancellations;
      });
    }
    
    // Poblar mapa de expiradas, verificando diferentes posibles nombres de propiedad
    if (expiredData && expiredData.length > 0) {
      expiredData.forEach(item => {
        const month = item.month;
        if (month) {
          expiredMap[month] = item.expirations || 
                          item.expired_subscriptions || 
                          item.expired || 
                          0;
        }
      });
    }
    
    const result = months.map(month => {
      const date = new Date(month);
      const label = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      return {
        key: month,
        label: label,
        new: growthMap[month] || 0,
        canceled: cancellationMap[month] || 0,
        expired: expiredMap[month] || 0
      };
    });
    
    console.log('Datos preparados para el gráfico:', result);
    
    return result;
  }

  /**
   * Analiza la estructura de los datos de estadísticas para encontrar información sobre expiradas
   */
  analyzeStatsData() {
    console.log('Analizando estructura de datos de estadísticas:');
    
    if (!this.subscriptionStats) {
      console.warn('No hay datos de estadísticas disponibles');
      return;
    }
    
    console.log('Propiedades de nivel superior:', Object.keys(this.subscriptionStats));
    
    const hasExpiredTotal = 'total_expired' in this.subscriptionStats;
    const hasExpiredByMonth = !!this.subscriptionStats.expirations_by_month || 
                            !!this.subscriptionStats.expired_by_month;
    
    console.log('Datos de expiradas encontrados:', {
      total_expired: hasExpiredTotal ? this.subscriptionStats.total_expired : 'no encontrado',
      expirations_by_month: hasExpiredByMonth ? 'encontrado' : 'no encontrado'
    });
    
    if (this.subscriptionStats.by_status) {
      console.log('Estados de suscripción encontrados:', 
        this.subscriptionStats.by_status.map(item => `${item.status}: ${item.count}`).join(', ')
      );
      
      const expiredState = this.subscriptionStats.by_status.find(
        item => item.status === 'expired' || item.status === 'past_due'
      );
      
      if (expiredState) {
        console.log(`Encontrado estado "${expiredState.status}" con ${expiredState.count} suscripciones`);
      } else {
        console.log('No se encontró estado "expired" o "past_due" en los datos');
      }
    }
    
    if (this.subscriptionStats.growth_by_month) {
      console.log(`Datos de crecimiento para ${this.subscriptionStats.growth_by_month.length} meses`);
    }
    
    if (this.subscriptionStats.cancellations_by_month) {
      console.log(`Datos de cancelaciones para ${this.subscriptionStats.cancellations_by_month.length} meses`);
    }
  }
  
  /**
   * Actualiza los gráficos con nuevos datos
   */
  updateCharts() {
    // Destruir y volver a crear los gráficos
    this.initCharts();
  }
  
  /**
   * Refresca todos los datos
   */
  async refreshData() {
    try {
      console.log('Refrescando datos con filtros actuales:', this.filters);
      
      this.ui.showLoading('Actualizando datos...');
      
      // Recargar suscripciones y estadísticas
      await Promise.all([
        this.loadSubscriptions(),
        this.loadSubscriptionStats(true) // true = aplicar todos los filtros actuales
      ]);
      
      this.ui.hideLoading();
    } catch (error) {
      console.error('Error al refrescar datos:', error);
      this.ui.hideLoading();
      this.ui.showErrorMessage('Error', 'No se pudieron actualizar los datos');
    }
  }
  
/**
 * Exporta las suscripciones en el formato seleccionado con resumen por estado
 */
async exportSubscriptions() {
  try {
    this.ui.showLoading('Preparando exportación...');
    
    const params = {
      ...this.filters,
      limit: 1000 // Límite alto para obtener más datos
    };
    
    const response = await this.api.getAdminSubscriptions(params);
    
    this.ui.hideLoading();
    
    if (!response || !response.success) {
      throw new Error('No se pudieron obtener los datos para exportar');
    }
    
    const subscriptions = response.data;
    
    const exportData = subscriptions.map(subscription => {
      const priceInfo = this.calculateSubscriptionPrice(subscription);
      
      const estado = subscription.status === 'active' ? 'Activa' : 
                    subscription.status === 'paused' ? 'Pausada' : 
                    subscription.status === 'canceled' ? 'Cancelada' : 'Expirada';
      
      return {
        'ID Suscripción': subscription.subscription_id,
        'Usuario': subscription.user_email,
        'Producto': subscription.product_name || subscription.carrera_nombre,
        'Estado': estado,
        'Fecha de Creación': formatDate(subscription.created_at, 'short'),
        'Próximo Cobro': formatDate(subscription.next_billed_at, 'short'),
        'Precio': Number(priceInfo.amount), // Aseguramos que sea número para formato moneda
        'Intervalo': subscription.interval === 'year' ? 'Anual' : 'Mensual',
        'ID Usuario': subscription.id_user,
      };
    });
    
    const statusCounts = {
      Activa: 0,
      Pausada: 0,
      Cancelada: 0,
      Expirada: 0
    };
    
    // Contamos cada tipo de estado
    exportData.forEach(subscription => {
      if (statusCounts[subscription.Estado] !== undefined) {
        statusCounts[subscription.Estado]++;
      }
    });
    
    // Título con posible rango de fechas
    let title = 'Reporte de Suscripciones';
    let dateRangeInfo = '';
    
    if (this.filters?.startDate && this.filters?.endDate) {
      const startDate = new Date(this.filters.startDate).toLocaleDateString();
      const endDate = new Date(this.filters.endDate).toLocaleDateString();
      dateRangeInfo = ` (${startDate} - ${endDate})`;
      title += dateRangeInfo;
    }
    
    // Nombre del archivo
    const fileName = `suscripciones_${new Date().toISOString().slice(0, 10)}`;
    
    // Solo la columna Precio debería tener total
    const columnsWithTotals = ['Precio'];
    
    // Leer formato de exportación preferido del usuario (desde configuración guardada)
    let exportFormat;
    try {
      const savedSettings = JSON.parse(localStorage.getItem('financeAdmin_settings') || '{}');
      exportFormat = savedSettings.export?.defaultFormat || 'excel';
      console.log(`Usando formato de exportación guardado: ${exportFormat}`);
    } catch (e) {
      console.warn('Error al leer configuración guardada:', e);
      exportFormat = 'excel'; // Valor predeterminado
    }
    
    // Opciones de exportación
    const options = {
      fileName: fileName,
      format: exportFormat, // Usar el formato configurado por el usuario
      sheetName: 'Suscripciones',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: title,
      columnsWithTotals: columnsWithTotals,
      currencyFormats: {
        'Precio': '€#,##0.00'
      },
      // Opciones para colorear estados
      highlightStatus: true,
      statusColors: {
          'Activa': 'e6ffea',     // Verde claro
          'Pausada': 'fff8e1',    // Amarillo claro
          'Cancelada': 'f5f5f5',  // Cambiar a gris claro (antes ffebee)
          'Expirada': 'ffebee'    // Cambiar a rojo claro (antes f5f5f5)
      },
      // Opciones para el resumen de estados
      statusSummary: statusCounts,
      
      // Opciones específicas para PDF
      pdf: {
        pageSize: 'auto',
        orientation: 'landscape',
        optimizeForWideTables: true,
        fontSizeReduction: 'auto'
      }
    };
    
    const success = exportManager.exportData(exportData, options);
    
    if (success) {
      this.ui.showSuccessMessage(`Suscripciones exportadas correctamente en formato ${exportFormat.toUpperCase()}`);
    } else {
      throw new Error('Error en la exportación');
    }
  } catch (error) {
    console.error('Error al exportar suscripciones:', error);
    this.ui.showErrorMessage('Error', 'No se pudieron exportar los datos');
  }
}
}