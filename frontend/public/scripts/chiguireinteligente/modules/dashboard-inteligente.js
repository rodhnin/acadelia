/**
 * Módulo del Dashboard principal
 * Muestra resumen financiero, gráficos y transacciones recientes
 * con conversión correcta de monedas y KPIs mejorados
 */

import { formatCurrency, formatPercentage, formatDate, formatCountryName } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';

export class DashboardModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.currentSection = null;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.dateRange = null;
    this.summaryData = null;
  }
  
  /**
   * Verifica si una suscripción debe considerarse como cancelada
   * @param {Object} subscription - Objeto de suscripción
   * @returns {boolean} true si la suscripción está cancelada o expirada
   */
  isSubscriptionCancelled(subscription) {
    return subscription.status === 'canceled' || subscription.status === 'expired';
  }
  
  /**
   * Inicializa el módulo de dashboard
   */
async init() {
  console.log('Inicializando módulo de dashboard');
  
  this.allTransactions = [];
  this.allSubscriptions = [];
  this.dateRange = null;
  
  this.setupEventListeners();
  
  this.eventBus.on('dateRangeChanged', (range) => {
    console.log('Dashboard: Rango de fechas cambiado:', range);
    this.dateRange = range;
    // En lugar de hacer nuevas peticiones, filtramos los datos que ya tenemos
    this.refreshDashboardWithLocalData();
  });
  
  await this.loadDashboardData();
}
  
  /**
   * Configura event listeners específicos del dashboard
   */
  setupEventListeners() {
    document.querySelectorAll('[data-period]').forEach(button => {
      button.addEventListener('click', (e) => {
        document.querySelectorAll('[data-period]').forEach(btn => {
          btn.classList.remove('active');
        });
        
        e.target.classList.add('active');
        
        const period = e.target.getAttribute('data-period');
        this.updateRevenueChart(period);
      });
    });
    
    // Redimensionar gráficos cuando se muestra la sección
    document.addEventListener('sectionChanged', (e) => {
      if (e.detail.section === 'dashboard') {
        this.currentSection = 'dashboard';
        this.resizeCharts();
      } else if (this.currentSection === 'dashboard') {
        // Estábamos en dashboard y ahora cambiamos a otra sección
        this.currentSection = e.detail.section;
        this.destroyAllCharts();
      } else {
        this.currentSection = e.detail.section;
      }
    });
  }

  destroyAllCharts() {
  if (this.charts) {
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        try {
          this.charts[key].destroy();
        } catch (error) {
          console.warn(`Error al destruir gráfico ${key}:`, error);
        }
        this.charts[key] = null;
      }
    });
  }
}

/**
 * Se ejecuta cuando se activa la sección de dashboard
 */
onSectionActivated() {
  console.log('Dashboard: Sección activada');
  
  this.currentSection = 'dashboard';
  
  const hasCharts = this.charts.revenue || 
                   this.charts.products || 
                   this.charts.geo ||
                   this.charts.currency;
  
  if (!hasCharts) {
    console.log('Dashboard: Recreando gráficos que fueron destruidos');
    // Si tenemos datos pero no gráficos, inicializar los gráficos
    if (this.summaryData) {
      this.initCharts();
    } else {
      // Si no tenemos datos ni gráficos, cargar todo
      this.loadDashboardData();
    }
  } else {
    // Si los gráficos existen, asegurarnos de que se dimensionen correctamente
    this.resizeCharts();
  }
}
  
  /**
   * Carga los datos del dashboard
   */
async loadDashboardData() {
  try {
    console.log('Dashboard: Cargando datos iniciales desde API');
    const [transactions, subscriptions] = await Promise.all([
      this.api.getTransactions(),
      this.api.getSubscriptions()
    ]);
    
    this.allTransactions = transactions;
    this.allSubscriptions = subscriptions;
    
    if (this.dateRange) {
      console.log('Dashboard: Aplicando filtro de fechas a datos recién cargados');
      const filteredData = this.filterDataByDateRange(transactions, subscriptions, this.dateRange);
      this.summaryData = this.generateSummaryData(filteredData.transactions, filteredData.subscriptions);
    } else {
      // Si no hay rango, usar todos los datos
      console.log('Dashboard: Sin rango de fechas, usando todos los datos');
      this.summaryData = this.generateSummaryData(transactions, subscriptions);
    }
    
    this.updateDashboardUI();
    
    this.initCharts();
    
    return true;
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
    this.ui.showErrorMessage('Error al cargar dashboard', 'No se pudieron obtener los datos necesarios para el dashboard.');
    return false;
  }
}
  

/**
 * Genera datos resumidos para el dashboard
 * @param {Array} transactions - Transacciones
 * @param {Array} subscriptions - Suscripciones
 * @returns {Object} Datos resumidos
 */
