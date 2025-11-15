/**
 * Módulo de Impuestos Optimizado
 * Gestiona análisis, cálculo y reportes de impuestos IVA/VAT
 * Con soporte especial para España y países de habla hispana
 */

import { formatCurrency, formatPercentage, formatDate, formatCountryName, getCurrencySymbol } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class TaxesModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.dateRange = null;
    this.transactions = [];
    this.taxSummary = null;
    this.taxBreakdown = [];
    this.allTransactions = [];
    this.lastApiResponse = null;
    
    // Tasas de IVA por país (para países principales)
    this.taxRatesByCountry = {
      // España y UE
      'ES': 0.21, // España 21%
      'FR': 0.20, // Francia 20%
      'DE': 0.19, // Alemania 19%
      'IT': 0.22, // Italia 22%
      'PT': 0.23, // Portugal 23%
      'GB': 0.20, // Reino Unido 20%
      'UK': 0.20, // Reino Unido (código alternativo)
      
      // Latinoamérica
      'MX': 0.16, // México 16%
      'CO': 0.19, // Colombia 19%
      'AR': 0.21, // Argentina 21%
      'PE': 0.18, // Perú 18%
      'CL': 0.19, // Chile 19%
      'EC': 0.12, // Ecuador 12%
      'GT': 0.12, // Guatemala 12%
      'DO': 0.18, // República Dominicana 18%
      'CR': 0.13, // Costa Rica 13%
      'PA': 0.07, // Panamá 7%
      'UY': 0.22, // Uruguay 22%
      'SV': 0.13, // El Salvador 13%
      'HN': 0.15, // Honduras 15%
      'BO': 0.13, // Bolivia 13%
      'PY': 0.10, // Paraguay 10%
      'PR': 0.115, // Puerto Rico 11.5%
      
      // Otros países importantes
      'US': 0,     // Estados Unidos (varía por estado, simplificado a 0)
      'CA': 0.05,  // Canadá (GST básico, varía por provincia)
      'AU': 0.10,  // Australia 10%
      'NZ': 0.15,  // Nueva Zelanda 15%
      'JP': 0.10,  // Japón 10%
      'BR': 0.17   // Brasil (ICMS básico, complejo en realidad)
    };
    
    // Tasa por defecto para países no listados
    this.defaultTaxRate = 0.21;
    
    // Configuración para trimestre actual
    this.quarter = this.getCurrentQuarter();
    this.year = new Date().getFullYear();
    
    // Configuración para regiones destacadas en análisis y gráficos
    this.regions = {
      SPAIN: {
        name: 'España',
        codes: ['ES'],
        color: '#4e79a7'  // Azul
      },
      LATAM: {
        name: 'Latinoamérica',
        codes: ['MX', 'CO', 'AR', 'PE', 'CL', 'EC', 'UY', 'PY', 'BO', 'VE', 'CR', 'PA', 'GT', 'DO', 'SV', 'HN', 'NI', 'PR', 'CU'],
        color: '#f28e2c'  // Naranja
      },
      EU: {
        name: 'Resto de UE',
        codes: ['FR', 'DE', 'IT', 'PT', 'BE', 'NL', 'LU', 'AT', 'GR', 'IE', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'SK', 'SI', 'RO', 'BG', 'HR', 'LV', 'LT', 'EE', 'MT', 'CY'],
        color: '#76b7b2'  // Verde azulado
      },
      USA: {
        name: 'Estados Unidos',
        codes: ['US'],
        color: '#59a14f'  // Verde
      },
      OTHER: {
        name: 'Otros países',
        codes: [],  // Cualquier otro país
        color: '#e15759'  // Rojo
      }
    };
    
    this.referenceValues = {
      totalTaxEur: 0,
      totalAmountEur: 0
    };
  }
  
  /**
   * Inicializa el módulo de impuestos
   */
async init() {
  console.log('Inicializando módulo de impuestos');
  
  this.allTransactions = [];
  this.lastApiResponse = null;
  
  this.setupEventListeners();
  
  // NUEVO: Configurar barra de Base Imponible
  this.setupTaxableAmountBar();
  
  // Método debounced para manejar cambios de fecha
  const debouncedRefresh = this.debounce((range) => {
    this.dateRange = range;
    console.log('Impuestos: Rango de fechas cambiado (debounced):', range);
    
    if (this.allTransactions.length > 0) {
      console.log('Usando filtrado local para cambio de fecha en módulo de impuestos');
      this.refreshWithLocalData();
    } else {
      console.log('No hay datos locales de impuestos, haciendo petición API');
      this.refreshTaxData();
    }
  }, 300); // 300ms de debounce
  
  this.eventBus.on('dateRangeChanged', debouncedRefresh);
  
  await this.loadTaxData();
  
  return true;
}
  
  /**
   * Configura event listeners para el módulo
   */
  setupEventListeners() {
  // Botón de exportación de informe de impuestos
  const exportTaxBtn = document.getElementById('export-tax-report');
  if (exportTaxBtn) {
    exportTaxBtn.addEventListener('click', () => {
      this.exportTaxReport();
    });
  }
  
  // MEJORADO: Escuchar eventos de cambio de sección con un enfoque más específico
  document.addEventListener('sectionChanged', (e) => {
    if (e.detail.section === 'taxes') {
      // Solo activar la sección si es la que se está mostrando
      this.onSectionActivated();
    } else if (e.detail.prevSection === 'taxes') {
      this.onSectionDeactivated();
    }
  });
  
  // NUEVO: Escuchar eventos de cambio global de rango de fechas
  // Esto nos permite sincronizar nuestro estado interno
  this.eventBus.on('globalDateRangeChanged', (range) => {
    console.log('Módulo de impuestos: Detectado cambio global de rango de fechas', range);
    // Los datos se recargarán cuando se active la sección
    this.dateRange = range;
  });
}
  
  /**
 * Añadir debounce para el cambio de rango de fechas
 * Esta función debería añadirse a la clase TaxesModule
 */
debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

  /**
   * Se ejecuta cuando se activa la sección de impuestos
   */
onSectionActivated() {
  console.log('Sección de impuestos activada');
  
  const countryChartElement = document.getElementById('tax-country-chart');
  const historyChartElement = document.getElementById('tax-history-chart');
  
  if (!countryChartElement || !historyChartElement) {
    console.warn('Contenedores de gráficos de impuestos no encontrados');
  }
  
  // Destruir gráficos existentes para evitar duplicados
  this.destroyCharts();
  
  // MEJORADO: Verificar si ya tenemos datos y solo reconstruir los gráficos
  if (this.taxSummary && this.taxBreakdown && this.taxBreakdown.length > 0) {
    console.log('Usando datos de impuestos existentes');
    
    // Asegurar que la barra de Base Imponible esté configurada
    this.setupTaxableAmountBar();
    
    this.updateTaxUI();
    
    this.initCharts();
    return;
  }
  
  // Si no tenemos datos, cargar los datos según el rango de fechas actual
  if (this.dateRange) {
    console.log('Cargando datos fiscales con rango de fechas existente:', this.dateRange);
    this.ui.showLoading('Cargando datos fiscales...');
    
    // Si tenemos datos almacenados localmente, usarlos
    if (this.allTransactions && this.allTransactions.length > 0) {
      console.log('Usando filtrado local para datos de impuestos');
      this.refreshWithLocalData();
    } else {
      // Si no, cargar desde la API
      this.loadTaxData();
    }
  } else {
    console.log('Cargando datos fiscales con configuración por defecto');
    this.loadTaxData();
  }
}
  
  /**
   * Se ejecuta cuando se desactiva la sección de impuestos
   */
  onSectionDeactivated() {
    // Destruir gráficos para liberar recursos
    this.destroyCharts();
  }
  
  /**
   * Obtiene el trimestre actual
   * @returns {number} Número de trimestre (1-4)
   */
  getCurrentQuarter() {
    const month = new Date().getMonth();
    return Math.floor(month / 3) + 1;
  }
  
  /**
   * Carga datos de transacciones y calcula impuestos
   */
