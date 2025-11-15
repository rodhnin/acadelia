/**
 * Módulo de Análisis Financiero (Analytics)
 * Proporciona métricas avanzadas, proyecciones y análisis de cohortes
 * VERSIÓN MEJORADA: Manejo correcto de múltiples monedas y conversiones a EUR
 */

import { formatCurrency, formatPercentage, formatDate, formatCountryName, getCurrencySymbol } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class AnalyticsModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.currentSection = null;
    this.eventBus = eventBus;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.dateRange = null;
    
    // Datos financieros
    this.transactionsData = [];
    this.subscriptionsData = [];
    this.usersData = [];
    this.expensesData = [];
    
    // Métricas calculadas
    this.metrics = {
      ltv: 0, // Valor tiempo de vida del cliente
      conversionRate: 0, // Tasa de conversión
      retentionRate: 0, // Tasa de retención
      churnRate: 0, // Tasa de cancelación
      mrr: 0, // Ingresos mensuales recurrentes
      mrrGrowth: 0, // Crecimiento del MRR
      avgCommissionRate: 0, // Tasa promedio de comisión
      avgExchangeRate: {} // Tasas de cambio promedio por moneda
    };
    
    // Series temporales de MRR
    this.mrrSeries = [];
    
    // Datos de proyección
    this.forecastData = [];
    
    // Datos de análisis de cohortes
    this.cohortData = [];
    
    // Datos de análisis de productos
    this.productAnalysis = [];
    
    // Datos de distribución geográfica
    this.geoDistribution = [];
    
    // Análisis de comisiones
    this.commissionAnalysis = {
      total: 0,
      by_currency: {},
      percentage: 0
    };
  }
  
  /**
   * Inicializa el módulo de análisis
   */
    async init() {
      console.log('Inicializando módulo de análisis financiero');
      
      this.eventBus.on('dateRangeChanged', (range) => {
        console.log('Analytics: Ignorando cambio de rango de fechas. Análisis financiero no actualiza por fecha.');
        // Almacenamos el rango pero no actualizamos nada automáticamente
        this.dateRange = range;
        
        // Si estamos en la sección de analytics, solo avisar al usuario
        if (this.currentSection === 'analytics') {
          this.ui.showSuccessMessage('Análisis financiero no se actualiza por fechas', {
            icon: 'bi-info-circle',
            timeout: 3000
          });
        }
      });
      
      // Al cambiar de sección
      document.addEventListener('sectionChanged', (e) => {
        if (e.detail.section === 'analytics') {
          this.onSectionActivated();
        } else if (e.detail.prevSection === 'analytics') {
          this.onSectionDeactivated();
        }
      });
      
      await this.loadAnalyticsData();
      
      return true;
    }
  
/**
 * Se ejecuta cuando se activa la sección de análisis
 */
onSectionActivated() {
  console.log('Sección de análisis activada');
  
  this.currentSection = 'analytics';
  
  if (document.getElementById('mrr-chart')) {
    this.resizeCharts();
  }
  
  // Si ya tenemos datos, no es necesario recargar
  if (this.transactionsData.length > 0) {
    // Asegurarnos de que los gráficos se hayan creado
    if (!this.charts.mrr && document.getElementById('mrr-chart')) {
      this.initCharts();
    }
    return;
  }
  
  this.loadAnalyticsData();
}

/**
 * Se ejecuta cuando se desactiva la sección de análisis
 */
onSectionDeactivated() {
  console.log('Sección de análisis desactivada');
  
  // Destruir gráficos para liberar recursos
  this.destroyCharts();
  
  this.currentSection = null;
}
  
/**
 * Carga datos para el análisis
 */