generateSummaryData(transactions, subscriptions) {
  // PARTE 1: CÁLCULO DE PERÍODOS

  let startDate, endDate, prevStartDate, prevEndDate;
  
  if (this.dateRange) {
    // Si hay un rango seleccionado, usarlo
    startDate = new Date(this.dateRange.start);
    endDate = new Date(this.dateRange.end);
    
    // Asegurar que endDate incluye todo el día
    endDate.setHours(23, 59, 59, 999);
    
    const duration = endDate.getTime() - startDate.getTime();
    prevEndDate = new Date(startDate.getTime() - 1); // Día anterior al inicio del período actual
    prevStartDate = new Date(prevEndDate.getTime() - duration); // Mismo número de días
  } else {
    // Si no hay rango seleccionado, usar mes actual/anterior como fallback
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    startDate = new Date(currentYear, currentMonth, 1);
    endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    // Período anterior (mes anterior)
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    prevStartDate = new Date(lastMonthYear, lastMonth, 1);
    prevEndDate = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59, 999);
  }
  
  console.log('Calculando KPIs para período:', startDate, 'a', endDate);
  console.log('Comparando con período anterior:', prevStartDate, 'a', prevEndDate);
  
  // PARTE 2: FILTRAR TRANSACCIONES SEGÚN LOS PERÍODOS CALCULADOS
  const currentPeriodTransactions = transactions.filter(t => {
    if (!t.updated_at) return false;
    const txDate = new Date(t.updated_at);
    return txDate >= startDate && txDate <= endDate;
  });
  
  const prevPeriodTransactions = transactions.filter(t => {
    if (!t.updated_at) return false;
    const txDate = new Date(t.updated_at);
    return txDate >= prevStartDate && txDate <= prevEndDate;
  });
  
  // PARTE 3: CÁLCULO DE INGRESOS
  // Importante: Usar earnings_eur para ingresos netos, no amount_eur
  const totalEarnings = currentPeriodTransactions.reduce((sum, t) => 
    sum + parseFloat(t.earnings_eur || 0), 0);
  
  const prevPeriodEarnings = prevPeriodTransactions.reduce((sum, t) => 
    sum + parseFloat(t.earnings_eur || 0), 0);
  
  // CORRECCIÓN: Calcular incremento porcentual de ingresos netos correctamente
  let earningsIncrease = 0;
  if (prevPeriodEarnings === 0) {
    earningsIncrease = totalEarnings > 0 ? 100 : 0;
  } else {
    earningsIncrease = ((totalEarnings - prevPeriodEarnings) / prevPeriodEarnings) * 100;
  }
  
  console.log(`INGRESOS - Actual: ${totalEarnings}, Anterior: ${prevPeriodEarnings}, Cambio: ${earningsIncrease}%`);
  
  // PARTE 4: CÁLCULO DE LOS DEMÁS KPIS
  const totalRevenueBruto = currentPeriodTransactions.reduce((sum, t) => 
    sum + parseFloat(t.amount_eur || 0), 0);
  
  const totalFees = currentPeriodTransactions.reduce((sum, t) => 
    sum + parseFloat(t.fee_amount_eur || 0), 0);
  
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  
  // CORRECCIÓN: Contar suscripciones expiradas SOLO en el período actual
  const expiredSubscriptions = subscriptions.filter(s => {
    if (s.status !== 'expired') return false;
    if (!s.updated_at) return false;
    const expireDate = new Date(s.updated_at);
    return expireDate >= startDate && expireDate <= endDate;
  }).length;
  
  // CORRECCIÓN: Contar nuevas suscripciones creadas en el período actual
  const newSubscriptions = subscriptions.filter(s => {
    if (!s.created_at) return false;
    const createDate = new Date(s.created_at);
    return createDate >= startDate && createDate <= endDate;
  }).length;
  
  const totalTax = currentPeriodTransactions.reduce((sum, t) => 
    sum + parseFloat(t.tax_amount_eur || 0), 0);
  
  const spainTransactions = currentPeriodTransactions.filter(t => t.country_code === 'ES');
  const spainTax = spainTransactions.reduce((sum, t) => 
    sum + parseFloat(t.tax_amount_eur || 0), 0);
  
  const spainTaxPercentage = totalTax === 0 ? 0 : (spainTax / totalTax) * 100;
  
  // CORRECCIÓN: Calcular tasa de cancelación solo para el período actual
  const canceledSubscriptions = subscriptions.filter(s => {
    if (s.status !== 'canceled') return false;
    if (!s.updated_at) return false;
    const cancelDate = new Date(s.updated_at);
    return cancelDate >= startDate && cancelDate <= endDate;
  }).length;
  
  const relevantSubscriptionsForRate = activeSubscriptions + canceledSubscriptions;
  const cancellationRate = relevantSubscriptionsForRate === 0 ? 0 : 
    (canceledSubscriptions / relevantSubscriptionsForRate) * 100;
  
  // PAÍS CON MÁS DEMANDA
  const countryCounts = {};
  currentPeriodTransactions.forEach(t => {
    const countryCode = t.country_code || 'UNKNOWN';
    countryCounts[countryCode] = (countryCounts[countryCode] || 0) + 1;
  });
  
  let topCountry = { code: 'UNKNOWN', count: 0 };
  for (const [code, count] of Object.entries(countryCounts)) {
    if (count > topCountry.count) {
      topCountry = { code, count };
    }
  }
  
  // PRODUCTO CON MÁS DEMANDA
  const productCounts = {};
  currentPeriodTransactions.forEach(t => {
    const productId = t.product_id;
    productCounts[productId] = (productCounts[productId] || 0) + 1;
  });
  
  let topProduct = { id: null, name: 'Desconocido', count: 0 };
  for (const [id, count] of Object.entries(productCounts)) {
    if (count > topProduct.count) {
      const product = currentPeriodTransactions.find(t => t.product_id === id);
      topProduct = { 
        id, 
        name: product?.product_name || `Producto ${id}`,
        count 
      };
    }
  }
  
  // CORRECCIÓN: MARGEN PROMEDIO - calcular correctamente como (earnings_eur / amount_eur) * 100
  const totalAmountEur = currentPeriodTransactions.reduce((sum, t) => 
    sum + parseFloat(t.amount_eur || 0), 0);
  
  const averageMargin = totalAmountEur === 0 ? 0 : (totalEarnings / totalAmountEur) * 100;
  
  // TRANSACCIONES PROMEDIO POR DÍA
  const periodDurationMs = endDate.getTime() - startDate.getTime();
  const periodDays = Math.max(1, Math.ceil(periodDurationMs / (1000 * 60 * 60 * 24)));
  const avgTransactionsPerDay = currentPeriodTransactions.length / periodDays;
  
  // Recopilar datos por producto para gráfico de distribución
  const productData = this.generateProductData(currentPeriodTransactions);
  
  // Recopilar datos geográficos
  const geoData = this.generateGeoData(currentPeriodTransactions);
  
  // Recopilar datos de divisas
  const currencyData = this.generateCurrencyData(currentPeriodTransactions);
  
  const recentTransactions = [...currentPeriodTransactions]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);
  
  // DEBUGGING: Mostrar conteos para ayudar a identificar problemas
  console.log(`DASHBOARD STATS: ${currentPeriodTransactions.length} transacciones en período actual`);
  console.log(`DASHBOARD STATS: ${prevPeriodTransactions.length} transacciones en período anterior`);
  console.log(`DASHBOARD STATS: Ingresos actuales: ${totalEarnings}, Ingresos anteriores: ${prevPeriodEarnings}`);
  console.log(`DASHBOARD STATS: Variación porcentual: ${earningsIncrease}%`);
  console.log(`DASHBOARD STATS: Nuevas suscripciones en período: ${newSubscriptions}`);
  console.log(`DASHBOARD STATS: Suscripciones expiradas en período: ${expiredSubscriptions}`);
  console.log(`DASHBOARD STATS: Cancelaciones en período: ${canceledSubscriptions}`);
  
  return {
    totalEarnings,          // Ingresos NETOS (basados en earnings_eur)
    earningsIncrease,       // CORREGIDO: Incremento correctamente calculado
    totalRevenueBruto,      // Ingresos BRUTOS (basados en amount_eur)
    totalFees,              // Comisiones totales
    activeSubscriptions,
    expiredSubscriptions,   // CORREGIDO: Solo expiradas en el período
    newSubscriptions,       // CORREGIDO: Solo nuevas en el período
    totalTax,
    spainTaxPercentage,
    cancellationRate,
    canceledSubscriptions,  // CORREGIDO: Solo canceladas en el período
    topCountry,
    topProduct,
    averageMargin,          // CORREGIDO: Cálculo correcto del margen
    avgTransactionsPerDay,
    productData,
    geoData,
    currencyData,
    recentTransactions,
    allTransactions: transactions,
    allSubscriptions: subscriptions,
    currentPeriod: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      transactionCount: currentPeriodTransactions.length
    },
    previousPeriod: {
      startDate: prevStartDate.toISOString(),
      endDate: prevEndDate.toISOString(),
      transactionCount: prevPeriodTransactions.length,
      totalEarnings: prevPeriodEarnings  // Añadir para referencia
    }
  };
}
  
  /**
   * Genera datos agrupados por producto
   * @param {Array} transactions - Transacciones a analizar
   * @returns {Object} Datos agrupados por producto
   */
  generateProductData(transactions) {
    const products = {};
    
    transactions.forEach(t => {
      const productId = t.product_id;
      const productName = t.product_name || `Producto ${productId}`;
      
      const earnings = parseFloat(t.earnings_eur || 0);
      const amount = parseFloat(t.amount_eur || 0);
      
      if (!products[productId]) {
        products[productId] = {
          id: productId,
          name: productName,
          total: 0,       // Ingresos netos
          brutoTotal: 0,  // Ingresos brutos
          count: 0,
          // Datos adicionales para tooltip mejorado
          currencies: {}
        };
      }
      
      products[productId].total += earnings;
      products[productId].brutoTotal += amount;
      products[productId].count += 1;
      
      const currency = t.currency_code || 'EUR';
      if (!products[productId].currencies[currency]) {
        products[productId].currencies[currency] = {
          originalTotal: 0,
          originalEarnings: 0,
          count: 0
        };
      }
      
      products[productId].currencies[currency].originalTotal += parseFloat(t.amount || 0);
      products[productId].currencies[currency].originalEarnings += parseFloat(t.earnings || 0);
      products[productId].currencies[currency].count += 1;
    });
    
    return Object.values(products);
  }
  
  /**
   * Genera datos agrupados por país
   * @param {Array} transactions - Transacciones a analizar
   * @returns {Object} Datos agrupados por país
   */
  generateGeoData(transactions) {
    const countries = {};
    
    transactions.forEach(t => {
      const countryCode = t.country_code || 'UNKNOWN';
      
      const earnings = parseFloat(t.earnings_eur || 0);
      const amount = parseFloat(t.amount_eur || 0);
      
      if (!countries[countryCode]) {
        countries[countryCode] = {
          code: countryCode,
          name: formatCountryName(countryCode),
          total: 0,         // Ingresos netos
          brutoTotal: 0,    // Ingresos brutos
          count: 0,
          // Datos adicionales para tooltip mejorado
          currencies: {}
        };
      }
      
      countries[countryCode].total += earnings;
      countries[countryCode].brutoTotal += amount;
      countries[countryCode].count += 1;
      
      const currency = t.currency_code || 'EUR';
      if (!countries[countryCode].currencies[currency]) {
        countries[countryCode].currencies[currency] = {
          originalTotal: 0,
          originalEarnings: 0,
          count: 0
        };
      }
      
      countries[countryCode].currencies[currency].originalTotal += parseFloat(t.amount || 0);
      countries[countryCode].currencies[currency].originalEarnings += parseFloat(t.earnings || 0);
      countries[countryCode].currencies[currency].count += 1;
    });
    
    return Object.values(countries);
  }
  
  /**
   * Genera datos agrupados por divisa
   * @param {Array} transactions - Transacciones a analizar
   * @returns {Object} Datos agrupados por divisa
   */
  generateCurrencyData(transactions) {
    const currencies = {};
    
    transactions.forEach(t => {
      const currencyCode = t.currency_code || 'EUR';
      
      if (!currencies[currencyCode]) {
        currencies[currencyCode] = {
          code: currencyCode,
          amountTotal: 0,        // Total bruto en EUR
          amountOriginal: 0,     // Total bruto en moneda original
          earningsTotal: 0,      // Total neto en EUR
          earningsOriginal: 0,   // Total neto en moneda original
          feesTotal: 0,          // Comisiones en EUR
          taxTotal: 0,           // Impuestos en EUR
          count: 0,
          avgRate: 0             // Tasa de cambio promedio
        };
      }
      
      currencies[currencyCode].amountTotal += parseFloat(t.amount_eur || 0);
      currencies[currencyCode].amountOriginal += parseFloat(t.amount || 0);
      currencies[currencyCode].earningsTotal += parseFloat(t.earnings_eur || 0);
      currencies[currencyCode].earningsOriginal += parseFloat(t.earnings || 0);
      currencies[currencyCode].feesTotal += parseFloat(t.fee_amount_eur || 0);
      currencies[currencyCode].taxTotal += parseFloat(t.tax_amount_eur || 0);
      currencies[currencyCode].count += 1;
    });
    
    Object.values(currencies).forEach(currency => {
      if (currency.code !== 'EUR' && currency.amountOriginal > 0) {
        currency.avgRate = currency.amountTotal / currency.amountOriginal;
      } else {
        currency.avgRate = 1;
      }
    });
    
    return Object.values(currencies);
  }
  
  /**
   * Actualiza la UI del dashboard con los datos resumidos
   */
