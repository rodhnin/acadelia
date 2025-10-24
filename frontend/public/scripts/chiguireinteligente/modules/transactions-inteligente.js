/**
 * Módulo de Transacciones
 * Gestiona la visualización y análisis de transacciones
 */

import { formatCurrency, formatDate, formatCountryName } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class TransactionsModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.dateRange = null;
    this.transactions = [];
    this.filteredTransactions = [];
    this.allTransactions = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filterSettings = {
      product_id: '',
      country: '',
      search: '',
      startDate: null,
      endDate: null
    };
    this.products = [];
    this.countries = [];
  }
  
  /**
   * Inicializa el módulo de transacciones
   */
  async init() {
    console.log('Inicializando módulo de transacciones');
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Suscribirse a cambios de fecha
    this.eventBus.on('dateRangeChanged', (range) => {
      this.dateRange = range;
      this.filterSettings.startDate = range.start;
      this.filterSettings.endDate = range.end;
      this.refreshTransactions();
    });
    
    // Suscribirse a eventos de filtrado por usuario/producto
    this.eventBus.on('dateRangeChanged', (range) => {
    this.dateRange = range;
    this.filterSettings.startDate = range.start;
    this.filterSettings.endDate = range.end;
    
    // Si tenemos datos completos, usar filtrado local
    if (this.allTransactions && this.allTransactions.length > 0) {
      this.refreshTransactionsWithLocalData();
    } else {
      // Si no hay datos en memoria, hacer petición a API
      this.refreshTransactions();
    }
  });
    
    // Cargar datos iniciales
    await this.loadTransactionData();
    
    // Cargar productos para filtros
    await this.loadProducts();
    
    return true;
  }
  
  /**
   * Configura event listeners para el módulo
   */
  setupEventListeners() {
    // Botón de aplicar filtros
    const applyFiltersBtn = document.getElementById('apply-transaction-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        this.applyFilters();
      });
    }

    // Añadir botón de reinicio de filtros
this.resetButton = this.ui.addResetFiltersButton(
  'transactions-section', 
  'reset-transaction-filters',
  () => this.resetFilters(), 
  '#apply-transaction-filters'
);

// También puedes escuchar eventos para aplicar filtros
document.getElementById('apply-transaction-filters').addEventListener('click', () => {
  // Actualizar estado del botón al aplicar filtros
  setTimeout(() => {
    this.updateResetButtonVisibility();
  }, 100);
});
    
    // Campo de búsqueda
    const searchInput = document.getElementById('transaction-search');
    if (searchInput) {
      searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          this.applyFilters();
        }
      });
    }
    
    // Botones de paginación
    const prevPageBtn = document.getElementById('transaction-prev-page');
    const nextPageBtn = document.getElementById('transaction-next-page');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.updateTransactionsTable();
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.updateTransactionsTable();
        }
      });
    }
    
    // Botón de exportación
    const exportBtn = document.getElementById('export-transactions');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportTransactions();
      });
    }
    
    // Al cambiar de sección
    document.addEventListener('sectionChanged', (e) => {
      if (e.detail.section === 'transactions') {
        this.onSectionActivated();
      } else if (e.detail.prevSection === 'transactions') {
        this.onSectionDeactivated();
      }
    });
  }
  
/**
 * Se ejecuta cuando se activa la sección de transacciones
 */
onSectionActivated() {
  console.log('Sección de transacciones activada');
  
  // Asegurarnos de que los contenedores de gráficos existen
  const paymentMethodsEl = document.getElementById('payment-methods-chart');
  const currencyChartEl = document.getElementById('currency-chart');
  
  if (!paymentMethodsEl || !currencyChartEl) {
    console.warn('Contenedores de gráficos no encontrados en sección activada');
  }
  
  // Destruir gráficos existentes para evitar errores
  this.destroyCharts();
  
  // Si ya tenemos datos, verificar estructura y recrear gráficos
  if (this.transactions.length > 0) {
    console.log(`${this.transactions.length} transacciones ya cargadas`);
    this.debugTransactionStructure();
    
    // Asegurarse de que el mapeo de productos esté actualizado incluso si
    // ya tenemos transacciones cargadas
    if (!this.productIdMapping || Object.keys(this.productIdMapping).length === 0) {
      console.log('Actualizando mapeo de productos...');
      this.loadProducts();
    }
    
    // Crear gráficos con datos existentes
    this.initCharts();
    return;
  }
  
  // Cargar datos si no se han cargado aún
  console.log('Cargando datos de transacciones por primera vez');
  this.loadTransactionData();
}

  /**
 * Reinicia todos los filtros a sus valores predeterminados
 */
resetFilters() {
  // Reiniciar objeto de filtros
  this.filterSettings = {
    product_id: '',
    country: '',
    search: '',
    startDate: this.dateRange?.start || null,
    endDate: this.dateRange?.end || null,
    userId: null
  };
  
  // Reiniciar elementos del formulario
  const searchInput = document.getElementById('transaction-search');
  const productFilter = document.getElementById('transaction-product-filter');
  const countryFilter = document.getElementById('transaction-country-filter');
  
  if (searchInput) searchInput.value = '';
  if (productFilter) productFilter.value = '';
  if (countryFilter) countryFilter.value = '';
  
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
    this.filterSettings.product_id || 
    this.filterSettings.country || 
    this.filterSettings.search || 
    this.filterSettings.userId;
  
  const options = {};
  if (this.filterSettings.userId) {
    options.filterLabel = 'Usuario';
  }
  
  this.ui.updateResetButtonState('reset-transaction-filters', hasActiveFilters, options);
}

/**
 * Filtra transacciones por rango de fechas
 * @param {Array} transactions - Todas las transacciones
 * @param {Object} dateRange - Rango de fechas {start, end}
 * @returns {Array} Transacciones filtradas
 */