async loadTaxData() {
  try {
    this.ui.showLoading('Cargando datos fiscales...');
    
    const filters = {};
    if (this.dateRange) {
      filters.date_from = this.dateRange.start;
      filters.date_to = this.dateRange.end;
    } else {
      // Si no hay rango de fechas, usar el trimestre actual
      const currentDate = new Date();
      const quarterStartMonth = (this.quarter - 1) * 3;
      const startDate = new Date(this.year, quarterStartMonth, 1);
      const endDate = new Date(this.year, quarterStartMonth + 3, 0);
      
      filters.date_from = startDate.toISOString().split('T')[0];
      filters.date_to = endDate.toISOString().split('T')[0];
      
      // MEJORADO: Almacenar el rango de fechas por defecto para referencia futura
      // Esto es importante para mantener coherencia entre cambios de sección
      this.dateRange = {
        start: filters.date_from,
        end: filters.date_to,
        label: `T${this.quarter} ${this.year}`
      };
      
      // MEJORADO: Notificar al eventBus sobre el cambio de fecha para sincronizar la UI
      this.eventBus.emit('taxesDateRangeSet', this.dateRange);
    }
    
    console.log('Solicitando datos fiscales con filtros:', filters);
    
    try {
      const transactionsResponse = await this.api.getTransactions(filters);
      
      this.lastApiResponse = transactionsResponse;
      
      if (Array.isArray(transactionsResponse)) {
        this.transactions = transactionsResponse;
      } else if (transactionsResponse && transactionsResponse.data) {
        this.transactions = transactionsResponse.data;
      } else {
        throw new Error('No se pudieron obtener transacciones');
      }
      
      if (!this.transactions || this.transactions.length === 0) {
        console.warn('No se obtuvieron transacciones para el período seleccionado');
        this.ui.showErrorMessage('Sin datos', 'No hay transacciones disponibles para el período seleccionado');
        this.ui.hideLoading();
        
        // MEJORADO: Resetear los datos cuando no hay transacciones
        this.resetTaxData();
        this.updateTaxUI();
        this.destroyCharts();
        
        return false;
      }
      
      console.log(`Calculando impuestos para ${this.transactions.length} transacciones...`);
      
      // NUEVO: Guardar copia completa de todas las transacciones para filtrado local
      this.allTransactions = [...this.transactions];
      console.log(`Almacenados ${this.allTransactions.length} registros para filtrado local de impuestos`);
      
      // Análisis para depuración
      this.debugTransactionData();
      
      this.calculateTaxesFromTransactions(this.transactions);
      
    } catch (error) {
      console.error('Error al obtener transacciones:', error);
      this.ui.showErrorMessage('Error', 'No se pudieron obtener los datos de transacciones: ' + error.message);
      this.ui.hideLoading();
      return false;
    }
    
    this.updateTaxUI();
    
    this.initCharts();
    
    this.ui.hideLoading();
    return true;
  } catch (error) {
    console.error('Error al cargar datos de impuestos:', error);
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error al cargar datos de impuestos', 'No se pudieron obtener los datos necesarios para el análisis de impuestos.');
    return false;
  }
}
  
  /**
   * Analiza los datos de muestra para diagnosticar problemas
   * Esta función es útil para depuración
   */
  debugTransactionData() {
    if (!this.transactions || this.transactions.length === 0) {
      console.warn('No hay transacciones para analizar');
      return;
    }
    
    // Tomar una muestra de las transacciones
    const sampleSize = Math.min(5, this.transactions.length);
    const samples = this.transactions.slice(0, sampleSize);
    
    console.log(`Analizando ${sampleSize} transacciones de muestra para depuración:`);
    
    samples.forEach((transaction, index) => {
      console.log(`Transacción #${index + 1}:`, {
        id: transaction.transaction_id,
        amount: transaction.amount,
        amount_eur: transaction.amount_eur,
        currency_code: transaction.currency_code,
        country_code: transaction.country_code,
        tax_amount: transaction.tax_amount,
        tax_amount_eur: transaction.tax_amount_eur,
        exchange_rate: transaction.exchange_rate
      });
      
      if (transaction.currency_code !== 'EUR' && 
          (!transaction.exchange_rate || transaction.exchange_rate === 1)) {
        console.warn(`⚠️ Posible problema: Transacción en ${transaction.currency_code} con tasa de cambio ${transaction.exchange_rate}`);
      }
    });
    
    const mxnTransactions = this.transactions.filter(t => t.currency_code === 'MXN');
    if (mxnTransactions.length > 0) {
      console.log(`Analizando específicamente ${mxnTransactions.length} transacciones MXN:`);
      mxnTransactions.forEach((t, i) => {
        console.log(`MXN Transacción #${i + 1}:`, {
          id: t.transaction_id,
          amount: t.amount,
          amount_eur: t.amount_eur,
          exchange_rate: t.exchange_rate
        });
      });
    }
  }

  /**
 * Filtra transacciones por rango de fechas para análisis de impuestos
 * @param {Array} transactions - Lista de transacciones a filtrar
 * @param {Object} dateRange - Rango de fechas {start, end}
 * @returns {Array} Transacciones filtradas
 */
filterDataByDateRange(transactions, dateRange) {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    console.log('No hay rango de fechas válido para filtrar impuestos');
    return transactions;
  }
  
  console.log(`Filtrando ${transactions.length} transacciones para impuestos por rango: ${dateRange.start} a ${dateRange.end}`);
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  // Ajustar endDate para incluir todo el día
  endDate.setHours(23, 59, 59, 999);
  
  return transactions.filter(transaction => {
    const transactionDate = transaction.updated_at ? new Date(transaction.updated_at) : 
                            (transaction.created_at ? new Date(transaction.created_at) : null);
    
    return transactionDate && transactionDate >= startDate && transactionDate <= endDate;
  });
}

/**
 * Refresca los datos de impuestos usando el filtrado local - VERSIÓN CORREGIDA
 */
refreshWithLocalData() {
  if (!this.allTransactions || this.allTransactions.length === 0) {
    console.warn('No hay datos locales de impuestos para filtrar, usando API');
    this.refreshTaxData();
    return;
  }
  
  console.log('Aplicando filtro local de fechas a datos de impuestos almacenados');
  
  try {
    this.ui.showLoading('Actualizando datos fiscales...');
    
    if (!this.dateRange) {
      console.warn('No hay rango de fechas definido para filtrado local de impuestos');
      this.ui.hideLoading();
      return;
    }
    
    const filteredTransactions = this.filterDataByDateRange(this.allTransactions, this.dateRange);
    console.log(`Filtro local de impuestos: ${filteredTransactions.length} de ${this.allTransactions.length} transacciones`);
    
    // Si no hay transacciones después del filtro, mostrar mensaje Y REINICIAR DATOS
    if (filteredTransactions.length === 0) {
      console.warn('No hay transacciones disponibles para el período seleccionado');
      
      // NUEVO: Reiniciar datos de impuestos a valores por defecto (ceros)
      this.resetTaxData();
      
      // NUEVO: Actualizar UI con los datos reiniciados
      this.updateTaxUI();
      
      // NUEVO: Destruir gráficos existentes
      this.destroyCharts();
      
      // NUEVO: Actualizar la tabla de desglose por país para mostrar "sin datos"
      this.updateEmptyTaxBreakdown();
      
      this.ui.hideLoading();
      this.ui.showErrorMessage('Sin datos', 'No hay transacciones disponibles para el período seleccionado');
      return;
    }
    
    this.transactions = filteredTransactions;
    
    // Recalcular datos de impuestos con las transacciones filtradas
    this.calculateTaxesFromTransactions(filteredTransactions);
    
    this.updateTaxUI();
    
    this.destroyCharts();
    this.initCharts();
    
    this.ui.hideLoading();
    
    this.ui.showSuccessMessage('Datos fiscales filtrados por fecha');
  } catch (error) {
    console.error('Error al aplicar filtro local de impuestos:', error);
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo aplicar el filtro de fechas a los datos fiscales');
    
    // En caso de error, recurrir a la API
    this.refreshTaxData();
  }
}

/**
 * NUEVO: Método para reiniciar datos de impuestos a valores por defecto
 */
resetTaxData() {
  console.log('Reiniciando datos de impuestos a valores por defecto');
  
  // Reiniciar resumen de impuestos
  this.taxSummary = {
    totalAmount: 0,
    totalTax: 0,
    taxableAmount: 0,
    spainTax: 0,
    otherTax: 0,
    spainTaxPercentage: 0,
    otherTaxPercentage: 0,
    taxRatio: 0
  };
  
  // Reiniciar desglose por país
  this.taxBreakdown = [];
  
  // Reiniciar valores de referencia
  this.referenceValues.totalTaxEur = 0;
  this.referenceValues.totalAmountEur = 0;
  
  // Reiniciar las transacciones del período actual
  this.transactions = [];
}

/**
 * NUEVO: Actualiza la sección de desglose con un mensaje de "sin datos"
 */