updateDashboardUI() {
  if (!this.summaryData) return;
  
  
  // Ingresos (mostrar ingresos netos)
  this.ui.updateElement('total-revenue', formatCurrency(this.summaryData.totalEarnings));
  
  // Variación vs período anterior (usando el valor calculado)
  const increaseValue = this.summaryData.earningsIncrease;
  
  console.log(`UI: Actualizando incremento a ${increaseValue}%`);
  
  // Actualización directa del elemento sin usar this.ui.updateElement
  const increaseElement = document.getElementById('revenue-increase');
  if (increaseElement) {
    increaseElement.textContent = formatPercentage(increaseValue, false);
    
    // También actualizar clases y colores según el valor
    if (increaseValue < 0) {
      increaseElement.classList.remove('text-primary');
      increaseElement.classList.remove('text-info');
      increaseElement.classList.remove('text-white');
      increaseElement.classList.remove('text-success');
      increaseElement.classList.add('text-danger');
      
      const iconElement = increaseElement.previousElementSibling;
      if (iconElement && iconElement.classList.contains('bi-arrow-up')) {
        iconElement.classList.remove('bi-arrow-up');
        iconElement.classList.add('bi-arrow-down');
      }
    } else {
      // Opciones:
      // - text-primary (azul)
      // - text-info (azul claro)
      // - text-white (blanco)
      // - text-warning (amarillo/naranja)
      
      // Quitamos primero todas las posibles clases de colores
      increaseElement.classList.remove('text-danger');
      increaseElement.classList.remove('text-success');
      increaseElement.classList.remove('text-info');
      increaseElement.classList.remove('text-white');
      
      // Añadimos el nuevo color para incremento positivo
      increaseElement.classList.add('text-primary'); // AZUL para ganancias
      
      const iconElement = increaseElement.previousElementSibling;
      if (iconElement && iconElement.classList.contains('bi-arrow-down')) {
        iconElement.classList.remove('bi-arrow-down');
        iconElement.classList.add('bi-arrow-up');
      }
    }
  } else {
    console.warn('Elemento revenue-increase no encontrado en el DOM');
  }
  
  this.ui.updateElement('active-subscriptions', this.summaryData.activeSubscriptions);
  this.ui.updateElement('new-subscriptions', this.summaryData.newSubscriptions);
  this.ui.updateElement('total-tax', formatCurrency(this.summaryData.totalTax));
  this.ui.updateElement('spain-tax-percentage', formatPercentage(this.summaryData.spainTaxPercentage));
  this.ui.updateElement('cancellation-rate', formatPercentage(this.summaryData.cancellationRate));
  this.ui.updateElement('cancellations-count', this.summaryData.canceledSubscriptions);
  this.ui.updateElement('expired-subscriptions', this.summaryData.expiredSubscriptions);
  this.ui.updateElement('top-country', formatCountryName(this.summaryData.topCountry.code));
  this.ui.updateElement('top-country-count', this.summaryData.topCountry.count);
  this.ui.updateElement('top-product', this.summaryData.topProduct.name);
  this.ui.updateElement('top-product-count', this.summaryData.topProduct.count);
  this.ui.updateElement('average-margin', formatPercentage(this.summaryData.averageMargin));
  
  console.log('DASHBOARD UI UPDATED');
  console.log('Período actual:', this.summaryData.currentPeriod);
  console.log('Período anterior:', this.summaryData.previousPeriod);
  console.log('KPIs calculados:', {
    totalEarnings: this.summaryData.totalEarnings,
    earningsIncrease: this.summaryData.earningsIncrease,
    prevEarnings: this.summaryData.calculatedPrevEarnings || 'N/A',  // Nuevo campo añadido
    activeSubscriptions: this.summaryData.activeSubscriptions,
    newSubscriptions: this.summaryData.newSubscriptions,
    totalTax: this.summaryData.totalTax,
    spainTaxPercentage: this.summaryData.spainTaxPercentage,
    cancellationRate: this.summaryData.cancellationRate,
    canceledSubscriptions: this.summaryData.canceledSubscriptions,
    expiredSubscriptions: this.summaryData.expiredSubscriptions,
    averageMargin: this.summaryData.averageMargin
  });
  
  this.updateRecentTransactionsTable();
}
  
  /**
   * Actualiza la tabla de transacciones recientes
   */
  updateRecentTransactionsTable() {
    if (!this.summaryData || !this.summaryData.recentTransactions) return;
    
    this.ui.updateTable('recent-transactions', this.summaryData.recentTransactions, (transaction) => {
      const amount = parseFloat(transaction.amount || 0);
      const amountEur = parseFloat(transaction.amount_eur || 0);
      const earningsEur = parseFloat(transaction.earnings_eur || 0);
      const showConversion = transaction.currency_code !== 'EUR';
      
      return `
        <td>${transaction.transaction_id?.substring(0, 8) || 'N/A'}</td>
        <td>${transaction.product_name || 'Producto ' + transaction.product_id}</td>
        <td>
          ${showConversion ? 
            `${formatCurrency(amount, transaction.currency_code)}
             <br><small class="text-muted">(${formatCurrency(amountEur, 'EUR')})</small>
             <br><small class="text-success">Neto: ${formatCurrency(earningsEur, 'EUR')}</small>` : 
            `${formatCurrency(amount, transaction.currency_code)}
             <br><small class="text-success">Neto: ${formatCurrency(earningsEur, 'EUR')}</small>`
          }
        </td>
        <td>${formatDate(transaction.updated_at, 'medium')}</td>
      `;
    });
  }
  
  /**
   * Inicializa los gráficos del dashboard
   */
  initCharts() {
    if (!this.summaryData) return;
    
    this.initRevenueChart();
    
    this.initProductsChart();
    
    this.initGeoChart();
    
    this.initCurrencyChart();
  }
  
  /**
   * Inicializa el gráfico de distribución por divisas
   */
  initCurrencyChart() {
    const ctx = document.getElementById('currency-chart');
    if (!ctx || !this.summaryData.currencyData) return;
    
    const currencyData = this.summaryData.currencyData;
    
    const labels = currencyData.map(c => c.code);
    const amountTotals = currencyData.map(c => c.amountTotal);
    const earningsTotals = currencyData.map(c => c.earningsTotal);
    
    // Colores para las monedas
    const colors = [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', 
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
    ];
    
    // Configuración del gráfico
    const config = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: earningsTotals, // Usar ingresos netos para el gráfico
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              boxWidth: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(tooltipItem) {
                const currency = currencyData[tooltipItem.dataIndex];
                const value = tooltipItem.raw;
                const total = tooltipItem.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                return `${currency.code}: ${formatCurrency(value, 'EUR')} (${percentage}%)`;
              },
              afterLabel: function(tooltipItem) {
                const currency = currencyData[tooltipItem.dataIndex];
                const lines = [];
                
                if (currency.code !== 'EUR') {
                  lines.push(`Original: ${formatCurrency(currency.earningsOriginal, currency.code)}`);
                  lines.push(`Tasa: 1 ${currency.code} ≈ ${currency.avgRate.toFixed(5)} EUR`);
                }
                
                lines.push(`Transacciones: ${currency.count}`);
                lines.push(`Comisiones: ${formatCurrency(currency.feesTotal, 'EUR')}`);
                
                if (currency.taxTotal > 0) {
                  lines.push(`Impuestos: ${formatCurrency(currency.taxTotal, 'EUR')}`);
                }
                
                return lines;
              }
            }
          }
        }
      }
    };
    
    this.charts.currency = new Chart(ctx, config);
  }
  
  /**
   * Inicializa el gráfico de ingresos por período
   */
  initRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    
    // Configuración del gráfico - USAR INGRESOS NETOS
    const config = {
      type: 'bar',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        datasets: [
          {
            label: 'Ingresos Brutos',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(101, 109, 74, 0.4)',
            borderColor: 'rgba(101, 109, 74, 1)',
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          },
          {
            label: 'Ingresos Netos',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(101, 109, 74, 0.8)',
            borderColor: 'rgba(101, 109, 74, 1)',
            borderWidth: 1,
            borderRadius: 4,
            order: 1
          },
          {
            label: 'Transacciones',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            type: 'line',
            backgroundColor: 'transparent',
            borderColor: '#582f0e',
            borderWidth: 2,
            pointBackgroundColor: '#582f0e',
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'y1',
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR');
              }
            }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: {
              display: false
            },
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.dataset.yAxisID === 'y1') {
                  label += context.parsed.y + ' transacciones';
                } else {
                  label += formatCurrency(context.parsed.y, 'EUR');
                }
                return label;
              }
            }
          }
        }
      }
    };
    
    this.updateChartDataByMonth(config, this.summaryData.allTransactions);
    
    this.charts.revenue = new Chart(ctx, config);
  }
  
  /**
   * Actualiza los datos del gráfico de ingresos por mes
   */
  updateChartDataByMonth(config, transactions) {
    // Reiniciar arrays
    const monthlyBruto = Array(12).fill(0);
    const monthlyNeto = Array(12).fill(0);
    const monthlyCount = Array(12).fill(0);
    
    // Agrupar por mes
    transactions.forEach(t => {
      if (!t.updated_at) return;
      
      const date = new Date(t.updated_at);
      const month = date.getMonth();
      
      monthlyBruto[month] += parseFloat(t.amount_eur || 0);
      monthlyNeto[month] += parseFloat(t.earnings_eur || 0);
      monthlyCount[month] += 1;
    });
    
    config.data.datasets[0].data = monthlyBruto;
    config.data.datasets[1].data = monthlyNeto;
    config.data.datasets[2].data = monthlyCount;
  }
  
  /**
   * Actualiza el gráfico de ingresos según el período seleccionado
   * @param {string} period - Período seleccionado (monthly, quarterly, yearly)
   */
  updateRevenueChart(period) {
    if (!this.charts.revenue || !this.summaryData) return;
    
    const config = this.charts.revenue.config;
    
    if (period === 'monthly') {
      config.data.labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      this.updateChartDataByMonth(config, this.summaryData.allTransactions);
    } 
    else if (period === 'quarterly') {
      config.data.labels = ['T1', 'T2', 'T3', 'T4'];
      // Agrupar datos por trimestre
      const quarterlyBruto = Array(4).fill(0);
      const quarterlyNeto = Array(4).fill(0);
      const quarterlyCount = Array(4).fill(0);
      
      this.summaryData.allTransactions.forEach(t => {
        if (!t.updated_at) return;
        
        const date = new Date(t.updated_at);
        const quarter = Math.floor(date.getMonth() / 3);
        
        quarterlyBruto[quarter] += parseFloat(t.amount_eur || 0);
        quarterlyNeto[quarter] += parseFloat(t.earnings_eur || 0);
        quarterlyCount[quarter] += 1;
      });
      
      config.data.datasets[0].data = quarterlyBruto;
      config.data.datasets[1].data = quarterlyNeto;
      config.data.datasets[2].data = quarterlyCount;
    } 
    else if (period === 'yearly') {
      const currentYear = new Date().getFullYear();
      config.data.labels = [`${currentYear-2}`, `${currentYear-1}`, `${currentYear}`];
      
      // Agrupar datos por año
      const yearlyBruto = Array(3).fill(0);
      const yearlyNeto = Array(3).fill(0);
      const yearlyCount = Array(3).fill(0);
      
      this.summaryData.allTransactions.forEach(t => {
        if (!t.updated_at) return;
        
        const date = new Date(t.updated_at);
        const yearIndex = date.getFullYear() - (currentYear - 2);
        
        if (yearIndex >= 0 && yearIndex < 3) {
          yearlyBruto[yearIndex] += parseFloat(t.amount_eur || 0);
          yearlyNeto[yearIndex] += parseFloat(t.earnings_eur || 0);
          yearlyCount[yearIndex] += 1;
        }
      });
      
      config.data.datasets[0].data = yearlyBruto;
      config.data.datasets[1].data = yearlyNeto;
      config.data.datasets[2].data = yearlyCount;
    }
    
    this.charts.revenue.update();
  }
  
  /**
   * Inicializa el gráfico de distribución por productos
   */
  initProductsChart() {
    const ctx = document.getElementById('products-chart');
    if (!ctx) return;
    
    const sortedProducts = [...this.summaryData.productData]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Top 5 productos
    
    const labels = sortedProducts.map(p => p.name);
    const values = sortedProducts.map(p => p.total); // Usar ingresos netos
    
    // Colores
    const colors = [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f'
    ];
    
    // Configuración
    const config = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const product = sortedProducts[context.dataIndex];
                const earningsEur = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((earningsEur / total) * 100).toFixed(1);
                
                return `${product.name}: ${formatCurrency(earningsEur, 'EUR')} (${percentage}%)`;
              },
              afterLabel: function(context) {
                const product = sortedProducts[context.dataIndex];
                const lines = [];
                
                lines.push(`Bruto: ${formatCurrency(product.brutoTotal, 'EUR')}`);
                lines.push(`Transacciones: ${product.count}`);
                
                // Desglose por moneda si hay más de una
                if (Object.keys(product.currencies).length > 1) {
                  Object.entries(product.currencies).forEach(([currency, info]) => {
                    if (currency !== 'EUR') {
                      lines.push(`${currency}: ${formatCurrency(info.originalEarnings, currency)} (${info.count})`);
                    }
                  });
                }
                
                return lines;
              }
            }
          }
        }
      }
    };
    
    this.charts.products = new Chart(ctx, config);
  }
  
  /**
   * Inicializa el gráfico de distribución geográfica
   */
  initGeoChart() {
    const ctx = document.getElementById('geo-chart');
    if (!ctx) return;
    
    const sortedCountries = [...this.summaryData.geoData]
      .sort((a, b) => b.total - a.total);
    
    const labels = sortedCountries.map(c => c.name);
    const values = sortedCountries.map(c => c.total); // Usar ingresos netos
    
    // Colores
    const colors = [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
    ];
    
    // Configuración
    const config = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const country = sortedCountries[context.dataIndex];
                const earningsEur = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((earningsEur / total) * 100).toFixed(1);
                
                return `${country.name}: ${formatCurrency(earningsEur, 'EUR')} (${percentage}%)`;
              },
              afterLabel: function(context) {
                const country = sortedCountries[context.dataIndex];
                const lines = [];
                
                lines.push(`Bruto: ${formatCurrency(country.brutoTotal, 'EUR')}`);
                lines.push(`Transacciones: ${country.count}`);
                
                // Desglose por moneda si hay más de una
                if (Object.keys(country.currencies).length > 1) {
                  Object.entries(country.currencies).forEach(([currency, info]) => {
                    if (currency !== 'EUR') {
                      lines.push(`${currency}: ${formatCurrency(info.originalEarnings, currency)} (${info.count})`);
                    }
                  });
                }
                
                return lines;
              }
            }
          }
        }
      }
    };
    
    this.charts.geo = new Chart(ctx, config);
  }
  