filterDataByDateRange(transactions, dateRange) {
  console.log(`Transacciones: Filtrando datos por rango: ${dateRange.start} a ${dateRange.end}`);
  
  // Convertir fechas de string a objetos Date
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  // Establecer endDate al final del día
  endDate.setHours(23, 59, 59, 999);
  
  // Filtrar transacciones
  const filteredTransactions = transactions.filter(transaction => {
    // Usar updated_at o created_at como campo de fecha
    const transactionDate = new Date(transaction.updated_at || transaction.created_at);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
  
  console.log(`Transacciones: Resultado del filtro - ${filteredTransactions.length}/${transactions.length} transacciones`);
  
  return filteredTransactions;
}

/**
 * Refresca las transacciones usando datos locales filtrados por fecha
 */
refreshTransactionsWithLocalData() {
  console.log('Transacciones: Refrescando con datos locales usando filtro de fechas');
  
  // Si no hay datos o rango de fechas, no podemos hacer nada
  if (!this.allTransactions.length || !this.dateRange) {
    console.warn('Transacciones: No hay datos suficientes para aplicar filtro local');
    return;
  }
  
  // Filtrar datos según el rango de fechas
  const filteredTransactions = this.filterDataByDateRange(
    this.allTransactions, 
    this.dateRange
  );
  
  // Actualizar this.transactions con los datos filtrados
  this.transactions = filteredTransactions;
  
  // Aplicar filtros adicionales (producto, país, búsqueda)
  this.applyFilters();
  
  // IMPORTANTE: Forzar actualización de gráficos incluso si no hay datos
  // Esto garantiza que los gráficos se vacíen cuando no hay datos en el período
  this.updateCharts();
  
  // Pequeña notificación para el usuario
  if (filteredTransactions.length === 0) {
  } else {
    this.ui.showSuccessMessage('Transacciones filtradas por fechas');
  }
}
  
/**
 * Carga datos de transacciones desde la API
 */
async loadTransactionData() {
  try {
    // Mostrar indicador de carga
    this.ui.updateTable('transactions-table', [], null, 'Cargando transacciones...');
    
    // Obtener transacciones
    const transactions = await this.api.getTransactions();
    
    // Guardar copia completa para filtrado local
    this.allTransactions = transactions;
    
    // Asignar a this.transactions (mantener compatibilidad con código existente)
    this.transactions = transactions;
    
    // Extraer países únicos para filtros
    this.extractCountries();
    
    // Inicializar el objeto de mapeo de productos (será poblado en loadProducts)
    this.productIdMapping = {};
    
    // Cargar productos para crear el mapeo
    await this.loadProducts();
    
    // Aplicar filtros iniciales
    this.applyFilters();
    
    // Inicializar gráficos
    this.initCharts();
    
    return true;
  } catch (error) {
    console.error('Error al cargar transacciones:', error);
    this.ui.showErrorMessage('Error al cargar transacciones', 'No se pudieron obtener los datos de transacciones.');
    return false;
  }
}
  
  /**
   * Extrae países únicos de las transacciones para los filtros
   */
  extractCountries() {
    const uniqueCountries = new Set();
    
    this.transactions.forEach(transaction => {
      if (transaction.country_code) {
        uniqueCountries.add(transaction.country_code);
      }
    });
    
    this.countries = Array.from(uniqueCountries).sort();
    
    // Actualizar selector de países
    const countrySelector = document.getElementById('transaction-country-filter');
    if (countrySelector) {
      // Mantener opciones por defecto
      const defaultOptions = Array.from(countrySelector.querySelectorAll('option'))
        .filter(option => option.value === '' || option.value === 'ES' || option.value === 'non-ES');
      
      countrySelector.innerHTML = '';
      
      // Restaurar opciones por defecto
      defaultOptions.forEach(option => {
        countrySelector.appendChild(option);
      });
      
      // Añadir países hispanos primero (ordenados)
      const hispanicCountries = [
        'ES', 'MX', 'AR', 'CO', 'PE', 'CL', 'EC', 'VE', 'BO', 'DO', 
        'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GT'
      ];
      
      // Filtrar países hispanos que estén en nuestros datos
      const availableHispanicCountries = this.countries.filter(code => 
        hispanicCountries.includes(code)
      );
      
      // Ordenarlos según la lista de prioridad
      availableHispanicCountries.sort((a, b) => {
        return hispanicCountries.indexOf(a) - hispanicCountries.indexOf(b);
      });
      
      // Añadir países hispanos primero
      availableHispanicCountries.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = formatCountryName(code);
        countrySelector.appendChild(option);
      });
      
      // Añadir otros países que no sean hispanos
      this.countries
        .filter(code => !hispanicCountries.includes(code) && code !== 'ES')
        .forEach(code => {
          const option = document.createElement('option');
          option.value = code;
          option.textContent = formatCountryName(code);
          countrySelector.appendChild(option);
        });
    }
  }
  
/**
 * Actualiza la tabla de transacciones con los datos filtrados
 */