async loadAnalyticsData() {
  try {
    if (this.currentSection === 'analytics') {
      this.ui.showLoading('Cargando datos de análisis...');
    }
    
    const [transactions, subscriptions, users, expenses] = await Promise.all([
      this.api.getTransactions(),
      this.api.getSubscriptions(),
      this.api.getUsers(),
      this.api.getExpenses().catch(err => { 
        console.warn('No se pudieron cargar los gastos:', err); 
        return []; 
      })
    ]);
    
    this.transactionsData = transactions;
    this.subscriptionsData = subscriptions;
    this.usersData = users;
    this.expensesData = expenses;
    
    console.log(`Datos cargados: ${transactions.length} transacciones, ${subscriptions.length} suscripciones, ${users.length} usuarios, ${expenses.length} gastos`);
    
    this.analyzeExchangeRates();
    
    this.calculateMetrics();
    
    this.calculateMRRSeries();
    
    this.generateRevenueForecast();
    
    this.generateCohortData();
    
    this.analyzeProducts();
    
    this.analyzeGeoDistribution();
    
    this.analyzeCommissions();
    
    this.updateMetricsUI();
    
    if (this.currentSection === 'analytics') {
      this.initCharts();
      
      this.ui.hideLoading();
    }
    
    return true;
  } catch (error) {
    console.error('Error al cargar datos de análisis:', error);
    
    if (this.currentSection === 'analytics') {
      this.ui.hideLoading();
      this.ui.showErrorMessage('Error en análisis financiero', 'No se pudieron obtener los datos necesarios para el análisis.');
    }
    
    return false;
  }
}

  /**
   * Analiza las tasas de cambio promedio por moneda
   */
  analyzeExchangeRates() {
    const ratesByCode = {};
    const transactionCountByCode = {};
    
    // Agrupar tasas de cambio por moneda
    this.transactionsData.forEach(transaction => {
      const currency = transaction.currency_code || 'EUR';
      
      // Saltamos EUR ya que la tasa es siempre 1
      if (currency === 'EUR') return;
      
      if (transaction.exchange_rate && parseFloat(transaction.exchange_rate) > 0) {
        if (!ratesByCode[currency]) {
          ratesByCode[currency] = [];
          transactionCountByCode[currency] = 0;
        }
        
        ratesByCode[currency].push(parseFloat(transaction.exchange_rate));
        transactionCountByCode[currency]++;
      }
    });
    
    Object.keys(ratesByCode).forEach(currency => {
      const rates = ratesByCode[currency];
      if (rates.length > 0) {
        const sum = rates.reduce((total, rate) => total + rate, 0);
        this.metrics.avgExchangeRate[currency] = sum / rates.length;
      }
    });
    
    console.log('Tasas de cambio promedio:', this.metrics.avgExchangeRate);
  }
  
  /**
   * Calcula las métricas financieras clave
   */
  calculateMetrics() {
    this.calculateLTV();
    
    this.calculateConversionRate();
    
    this.calculateRetentionRate();
    
    this.calculateChurnRate();
    
    this.calculateMRR();
  }
  
  /**
   * Normaliza una cantidad monetaria priorizando valores en EUR
   * @param {Object} transaction - Transacción o valor a normalizar
   * @param {string} field - Campo a normalizar (cuando transaction es un objeto)
   * @returns {number} Cantidad normalizada en EUR
   */
  normalizeAmount(transaction, field = 'amount') {
    // Si transaction no es un objeto (compatibilidad hacia atrás)
    if (transaction === null || transaction === undefined) {
      return 0;
    }
    
    if (typeof transaction !== 'object') {
      // Si es un número o string, convertir directamente
      if (typeof transaction === 'string') {
        // Si no tiene punto decimal, asumir que está en centavos
        if (!transaction.includes('.')) {
          return parseInt(transaction) / 100;
        }
        return parseFloat(transaction);
      }
      return transaction;
    }
    
    // A partir de aquí, transaction es un objeto
    
    // Campo EUR tiene prioridad si existe
    const eurField = `${field}_eur`;
    if (transaction[eurField] !== undefined && transaction[eurField] !== null) {
      // Si es string, convertir a número
      if (typeof transaction[eurField] === 'string') {
        return parseFloat(transaction[eurField]);
      }
      return transaction[eurField];
    }
    
    // Si no hay campo EUR, obtener valor original y convertir usando exchange_rate
    if (transaction[field] !== undefined && transaction[field] !== null) {
      let originalAmount;
      
      // Si es string, convertir a número
      if (typeof transaction[field] === 'string') {
        // Si no tiene punto decimal y es un String, asumir que está en centavos
        if (!transaction[field].includes('.')) {
          originalAmount = parseInt(transaction[field]) / 100;
        } else {
          originalAmount = parseFloat(transaction[field]);
        }
      } else {
        originalAmount = transaction[field];
      }
      
      // Si hay tasa de cambio, aplicarla
      if (transaction.exchange_rate && transaction.currency_code !== 'EUR') {
        return originalAmount * parseFloat(transaction.exchange_rate);
      }
      
      // Si es EUR o no hay tasa, devolver como está
      return originalAmount;
    }
    
    return 0;
  }
  
  /**
   * Calcula el valor del tiempo de vida del cliente (LTV)
   */
  calculateLTV() {
    // LTV = ARPU (Ingreso Promedio por Usuario) / Tasa de Cancelación
    
    // Agrupar usuarios con transacciones
    const usersWithTransactions = this.usersData.filter(user => {
      // Encontrar transacciones del usuario
      const userTransactions = this.transactionsData.filter(t => t.id_user == user.id_user);
      return userTransactions.length > 0;
    });
    
    const totalRevenue = this.transactionsData.reduce((sum, t) => {
      return sum + this.normalizeAmount(t, 'amount');
    }, 0);
    
    const arpu = usersWithTransactions.length > 0 
      ? totalRevenue / usersWithTransactions.length 
      : 0;
    
    const monthlyChurnRate = this.calculateMonthlyChurnRate();
    
    // Evitar división por cero
    if (monthlyChurnRate === 0) {
      this.metrics.ltv = arpu * 24; // Estimación arbitraria: 24 meses
    } else {
      // Fórmula clásica de LTV = ARPU / Churn Rate
      this.metrics.ltv = arpu / monthlyChurnRate;
    }
    
    console.log('LTV calculado:', this.metrics.ltv);
  }
  
  /**
   * Calcula la tasa de cancelación mensual
   * @returns {number} Tasa de cancelación mensual (0-1)
   */
  calculateMonthlyChurnRate() {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const canceledLastMonth = this.subscriptionsData.filter(s => {
      if (!this.isSubscriptionCancelled(s)) return false;
      
      const cancelDate = new Date(s.updated_at);
      return cancelDate >= oneMonthAgo;
    }).length;
    
    const activeSubscriptions = this.subscriptionsData.filter(s => s.status === 'active').length;
    const totalSubscriptionsLastMonth = activeSubscriptions + canceledLastMonth;
    
    if (totalSubscriptionsLastMonth === 0) return 0;
    
    return canceledLastMonth / totalSubscriptionsLastMonth;
  }
  
  /**
   * Calcula la tasa de conversión
   */
  calculateConversionRate() {
    // En un sistema real, esto requeriría datos de visitas/registros vs. compras
    // Aquí hacemos una aproximación: usuarios con suscripción activa / total de usuarios
    
    const usersWithActiveSub = this.usersData.filter(user => {
      const userSubs = this.subscriptionsData.filter(s => 
        s.id_user == user.id_user && s.status === 'active'
      );
      return userSubs.length > 0;
    }).length;
    
    const totalUsers = this.usersData.length;
    
    // Evitar división por cero
    if (totalUsers === 0) {
      this.metrics.conversionRate = 0;
    } else {
      this.metrics.conversionRate = usersWithActiveSub / totalUsers;
    }
    
    console.log('Tasa de conversión calculada:', this.metrics.conversionRate);
  }
  
  /**
   * Calcula la tasa de retención
   */
  calculateRetentionRate() {
    // Tasa de retención = 1 - tasa de cancelación
    const monthlyChurnRate = this.calculateMonthlyChurnRate();
    this.metrics.retentionRate = 1 - monthlyChurnRate;
    
    console.log('Tasa de retención calculada:', this.metrics.retentionRate);
  }
  
  /**
   * Calcula la tasa de cancelación
   */
  calculateChurnRate() {
    // Ya calculado en calculateMonthlyChurnRate
    this.metrics.churnRate = this.calculateMonthlyChurnRate();
    
    console.log('Tasa de cancelación calculada:', this.metrics.churnRate);
  }
  
  /**
   * Calcula MRR (ingresos mensuales recurrentes)
   */
  calculateMRR() {
    const activeSubs = this.subscriptionsData.filter(s => s.status === 'active');
    
    let totalMRR = 0;
    
    activeSubs.forEach(sub => {
      const subTransactions = this.transactionsData.filter(t => 
        t.product_id === sub.product_id && t.id_user == sub.id_user
      ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      
      let monthlyAmount = 0;
      
      if (subTransactions.length > 0) {
        monthlyAmount = this.normalizeAmount(subTransactions[0], 'amount');
      } else if (sub.amount) {
        // Si la suscripción tiene un importe directo
        monthlyAmount = this.normalizeAmount(sub);
      } else {
        // Valor por defecto
        monthlyAmount = 19; // 19€ valor aproximado
      }
      
      // Ajustar para intervalos no mensuales
      if (sub.interval === 'year') {
        monthlyAmount = monthlyAmount / 12;
      }
      
      totalMRR += monthlyAmount;
    });
    
    this.metrics.mrr = totalMRR;
    
    console.log('MRR calculado:', this.metrics.mrr);
  }
  
  /**
   * Calcula series temporales de MRR
   */
  calculateMRRSeries() {
    const mrrByMonth = {};
    
    // Últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Clave para el mes (YYYY-MM)
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // Etiqueta legible
      const label = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      mrrByMonth[key] = {
        key,
        label,
        mrr: 0,
        newMrr: 0,
        churnedMrr: 0,
        expansionMrr: 0,
        contractionMrr: 0,
        netMrr: 0
      };
    }
    
    // Esto nos permitirá identificar nuevas suscripciones
    const firstTransactionBySubscription = {};
    
    // Primera pasada: identificar primera transacción por cada suscripción
    this.transactionsData.forEach(transaction => {
      if (!transaction.updated_at || !transaction.product_id || !transaction.id_user) return;
      
      const subscriptionKey = `${transaction.id_user}_${transaction.product_id}`;
      const transDate = new Date(transaction.updated_at);
      
      if (!firstTransactionBySubscription[subscriptionKey] || 
          transDate < new Date(firstTransactionBySubscription[subscriptionKey].updated_at)) {
        firstTransactionBySubscription[subscriptionKey] = transaction;
      }
    });
    
    this.transactionsData.forEach(transaction => {
      // Fecha de la transacción
      if (!transaction.updated_at || !transaction.product_id || !transaction.id_user) return;
      
      const transDate = new Date(transaction.updated_at);
      const transKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Si el mes está fuera del rango de análisis, ignorar
      if (!mrrByMonth[transKey]) return;
      
      const amountEur = this.normalizeAmount(transaction, 'amount');
      
      // Si es una transacción de suscripción, sumar al MRR
      if (transaction.interval === 'month') {
        mrrByMonth[transKey].mrr += amountEur;
        
        // Método 1: Usar event_type si existe
        let isNewSubscription = transaction.event_type && 
                                transaction.event_type.includes('subscription.created');
        
        // Método 2: Comprobar si es la primera transacción de esta suscripción
        if (!isNewSubscription) {
          const subscriptionKey = `${transaction.id_user}_${transaction.product_id}`;
          isNewSubscription = firstTransactionBySubscription[subscriptionKey] && 
                             firstTransactionBySubscription[subscriptionKey].id === transaction.id;
        }
        
        // Método 3: Si hay un campo created_at y updated_at, y son similares (menos de 1 día de diferencia)
        if (!isNewSubscription && transaction.created_at) {
          const createdDate = new Date(transaction.created_at);
          const updatedDate = new Date(transaction.updated_at);
          const timeDiff = Math.abs(updatedDate - createdDate);
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          
          isNewSubscription = daysDiff < 1; // Si se creó y actualizó el mismo día
        }
        
        // Si identificamos como nueva suscripción por cualquier método
        if (isNewSubscription) {
          mrrByMonth[transKey].newMrr += amountEur;
          console.log(`Nueva suscripción identificada: ${transaction.id || 'ID no disponible'} - ${amountEur}€`);
        }
      } else if (transaction.interval === 'year') {
        const monthlyEquivalent = amountEur / 12;
        mrrByMonth[transKey].mrr += monthlyEquivalent;
        
        let isNewSubscription = transaction.event_type && 
                              transaction.event_type.includes('subscription.created');
                              
        if (!isNewSubscription) {
          const subscriptionKey = `${transaction.id_user}_${transaction.product_id}`;
          isNewSubscription = firstTransactionBySubscription[subscriptionKey] && 
                            firstTransactionBySubscription[subscriptionKey].id === transaction.id;
        }
        
        if (!isNewSubscription && transaction.created_at) {
          const createdDate = new Date(transaction.created_at);
          const updatedDate = new Date(transaction.updated_at);
          const timeDiff = Math.abs(updatedDate - createdDate);
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          
          isNewSubscription = daysDiff < 1;
        }
        
        if (isNewSubscription) {
          mrrByMonth[transKey].newMrr += monthlyEquivalent;
          console.log(`Nueva suscripción anual identificada: ${transaction.id || 'ID no disponible'} - ${monthlyEquivalent}€/mes`);
        }
      }
    });
    
    this.subscriptionsData.forEach(sub => {
      if (!this.isSubscriptionCancelled(sub) || !sub.updated_at) return;
      
      // Fecha de cancelación
      const cancelDate = new Date(sub.updated_at);
      const cancelKey = `${cancelDate.getFullYear()}-${String(cancelDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Si el mes está fuera del rango, ignorar
      if (!mrrByMonth[cancelKey]) return;
      
      const lastTransaction = this.transactionsData.find(t => 
        t.product_id === sub.product_id && t.id_user == sub.id_user
      );
      
      let monthlyAmount = 0;
      
      if (lastTransaction) {
        monthlyAmount = this.normalizeAmount(lastTransaction, 'amount');
        
        // Ajustar para intervalos anuales
        if (lastTransaction.interval === 'year') {
          monthlyAmount = monthlyAmount / 12;
        }
      } else if (sub.amount) {
        monthlyAmount = this.normalizeAmount(sub);
        
        // Ajustar para intervalos anuales
        if (sub.interval === 'year') {
          monthlyAmount = monthlyAmount / 12;
        }
      }
      
      mrrByMonth[cancelKey].churnedMrr += monthlyAmount;
    });
    
    let prevMrr = 0;
    
    this.mrrSeries = Object.values(mrrByMonth)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((month, index) => {
        month.netMrr = month.newMrr - month.churnedMrr + 
                      month.expansionMrr - month.contractionMrr;
        
        if (index > 0 && prevMrr > 0) {
          month.percentChange = (month.mrr - prevMrr) / prevMrr;
        } else {
          month.percentChange = 0;
        }
        
        prevMrr = month.mrr;
        return month;
      });
    
    if (this.mrrSeries.length >= 2) {
      const first = this.mrrSeries[0].mrr;
      const last = this.mrrSeries[this.mrrSeries.length - 1].mrr;
      
      if (first > 0) {
        // Crecimiento mensual compuesto
        const monthsCount = this.mrrSeries.length - 1;
        this.metrics.mrrGrowth = Math.pow(last / first, 1 / monthsCount) - 1;
      } else {
        this.metrics.mrrGrowth = 0;
      }
    } else {
      this.metrics.mrrGrowth = 0;
    }
    
    console.log('Series de MRR calculadas:', this.mrrSeries);
    console.log('Crecimiento de MRR calculado:', this.metrics.mrrGrowth);
  }
  
  /**
   * Genera proyección de ingresos
   */
  generateRevenueForecast() {
    // Proyectar 12 meses hacia el futuro
    const forecast = [];
    
    let startDate = new Date();
    if (this.mrrSeries.length > 0) {
      const lastMrr = this.mrrSeries[this.mrrSeries.length - 1];
      const [year, month] = lastMrr.key.split('-').map(n => parseInt(n));
      startDate = new Date(year, month - 1, 1);
    }
    
    let currentMrr = this.metrics.mrr;
    if (currentMrr === 0 && this.mrrSeries.length > 0) {
      currentMrr = this.mrrSeries[this.mrrSeries.length - 1].mrr;
    }
    
    const growthRate = this.metrics.mrrGrowth || 0.1; // 10% por defecto
    
    for (let i = 1; i <= 12; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      const projectedMrr = currentMrr * Math.pow(1 + growthRate, i);
      
      forecast.push({
        key: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
        label: forecastDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        mrr: projectedMrr,
        growth: growthRate
      });
    }
    
    this.forecastData = forecast;
    console.log('Proyección de ingresos generada:', this.forecastData);
  }
  
  /**
   * Genera datos de análisis de cohortes
   */
  generateCohortData() {
    // Agrupar usuarios por mes de registro
    const cohorts = {};
    
    const subscriptionDates = new Map();
    
    // Primero recopilamos todas las suscripciones por usuario
    this.subscriptionsData.forEach(sub => {
      if (!sub.created_at || !sub.id_user) return;
      
      const userId = sub.id_user;
      const subDate = new Date(sub.created_at);
      
      if (!subscriptionDates.has(userId) || subDate < subscriptionDates.get(userId)) {
        subscriptionDates.set(userId, subDate);
      }
    });
    
    // Ahora procesamos los usuarios
    this.usersData.forEach(user => {
      if (!subscriptionDates.has(user.id_user)) return;
      
      const registerDate = subscriptionDates.get(user.id_user);
      
      const registerYear = registerDate.getFullYear();
      const registerMonth = registerDate.getMonth();
      
      // Clave para la cohorte (YYYY-MM)
      const cohortKey = `${registerYear}-${String(registerMonth + 1).padStart(2, '0')}`;
      
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = {
          key: cohortKey,
          label: new Date(registerYear, registerMonth, 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          initialCount: 0,
          retention: Array(12).fill(0) // 12 meses de retención
        };
      }
      
      cohorts[cohortKey].initialCount++;
      
      // Recorremos los 12 meses desde la fecha de suscripción
      for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
        const targetMonth = new Date(registerYear, registerMonth + monthOffset, 1);
        const lastDayOfMonth = new Date(registerYear, registerMonth + monthOffset + 1, 0);
        
        const targetDate = monthOffset === 0 ? registerDate : targetMonth;
        
        const activeInMonth = this.subscriptionsData.some(sub => {
          if (sub.id_user != user.id_user) return false;
          
          // Fecha de inicio de la suscripción
          const startDate = new Date(sub.created_at);
          
          // La suscripción debe comenzar antes o durante el mes analizado
          if (startDate > lastDayOfMonth) return false;
          
          // Si la suscripción está activa
          if (sub.status === 'active') return true;
          
          // Si está cancelada o expirada, verificar si estaba activa en el mes objetivo
          if ((sub.status === 'canceled' || sub.status === 'expired') && sub.updated_at) {
            const endDate = new Date(sub.updated_at);
            
            // Si terminó después del inicio del período, estaba activa durante al menos parte del mes
            return endDate >= targetDate;
          }
          
          return false;
        });
        
        // Si estaba activo en ese mes, contabilizarlo para la retención
        if (activeInMonth) {
          cohorts[cohortKey].retention[monthOffset]++;
          console.log(`Usuario ${user.id_user} activo en mes ${monthOffset+1} de cohorte ${cohorts[cohortKey].label}`);
        }
      }
    });
    
    Object.values(cohorts).forEach(cohort => {
      if (cohort.initialCount > 0) {
        cohort.retention = cohort.retention.map(count => count / cohort.initialCount);
      }
    });
    
    this.cohortData = Object.values(cohorts)
      .sort((a, b) => a.key.localeCompare(b.key))
      .filter(cohort => cohort.initialCount > 0); // Filtrar cohortes vacías
    
    console.log('Datos de cohortes generados:', this.cohortData);
  }
  
  /**
   * Analiza el rendimiento de productos
   */
  analyzeProducts() {
    // Agrupar datos por producto
    const productStats = {};
    
    this.transactionsData.forEach(transaction => {
      const productId = transaction.product_id;
      if (!productId) return;
      
      if (!productStats[productId]) {
        productStats[productId] = {
          id: productId,
          name: transaction.product_name || `Producto ${productId}`,
          subscriptionCount: 0,
          revenueTotal: 0,
          revenueTotalEur: 0,
          transactions: 0,
          cancelledCount: 0,
          taxCollected: 0,
          taxCollectedEur: 0,
          feeAmount: 0,
          feeAmountEur: 0,
          earnings: 0,
          earningsEur: 0,
          transactionsByCurrency: {}
        };
      }
      
      const amountOriginal = this.normalizeAmount({ amount: transaction.amount });
      const amountEur = this.normalizeAmount(transaction, 'amount');
      const taxAmountEur = this.normalizeAmount(transaction, 'tax_amount');
      const feeAmountEur = this.normalizeAmount(transaction, 'fee_amount');
      const earningsEur = this.normalizeAmount(transaction, 'earnings');
      
      productStats[productId].revenueTotal += amountOriginal;
      productStats[productId].revenueTotalEur += amountEur;
      productStats[productId].transactions++;
      productStats[productId].taxCollectedEur += taxAmountEur;
      productStats[productId].feeAmountEur += feeAmountEur;
      productStats[productId].earningsEur += earningsEur;
      
      const currency = transaction.currency_code || 'EUR';
      if (!productStats[productId].transactionsByCurrency[currency]) {
        productStats[productId].transactionsByCurrency[currency] = {
          count: 0,
          total: 0,
          totalEur: 0
        };
      }
      
      productStats[productId].transactionsByCurrency[currency].count++;
      productStats[productId].transactionsByCurrency[currency].total += amountOriginal;
      productStats[productId].transactionsByCurrency[currency].totalEur += amountEur;
    });
    
    this.subscriptionsData.forEach(subscription => {
      const productId = subscription.product_id;
      if (!productId || !productStats[productId]) return;
      
      productStats[productId].subscriptionCount++;
      
      if (this.isSubscriptionCancelled(subscription)) {
        productStats[productId].cancelledCount++;
      }
    });
    
    Object.values(productStats).forEach(product => {
      // Tasa de crecimiento (simplificada: basada en transacciones recientes vs todas)
      const now = new Date();
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      
      const recentTransactions = this.transactionsData.filter(t => {
        if (t.product_id !== product.id) return false;
        
        const transDate = new Date(t.updated_at || t.created_at);
        return transDate >= threeMonthsAgo;
      }).length;
      
      // Tasa de crecimiento (transacciones recientes como % del total)
      product.growthRate = product.transactions > 0 
        ? recentTransactions / product.transactions
        : 0;
      
      // Tasa de cancelación
      product.churnRate = product.subscriptionCount > 0 
        ? product.cancelledCount / product.subscriptionCount
        : 0;
      
      // Rentabilidad (neta: ingresos - impuestos - comisiones) / ingresos
      product.profitability = product.revenueTotalEur > 0 
        ? product.earningsEur / product.revenueTotalEur
        : 0;
      
      // Tasa de comisión promedio
      product.commissionRate = product.revenueTotalEur > 0
        ? product.feeAmountEur / product.revenueTotalEur
        : 0;
    });
    
    this.productAnalysis = Object.values(productStats)
      .sort((a, b) => b.revenueTotalEur - a.revenueTotalEur);
    
    console.log('Análisis de productos generado:', this.productAnalysis);
  }
  
  /**
   * Analiza distribución geográfica de ventas
   */
  analyzeGeoDistribution() {
    // Agrupar por país
    const geoStats = {};
    
    this.transactionsData.forEach(transaction => {
      const countryCode = transaction.country_code || 'UNKNOWN';
      
      if (!geoStats[countryCode]) {
        geoStats[countryCode] = {
          code: countryCode,
          name: formatCountryName(countryCode),
          transactions: 0,
          totalOriginal: 0,
          totalEur: 0,
          taxAmount: 0,
          taxRate: 0,
          currencies: {},
          taxIncluded: 0 // Contador para calcular tasa promedio
        };
      }
      
      const amountEur = this.normalizeAmount(transaction, 'amount');
      const taxAmountEur = this.normalizeAmount(transaction, 'tax_amount');
      const currency = transaction.currency_code || 'EUR';
      const taxRate = transaction.tax_rate ? parseFloat(transaction.tax_rate) : 0;
      
      geoStats[countryCode].transactions++;
      geoStats[countryCode].totalEur += amountEur;
      geoStats[countryCode].taxAmount += taxAmountEur;
      
      if (!geoStats[countryCode].currencies[currency]) {
        geoStats[countryCode].currencies[currency] = {
          count: 0,
          total: 0,
          totalEur: 0
        };
      }
      
      const amountOriginal = parseFloat(transaction.amount || 0);
      geoStats[countryCode].currencies[currency].count++;
      geoStats[countryCode].currencies[currency].total += amountOriginal;
      geoStats[countryCode].currencies[currency].totalEur += amountEur;
      
      // Acumular para calcular tasa promedio
      if (taxRate > 0) {
        geoStats[countryCode].taxRate += taxRate;
        geoStats[countryCode].taxIncluded++;
      }
    });
    
    Object.values(geoStats).forEach(country => {
      if (country.taxIncluded > 0) {
        country.taxRate = country.taxRate / country.taxIncluded;
      }
      
      if (country.totalEur > 0) {
        country.taxPercentage = country.taxAmount / country.totalEur;
      } else {
        country.taxPercentage = 0;
      }
      
      country.topCurrencies = Object.entries(country.currencies)
        .map(([code, stats]) => ({
          code,
          ...stats
        }))
        .sort((a, b) => b.totalEur - a.totalEur);
    });
    
    this.geoDistribution = Object.values(geoStats)
      .sort((a, b) => b.totalEur - a.totalEur);
    
    const euCountryCodes = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
      'PL', 'PT', 'RO', 'SK', 'SI', 'SE'
    ];
    
    const latamCountryCodes = [
      'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 
      'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'
    ];
    
    // Agrupar por región
    const geoGroups = {
      ES: { 
        code: 'ES',
        name: 'España',
        transactions: 0,
        totalEur: 0,
        taxAmount: 0,
        countries: []
      },
      EU: {
        code: 'EU',
        name: 'Unión Europea (sin España)',
        transactions: 0,
        totalEur: 0,
        taxAmount: 0,
        countries: []
      },
      LATAM: {
        code: 'LATAM',
        name: 'Latinoamérica',
        transactions: 0,
        totalEur: 0,
        taxAmount: 0,
        countries: []
      },
      OTHER: {
        code: 'OTHER',
        name: 'Otros países',
        transactions: 0,
        totalEur: 0,
        taxAmount: 0,
        countries: []
      }
    };
    
    // Clasificar cada país en su grupo
    this.geoDistribution.forEach(country => {
      let groupKey;
      
      if (country.code === 'ES') {
        groupKey = 'ES';
      } else if (euCountryCodes.includes(country.code)) {
        groupKey = 'EU';
      } else if (latamCountryCodes.includes(country.code)) {
        groupKey = 'LATAM';
      } else {
        groupKey = 'OTHER';
      }
      
      geoGroups[groupKey].transactions += country.transactions;
      geoGroups[groupKey].totalEur += country.totalEur;
      geoGroups[groupKey].taxAmount += country.taxAmount;
      geoGroups[groupKey].countries.push(country);
    });
    
    this.geoGroups = Object.values(geoGroups)
      .filter(group => group.transactions > 0)
      .sort((a, b) => b.totalEur - a.totalEur);
    
    console.log('Distribución geográfica generada:', this.geoGroups);
  }
  
  /**
   * Analiza comisiones de Paddle
   */
  analyzeCommissions() {
    let totalRevenue = 0;
    let totalFees = 0;
    const feesByCurrency = {};
    
    this.transactionsData.forEach(transaction => {
      const currency = transaction.currency_code || 'EUR';
      const amountEur = this.normalizeAmount(transaction, 'amount');
      const feeAmountEur = this.normalizeAmount(transaction, 'fee_amount');
      
      // Acumular totales
      totalRevenue += amountEur;
      totalFees += feeAmountEur;
      
      // Acumular por moneda
      if (!feesByCurrency[currency]) {
        feesByCurrency[currency] = {
          revenue: 0,
          fees: 0,
          count: 0
        };
      }
      
      feesByCurrency[currency].revenue += amountEur;
      feesByCurrency[currency].fees += feeAmountEur;
      feesByCurrency[currency].count++;
    });
    
    this.commissionAnalysis = {
      total: totalFees,
      by_currency: {},
      percentage: totalRevenue > 0 ? (totalFees / totalRevenue * 100) : 0
    };
    
    Object.keys(feesByCurrency).forEach(currency => {
      const data = feesByCurrency[currency];
      
      this.commissionAnalysis.by_currency[currency] = {
        ...data,
        percentage: data.revenue > 0 ? (data.fees / data.revenue * 100) : 0
      };
    });
    
    this.metrics.avgCommissionRate = this.commissionAnalysis.percentage / 100;
    
    console.log('Análisis de comisiones:', this.commissionAnalysis);
  }
  
  /**
   * Actualiza la UI con las métricas calculadas
   */
  updateMetricsUI() {
    this.ui.updateElement('customer-ltv', formatCurrency(this.metrics.ltv));
    this.ui.updateElement('conversion-rate', formatPercentage(this.metrics.conversionRate));
    this.ui.updateElement('retention-rate', formatPercentage(this.metrics.retentionRate));
    this.ui.updateElement('churn-rate', formatPercentage(this.metrics.churnRate));
    
    this.updateProductAnalysisTable();
    
    this.updateCohortTable();
  }
  
  /**
   * Actualiza la tabla de análisis de productos
   */
  updateProductAnalysisTable() {
    this.ui.updateTable('product-analysis-table', this.productAnalysis, (product) => {
      return `
        <td>${product.name}</td>
        <td>${product.subscriptionCount}</td>
        <td>${formatCurrency(product.revenueTotalEur)}</td>
        <td>${formatPercentage(product.growthRate)}</td>
        <td>${formatPercentage(product.churnRate)}</td>
        <td>${formatCurrency(product.taxCollectedEur)}</td>
        <td>${formatPercentage(product.profitability)}</td>
      `;
    });
  }
  
  /**
   * Actualiza la tabla de cohortes
   */
  updateCohortTable() {
    // Limitamos a las últimas 6 cohortes para la tabla
    const recentCohorts = this.cohortData.slice(-6);
    
    const cohortTableBody = document.getElementById('cohort-table').querySelector('tbody');
    if (!cohortTableBody) return;
    
    cohortTableBody.innerHTML = '';
    
    recentCohorts.forEach(cohort => {
      const row = document.createElement('tr');
      
      // Celda de cohorte
      const cohortCell = document.createElement('td');
      cohortCell.textContent = cohort.label;
      row.appendChild(cohortCell);
      
      // Celdas de retención por mes
      for (let i = 0; i < 6; i++) {
        const cell = document.createElement('td');
        if (cohort.retention[i] !== undefined) {
          cell.textContent = formatPercentage(cohort.retention[i]);
          
          if (cohort.retention[i] >= 0.8) {
            cell.classList.add('text-success');
          } else if (cohort.retention[i] >= 0.5) {
            cell.classList.add('text-warning');
          } else {
            cell.classList.add('text-danger');
          }
        } else {
          cell.textContent = '-';
          cell.classList.add('text-muted');
        }
        row.appendChild(cell);
      }
      
      cohortTableBody.appendChild(row);
    });
  }
  
  /**
   * Inicializa los gráficos del módulo
   */
/**
 * Inicializa los gráficos del módulo
 */
initCharts() {
  // Destruir gráficos existentes primero
  this.destroyCharts();
  
  // Si no estamos en la sección de analytics, no crear gráficos
  if (this.currentSection !== 'analytics') {
    console.log('No estamos en la sección de análisis, omitiendo creación de gráficos');
    return;
  }
  
  try {
    this.initMRRChart();
    
    this.initForecastChart();
    
    this.initCommissionsChart();
    
    this.initGeoDistributionChart();
  } catch (error) {
    console.error('Error al inicializar gráficos de análisis:', error);
  }
}
  
  /**
   * Inicializa el gráfico de MRR
   */
  initMRRChart() {
  const ctx = document.getElementById('mrr-chart');
  if (!ctx) {
    console.warn('No se encontró el elemento mrr-chart');
    return;
  }
  
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    console.log('Destruyendo gráfico mrr-chart existente');
    existingChart.destroy();
    
    // Asegurarnos de limpiar también nuestra referencia interna
    if (this.charts.mrr) {
      this.charts.mrr = null;
    }
  }
  
  if (!document.body.contains(ctx)) {
    console.log('El canvas ya no está en el DOM, cancelando creación de gráfico');
    return;
  }
  
  try {
    // Código existente para crear el gráfico...
    if (this.mrrSeries.length === 0) {
      this.charts.mrr = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            label: 'MRR',
            data: [0],
            backgroundColor: '#6c757d'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      return;
    }
    
    const labels = this.mrrSeries.map(m => m.label);
    const mrrData = this.mrrSeries.map(m => m.mrr);
    const newMrrData = this.mrrSeries.map(m => m.newMrr);
    const churnedMrrData = this.mrrSeries.map(m => -m.churnedMrr); // Negativo para visualización
    
    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'MRR Total',
            data: mrrData,
            type: 'line',
            borderColor: '#656d4a',
            backgroundColor: 'transparent',
            borderWidth: 3,
            tension: 0.1,
            yAxisID: 'y',
            order: 0
          },
          {
            label: 'Nuevo MRR',
            data: newMrrData,
            backgroundColor: '#20c997',
            yAxisID: 'y1',
            order: 1
          },
          {
            label: 'MRR Cancelado',
            data: churnedMrrData,
            backgroundColor: '#dc3545',
            yAxisID: 'y1',
            order: 1
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
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'MRR Total (EUR)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR', 'es-ES');
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Cambios en MRR (EUR)'
            },
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR', 'es-ES');
              }
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
                label += formatCurrency(context.parsed.y, 'EUR', 'es-ES');
                return label;
              }
            }
          }
        }
      }
    };
    
    this.charts.mrr = new Chart(ctx, config);
  } catch (error) {
    console.error('Error al crear gráfico MRR:', error);
  }
}
  
/**
 * Inicializa el gráfico de proyección de ingresos
 */
initForecastChart() {
  const ctx = document.getElementById('revenue-forecast-chart');
  if (!ctx) return;
  
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    console.log('Destruyendo gráfico de proyección existente');
    existingChart.destroy();
    
    if (this.charts.forecast) {
      this.charts.forecast = null;
    }
  }

  if (!document.body.contains(ctx)) {
    console.log('El canvas ya no está en el DOM, cancelando creación de gráfico');
    return;
  }
  
  try {
    // Si no hay datos históricos o de proyección, mostrar mensaje
    if (this.mrrSeries.length === 0 || this.forecastData.length === 0) {
      this.charts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            label: 'Proyección',
            data: [0],
            borderColor: '#6c757d'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      return;
    }
    
    const historicalData = this.mrrSeries.slice(-6);
    
    const combinedLabels = [
      ...historicalData.map(m => m.label),
      ...this.forecastData.map(m => m.label)
    ];
    
    const historicalValues = historicalData.map(m => m.mrr);
    const forecastValues = this.forecastData.map(m => m.mrr);
    
    // Datos combinados con null para separar series
    const historicalSeries = [
      ...historicalValues,
      ...Array(forecastValues.length).fill(null)
    ];
    
    const forecastSeries = [
      ...Array(historicalValues.length).fill(null),
      ...forecastValues
    ];
    
    const forecastData = this.forecastData;
    
    const config = {
      type: 'line',
      data: {
        labels: combinedLabels,
        datasets: [
          {
            label: 'Histórico',
            data: historicalSeries,
            borderColor: '#656d4a',
            backgroundColor: 'rgba(101, 109, 74, 0.1)',
            borderWidth: 2,
            tension: 0.1,
            fill: true
          },
          {
            label: 'Proyección',
            data: forecastSeries,
            borderColor: '#582f0e',
            backgroundColor: 'rgba(88, 47, 14, 0.05)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.1,
            fill: true
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
            title: {
              display: true,
              text: 'MRR Proyectado (EUR)'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR', 'es-ES');
              }
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
                if (context.parsed.y !== null) {
                  label += formatCurrency(context.parsed.y, 'EUR', 'es-ES');
                  
                  if (context.datasetIndex === 1 && context.parsed.y !== null) {
                    const monthIndex = context.dataIndex - historicalValues.length;
                    if (monthIndex >= 0 && monthIndex < forecastValues.length && forecastData[monthIndex]) {
                      const growthRate = forecastData[monthIndex].growth;
                      label += ` (${formatPercentage(growthRate)} mensual)`;
                    }
                  }
                }
                return label;
              } // Eliminamos el .bind(this) y usamos las variables locales
            }
          }
        }
      }
    };
    
    this.charts.forecast = new Chart(ctx, config);
  } catch (error) {
    console.error('Error al crear gráfico de proyección:', error);
  }
}
  
  /**
   * Inicializa el gráfico de comisiones
   */
  initCommissionsChart() {
    const ctx = document.getElementById('canvas-id-aquí');
    if (!ctx) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      console.log('Destruyendo gráfico existente');
      existingChart.destroy();
      
      if (this.charts.nombreDelGrafico) {
        this.charts.nombreDelGrafico = null;
      }
    }

    if (!document.body.contains(ctx)) {
      console.log('El canvas ya no está en el DOM, cancelando creación de gráfico');
      return;
    }
    
    const commissionsByMonth = {};
    
    // Agrupar comisiones por mes
    this.transactionsData.forEach(transaction => {
      if (!transaction.updated_at) return;
      
      const transDate = new Date(transaction.updated_at);
      const monthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!commissionsByMonth[monthKey]) {
        commissionsByMonth[monthKey] = {
          key: monthKey,
          date: transDate,
          label: transDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          revenue: 0,
          fees: 0
        };
      }
      
      commissionsByMonth[monthKey].revenue += this.normalizeAmount(transaction, 'amount');
      commissionsByMonth[monthKey].fees += this.normalizeAmount(transaction, 'fee_amount');
    });
    
    const commissionData = Object.values(commissionsByMonth)
      .sort((a, b) => a.date - b.date)
      .slice(-6); // Últimos 6 meses
    
    // Si no hay datos, mostrar mensaje
    if (commissionData.length === 0) {
      this.charts.commissions = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            label: 'Comisiones',
            data: [0],
            backgroundColor: '#6c757d'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      return;
    }
    
    const labels = commissionData.map(m => m.label);
    const revenueData = commissionData.map(m => m.revenue);
    const feesData = commissionData.map(m => m.fees);
    const percentageData = commissionData.map(m => m.revenue > 0 ? (m.fees / m.revenue * 100) : 0);
    
    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ingresos',
            data: revenueData,
            backgroundColor: '#a4ac86',
            order: 1
          },
          {
            label: 'Comisiones',
            data: feesData,
            backgroundColor: '#582f0e',
            order: 1
          },
          {
            label: '% Comisión',
            data: percentageData,
            type: 'line',
            borderColor: '#dc3545',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointBackgroundColor: '#dc3545',
            pointRadius: 4,
            yAxisID: 'y-percentage',
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
            type: 'linear',
            position: 'left',
            stacked: false,
            title: {
              display: true,
              text: 'Importe (EUR)'
            },
            ticks: {
              callback: function(value) {
                return formatCurrency(value, 'EUR', 'es-ES');
              }
            }
          },
          'y-percentage': {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 20, // Máximo 20% de comisión
            title: {
              display: true,
              text: '% Comisión'
            },
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const datasetLabel = context.dataset.label || '';
                const value = context.parsed.y;
                
                if (datasetLabel === '% Comisión') {
                  return `${datasetLabel}: ${value.toFixed(2)}%`;
                } else {
                  return `${datasetLabel}: ${formatCurrency(value, 'EUR', 'es-ES')}`;
                }
              }
            }
          }
        }
      }
    };
    
    this.charts.commissions = new Chart(ctx, config);
  }
  
  /**
   * Inicializa el gráfico de distribución geográfica
   */
  initGeoDistributionChart() {
    const ctx = document.getElementById('canvas-id-aquí');
    if (!ctx) return;

    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      console.log('Destruyendo gráfico existente');
      existingChart.destroy();
      
      if (this.charts.nombreDelGrafico) {
        this.charts.nombreDelGrafico = null;
      }
    }

    if (!document.body.contains(ctx)) {
      console.log('El canvas ya no está en el DOM, cancelando creación de gráfico');
      return;
    }
    
    // Si no hay datos, mostrar mensaje
    if (!this.geoGroups || this.geoGroups.length === 0) {
      this.charts.geoDistribution = new Chart(ctx, {
        type: 'pie',
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
    
    const labels = this.geoGroups.map(g => g.name);
    const values = this.geoGroups.map(g => g.totalEur);
    
    // Colores por grupo
    const colors = {
      'ES': '#656d4a',      // Verde oscuro
      'EU': '#a4ac86',      // Verde claro
      'LATAM': '#582f0e',   // Marrón
      'OTHER': '#6c757d'    // Gris
    };
    
    const backgroundColors = this.geoGroups.map(g => colors[g.code] || '#6c757d');
    
    const config = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColors,
          borderWidth: 1
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
                const group = this.geoGroups[context.dataIndex];
                const value = context.parsed;
                const percentage = (value / values.reduce((a, b) => a + b, 0) * 100).toFixed(1);
                
                const lines = [
                  `${context.label}: ${formatCurrency(value, 'EUR', 'es-ES')} (${percentage}%)`,
                  `Transacciones: ${group.transactions}`
                ];
                
                if (group.code !== 'ES' && group.countries && group.countries.length > 0) {
                  const topCountries = group.countries
                    .sort((a, b) => b.totalEur - a.totalEur)
                    .slice(0, 3)
                    .map(c => `${c.name}: ${formatCurrency(c.totalEur, 'EUR', 'es-ES')}`);
                  
                  lines.push('');
                  lines.push('Principales países:');
                  lines.push(...topCountries);
                }
                
                return lines;
              }.bind(this)
            }
          }
        }
      }
    };
    
    this.charts.geoDistribution = new Chart(ctx, config);
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
   * Refresca los datos de análisis
   * @param {boolean} forceRefresh - Si es true, fuerza recarga desde API
   */
  async refreshAnalytics(forceRefresh = false) {
    try {
      // Si no estamos forzando actualización y no estamos en la sección, no hacer nada
      if (!forceRefresh && this.currentSection !== 'analytics') {
        console.log('No estamos en la sección de análisis, omitiendo actualización');
        return;
      }
      
      console.log('Refrescando datos de análisis financiero...');
      
      this.api.clearCache();
      
      this.ui.showLoading('Actualizando análisis financiero...');
      
      // Destruir gráficos existentes
      this.destroyCharts();
      
      // Recargar datos
      await this.loadAnalyticsData();
      
      this.ui.hideLoading();
      
      this.ui.showSuccessMessage('Análisis financiero actualizado correctamente');
    } catch (error) {
      console.error('Error al refrescar datos de análisis:', error);
      
      this.ui.hideLoading();
      
      this.ui.showErrorMessage('Error al actualizar análisis', 'No se pudieron obtener los datos actualizados');
    }
  }

  /**
 * Destruye todos los gráficos existentes
 */
destroyCharts() {
  try {
    console.log('Destruyendo gráficos de análisis financiero...');
    
    // Lista de IDs de canvas para los gráficos
    const chartIds = ['mrr-chart', 'revenue-forecast-chart', 'commissions-chart', 'geo-distribution-chart'];
    
    // Destruir usando Chart.getChart para mayor seguridad
    chartIds.forEach(chartId => {
      const chart = Chart.getChart(chartId);
      if (chart) {
        console.log(`Destruyendo gráfico ${chartId}`);
        chart.destroy();
      }
    });
    
    Object.keys(this.charts).forEach(key => {
      this.charts[key] = null;
    });
    
    console.log('Todos los gráficos de análisis financiero han sido destruidos');
  } catch (error) {
    console.warn('Error al destruir gráficos de análisis financiero:', error);
  }
}

  /**
 * Verifica si una suscripción debe considerarse como cancelada
 * @param {Object} subscription - Objeto de suscripción
 * @returns {boolean} true si la suscripción está cancelada o expirada
 */
isSubscriptionCancelled(subscription) {
  return subscription.status === 'canceled' || subscription.status === 'expired';
}

}