/**
 * Redimensiona los gráficos
 */
resizeCharts() {
  if (this.currentSection !== 'dashboard') {
    console.log('Dashboard: No estamos en la sección de dashboard, omitiendo resize');
    return;
  }
  
  setTimeout(() => {
    Object.keys(this.charts).forEach(chartKey => {
      const chart = this.charts[chartKey];
      if (chart && chart.canvas && document.body.contains(chart.canvas)) {
        try {
          chart.update();
        } catch (error) {
          console.warn(`Error al redimensionar gráfico ${chartKey}:`, error);
        }
      } else if (chart) {
        // El gráfico existe pero su canvas no está en el DOM
        console.log(`Dashboard: Canvas del gráfico ${chartKey} no está en el DOM, recreando...`);
        this.charts[chartKey] = null;
      }
    });
    
    const allChartsNull = Object.values(this.charts).every(chart => chart === null);
    if (allChartsNull && this.summaryData) {
      console.log('Dashboard: Todos los gráficos fueron perdidos, recreando...');
      this.initCharts();
    }
  }, 100); // Retraso de 100ms
}
  
  /**
   * Refresca los datos del dashboard
   */
    async refreshDashboard() {
      console.log('Dashboard: Refrescando datos desde API');
      this.api.clearCache();
      
      // Recargar datos
      await this.loadDashboardData();
      
      this.ui.showSuccessMessage('Dashboard actualizado correctamente');
    }