updateTransactionsTable() {
  // Calcular índices de paginación
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredTransactions.length);
  
  // Obtener datos de la página actual
  const pageData = this.filteredTransactions.slice(startIndex, endIndex);
  
  // Renderizar tabla
  this.ui.updateTable('transactions-table', pageData, (transaction) => {
    // Determinar si mostrar montos originales o en EUR
    const showInEur = transaction.currency_code !== 'EUR';
    
    // Extraer montos para mostrar
    const amount = this.normalizeAmount(transaction.amount);
    const amountEur = this.normalizeAmount(transaction.amount_eur);
    
    // Información de impuestos - directa desde Paddle si está disponible
    const taxAmount = transaction.tax_amount || 0;
    const taxAmountEur = transaction.tax_amount_eur || 0;
    
    // Determinar formato de moneda
    const originalCurrencyDisplay = formatCurrency(amount, transaction.currency_code);
    const eurCurrencyDisplay = formatCurrency(amountEur, 'EUR');
    
    // Generar celda con información del monto considerando moneda original vs EUR
    const amountCell = showInEur ? 
      `${originalCurrencyDisplay}<br><small class="text-muted">(${eurCurrencyDisplay})</small>` : 
      originalCurrencyDisplay;
    
    // Generar celda con información del impuesto considerando moneda original vs EUR
    const taxAmountOriginal = formatCurrency(taxAmount, transaction.currency_code);
    const taxAmountEurDisplay = formatCurrency(taxAmountEur, 'EUR');
    const taxCell = showInEur ? 
      `${taxAmountOriginal}<br><small class="text-muted">(${taxAmountEurDisplay})</small>` : 
      taxAmountOriginal;
    
    // Formatear país
    const countryDisplay = transaction.country_code ? 
      `<span class="badge badge-info country-badge">${formatCountryName(transaction.country_code)}</span>` : 
      '<span class="badge badge-secondary country-badge">Desconocido</span>';
    
    // Verificar si tiene factura disponible
    const hasInvoice = transaction.invoice_url ? true : false;
    const invoiceButtonClass = hasInvoice ? 'btn-success' : 'btn-outline-info';
    const invoiceButtonIcon = hasInvoice ? 'bi-file-earmark-check' : 'bi-file-earmark-text';
    const invoiceButtonTitle = hasInvoice ? 'Factura almacenada en Google Drive' : 'Solicitar factura de Paddle';
    
    return `
      <td>${transaction.transaction_id?.substring(0, 12) || 'N/A'}</td>
      <td>${transaction.user_email || 'Usuario ' + transaction.id_user || 'N/A'}</td>
      <td>${transaction.product_name || 'Producto ' + transaction.product_id || 'N/A'}</td>
      <td>${amountCell}</td>
      <td>${taxCell}</td>
      <td>${transaction.payment_method || 'N/A'} ${countryDisplay}</td>
      <td>${formatDate(transaction.updated_at, 'short')}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary transaction-action" data-action="view" data-id="${transaction.transaction_id}">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm ${invoiceButtonClass} transaction-action" data-action="invoice" data-id="${transaction.transaction_id}" title="${invoiceButtonTitle}">
            <i class="bi ${invoiceButtonIcon}"></i>
          </button>
        </div>
      </td>
    `;
  });
  
  // Configurar botones de acción
  this.setupActionButtons();
  
  // Actualizar paginación
  this.ui.updatePagination('transaction', startIndex + 1, endIndex, this.filteredTransactions.length);
  
  // Actualizar estado de botones de paginación
  const prevButton = document.getElementById('transaction-prev-page');
  const nextButton = document.getElementById('transaction-next-page');
  
  if (prevButton) {
    prevButton.disabled = this.currentPage === 1;
  }
  
  if (nextButton) {
    const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
    nextButton.disabled = this.currentPage >= totalPages;
  }
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
   * Configura los botones de acción en la tabla
   */
  setupActionButtons() {
    const actionButtons = document.querySelectorAll('.transaction-action');
    
    actionButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const action = button.getAttribute('data-action');
        const transactionId = button.getAttribute('data-id');
        
        // Manejar acciones
        switch (action) {
          case 'view':
            this.viewTransactionDetails(transactionId);
            break;
          case 'invoice':
            await this.getInvoice(transactionId);
            break;
        }
      });
    });
  }
  
  /**
   * Muestra detalles de una transacción
   * @param {string} transactionId - ID de la transacción
   */
  viewTransactionDetails(transactionId) {
    // Encontrar transacción
    const transaction = this.transactions.find(t => t.transaction_id === transactionId);
    
    if (!transaction) {
      this.ui.showErrorMessage('Error', 'No se encontró la transacción');
      return;
    }
    
    // Preparar información para mostrar
    const amount = this.normalizeAmount(transaction.amount);
    const amountEur = this.normalizeAmount(transaction.amount_eur);
    const taxAmount = transaction.tax_amount || 0;
    const taxAmountEur = transaction.tax_amount_eur || 0;
    const feeAmount = transaction.fee_amount || 0;
    const feeAmountEur = transaction.fee_amount_eur || 0;
    const earnings = transaction.earnings || 0;
    const earningsEur = transaction.earnings_eur || 0;
    
    // Determinar si mostrar información de conversión
    const showConversion = transaction.currency_code !== 'EUR';
    
    // Construir detalles HTML para mostrar en modal
    let detailsHTML = `
      <div class="transaction-details">
        <div class="row mb-3">
          <div class="col-md-6">
            <h5>Información General</h5>
            <table class="table table-sm">
              <tr>
                <th>ID Transacción:</th>
                <td>${transaction.transaction_id}</td>
              </tr>
              <tr>
                <th>Usuario:</th>
                <td>${transaction.user_email || 'Usuario ' + transaction.id_user || 'N/A'}</td>
              </tr>
              <tr>
                <th>Producto:</th>
                <td>${transaction.product_name || 'Producto ' + transaction.product_id || 'N/A'}</td>
              </tr>
              <tr>
                <th>Método de pago:</th>
                <td>${transaction.payment_method || 'N/A'} ${transaction.last4 ? `(${transaction.last4})` : ''}</td>
              </tr>
              <tr>
                <th>Fecha:</th>
                <td>${formatDate(transaction.updated_at, 'medium')}</td>
              </tr>
              <tr>
                <th>País:</th>
                <td>${formatCountryName(transaction.country_code || 'Desconocido')}</td>
              </tr>
              <tr>
                <th>Intervalo:</th>
                <td>${transaction.interval || 'N/A'}</td>
              </tr>
            </table>
          </div>
          <div class="col-md-6">
            <h5>Información Financiera</h5>
            <table class="table table-sm">
              <tr>
                <th>Divisa:</th>
                <td>${transaction.currency_code || 'EUR'}</td>
              </tr>
              <tr>
                <th>Importe Total:</th>
                <td>${formatCurrency(amount, transaction.currency_code)}</td>
              </tr>
              <tr>
                <th>IVA/Impuesto:</th>
                <td>${formatCurrency(taxAmount, transaction.currency_code)} ${transaction.tax_rate ? `(${(transaction.tax_rate * 100).toFixed(2)}%)` : ''}</td>
              </tr>
              <tr>
                <th>Tarifa de procesamiento:</th>
                <td>${formatCurrency(feeAmount, transaction.currency_code)}</td>
              </tr>
              <tr>
                <th>Ingresos netos:</th>
                <td>${formatCurrency(earnings, transaction.currency_code)}</td>
              </tr>
            </table>
          </div>
        </div>
    `;
    
    // Agregar sección de conversión si es una moneda diferente al euro
    if (showConversion) {
      detailsHTML += `
        <div class="row">
          <div class="col-12">
            <h5>Conversión a EUR</h5>
            <table class="table table-sm">
              <tr>
                <th>Tasa de cambio:</th>
                <td>1 ${transaction.currency_code} = ${transaction.exchange_rate} EUR</td>
              </tr>
              <tr>
                <th>Importe Total (EUR):</th>
                <td>${formatCurrency(amountEur, 'EUR')}</td>
              </tr>
              <tr>
                <th>IVA/Impuesto (EUR):</th>
                <td>${formatCurrency(taxAmountEur, 'EUR')}</td>
              </tr>
              <tr>
                <th>Tarifa de procesamiento (EUR):</th>
                <td>${formatCurrency(feeAmountEur, 'EUR')}</td>
              </tr>
              <tr>
                <th>Ingresos netos (EUR):</th>
                <td>${formatCurrency(earningsEur, 'EUR')}</td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }
    
    detailsHTML += '</div>';
    
    // Verificar si existe un modal de detalles de transacción o crearlo si no existe
    this.createOrUpdateTransactionModal(detailsHTML);
    
    // Mostrar el modal
    this.ui.showModal('transactionDetailsModal');
  }

  /**
 * Crea o actualiza el modal para ver detalles de transacción
 * @param {string} content - Contenido HTML a mostrar en el modal
 */
createOrUpdateTransactionModal(content) {
  // Verificar si ya existe el modal
  let modalElement = document.getElementById('transactionDetailsModal');
  
  if (!modalElement) {
    // Crear nuevo modal en el DOM si no existe
    const modalHTML = `
      <div class="modal fade" id="transactionDetailsModal" tabindex="-1" aria-labelledby="transactionDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="transactionDetailsModalLabel">Detalles de Transacción</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="transactionDetailsContent">
              ${content}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Añadir el modal al final del body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Crear la instancia de Modal de Bootstrap
    modalElement = document.getElementById('transactionDetailsModal');
    this.ui.modals.transactionDetailsModal = new bootstrap.Modal(modalElement);
  } else {
    // Si el modal ya existe, actualizar solo su contenido
    const contentElement = document.getElementById('transactionDetailsContent');
    if (contentElement) {
      contentElement.innerHTML = content;
    }
  }
}
  