updateEmptyTaxBreakdown() {
  const breakdownContainer = document.getElementById('tax-country-breakdown');
  if (!breakdownContainer) return;
  
  breakdownContainer.innerHTML = '';
  
  breakdownContainer.innerHTML = `
    <div class="tax-item">
      <div class="tax-country">No hay datos de impuestos para el período seleccionado</div>
      <div class="tax-value">€0.00</div>
      <div class="tax-note">Seleccione otro período</div>
    </div>
  `;
}
  
  /**
   * Calcula datos de impuestos a partir de transacciones
   * @param {Array} transactions - Lista de transacciones
   */
  calculateTaxesFromTransactions(transactions) {
    console.log('Calculando impuestos desde transacciones...');
    
    // Variables para el resumen
    let totalAmountEur = 0;
    let totalTaxEur = 0;
    let spainTaxEur = 0;
    let otherTaxEur = 0;
    
    const countryTaxes = {};
    
    transactions.forEach(transaction => {
      const amountEur = parseFloat(transaction.amount_eur || 0);
      const taxAmountEur = parseFloat(transaction.tax_amount_eur || 0);
      const countryCode = transaction.country_code || 'UNKNOWN';
      const currencyCode = transaction.currency_code || 'EUR';
      
      // IMPORTANTE: Extraer la tasa de cambio exactamente como está en la transacción
      // Este es el valor que se usa para calcular amount_eur a partir de amount
      const exchangeRate = parseFloat(transaction.exchange_rate || 1);
      
      const amount = parseFloat(transaction.amount || 0);
      const taxAmount = parseFloat(transaction.tax_amount || 0);
      const taxRate = parseFloat(transaction.tax_rate || 0);
      
      // Acumular totales en EUR
      totalAmountEur += amountEur;
      totalTaxEur += taxAmountEur;
      
      if (countryCode === 'ES') {
        spainTaxEur += taxAmountEur;
      } else {
        otherTaxEur += taxAmountEur;
      }
      
      if (!countryTaxes[countryCode]) {
        countryTaxes[countryCode] = {
          code: countryCode,
          name: formatCountryName(countryCode),
          currency_code: currencyCode,
          total: 0, // En EUR
          total_original: 0, // En moneda original
          taxBase: 0, // En EUR
          taxBase_original: 0, // En moneda original
          rate: taxRate || this.getTaxRateForCountry(countryCode),
          count: 0,
          exchange_rates: [], // Para acumular tasas de cambio de múltiples transacciones
          exchange_rate: 0 // Promedio final
        };
      }
      
      // Acumular datos por país
      countryTaxes[countryCode].total += taxAmountEur;
      countryTaxes[countryCode].total_original += taxAmount;
      countryTaxes[countryCode].taxBase += (amountEur - taxAmountEur);
      countryTaxes[countryCode].taxBase_original += (amount - taxAmount);
      countryTaxes[countryCode].count++;
      
      if (currencyCode !== 'EUR') {
        // IMPORTANTE: Guardar la tasa de cambio exacta de cada transacción
        countryTaxes[countryCode].exchange_rates.push(exchangeRate);
      }
    });
    
    Object.values(countryTaxes).forEach(country => {
      if (country.exchange_rates.length > 0) {
        const validRates = country.exchange_rates.filter(rate => rate !== 1 && !isNaN(rate));
        
        if (validRates.length > 0) {
          country.exchange_rate = validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length;
        } else if (country.currency_code !== 'EUR') {
          // Si no hay tasas válidas pero no es EUR, usar 0.05 como valor aproximado para mostrar algo
          console.warn(`No se encontraron tasas de cambio válidas para ${country.code} (${country.currency_code})`);
          country.exchange_rate = 0.05;
        } else {
          country.exchange_rate = 1;
        }
      } else if (country.currency_code === 'EUR') {
        country.exchange_rate = 1;
      } else {
        // Si no tenemos tasas y no es EUR, usar un valor aproximado
        console.warn(`No hay datos de tasa de cambio para ${country.code} (${country.currency_code})`);
        country.exchange_rate = 0.05;
      }
      
      console.log(`País ${country.code} (${country.currency_code}): tasa de cambio = ${country.exchange_rate}`);
    });
    
    this.taxSummary = {
      totalAmount: totalAmountEur,
      totalTax: totalTaxEur,
      taxableAmount: totalAmountEur - totalTaxEur,
      spainTax: spainTaxEur,
      otherTax: otherTaxEur,
      spainTaxPercentage: totalTaxEur > 0 ? (spainTaxEur / totalTaxEur) * 100 : 0,
      otherTaxPercentage: totalTaxEur > 0 ? (otherTaxEur / totalTaxEur) * 100 : 0,
      taxRatio: totalAmountEur > 0 ? totalTaxEur / totalAmountEur : 0
    };
    
    this.referenceValues.totalTaxEur = totalTaxEur;
    this.referenceValues.totalAmountEur = totalAmountEur;
    
    this.taxBreakdown = Object.values(countryTaxes).sort((a, b) => b.total - a.total);
    
    console.log('Resumen de impuestos calculado desde transacciones:', this.taxSummary);
    console.log('Desglose por país calculado desde transacciones:', this.taxBreakdown);
  }
  
  /**
   * Obtiene la tasa de impuesto para un país
   * @param {string} countryCode - Código ISO del país
   * @returns {number} Tasa de impuesto (decimal, e.g. 0.21 para 21%)
   */
  getTaxRateForCountry(countryCode) {
    return this.taxRatesByCountry[countryCode] || this.defaultTaxRate;
  }
  
  /**
   * Determina la región a la que pertenece un país
   * @param {string} countryCode - Código ISO del país
   * @returns {string} Clave de la región (SPAIN, LATAM, EU, USA, OTHER)
   */
  getRegionForCountry(countryCode) {
    if (!countryCode) return 'OTHER';
    
    for (const [regionKey, region] of Object.entries(this.regions)) {
      if (region.codes.includes(countryCode)) {
        return regionKey;
      }
    }
    
    return 'OTHER';
  }
  
/**
 * Actualiza la interfaz de usuario con los datos de impuestos - VERSIÓN MEJORADA
 */
updateTaxUI() {
  const hasTaxData = this.taxSummary && this.taxSummary.totalTax > 0;
  
  console.log('Actualizando UI con datos de impuestos:', this.taxSummary || 'Sin datos');
  
  const totalVatElement = document.getElementById('total-vat');
  const spainVatElement = document.getElementById('spain-vat');
  const euVatElement = document.getElementById('eu-vat');
  const nonEuVatElement = document.getElementById('non-eu-vat');
  
  if (totalVatElement) {
    totalVatElement.textContent = formatCurrency(hasTaxData ? this.taxSummary.totalTax : 0);
  } else {
    console.warn('Elemento #total-vat no encontrado');
  }
  
  if (spainVatElement) {
    spainVatElement.textContent = formatCurrency(hasTaxData ? this.taxSummary.spainTax : 0);
  } else {
    console.warn('Elemento #spain-vat no encontrado');
  }
  
  // Valores por defecto para UE y no-UE
  let euTax = 0;
  let nonEuTax = 0;
  
  if (hasTaxData && this.taxBreakdown && this.taxBreakdown.length > 0) {
    // La UE incluye todos los países UE excepto España
    const euCountryCodes = this.regions.EU.codes.filter(code => code !== 'ES');
    
    this.taxBreakdown.forEach(country => {
      if (euCountryCodes.includes(country.code)) {
        euTax += country.total;
      } else if (country.code !== 'ES') {
        // Si no es España y no es UE, es no-UE
        nonEuTax += country.total;
      }
    });
  }
  
  if (euVatElement) {
    euVatElement.textContent = formatCurrency(euTax);
  }
  
  if (nonEuVatElement) {
    nonEuVatElement.textContent = formatCurrency(nonEuTax);
  }
  
  const taxRatioBar = document.getElementById('tax-ratio-bar');
  if (taxRatioBar) {
    const ratioPercentage = hasTaxData ? this.taxSummary.taxRatio * 100 : 0;
    taxRatioBar.style.width = `${ratioPercentage}%`;
  }
  
  const taxableAmountBar = document.getElementById('taxable-amount-bar');
  if (taxableAmountBar) {
    let basePercentage = 0;
    if (hasTaxData && this.taxSummary.totalAmount > 0) {
      basePercentage = (this.taxSummary.taxableAmount / this.taxSummary.totalAmount) * 100;
    }
    taxableAmountBar.style.width = `${basePercentage}%`;
    console.log(`Actualizando barra de Base Imponible: ${basePercentage.toFixed(2)}%`);
  }
  
  this.ui.updateElement('tax-ratio-percentage', formatPercentage(hasTaxData ? this.taxSummary.taxRatio : 0));
  this.ui.updateElement('taxable-amount', formatCurrency(hasTaxData ? this.taxSummary.taxableAmount : 0));
  
  const taxableAmountPercentageEl = document.getElementById('taxable-amount-percentage');
  if (taxableAmountPercentageEl) {
    let basePercentage = 0;
    if (hasTaxData && this.taxSummary.totalAmount > 0) {
      basePercentage = (this.taxSummary.taxableAmount / this.taxSummary.totalAmount) * 100;
    }
    taxableAmountPercentageEl.textContent = formatPercentage(basePercentage / 100);
  }
  
  if (hasTaxData) {
    this.updateTaxBreakdown();
  } else {
    this.updateEmptyTaxBreakdown();
  }
}

  /**
 * Añade la barra de progreso para Base Imponible al HTML
 * Esta función debe ejecutarse durante la inicialización
 */
