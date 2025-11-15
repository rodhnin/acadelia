/**
 * Módulo de Egresos/Gastos
 * Permite registrar y analizar los gastos de la empresa
 */

import { formatCurrency, formatDate, formatPercentage } from '../utils/formatter-inteligente.js';
import { ChartManager } from '../utils/chart-config-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class ExpensesModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.chartManager = new ChartManager();
    this.charts = {};
    this.expenses = [];
    this.filteredExpenses = [];
    this.allExpenses = [];
    this.lastApiResponse = null;
    this.categories = [];
    this.dateRange = null;
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filterSettings = {
      category_id: '',
      payment_method: '',
      search: '',
      startDate: null,
      endDate: null,
      min_amount: null,
      max_amount: null,
      is_tax_deductible: null
    };
  }
  
  /**
   * Inicializa el módulo de egresos
   */
  async init() {
    console.log('Inicializando módulo de egresos');
    
    this.allExpenses = [];
    this.lastApiResponse = null;
    
    this.setupEventListeners();
    
    this.setupFormValidation();
    
    this.eventBus.on('dateRangeChanged', (range) => {
      this.dateRange = range;
      this.filterSettings.startDate = range.start;
      this.filterSettings.endDate = range.end;
      
      if (this.allExpenses.length > 0) {
        console.log('Usando filtrado local para cambio de fecha en egresos');
        this.refreshWithLocalData();
      } else {
        console.log('No hay datos locales de egresos, haciendo petición API');
        this.refreshExpenses();
      }
    });
    
    await this.loadExpensesData();
    
    await this.loadCategories();
    
    return true;
  }
  
  /**
   * Configura event listeners para interacciones del usuario
   */
  setupEventListeners() {
    // Event listeners para filtros
    document.getElementById('expense-search').addEventListener('input', (e) => {
      this.filterSettings.search = e.target.value;
      this.currentPage = 1;
      this.applyFilters();
    });

this.resetButton = this.ui.addResetFiltersButton(
  'expenses-section', 
  'reset-expense-filters',
  () => this.resetFilters(), 
  '#apply-expense-filters'
);

// También puedes escuchar eventos para aplicar filtros
document.getElementById('apply-expense-filters').addEventListener('click', () => {
  setTimeout(() => {
    this.updateResetButtonVisibility();
  }, 100);
});
    
    document.getElementById('expense-category-filter').addEventListener('change', (e) => {
      this.filterSettings.category_id = e.target.value;
      this.currentPage = 1;
      this.applyFilters();
    });
    
    document.getElementById('expense-tax-filter').addEventListener('change', (e) => {
      const value = e.target.value;
      this.filterSettings.is_tax_deductible = value === '' ? null : (value === 'true');
      this.currentPage = 1;
      this.applyFilters();
    });
    
    document.getElementById('apply-expense-filters').addEventListener('click', () => {
      this.currentPage = 1;
      this.applyFilters();
    });
    
    // Event listeners para paginación
    document.getElementById('expense-prev-page').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderExpenses();
      }
    });
    
    document.getElementById('expense-next-page').addEventListener('click', () => {
      const totalPages = Math.ceil(this.filteredExpenses.length / this.itemsPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderExpenses();
      }
    });
    
    // Event listener para exportar egresos
    document.getElementById('export-expenses').addEventListener('click', () => {
      this.exportExpenses();
    });
    
    // Event listeners para formularios de egresos
    document.getElementById('save-expense').addEventListener('click', () => {
      this.saveExpense();
    });
    
    document.getElementById('update-expense').addEventListener('click', () => {
      this.updateExpense();
    });
    
    document.getElementById('delete-expense').addEventListener('click', () => {
      const expenseId = document.getElementById('edit-expense-id').value;
      if (expenseId) {
        console.log("Solicitando eliminación desde el botón del modal de edición, ID:", expenseId);
        this.confirmDeleteExpense(expenseId);
      } else {
        this.ui.showErrorMessage('Error', 'No se pudo identificar el egreso a eliminar');
      }
    });
    
    // Event listener para formulario de categorías
    document.getElementById('save-category').addEventListener('click', () => {
      this.saveCategory();
    });
    
    // Event listener para cuando el gráfico debe redimensionarse
    document.addEventListener('sectionChanged', (e) => {
      if (e.detail.section === 'expenses') {
        this.resizeCharts();
      }
    });

    const expensesHeader = document.querySelector('.expenses-header .header-actions');
    if (expensesHeader) {
      const syncButton = document.createElement('button');
      syncButton.className = 'btn btn-sm btn-outline-primary ms-2';
      syncButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizar';
      syncButton.title = 'Forzar recarga de datos desde el servidor';
      
      syncButton.addEventListener('click', () => {
        this.refreshExpenses(true); // Forzar recarga desde API
      });
      
      expensesHeader.appendChild(syncButton);
    }
  }

  /**
 * Reinicia todos los filtros a sus valores predeterminados
 */
resetFilters() {
  // Reiniciar objeto de filtros
  this.filterSettings = {
    category_id: '',
    payment_method: '',
    search: '',
    startDate: this.dateRange?.start || null,
    endDate: this.dateRange?.end || null,
    min_amount: null,
    max_amount: null,
    is_tax_deductible: null
  };
  
  // Reiniciar elementos del formulario
  const searchInput = document.getElementById('expense-search');
  const categoryFilter = document.getElementById('expense-category-filter');
  const taxFilter = document.getElementById('expense-tax-filter');
  
  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (taxFilter) taxFilter.value = '';
  
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active');
  });
  
  this.currentPage = 1;
  
  this.ui.showSuccessMessage('Filtros reiniciados');
  
  // Recargar datos
  this.applyFilters();
  
  this.updateResetButtonVisibility();
}

/**
 * Actualiza la visibilidad y estilo del botón de reinicio según los filtros activos
 */
updateResetButtonVisibility() {
  const hasActiveFilters = 
    this.filterSettings.category_id || 
    this.filterSettings.payment_method || 
    this.filterSettings.search || 
    this.filterSettings.is_tax_deductible !== null;
  
  this.ui.updateResetButtonState('reset-expense-filters', hasActiveFilters);
}
  
  /**
   * Carga los datos de egresos desde la API
   */