/**
 * Obtiene la factura de una transacción
 * @param {string} transactionId - ID de la transacción
 */
async getInvoice(transactionId) {
  try {
    // Mostrar indicador de carga
    this.ui.showLoading('Obteniendo factura...');
    
    console.log(`Solicitando factura para transacción: ${transactionId}`);
    
    // Usar el endpoint optimizado que hemos creado
    const invoiceData = await this.api.getInvoiceUrl(transactionId);
    
    // Ocultar indicador de carga
    this.ui.hideLoading();
    
    if (invoiceData && invoiceData.success && invoiceData.data && invoiceData.data.url) {
      // Determinar el origen de la factura
      const source = invoiceData.data.source === 'google_drive' ? 'Google Drive' : 'Paddle';
      console.log(`URL de factura obtenida correctamente desde ${source}: ${invoiceData.data.url}`);
      
      // Mostrar mensaje de éxito con el origen
      this.ui.showSuccessMessage(`Factura obtenida correctamente desde ${source}`);
      
      // Abrir factura en nueva pestaña
      window.open(invoiceData.data.url, '_blank');
    } else {
      console.warn('Respuesta de factura inválida:', invoiceData);
      this.ui.showErrorMessage('Error', 'No se pudo obtener la factura. La respuesta no contiene una URL válida.');
    }
  } catch (error) {
    console.error('Error al obtener factura:', error);
    
    // Ocultar indicador de carga en caso de error
    this.ui.hideLoading();
    
    // Mostrar mensaje de error más detallado
    if (error.message && (error.message.includes('403') || error.message.includes('permisos'))) {
      this.ui.showErrorMessage('Error de permisos', 'No tienes acceso a esta factura. Contacta con el soporte técnico si necesitas ayuda.');
    } else if (error.message && error.message.includes('404')) {
      this.ui.showErrorMessage('Error', 'La factura solicitada no existe o ha sido eliminada.');
    } else {
      this.ui.showErrorMessage('Error', 'Ha ocurrido un error al obtener la factura. Inténtalo de nuevo más tarde.');
    }
  }
}
  
  /**
   * Carga la lista de productos para filtros
   */
  async loadProducts() {
    try {
      console.log('Cargando productos para el filtro de transacciones...');
      this.products = await this.api.getProducts();
      
      // Crear un mapeo entre IDs numéricos y IDs de transacciones
      this.productIdMapping = {};
      
      // Extraer IDs únicos de las transacciones
      const transactionProductIds = [...new Set(
        this.transactions
          .filter(t => t.product_id)
          .map(t => t.product_id)
      )];
      
      console.log('IDs de productos en transacciones:', transactionProductIds);
      
      // Mapear los IDs de productos con los IDs de transacciones basados en el nombre
      this.products.forEach(product => {
        const productName = product.nombre;
        
        // Buscar transacciones con este nombre de producto
        const matchingTransactions = this.transactions.filter(t => 
          t.product_name && t.product_name.trim().toLowerCase() === productName.trim().toLowerCase()
        );
        
        if (matchingTransactions.length > 0) {
          // Guardar el mapeo: ID numérico -> ID en formato pro_XXX
          this.productIdMapping[product.id_carrera] = matchingTransactions[0].product_id;
          console.log(`Mapeo creado: ID ${product.id_carrera} (${productName}) -> ${matchingTransactions[0].product_id}`);
        }
      });
      
      console.log('Mapeo de IDs de productos creado:', this.productIdMapping);
      
      // Actualizar selector de productos
      const productSelector = document.getElementById('transaction-product-filter');
      if (productSelector) {
        // Mantener opción por defecto
        const defaultOption = productSelector.querySelector('option[value=""]');
        productSelector.innerHTML = '';
        
        if (defaultOption) {
          productSelector.appendChild(defaultOption);
        } else {
          // Si no existe la opción por defecto, crearla
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'Todos los productos';
          productSelector.appendChild(option);
        }
        
        // Añadir productos
        this.products.forEach(product => {
          const option = document.createElement('option');
          option.value = String(product.id_carrera);
          option.textContent = product.nombre;
          productSelector.appendChild(option);
        });
      } else {
        console.error('Selector de productos no encontrado en el DOM');
      }
    } catch (error) {
      console.error('Error al cargar productos para transacciones:', error);
      this.ui.showErrorMessage('Error', 'No se pudieron cargar los productos para el filtro');
    }
  }


/**
 * Verifica la estructura de las transacciones cargadas
 * Esta función es útil para depurar problemas con el filtrado
 */
