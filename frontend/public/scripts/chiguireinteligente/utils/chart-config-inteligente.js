/**
 * Configuraciones para los gráficos del panel financiero
 * Centraliza la configuración de los gráficos Chart.js
 */

import { formatCurrency, formatPercentage, formatDate } from './formatter-inteligente.js';

export class ChartManager {
  constructor() {
    // Configuración de colores
    this.colors = {
      primary: '#656d4a',
      secondary: '#a4ac86',
      marron: '#582f0e',
      marronOscuro: '#442409',
      accent: '#e2ddd6',
      success: '#20c997',
      danger: '#dc3545',
      warning: '#fd7e14',
      info: '#0dcaf0',
      gray: '#6c757d',
      chart: [
        '#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90',
        '#656d4a', '#507a3a', '#428a29', '#86c06c', '#c4e8c2'
      ]
    };
    
    // Configuración por defecto para todos los gráficos
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
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
          padding: 10,
          cornerRadius: 4,
          displayColors: true
        }
      }
    };
  }
  
  /**
   * Obtiene la configuración para el gráfico de ingresos
   * @param {Array} transactions - Transacciones para analizar
   * @param {string} period - Período a mostrar (monthly, quarterly, yearly)
   * @returns {Object} Configuración del gráfico
   */
  getRevenueChartConfig(transactions, period = 'monthly') {
    // Agrupar transacciones por período
    const groupedData = this.groupTransactionsByPeriod(transactions, period);
    
    const labels = groupedData.map(item => item.label);
    const revenue = groupedData.map(item => item.total);
    const count = groupedData.map(item => item.count);
    
    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ingresos',
            data: revenue,
            backgroundColor: this.colors.primary,
            borderColor: this.colors.primary,
            borderWidth: 1,
            borderRadius: 4,
            order: 1
          },
          {
            label: 'Transacciones',
            data: count,
            type: 'line',
            backgroundColor: 'transparent',
            borderColor: this.colors.marron,
            borderWidth: 2,
            pointBackgroundColor: this.colors.marron,
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'y1',
            order: 0
          }
        ]
      },
      options: {
        ...this.defaultOptions,
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
              callback: function(value) {
                return formatCurrency(value, 'EUR', 'es-ES');
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
              font: {
                family: "'Poppins', sans-serif"
              },
              stepSize: 1
            }
          }
        },
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.dataset.yAxisID === 'y1') {
                  label += context.parsed.y + ' transacciones';
                } else {
                  label += formatCurrency(context.parsed.y, 'EUR', 'es-ES');
                }
                return label;
              }
            }
          }
        }
      }
    };
  }

  /**
 * Obtiene la configuración para el gráfico de crecimiento de suscripciones
 * @param {Array} growthData - Datos de crecimiento por período
 * @returns {Object} Configuración del gráfico
 */