async loadExpensesData() {
  try {
    const response = await this.api.getExpenses();
    if (response && response.data) {
      this.lastApiResponse = response;
      
      this.expenses = response.data;
      
      // NUEVO: Guardar copia completa para filtrado local
      this.allExpenses = [...this.expenses];
      console.log(`Almacenados ${this.allExpenses.length} registros para filtrado local de egresos`);
      
      this.filteredExpenses = [...this.expenses];
      this.renderExpenses();
      this.updateSummary();
      this.initCharts();
    }
    return true;
  } catch (error) {
    console.error('Error al cargar datos de egresos:', error);
    this.ui.showErrorMessage('Error al cargar egresos', 'No se pudieron obtener los datos de egresos.');
    return false;
  }
}
  
  /**
   * Carga las categorías de egresos desde la API
   */
  async loadCategories() {
    try {
      const response = await this.api.getExpenseCategories();
      if (response && response.data) {
        this.categories = response.data;
        this.populateCategories();
      }
      return true;
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.ui.showErrorMessage('Error al cargar categorías', 'No se pudieron obtener las categorías de egresos.');
      return false;
    }
  }
  
  /**
   * Aplica los filtros actuales a la lista de egresos
   */
    applyFilters() {
      const sourceData = this.filterSettings.startDate && this.filterSettings.endDate 
        ? this.allExpenses 
        : this.expenses;
      
      this.filteredExpenses = sourceData.filter(expense => {
        let matchesFilter = true;
      
      // Filtro por búsqueda
      if (this.filterSettings.search) {
        const searchTerm = this.filterSettings.search.toLowerCase();
        const descriptionMatch = expense.description && expense.description.toLowerCase().includes(searchTerm);
        const referenceMatch = expense.reference && expense.reference.toLowerCase().includes(searchTerm);
        const categoryMatch = expense.category_name && expense.category_name.toLowerCase().includes(searchTerm);
        
        if (!descriptionMatch && !referenceMatch && !categoryMatch) {
          matchesFilter = false;
        }
      }
      
      // Filtro por categoría
      if (this.filterSettings.category_id && expense.category_id != this.filterSettings.category_id) {
        matchesFilter = false;
      }
      
      // Filtro por deducible
      if (this.filterSettings.is_tax_deductible !== null && expense.is_tax_deductible !== this.filterSettings.is_tax_deductible) {
        matchesFilter = false;
      }
      
      // Filtro por fechas
      if (this.filterSettings.startDate && this.filterSettings.endDate) {
        const expenseDate = new Date(expense.date);
        const startDate = new Date(this.filterSettings.startDate);
        const endDate = new Date(this.filterSettings.endDate);
        
        if (expenseDate < startDate || expenseDate > endDate) {
          matchesFilter = false;
        }
      }
      
      // Filtro por importe mínimo
      if (this.filterSettings.min_amount !== null && expense.amount < this.filterSettings.min_amount) {
        matchesFilter = false;
      }
      
      // Filtro por importe máximo
      if (this.filterSettings.max_amount !== null && expense.amount > this.filterSettings.max_amount) {
        matchesFilter = false;
      }
      
      return matchesFilter;
    });
    
    this.filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    this.renderExpenses();
    
    this.updateSummary();
    this.updateCharts();
    this.updateResetButtonVisibility();
  }

  /**
 * Filtra egresos por rango de fechas
 * @param {Array} expenses - Lista de egresos a filtrar
 * @param {Object} dateRange - Rango de fechas {start, end}
 * @returns {Array} Egresos filtrados
 */
filterDataByDateRange(expenses, dateRange) {
  if (!dateRange || !dateRange.start || !dateRange.end) {
    console.log('No hay rango de fechas válido para filtrar egresos');
    return expenses;
  }
  
  console.log(`Filtrando ${expenses.length} egresos por rango: ${dateRange.start} a ${dateRange.end}`);
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  // Ajustar endDate para incluir todo el día
  endDate.setHours(23, 59, 59, 999);
  
  return expenses.filter(expense => {
    // Específico para egresos: usar el campo "date" como criterio principal
    const expenseDate = expense.date ? new Date(expense.date) : null;
    return expenseDate && expenseDate >= startDate && expenseDate <= endDate;
  });
}

/**
 * Refresca los datos de egresos usando filtrado local
 */
refreshWithLocalData() {
  if (!this.allExpenses || this.allExpenses.length === 0) {
    console.warn('No hay datos locales de egresos para filtrar, usando API');
    this.refreshExpenses();
    return;
  }
  
  console.log('Aplicando filtro local de fechas a datos de egresos almacenados');
  
  try {
    this.ui.showLoading('Actualizando datos de egresos...');
    
    if (!this.dateRange) {
      console.warn('No hay rango de fechas definido para filtrado local de egresos');
      this.ui.hideLoading();
      return;
    }
    
    const filteredByDate = this.filterDataByDateRange(this.allExpenses, this.dateRange);
    console.log(`Filtro local de egresos: ${filteredByDate.length} de ${this.allExpenses.length} egresos`);
    
    this.expenses = filteredByDate;
    
    this.applyFilters();
    
    // Este método ya se encarga de:
    // - Actualizar filteredExpenses
    // - Renderizar los datos
    // - Actualizar el resumen
    // - Actualizar los gráficos
    
    this.ui.hideLoading();
    
    this.ui.showSuccessMessage('Datos de egresos filtrados por fecha');
  } catch (error) {
    console.error('Error al aplicar filtro local de egresos:', error);
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo aplicar el filtro de fechas a los datos de egresos');
    
    // En caso de error, recurrir a la API
    this.refreshExpenses();
  }
}
  
/**
 * Renderiza la lista de egresos en la tabla
 */