debugTransactionStructure() {
  if (!this.transactions || this.transactions.length === 0) {
    console.warn('No hay transacciones para analizar');
    return;
  }
  
  // Tomar una muestra de las transacciones para análisis
  const sampleSize = Math.min(5, this.transactions.length);
  const samples = this.transactions.slice(0, sampleSize);
  
  console.log(`Analizando estructura de ${sampleSize} transacciones de muestra:`);
  
  samples.forEach((transaction, index) => {
    console.log(`Transacción #${index + 1}:`, {
      id: transaction.transaction_id,
      product_id: transaction.product_id,
      product_id_type: typeof transaction.product_id,
      product_name: transaction.product_name,
      id_user: transaction.id_user,
      country_code: transaction.country_code
    });
  });
  
  // Extraer IDs de producto únicos para verificar coincidencia con el selector
  const uniqueProductIds = [...new Set(
    this.transactions
      .filter(t => t.product_id !== undefined && t.product_id !== null)
      .map(t => String(t.product_id))
  )];
  
  console.log(`IDs de producto únicos en transacciones (${uniqueProductIds.length}):`, uniqueProductIds);
  
  // Verificar IDs de productos en el selector
  const productSelector = document.getElementById('transaction-product-filter');
  if (productSelector) {
    const optionValues = Array.from(productSelector.options)
      .map(opt => opt.value)
      .filter(val => val !== '');
    
    console.log(`IDs de producto en selector (${optionValues.length}):`, optionValues);
    
    // Verificar coincidencias
    const matchingIds = uniqueProductIds.filter(id => optionValues.includes(id));
    console.log(`IDs coincidentes entre transacciones y selector: ${matchingIds.length} de ${uniqueProductIds.length}`);
    
    // Si hay discrepancias, mostrar detalles
    if (matchingIds.length < uniqueProductIds.length) {
      console.warn('¡Alerta! Hay IDs de producto en transacciones que no están en el selector');
      console.log('IDs en transacciones pero no en selector:', 
        uniqueProductIds.filter(id => !optionValues.includes(id)));
    }
  } else {
    console.error('Selector de productos no encontrado para depuración');
  }
}
  
  /**
   * Aplica filtros a las transacciones
   * @param {boolean} skipControls - Si se deben omitir los controles de UI
   */
  applyFilters(skipControls = false) {
    if (!skipControls) {
      // Obtener valores de filtros desde UI
      const productFilter = document.getElementById('transaction-product-filter')?.value;
      const countryFilter = document.getElementById('transaction-country-filter')?.value;
      const searchFilter = document.getElementById('transaction-search')?.value;
      
      console.log('Aplicando filtros en transacciones:', {
        product: productFilter,
        country: countryFilter,
        search: searchFilter
      });
      
      // Actualizar configuración de filtros
      this.filterSettings = {
        ...this.filterSettings,
        product_id: productFilter,
        country: countryFilter,
        search: searchFilter
      };
    }
    
    // Resetear paginación
    this.currentPage = 1;
    
    // Si no hay transacciones, salir
    if (!this.transactions || this.transactions.length === 0) {
      console.warn('No hay transacciones para filtrar');
      this.filteredTransactions = [];
      this.updateTransactionsTable();
      return;
    }
    
    // Aplicar filtros
    this.filteredTransactions = this.transactions.filter(transaction => {
      // Filtro por producto - usar el mapeo de IDs
      if (this.filterSettings.product_id) {
        // Obtener el ID en formato pro_XXX correspondiente al ID numérico seleccionado
        const mappedProductId = this.productIdMapping[this.filterSettings.product_id];
        
        if (mappedProductId) {
          if (transaction.product_id !== mappedProductId) {
            return false;
          }
        } else {
          // Si no hay mapeo, usar comparación directa
          if (String(transaction.product_id) !== String(this.filterSettings.product_id)) {
            return false;
          }
        }
      }
      
      // Filtro por usuario específico (viene de otro módulo)
      if (this.filterSettings.userId && String(transaction.id_user) !== String(this.filterSettings.userId)) {
        return false;
      }
      
      // Filtro por país
      if (this.filterSettings.country) {
        if (this.filterSettings.country === 'ES' && transaction.country_code !== 'ES') {
          return false;
        } else if (this.filterSettings.country === 'non-ES' && transaction.country_code === 'ES') {
          return false;
        } else if (this.filterSettings.country !== 'ES' && this.filterSettings.country !== 'non-ES' &&
                 transaction.country_code !== this.filterSettings.country) {
          return false;
        }
      }
      
      // Filtro por fechas
      if (this.filterSettings.startDate && this.filterSettings.endDate) {
        const transDate = new Date(transaction.updated_at || transaction.created_at);
        const startDate = new Date(this.filterSettings.startDate);
        const endDate = new Date(this.filterSettings.endDate);
        
        // Ajustar endDate para incluir todo el día
        endDate.setHours(23, 59, 59, 999);
        
        if (transDate < startDate || transDate > endDate) {
          return false;
        }
      }
      
      // Filtro por búsqueda
      if (this.filterSettings.search) {
        const searchTerm = this.filterSettings.search.toLowerCase();
        const matchesId = transaction.transaction_id?.toLowerCase().includes(searchTerm);
        const matchesUser = transaction.user_email?.toLowerCase().includes(searchTerm) || 
                         String(transaction.id_user).includes(searchTerm);
        const matchesProduct = transaction.product_name?.toLowerCase().includes(searchTerm) ||
                            String(transaction.product_id).includes(searchTerm);
        const matchesCountry = transaction.country_code?.toLowerCase().includes(searchTerm) || 
                             formatCountryName(transaction.country_code || '').toLowerCase().includes(searchTerm);
        
        if (!matchesId && !matchesUser && !matchesProduct && !matchesCountry) {
          return false;
        }
      }
      
      return true;
    });
    
    // Ordenar por fecha (más recientes primero)
    this.filteredTransactions.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      return dateB - dateA;
    });
    
    // Actualizar tabla
    this.updateTransactionsTable();
    
    // Actualizar gráficos
    this.updateCharts();
    this.updateResetButtonVisibility();
  }
  
  /**
   * Inicializa los gráficos del módulo
   */
  initCharts() {
    if (!this.transactions || this.transactions.length === 0) return;
    
    // Destruir gráficos existentes antes de crear nuevos
    this.destroyCharts();
    
    // Verificar que los contenedores de gráficos existen
    const paymentMethodsEl = document.getElementById('payment-methods-chart');
    const currencyChartEl = document.getElementById('currency-chart');
    
    if (!paymentMethodsEl || !currencyChartEl) {
      console.warn('Contenedores de gráficos no encontrados');
      return;
    }
    
    // Inicializar gráfico de métodos de pago
    this.initPaymentMethodsChart();
    
    // Inicializar gráfico de divisas
    this.initCurrencyChart();
  }

  /**
 * Destruye los gráficos existentes para evitar duplicados
 */
  destroyCharts() {
    // Destruir gráfico de métodos de pago si existe
    if (this.charts.paymentMethods) {
      this.charts.paymentMethods.destroy();
      this.charts.paymentMethods = null;
    }
    
    // Destruir gráfico de divisas si existe
    if (this.charts.currency) {
      this.charts.currency.destroy();
      this.charts.currency = null;
    }
    
    // Verificación adicional usando Chart.getChart para asegurar que los canvas estén limpios
    const paymentMethodsChart = Chart.getChart('payment-methods-chart');
    if (paymentMethodsChart) {
      paymentMethodsChart.destroy();
    }
    
    const currencyChart = Chart.getChart('currency-chart');
    if (currencyChart) {
      currencyChart.destroy();
    }
  }