setupTaxableAmountBar() {
  const taxInfoDiv = document.querySelector('.d-flex.justify-content-between');
  
  if (!taxInfoDiv) {
    console.warn('No se encontró el contenedor para la barra de Base Imponible');
    return;
  }
  
  if (document.getElementById('taxable-amount-bar')) {
    console.log('La barra de Base Imponible ya existe');
    return;
  }
  
  console.log('Añadiendo barra de progreso para Base Imponible');
  
  const percentageSpan = document.createElement('span');
  percentageSpan.id = 'taxable-amount-percentage';
  percentageSpan.textContent = '0%';
  
  const taxableAmount = document.getElementById('taxable-amount');
  if (taxableAmount && taxableAmount.parentNode) {
    taxableAmount.parentNode.innerHTML = `Base Imponible: <span id="taxable-amount">€0.00</span> (<span id="taxable-amount-percentage">0%</span>)`;
  }
  
  const progressContainer = document.querySelector('.progress');
  
  if (progressContainer) {
    const taxableAmountBar = document.createElement('div');
    taxableAmountBar.id = 'taxable-amount-bar';
    taxableAmountBar.className = 'progress-bar';
    taxableAmountBar.style.width = '0%';
    taxableAmountBar.style.backgroundColor = '#4e79a7'; // Color diferente a la barra de IVA
    
    progressContainer.appendChild(taxableAmountBar);
  } else {
    console.warn('No se encontró el contenedor de la barra de progreso');
  }
}
  
  /**
   * Actualiza la sección de desglose de impuestos por país
   */
  updateTaxBreakdown() {
    const breakdownContainer = document.getElementById('tax-country-breakdown');
    if (!breakdownContainer || !this.taxBreakdown) return;
    
    breakdownContainer.innerHTML = '';
    
    if (this.taxBreakdown.length === 0) {
      breakdownContainer.innerHTML = `
        <div class="tax-item">
          <div class="tax-country">No hay datos de impuestos para el período seleccionado</div>
          <div class="tax-value">€0.00</div>
          <div class="tax-note">Seleccione otro período</div>
        </div>
      `;
      return;
    }
    
    this.taxBreakdown.forEach(country => {
      const countryEl = document.createElement('div');
      countryEl.className = 'tax-item';
      
      let originalValueHtml = '';
      
      if (country.currency_code && country.currency_code !== 'EUR' && country.total_original > 0) {
        // CORREGIDO: Utilizar la tasa de cambio exacta de este país
        const exchangeRate = country.exchange_rate || 0.05;
        
        originalValueHtml = `
          <div class="tax-original-value">
            ${formatCurrency(country.total_original, country.currency_code)}
            <span class="tax-exchange-rate">
              (1 ${country.currency_code} ≈ ${exchangeRate.toFixed(4)} €)
            </span>
          </div>
        `;
      }
      
      // Formato de HTML
      countryEl.innerHTML = `
        <div class="tax-country">${country.name} (${country.code})</div>
        <div class="tax-value">${formatCurrency(country.total)}</div>
        ${originalValueHtml}
        <div class="tax-note">Tasa: ${formatPercentage(country.rate)} • ${country.count} transacciones</div>
      `;
      
      breakdownContainer.appendChild(countryEl);
    });
  }
  
  /**
   * Inicializa los gráficos del módulo
   */
  initCharts() {
    if (!this.taxBreakdown || this.taxBreakdown.length === 0) return;
    
    // Primero destruir gráficos existentes para evitar duplicados
    this.destroyCharts();
    
    this.initTaxCountryChart();
    
    this.initTaxHistoryChart();
  }
  
  /**
   * Destruye los gráficos existentes
   */
destroyCharts() {
  try {
    console.log('Destruyendo gráficos de impuestos...');
    
    // 1. Primero intentar destruir usando las referencias internas
    if (this.charts.taxHistory) {
      console.log('Destruyendo gráfico taxHistory desde referencia interna');
      this.charts.taxHistory.destroy();
      this.charts.taxHistory = null;
    }
    
    if (this.charts.taxCountry) {
      console.log('Destruyendo gráfico taxCountry desde referencia interna');
      this.charts.taxCountry.destroy();
      this.charts.taxCountry = null;
    }
    
    // 2. Como respaldo, intentar destruir usando Chart.getChart
    ['tax-country-chart', 'tax-history-chart'].forEach(chartId => {
      const chartInstance = Chart.getChart(chartId);
      if (chartInstance) {
        console.log(`Destruyendo gráfico ${chartId} usando Chart.getChart`);
        chartInstance.destroy();
      }
    });
    
    console.log('Todos los gráficos de impuestos han sido destruidos');
  } catch (error) {
    console.warn('Error al destruir gráficos de impuestos:', error);
  }
}

  
  /**
   * Inicializa el gráfico de impuestos por país
   */
  initTaxCountryChart() {
    const ctx = document.getElementById('tax-country-chart');
    if (!ctx) return;
    
    if (Chart.getChart(ctx)) {
      Chart.getChart(ctx).destroy();
    }
    
    const topCountries = this.taxBreakdown.slice(0, 8);
    const otherCountries = this.taxBreakdown.slice(8);
    
    let chartData = [...topCountries];
    
    // Si hay más países, agruparlos como "Otros"
    if (otherCountries.length > 0) {
      const otherTotal = otherCountries.reduce((sum, country) => sum + country.total, 0);
      const otherCount = otherCountries.reduce((sum, country) => sum + country.count, 0);
      
      chartData.push({
        code: 'OTHERS',
        name: 'Otros países',
        total: otherTotal,
        count: otherCount,
        rate: 0 // No aplica una tasa única
      });
    }
    
    const labels = chartData.map(country => country.name);
    const taxValues = chartData.map(country => country.total);
    const taxRates = chartData.map(country => {
      if (country.code === 'OTHERS') return null;
      return country.rate * 100; // Convertir a porcentaje para visualización
    });
    
    const backgroundColors = chartData.map(country => {
      const regionKey = this.getRegionForCountry(country.code);
      return this.regions[regionKey]?.color || this.regions.OTHER.color;
    });
    
    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'IVA Recaudado (EUR)',
            data: taxValues,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Tasa de IVA (%)',
            data: taxRates,
            type: 'line',
            backgroundColor: 'transparent',
            borderColor: this.chartManager.colors.marron,
            borderWidth: 2,
            pointBackgroundColor: this.chartManager.colors.marron,
            pointRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              // Personalizar tooltip para mostrar información detallada
              label: function(context) {
                const dataset = context.dataset;
                const index = context.dataIndex;
                const value = context.parsed.y;
                
                if (dataset.yAxisID === undefined) {
                  const total = taxValues.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  
                  return `IVA: ${formatCurrency(value, 'EUR')} (${percentage}% del total)`;
                } 
                else if (value !== null) {
                  return `Tasa de IVA: ${value.toFixed(1)}%`;
                }
                return null;
              },
              afterLabel: function(context) {
                // Solo para el dataset principal (barras)
                if (context.dataset.yAxisID === undefined) {
                  const countryData = chartData[context.dataIndex];
                  
                  // Información básica: número de transacciones
                  let lines = [`Transacciones: ${countryData.count}`];
                  
                  // Si hay información de moneda original, mostrarla
                  if (countryData.currency_code && countryData.currency_code !== 'EUR' && 
                      countryData.total_original !== undefined) {
                    // Valor en moneda original
                    lines.push(`Monto original: ${formatCurrency(countryData.total_original, countryData.currency_code)}`);
                    
                    // Tasa de cambio utilizada
                    if (countryData.exchange_rate && countryData.exchange_rate !== 1) {
                      lines.push(`Tasa: 1 ${countryData.currency_code} = ${countryData.exchange_rate.toFixed(4)} EUR`);
                    }
                  }
                  
                  return lines;
                }
                return null;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'IVA Recaudado (EUR)'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR');
              }
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            title: {
              display: true,
              text: 'Tasa de IVA (%)'
            },
            min: 0,
            max: 25,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    };
    
    this.charts.taxCountry = new Chart(ctx, config);
  }
  
  /**
   * Inicializa el gráfico de historial de impuestos
   */
  initTaxHistoryChart() {
  const ctx = document.getElementById('tax-history-chart');
  if (!ctx) {
    console.warn('No se encontró el elemento tax-history-chart');
    return;
  }
  
  // IMPORTANTE: Asegurar que no existe ningún gráfico antes de crear uno nuevo
  this.ensureCanvasIsClean('tax-history-chart');
  
  this.getTaxHistory().then(monthlyTax => {
    if (!document.body.contains(ctx)) {
      console.log('El canvas ya no está en el DOM, cancelando creación de gráfico');
      return;
    }
    
    this.ensureCanvasIsClean('tax-history-chart');
    
    if (!monthlyTax || monthlyTax.length === 0) {
      console.warn('No hay datos históricos de impuestos disponibles');
      return;
    }
    
    console.log('Datos de historial de impuestos:', monthlyTax);
      
      // Datos para el gráfico
      const months = monthlyTax.map(m => m.label);
      const spainTax = monthlyTax.map(m => m.spainTax || 0);
      const latamTax = monthlyTax.map(m => m.latamTax || 0);
      const euTax = monthlyTax.map(m => m.euTax || 0);
      const otherTax = monthlyTax.map(m => m.otherTax || 0);
      
      // Configuración del gráfico
      const config = {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'España',
              data: spainTax,
              backgroundColor: this.regions.SPAIN.color,
              borderWidth: 0,
              borderRadius: 4,
              stack: 'Stack 0'
            },
            {
              label: 'Latinoamérica',
              data: latamTax,
              backgroundColor: this.regions.LATAM.color,
              borderWidth: 0,
              borderRadius: 4,
              stack: 'Stack 0'
            },
            {
              label: 'Unión Europea',
              data: euTax,
              backgroundColor: this.regions.EU.color,
              borderWidth: 0,
              borderRadius: 4,
              stack: 'Stack 0'
            },
            {
              label: 'Otros países',
              data: otherTax,
              backgroundColor: this.regions.OTHER.color,
              borderWidth: 0,
              borderRadius: 4,
              stack: 'Stack 0'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                // Tooltip personalizado
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ${formatCurrency(value, 'EUR')}`;
                },
                footer: function(tooltipItems) {
                  let total = 0;
                  tooltipItems.forEach(tooltipItem => {
                    total += tooltipItem.parsed.y;
                  });
                  return `Total: ${formatCurrency(total, 'EUR')}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'IVA Recaudado (EUR)'
              },
              ticks: {
                callback: function(value) {
                  return formatCurrency(value, 'EUR');
                }
              }
            }
          }
        }
      };
      
      try {
      this.charts.taxHistory = new Chart(ctx, config);
      console.log('Gráfico tax-history-chart creado correctamente');
    } catch (error) {
      console.error('Error al crear gráfico de historial:', error);
    }
  }).catch(error => {
    console.error('Error al obtener datos de historial de impuestos:', error);
  });
}
  
  /**
   * Obtiene el historial de impuestos (últimos 12 meses)
   * @returns {Promise<Array>} Datos de impuestos agrupados por mes
   */
  async getTaxHistory() {
    try {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      
      const filters = {
        date_from: startDate.toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0]
      };
      
      // Si no tenemos transacciones, obtenerlas primero
      if (!this.transactions || this.transactions.length === 0) {
        try {
          const transactionsResponse = await this.api.getTransactions(filters);
          
          if (Array.isArray(transactionsResponse)) {
            this.transactions = transactionsResponse;
          } else if (transactionsResponse && transactionsResponse.data) {
            this.transactions = transactionsResponse.data;
          } else {
            console.warn('No se pudieron obtener transacciones para el historial');
            return []; // Devolver array vacío
          }
        } catch (error) {
          console.error('Error al obtener transacciones para historial:', error);
          return []; // Devolver array vacío
        }
      }
      
      return this.calculateHistoryFromTransactions(this.transactions);
    } catch (error) {
      console.error('Error al obtener historial de impuestos:', error);
      return []; // Devolver array vacío en caso de error
    }
  }

  /**
 * Método auxiliar para asegurar que un canvas está limpio
 * @param {string} chartId - ID del canvas a verificar
 */