getSubscriptionGrowthChartConfig(growthData) {
  if (!growthData || growthData.length === 0) {
    return {
      type: 'line',
      data: {
        labels: ['Sin datos'],
        datasets: [
          {
            label: 'Nuevas',
            data: [0],
            backgroundColor: 'rgba(32, 201, 151, 0.2)',
            borderColor: this.colors.success,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4
          },
          {
            label: 'Canceladas',
            data: [0],
            backgroundColor: 'rgba(220, 53, 69, 0.2)',
            borderColor: this.colors.danger,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4
          }
        ]
      },
      options: this.defaultOptions
    };
  }
  
  const labels = growthData.map(item => item.label);
  const newSubscriptions = growthData.map(item => item.new);
  const canceledSubscriptions = growthData.map(item => item.canceled);
  
  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Nuevas suscripciones',
          data: newSubscriptions,
          backgroundColor: 'rgba(32, 201, 151, 0.2)',
          borderColor: this.colors.success,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          fill: true
        },
        {
          label: 'Cancelaciones',
          data: canceledSubscriptions,
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          borderColor: this.colors.danger,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          fill: true
        }
      ]
    },
    options: {
      ...this.defaultOptions,
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
        ...this.defaultOptions.plugins,
        tooltip: {
          ...this.defaultOptions.plugins.tooltip,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += context.parsed.y;
              return label;
            }
          }
        }
      }
    }
  };
}
  
  /**
   * Agrupa transacciones por período
   * @param {Array} transactions - Transacciones a agrupar
   * @param {string} period - Período (monthly, quarterly, yearly)
   * @returns {Array} Datos agrupados
   */
  groupTransactionsByPeriod(transactions, period) {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const grouped = {};
    const now = new Date();
    
    const periodsCount = {
      monthly: 12,
      quarterly: 4,
      yearly: 3
    }[period] || 12;
    
    const getPeriodKey = (date, periodType) => {
      const d = new Date(date);
      
      switch (periodType) {
        case 'monthly':
          // Formato: '2025-01'
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        case 'quarterly':
          // Trimestre (1-4) y año
          const quarter = Math.floor(d.getMonth() / 3) + 1;
          return `${d.getFullYear()}-Q${quarter}`;
        case 'yearly':
          // Solo año
          return `${d.getFullYear()}`;
        default:
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };
    
    const getLabel = (key, periodType) => {
      if (periodType === 'monthly') {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      } else if (periodType === 'quarterly') {
        const [year, quarter] = key.split('-Q');
        return `T${quarter} ${year}`;
      } else {
        return key;
      }
    };
    
    for (let i = 0; i < periodsCount; i++) {
      let d = new Date(now);
      
      if (period === 'monthly') {
        d.setMonth(d.getMonth() - i);
      } else if (period === 'quarterly') {
        d.setMonth(d.getMonth() - i * 3);
      } else if (period === 'yearly') {
        d.setFullYear(d.getFullYear() - i);
      }
      
      const key = getPeriodKey(d, period);
      grouped[key] = {
        key,
        label: getLabel(key, period),
        total: 0,
        count: 0,
        transactions: []
      };
    }
    
    // Agrupar transacciones por período
    transactions.forEach(transaction => {
      const date = new Date(transaction.updated_at || transaction.created_at);
      const key = getPeriodKey(date, period);
      
      // Saltamos períodos fuera del rango de interés
      if (!grouped[key]) return;
      
      let amount = transaction.amount;
      if (typeof amount === 'string' && !amount.includes('.')) {
        amount = parseInt(amount) / 100;
      }
      
      grouped[key].total += parseFloat(amount) || 0;
      grouped[key].count += 1;
      grouped[key].transactions.push(transaction);
    });
    
    return Object.values(grouped).sort((a, b) => {
      return a.key.localeCompare(b.key);
    });
  }
  
  /**
   * Obtiene la configuración para el gráfico de productos
   * @param {Array} productData - Datos de productos
   * @returns {Object} Configuración del gráfico
   */
  getProductsChartConfig(productData) {
    if (!productData || productData.length === 0) {
      return {
        type: 'doughnut',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: [this.colors.gray],
            borderWidth: 0
          }]
        },
        options: this.defaultOptions
      };
    }
    
    const sortedProducts = [...productData].sort((a, b) => b.total - a.total);
    
    // Limitar a máximo 5 productos para mejor visualización
    const topProducts = sortedProducts.slice(0, 5);
    
    if (sortedProducts.length > 5) {
      const restTotal = sortedProducts.slice(5).reduce((sum, product) => sum + product.total, 0);
      topProducts.push({
        name: 'Otros productos',
        total: restTotal,
        count: sortedProducts.slice(5).reduce((sum, product) => sum + product.count, 0)
      });
    }
    
    return {
      type: 'doughnut',
      data: {
        labels: topProducts.map(p => p.name),
        datasets: [{
          data: topProducts.map(p => p.total),
          backgroundColor: this.colors.chart.slice(0, topProducts.length),
          borderWidth: 0
        }]
      },
      options: {
        ...this.defaultOptions,
        cutout: '65%',
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const product = topProducts[context.dataIndex];
                const total = formatCurrency(context.parsed, 'EUR', 'es-ES');
                const percent = formatPercentage(context.parsed / context.dataset.data.reduce((a, b) => a + b, 0));
                return [
                  `${total} (${percent})`,
                  `${product.count} transacciones`
                ];
              }
            }
          }
        }
      }
    };
  }
  
  /**
   * Obtiene la configuración para el gráfico geográfico
   * @param {Array} geoData - Datos geográficos
   * @returns {Object} Configuración del gráfico
   */
  getGeoChartConfig(geoData) {
    if (!geoData || geoData.length === 0) {
      return {
        type: 'pie',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: [this.colors.gray],
            borderWidth: 0
          }]
        },
        options: this.defaultOptions
      };
    }
    
    const sortedGeo = [...geoData].sort((a, b) => b.total - a.total);
    
    const spainData = sortedGeo.find(g => g.code === 'ES');
    const otherEU = sortedGeo.filter(g => g.code !== 'ES' && [
      'FR', 'DE', 'IT', 'PT', 'BE', 'NL', 'LU', 'AT', 'DK', 'SE', 'FI', 'GR', 'IE', 'PL', 'CZ', 'HU', 'SK', 'SI', 'LV', 'LT', 'EE', 'MT', 'CY', 'RO', 'BG', 'HR'
    ].includes(g.code));
    
    const latinAmerica = sortedGeo.filter(g => [
      'MX', 'CO', 'AR', 'PE', 'CL', 'EC', 'VE', 'BO', 'PY', 'UY', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU'
    ].includes(g.code));
    
    const others = sortedGeo.filter(g => 
      g.code !== 'ES' && 
      !otherEU.find(eu => eu.code === g.code) && 
      !latinAmerica.find(la => la.code === g.code)
    );
    
    const groupedData = [
      {
        name: 'España',
        total: spainData?.total || 0,
        count: spainData?.count || 0,
        code: 'ES'
      },
      {
        name: 'UE (sin España)',
        total: otherEU.reduce((sum, country) => sum + country.total, 0),
        count: otherEU.reduce((sum, country) => sum + country.count, 0),
        code: 'EU'
      },
      {
        name: 'Latinoamérica',
        total: latinAmerica.reduce((sum, country) => sum + country.total, 0),
        count: latinAmerica.reduce((sum, country) => sum + country.count, 0),
        code: 'LATAM'
      },
      {
        name: 'Otros países',
        total: others.reduce((sum, country) => sum + country.total, 0),
        count: others.reduce((sum, country) => sum + country.count, 0),
        code: 'OTHER'
      }
    ].filter(group => group.total > 0);
    
    const regionColors = {
      'ES': this.colors.primary,
      'EU': this.colors.secondary,
      'LATAM': this.colors.marron,
      'OTHER': this.colors.gray
    };
    
    return {
      type: 'pie',
      data: {
        labels: groupedData.map(g => g.name),
        datasets: [{
          data: groupedData.map(g => g.total),
          backgroundColor: groupedData.map(g => regionColors[g.code]),
          borderWidth: 0
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const region = groupedData[context.dataIndex];
                const total = formatCurrency(context.parsed, 'EUR', 'es-ES');
                const percent = formatPercentage(context.parsed / context.dataset.data.reduce((a, b) => a + b, 0));
                return [
                  `${total} (${percent})`,
                  `${region.count} transacciones`
                ];
              }
            }
          }
        }
      }
    };
  }
  
  /**
   * Obtiene la configuración para el gráfico de estado de suscripciones
   * @param {Array} subscriptions - Suscripciones a analizar
   * @returns {Object} Configuración del gráfico
   */
  getSubscriptionStatusChartConfig(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) {
      return {
        type: 'doughnut',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: [this.colors.gray],
            borderWidth: 0
          }]
        },
        options: this.defaultOptions
      };
    }
    
    const statusCounts = {
      active: 0,
      paused: 0,
      canceled: 0,
      expired: 0
    };
    
    subscriptions.forEach(sub => {
      if (statusCounts.hasOwnProperty(sub.status)) {
        statusCounts[sub.status]++;
      }
    });
    
    // Colores por estado
    const statusColors = {
      active: this.colors.success,
      paused: this.colors.warning,
      canceled: this.colors.gray,
      expired: this.colors.danger
    };
    
    // Etiquetas legibles
    const statusLabels = {
      active: 'Activas',
      paused: 'Pausadas',
      canceled: 'Canceladas',
      expired: 'Expiradas'
    };
    
    const data = Object.keys(statusCounts)
      .filter(status => statusCounts[status] > 0)
      .map(status => ({
        status,
        count: statusCounts[status],
        color: statusColors[status],
        label: statusLabels[status]
      }));
    
    return {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => d.color),
          borderWidth: 0
        }]
      },
      options: {
        ...this.defaultOptions,
        cutout: '65%',
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const count = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = formatPercentage(count / total);
                return `${count} suscripciones (${percent})`;
              }
            }
          }
        }
      }
    };
  }
  
  /**
   * Obtiene la configuración para el gráfico de métodos de pago
   * @param {Array} transactions - Transacciones a analizar
   * @returns {Object} Configuración del gráfico
   */
  getPaymentMethodsChartConfig(transactions) {
    if (!transactions || transactions.length === 0) {
      return {
        type: 'bar',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [0],
            backgroundColor: this.colors.gray,
            borderWidth: 0
          }]
        },
        options: {
          ...this.defaultOptions,
          indexAxis: 'y'
        }
      };
    }
    
    const methodCounts = {};
    
    transactions.forEach(transaction => {
      const method = transaction.payment_method || 'Desconocido';
      
      if (!methodCounts[method]) {
        methodCounts[method] = {
          count: 0,
          total: 0
        };
      }
      
      methodCounts[method].count++;
      methodCounts[method].total += this.normalizeAmount(transaction.amount);
    });
    
    const sortedMethods = Object.keys(methodCounts)
      .map(method => ({
        method,
        ...methodCounts[method]
      }))
      .sort((a, b) => b.count - a.count);
    
    const methodLabels = {
      'card': 'Tarjeta de crédito',
      'credit_card': 'Tarjeta de crédito',
      'debit_card': 'Tarjeta de débito',
      'paypal': 'PayPal',
      'bank_transfer': 'Transferencia bancaria',
      'apple_pay': 'Apple Pay',
      'google_pay': 'Google Pay',
      'alipay': 'Alipay',
      'wechat': 'WeChat Pay',
      'Desconocido': 'Método desconocido'
    };
    
    return {
      type: 'bar',
      data: {
        labels: sortedMethods.map(m => methodLabels[m.method] || m.method),
        datasets: [{
          label: 'Transacciones',
          data: sortedMethods.map(m => m.count),
          backgroundColor: this.colors.primary,
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        ...this.defaultOptions,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                family: "'Poppins', sans-serif"
              },
              stepSize: 1
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "'Poppins', sans-serif"
              }
            }
          }
        },
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const method = sortedMethods[context.dataIndex];
                return [
                  `Transacciones: ${method.count}`,
                  `Total: ${formatCurrency(method.total, 'EUR', 'es-ES')}`
                ];
              }
            }
          }
        }
      }
    };
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
   * Obtiene la configuración para el gráfico de monedas
   * @param {Array} transactions - Transacciones a analizar
   * @returns {Object} Configuración del gráfico
   */
  getCurrencyChartConfig(transactions) {
    if (!transactions || transactions.length === 0) {
      return {
        type: 'pie',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [1],
            backgroundColor: [this.colors.gray],
            borderWidth: 0
          }]
        },
        options: this.defaultOptions
      };
    }
    
    // Agrupar por moneda
    const currencyTotals = {};
    
    transactions.forEach(transaction => {
      const currency = transaction.currency_code || 'EUR';
      
      if (!currencyTotals[currency]) {
        currencyTotals[currency] = {
          total: 0,
          count: 0
        };
      }
      
      currencyTotals[currency].total += this.normalizeAmount(transaction.amount);
      currencyTotals[currency].count++;
    });
    
    const currencyData = Object.keys(currencyTotals)
      .map(currency => ({
        currency,
        ...currencyTotals[currency]
      }))
      .sort((a, b) => b.total - a.total);
    
    // Colores para las monedas principales
    const currencyColors = {
      'EUR': this.colors.primary,
      'USD': this.colors.secondary,
      'GBP': this.colors.marron,
      'MXN': this.colors.success,
      'ARS': this.colors.warning
    };
    
    return {
      type: 'pie',
      data: {
        labels: currencyData.map(c => c.currency),
        datasets: [{
          data: currencyData.map(c => c.total),
          backgroundColor: currencyData.map(c => currencyColors[c.currency] || this.colors.chart[currencyData.indexOf(c) % this.colors.chart.length]),
          borderWidth: 0
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const currency = currencyData[context.dataIndex].currency;
                const count = currencyData[context.dataIndex].count;
                const value = context.parsed;
                
                return [
                  `${formatCurrency(value, currency)}`,
                  `${count} transacciones`
                ];
              }
            }
          }
        }
      }
    };
  }
  
  /**
   * Obtiene la configuración para el gráfico de impuestos por país
   * @param {Array} taxData - Datos de impuestos por país
   * @returns {Object} Configuración del gráfico
   */
  getTaxCountryChartConfig(taxData) {
    if (!taxData || taxData.length === 0) {
      return {
        type: 'bar',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [0],
            backgroundColor: this.colors.gray,
            borderWidth: 0
          }]
        },
        options: this.defaultOptions
      };
    }
    
    const sortedData = [...taxData].sort((a, b) => b.total - a.total);
    
    const taxRates = sortedData.map(country => country.rate || 0);
    
    return {
      type: 'bar',
      data: {
        labels: sortedData.map(country => country.name),
        datasets: [
          {
            label: 'IVA recaudado',
            data: sortedData.map(country => country.total),
            backgroundColor: this.colors.primary,
            borderWidth: 0,
            borderRadius: 4,
            order: 1
          },
          {
            label: 'Tasa de IVA (%)',
            data: taxRates.map(rate => rate * 100), // Convertir a porcentaje
            type: 'line',
            backgroundColor: 'transparent',
            borderColor: this.colors.marron,
            borderWidth: 2,
            pointBackgroundColor: this.colors.marron,
            pointRadius: 4,
            yAxisID: 'y1',
            order: 0
          }
        ]
      },
      options: {
        ...this.defaultOptions,
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
              callback: function(value) {
                return formatCurrency(value, 'EUR', 'es-ES');
              }
            }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            max: 30, // Máximo 30%
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "'Poppins', sans-serif"
              },
              callback: function(value) {
                return value + '%';
              }
            }
          }
        },
        plugins: {
          ...this.defaultOptions.plugins,
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.dataset.yAxisID === 'y1') {
                  label += context.parsed.y + '%';
                } else {
                  label += formatCurrency(context.parsed.y, 'EUR', 'es-ES');
                }
                return label;
              }
            }
          }
        }
      }
    };
  }
}