/**
 * Se ejecuta cuando se desactiva la sección de transacciones
 */
onSectionDeactivated() {
  // Destruir gráficos para liberar recursos
  this.destroyCharts();
}
  
  /**
   * Inicializa el gráfico de métodos de pago
   */
initPaymentMethodsChart() {
  const ctx = document.getElementById('payment-methods-chart');
  if (!ctx) return;
  
  // Verificación adicional: si ya existe un gráfico en este canvas, destruirlo
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }
  
  // NUEVO: Verificar si hay datos para mostrar
  if (!this.filteredTransactions || this.filteredTransactions.length === 0) {
    // Crear gráfico con mensaje "Sin datos"
    this.charts.paymentMethods = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Sin datos en el período seleccionado'],
        datasets: [{
          label: 'Monto (EUR)',
          data: [0],
          backgroundColor: 'rgba(200, 200, 200, 0.5)',
          borderColor: 'rgba(200, 200, 200, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false,
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR');
              }
            }
          }
        }
      }
    });
    return;
  }
    
    // Obtener datos para el gráfico usando amount_eur para consistencia
    const paymentMethodTotals = {};
    const paymentMethodTransactions = {};
    const methodCurrencies = {}; // Para tracking de monedas por método
    
    // Usar transactions filtradas en lugar de todas las transacciones
    this.filteredTransactions.forEach(transaction => {
      const method = transaction.payment_method || 'unknown';
      
      // Usar amount_eur para consistencia entre divisas
      const amount = parseFloat(transaction.amount_eur || 0);
      const currency = transaction.currency_code || 'EUR';
      
      // Inicializar contadores si es necesario
      if (!paymentMethodTotals[method]) {
        paymentMethodTotals[method] = 0;
        paymentMethodTransactions[method] = 0;
        methodCurrencies[method] = {};
      }
      
      // Si es una moneda que no hemos visto antes para este método, inicializarla
      if (!methodCurrencies[method][currency]) {
        methodCurrencies[method][currency] = 0;
      }
      
      // Acumular totales (ya en EUR)
      paymentMethodTotals[method] += amount;
      paymentMethodTransactions[method]++;
      methodCurrencies[method][currency]++;
    });
    
    console.log('Datos para gráfico de métodos de pago (totales en EUR):', paymentMethodTotals);
    
    // Ordenar métodos por monto total (de mayor a menor)
    const sortedMethods = Object.keys(paymentMethodTotals).sort((a, b) => 
      paymentMethodTotals[b] - paymentMethodTotals[a]
    );
    
    // Mapeo de nombres de métodos para mejor visualización
    const methodNames = {
      'card': 'Tarjeta',
      'bank_transfer': 'Transferencia',
      'paypal': 'PayPal',
      'apple_pay': 'Apple Pay',
      'google_pay': 'Google Pay',
      'unknown': 'Desconocido'
    };
    
    // Preparar datos para el gráfico
    const data = {
      labels: sortedMethods.map(method => {
        const count = paymentMethodTransactions[method];
        return `${methodNames[method] || method} (${count})`;
      }),
      datasets: [{
        label: 'Monto (EUR)',
        data: sortedMethods.map(method => paymentMethodTotals[method].toFixed(2)),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }]
    };
    
    // Configuración para gráfico de barras horizontales
    const config = {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Barras horizontales para mejor visualización
        plugins: {
          legend: {
            display: false, // No necesitamos leyenda para barras
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                // Extraer método de pago del label (quitar el contador)
                const methodWithCount = context[0].label;
                const method = methodWithCount.split(' (')[0];
                return method;
              },
              label: function(context) {
                const value = parseFloat(context.raw);
                const method = sortedMethods[context.dataIndex];
                const total = context.chart.data.datasets[0].data.reduce(
                  (sum, val) => sum + parseFloat(val), 0
                );
                const percentage = (value * 100 / total).toFixed(1);
                
                // Mostrar monto en euros y porcentaje
                return `Total: ${formatCurrency(value, 'EUR')} (${percentage}%)`;
              },
              afterLabel: function(context) {
                const method = sortedMethods[context.dataIndex];
                const currencies = methodCurrencies[method];
                
                // Crear un desglose por monedas si hay más de una
                if (currencies && Object.keys(currencies).length > 0) {
                  const lines = [];
                  
                  // Mostrar número de transacciones por moneda
                  for (const [currency, count] of Object.entries(currencies)) {
                    lines.push(`${currency}: ${count} transacciones`);
                  }
                  
                  return lines;
                }
                
                return null;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR');
              }
            }
          }
        }
      },
    };
    
    // Crear gráfico
    this.charts.paymentMethods = new Chart(ctx, config);
  }
  
/**
 * Inicializa el gráfico de distribución por divisas
 * Corregido para usar amount_eur para todas las monedas 
 */