/**
 * Refresca el dashboard con nuevos datos cuando cambia el rango de fechas
 */
refreshDashboardWithLocalData() {
  console.log('Dashboard: Refrescando con datos locales usando filtro de fechas');
  
  // Si no hay datos o rango de fechas, no podemos hacer nada
  if (!this.allTransactions || !this.allTransactions.length || 
      !this.allSubscriptions || !this.allSubscriptions.length || 
      !this.dateRange) {
    console.warn('Dashboard: No hay datos suficientes para aplicar filtro local');
    return;
  }
  
  const startDate = new Date(this.dateRange.start);
  const endDate = new Date(this.dateRange.end);
  
  const periodDuration = endDate.getTime() - startDate.getTime();
  
  const prevEndDate = new Date(startDate.getTime() - 1); // Día anterior al inicio del período actual
  const prevStartDate = new Date(prevEndDate.getTime() - periodDuration); // Mismo número de días
  
  console.log(`Período actual: ${this.dateRange.start} a ${this.dateRange.end}`);
  console.log(`Período anterior: ${prevStartDate.toISOString().split('T')[0]} a ${prevEndDate.toISOString().split('T')[0]}`);
  
  const currentTransactions = this.allTransactions.filter(t => {
    if (!t.updated_at) return false;
    const txDate = new Date(t.updated_at);
    return txDate >= startDate && txDate <= endDate;
  });
  
  const prevTransactions = this.allTransactions.filter(t => {
    if (!t.updated_at) return false;
    const txDate = new Date(t.updated_at);
    return txDate >= prevStartDate && txDate <= prevEndDate;
  });
  
  console.log(`Transacciones período actual: ${currentTransactions.length}`);
  console.log(`Transacciones período anterior: ${prevTransactions.length}`);
  
  const currentEarnings = currentTransactions.reduce((sum, t) => 
    sum + parseFloat(t.earnings_eur || 0), 0);
  
  const prevEarnings = prevTransactions.reduce((sum, t) => 
    sum + parseFloat(t.earnings_eur || 0), 0);
  
  let earningsIncrease = 0;
  if (prevEarnings === 0) {
    earningsIncrease = currentEarnings > 0 ? 100 : 0;
  } else {
    // CORRECCIÓN: Asegurarnos de que el cálculo no multiplica por 100 dos veces
    earningsIncrease = ((currentEarnings - prevEarnings) / prevEarnings) * 100;
    
    // Añadimos verificación explícita del formato para asegurarnos
    // de que no se aplique ningún factor adicional
    console.log('Fórmula de incremento:');
    console.log(`  (${currentEarnings} - ${prevEarnings}) / ${prevEarnings} * 100 = ${earningsIncrease}%`);
  }
  
  console.log(`Ingresos período actual: ${currentEarnings}`);
  console.log(`Ingresos período anterior: ${prevEarnings}`);
  console.log(`Incremento calculado: ${earningsIncrease}%`);
  
  const filteredSubscriptions = this.filterSubscriptionsByDateRange(
    this.allSubscriptions, 
    startDate, 
    endDate
  );
  
  console.log(`Suscripciones filtradas: ${filteredSubscriptions.length}`);
  
  this.summaryData = this.generateSummaryData(
    currentTransactions,
    filteredSubscriptions
  );
  
  // Sobreescribir con nuestro cálculo que incluye el período anterior real
  this.summaryData.earningsIncrease = earningsIncrease;
  this.summaryData.calculatedPrevEarnings = prevEarnings; // Guardar para referencia
  
  this.updateDashboardUIWithCorrectPercentage();
  
  this.updateChartsWithFilteredData();
  
  // Pequeña notificación para el usuario
  this.ui.showSuccessMessage('Dashboard filtrado por fechas');
}