ensureCanvasIsClean(chartId) {
  try {
    const existingChart = Chart.getChart(chartId);
    if (existingChart) {
      console.log(`Limpiando canvas ${chartId} existente antes de crear nuevo gráfico`);
      existingChart.destroy();
      
      // Si es el gráfico de historial, limpiar referencia interna
      if (chartId === 'tax-history-chart' && this.charts.taxHistory) {
        this.charts.taxHistory = null;
      }
      
      // Si es el gráfico de país, limpiar referencia interna
      if (chartId === 'tax-country-chart' && this.charts.taxCountry) {
        this.charts.taxCountry = null;
      }
    }
  } catch (error) {
    console.warn(`Error al verificar/limpiar canvas ${chartId}:`, error);
  }
}
  
  /**
   * Calcula historial de impuestos desde transacciones
   * @param {Array} transactions - Lista de transacciones
   * @returns {Array} Datos transformados para el gráfico
   */
  calculateHistoryFromTransactions(transactions) {
    // Agrupar datos por mes
    const monthlyData = {};
    
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Clave para el mes (YYYY-MM)
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // Etiqueta legible
      const label = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      monthlyData[key] = {
        key,
        label,
        totalTax: 0,
        spainTax: 0,
        latamTax: 0,
        euTax: 0,
        otherTax: 0,
        transactions: []
      };
    }
    
    transactions.forEach(transaction => {
      try {
        const txDate = new Date(transaction.updated_at || transaction.created_at);
        
        if (isNaN(txDate.getTime())) {
          console.warn('Fecha de transacción no válida:', transaction.updated_at || transaction.created_at);
          return;
        }
        
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[txKey]) {
          const taxAmountEur = parseFloat(transaction.tax_amount_eur || 0);
          const countryCode = transaction.country_code || 'UNKNOWN';
          
          // Clasificar según la región del país
          const regionKey = this.getRegionForCountry(countryCode);
          
          switch (regionKey) {
            case 'SPAIN':
              monthlyData[txKey].spainTax += taxAmountEur;
              break;
            case 'LATAM':
              monthlyData[txKey].latamTax += taxAmountEur;
              break;
            case 'EU':
              monthlyData[txKey].euTax += taxAmountEur;
              break;
            default:
              monthlyData[txKey].otherTax += taxAmountEur;
              break;
          }
          
          monthlyData[txKey].totalTax = 
            monthlyData[txKey].spainTax + 
            monthlyData[txKey].latamTax + 
            monthlyData[txKey].euTax + 
            monthlyData[txKey].otherTax;
          
          monthlyData[txKey].transactions.push(transaction);
        }
      } catch (err) {
        console.warn('Error al procesar transacción para historial:', err);
      }
    });
    
    return Object.values(monthlyData).sort((a, b) => a.key.localeCompare(b.key));
  }
  
  /**
   * Redimensiona los gráficos
   */
  resizeCharts() {
    // Redimensionar todos los gráficos
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }
  
/**
 * Refresca los datos de impuestos
 * @param {boolean} forceApi - Forzar recarga desde API aunque haya datos locales
 */
async refreshTaxData(forceApi = false) {
  try {
    console.log('Refrescando datos fiscales con filtros actuales');
    
    // Si no estamos forzando API y tenemos datos locales, usar filtrado local
    if (!forceApi && this.allTransactions && this.allTransactions.length > 0 && this.dateRange) {
      console.log('Usando filtrado local para refrescar datos fiscales');
      this.refreshWithLocalData();
      return;
    }
    
    // Si llegamos aquí, es porque necesitamos datos frescos de la API
    this.ui.showLoading('Actualizando datos fiscales...');
    
    this.api.clearCache('transactions');
    
    // Destruir gráficos existentes
    this.destroyCharts();
    
    // MEJORADO: No limpiar datos existentes hasta que tengamos los nuevos
    // Esto evita parpadeos y mantiene la UI actualizada mientras se cargan los nuevos datos
    
    // Recargar datos
    const success = await this.loadTaxData();
    
    this.ui.hideLoading();
    
    if (success) {
      this.ui.showSuccessMessage('Datos de impuestos actualizados correctamente');
    }
  } catch (error) {
    console.error('Error al refrescar datos fiscales:', error);
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudieron actualizar los datos fiscales');
  }
}

  /**
 * Exporta el informe de impuestos en Excel o PDF con formato optimizado
 */
async exportTaxReport() {
  try {
    if (!this.taxSummary) {
      this.ui.showErrorMessage('Error', 'No hay datos de impuestos para exportar');
      return;
    }
    
    let periodLabel = 'Personalizado';
    let dateRangeText = '';
    
    if (this.dateRange) {
      dateRangeText = `${this.dateRange.start} a ${this.dateRange.end}`;
      periodLabel = this.dateRange.label || 'Personalizado';
    } else {
      // Por defecto usar trimestre actual
      const quarterMonths = {
        1: 'Ene-Mar',
        2: 'Abr-Jun',
        3: 'Jul-Sep',
        4: 'Oct-Dic'
      };
      
      dateRangeText = `${quarterMonths[this.quarter]} ${this.year}`;
      periodLabel = `${this.quarter}T ${this.year}`;
    }
    
    // Nombre del archivo
    const fileName = `Informe_IVA_${periodLabel.replace(/\s/g, '_')}`;
    
    const format = document.getElementById('export-format')?.value || exportManager.getPreferredFormat('excel');
    
    console.log(`Exportando informe de IVA en formato: ${format}`);
    
    // Si es Excel, usar el método original
    if (format.toLowerCase() === 'excel' || format.toLowerCase() === 'xlsx') {
      return await this.exportTaxReportToExcel(fileName, dateRangeText, periodLabel);
    }
    // Si es PDF, usar el nuevo método
    else if (format.toLowerCase() === 'pdf') {
      return await this.exportTaxReportToPDF(fileName, dateRangeText, periodLabel);
    }
    // Otros formatos (por ejemplo, CSV)
    else {
      console.warn(`Formato no soportado para informe de IVA: ${format}`);
      this.ui.showErrorMessage('Formato no soportado', 'El informe de IVA solo está disponible en Excel o PDF.');
      return false;
    }
  } catch (error) {
    console.error('Error al exportar informe de IVA:', error);
    this.ui.showErrorMessage('Error al exportar', 'No se pudo exportar el informe de IVA.');
    return false;
  }
}

/**
 * Exporta el informe de impuestos a PDF con formato compacto en una sola página
 */