initCurrencyChart() {
  const ctx = document.getElementById('currency-chart');
  if (!ctx) return;
  
  // Verificación adicional: si ya existe un gráfico en este canvas, destruirlo
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }
  
  // NUEVO: Verificar si hay datos para mostrar
  if (!this.filteredTransactions || this.filteredTransactions.length === 0) {
    // Crear gráfico con mensaje "Sin datos"
    this.charts.currency = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sin datos en el período seleccionado'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.5)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          }
        }
      }
    });
    return;
  }
  
  // Obtener datos para el gráfico usando amount_eur para consistencia
  const currencyTotals = {};
  const currencyTransactions = {};
  const currencyOriginalTotals = {}; // Montos originales (sin conversión)
  const currencyRates = {}; // Tasas promedio por moneda
  
  // Usar transactions filtradas en lugar de todas las transacciones
  this.filteredTransactions.forEach(transaction => {
    const currency = transaction.currency_code || 'EUR';
    
    // Usamos amount_eur para el gráfico (ya convertido a EUR)
    const amountEur = parseFloat(transaction.amount_eur || 0);
    // También guardamos el monto original para mostrar en tooltip
    const amountOriginal = parseFloat(transaction.amount || 0);
    const exchangeRate = parseFloat(transaction.exchange_rate || 1);
    
    // Inicializar acumuladores si es necesario
    if (!currencyTotals[currency]) {
      currencyTotals[currency] = 0;
      currencyTransactions[currency] = 0;
      currencyOriginalTotals[currency] = 0;
      currencyRates[currency] = [];
    }
    
    // Acumular totales y datos
    currencyTotals[currency] += amountEur;
    currencyOriginalTotals[currency] += amountOriginal;
    currencyTransactions[currency]++;
    currencyRates[currency].push(exchangeRate);
  });
  
  console.log('Datos para gráfico de divisas (totales en EUR):', currencyTotals);
  
  // Calcular tasas promedio para cada moneda
  const averageRates = {};
  for (const [currency, rates] of Object.entries(currencyRates)) {
    if (rates.length > 0) {
      const sum = rates.reduce((total, rate) => total + rate, 0);
      averageRates[currency] = sum / rates.length;
    } else {
      averageRates[currency] = 1; // Valor por defecto
    }
  }
  
  // Ordenar divisas por monto total (de mayor a menor)
  const sortedCurrencies = Object.keys(currencyTotals).sort((a, b) => 
    currencyTotals[b] - currencyTotals[a]
  );
  
  // Mejores nombres de divisas para mostrar
  const currencyNames = {
    'EUR': 'Euro',
    'USD': 'Dólar US',
    'GBP': 'Libra',
    'MXN': 'Peso MX',
    'COP': 'Peso CO',
    'ARS': 'Peso AR',
    'CLP': 'Peso CL',
    'PEN': 'Sol Peruano',
    'VES': 'Bolívar VE',
    'BOB': 'Boliviano',
    'PYG': 'Guaraní PY',
    'UYU': 'Peso UY',
    'GTQ': 'Quetzal GT',
    'HNL': 'Lempira HN',
    'CRC': 'Colón CR',
    'PAB': 'Balboa PA',
    'DOP': 'Peso DO'
  };
  
  // Preparar datos para el gráfico
  const data = {
    labels: sortedCurrencies.map(currency => {
      const count = currencyTransactions[currency];
      return `${currencyNames[currency] || currency} (${count})`;
    }),
    datasets: [{
      label: 'Monto (EUR)',
      data: sortedCurrencies.map(currency => currencyTotals[currency].toFixed(2)),
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(199, 199, 199, 1)'
      ],
      borderWidth: 1
    }]
  };
  
  // Configuración para gráfico de dona
  const config = {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              const currency = sortedCurrencies[context[0].dataIndex];
              return `${currencyNames[currency] || currency}`;
            },
            label: function(context) {
              const currency = sortedCurrencies[context.dataIndex];
              const valueEur = parseFloat(context.raw);
              const totalEur = context.dataset.data.reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
              const percentage = (valueEur * 100 / totalEur).toFixed(1);
              
              // Mostrar total en EUR (principal)
              return `Total EUR: ${formatCurrency(valueEur, 'EUR')} (${percentage}%)`;
            },
            afterLabel: function(context) {
              const currency = sortedCurrencies[context.dataIndex];
              const lines = [];
              
              // Si no es EUR, mostrar también el total en moneda original
              if (currency !== 'EUR') {
                const originalTotal = currencyOriginalTotals[currency];
                const avgRate = averageRates[currency];
                
                lines.push(`Total ${currency}: ${formatCurrency(originalTotal, currency)}`);
                lines.push(`Tasa promedio: 1 ${currency} ≈ ${avgRate.toFixed(5)} EUR`);
                lines.push(`Transacciones: ${currencyTransactions[currency]}`);
              } else {
                lines.push(`Transacciones: ${currencyTransactions[currency]}`);
              }
              
              return lines;
            }
          }
        }
      }
    },
  };
  
  // Crear gráfico
  this.charts.currency = new Chart(ctx, config);
}
  
  /**
   * Actualiza los gráficos con los datos filtrados
   */