renderExpenses() {
  const tableBody = document.getElementById('expenses-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  // Si no hay egresos filtrados
  if (this.filteredExpenses.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="8" class="text-center">No se encontraron egresos con los filtros actuales</td>';
    tableBody.appendChild(emptyRow);
    
    this.updatePagination(0, 0, 0);
    return;
  }
  
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredExpenses.length);
  const paginatedExpenses = this.filteredExpenses.slice(startIndex, endIndex);
  
  paginatedExpenses.forEach(expense => {
    const row = document.createElement('tr');
    
    const deductibleIndicator = expense.is_tax_deductible 
      ? '<div class="tax-deductible-indicator tax-deductible-yes"><i class="bi bi-check"></i></div>' 
      : '<div class="tax-deductible-indicator tax-deductible-no"><i class="bi bi-x"></i></div>';
    
    row.innerHTML = `
      <td>${expense.id}</td>
      <td>${formatDate(expense.date)}</td>
      <td>${expense.category_name || 'Sin categoría'}</td>
      <td>${expense.description}</td>
      <td>${formatCurrency(expense.amount)}</td>
      <td>${formatCurrency(expense.tax_amount || 0)}</td>
      <td class="text-center">${deductibleIndicator}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary edit-expense" data-id="${expense.id}" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-sm ${expense.invoice_url ? 'btn-outline-success' : 'btn-outline-secondary'} upload-invoice" data-id="${expense.id}" title="${expense.invoice_url ? 'Ver/Cambiar factura' : 'Subir factura'}">
            <i class="bi bi-file-earmark-pdf"></i>
          </button>
        </div>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  this.setupTableActions();
  
  this.updatePagination(startIndex + 1, endIndex, this.filteredExpenses.length);
}
  
  /**
   * Actualiza los indicadores de paginación
   * @param {number} start - Índice de inicio
   * @param {number} end - Índice de fin
   * @param {number} total - Total de elementos
   */
  updatePagination(start, end, total) {
    document.getElementById('expense-pagination-start').textContent = start;
    document.getElementById('expense-pagination-end').textContent = end;
    document.getElementById('expense-pagination-total').textContent = total;
    
    document.getElementById('expense-prev-page').disabled = this.currentPage <= 1;
    document.getElementById('expense-next-page').disabled = end >= total;
  }
  
  /**
   * Configura los event listeners para acciones en la tabla
   */
  setupTableActions() {
    // Botones de edición
    document.querySelectorAll('.edit-expense').forEach(button => {
      button.addEventListener('click', () => {
        const expenseId = button.getAttribute('data-id');
        this.openEditExpenseModal(expenseId);
      });
    });
    
    // Botones de eliminación
    document.querySelectorAll('.delete-expense').forEach(button => {
      button.addEventListener('click', () => {
        const expenseId = button.getAttribute('data-id');
        this.confirmDeleteExpense(expenseId);
      });
    });
    // Botones de subida de factura
  document.querySelectorAll('.upload-invoice').forEach(button => {
    button.addEventListener('click', () => {
      const expenseId = button.getAttribute('data-id');
      this.showUploadInvoiceModal(expenseId);
    });
  });
  }
  
  /**
   * Actualiza el resumen de egresos
   */
  updateSummary() {
    const totals = {
      total: 0,
      totalVAT: 0,        // Añade esta nueva propiedad para el IVA total
      deductibleExpenses: 0,
      deductibleVAT: 0,
      byCategory: {}
    };
    
    this.filteredExpenses.forEach(expense => {
      totals.total += parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0);
      
      totals.totalVAT += parseFloat(expense.tax_amount || 0);
      
      if (expense.is_tax_deductible) {
        // Total de gastos que son fiscalmente deducibles
        totals.deductibleExpenses += parseFloat(expense.amount || 0);
        
        totals.deductibleVAT += parseFloat(expense.tax_amount || 0);
      }
      
      // Agrupar por categoría
      const categoryId = expense.category_id;
      const categoryName = expense.category_name || 'Sin categoría';
      
      if (!totals.byCategory[categoryId]) {
        totals.byCategory[categoryId] = {
          id: categoryId,
          name: categoryName,
          total: 0,
          count: 0
        };
      }
      
      totals.byCategory[categoryId].total += parseFloat(expense.amount);
      totals.byCategory[categoryId].count += 1;
    });
    
    document.getElementById('expenses-total').textContent = formatCurrency(totals.total);
    document.getElementById('expenses-total-vat').textContent = formatCurrency(totals.totalVAT);
    document.getElementById('expenses-deductible').textContent = formatCurrency(totals.deductibleExpenses);
    document.getElementById('expenses-deductible-vat').textContent = formatCurrency(totals.deductibleVAT);
    document.getElementById('expense-amount').textContent = formatCurrency(totals.total);
    
    this.getIncomeData().then(incomeTotal => {
      document.getElementById('income-amount').textContent = formatCurrency(incomeTotal);
      
      const totalFinance = incomeTotal + totals.total;
      const incomePercentage = totalFinance > 0 ? (incomeTotal / totalFinance) * 100 : 0;
      const expensePercentage = totalFinance > 0 ? (totals.total / totalFinance) * 100 : 0;
      
      document.getElementById('income-bar').style.width = `${incomePercentage}%`;
      document.getElementById('expense-bar').style.width = `${expensePercentage}%`;
    });
    
    this.updateCategorySummary(totals.byCategory);
  }
  
  /**
   * Obtiene los datos de ingresos para comparación
   * @returns {Promise<number>} Total de ingresos
   */
  async getIncomeData() {
    try {
      // Asegurar que tenemos fechas para filtrar
      const startDate = this.filterSettings.startDate;
      const endDate = this.filterSettings.endDate;
      
      console.log('Obteniendo datos de ingresos con filtros:', { startDate, endDate });
      
      let dateFrom = startDate;
      let dateTo = endDate;
      
      if (!dateFrom || !dateTo) {
        const now = new Date();
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        console.log('Usando fechas por defecto:', { dateFrom, dateTo });
      }
      
      try {
        const response = await this.api.getTransactionsTotals({
          date_from: dateFrom,
          date_to: dateTo
        });
        
        console.log('Respuesta de API getTransactionsTotals:', response);
        
        if (response && response.data && response.data.totals && response.data.totals.revenue) {
          return parseFloat(response.data.totals.revenue) || 0;
        }
      } catch (err) {
        console.warn('Error con getTransactionsTotals:', err);
      }
      
      // Método alternativo: obtener transacciones y sumar manualmente
      try {
        const transactions = await this.api.getTransactions();
        
        if (Array.isArray(transactions)) {
          const filteredTransactions = transactions.filter(tx => {
            if (!dateFrom || !dateTo) return true;
            
            const txDate = new Date(tx.updated_at || tx.created_at);
            const start = new Date(dateFrom);
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            
            return txDate >= start && txDate <= end;
          });
          
          const totalIncome = filteredTransactions.reduce((sum, tx) => {
            return sum + parseFloat(tx.amount_eur || tx.amount || 0);
          }, 0);
          
          console.log(`Ingresos calculados: ${totalIncome}`);
          return totalIncome;
        }
      } catch (err) {
        console.warn('Error con método alternativo:', err);
      }
      
      console.warn('No se pudieron obtener datos de ingresos');
      return 0;
    } catch (error) {
      console.error('Error general al obtener datos de ingresos:', error);
      return 0;
    }
  }
  
  /**
   * Actualiza el resumen por categorías
   * @param {Object} categoriesData - Datos agrupados por categoría
   */
  updateCategorySummary(categoriesData) {
    const categorySummary = document.getElementById('category-summary');
    if (!categorySummary) return;
    
    categorySummary.innerHTML = '';
    
    // Si no hay datos
    if (Object.keys(categoriesData).length === 0) {
      categorySummary.innerHTML = '<div class="placeholder-text text-center text-muted">No hay datos disponibles</div>';
      return;
    }
    
    const categoriesArray = Object.values(categoriesData).sort((a, b) => b.total - a.total);
    
    const grandTotal = categoriesArray.reduce((sum, cat) => sum + cat.total, 0);
    
    const topCategories = categoriesArray.slice(0, 5);
    
    topCategories.forEach((category, index) => {
      const percentage = grandTotal > 0 ? (category.total / grandTotal) * 100 : 0;
      const colorClass = `category-color-${(index % 10) + 1}`;
      
      const categoryElement = document.createElement('div');
      categoryElement.className = 'category-summary-item';
      categoryElement.innerHTML = `
        <div class="category-summary-title">
          <div class="category-summary-name">${category.name}</div>
          <div class="category-summary-value">${formatCurrency(category.total)}</div>
        </div>
        <div class="category-summary-bar">
          <div class="category-summary-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
        </div>
        <div class="category-summary-percentage text-muted small">${formatPercentage(percentage)}</div>
      `;
      
      categorySummary.appendChild(categoryElement);
    });
  }
  
  /**
   * Inicializa los gráficos
   */
  initCharts() {
    this.initCategoryChart();
    this.initMonthlyChart();
  }
  
  /**
   * Inicializa el gráfico de egresos por categoría
   */
  initCategoryChart() {
    const ctx = document.getElementById('expenses-category-chart');
    if (!ctx) return;
    
    const chartData = this.prepareCategoryChartData();
    
    // Configuración del gráfico
    const config = {
      type: 'pie',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.data,
            backgroundColor: [
              '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
              '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
            ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 15,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed;
                return `${context.label}: ${formatCurrency(value)}`;
              }
            }
          }
        }
      }
    };
    
    if (this.charts.category) {
      this.charts.category.data = config.data;
      this.charts.category.update();
    } else {
      this.charts.category = new Chart(ctx, config);
    }
  }
  
  /**
   * Inicializa el gráfico de evolución mensual de egresos
   */
  initMonthlyChart() {
    const ctx = document.getElementById('expenses-monthly-chart');
    if (!ctx) return;
    
    const chartData = this.prepareMonthlyChartData();
    
    // Configuración del gráfico
    const config = {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Egresos',
            data: chartData.data,
            backgroundColor: '#e15759',
            borderColor: '#e15759',
            borderWidth: 1
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
            ticks: {
              callback: (value) => formatCurrency(value)
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `Egresos: ${formatCurrency(value)}`;
              }
            }
          }
        }
      }
    };
    
    if (this.charts.monthly) {
      this.charts.monthly.data = config.data;
      this.charts.monthly.update();
    } else {
      this.charts.monthly = new Chart(ctx, config);
    }
  }
  
  /**
   * Prepara los datos para el gráfico de categorías
   * @returns {Object} Datos formateados para el gráfico
   */
  prepareCategoryChartData() {
    // Agrupar por categoría
    const categoryTotals = {};
    
    this.filteredExpenses.forEach(expense => {
      const categoryId = expense.category_id;
      const categoryName = expense.category_name || 'Sin categoría';
      
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = {
          name: categoryName,
          total: 0
        };
      }
      
      categoryTotals[categoryId].total += parseFloat(expense.amount);
    });
    
    const categories = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    
    return {
      labels: categories.map(cat => cat.name),
      data: categories.map(cat => cat.total)
    };
  }
  
  /**
   * Prepara los datos para el gráfico mensual
   * @returns {Object} Datos formateados para el gráfico
   */
  prepareMonthlyChartData() {
    const today = new Date();
    const monthsData = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(date);
      
      monthsData[monthKey] = {
        label: monthLabel,
        total: 0
      };
    }
    
    // Agrupar egresos por mes
    this.filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthsData[monthKey]) {
        monthsData[monthKey].total += parseFloat(expense.amount);
      }
    });
    
    const sortedMonths = Object.keys(monthsData).sort();
    
    return {
      labels: sortedMonths.map(key => monthsData[key].label),
      data: sortedMonths.map(key => monthsData[key].total)
    };
  }
  
  /**
   * Actualiza los gráficos con los datos filtrados
   */
  updateCharts() {
    if (this.charts.category) {
      const categoryData = this.prepareCategoryChartData();
      this.charts.category.data.labels = categoryData.labels;
      this.charts.category.data.datasets[0].data = categoryData.data;
      this.charts.category.update();
    }
    
    if (this.charts.monthly) {
      const monthlyData = this.prepareMonthlyChartData();
      this.charts.monthly.data.labels = monthlyData.labels;
      this.charts.monthly.data.datasets[0].data = monthlyData.data;
      this.charts.monthly.update();
    }
  }
  
  /**
   * Redimensiona los gráficos (útil cuando se cambia de tamaño la ventana)
   */
  resizeCharts() {
    if (this.charts.category) {
      this.charts.category.resize();
    }
    
    if (this.charts.monthly) {
      this.charts.monthly.resize();
    }
  }
  
/**
 * Refresca los datos de egresos desde el API o localmente
 * @param {boolean} forceApi - Forzar recarga desde API aunque haya datos locales
 */
async refreshExpenses(forceApi = false) {
  try {
    console.log('Refrescando datos de egresos');
    
    // Si no estamos forzando API y tenemos datos locales, usar filtrado local
    if (!forceApi && this.allExpenses.length > 0) {
      const hasOnlyDateFilters = !this.filterSettings.category_id && 
                                !this.filterSettings.search && 
                                this.filterSettings.is_tax_deductible === null &&
                                !this.filterSettings.min_amount && 
                                !this.filterSettings.max_amount;
      
      if (hasOnlyDateFilters) {
        console.log('Usando filtrado local para refrescar egresos');
        this.refreshWithLocalData();
        return;
      }
    }
    
    // Si llegamos aquí, necesitamos recargar datos desde API
    this.api.clearCache('expenses');
    
    this.ui.showLoading('Actualizando datos de egresos...');
    
    // Recargar datos
    await this.loadExpensesData();
    
    this.applyFilters();
    
    this.ui.hideLoading();
    
    this.ui.showSuccessMessage('Datos de egresos actualizados correctamente');
  } catch (error) {
    console.error('Error al actualizar egresos:', error);
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error al actualizar', 'No se pudieron actualizar los datos de egresos.');
  }
}
  
  /**
   * Popula los selectores de categorías en formularios
   */
  populateCategories() {
    // Lista de selectores a popular
    const selectors = [
      'expense-category-filter',
      'expense-category',
      'edit-expense-category'
    ];
    
    selectors.forEach(selectorId => {
      const select = document.getElementById(selectorId);
      if (!select) return;
      
      // Mantener la primera opción
      const firstOption = select.querySelector('option:first-child');
      select.innerHTML = '';
      if (firstOption) {
        select.appendChild(firstOption);
      }
      
      this.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      });
    });
    
    // Popular la lista visual de categorías
    this.populateCategoryList();
  }
  
  /**
   * Popula la lista visual de categorías
   */
  populateCategoryList() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    categoryList.innerHTML = '';
    
    // Si no hay categorías
    if (!this.categories || this.categories.length === 0) {
      categoryList.innerHTML = '<div class="placeholder-text text-center text-muted">No hay categorías definidas</div>';
      return;
    }
    
    this.categories.forEach(category => {
      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';
      categoryItem.textContent = category.name;
      categoryItem.setAttribute('data-id', category.id);
      categoryItem.setAttribute('data-bs-toggle', 'tooltip');
      categoryItem.setAttribute('title', category.description || 'Sin descripción');
      
      // Event listener para filtrar al hacer clic
      categoryItem.addEventListener('click', () => {
        document.querySelectorAll('.category-item').forEach(item => {
          item.classList.remove('active');
        });
        categoryItem.classList.add('active');
        
        this.filterSettings.category_id = category.id;
        document.getElementById('expense-category-filter').value = category.id;
        this.currentPage = 1;
        this.applyFilters();
      });
      
      categoryList.appendChild(categoryItem);
    });
    
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
      new bootstrap.Tooltip(el);
    });
  }
  
/**
 * Guarda un nuevo egreso con factura si está disponible
 */
async saveExpense() {
  try {
    console.log("Iniciando guardado de egreso...");
    
    const form = document.getElementById('add-expense-form');
    if (!form) {
      this.ui.showErrorMessage('Error', 'No se encontró el formulario de egresos');
      return;
    }

    form.querySelectorAll('.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
    
    const dateEl = form.querySelector('#expense-date');
    const categoryEl = form.querySelector('#expense-category');
    const descriptionEl = form.querySelector('#expense-description');
    const amountEl = form.querySelector('#expense-amount');
    const taxEl = form.querySelector('#expense-tax');
    const methodEl = form.querySelector('#expense-payment-method');
    const refEl = form.querySelector('#expense-reference');
    const deductibleEl = form.querySelector('#expense-tax-deductible');
    const invoiceFileEl = form.querySelector('#expense-invoice');
    
    if (!dateEl || !categoryEl || !descriptionEl || !amountEl || !methodEl || !refEl) {
      console.error("Elementos no encontrados");
      this.ui.showErrorMessage('Error', 'No se pudieron encontrar todos los elementos del formulario');
      return;
    }
    
    // Recopilar datos de manera segura
    const date = dateEl.value ? dateEl.value.trim() : '';
    const category_id = categoryEl.value ? categoryEl.value.trim() : '';
    const description = descriptionEl.value ? descriptionEl.value.trim() : '';
    const payment_method = methodEl.value ? methodEl.value.trim() : '';
    const reference = refEl.value ? refEl.value.trim() : '';
    
    let amount = NaN;
    if (amountEl.value !== undefined && amountEl.value !== "") {
      const amountValue = amountEl.value.toString().replace(',', '.');
      amount = parseFloat(amountValue);
    }
    
    let tax_amount = 0;
    if (taxEl && taxEl.value) {
      const taxValue = taxEl.value.toString().replace(',', '.');
      tax_amount = parseFloat(taxValue) || 0;
    }
    
    const errors = [];
    
    if (!date) {
      errors.push('Fecha es requerida');
      dateEl.classList.add('is-invalid');
      this.addInvalidFeedback(dateEl, 'La fecha es obligatoria');
    }
    
    if (!category_id) {
      errors.push('Categoría es requerida');
      categoryEl.classList.add('is-invalid');
      this.addInvalidFeedback(categoryEl, 'Selecciona una categoría');
    }
    
    if (!description) {
      errors.push('Descripción es requerida');
      descriptionEl.classList.add('is-invalid');
      this.addInvalidFeedback(descriptionEl, 'La descripción es obligatoria');
    }
    
    if (!payment_method) {
      errors.push('Método de pago es requerido');
      methodEl.classList.add('is-invalid');
      this.addInvalidFeedback(methodEl, 'Selecciona un método de pago');
    }
    
    if (!reference) {
      errors.push('Referencia es requerida');
      refEl.classList.add('is-invalid');
      this.addInvalidFeedback(refEl, 'La referencia es obligatoria');
    }
    
    if (isNaN(amount) || amount <= 0) {
      errors.push('Importe debe ser un número mayor que cero');
      amountEl.classList.add('is-invalid');
      this.addInvalidFeedback(amountEl, 'Por favor ingresa un importe válido mayor que cero');
    }
    
    let invoiceFile = null;
    if (invoiceFileEl && invoiceFileEl.files && invoiceFileEl.files.length > 0) {
      invoiceFile = invoiceFileEl.files[0];
      
      if (invoiceFile.type !== 'application/pdf') {
        errors.push('La factura debe ser un archivo PDF');
        invoiceFileEl.classList.add('is-invalid');
        this.addInvalidFeedback(invoiceFileEl, 'Por favor selecciona un archivo PDF válido');
      }
      
      if (invoiceFile.size > 5 * 1024 * 1024) {
        errors.push('El archivo es demasiado grande (máximo 5MB)');
        invoiceFileEl.classList.add('is-invalid');
        this.addInvalidFeedback(invoiceFileEl, 'El archivo es demasiado grande. Máximo 5MB.');
      }
    }
    
    // Si hay errores, mostrar el mensaje y salir
    if (errors.length > 0) {
      this.ui.showErrorMessage('Error en formulario', errors.join('<br>'));
      return;
    }
    
    const expenseData = {
      date,
      category_id,
      description,
      amount,
      tax_amount,
      payment_method,
      reference,
      is_tax_deductible: deductibleEl ? deductibleEl.checked : false
    };
    
    if (this.ui.showLoading) {
      this.ui.showLoading('Guardando egreso...');
    }
    
    // Si hay archivo de factura, usar FormData para enviar datos + archivo
    if (invoiceFile) {
      const formData = new FormData();
      
      Object.keys(expenseData).forEach(key => {
        formData.append(key, expenseData[key]);
      });
      
      formData.append('invoice', invoiceFile);
      
      try {
        const response = await this.api.createExpenseWithInvoice(formData);
        
        if (response && response.success) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
          if (modal) {
            modal.hide();
          }
          
          form.reset();
          
          form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
          });
          
          // Recargar datos
          await this.refreshExpenses();
          
          this.ui.showSuccessMessage('Egreso creado correctamente con factura');
        } else {
          throw new Error(response?.message || 'Error al guardar egreso con factura');
        }
      } catch (error) {
        console.error('Error al guardar egreso con factura:', error);
        this.ui.showErrorMessage('Error al guardar', error.message || 'No se pudo guardar el egreso con factura.');
      } finally {
        if (this.ui.hideLoading) {
          this.ui.hideLoading();
        }
      }
    } else {
      // Si no hay factura, usar el método original
      try {
        console.log('Enviando datos al API:', expenseData);
        
        const response = await this.api.createExpense(expenseData);
        
        if (response && response.success) {
          const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
          if (modal) {
            modal.hide();
          }
          
          form.reset();
          
          form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
          });
          
          // Recargar datos
          await this.refreshExpenses();
          
          this.ui.showSuccessMessage('Egreso creado correctamente');
        } else {
          throw new Error(response?.message || 'Error al guardar egreso');
        }
      } catch (error) {
        console.error('Error al guardar egreso:', error);
        this.ui.showErrorMessage('Error al guardar', error.message || 'No se pudo guardar el egreso.');
      } finally {
        if (this.ui.hideLoading) {
          this.ui.hideLoading();
        }
      }
    }
  } catch (error) {
    console.error('Error general al guardar egreso:', error);
    
    if (this.ui.hideLoading) {
      this.ui.hideLoading();
    }
    
    this.ui.showErrorMessage('Error al guardar', error.message || 'No se pudo guardar el egreso.');
  }
}


/**
 * Sube una factura para un egreso
 * @param {number} expenseId - ID del egreso
 * @param {File} file - Archivo PDF de la factura
 */
async uploadInvoice(expenseId, file) {
  try {
    if (!file || file.type !== 'application/pdf') {
      throw new Error('Por favor selecciona un archivo PDF válido');
    }
    
    const formData = new FormData();
    formData.append('invoice', file);
    
    if (this.ui.showLoading) {
      this.ui.showLoading('Subiendo factura...');
    }
    
    const response = await this.api.uploadExpenseInvoice(expenseId, formData);
    
    if (this.ui.hideLoading) {
      this.ui.hideLoading();
    }
    
    this.ui.showSuccessMessage('Factura subida correctamente');
    
    // Refrescar datos
    await this.refreshExpenses();
    
    return response;
  } catch (error) {
    if (this.ui.hideLoading) {
      this.ui.hideLoading();
    }
    
    console.error('Error al subir factura:', error);
    this.ui.showErrorMessage('Error al subir factura', error.message);
    throw error;
  }
}

/**
 * Abre un modal para subir una factura
 * @param {number} expenseId - ID del egreso
 */
showUploadInvoiceModal(expenseId) {
  try {
    const expense = this.expenses.find(e => e.id == expenseId);
    if (!expense) {
      this.ui.showErrorMessage('Error', 'No se encontró el egreso especificado');
      return;
    }
    
    let uploadModal = document.getElementById('uploadInvoiceModal');
    
    // Si no existe, crearlo
    if (!uploadModal) {
      const modalHTML = `
        <div class="modal fade" id="uploadInvoiceModal" tabindex="-1" aria-labelledby="uploadInvoiceModalLabel" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="uploadInvoiceModalLabel">Subir Factura</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>Selecciona la factura en PDF para el egreso:</p>
                <div class="expense-details p-3 my-3 border rounded bg-light">
                  <div><strong>ID:</strong> <span id="upload-expense-id-display"></span></div>
                  <div><strong>Descripción:</strong> <span id="upload-expense-description-display"></span></div>
                  <div><strong>Importe:</strong> <span id="upload-expense-amount-display"></span></div>
                  <div><strong>Fecha:</strong> <span id="upload-expense-date-display"></span></div>
                </div>
                
                <div class="current-invoice mb-3" id="current-invoice-container" style="display: none;">
                  <p><strong>Factura actual:</strong></p>
                  <a href="#" target="_blank" id="current-invoice-link" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-file-earmark-pdf me-1"></i> Ver factura
                  </a>
                </div>
                
                <form id="upload-invoice-form">
                  <input type="hidden" id="upload-expense-id" value="">
                  <div class="mb-3">
                    <label for="invoice-file" class="form-label">Archivo de factura (PDF)</label>
                    <input type="file" class="form-control" id="invoice-file" accept="application/pdf" required>
                    <div class="invalid-feedback">
                      Por favor selecciona un archivo PDF válido.
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="confirm-upload-invoice">
                  <i class="bi bi-cloud-upload me-1"></i> Subir Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      uploadModal = document.getElementById('uploadInvoiceModal');
    }
    
    document.getElementById('upload-expense-id').value = expense.id;
    document.getElementById('upload-expense-id-display').textContent = expense.id;
    document.getElementById('upload-expense-description-display').textContent = expense.description || 'Sin descripción';
    document.getElementById('upload-expense-amount-display').textContent = formatCurrency(expense.amount);
    document.getElementById('upload-expense-date-display').textContent = formatDate(expense.date);
    
    const invoiceContainer = document.getElementById('current-invoice-container');
    const invoiceLink = document.getElementById('current-invoice-link');
    
    if (expense.invoice_url) {
      invoiceContainer.style.display = 'block';
      invoiceLink.href = expense.invoice_url;
    } else {
      invoiceContainer.style.display = 'none';
    }
    
    const fileInput = document.getElementById('invoice-file');
    if (fileInput) {
      fileInput.value = '';
      fileInput.classList.remove('is-invalid');
    }
    
    const confirmButton = document.getElementById('confirm-upload-invoice');
    if (confirmButton) {
      const newConfirmButton = confirmButton.cloneNode(true);
      confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
      
      const self = this;
      newConfirmButton.addEventListener('click', async function() {
        const expenseId = document.getElementById('upload-expense-id').value;
        const fileInput = document.getElementById('invoice-file');
        
        if (!fileInput.files || fileInput.files.length === 0) {
          fileInput.classList.add('is-invalid');
          return;
        }
        
        const file = fileInput.files[0];
        if (file.type !== 'application/pdf') {
          fileInput.classList.add('is-invalid');
          return;
        }
        
        try {
          await self.uploadInvoice(expenseId, file);
          
          const modal = bootstrap.Modal.getInstance(uploadModal);
          if (modal) {
            modal.hide();
          }
        } catch (error) {
          // El error ya se muestra en uploadInvoice
          console.error('Error al subir factura:', error);
        }
      });
    }
    
    const modal = new bootstrap.Modal(uploadModal);
    modal.show();
  } catch (error) {
    console.error('Error al mostrar modal de subida:', error);
    this.ui.showErrorMessage('Error', 'No se pudo mostrar el modal de subida de factura');
  }
}