/**
 * Filtra suscripciones por rango de fechas
 * @param {Array} subscriptions - Lista de suscripciones
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Array} - Suscripciones filtradas
 */
filterSubscriptionsByDateRange(subscriptions, startDate, endDate) {
  return subscriptions.filter(subscription => {
    if (subscription.created_at) {
      const createdDate = new Date(subscription.created_at);
      if (createdDate >= startDate && createdDate <= endDate) {
        return true;
      }
    }
    
    if (subscription.updated_at && subscription.created_at) {
      const updatedDate = new Date(subscription.updated_at);
      const createdDate = new Date(subscription.created_at);
      
      // y dentro del período seleccionado
      if (updatedDate > createdDate && updatedDate >= startDate && updatedDate <= endDate) {
        return true;
      }
    }
    
    if (subscription.created_at) {
      const createdDate = new Date(subscription.created_at);
      
      // La suscripción se creó antes o durante el período
      if (createdDate <= endDate) {
        // Si es activa o pausada (aún activa)
        if (subscription.status === 'active' || subscription.status === 'paused') {
          return true;
        }
        
        // Si expiró o se canceló después del período
        if ((subscription.status === 'expired' || subscription.status === 'canceled') && 
            subscription.updated_at && new Date(subscription.updated_at) > endDate) {
          return true;
        }
      }
    }
    
    return false;
  });
}