async exportTaxReportToPDF(fileName, dateRangeText, periodLabel) {
  try {
    const brandColors = {
      primary: '656d4a',    // Verde principal
      secondary: 'a4ac86',  // Verde claro
      background: 'f0efe7',  // Fondo
      marron: '582f0e',     // Marrón
      marronOscuro: '442409', // Marrón oscuro
      text: '333333',       // Color texto
      white: 'FFFFFF',      // Blanco
      headerBg: 'e2ddd6'    // Fondo de encabezados
    };
    
    // 1. PREPARAR LOS DATOS PARA LAS DIFERENTES TABLAS - VERSIÓN COMPACTA
    
    // 1.1 Tabla de distribución del IVA compacta (España vs Resto del mundo)
    const distribucionIVA = [
      {
        'Región': 'España',
        'Importe': this.taxSummary.spainTax,
        'Porcentaje': this.taxSummary.spainTaxPercentage / 100
      },
      {
        'Región': 'Resto del mundo',
        'Importe': this.taxSummary.otherTax,
        'Porcentaje': this.taxSummary.otherTaxPercentage / 100
      },
      {
        'Región': 'TOTAL',
        'Importe': this.taxSummary.totalTax,
        'Porcentaje': 1 // 100%
      }
    ];
    
    // 1.2 Tabla de desglose por país - VERSIÓN COMPACTA
    const importantCountries = ['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'US'];
    
    const topCountries = [...this.taxBreakdown]
      .sort((a, b) => {
        const aImportant = importantCountries.includes(a.code);
        const bImportant = importantCountries.includes(b.code);
        
        if (aImportant && !bImportant) return -1;
        if (!aImportant && bImportant) return 1;
        if (aImportant && bImportant) {
          return importantCountries.indexOf(a.code) - importantCountries.indexOf(b.code);
        }
        return b.total - a.total;
      })
      .slice(0, 10); // Solo mostrar los 10 primeros países

    const desgloseData = topCountries.map(country => {
      return {
        'País': country.name,
        'Código': country.code,
        'Tipo IVA': country.rate * 100,
        'IVA (EUR)': country.total,
        'Base (EUR)': country.taxBase,
        'Transacciones': country.count
      };
    });
    
    desgloseData.push({
      'País': 'TOTALES',
      'Código': '',
      'Tipo IVA': '',
      'IVA (EUR)': this.taxSummary.totalTax,
      'Base (EUR)': this.taxSummary.taxableAmount,
      'Transacciones': this.taxBreakdown.reduce((sum, country) => sum + country.count, 0)
    });
    
    // 1.3 Datos para análisis por región - VERSIÓN COMPACTA
    const regionTotals = {
      'SPAIN': { name: 'España', total: 0, count: 0, countries: new Set() },
      'LATAM': { name: 'Latinoamérica', total: 0, count: 0, countries: new Set() },
      'EU': { name: 'Unión Europea', total: 0, count: 0, countries: new Set() },
      'USA': { name: 'Estados Unidos', total: 0, count: 0, countries: new Set() },
      'OTHER': { name: 'Otros países', total: 0, count: 0, countries: new Set() }
    };
    
    this.taxBreakdown.forEach(country => {
      const regionKey = this.getRegionForCountry(country.code);
      regionTotals[regionKey].total += country.total;
      regionTotals[regionKey].count += country.count;
      regionTotals[regionKey].countries.add(country.code);
    });
    
    const totalTax = Object.values(regionTotals).reduce((sum, region) => sum + region.total, 0);
    
    const regionData = [];
    
    ['SPAIN', 'LATAM', 'EU', 'USA', 'OTHER'].forEach(regionKey => {
      const region = regionTotals[regionKey];
      const percentage = totalTax > 0 ? (region.total / totalTax) * 100 : 0;
      
      regionData.push({
        'Región': region.name,
        'IVA (EUR)': region.total,
        '%': percentage / 100,
        'Países': region.countries.size,
        'Trans.': region.count
      });
    });
    
    regionData.push({
      'Región': 'TOTAL',
      'IVA (EUR)': totalTax,
      '%': 1,
      'Países': this.taxBreakdown.length,
      'Trans.': this.taxBreakdown.reduce((sum, country) => sum + country.count, 0)
    });
    
    // 1.4 Datos para países hispanohablantes - VERSIÓN COMPACTA Y SIMPLIFICADA
    const hispanicCountries = this.taxBreakdown
      .filter(country => 
        this.regions.SPAIN.codes.includes(country.code) || 
        this.regions.LATAM.codes.includes(country.code)
      )
      .sort((a, b) => b.total - a.total)
      .slice(0, 6); // Solo los 6 más importantes
    
    const totalHispanic = hispanicCountries.reduce((sum, country) => sum + country.total, 0);
    
    const hispanicData = [];
    
    // Datos de países hispanos
    hispanicCountries.forEach(country => {
      const percentage = totalHispanic > 0 ? (country.total / totalHispanic) * 100 : 0;
      
      hispanicData.push({
        'País': country.name,
        'IVA (EUR)': country.total,
        '%': percentage / 100,
        'Trans.': country.count
      });
    });
    
    // Fila de total
    hispanicData.push({
      'País': 'TOTAL',
      'IVA (EUR)': totalHispanic,
      '%': 1,
      'Trans.': hispanicCountries.reduce((sum, country) => sum + country.count, 0)
    });
    
    // 2. EXPORTAR A PDF USANDO EXPORTMANAGER
    
    // 2.1 Opciones específicas para PDF
    const pdfOptions = {
      pdf: {
        pageSize: 'A4', // Cambiado a A4
        orientation: 'portrait', // Cambiado a portrait (vertical)
        optimizeForWideTables: true,
        fontSizeReduction: 'large',
        compressImages: true,
        fitToPage: true,
        margins: [10, 10, 10, 10] // Márgenes ajustados para A4 portrait
      }
    };

    // 2.2 Preparar la "portada" con resumen general
    const resumenGeneral = [
      {
        'Concepto': 'Base Imponible',
        'Valor': this.taxSummary.taxableAmount
      },
      {
        'Concepto': 'IVA Total',
        'Valor': this.taxSummary.totalTax
      },
      {
        'Concepto': 'Total Facturado',
        'Valor': this.taxSummary.totalAmount
      },
      {
        'Concepto': '% IVA sobre ventas',
        'Valor': this.taxSummary.taxRatio
      }
    ];
    
    // 2.3 Definir secciones del documento PDF
    const pdfSections = [
      {
        title: 'INFORME DE IVA',
        subtitle: `Período: ${dateRangeText}`,
        type: 'header'
      },
      {
        title: 'RESUMEN GENERAL',
        data: resumenGeneral,
        type: 'table',
        columnWidths: { 'Concepto': '70%', 'Valor': '30%' },
        currencyFormats: { 'Valor': '€#,##0.00' },
        percentFormats: ['% IVA sobre ventas']
      },
      {
        title: 'DISTRIBUCIÓN DEL IVA',
        data: distribucionIVA,
        type: 'table',
        columnWidths: { 'Región': '50%', 'Importe': '25%', 'Porcentaje': '25%' },
        currencyFormats: { 'Importe': '€#,##0.00' },
        percentFormats: ['Porcentaje']
      },
      {
        title: 'ANÁLISIS POR REGIÓN',
        data: regionData,
        type: 'table',
        columnWidths: null, // Usar ajuste automático
        currencyFormats: { 'IVA (EUR)': '€#,##0.00' },
        percentFormats: ['%']
      },
      {
        title: 'DESGLOSE POR PAÍS',
        data: desgloseData,
        type: 'table',
        columnWidths: null, // Usar ajuste automático
        currencyFormats: { 
          'IVA (EUR)': '€#,##0.00',
          'Base (EUR)': '€#,##0.00'
        },
        percentFormats: ['Tipo IVA']
      },
      {
        title: 'PAÍSES HISPANOHABLANTES',
        data: hispanicData,
        type: 'table',
        columnWidths: null, // Usar ajuste automático
        currencyFormats: { 'IVA (EUR)': '€#,##0.00' },
        percentFormats: ['%']
      }
    ];
    
    exportManager.exportTaxReportToPDF(fileName, pdfSections, {
      ...pdfOptions,
      title: `Informe de IVA - ${periodLabel}`,
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp'
    });
    
    this.ui.showSuccessMessage('Informe de IVA exportado correctamente en PDF');
    return true;
  } catch (error) {
    console.error('Error al exportar informe de IVA a PDF:', error);
    this.ui.showErrorMessage('Error al exportar', 'No se pudo exportar el informe de IVA a PDF.');
    return false;
  }
}

/**
 * Exporta el informe de impuestos a Excel (versión original)
 * Este método contiene la lógica original para exportar a Excel
 */
async exportTaxReportToExcel(fileName, dateRangeText, periodLabel) {
  try {
    const Excel = window.ExcelJS;
    const workbook = new Excel.Workbook();
    
    workbook.creator = 'Acadelia';
    workbook.lastModifiedBy = 'Acadelia';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    const brandColors = {
      primary: '656d4a',    // Verde principal
      secondary: 'a4ac86',  // Verde claro
      background: 'f0efe7',  // Fondo
      marron: '582f0e',     // Marrón
      marronOscuro: '442409', // Marrón oscuro
      text: '333333',       // Color texto
      white: 'FFFFFF',      // Blanco
      headerBg: 'e2ddd6'    // Fondo de encabezados
    };
    
    //----------------------
    // HOJA 1: RESUMEN
    //----------------------
    const resumenSheet = workbook.addWorksheet('Resumen', {
      views: [{showGridLines: true}],
      properties: {tabColor: {argb: brandColors.secondary}}
    });
    
    const titleRow = resumenSheet.addRow(['INFORME DE IVA']);
    titleRow.font = {
      name: 'Arial',
      family: 4,
      size: 22,
      bold: true,
      color: { argb: brandColors.marron }
    };
    titleRow.height = 36;
    
    // Información general
    const infoHeaderRow = resumenSheet.addRow(['INFORMACIÓN DEL REPORTE']);
    infoHeaderRow.font = {
      name: 'Arial',
      family: 4,
      size: 12,
      bold: true,
      color: { argb: brandColors.white }
    };
    infoHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColors.primary }
    };
    infoHeaderRow.height = 24;
    
    const periodoRow = resumenSheet.addRow(['Período:', dateRangeText]);
    periodoRow.getCell(1).font = { bold: true, color: { argb: brandColors.marron } };
    
    const fechaRow = resumenSheet.addRow(['Fecha de generación:', new Date().toLocaleDateString('es-ES')]);
    fechaRow.getCell(1).font = { bold: true, color: { argb: brandColors.marron } };
    
    resumenSheet.addRow(['']);
    
    // Sección de Resumen General
    const resumenTitleRow = resumenSheet.addRow(['RESUMEN GENERAL']);
    resumenTitleRow.font = {
      name: 'Arial',
      family: 4,
      size: 14,
      bold: true,
      color: { argb: brandColors.white }
    };
    resumenTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColors.primary }
    };
    resumenTitleRow.height = 28;
    
    // Datos de resumen
    const baseImponibleRow = resumenSheet.addRow(['Base Imponible:', this.taxSummary.taxableAmount]);
    baseImponibleRow.getCell(1).font = { bold: true };
    baseImponibleRow.getCell(2).numFmt = '€#,##0.00';
    baseImponibleRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'EAEAEA' }
    };
    
    const ivaTotalRow = resumenSheet.addRow(['IVA Total:', this.taxSummary.totalTax]);
    ivaTotalRow.getCell(1).font = { bold: true };
    ivaTotalRow.getCell(2).numFmt = '€#,##0.00';
    ivaTotalRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'EAEAEA' }
    };
    
    const totalFacturadoRow = resumenSheet.addRow(['Total Facturado:', this.taxSummary.totalAmount]);
    totalFacturadoRow.getCell(1).font = { bold: true };
    totalFacturadoRow.getCell(2).numFmt = '€#,##0.00';
    totalFacturadoRow.getCell(2).font = { bold: true };
    totalFacturadoRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColors.background }
    };
    
    const ivaRatioRow = resumenSheet.addRow(['% IVA sobre ventas:', this.taxSummary.taxRatio]);
    ivaRatioRow.getCell(1).font = { bold: true };
    ivaRatioRow.getCell(2).numFmt = '0.0%';
    ivaRatioRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'EAEAEA' }
    };
    
    resumenSheet.addRow(['']);
    
    // Sección de Distribución del IVA
    const distribTitleRow = resumenSheet.addRow(['DISTRIBUCIÓN DEL IVA']);
    distribTitleRow.font = {
      name: 'Arial',
      family: 4,
      size: 14,
      bold: true,
      color: { argb: brandColors.white }
    };
    distribTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColors.primary }
    };
    distribTitleRow.height = 28;
    
    // Encabezados de tabla de distribución
    const distribHeaderRow = resumenSheet.addRow(['Región', 'Importe', 'Porcentaje']);
    distribHeaderRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandColors.headerBg }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Datos de distribución
    const espanaRow = resumenSheet.addRow([
      'España', 
      this.taxSummary.spainTax, 
      this.taxSummary.spainTaxPercentage / 100
    ]);
    espanaRow.getCell(2).numFmt = '€#,##0.00';
    espanaRow.getCell(3).numFmt = '0.0%';
    espanaRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e6ffea' }  // Verde claro para España
    };
    
    const restoRow = resumenSheet.addRow([
      'Resto del mundo', 
      this.taxSummary.otherTax, 
      this.taxSummary.otherTaxPercentage / 100
    ]);
    restoRow.getCell(2).numFmt = '€#,##0.00';
    restoRow.getCell(3).numFmt = '0.0%';
    restoRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'fff8e1' }  // Amarillo claro para resto del mundo
    };
    
    // Fila de total
    const totalDistribRow = resumenSheet.addRow([
      'TOTAL',
      this.taxSummary.totalTax,
      1 // 100%
    ]);
    totalDistribRow.getCell(2).numFmt = '€#,##0.00';
    totalDistribRow.getCell(3).numFmt = '0.0%';
    totalDistribRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandColors.secondary }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Ajustar ancho de columnas
    resumenSheet.getColumn(1).width = 25;
    resumenSheet.getColumn(2).width = 15;
    resumenSheet.getColumn(3).width = 15;
    
    //----------------------
    // HOJA 2: DESGLOSE POR PAÍS
    //----------------------
    const desgloseSheet = workbook.addWorksheet('Desglose por País', {
      views: [{showGridLines: true}],
      properties: {tabColor: {argb: brandColors.secondary}}
    });
    
    const desgloseTitleRow = desgloseSheet.addRow(['DESGLOSE DE IMPUESTOS POR PAÍS']);
    desgloseTitleRow.font = {
      name: 'Arial',
      family: 4,
      size: 18,
      bold: true,
      color: { argb: brandColors.marron }
    };
    desgloseTitleRow.height = 30;
    
    // Información general
    desgloseSheet.addRow(['Período:', dateRangeText]);
    desgloseSheet.addRow(['']);
    
    // Encabezados
    const desgloseHeaderRow = desgloseSheet.addRow([
      'País', 'Código', 'Moneda', 'Tasa de Cambio', 'Tipo IVA', 
      'IVA Recaudado (EUR)', 'IVA Original', 
      'Base Imponible (EUR)', 'Base Imponible Original', 
      'Transacciones'
    ]);
    
    // Estilo de encabezados
    desgloseHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandColors.primary }
      };
      cell.font = {
        name: 'Arial',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: brandColors.white }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: brandColors.primary } },
        left: { style: 'thin', color: { argb: brandColors.primary } },
        bottom: { style: 'thin', color: { argb: brandColors.primary } },
        right: { style: 'thin', color: { argb: brandColors.primary } }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
    desgloseHeaderRow.height = 25;
    
    // Datos de desglose por país
    let rowIndex = 0;
    // Destacar países importantes primero
    const importantCountries = ['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'US', 'DE', 'FR', 'GB', 'IT'];
    
    let sortedBreakdown = [...this.taxBreakdown];
    sortedBreakdown.sort((a, b) => {
      const aImportant = importantCountries.includes(a.code);
      const bImportant = importantCountries.includes(b.code);
      
      if (aImportant && !bImportant) return -1;
      if (!aImportant && bImportant) return 1;
      if (aImportant && bImportant) {
        return importantCountries.indexOf(a.code) - importantCountries.indexOf(b.code);
      }
      return b.total - a.total; // Orden normal por total para los no importantes
    });
    
    sortedBreakdown.forEach(country => {
      let tasaDeCambio = country.exchange_rate === 1 ? 
        'N/A' : country.exchange_rate.toFixed(4);
      
      // Valores originales solo si la moneda no es EUR
      const monedaOriginal = country.currency_code || 'EUR';
      const ivaOriginal = country.currency_code !== 'EUR' ? 
        country.total_original || 0 : null;
      
      const baseOriginal = country.currency_code !== 'EUR' ? 
        country.taxBase_original || 0 : null;
      
      const row = desgloseSheet.addRow([
        country.name,
        country.code,
        monedaOriginal,
        tasaDeCambio,
        country.rate * 100,
        country.total,
        ivaOriginal,
        country.taxBase,
        baseOriginal,
        country.count
      ]);
      
      row.getCell(5).numFmt = '0.0"%"';
      row.getCell(6).numFmt = '€#,##0.00';
      
      // CORREGIDO: Formato para valores en moneda original
      if (ivaOriginal !== null) {
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(7).value = ivaOriginal;
      }
      
      row.getCell(8).numFmt = '€#,##0.00';
      
      // CORREGIDO: Formato para base imponible original
      if (baseOriginal !== null) {
        row.getCell(9).numFmt = '#,##0.00';
        row.getCell(9).value = baseOriginal;
      }
      
      row.getCell(10).numFmt = '#,##0';
      
      if (importantCountries.includes(country.code)) {
        let bgColor;
        
        // Colores específicos por país o región
        switch (country.code) {
          case 'ES': bgColor = 'e6ffea'; break; // Verde claro para España
          case 'MX': 
          case 'CO': 
          case 'AR': 
          case 'CL': 
          case 'PE': bgColor = 'fff8e1'; break; // Amarillo claro para Latinoamérica
          case 'US': bgColor = 'e3f2fd'; break; // Azul claro para USA
          case 'DE': 
          case 'FR': 
          case 'GB': 
          case 'IT': bgColor = 'f3e5f5'; break; // Violeta claro para Europa
          default: bgColor = brandColors.background;
        }
        
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
          cell.font = { 
            bold: country.code === 'ES', // Negrita para España
            color: { argb: brandColors.text }
          };
        });
      }
      else if (rowIndex % 2 !== 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: brandColors.background }
          };
        });
      }
      
      rowIndex++;
    });
    
    const totalRow = desgloseSheet.addRow([
      'TOTALES',
      '',
      '',
      '',
      '',
      this.taxSummary.totalTax,
      '',
      this.taxSummary.taxableAmount,
      '',
      this.taxBreakdown.reduce((sum, country) => sum + country.count, 0)
    ]);
    
    totalRow.getCell(6).numFmt = '€#,##0.00';
    totalRow.getCell(8).numFmt = '€#,##0.00';
    totalRow.getCell(10).numFmt = '#,##0';
    
    totalRow.eachCell((cell, colIndex) => {
      if (colIndex === 1 || colIndex === 6 || colIndex === 8 || colIndex === 10) {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: brandColors.headerBg }
        };
      }
    });
    
    // Ajustar ancho de columnas
    for (let i = 1; i <= 10; i++) {
      desgloseSheet.getColumn(i).width = 18;
    }
    desgloseSheet.getColumn(1).width = 25; // País
    
    desgloseSheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: 10 }
    };
    
    // Congelar paneles
    desgloseSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 4, activeCell: 'A1' }
    ];
    
    //----------------------
    // HOJA 3: ANÁLISIS POR REGIÓN
    //----------------------
    const regionSheet = workbook.addWorksheet('Análisis por Región', {
      views: [{showGridLines: true}],
      properties: {tabColor: {argb: brandColors.secondary}}
    });
    
    const regionTitleRow = regionSheet.addRow(['ANÁLISIS DE IMPUESTOS POR REGIÓN']);
    regionTitleRow.font = {
      name: 'Arial',
      family: 4,
      size: 18,
      bold: true,
      color: { argb: brandColors.marron }
    };
    regionTitleRow.height = 30;
    
    // Información general
    regionSheet.addRow(['Período:', dateRangeText]);
    regionSheet.addRow(['']);
    
    // Encabezados
    const regionHeaderRow = regionSheet.addRow([
      'Región', 'IVA Recaudado', '% del Total', 'Países', 'Transacciones'
    ]);
    
    // Estilo de encabezados
    regionHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandColors.primary }
      };
      cell.font = {
        name: 'Arial',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: brandColors.white }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: brandColors.primary } },
        left: { style: 'thin', color: { argb: brandColors.primary } },
        bottom: { style: 'thin', color: { argb: brandColors.primary } },
        right: { style: 'thin', color: { argb: brandColors.primary } }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
    regionHeaderRow.height = 25;
    
    // Agrupar datos por región
    const regionTotals = {
      'SPAIN': { name: 'España', total: 0, count: 0, countries: new Set() },
      'LATAM': { name: 'Latinoamérica', total: 0, count: 0, countries: new Set() },
      'EU': { name: 'Unión Europea', total: 0, count: 0, countries: new Set() },
      'USA': { name: 'Estados Unidos', total: 0, count: 0, countries: new Set() },
      'OTHER': { name: 'Otros países', total: 0, count: 0, countries: new Set() }
    };
    
    this.taxBreakdown.forEach(country => {
      const regionKey = this.getRegionForCountry(country.code);
      regionTotals[regionKey].total += country.total;
      regionTotals[regionKey].count += country.count;
      regionTotals[regionKey].countries.add(country.code);
    });
    
    const totalTax = Object.values(regionTotals).reduce((sum, region) => sum + region.total, 0);
    
    // Datos por región
    let regionIndex = 0;
    let regionColors = {
      'SPAIN': 'e6ffea', // Verde claro
      'LATAM': 'fff8e1', // Amarillo claro
      'EU': 'e3f2fd',    // Azul claro
      'USA': 'f3e5f5',   // Púrpura claro
      'OTHER': 'f5f5f5'  // Gris claro
    };
    
    ['SPAIN', 'LATAM', 'EU', 'USA', 'OTHER'].forEach(regionKey => {
      const region = regionTotals[regionKey];
      const percentage = totalTax > 0 ? (region.total / totalTax) * 100 : 0;
      
      const row = regionSheet.addRow([
        region.name,
        region.total,
        percentage / 100,
        region.countries.size,
        region.count
      ]);
      
      // Formato numérico
      row.getCell(2).numFmt = '€#,##0.00';
      row.getCell(3).numFmt = '0.0%';
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0';
      
      // Estilo específico para cada región
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: regionColors[regionKey] }
        };
      });
      
      regionIndex++;
    });
    
    // Fila de total
    const totalRegionRow = regionSheet.addRow(['TOTAL', totalTax, 1, 
      this.taxBreakdown.length, // Total de países únicos
      this.taxBreakdown.reduce((sum, country) => sum + country.count, 0) // Total transacciones
    ]);
    totalRegionRow.getCell(2).numFmt = '€#,##0.00';
    totalRegionRow.getCell(3).numFmt = '0.0%';
    totalRegionRow.getCell(4).numFmt = '#,##0';
    totalRegionRow.getCell(5).numFmt = '#,##0';
    totalRegionRow.font = {
      bold: true
    };
    totalRegionRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColors.headerBg }
    };
    
    // Ajustar ancho de columnas
    regionSheet.getColumn(1).width = 25;
    regionSheet.getColumn(2).width = 18;
    regionSheet.getColumn(3).width = 15;
    regionSheet.getColumn(4).width = 15;
    regionSheet.getColumn(5).width = 15;
    
    //----------------------
    // HOJA 4: PAÍSES HISPANOHABLANTES
    //----------------------
    const hispanicSheet = workbook.addWorksheet('Países Hispanohablantes', {
      views: [{showGridLines: true}],
      properties: {tabColor: {argb: brandColors.secondary}}
    });
    
    const hispanicTitleRow = hispanicSheet.addRow(['ANÁLISIS DE PAÍSES HISPANOHABLANTES']);
    hispanicTitleRow.font = {
      name: 'Arial',
      family: 4,
      size: 18,
      bold: true,
      color: { argb: brandColors.marron }
    };
    hispanicTitleRow.height = 30;
    
    // Información general
    hispanicSheet.addRow(['Período:', dateRangeText]);
    hispanicSheet.addRow(['']);
    
    // Encabezados
    const hispanicHeaderRow = hispanicSheet.addRow([
      'País', 'IVA Recaudado (EUR)', '% del Total Hispano', 
      'Tasa IVA', 'Transacciones', 'Moneda Local', 'Tasa de Cambio'
    ]);
    
    // Estilo de encabezados
    hispanicHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandColors.primary }
      };
      cell.font = {
        name: 'Arial',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: brandColors.white }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: brandColors.primary } },
        left: { style: 'thin', color: { argb: brandColors.primary } },
        bottom: { style: 'thin', color: { argb: brandColors.primary } },
        right: { style: 'thin', color: { argb: brandColors.primary } }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
    hispanicHeaderRow.height = 25;
    
    const hispanicCountries = this.taxBreakdown.filter(country => 
      this.regions.SPAIN.codes.includes(country.code) || 
      this.regions.LATAM.codes.includes(country.code)
    );
    
    hispanicCountries.sort((a, b) => b.total - a.total);
    
    const totalHispanic = hispanicCountries.reduce((sum, country) => sum + country.total, 0);
    
    // Datos de países hispanos
    let hispanicIndex = 0;
    hispanicCountries.forEach(country => {
      const percentage = totalHispanic > 0 ? (country.total / totalHispanic) * 100 : 0;
      
      const row = hispanicSheet.addRow([
        country.name,
        country.total,
        percentage / 100,
        country.rate,
        country.count,
        country.currency_code || 'EUR',
        country.currency_code !== 'EUR' ? country.exchange_rate : 'N/A'
      ]);
      
      // Formato numérico
      row.getCell(2).numFmt = '€#,##0.00';
      row.getCell(3).numFmt = '0.0%';
      row.getCell(4).numFmt = '0.0%';
      row.getCell(5).numFmt = '#,##0';
      if (typeof row.getCell(7).value === 'number') {
        row.getCell(7).numFmt = '0.0000';
      }
      
      // Estilo según país
      let bgColor;
      if (country.code === 'ES') {
        bgColor = 'e6ffea'; // Verde claro para España
        row.font = { bold: true };
      } else {
        bgColor = 'fff8e1'; // Amarillo claro para Latinoamérica
      }
      
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
      });
      
      hispanicIndex++;
    });
    
    // Fila de total
    const totalHispanicRow = hispanicSheet.addRow(['TOTAL', totalHispanic, 1, '', 
      hispanicCountries.reduce((sum, country) => sum + country.count, 0), // Total transacciones
      '', ''
    ]);
    totalHispanicRow.getCell(2).numFmt = '€#,##0.00';
    totalHispanicRow.getCell(3).numFmt = '0.0%';
    totalHispanicRow.getCell(5).numFmt = '#,##0';
    totalHispanicRow.font = {
      bold: true
    };
    totalHispanicRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: brandColors.headerBg }
    };
    
    // Ajustar ancho de columnas
    for (let i = 1; i <= 7; i++) {
      hispanicSheet.getColumn(i).width = 18;
    }
    hispanicSheet.getColumn(1).width = 25; // País
    
    hispanicSheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: 7 }
    };
    
    // Congelar paneles
    hispanicSheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 4, activeCell: 'A1' }
    ];
    
    const pageSetup = {
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      orientation: 'landscape',
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    };
    
    [resumenSheet, desgloseSheet, regionSheet, hispanicSheet].forEach(sheet => {
      sheet.pageSetup = pageSetup;
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xlsx`;
    
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    this.ui.showSuccessMessage('Informe de IVA exportado correctamente en Excel');
    return true;
  } catch (error) {
    console.error('Error al exportar informe de IVA a Excel:', error);
    this.ui.showErrorMessage('Error al exportar', 'No se pudo exportar el informe de IVA a Excel.');
    return false;
  }
}
}