/**
 * Añade un mensaje de error debajo de un campo de formulario
 * @param {HTMLElement} element - El elemento al que añadir feedback
 * @param {string} message - El mensaje de error
 */
addInvalidFeedback(element, message) {
  // Si el elemento está dentro de un input-group, añadir después del grupo
  const inputGroup = element.closest('.input-group');
  const target = inputGroup || element;
  
  let feedback = target.nextElementSibling;
  if (!feedback || !feedback.classList.contains('invalid-feedback')) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    
    if (inputGroup) {
      inputGroup.parentNode.insertBefore(feedback, inputGroup.nextSibling);
    } else {
      element.parentNode.insertBefore(feedback, element.nextSibling);
    }
  }
  
  feedback.textContent = message;
  feedback.style.display = 'block'; // Forzar que se muestre
}

/**
 * Configura event listeners para limpiar errores al corregir campos
 * Se debe llamar después de cargar el DOM
 */
setupFormValidation() {
  const addForm = document.getElementById('add-expense-form');
  if (addForm) {
    const inputFields = addForm.querySelectorAll('input, select, textarea');
    inputFields.forEach(field => {
      field.addEventListener('input', () => {
        field.classList.remove('is-invalid');
        
        // Si el campo está dentro de un input-group, buscar feedback después del grupo
        const inputGroup = field.closest('.input-group');
        if (inputGroup) {
          const feedback = inputGroup.nextElementSibling;
          if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.style.display = 'none';
          }
        } else {
          const feedback = field.nextElementSibling;
          if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.style.display = 'none';
          }
        }
      });
    });
    
    const cancelButton = document.querySelector('#addExpenseModal .btn-secondary');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        addForm.reset();
        addForm.querySelectorAll('.is-invalid').forEach(el => {
          el.classList.remove('is-invalid');
        });
        addForm.querySelectorAll('.invalid-feedback').forEach(el => {
          el.style.display = 'none';
        });
      });
    }
    
    // También limpiar al cerrar modal con la X o haciendo clic fuera
    const modal = document.getElementById('addExpenseModal');
    if (modal) {
      modal.addEventListener('hidden.bs.modal', () => {
        addForm.reset();
        addForm.querySelectorAll('.is-invalid').forEach(el => {
          el.classList.remove('is-invalid');
        });
        addForm.querySelectorAll('.invalid-feedback').forEach(el => {
          el.style.display = 'none';
        });
      });
    }
  }

  const editForm = document.getElementById('edit-expense-form');
  if (editForm) {
    const editInputFields = editForm.querySelectorAll('input, select, textarea');
    editInputFields.forEach(field => {
      field.addEventListener('input', () => {
        field.classList.remove('is-invalid');
        
        const inputGroup = field.closest('.input-group');
        if (inputGroup) {
          const feedback = inputGroup.nextElementSibling;
          if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.style.display = 'none';
          }
        } else {
          const feedback = field.nextElementSibling;
          if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.style.display = 'none';
          }
        }
      });
    });
  }

  this.markRequiredFields();
}