/**
 * Versión especializada de updateDashboardUI para corregir el problema del porcentaje
 * Esta función contiene las correcciones para asegurar que el incremento de ingresos
 * se muestre correctamente al cambiar el rango de fechas
 */
updateDashboardUIWithCorrectPercentage() {
  if (!this.summaryData) {
    console.warn('Dashboard: No hay datos resumidos para actualizar la UI');
    return;
  }
  
  this.ui.updateElement('total-revenue', formatCurrency(this.summaryData.totalEarnings));
  
  // IMPORTANTE: Verificación y manipulación directa del porcentaje
  const increaseValue = this.summaryData.earningsIncrease;
  
  console.log(`UI: Valor de incremento a mostrar: ${increaseValue}%`);
  console.log(`UI: Estado financiero - Actual: ${this.summaryData.totalEarnings}€, Anterior: ${this.summaryData.calculatedPrevEarnings}€`);
  
  // Actualización directa del elemento
  const increaseElement = document.getElementById('revenue-increase');
  if (increaseElement) {
    increaseElement.textContent = formatPercentage(increaseValue, false);
    
    if (increaseValue < 0) {
      // Estilo para negativos
      increaseElement.classList.remove('text-primary');
      increaseElement.classList.remove('text-info');
      increaseElement.classList.remove('text-white');
      increaseElement.classList.remove('text-success');
      increaseElement.classList.add('text-danger');
      
      // Flecha abajo
      const iconElement = increaseElement.previousElementSibling;
      if (iconElement && iconElement.classList.contains('bi-arrow-up')) {
        iconElement.classList.remove('bi-arrow-up');
        iconElement.classList.add('bi-arrow-down');
      }
    } else {
      // Estilo para positivos
      increaseElement.classList.remove('text-danger');
      increaseElement.classList.remove('text-success');
      increaseElement.classList.remove('text-info');
      increaseElement.classList.remove('text-white');
      
      increaseElement.classList.add('text-primary');
      
      // Flecha arriba
      const iconElement = increaseElement.previousElementSibling;
      if (iconElement && iconElement.classList.contains('bi-arrow-down')) {
        iconElement.classList.remove('bi-arrow-down');
        iconElement.classList.add('bi-arrow-up');
      }
    }
  } else {
    console.warn('Elemento revenue-increase no encontrado en el DOM');
  }
  
  this.ui.updateElement('active-subscriptions', this.summaryData.activeSubscriptions);
  this.ui.updateElement('new-subscriptions', this.summaryData.newSubscriptions);
  this.ui.updateElement('total-tax', formatCurrency(this.summaryData.totalTax));
  this.ui.updateElement('spain-tax-percentage', formatPercentage(this.summaryData.spainTaxPercentage));
  this.ui.updateElement('cancellation-rate', formatPercentage(this.summaryData.cancellationRate));
  this.ui.updateElement('cancellations-count', this.summaryData.canceledSubscriptions);
  this.ui.updateElement('expired-subscriptions', this.summaryData.expiredSubscriptions);
  this.ui.updateElement('top-country', formatCountryName(this.summaryData.topCountry.code));
  this.ui.updateElement('top-country-count', this.summaryData.topCountry.count);
  this.ui.updateElement('top-product', this.summaryData.topProduct.name);
  this.ui.updateElement('top-product-count', this.summaryData.topProduct.count);
  this.ui.updateElement('average-margin', formatPercentage(this.summaryData.averageMargin));
  
  this.updateRecentTransactionsTable();
}