updateCharts() {
  // Si no hay gráficos inicializados o no hay contenedores, salir
  const paymentMethodsEl = document.getElementById('payment-methods-chart');
  const currencyChartEl = document.getElementById('currency-chart');
  
  if (!paymentMethodsEl || !currencyChartEl) {
    console.warn('Contenedores de gráficos no encontrados para actualización');
    return;
  }
  
  // Destruir los gráficos existentes por completo para evitar errores
  this.destroyCharts();
  
  // NUEVO: Registrar la cantidad de datos
  console.log(`Actualizando gráficos con ${this.filteredTransactions.length} transacciones filtradas`);
  
  // Volver a crear desde cero
  this.initPaymentMethodsChart();
  this.initCurrencyChart();
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
 * Refresca los datos de transacciones
 * @param {boolean} forceReload - Si se debe forzar la recarga desde API
 */
async refreshTransactions(forceReload = false) {
  // Si no se fuerza recarga y tenemos datos y rango de fechas, usar filtrado local
  if (!forceReload && this.allTransactions.length > 0 && this.dateRange) {
    console.log('Transacciones: Usando filtrado local en lugar de recarga completa');
    this.refreshTransactionsWithLocalData();
    return;
  }
  
  // En caso contrario, hacer petición a API
  console.log('Transacciones: Recargando datos desde API');
  
  // Limpiar caché para obtener datos frescos
  this.api.clearCache('transactions');
  
  // Recargar datos
  await this.loadTransactionData();
}
  
/**
 * Exporta los datos de transacciones con formato personalizado, análisis y ajuste forzado al ancho de página
 */
exportTransactions() {
  try {
    // Obtener formato seleccionado en el selector o usar formato preferido del usuario
    const selectedFormat = document.getElementById('export-format')?.value;
    // Usar exportManager.getPreferredFormat como fallback si no hay formato seleccionado
    const format = selectedFormat || exportManager.getPreferredFormat('excel');
    
    console.log(`Exportando en formato: ${format}`);
    
    // Datos a exportar con los campos específicos requeridos
    const data = this.filteredTransactions.map(transaction => {
      // Normalizamos los montos - asegurándonos que sean números, no strings
      const amount = Number(this.normalizeAmount(transaction.amount));
      const amountEur = Number(this.normalizeAmount(transaction.amount_eur));
      const taxAmount = Number(transaction.tax_amount || 0);
      const taxAmountEur = Number(transaction.tax_amount_eur || 0);
      const earnings = Number(transaction.earnings || 0);
      const earningsEur = Number(transaction.earnings_eur || 0);
      
      return {
        'ID Transacción': transaction.transaction_id,
        'ID Usuario': transaction.id_user,
        'Producto': transaction.product_name || transaction.product_id,
        'Importe Original': amount,
        'Moneda': transaction.currency_code || 'EUR',
        'Importe EUR': amountEur,
        'IVA EUR': taxAmountEur,
        'Ingreso Neto EUR': earningsEur,
        'Método Pago': transaction.payment_method || 'Desconocido',
        'País': formatCountryName(transaction.country_code || 'Desconocido'),
        'Fecha': formatDate(transaction.updated_at, 'YYYY-MM-DD HH:mm:ss'),
        'Tipo': transaction.event_type || 'transaction.completed',
        'Intervalo': transaction.interval || 'N/A',
        'URL Factura': transaction.invoice_url || 'No disponible'
      };
    });
    
    // Crear título con rango de fechas si están disponibles
    let title = 'Reporte de Transacciones';
    let dateRangeInfo = '';
    
    if (this.filterSettings.startDate && this.filterSettings.endDate) {
      const startDate = new Date(this.filterSettings.startDate).toLocaleDateString();
      const endDate = new Date(this.filterSettings.endDate).toLocaleDateString();
      dateRangeInfo = ` (${startDate} - ${endDate})`;
      title += dateRangeInfo;
    }
    
    // Nombre del archivo
    const fileName = `transacciones_${new Date().toISOString().slice(0, 10)}`;
    
    // Columnas que deben tener totales y formato de contabilidad
    const columnsWithTotals = ['Importe EUR', 'IVA EUR', 'Ingreso Neto EUR'];
    
    // Columnas con formato específico de moneda
    const currencyFormats = {
      'Importe Original': '$#,##0.00',
      'Importe EUR': '€#,##0.00',
      'IVA EUR': '€#,##0.00',
      'Ingreso Neto EUR': '€#,##0.00'
    };
    
    // Análisis de métodos de pago
    const paymentMethods = {};
    const paymentMethodsAmount = {};
    
    // Análisis de países
    const countries = {};
    const countriesAmount = {};
    
    // Recopilar datos para análisis
    data.forEach(transaction => {
      // Métodos de pago
      const paymentMethod = transaction['Método Pago'];
      paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + 1;
      paymentMethodsAmount[paymentMethod] = (paymentMethodsAmount[paymentMethod] || 0) + Number(transaction['Importe EUR']);
      
      // Países
      const country = transaction['País'];
      countries[country] = (countries[country] || 0) + 1;
      countriesAmount[country] = (countriesAmount[country] || 0) + Number(transaction['Importe EUR']);
    });
    
    // Ordenar métodos de pago por monto
    const sortedPaymentMethods = Object.keys(paymentMethodsAmount)
      .sort((a, b) => paymentMethodsAmount[b] - paymentMethodsAmount[a])
      .slice(0, 5); // Top 5
    
    // Ordenar países por monto
    const sortedCountries = Object.keys(countriesAmount)
      .sort((a, b) => countriesAmount[b] - countriesAmount[a])
      .slice(0, 5); // Top 5
    
    // Total general
    const totalAmount = data.reduce((sum, transaction) => sum + Number(transaction['Importe EUR']), 0);
    
    // Crear resumen para métodos de pago
    const paymentMethodsSummary = {};
    sortedPaymentMethods.forEach(method => {
      const amount = paymentMethodsAmount[method];
      const count = paymentMethods[method];
      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      paymentMethodsSummary[method] = {
        amount,
        count,
        percentage
      };
    });
    
    // Crear resumen para países
    const countriesSummary = {};
    sortedCountries.forEach(country => {
      const amount = countriesAmount[country];
      const count = countries[country];
      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      countriesSummary[country] = {
        amount,
        count,
        percentage
      };
    });

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
      'ID Transacción': 35,
      'ID Usuario': 25,
      'Producto': 80,
      'Importe Original': 40,
      'Moneda': 25,
      'Importe EUR': 40,
      'IVA EUR': 35,
      'Ingreso Neto EUR': 40,
      'Método Pago': 50,
      'País': 40,
      'Fecha': 50,
      'Tipo': 50,
      'Intervalo': 30,
      'URL Factura': 50
    };
    
    // Opciones de truncamiento para PDF
    const truncateOptions = format === 'pdf' ? {
      truncateText: {
        'Producto': 25,
        'Método Pago': 15,
        'País': 12,
        'URL Factura': 20,
        'Tipo': 15
      }
    } : {};
    
    // Exportar con formato avanzado y configuración personalizada
    exportManager.exportData(data, {
      fileName,
      format,
      sheetName: 'Transacciones',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: title,
      columnsWithTotals: columnsWithTotals,
      currencyFormats: currencyFormats,
      // Definir anchos de columna como guía
      columnWidths: columnWidths,
      // Opciones de truncamiento de texto para PDF
      ...truncateOptions,
      // Incluir opciones específicas para PDF si es el formato seleccionado
      ...(format === 'pdf' ? pdfOptions : {}),
      // Añadir resúmenes de análisis
      transactionAnalysis: {
        totalAmount,
        paymentMethods: paymentMethodsSummary,
        countries: countriesSummary
      }
    });
    
    this.ui.showSuccessMessage(`Transacciones exportadas correctamente en formato ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error al exportar transacciones:', error);
    this.ui.showErrorMessage('Error al exportar', 'No se pudieron exportar los datos de transacciones.');
  }
}
}