/**
 * Añade la clase 'required' a las etiquetas de los campos obligatorios
 */
markRequiredFields() {
  // Lista de selectores para campos obligatorios
  const requiredFieldLabels = [
    'label[for="expense-date"]',
    'label[for="expense-category"]',
    'label[for="expense-description"]',
    'label[for="expense-amount"]',
    'label[for="expense-payment-method"]',
    'label[for="expense-reference"]',
    'label[for="edit-expense-date"]',
    'label[for="edit-expense-category"]',
    'label[for="edit-expense-description"]',
    'label[for="edit-expense-amount"]',
    'label[for="edit-expense-payment-method"]',
    'label[for="edit-expense-reference"]'
  ];
  
  requiredFieldLabels.forEach(selector => {
    const label = document.querySelector(selector);
    if (label) {
      label.classList.add('required');
    }
  });
}
  
  /**
   * Abre el modal de edición de egreso
   * @param {number} expenseId - ID del egreso a editar
   */
  async openEditExpenseModal(expenseId) {
    try {
      const expense = this.expenses.find(e => e.id == expenseId);
      
      if (!expense) {
        const response = await this.api.getExpense(expenseId);
        if (!response || !response.data) {
          throw new Error('No se encontró el egreso especificado');
        }
        expense = response.data;
      }
      
      // Rellenar formulario con datos del egreso
      document.getElementById('edit-expense-id').value = expense.id;
      document.getElementById('edit-expense-date').value = expense.date ? new Date(expense.date).toISOString().split('T')[0] : '';
      document.getElementById('edit-expense-category').value = expense.category_id || '';
      document.getElementById('edit-expense-description').value = expense.description || '';
      document.getElementById('edit-expense-amount').value = expense.amount || '';
      document.getElementById('edit-expense-tax').value = expense.tax_amount || '';
      document.getElementById('edit-expense-payment-method').value = expense.payment_method || '';
      document.getElementById('edit-expense-reference').value = expense.reference || '';
      document.getElementById('edit-expense-tax-deductible').checked = expense.is_tax_deductible || false;
      
      const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
      modal.show();
    } catch (error) {
      console.error('Error al abrir modal de edición:', error);
      this.ui.showErrorMessage('Error', 'No se pudo cargar el egreso para editar.');
    }
  }
  
  /**
   * Actualiza un egreso existente
   */
  async updateExpense() {
    try {
      const expenseId = document.getElementById('edit-expense-id').value;
      
      // Recopilar datos del formulario
      const expenseData = {
        date: document.getElementById('edit-expense-date').value,
        category_id: document.getElementById('edit-expense-category').value,
        description: document.getElementById('edit-expense-description').value,
        amount: parseFloat(document.getElementById('edit-expense-amount').value),
        tax_amount: parseFloat(document.getElementById('edit-expense-tax').value || 0),
        payment_method: document.getElementById('edit-expense-payment-method').value,
        reference: document.getElementById('edit-expense-reference').value,
        is_tax_deductible: document.getElementById('edit-expense-tax-deductible').checked
      };
      
      if (!expenseData.date || !expenseData.category_id || !expenseData.description || isNaN(expenseData.amount)) {
        this.ui.showErrorMessage('Error en formulario', 'Todos los campos marcados como requeridos deben ser completados.');
        return;
      }
      
      const response = await this.api.updateExpense(expenseId, expenseData);
      
      if (response && response.success) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
        modal.hide();
        
        // Recargar datos
        await this.refreshExpenses();
        
        this.ui.showSuccessMessage('Egreso actualizado correctamente');
      } else {
        throw new Error(response.message || 'Error al actualizar egreso');
      }
    } catch (error) {
      console.error('Error al actualizar egreso:', error);
      this.ui.showErrorMessage('Error al actualizar', error.message || 'No se pudo actualizar el egreso.');
    }
  }
  