/**
 * Filtra transacciones y suscripciones por rango de fechas
 * @param {Array} transactions - Todas las transacciones
 * @param {Array} subscriptions - Todas las suscripciones  
 * @param {Object} dateRange - Rango de fechas {start, end}
 * @returns {Object} Datos filtrados {transactions, subscriptions}
 */
filterDataByDateRange(transactions, subscriptions, dateRange) {
  console.log(`Dashboard: Filtrando datos por rango: ${dateRange.start} a ${dateRange.end}`);
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  endDate.setHours(23, 59, 59, 999);
  
  const filteredTransactions = transactions.filter(transaction => {
    if (!transaction.updated_at) return false;
    
    const transactionDate = new Date(transaction.updated_at);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
  
  const filteredSubscriptions = subscriptions.filter(subscription => {
    if (subscription.created_at) {
      const createdDate = new Date(subscription.created_at);
      if (createdDate >= startDate && createdDate <= endDate) {
        return true;
      }
    }
    
    if (subscription.updated_at && subscription.created_at) {
      const updatedDate = new Date(subscription.updated_at);
      const createdDate = new Date(subscription.created_at);
      
      // y dentro del período seleccionado
      if (updatedDate > createdDate && updatedDate >= startDate && updatedDate <= endDate) {
        return true;
      }
    }
    
    // y aún activas o que expiraron/se cancelaron después del período)
    if (subscription.created_at) {
      const createdDate = new Date(subscription.created_at);
      
      // La suscripción se creó antes o durante el período
      if (createdDate <= endDate) {
        // Si es activa o pausada (aún activa)
        if (subscription.status === 'active' || subscription.status === 'paused') {
          return true;
        }
        
        // Si expiró o se canceló después del período
        if ((subscription.status === 'expired' || subscription.status === 'canceled') && 
            subscription.updated_at && new Date(subscription.updated_at) > endDate) {
          return true;
        }
      }
    }
    
    return false;
  });
  
  console.log(`Dashboard: Resultado del filtro: ${filteredTransactions.length}/${transactions.length} transacciones, ${filteredSubscriptions.length}/${subscriptions.length} suscripciones`);
  
  return {
    transactions: filteredTransactions,
    subscriptions: filteredSubscriptions
  };
}

/**
 * Actualiza los gráficos con los datos filtrados
 */
updateChartsWithFilteredData() {
  if (this.currentSection !== 'dashboard') {
    console.log('Dashboard: No estamos en la sección dashboard, omitiendo actualización de gráficos');
    return;
  }
  
  try {
    // NO actualizar el gráfico de ingresos (debe mantener todos los datos)
    // Sólo verificar que existe para evitar errores
    if (this.charts.revenue && this.charts.revenue.canvas && 
        document.body.contains(this.charts.revenue.canvas)) {
      console.log('Dashboard: Manteniendo gráfico de ingresos sin cambios (según requerimiento)');
    }
    
    if (this.charts.products && this.charts.products.canvas && 
        document.body.contains(this.charts.products.canvas)) {
      this.updateProductsChart();
    }
    
    if (this.charts.geo && this.charts.geo.canvas && 
        document.body.contains(this.charts.geo.canvas)) {
      this.updateGeoChart();
    }
    
    if (this.charts.currency && this.charts.currency.canvas && 
        document.body.contains(this.charts.currency.canvas)) {
      this.updateCurrencyChart();
    }
    
    console.log('Dashboard: Gráficos actualizados correctamente con datos filtrados');
  } catch (error) {
    console.warn('Error al actualizar gráficos con datos filtrados:', error);
    // No propagar el error
  }
}

/**
 * Actualiza el gráfico de productos con los datos actuales
 */
updateProductsChart() {
  if (!this.charts.products || !this.summaryData) return;
  
  const sortedProducts = [...this.summaryData.productData]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Top 5 productos
  
  const labels = sortedProducts.map(p => p.name);
  const values = sortedProducts.map(p => p.total); // Usar ingresos netos
  
  this.charts.products.data.labels = labels;
  this.charts.products.data.datasets[0].data = values;
  
  this.charts.products.update();
  
  console.log('Dashboard: Gráfico de productos actualizado con datos filtrados');
}

/**
 * Actualiza el gráfico geográfico con los datos actuales
 */
updateGeoChart() {
  if (!this.charts.geo || !this.summaryData) return;
  
  const sortedCountries = [...this.summaryData.geoData]
    .sort((a, b) => b.total - a.total);
  
  const labels = sortedCountries.map(c => c.name);
  const values = sortedCountries.map(c => c.total); // Usar ingresos netos
  
  this.charts.geo.data.labels = labels;
  this.charts.geo.data.datasets[0].data = values;
  
  this.charts.geo.update();
}

/**
 * Actualiza el gráfico de divisas con los datos actuales
 */
updateCurrencyChart() {
  if (!this.charts.currency) return;
  
  const canvas = this.charts.currency.canvas;
  if (!canvas || !canvas.parentNode || !document.body.contains(canvas)) {
    console.log('Dashboard: Canvas del gráfico de divisas no está en el DOM, omitiendo actualización');
    return;
  }
  
  try {
    const currencyData = this.summaryData.currencyData;
    
    const labels = currencyData.map(c => c.code);
    const earningsTotals = currencyData.map(c => c.earningsTotal);
    
    this.charts.currency.data.labels = labels;
    this.charts.currency.data.datasets[0].data = earningsTotals;
    
    this.charts.currency.update();
  } catch (error) {
    console.warn('Error al actualizar gráfico de divisas:', error);
    // No propagar el error
  }
}
}