/**
 * Confirma la eliminación de un egreso con un modal personalizado
 * @param {number} expenseId - ID del egreso a eliminar
 */
confirmDeleteExpense(expenseId) {
  try {
    console.log("Iniciando confirmación de eliminación para ID:", expenseId);
    
    const expense = this.expenses.find(e => e.id == expenseId);
    
    if (!expense) {
      console.error("No se encontró el egreso con ID:", expenseId);
      this.ui.showErrorMessage('Error', 'No se pudo encontrar el egreso especificado');
      return;
    }
    
    console.log("Información del egreso a eliminar:", expense);
    
    let deleteModal = document.getElementById('deleteExpenseModal');
    
    // Si no existe el modal en el DOM, lo añadimos
    if (!deleteModal) {
      const modalHTML = `
        <div class="modal fade" id="deleteExpenseModal" tabindex="-1" aria-labelledby="deleteExpenseModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title" id="deleteExpenseModalLabel">Confirmar Eliminación</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>¿Está seguro que desea eliminar este egreso? Esta acción no se puede deshacer.</p>
                <div class="alert alert-warning">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  Se eliminará el egreso con la siguiente información:
                </div>
                <div class="expense-delete-details p-3 my-3 border rounded bg-light">
                  <div><strong>ID:</strong> <span id="delete-expense-id-display"></span></div>
                  <div><strong>Descripción:</strong> <span id="delete-expense-description-display"></span></div>
                  <div><strong>Importe:</strong> <span id="delete-expense-amount-display"></span></div>
                  <div><strong>Fecha:</strong> <span id="delete-expense-date-display"></span></div>
                </div>
                <input type="hidden" id="delete-expense-id-input" value="">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-danger" id="confirm-delete-expense">
                  <i class="bi bi-trash me-1"></i> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      deleteModal = document.getElementById('deleteExpenseModal');
      
      deleteModal.addEventListener('hidden.bs.modal', () => {
        // Asegurar que el loading se oculte si el modal se cierra
        if (this.ui && this.ui.hideLoading) {
          this.ui.hideLoading();
        }
      });
    }
    
    const idInput = deleteModal.querySelector('#delete-expense-id-input');
    if (idInput) {
      idInput.value = expense.id;
    }
    
    const idDisplay = deleteModal.querySelector('#delete-expense-id-display');
    if (idDisplay) {
      idDisplay.textContent = expense.id;
    }
    
    const descDisplay = deleteModal.querySelector('#delete-expense-description-display');
    if (descDisplay) {
      descDisplay.textContent = expense.description || 'Sin descripción';
    }
    
    const amountDisplay = deleteModal.querySelector('#delete-expense-amount-display');
    if (amountDisplay) {
      const formatCurrency = (amount) => `€${parseFloat(amount).toFixed(2)}`;
      amountDisplay.textContent = formatCurrency(expense.amount);
    }
    
    const dateDisplay = deleteModal.querySelector('#delete-expense-date-display');
    if (dateDisplay) {
      const formatDate = (date) => new Date(date).toLocaleDateString();
      dateDisplay.textContent = formatDate(expense.date);
    }
    
    let modalInstance = bootstrap.Modal.getInstance(deleteModal);
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(deleteModal);
    }
    
    const confirmButton = deleteModal.querySelector('#confirm-delete-expense');
    if (confirmButton) {
      const newConfirmButton = confirmButton.cloneNode(true);
      confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
      
      const self = this; // Preservar el contexto
      newConfirmButton.addEventListener('click', function() {
        const storedId = deleteModal.querySelector('#delete-expense-id-input').value;
        console.log("Ejecutando eliminación del egreso con ID:", storedId);
        
        self.deleteExpense(storedId);
      });
    }
    
    modalInstance.show();
    
  } catch (error) {
    console.error('Error al mostrar modal de confirmación:', error);
    
    if (confirm('¿Está seguro que desea eliminar este egreso? Esta acción no se puede deshacer.')) {
      this.deleteExpense(expenseId);
    }
  }
}

/**
 * Elimina un egreso con manejo mejorado del loading
 * @param {number} expenseId - ID del egreso a eliminar
 */
async deleteExpense(expenseId) {
  // Variable para controlar si ya se ocultó el loading
  let loadingHidden = false;
  
  const hideLoading = () => {
    if (!loadingHidden && this.ui && this.ui.hideLoading) {
      this.ui.hideLoading();
      loadingHidden = true;
    }
  };
  
  try {
    expenseId = expenseId ? String(expenseId) : null;
    console.log("Iniciando proceso de eliminación con ID:", expenseId);
    
    if (!expenseId) {
      const editIdField = document.getElementById('edit-expense-id');
      if (editIdField && editIdField.value) {
        expenseId = editIdField.value;
        console.log("ID obtenido del formulario de edición:", expenseId);
      }
    }
    
    // También intentar obtenerlo del modal de confirmación si no se encontró
    if (!expenseId) {
      const deleteIdInput = document.getElementById('delete-expense-id-input');
      if (deleteIdInput && deleteIdInput.value) {
        expenseId = deleteIdInput.value;
        console.log("ID obtenido del modal de confirmación:", expenseId);
      }
    }
    
    if (!expenseId) {
      console.error("No se pudo determinar el ID del egreso a eliminar");
      throw new Error('ID de egreso no especificado');
    }
    
    if (this.ui && this.ui.showLoading) {
      this.ui.showLoading('Eliminando egreso...');
    }
    
    console.log("Enviando solicitud de eliminación al API para el ID:", expenseId);
    
    const response = await this.api.deleteExpense(expenseId);
    console.log("Respuesta del API:", response);
    
    hideLoading();
    
    if (response && response.success) {
      const editModal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
      if (editModal) {
        editModal.hide();
      }
      
      const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteExpenseModal'));
      if (deleteModal) {
        deleteModal.hide();
      }
      
      // Recargar datos
      await this.refreshExpenses();
    } else {
      throw new Error(response?.message || 'Error al eliminar egreso');
    }
  } catch (error) {
    console.error('Error al eliminar egreso:', error);
    
    hideLoading();
    
    this.ui.showErrorMessage('Error al eliminar', error.message || 'No se pudo eliminar el egreso.');
  } finally {
    // Garantizar que el loading se oculte pase lo que pase
    hideLoading();
  }
}
  
  /**
   * Guarda una nueva categoría
   */
  async saveCategory() {
    try {
      // Recopilar datos del formulario
      const categoryData = {
        name: document.getElementById('category-name').value,
        description: document.getElementById('category-description').value
      };
      
      if (!categoryData.name) {
        this.ui.showErrorMessage('Error en formulario', 'El nombre de la categoría es obligatorio.');
        return;
      }
      
      const response = await this.api.createExpenseCategory(categoryData);
      
      if (response && response.success) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
        modal.hide();
        
        document.getElementById('add-category-form').reset();
        
        // Recargar categorías
        await this.loadCategories();
        
        this.ui.showSuccessMessage('Categoría creada correctamente');
      } else {
        throw new Error(response.message || 'Error al crear categoría');
      }
    } catch (error) {
      console.error('Error al crear categoría:', error);
      this.ui.showErrorMessage('Error al crear categoría', error.message || 'No se pudo crear la categoría.');
    }
  }
  
/**
 * Exporta los egresos filtrados actualmente con características especiales para deducibles
 * y ajuste forzado al ancho de página en PDF
 */
exportExpenses() {
  try {
    // Formato seleccionado
    const format = document.getElementById('export-format')?.value || exportManager.getPreferredFormat('excel');
    
    console.log(`Exportando egresos en formato: ${format}`);
    
    const dataToExport = this.filteredExpenses.map(expense => ({
      'ID': expense.id,
      'Fecha': formatDate(expense.date, 'YYYY-MM-DD'),
      'Categoría': expense.category_name || 'Sin categoría',
      'Importe': Number(expense.amount || 0),
      'IVA': Number(expense.tax_amount || 0),
      'Total': Number(expense.amount || 0) + Number(expense.tax_amount || 0),
      'Método de Pago': expense.payment_method || '',
      'Referencia': expense.reference || '',
      'Deducible': expense.is_tax_deductible ? 'Sí' : 'No',
      'Factura': expense.invoice_url || 'No disponible'
    }));
    
    let title = 'Reporte de Egresos';
    let dateRangeInfo = '';
    
    if (this.filterSettings?.startDate && this.filterSettings?.endDate) {
      const startDate = new Date(this.filterSettings.startDate).toLocaleDateString();
      const endDate = new Date(this.filterSettings.endDate).toLocaleDateString();
      dateRangeInfo = ` (${startDate} - ${endDate})`;
      title += dateRangeInfo;
    }
    
    // Nombre del archivo
    const fileName = `egresos_${new Date().toISOString().slice(0, 10)}`;
    
    // Columnas que deben tener totales
    const columnsWithTotals = ['Importe', 'IVA', 'Total'];
    
    const deductibleItems = dataToExport.filter(item => item.Deducible === 'Sí');
    const totalDeductibleIVA = deductibleItems.reduce((sum, item) => sum + item.IVA, 0);
    const totalDeductibleGasto = deductibleItems.reduce((sum, item) => sum + item.Importe, 0);
    const totalDeducible = totalDeductibleIVA + totalDeductibleGasto;
    
    // Opciones específicas para formato PDF
    const pdfOptions = {
      pdf: {
        // Tamaño de página - usar A4 para esta tabla que no tiene tantas columnas
        // Si hay más de 8 columnas, cambiar a A3
        pageSize: 'A4',
        orientation: 'portrait', // Cambiado a portrait (vertical)
        optimizeForWideTables: true,
        fontSizeReduction: 'medium',
        compressImages: true,
        // CLAVE: Forzar ajuste a página
        fitToPage: true,
        // Márgenes ajustados para portrait [izq, sup, der, inf]
        margins: [15, 15, 15, 20]
      }
    };
    
    // Optimizados para formato vertical (más reducidos que en landscape)
    const columnWidths = {
      'ID': 25,
      'Fecha': 40,
      'Categoría': 60,
      'Importe': 45,
      'IVA': 35,
      'Total': 45,
      'Método de Pago': 50,
      'Referencia': 50,
      'Deducible': 30,
      'Factura': 50
    };
    
    // Opciones de truncamiento para PDF (reducidas para formato vertical)
    const truncateOptions = format === 'pdf' ? {
      truncateText: {
        'Categoría': 15,
        'Método de Pago': 12,
        'Referencia': 12,
        'Factura': 15
      }
    } : {};
    
    exportManager.exportData(dataToExport, {
      fileName,
      format,
      sheetName: 'Egresos',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: title,
      columnsWithTotals: columnsWithTotals,
      
      columnWidths: columnWidths,
      
      // Formatos para moneda
      currencyFormats: {
        'Importe': '€#,##0.00',
        'IVA': '€#,##0.00',
        'Total': '€#,##0.00'
      },
      
      // Opciones de truncamiento de texto para PDF
      ...truncateOptions,
      
      ...(format === 'pdf' ? pdfOptions : {}),
      
      // Opciones para deducibles
      highlightDeductibles: true,
      deductibleColor: 'e6fffa', // Color verde claro para deducibles
      nonDeductibleColor: 'ffebee', // Color rojo claro para no deducibles
      deductibleSummary: {
        ivaDeducible: totalDeductibleIVA,
        gastoDeducible: totalDeductibleGasto,
        totalDeducible: totalDeducible
      }
    });
    
    this.ui.showSuccessMessage(`Egresos exportados correctamente en formato ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error al exportar egresos:', error);
    this.ui.showErrorMessage('Error al exportar', 'No se pudieron exportar los datos de egresos.');
  }
}
}