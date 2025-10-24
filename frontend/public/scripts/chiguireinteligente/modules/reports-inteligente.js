/**
 * Módulo de Informes Financieros
 * Genera informes personalizados de ingresos, impuestos y suscripciones
 * Permite programar informes periódicos y exportarlos en varios formatos
 */

import { formatCurrency, formatDate, formatPercentage, formatCountryName } from '../utils/formatter-inteligente.js';
import exportManager from '../utils/export-inteligente.js';

export class ReportsModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.transactions = [];
    this.subscriptions = [];
    this.users = [];
    this.expenses = [];
    this.dateRange = null;
    this.recentReports = [];
    this.scheduledReports = [];
    
    // Configuraciones de informes predefinidos
    this.reportTemplates = {
      revenue: {
        title: 'Informe de Ingresos',
        description: 'Análisis detallado de ingresos por producto, país y método de pago',
        sections: ['summary', 'products', 'countries', 'methods', 'trends']
      },
      taxes: {
        title: 'Informe de Impuestos',
        description: 'Desglose de IVA recaudado por país y período',
        sections: ['taxSummary', 'countryBreakdown', 'euVsNonEu', 'trends']
      },
      subscriptions: {
        title: 'Informe de Suscripciones',
        description: 'Análisis de suscripciones activas, nuevas y canceladas',
        sections: ['summary', 'products', 'churn', 'growth', 'retention']
      },
      users: {
        title: 'Informe de Usuarios',
        description: 'Análisis demográfico y comportamental de usuarios',
        sections: ['summary', 'demographics', 'activity', 'conversion']
      },
      products: {
        title: 'Informe de Productos',
        description: 'Rendimiento y popularidad de productos',
        sections: ['summary', 'performance', 'comparison', 'trends']
      },
      expenses: {
        title: 'Informe de Egresos',
        description: 'Análisis detallado de todos los egresos y gastos',
        sections: ['summary', 'categories', 'deductible', 'monthly', 'methods']
      },
      comprehensive: {
        title: 'Informe Integral',
        description: 'Análisis completo de todos los aspectos del negocio',
        sections: ['executiveSummary', 'financial', 'customers', 'products', 'taxes', 'forecast']
      }
    };
  }
  
  /**
   * Inicializa el módulo de informes
   */
  async init() {
    console.log('Inicializando módulo de informes');
    
    // Configurar event listeners
    this.setupEventListeners();

    await this.initAutomaticReports();
    
    // Suscribirse a cambios de fecha
    this.eventBus.on('dateRangeChanged', (range) => {
      this.dateRange = range;
    });
    
    // Cargar datos de informes recientes
    this.loadRecentReports();
    
    // Cargar datos de informes programados
    this.loadScheduledReports();
    
    return true;
  }
  
  /**
   * Configura event listeners para el módulo
   */
  setupEventListeners() {
    // Formulario de generación de informes
    const reportForm = document.getElementById('report-generator-form');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateReport();
      });
    }
    
    // Selector de tipo de informe
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect) {
      reportTypeSelect.addEventListener('change', () => {
        this.updateReportFormFields();
      });
    }
    
    // Selector de período
    const reportPeriodSelect = document.getElementById('report-period');
    if (reportPeriodSelect) {
      reportPeriodSelect.addEventListener('change', () => {
        // Mostrar/ocultar selector de fecha personalizada
        const customDateContainer = document.querySelector('.custom-date-range');
        if (customDateContainer) {
          customDateContainer.style.display = reportPeriodSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }
    
    // Botón para programar informe
    const saveScheduledReportBtn = document.getElementById('save-scheduled-report');
    if (saveScheduledReportBtn) {
      saveScheduledReportBtn.addEventListener('click', () => {
        this.saveScheduledReport();
      });
    }
    
    // Al cambiar de sección
    document.addEventListener('sectionChanged', (e) => {
      if (e.detail.section === 'reports') {
        this.onSectionActivated();
      }
    });
  }
  
  /**
   * Se ejecuta cuando se activa la sección de informes
   */
  onSectionActivated() {
    // Actualizar lista de informes recientes
    this.refreshRecentReports();
    
    // Cargar datos necesarios para informes si no están cargados
    this.loadRequiredData();
  }

  /**
 * Funciones para el módulo de Reports para gestionar informes integrales automáticos
 * Estas funciones deben añadirse a la clase ReportsModule
 */

/**
 * Inicializa las funciones para la gestión de informes integrales automáticos
 * Esta función debe ser llamada desde el método init() de ReportsModule
 */
async initAutomaticReports() {
  try {
    // Configurar event listeners para la sección de informes automáticos
    this.setupAutomaticReportsEventListeners();
    
    // Configurar daterangepicker para el informe manual
    if (document.getElementById('manual-report-date-range')) {
      // Verificar si jQuery y daterangepicker están disponibles
      if (typeof $ === 'function' && typeof $.fn.daterangepicker === 'function') {
        $('#manual-report-date-range').daterangepicker({
          locale: {
            format: 'DD/MM/YYYY',
            applyLabel: 'Aplicar',
            cancelLabel: 'Cancelar',
            fromLabel: 'Desde',
            toLabel: 'Hasta',
            customRangeLabel: 'Personalizado',
            daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
            monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          },
          ranges: {
            'Este Mes': [moment().startOf('month'), moment().endOf('month')],
            'Mes Anterior': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            'Este Trimestre': [moment().startOf('quarter'), moment().endOf('quarter')],
            'Trimestre Anterior': [moment().subtract(1, 'quarter').startOf('quarter'), moment().subtract(1, 'quarter').endOf('quarter')],
            'Este Año': [moment().startOf('year'), moment().endOf('year')],
            'Año Anterior': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')]
          },
          startDate: moment().startOf('month'),
          endDate: moment().endOf('month')
        });
      } else {
        console.warn('jQuery o daterangepicker no están disponibles para inicializar el selector de fechas');
      }
    }
    
    // Cargar configuración inicial de informes automáticos
    await this.loadAutomaticReportsConfig();
    
    // Cargar informes guardados
    await this.loadSavedReports();
    
    // Añadir un destinatario inicial en cada contenedor si están vacíos
    if (document.getElementById('recipients-container') && !document.querySelector('#recipients-container .recipient-group')) {
      this.addRecipientField();
    }
    
    if (document.getElementById('manual-recipients-container') && !document.querySelector('#manual-recipients-container .recipient-group')) {
      this.addManualRecipientField();
    }
    
    console.log('Inicializada configuración de informes integrales automáticos');
    return true;
  } catch (error) {
    console.error('Error al inicializar configuración de informes automáticos:', error);
    return false;
  }
}

/**
 * Configura los event listeners para la sección de informes automáticos
 */
setupAutomaticReportsEventListeners() {
  // Formulario de configuración de informes automáticos
  const automaticConfigForm = document.getElementById('automatic-reports-form');
  if (automaticConfigForm) {
    automaticConfigForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveAutomaticReportsConfig();
    });
  }

  // Selector de frecuencia para generar la expresión cron
  const frequencySelect = document.getElementById('auto-report-frequency');
  if (frequencySelect) {
    frequencySelect.addEventListener('change', () => {
      // Mostrar/ocultar el contenedor de cron personalizado
      const customCronContainer = document.querySelector('.custom-cron-container');
      if (customCronContainer) {
        customCronContainer.style.display = frequencySelect.value === 'custom' ? 'block' : 'none';
      }
      
      // Actualizar la descripción
      this.updateCronDescription();
    });
  }

  // Toggle de activación/desactivación
  const enabledSwitch = document.getElementById('auto-report-enabled');
  if (enabledSwitch) {
    enabledSwitch.addEventListener('change', () => {
      // Primero actualizar la UI
      this.toggleAutomaticReportsFields(enabledSwitch.checked);
      
      // AÑADIR ESTA PARTE: Guardar inmediatamente el cambio
      this.saveAutomaticReportsToggleState(enabledSwitch.checked);
    });
  }

  // Botón para añadir destinatario de correo
  const addRecipientBtn = document.getElementById('add-recipient-btn');
  if (addRecipientBtn) {
    addRecipientBtn.addEventListener('click', () => {
      this.addRecipientField();
    });
  }

  // Botón para añadir destinatario de correo en el formulario manual
  const addManualRecipientBtn = document.getElementById('add-manual-recipient-btn');
  if (addManualRecipientBtn) {
    addManualRecipientBtn.addEventListener('click', () => {
      this.addManualRecipientField();
    });
  }

  // Botón para generar informe manual
  const generateManualBtn = document.getElementById('generate-manual-report-btn');
  if (generateManualBtn) {
    generateManualBtn.addEventListener('click', () => {
      this.generateManualReport();
    });
  }

  // Botones de acción para informes guardados (delegación de eventos)
  const savedReportsTable = document.getElementById('saved-reports');
  if (savedReportsTable) {
    savedReportsTable.addEventListener('click', (e) => {
      // Verificar si se hizo clic en un botón de acción
      if (e.target.closest('.report-action')) {
        const button = e.target.closest('.report-action');
        const reportId = button.getAttribute('data-id');
        const action = button.getAttribute('data-action');
        
        if (action === 'download') {
          this.openReportInDrive(reportId);
        } else if (action === 'delete') {
          this.deleteReport(reportId);
        }
      }
    });
  }

  // Botón para refrescar la lista de informes
  const refreshReportsBtn = document.getElementById('refresh-reports-btn');
  if (refreshReportsBtn) {
    refreshReportsBtn.addEventListener('click', () => {
      this.loadSavedReports();
    });
  }
}

/**
 * Carga la configuración actual de informes automáticos desde el backend
 */
async loadAutomaticReportsConfig() {
  try {
    this.ui.showLoading('Cargando configuración de informes automáticos...');
    
    const response = await this.api.getAutomaticReportsConfig();
    
    if (response && response.success) {
      // Asegurarse de que la configuración tenga un valor de enabled
      const config = response.data || {};
      
      // Log para diagnóstico
      console.log('Configuración de informes automáticos cargada:', config);
      console.log('Estado de habilitación:', config.enabled);
      
      // Aplicar la configuración al formulario
      this.populateAutomaticReportsForm(config);
    } else {
      console.warn('No se pudo obtener la configuración de informes automáticos');
      
      // Si no hay respuesta exitosa, establecer todo como deshabilitado por defecto
      this.populateAutomaticReportsForm({ enabled: false });
    }
    
    this.ui.hideLoading();
  } catch (error) {
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo cargar la configuración de informes automáticos');
    console.error('Error cargando configuración de informes automáticos:', error);
    
    // En caso de error, también establecer como deshabilitado
    this.populateAutomaticReportsForm({ enabled: false });
  }
}

/**
 * Rellena el formulario con la configuración actual
 * @param {Object} config - Configuración actual
 */
populateAutomaticReportsForm(config = {}) {
  // Aplicar estado de activación
  const enabledSwitch = document.getElementById('auto-report-enabled');
  if (enabledSwitch) {
    // Asegurarse de que enabled sea tratado como un booleano
    const isEnabled = config.enabled === true;
    console.log('Estableciendo estado del switch:', isEnabled);
    
    // Establecer el estado del switch
    enabledSwitch.checked = isEnabled;
    
    // Actualizar campos según estado
    this.toggleAutomaticReportsFields(isEnabled);
  }
  
  // Establecer título con valor por defecto
  const titleInput = document.getElementById('auto-report-title');
  if (titleInput) {
    titleInput.value = config.title || 'Informe Integral Automático';
  }
  
  // Configurar frecuencia basada en la expresión cron
  const frequencySelect = document.getElementById('auto-report-frequency');
  if (frequencySelect && config.cronExpression) {
    // Intentar detectar la frecuencia basada en la expresión cron
    const frequency = this.detectFrequencyFromCron(config.cronExpression);
    if (frequency) {
      frequencySelect.value = frequency;
    }
  }
  
  // Limpiar destinatarios existentes
  const recipientsContainer = document.getElementById('recipients-container');
  if (recipientsContainer) {
    recipientsContainer.innerHTML = '';
  }
  
  // Añadir destinatarios
  if (Array.isArray(config.recipients) && config.recipients.length > 0) {
    config.recipients.forEach(email => {
      this.addRecipientField(email);
    });
  } else {
    // Añadir un campo vacío si no hay destinatarios
    this.addRecipientField();
  }
  
  // Actualizar descripción de la expresión cron
  this.updateCronDescription();
}

/**
 * Detecta la frecuencia basada en la expresión cron
 * @param {string} cronExpression - Expresión cron
 * @returns {string|null} Tipo de frecuencia detectada
 */
detectFrequencyFromCron(cronExpression) {
  // Expresiones cron comunes y sus correspondientes valores en el select
  const cronPatterns = {
    'daily': '0 8 * * *',         // Todos los días a las 8 AM
    'weekly': '0 8 * * 1',        // Todos los lunes a las 8 AM
    'monthly': '0 3 1 * *',       // El primer día del mes a las 3 AM
    'quarterly': '0 3 1 1,4,7,10 *' // Primer día de cada trimestre a las 3 AM
  };
  
  // Buscar coincidencia
  for (const [frequency, pattern] of Object.entries(cronPatterns)) {
    if (cronExpression === pattern) {
      return frequency;
    }
  }
  
  // Si no se encuentra coincidencia, devolver 'custom'
  return 'custom';
}

/**
 * Habilita/deshabilita campos del formulario según el estado
 * @param {boolean} enabled - Si está habilitado
 */
toggleAutomaticReportsFields(enabled) {
  const fieldsToToggle = [
    'auto-report-title',
    'auto-report-frequency',
    'recipients-container',
    'add-recipient-btn',
    'save-config-btn'
  ];
  
  fieldsToToggle.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      if (element.tagName === 'BUTTON') {
        element.disabled = !enabled;
      } else {
        const inputs = element.querySelectorAll('input, select');
        inputs.forEach(input => {
          input.disabled = !enabled;
        });
      }
    }
  });
}

/**
 * Guarda solo el estado del switch de habilitación de informes automáticos
 * @param {boolean} enabled - Si está habilitado
 */
async saveAutomaticReportsToggleState(enabled) {
  try {
    this.ui.showLoading('Guardando configuración...');
    
    // Obtener la configuración actual primero para mantener los otros valores
    let config = {
      enabled: enabled,
      cronExpression: '0 3 1 * *',  // Valor por defecto
      recipients: [],
      title: 'Informe Integral Automático'
    };
    
    try {
      // Intentar obtener la configuración actual
      const currentConfig = await this.api.getAutomaticReportsConfig();
      
      if (currentConfig && currentConfig.success && currentConfig.data) {
        // Mantener todos los valores actuales, solo cambiar enabled
        config = {
          ...currentConfig.data,
          enabled: enabled
        };
      }
    } catch (configError) {
      console.warn('No se pudo obtener la configuración actual, usando valores por defecto:', configError);
    }
    
    console.log('Enviando configuración:', config);
    
    // Enviar la configuración al backend
    const response = await this.api.configureAutomaticReports(config);
    
    this.ui.hideLoading();
    
    if (response && response.success) {
      if (enabled) {
        this.ui.showSuccessMessage('Informes automáticos habilitados correctamente');
      } else {
        this.ui.showSuccessMessage('Informes automáticos deshabilitados correctamente');
      }
    } else {
      this.ui.showErrorMessage('Error', response?.message || 'No se pudo guardar la configuración');
    }
  } catch (error) {
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración');
    console.error('Error guardando configuración de habilitación:', error);
  }
}

/**
 * Añade un campo para destinatario de correo
 * @param {string} email - Email para prellenar (opcional)
 */
addRecipientField(email = '') {
  const container = document.getElementById('recipients-container');
  if (!container) return;
  
  const recipientIndex = container.querySelectorAll('.recipient-group').length;
  
  const div = document.createElement('div');
  div.className = 'recipient-group mb-2 d-flex';
  div.innerHTML = `
    <input 
      type="email" 
      class="form-control recipient-email" 
      name="recipients[${recipientIndex}]" 
      value="${email}" 
      placeholder="correo@ejemplo.com"
      ${document.getElementById('auto-report-enabled')?.checked ? '' : 'disabled'}
    >
    <button type="button" class="btn btn-outline-danger ms-2 remove-recipient-btn">
      <i class="bi bi-trash"></i>
    </button>
  `;
  
  // Añadir event listener para el botón de eliminar
  div.querySelector('.remove-recipient-btn').addEventListener('click', () => {
    div.remove();
  });
  
  container.appendChild(div);
}

/**
 * Actualiza la descripción visible de la expresión cron
 */
updateCronDescription() {
  const frequencySelect = document.getElementById('auto-report-frequency');
  const descriptionEl = document.getElementById('cron-description');
  
  if (!frequencySelect || !descriptionEl) return;
  
  const frequency = frequencySelect.value;
  let description = '';
  let cronExpression = '';
  
  switch (frequency) {
    case 'daily':
      description = 'El informe se generará automáticamente todos los días a las 8:00 AM.';
      cronExpression = '0 8 * * *';
      break;
    case 'weekly':
      description = 'El informe se generará automáticamente todos los lunes a las 8:00 AM.';
      cronExpression = '0 8 * * 1';
      break;
    case 'monthly':
      description = 'El informe se generará automáticamente el primer día de cada mes a las 3:00 AM.';
      cronExpression = '0 3 1 * *';
      break;
    case 'quarterly':
      description = 'El informe se generará automáticamente el primer día de cada trimestre (enero, abril, julio, octubre) a las 3:00 AM.';
      cronExpression = '0 3 1 1,4,7,10 *';
      break;
    case 'custom':
      const customCron = document.getElementById('custom-cron-expression')?.value || '';
      description = 'Expresión cron personalizada: ' + customCron;
      cronExpression = customCron;
      break;
  }
  
  // Actualizar descripción visible
  descriptionEl.textContent = description;
  
  // Actualizar campo oculto con la expresión cron
  const cronExpressionInput = document.getElementById('cron-expression-input');
  if (cronExpressionInput) {
    cronExpressionInput.value = cronExpression;
  }
}

/**
 * Guarda la configuración de informes automáticos
 */
async saveAutomaticReportsConfig() {
  try {
    this.ui.showLoading('Guardando configuración...');
    
    // Obtener estado de habilitado
    const enabled = document.getElementById('auto-report-enabled')?.checked || false;
    
    // Si está deshabilitado, solo enviar eso
    if (!enabled) {
      const response = await this.api.configureAutomaticReports({ enabled: false });
      
      this.ui.hideLoading();
      
      if (response && response.success) {
        this.ui.showSuccessMessage('Informes automáticos deshabilitados correctamente');
      } else {
        this.ui.showErrorMessage('Error', 'No se pudo deshabilitar los informes automáticos');
      }
      
      return;
    }
    
    // Obtener título
    const title = document.getElementById('auto-report-title')?.value || 'Informe Integral Automático';
    
    // Obtener expresión cron
    const cronExpression = document.getElementById('cron-expression-input')?.value || '0 3 1 * *';
    
    // Recopilar destinatarios
    const recipientInputs = document.querySelectorAll('.recipient-email');
    const recipients = Array.from(recipientInputs)
      .map(input => input.value.trim())
      .filter(email => email !== '');
    
    // Validar que al menos haya un destinatario
    if (recipients.length === 0) {
      this.ui.hideLoading();
      this.ui.showErrorMessage('Error', 'Debe proporcionar al menos un destinatario de correo');
      return;
    }
    
    // Enviar configuración al backend
    const config = {
      enabled,
      cronExpression,
      recipients,
      title
    };
    
    console.log('Enviando configuración:', config);
    
    const response = await this.api.configureAutomaticReports(config);
    
    this.ui.hideLoading();
    
    if (response && response.success) {
      this.ui.showSuccessMessage('Configuración guardada correctamente');
    } else {
      this.ui.showErrorMessage('Error', response?.message || 'No se pudo guardar la configuración');
    }
  } catch (error) {
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración');
    console.error('Error guardando configuración:', error);
  }
}

/**
 * Añade un campo para destinatario de correo en el formulario manual
 * @param {string} email - Email para prellenar (opcional)
 */
addManualRecipientField(email = '') {
  const container = document.getElementById('manual-recipients-container');
  if (!container) return;
  
  const recipientIndex = container.querySelectorAll('.recipient-group').length;
  
  const div = document.createElement('div');
  div.className = 'recipient-group mb-2 d-flex';
  div.innerHTML = `
    <input 
      type="email" 
      class="form-control manual-recipient-email" 
      name="manual_recipients[${recipientIndex}]" 
      value="${email}" 
      placeholder="correo@ejemplo.com"
    >
    <button type="button" class="btn btn-outline-danger ms-2 remove-recipient-btn">
      <i class="bi bi-trash"></i>
    </button>
  `;
  
  // Añadir event listener para el botón de eliminar
  div.querySelector('.remove-recipient-btn').addEventListener('click', () => {
    div.remove();
  });
  
  container.appendChild(div);
}

/**
 * Carga los informes guardados desde el backend
 */
async loadSavedReports() {
  try {
    this.ui.showLoading('Cargando informes guardados...');
    
    const response = await this.api.getSavedIntegralReports();
    
    if (response && response.success) {
      this.updateSavedReportsTable(response.data);
    } else {
      console.warn('No se pudieron obtener los informes guardados');
    }
    
    this.ui.hideLoading();
  } catch (error) {
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudieron cargar los informes guardados');
    console.error('Error cargando informes guardados:', error);
  }
}

/**
 * Actualiza la tabla de informes guardados
 * @param {Array} reports - Lista de informes
 */
updateSavedReportsTable(reports) {
  const table = document.getElementById('saved-reports');
  if (!table) return;
  
  // Limpiar tabla
  table.innerHTML = '';
  
  // Si no hay informes, mostrar mensaje
  if (!reports || reports.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">No hay informes guardados</td>
      </tr>
    `;
    return;
  }
  
  // Renderizar cada informe
  reports.forEach(report => {
    // Formatear fecha de creación
    const createdDate = new Date(report.created_at);
    const formattedDate = createdDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Crear fila
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${report.id}</td>
      <td>${report.name}</td>
      <td>${formattedDate}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary report-action" data-action="download" data-id="${report.id}" title="Abrir en Drive">
            <i class="bi bi-download"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger report-action" data-action="delete" data-id="${report.id}" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    table.appendChild(row);
  });
}

/**
 * Abre un informe en Google Drive
 * @param {string} reportId - ID del informe
 */
async openReportInDrive(reportId) {
  try {
    this.ui.showLoading('Obteniendo enlace del informe...');
    
    // Obtener los detalles del informe para conseguir la URL de Drive
    const response = await this.api.get(`/admin/finance/reports/${reportId}`);
    
    this.ui.hideLoading();
    
    if (response && response.success && response.data && response.data.drive_url) {
      // Abrir la URL de Drive en una nueva pestaña
      window.open(response.data.drive_url, '_blank');
    } else {
      this.ui.showErrorMessage('Error', 'No se pudo obtener el enlace del informe');
    }
  } catch (error) {
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo obtener el enlace del informe');
    console.error('Error obteniendo enlace del informe:', error);
  }
}


/**
 * Elimina un informe
 * @param {string} reportId - ID del informe
 */
async deleteReport(reportId) {
  try {
    console.log(`Iniciando proceso de eliminación para informe ID: ${reportId}`);
    
    // Buscar la fila correspondiente para obtener el nombre del informe
    const reportRow = document.querySelector(`#saved-reports .report-action[data-action="delete"][data-id="${reportId}"]`).closest('tr');
    if (!reportRow) {
      console.error(`No se encontró la fila para el informe ID: ${reportId}`);
      this.ui.showErrorMessage('Error', 'No se pudo identificar el informe a eliminar');
      return;
    }
    
    const reportName = reportRow.querySelector('td:nth-child(2)').textContent;
    console.log(`Informe a eliminar: "${reportName}" (ID: ${reportId})`);
    
    // Comprobar si existe el modal
    const modalElement = document.getElementById('deleteReportModal');
    if (!modalElement) {
      console.warn('Modal de eliminación no encontrado, usando confirm() nativo');
      if (confirm(`¿Estás seguro de que deseas eliminar el informe "${reportName}"?`)) {
        await this.confirmDeleteReport(reportId);
      }
      return;
    }
    
    // Si existe el modal, establecer datos en él
    document.getElementById('delete-report-name').textContent = reportName;
    document.getElementById('delete-report-id').textContent = `ID: ${reportId}`;
    
    // Configurar el botón de confirmación
    const confirmBtn = document.getElementById('confirm-delete-report');
    if (!confirmBtn) {
      console.error('Botón de confirmación no encontrado en el modal');
      return;
    }
    
    // Eliminar listeners anteriores
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    
    // Agregar nuevo listener
    newBtn.addEventListener('click', () => {
      console.log(`Botón de confirmación clickeado para informe ID: ${reportId}`);
      this.confirmDeleteReport(reportId);
    });
    
    // Mostrar el modal
    try {
      const bootstrapModal = new bootstrap.Modal(modalElement);
      console.log('Mostrando modal de confirmación');
      bootstrapModal.show();
    } catch (modalError) {
      console.error('Error al mostrar el modal:', modalError);
      // Fallback a confirm nativo
      if (confirm(`¿Estás seguro de que deseas eliminar el informe "${reportName}"?`)) {
        await this.confirmDeleteReport(reportId);
      }
    }
  } catch (error) {
    console.error('Error al preparar eliminación de informe:', error);
    this.ui.showErrorMessage('Error', 'Hubo un problema al preparar la eliminación del informe');
  }
}

/**
 * Muestra el modal de confirmación para eliminar un informe
 * @param {string|number} reportId - ID del informe
 * @param {string} reportName - Nombre del informe a eliminar
 */
showDeleteReportModal(reportId, reportName) {
  // Establecer datos en el modal
  document.getElementById('delete-report-name').textContent = reportName;
  document.getElementById('delete-report-id').textContent = `ID: ${reportId}`;
  
  // Configurar el botón de confirmación
  const confirmBtn = document.getElementById('confirm-delete-report');
  
  // Remover listeners anteriores para evitar duplicados
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  
  // Agregar nuevo listener
  newBtn.addEventListener('click', () => {
    this.confirmDeleteReport(reportId);
  });
  
  // Mostrar el modal
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteReportModal'));
  deleteModal.show();
}

/**
 * Realiza la eliminación del informe después de la confirmación
 * @param {string|number} reportId - ID del informe
 */
async confirmDeleteReport(reportId) {
  try {
    console.log(`Confirmada eliminación para informe ID: ${reportId}`);
    
    // Cerrar modal si existe
    try {
      const modalElement = document.getElementById('deleteReportModal');
      if (modalElement) {
        const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
        if (bootstrapModal) {
          bootstrapModal.hide();
        }
      }
    } catch (modalError) {
      console.warn('Error al cerrar modal:', modalError);
      // Continuamos con la eliminación aunque no se pueda cerrar el modal
    }
    
    // Mostrar indicador de carga
    this.ui.showLoading('Eliminando informe...');
    
    // Verificar que la API tenga el método deleteReport
    if (typeof this.api.deleteReport !== 'function') {
      console.error('Método api.deleteReport no está definido');
      this.ui.hideLoading();
      this.ui.showErrorMessage('Error', 'Funcionalidad no implementada en la API');
      return;
    }
    
    // Llamar a la API para eliminar
    console.log('Llamando a API para eliminar informe');
    const response = await this.api.deleteReport(reportId);
    console.log('Respuesta de API:', response);
    
    // Ocultar indicador de carga
    this.ui.hideLoading();
    
    if (response && response.success) {
      this.ui.showSuccessMessage('Informe eliminado correctamente');
      // Recargar la lista de informes
      this.loadSavedReports();
    } else {
      this.ui.showErrorMessage('Error', response?.message || 'No se pudo eliminar el informe');
    }
  } catch (error) {
    console.error(`Error eliminando informe ${reportId}:`, error);
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo eliminar el informe');
  }
}

/**
 * Genera un informe manual
 */
async generateManualReport() {
  try {
    // Obtener rango de fechas
    const dateRangeInput = document.getElementById('manual-report-date-range');
    if (!dateRangeInput || !dateRangeInput.value) {
      this.ui.showErrorMessage('Error', 'Debe seleccionar un rango de fechas');
      return;
    }
    
    // Parsear rango de fechas (formato: DD/MM/YYYY - DD/MM/YYYY)
    const [startStr, endStr] = dateRangeInput.value.split(' - ');
    if (!startStr || !endStr) {
      this.ui.showErrorMessage('Error', 'Formato de rango de fechas inválido');
      return;
    }
    
    // Convertir a objetos Date
    const startParts = startStr.split('/');
    const endParts = endStr.split('/');
    
    if (startParts.length !== 3 || endParts.length !== 3) {
      this.ui.showErrorMessage('Error', 'Formato de fecha inválido');
      return;
    }
    
    // Crear objetos Date (formato: YYYY-MM-DD)
    const startDate = new Date(startParts[2], startParts[1] - 1, startParts[0]);
    const endDate = new Date(endParts[2], endParts[1] - 1, endParts[0]);
    endDate.setHours(23, 59, 59, 999); // Fin del día
    
    // Validar fechas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      this.ui.showErrorMessage('Error', 'Fechas inválidas');
      return;
    }
    
    // Obtener título personalizado
    const titleInput = document.getElementById('manual-report-title');
    const title = titleInput?.value || `Informe Integral - ${startStr} a ${endStr}`;
    
    // Recopilar destinatarios (opcional)
    const recipientInputs = document.querySelectorAll('.manual-recipient-email');
    const recipients = Array.from(recipientInputs)
      .map(input => input.value.trim())
      .filter(email => email !== '');
    
    // Configurar parámetros
    const params = {
      date_from: startDate.toISOString(),
      date_to: endDate.toISOString(),
      title,
      recipients
    };
    
    this.ui.showLoading('Generando informe integral...');
    
    // Enviar solicitud
    const response = await this.api.generateIntegralReport(params);
    
    this.ui.hideLoading();
    
    if (response && response.success) {
      this.ui.showSuccessMessage('Informe generado correctamente');
      
      // Comprobar si la respuesta contiene la URL de Drive
      if (response.data && response.data.drive_url) {
        // Crear una modal personalizada con mejor estilo
        this.showDriveConfirmModal(response.data.drive_url, title);
      } else {
        console.warn('No se encontró URL de Google Drive en la respuesta:', response);
      }
      
      // Recargar la lista de informes
      this.loadSavedReports();
    } else {
      this.ui.showErrorMessage('Error', response?.message || 'No se pudo generar el informe');
    }
  } catch (error) {
    this.ui.hideLoading();
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe');
    console.error('Error generando informe manual:', error);
  }
}

/**
 * Muestra una modal personalizada para confirmar abrir en Google Drive
 * @param {string} driveUrl - URL del archivo en Google Drive
 * @param {string} reportTitle - Título del informe
 */
showDriveConfirmModal(driveUrl, reportTitle) {
  // Crear o reutilizar el contenedor de la modal
  let modalContainer = document.getElementById('drive-confirm-modal');
  
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'drive-confirm-modal';
    modalContainer.className = 'drive-modal-container';
    document.body.appendChild(modalContainer);
  }
  
  // Contenido HTML de la modal con mejor diseño
  modalContainer.innerHTML = `
    <div class="drive-modal">
      <div class="drive-modal-header">
        <i class="bi bi-check-circle-fill text-success me-2"></i>
        <h5>¡Informe generado correctamente!</h5>
      </div>
      <div class="drive-modal-body">
        <p>El informe <strong>${reportTitle}</strong> ha sido generado y guardado en Google Drive.</p>
        <p>Desde allí podrá compartirlo, descargarlo o imprimirlo.</p>
        <div class="drive-preview">
          <i class="bi bi-file-earmark-pdf drive-icon"></i>
          <span class="drive-filename">${reportTitle}.pdf</span>
        </div>
      </div>
      <div class="drive-modal-footer">
        <button class="btn btn-secondary" id="drive-cancel-btn">Cerrar</button>
        <button class="btn btn-primary" id="drive-open-btn">
          <i class="bi bi-google me-1"></i>
          Abrir en Google Drive
        </button>
      </div>
    </div>
  `;
  
  // Mostrar la modal con animación
  setTimeout(() => {
    modalContainer.classList.add('active');
  }, 10);
  
  // Configurar botones
  const cancelBtn = document.getElementById('drive-cancel-btn');
  const openBtn = document.getElementById('drive-open-btn');
  
  // Cerrar modal
  cancelBtn.addEventListener('click', () => {
    modalContainer.classList.remove('active');
    setTimeout(() => {
      modalContainer.style.display = 'none';
    }, 300);
  });
  
  // Abrir en Google Drive
  openBtn.addEventListener('click', () => {
    modalContainer.classList.remove('active');
    
    // Abrir URL en una nueva pestaña
    if (driveUrl) {
      window.open(driveUrl, '_blank');
    }
    
    setTimeout(() => {
      modalContainer.style.display = 'none';
    }, 300);
  });
}
  
/**
 * Carga datos necesarios para generar informes
 */
async loadRequiredData() {
  try {
    // Mostrar indicador de carga
    this.ui.showLoading('Cargando datos para informes...');
    
    // Cargar datos en paralelo
    const dataPromises = [
      // Solo cargar si no tenemos datos
      this.transactions.length === 0 ? this.api.getTransactions() : Promise.resolve(this.transactions),
      this.subscriptions.length === 0 ? this.api.getSubscriptions() : Promise.resolve(this.subscriptions),
      this.users.length === 0 ? this.api.getUsers() : Promise.resolve(this.users),
      // Utilizar getExpenses() de manera consistente con expenses-inteligente.js
      this.expenses.length === 0 ? this.api.getExpenses() : Promise.resolve(this.expenses)
    ];
    
    // Esperar a que se completen todas las peticiones
    const [transactionsData, subscriptionsData, usersData, expensesData] = await Promise.all(dataPromises);
    
    // Procesar datos de transacciones
    if (Array.isArray(transactionsData)) {
      this.transactions = transactionsData;
    } else if (transactionsData && transactionsData.data) {
      this.transactions = transactionsData.data;
    } else if (transactionsData && transactionsData.success && transactionsData.data) {
      this.transactions = transactionsData.data;
    }
    
    // Procesar datos de suscripciones
    if (Array.isArray(subscriptionsData)) {
      this.subscriptions = subscriptionsData;
    } else if (subscriptionsData && subscriptionsData.data) {
      this.subscriptions = subscriptionsData.data;
    } else if (subscriptionsData && subscriptionsData.success && subscriptionsData.data) {
      this.subscriptions = subscriptionsData.data;
    }
    
    // Procesar datos de usuarios
    if (Array.isArray(usersData)) {
      this.users = usersData;
    } else if (usersData && usersData.data) {
      this.users = usersData.data;
    } else if (usersData && usersData.success && usersData.data) {
      this.users = usersData.data;
    }
    
    // Procesar datos de egresos - siguiendo el modelo de expenses-inteligente.js
    if (expensesData && expensesData.success && expensesData.data) {
      this.expenses = expensesData.data;
    } else if (Array.isArray(expensesData)) {
      this.expenses = expensesData;
    } else if (expensesData && typeof expensesData === 'object') {
      if (Array.isArray(expensesData.expenses)) {
        this.expenses = expensesData.expenses;
      } else {
        console.warn('Estructura de respuesta de egresos no reconocida:', expensesData);
        this.expenses = [];
      }
    }
    
    // Ocultar indicador de carga
    this.ui.hideLoading();
    
    console.log('Datos cargados exitosamente:', {
      transactions: this.transactions.length,
      subscriptions: this.subscriptions.length,
      users: this.users.length,
      expenses: this.expenses.length
    });
    
    return true;
  } catch (error) {
    // Ocultar indicador de carga en caso de error
    this.ui.hideLoading();
    
    console.error('Error al cargar datos para informes:', error);
    this.ui.showErrorMessage('Error', 'No se pudieron cargar los datos necesarios para generar informes.');
    return false;
  }
}
  
  /**
   * Actualiza campos del formulario según el tipo de informe seleccionado
   */
  updateReportFormFields() {
    const reportType = document.getElementById('report-type').value;
    const reportTemplate = this.reportTemplates[reportType];
    
    if (!reportTemplate) return;
    
    // Se podría personalizar el formulario según el tipo de informe
    // Por ejemplo, mostrar/ocultar opciones específicas
    
    console.log(`Tipo de informe seleccionado: ${reportType}`);
  }
  
  /**
   * Carga informes recientes desde localStorage
   */
  loadRecentReports() {
    try {
      const savedReports = localStorage.getItem('recentReports');
      if (savedReports) {
        this.recentReports = JSON.parse(savedReports);
      } else {
        // Datos de ejemplo si no hay informes guardados
        this.recentReports = [
          {
            id: 'report_1',
            title: 'Informe de Ingresos - Abril 2025',
            type: 'revenue',
            period: 'Abril 2025',
            createdAt: '2025-05-01T10:30:00Z',
            format: 'excel',
            url: '#'
          },
          {
            id: 'report_2',
            title: 'Informe Trimestral de Impuestos - Q1 2025',
            type: 'taxes',
            period: 'Q1 2025',
            createdAt: '2025-04-15T14:20:00Z',
            format: 'excel',
            url: '#'
          },
          {
            id: 'report_3',
            title: 'Análisis de Suscripciones - Marzo 2025',
            type: 'subscriptions',
            period: 'Marzo 2025',
            createdAt: '2025-04-01T09:15:00Z',
            format: 'pdf',
            url: '#'
          }
        ];
        
        // Guardar en localStorage
        localStorage.setItem('recentReports', JSON.stringify(this.recentReports));
      }
      
      // Actualizar UI
      this.updateRecentReportsUI();
      
      return true;
    } catch (error) {
      console.error('Error al cargar informes recientes:', error);
      return false;
    }
  }
  
  /**
   * Carga informes programados desde localStorage
   */
  loadScheduledReports() {
    try {
      const savedScheduledReports = localStorage.getItem('scheduledReports');
      if (savedScheduledReports) {
        this.scheduledReports = JSON.parse(savedScheduledReports);
      } else {
        // Datos de ejemplo si no hay informes programados
        this.scheduledReports = [
          {
            id: 'scheduled_1',
            name: 'Informe Mensual de Ingresos',
            type: 'revenue',
            frequency: 'monthly',
            format: 'excel',
            lastRun: '2025-04-01T00:00:00Z',
            nextRun: '2025-05-01T00:00:00Z',
            recipients: ['admin@acadelia.com'],
            active: true
          },
          {
            id: 'scheduled_2',
            name: 'Informe Trimestral de Impuestos',
            type: 'taxes',
            frequency: 'quarterly',
            format: 'excel',
            lastRun: '2025-04-01T00:00:00Z',
            nextRun: '2025-07-01T00:00:00Z',
            recipients: ['admin@acadelia.com', 'contabilidad@acadelia.com'],
            active: true
          },
          {
            id: 'scheduled_3',
            name: 'Informe Anual de Suscripciones',
            type: 'subscriptions',
            frequency: 'yearly',
            format: 'pdf',
            lastRun: '2025-01-01T00:00:00Z',
            nextRun: '2026-01-01T00:00:00Z',
            recipients: ['admin@acadelia.com'],
            active: true
          }
        ];
        
        // Guardar en localStorage
        localStorage.setItem('scheduledReports', JSON.stringify(this.scheduledReports));
      }
      
      return true;
    } catch (error) {
      console.error('Error al cargar informes programados:', error);
      return false;
    }
  }
  
  /**
   * Actualiza la UI de informes recientes
   */
  updateRecentReportsUI() {
    const recentReportsTable = document.getElementById('recent-reports');
    if (!recentReportsTable) return;
    
    // Limpiar tabla
    recentReportsTable.innerHTML = '';
    
    // Si no hay informes recientes
    if (this.recentReports.length === 0) {
      recentReportsTable.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No hay informes recientes</td>
        </tr>
      `;
      return;
    }
    
    // Renderizar informes recientes
    this.recentReports.forEach(report => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${report.title}</td>
        <td>${this.getReportTypeName(report.type)}</td>
        <td>${report.period}</td>
        <td>${formatDate(report.createdAt, 'short')}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary report-action" data-action="download" data-id="${report.id}">
              <i class="bi bi-download"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger report-action" data-action="delete" data-id="${report.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      recentReportsTable.appendChild(row);
    });
    
    // Configurar botones de acción
    this.setupReportActionButtons();
  }
  
  /**
   * Configura los botones de acción para informes
   */
  setupReportActionButtons() {
    const actionButtons = document.querySelectorAll('.report-action');
    
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = button.getAttribute('data-action');
        const reportId = button.getAttribute('data-id');
        
        switch (action) {
          case 'download':
            this.downloadReport(reportId);
            break;
          case 'delete':
            this.deleteReport(reportId);
            break;
        }
      });
    });
  }
  
  /**
   * Obtiene el nombre legible de un tipo de informe
   * @param {string} type - Tipo de informe
   * @returns {string} Nombre legible
   */
  getReportTypeName(type) {
    const typeNames = {
      'revenue': 'Ingresos',
      'taxes': 'Impuestos',
      'subscriptions': 'Suscripciones',
      'users': 'Usuarios',
      'products': 'Productos',
      'expenses': 'Egresos',
      'comprehensive': 'Integral'
    };
    
    return typeNames[type] || type;
  }
  
  /**
   * Refresca la lista de informes recientes
   */
  refreshRecentReports() {
    this.loadRecentReports();
  }
  
  /**
   * Descarga un informe específico
   * @param {string} reportId - ID del informe
   */
  downloadReport(reportId) {
    // Encontrar informe
    const report = this.recentReports.find(r => r.id === reportId);
    
    if (!report) {
      this.ui.showErrorMessage('Error', 'Informe no encontrado');
      return;
    }
    
    // En una implementación real, aquí habría una llamada a la API
    // para descargar el informe guardado
    
    // Por ahora, simular descarga regenerando el informe
    this.generateReportById(reportId);
  }
  
  /**
   * Genera un informe específico por ID
   * @param {string} reportId - ID del informe
   */
  generateReportById(reportId) {
    // Encontrar informe
    const report = this.recentReports.find(r => r.id === reportId);
    
    if (!report) {
      this.ui.showErrorMessage('Error', 'Informe no encontrado');
      return;
    }
    
    // Configurar opciones según el informe guardado
    const options = {
      type: report.type,
      period: report.period,
      format: report.format,
      title: report.title
    };
    
    // Generar informe
    this.generateReportWithOptions(options);
  }
  
/**
 * Verifica si las capacidades de exportación a PDF están disponibles
 * Útil para diagnosticar problemas con la generación de PDF
 * @returns {Object} Estado de disponibilidad de funciones de PDF
 */
checkPDFCapabilities() {
  const capabilities = {
    pdfMakeAvailable: typeof pdfMake !== 'undefined',
    exportManagerAvailable: typeof exportManager !== 'undefined',
    exportDataMethodAvailable: typeof exportManager?.exportData === 'function',
    exportTaxReportToPDFAvailable: typeof exportManager?.exportTaxReportToPDF === 'function',
    excelJSAvailable: typeof window.ExcelJS !== 'undefined'
  };
  
  console.log('Capacidades de exportación a PDF:', capabilities);
  
  // Verificar si hay problemas potenciales
  if (!capabilities.pdfMakeAvailable) {
    console.warn('ADVERTENCIA: La biblioteca pdfMake no está disponible. La exportación a PDF puede fallar.');
  }
  
  if (!capabilities.exportManagerAvailable) {
    console.error('ERROR: El exportManager no está disponible. La exportación no funcionará.');
  } else if (!capabilities.exportDataMethodAvailable) {
    console.error('ERROR: El método exportData del exportManager no está disponible.');
  }
  
  // Sugerir soluciones si hay problemas
  if (!capabilities.pdfMakeAvailable && capabilities.exportManagerAvailable) {
    console.info('SUGERENCIA: Intente cargar pdfMake utilizando el método app.loadPDFMake() antes de exportar.');
  }
  
  return capabilities;
}

/**
 * Genera un informe y verifica capacidades de PDF si es necesario
 */
generateReport() {
  // Obtener datos del formulario
  const reportType = document.getElementById('report-type').value;
  const reportPeriod = document.getElementById('report-period').value;
  const reportFormat = document.getElementById('report-format').value;
  
  // Validar datos
  if (!reportType || !reportPeriod || !reportFormat) {
    this.ui.showErrorMessage('Error', 'Por favor, completa todos los campos obligatorios');
    return;
  }
  
  // Si es formato PDF, verificar capacidades
  if (reportFormat.toLowerCase() === 'pdf') {
    const pdfCapabilities = this.checkPDFCapabilities();
    
    // Si faltan capacidades esenciales, mostrar mensaje y usar Excel como alternativa
    if (!pdfCapabilities.pdfMakeAvailable || !pdfCapabilities.exportDataMethodAvailable) {
      this.ui.showInfoMessage('La exportación a PDF requiere componentes adicionales que no están disponibles. Usando Excel como alternativa.');
      // Cambiar formato a Excel
      const formatSelect = document.getElementById('report-format');
      if (formatSelect) {
        formatSelect.value = 'excel';
      }
    }
  }
  
  // Determinar período
  let periodStart, periodEnd, periodLabel;
  
  if (reportPeriod === 'custom') {
    // Si es período personalizado, obtener rango de fechas
    const reportDateRange = document.getElementById('report-date-range').value;
    if (!reportDateRange) {
      this.ui.showErrorMessage('Error', 'Por favor, selecciona un rango de fechas');
      return;
    }
    
    // Parsear rango
    const [start, end] = reportDateRange.split(' - ');
    periodStart = this.parseDate(start);
    periodEnd = this.parseDate(end);
    periodLabel = `${start} - ${end}`;
  } else {
    // Usar período predefinido
    const periodDates = this.getPredefinedPeriodDates(reportPeriod);
    periodStart = periodDates.start;
    periodEnd = periodDates.end;
    periodLabel = periodDates.label;
  }
  
  // Configurar opciones
  const options = {
    type: reportType,
    period: periodLabel,
    format: document.getElementById('report-format').value, // Asegurar que se use el valor actual del selector
    dateRange: {
      start: periodStart,
      end: periodEnd
    }
  };
  
  console.log('Opciones de generación de informe:', options);
  
  // Generar informe
  this.generateReportWithOptions(options);
}
  
  /**
   * Parsea una fecha en formato DD/MM/YYYY
   * @param {string} dateStr - Fecha en formato DD/MM/YYYY
   * @returns {Date} Objeto Date
   */
  parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
  }
  
/**
 * Obtiene fechas para períodos predefinidos con manejo mejorado
 * @param {string} period - Período predefinido
 * @returns {Object} Fechas de inicio y fin
 */
getPredefinedPeriodDates(period) {
  const today = new Date();
  let start, end, label;
  
  // Para diagnóstico
  console.log('Generando fechas para período:', period);
  
  try {
    switch (period) {
      case 'month':
        // Este mes
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        label = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        break;
      
      case 'quarter':
        // Este trimestre
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        label = `Q${quarter + 1} ${today.getFullYear()}`;
        break;
      
      case 'year':
        // Este año
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        label = today.getFullYear().toString();
        break;
      
      case 'last-month':
        // Mes anterior
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        label = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        break;
      
      case 'last-quarter':
        // Trimestre anterior
        const prevQuarter = Math.floor(today.getMonth() / 3) - 1;
        const quarterYear = prevQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const actualQuarter = prevQuarter < 0 ? 4 + prevQuarter : prevQuarter;
        start = new Date(quarterYear, actualQuarter * 3, 1);
        end = new Date(quarterYear, (actualQuarter + 1) * 3, 0);
        label = `Q${actualQuarter + 1} ${quarterYear}`;
        break;
      
      case 'last-year':
        // Año anterior
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        label = (today.getFullYear() - 1).toString();
        break;
      
      case 'custom':
        // El rango personalizado se procesa por separado
        return { start: null, end: null, label: 'Rango personalizado' };
        
      default:
        // Por defecto, últimos 30 días
        end = new Date(today);
        start = new Date(today);
        start.setDate(end.getDate() - 30);
        label = 'Últimos 30 días';
    }
    
    // Asegurar que las fechas estén estandarizadas para comparación
    // Inicio del día para fecha inicial
    start.setHours(0, 0, 0, 0);
    
    // Fin del día para fecha final
    end.setHours(23, 59, 59, 999);
    
    console.log('Fechas generadas:', {
      start: start.toISOString(),
      end: end.toISOString(),
      label,
      period
    });
    
    return { start, end, label };
  } catch (error) {
    console.error('Error al generar fechas para período predefinido:', error);
    
    // Proporcionar un período por defecto seguro en caso de error
    const fallbackStart = new Date(today);
    fallbackStart.setDate(fallbackStart.getDate() - 30);
    fallbackStart.setHours(0, 0, 0, 0);
    
    const fallbackEnd = new Date(today);
    fallbackEnd.setHours(23, 59, 59, 999);
    
    return { 
      start: fallbackStart, 
      end: fallbackEnd, 
      label: 'Últimos 30 días (predeterminado)'
    };
  }
}
  
/**
 * Genera un informe con opciones específicas
 * @param {Object} options - Opciones del informe
 */
generateReportWithOptions(options) {
  // Mensaje de carga
  this.ui.showSuccessMessage('Generando informe...');
  
  // Simular carga
  setTimeout(() => {
    try {
      // Generar informe según tipo
      switch (options.type) {
        case 'revenue':
          this.generateRevenueReport(options);
          break;
        case 'taxes':
          this.generateTaxReport(options);
          break;
        case 'subscriptions':
          this.generateSubscriptionsReport(options);
          break;
        case 'users':
          this.generateUsersReport(options);
          break;
        case 'products':
          this.generateProductsReport(options);
          break;
        case 'expenses':
          this.generateExpensesReport(options);
          break;
        case 'comprehensive':
          this.generateComprehensiveReport(options);
          break;
        default:
          this.ui.showErrorMessage('Error', 'Tipo de informe no soportado');
          return;
      }
      
      // Añadir a informes recientes
      const reportId = 'report_' + Date.now();
      const reportTitle = this.getReportTitle(options);
      
      const newReport = {
        id: reportId,
        title: reportTitle,
        type: options.type,
        period: options.period,
        createdAt: new Date().toISOString(),
        format: options.format,
        url: '#'
      };
      
      // Añadir al inicio de la lista
      this.recentReports.unshift(newReport);
      
      // Limitar a 10 informes recientes
      if (this.recentReports.length > 10) {
        this.recentReports = this.recentReports.slice(0, 10);
      }
      
      // Guardar en localStorage
      localStorage.setItem('recentReports', JSON.stringify(this.recentReports));
      
      // Actualizar UI
      this.updateRecentReportsUI();

    } catch (error) {
      console.error('Error al generar informe:', error);
      this.ui.showErrorMessage('Error', 'No se pudo generar el informe');
    }
  }, 1000);
}

/**
 * Genera un informe de egresos con información completa
 * @param {Object} options - Opciones del informe
 */
async generateExpensesReport(options) {
  try {
    // Mostrar indicador de carga
    this.ui.showLoading('Generando informe de egresos...');

    // Obtener todos los egresos
    let expenses = [];
    
    try {
      const response = await this.api.getExpenses();
      // Asegurarnos de acceder correctamente a los datos de la respuesta
      if (response && response.success && response.data) {
        expenses = response.data;
      } else if (response && Array.isArray(response)) {
        expenses = response;
      } else if (response && typeof response === 'object') {
        // Si la respuesta es un objeto pero no tiene la estructura esperada,
        // intenta determinar dónde están los datos
        if (Array.isArray(response.expenses)) {
          expenses = response.expenses;
        } else {
          console.warn('Estructura de respuesta no reconocida:', response);
          expenses = [];
        }
      }
      
      console.log('Egresos obtenidos:', expenses.length);
      // Examinar la estructura de un egreso para diagnóstico
      if (expenses.length > 0) {
        console.log('Muestra de estructura de egreso:', JSON.stringify(expenses[0]));
      }
    } catch (error) {
      console.error('Error al obtener egresos:', error);
      this.ui.showErrorMessage('Error', 'No se pudieron cargar los datos de egresos.');
      this.ui.hideLoading();
      return;
    }
    
    // Si no hay egresos, mostrar un mensaje y salir
    if (!expenses || expenses.length === 0) {
      this.ui.hideLoading();
      this.ui.showErrorMessage('No hay datos de egresos disponibles');
      return;
    }
    
    // VERSIÓN MEJORADA: Filtrar egresos por período si es necesario
    let filteredExpenses = expenses;
    
    if (options.dateRange) {
      console.log('Filtrando por rango de fechas:', options.dateRange);
      
      // Asegurar que las fechas sean objetos Date y válidas
      let startDate = null;
      let endDate = null;
      
      if (options.dateRange.start) {
        startDate = options.dateRange.start instanceof Date 
          ? new Date(options.dateRange.start) 
          : new Date(options.dateRange.start);
        startDate.setHours(0, 0, 0, 0); // Inicio del día
      }
      
      if (options.dateRange.end) {
        endDate = options.dateRange.end instanceof Date 
          ? new Date(options.dateRange.end) 
          : new Date(options.dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Fin del día
      }
      
      console.log('Rango de fechas normalizado:', {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        startValid: startDate ? !isNaN(startDate.getTime()) : false,
        endValid: endDate ? !isNaN(endDate.getTime()) : false
      });
      
      // Verificar que las fechas sean válidas antes de filtrar
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        filteredExpenses = expenses.filter(expense => {
          if (!expense.date) {
            console.log('Egreso sin fecha:', expense);
            return false; // Excluir egresos sin fecha
          }
          
          // Crear una nueva fecha a partir del string para evitar problemas de zona horaria
          const expenseDate = new Date(expense.date);
          // Normalizar a medianoche para comparar solo fechas
          expenseDate.setHours(12, 0, 0, 0);
          
          // Verificar si la fecha es válida
          if (isNaN(expenseDate.getTime())) {
            console.log('Fecha de egreso inválida:', expense.date, expense);
            return false;
          }
          
          // Verificar si está en el rango
          const isInRange = expenseDate >= startDate && expenseDate <= endDate;
          
          // Para diagnóstico, mostrar algunos ejemplos de fechas
          if (!isInRange && filteredExpenses.length < 3) {
            console.log('Egreso fuera de rango:', {
              expenseDate: expenseDate.toISOString(),
              expenseDateString: expense.date,
              compareStart: expenseDate >= startDate,
              compareEnd: expenseDate <= endDate
            });
          }
          
          return isInRange;
        });
      } else {
        console.warn('Rango de fechas inválido, se usarán todos los egresos');
      }
      
      console.log(`Filtrado completado: ${filteredExpenses.length} de ${expenses.length} egresos incluidos`);
    }
    
    // Si no hay egresos filtrados, mostrar mensaje personalizado con más información
    if (filteredExpenses.length === 0) {
      this.ui.hideLoading();
      
      if (options.dateRange) {
        const start = options.dateRange.start ? new Date(options.dateRange.start).toLocaleDateString() : 'no especificada';
        const end = options.dateRange.end ? new Date(options.dateRange.end).toLocaleDateString() : 'no especificada';
        
        this.ui.showErrorMessage(
          'No hay egresos para el período seleccionado', 
          `No se encontraron egresos entre ${start} y ${end}. Por favor seleccione un período diferente.`
        );
      } else {
        this.ui.showErrorMessage('No hay egresos que cumplan con los criterios seleccionados');
      }
      return;
    }
    
    // Obtener categorías para tener información completa
    let categories = [];
    try {
      const categoriesResponse = await this.api.getExpenseCategories();
      if (categoriesResponse && categoriesResponse.data) {
        categories = categoriesResponse.data;
      } else if (categoriesResponse && Array.isArray(categoriesResponse)) {
        categories = categoriesResponse;
      }
      
      console.log('Categorías obtenidas:', categories.length);
    } catch (error) {
      console.warn('Error al obtener categorías:', error);
    }
    
    // Enriquecer datos de egresos con información completa
    const enrichedExpenses = this.enrichExpensesWithCategories(filteredExpenses, categories);
    
    // Calcular resumen de egresos
    const expensesSummary = this.calculateExpensesSummary(enrichedExpenses);
    
    // Crear estructura del informe
    const reportData = {
      title: options.title || this.getReportTitle(options) || 'Informe de Egresos',
      period: options.period || this.formatDateRange(options.dateRange),
      generatedAt: new Date().toISOString(),
      summary: expensesSummary,
      expenses: enrichedExpenses,
      dateRange: options.dateRange
    };
    
    // Exportar según formato seleccionado
    this.ui.hideLoading();
    await this.exportReport(reportData, options);
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage(`Informe de egresos generado correctamente en formato ${options.format.toUpperCase()}`);
  } catch (error) {
    this.ui.hideLoading();
    console.error('Error al generar informe de egresos:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe de egresos: ' + error.message);
  }
}

/**
 * Enriquece los datos de egresos con información de categorías
 * @param {Array} expenses - Lista de egresos
 * @param {Array} categories - Lista de categorías
 * @returns {Array} Egresos enriquecidos
 */
enrichExpensesWithCategories(expenses, categories) {
  return expenses.map(expense => {
    // Si el egreso ya tiene nombre de categoría, mantenerlo
    if (expense.category_name) {
      return { ...expense };
    }
    
    // Buscar la categoría por ID
    const category = categories.find(cat => cat.id == expense.category_id);
    
    // Añadir nombre de categoría si se encuentra
    if (category) {
      return {
        ...expense,
        category_name: category.name
      };
    }
    
    // Si no se encuentra, dejar un placeholder
    return {
      ...expense,
      category_name: 'Sin categoría'
    };
  });
}


/**
 * Calcula resumen de estadísticas de egresos
 * @param {Array} expenses - Lista de egresos con información completa
 * @returns {Object} Resumen de estadísticas
 */
calculateExpensesSummary(expenses) {
  // Calcular totales
  const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  const totalTax = expenses.reduce((sum, expense) => sum + parseFloat(expense.tax_amount || 0), 0);
  const totalWithTax = total + totalTax;
  
  // Filtrar egresos deducibles
  const deductibleExpenses = expenses.filter(expense => expense.is_tax_deductible);
  const deductibleTotal = deductibleExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  const deductibleTax = deductibleExpenses.reduce((sum, expense) => sum + parseFloat(expense.tax_amount || 0), 0);
  
  // Agrupar por categoría
  const categoryTotals = {};
  expenses.forEach(expense => {
    const categoryId = expense.category_id;
    const categoryName = expense.category_name || 'Sin categoría';
    
    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = {
        id: categoryId,
        name: categoryName,
        count: 0,
        total: 0,
        tax: 0,
        deductible: 0,
        deductibleTax: 0
      };
    }
    
    categoryTotals[categoryId].count += 1;
    categoryTotals[categoryId].total += parseFloat(expense.amount || 0);
    categoryTotals[categoryId].tax += parseFloat(expense.tax_amount || 0);
    
    if (expense.is_tax_deductible) {
      categoryTotals[categoryId].deductible += parseFloat(expense.amount || 0);
      categoryTotals[categoryId].deductibleTax += parseFloat(expense.tax_amount || 0);
    }
  });
  
  // Agrupar por método de pago
  const paymentMethodTotals = {};
  expenses.forEach(expense => {
    const method = expense.payment_method || 'No especificado';
    
    if (!paymentMethodTotals[method]) {
      paymentMethodTotals[method] = {
        method: method,
        count: 0,
        total: 0
      };
    }
    
    paymentMethodTotals[method].count += 1;
    paymentMethodTotals[method].total += parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0);
  });
  
  // Distribución mensual
  const monthlyDistribution = {};
  expenses.forEach(expense => {
    if (!expense.date) return;
    
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(date);
    
    if (!monthlyDistribution[monthKey]) {
      monthlyDistribution[monthKey] = {
        key: monthKey,
        label: monthLabel,
        count: 0,
        total: 0,
        tax: 0,
        deductible: 0,
        deductibleTax: 0
      };
    }
    
    monthlyDistribution[monthKey].count += 1;
    monthlyDistribution[monthKey].total += parseFloat(expense.amount || 0);
    monthlyDistribution[monthKey].tax += parseFloat(expense.tax_amount || 0);
    
    if (expense.is_tax_deductible) {
      monthlyDistribution[monthKey].deductible += parseFloat(expense.amount || 0);
      monthlyDistribution[monthKey].deductibleTax += parseFloat(expense.tax_amount || 0);
    }
  });
  
  // Convertir a arrays ordenados
  const categoriesArray = Object.values(categoryTotals)
    .sort((a, b) => b.total - a.total)
    .map(cat => ({
      ...cat,
      percentage: total > 0 ? (cat.total / total) * 100 : 0
    }));
  
  const paymentMethodsArray = Object.values(paymentMethodTotals)
    .sort((a, b) => b.total - a.total)
    .map(method => ({
      ...method,
      percentage: totalWithTax > 0 ? (method.total / totalWithTax) * 100 : 0
    }));
  
  const monthsArray = Object.values(monthlyDistribution)
    .sort((a, b) => a.key.localeCompare(b.key));
  
  // Calcular el promedio mensual si hay datos
  const monthCount = monthsArray.length;
  const monthlyAverage = monthCount > 0 ? total / monthCount : 0;
  
  // Calcular porcentaje deducible
  const deductiblePercentage = total > 0 ? (deductibleTotal / total) * 100 : 0;
  
  return {
    totalExpenses: expenses.length,
    totalAmount: total,
    totalTax: totalTax,
    totalWithTax: totalWithTax,
    
    deductible: {
      count: deductibleExpenses.length,
      amount: deductibleTotal,
      tax: deductibleTax,
      percentage: deductiblePercentage
    },
    
    avgExpenseAmount: expenses.length > 0 ? total / expenses.length : 0,
    monthlyAverage: monthlyAverage,
    
    categoryDistribution: categoriesArray,
    paymentMethodDistribution: paymentMethodsArray,
    monthlyDistribution: monthsArray,
    
    hasInvoices: expenses.some(expense => expense.invoice_url)
  };
}

/**
 * Exporta un informe de egresos con formato mejorado usando exportManager
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportExpensesReportWithManager(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación en formato optimizado
    const dataToExport = this.prepareExpensesDataForExport(reportData);
    
    // Columnas que deben tener totales
    const columnsWithTotals = ['Importe', 'IVA', 'Total'];
    
    // Configurar formatos específicos para columnas
    const currencyFormats = {
      'Importe': '€#,##0.00',
      'IVA': '€#,##0.00',
      'Total': '€#,##0.00'
    };
    
    // Calcular totales para deducibles - Usar Importe (no Total) para gastos deducibles
    const deductibleItems = dataToExport.filter(item => item.Deducible === 'Sí');
    const totalDeductibleIVA = deductibleItems.reduce((sum, item) => sum + item.IVA, 0);
    const totalDeductibleGasto = deductibleItems.reduce((sum, item) => sum + item.Importe, 0);
    
    // NUEVO: Calcular el total deducible (IVA + Gasto)
    const totalDeducible = totalDeductibleIVA + totalDeductibleGasto;
    
    // MEJORA: Preparar datos de análisis para el informe
    // Preparar datos de top 5 categorías
    const topCategories = {};
    reportData.summary.categoryDistribution.slice(0, 5).forEach(category => {
      topCategories[category.name] = {
        count: category.count,
        total: category.total,
        percentage: category.percentage,
        deductible: category.deductible
      };
    });
    
    // Preparar datos de métodos de pago
    const paymentMethods = {};
    reportData.summary.paymentMethodDistribution.forEach(method => {
      paymentMethods[method.method] = {
        count: method.count,
        amount: method.total,
        percentage: method.percentage
      };
    });
    
    // Configurar opciones avanzadas para exportManager
    const exportOptions = {
      fileName,
      format: options.format || 'excel',
      sheetName: 'Egresos',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeTotals: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      columnsWithTotals,
      currencyFormats,
      
      // Añadir información de periodo
      period: reportData.period,
      
      // Opciones para deducibles
      highlightDeductibles: true,
      deductibleColor: 'e6fffa', // Color verde claro para deducibles
      nonDeductibleColor: 'ffebee', // Color rojo claro para no deducibles
      deductibleSummary: {
        ivaDeducible: totalDeductibleIVA,
        gastoDeducible: totalDeductibleGasto,
        totalDeducible: totalDeducible // NUEVO: Total deducible (IVA + Gasto)
      },
      
      // MEJORA: Incluir análisis de egresos
      expenseAnalysis: {
        totalAmount: reportData.summary.totalAmount,
        totalTax: reportData.summary.totalTax,
        deductiblePercentage: reportData.summary.deductible.percentage,
        avgMonthly: reportData.summary.monthlyAverage,
        categories: topCategories,
        paymentMethods: paymentMethods,
        monthlyTrend: reportData.summary.monthlyDistribution.slice(-6) // Últimos 6 meses
      }
    };
    
    // Exportar usando exportManager
    exportManager.exportData(dataToExport, exportOptions);
  } catch (error) {
    console.error('Error al exportar informe de egresos:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe. Revise la consola para más detalles.');
  }
}

/**
 * Prepara los datos de egresos para exportación
 * @param {Object} reportData - Datos del informe
 * @returns {Array} Datos formateados para exportación
 */
prepareExpensesDataForExport(reportData) {
  if (!reportData.expenses || reportData.expenses.length === 0) {
    return [];
  }
  
  // Mapear egresos a formato optimizado para Excel
  return reportData.expenses.map(expense => {
    const total = parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0);
    
    return {
      'ID': expense.id,
      'Fecha': formatDate(expense.date, 'YYYY-MM-DD'),
      'Categoría': expense.category_name || 'Sin categoría',
      'Descripción': expense.description || '',
      'Importe': Number(expense.amount || 0),
      'IVA': Number(expense.tax_amount || 0),
      'Total': total,
      'Método de Pago': expense.payment_method || 'No especificado',
      'Referencia': expense.reference || '',
      'Deducible': expense.is_tax_deductible ? 'Sí' : 'No',
      'Factura': expense.invoice_url ? 'Disponible' : 'No disponible',
      'URL Factura': expense.invoice_url || ''
    };
  });
}
  
  /**
   * Obtiene el título para un informe
   * @param {Object} options - Opciones del informe
   * @returns {string} Título del informe
   */
  getReportTitle(options) {
    const reportTemplate = this.reportTemplates[options.type];
    if (!reportTemplate) return 'Informe personalizado';
    
    return `${reportTemplate.title} - ${options.period}`;
  }
  
/**
 * Genera un informe de ingresos
 * @param {Object} options - Opciones del informe
 */
generateRevenueReport(options) {
  // Filtrar transacciones por período
  let filteredTransactions = this.transactions;
  
  if (options.dateRange) {
    filteredTransactions = this.transactions.filter(transaction => {
      const txDate = new Date(transaction.updated_at || transaction.created_at);
      return txDate >= options.dateRange.start && txDate <= options.dateRange.end;
    });
  }
  
  // Calcular resumen de ingresos
  const revenueSummary = this.calculateRevenueSummary(filteredTransactions);
  
  // Crear estructura del informe
  const reportData = {
    title: this.getReportTitle(options),
    period: options.period,
    generatedAt: new Date().toISOString(),
    summary: revenueSummary,
    // Mapear los campos exactos de la base de datos sin transformaciones
    transactions: filteredTransactions.map(t => ({
      id: t.transaction_id,
      transaction_id: t.transaction_id,
      user: t.user_email || `Usuario ${t.id_user}`,
      id_user: t.id_user,
      // CORRECCIÓN: Mejorada la lógica para obtener el nombre del producto
      product: t.product_name || t.carrera_nombre || `Producto ${t.product_id}`,
      product_name: t.product_name || t.carrera_nombre || `Producto ${t.product_id}`,
      product_id: t.product_id,
      carrera_nombre: t.carrera_nombre,
      amount: t.amount,
      currency: t.currency_code,
      currency_code: t.currency_code,
      tax: t.tax_amount,
      tax_amount: t.tax_amount,
      fee_amount: t.fee_amount,
      earnings: t.earnings,
      exchange_rate: t.exchange_rate,
      amount_eur: t.amount_eur,
      tax_amount_eur: t.tax_amount_eur,
      tax_eur: t.tax_amount_eur, // Alias para compatibilidad
      fee_amount_eur: t.fee_amount_eur,
      earnings_eur: t.earnings_eur,
      date: t.updated_at,
      updated_at: t.updated_at,
      country: t.country_code,
      country_code: t.country_code,
      paymentMethod: t.payment_method,
      payment_method: t.payment_method,
      event_type: t.event_type,
      interval: t.interval,
      invoice_url: t.invoice_url,
      last4: t.last4
    }))
  };
  
  // Exportar según formato seleccionado
  this.exportReport(reportData, options);
}
  
/**
 * Calcula resumen de ingresos - CORREGIDO para nombres de productos
 * @param {Array} transactions - Transacciones a analizar
 * @returns {Object} Resumen de ingresos
 */
calculateRevenueSummary(transactions) {
  // Total de ingresos (usar earnings_eur directamente)
  const totalRevenue = transactions.reduce((sum, t) => {
    // Priorizar earnings_eur
    if (t.earnings_eur !== undefined && t.earnings_eur !== null) {
      return sum + this.normalizeAmount(t.earnings_eur);
    }
    // Fallback a amount_eur
    else if (t.amount_eur !== undefined && t.amount_eur !== null) {
      return sum + this.normalizeAmount(t.amount_eur);
    }
    // Calcular manualmente usando earnings con tasa de cambio
    else if (t.earnings && t.currency_code !== 'EUR' && t.exchange_rate) {
      return sum + (this.normalizeAmount(t.earnings) * t.exchange_rate);
    }
    // Último fallback
    else {
      return sum + this.normalizeAmount(t.earnings || t.amount || 0);
    }
  }, 0);
  
  // Total de ganancias netas (usar earnings_eur directamente)
  const totalEarnings = transactions.reduce((sum, t) => {
    if (t.earnings_eur !== undefined && t.earnings_eur !== null) {
      return sum + this.normalizeAmount(t.earnings_eur);
    } else if (t.earnings && t.currency_code !== 'EUR' && t.exchange_rate) {
      return sum + (this.normalizeAmount(t.earnings) * t.exchange_rate);
    } else {
      return sum + this.normalizeAmount(t.earnings || 0);
    }
  }, 0);
  
  // Agrupar por producto
  const productRevenue = {};
  transactions.forEach(t => {
    const productId = t.product_id;
    
    // CORRECCIÓN: Mejorada la lógica para obtener el nombre del producto
    // Verificar todos los posibles campos que pueden contener el nombre
    const productName = 
      (t.product_name && t.product_name.trim()) || 
      (t.carrera_nombre && t.carrera_nombre.trim()) || 
      (t.product && t.product.trim()) || 
      `Producto ${productId}`;
    
    // CORRECCIÓN: Usar earnings_eur
    let amount = 0;
    if (t.earnings_eur !== undefined && t.earnings_eur !== null) {
      amount = this.normalizeAmount(t.earnings_eur);
    } else if (t.amount_eur !== undefined && t.amount_eur !== null) {
      amount = this.normalizeAmount(t.amount_eur);
    } else if (t.earnings && t.currency_code !== 'EUR' && t.exchange_rate) {
      amount = this.normalizeAmount(t.earnings) * t.exchange_rate;
    } else {
      amount = this.normalizeAmount(t.earnings || t.amount || 0);
    }
    
    if (!productRevenue[productId]) {
      productRevenue[productId] = {
        id: productId,
        name: productName,
        total: 0,
        count: 0
      };
    }
    
    productRevenue[productId].total += amount;
    productRevenue[productId].count++;
  });
  
  // Agrupar por país
  const countryRevenue = {};
  transactions.forEach(t => {
    const countryCode = t.country_code || 'UNKNOWN';
    
    // CORRECCIÓN: Usar earnings_eur
    let amount = 0;
    if (t.earnings_eur !== undefined && t.earnings_eur !== null) {
      amount = this.normalizeAmount(t.earnings_eur);
    } else if (t.amount_eur !== undefined && t.amount_eur !== null) {
      amount = this.normalizeAmount(t.amount_eur);
    } else if (t.earnings && t.currency_code !== 'EUR' && t.exchange_rate) {
      amount = this.normalizeAmount(t.earnings) * t.exchange_rate;
    } else {
      amount = this.normalizeAmount(t.earnings || t.amount || 0);
    }
    
    if (!countryRevenue[countryCode]) {
      countryRevenue[countryCode] = {
        code: countryCode,
        total: 0,
        count: 0
      };
    }
    
    countryRevenue[countryCode].total += amount;
    countryRevenue[countryCode].count++;
  });
  
  // Agrupar por método de pago
  const methodRevenue = {};
  transactions.forEach(t => {
    const method = t.payment_method || 'UNKNOWN';
    
    // CORRECCIÓN: Usar earnings_eur
    let amount = 0;
    if (t.earnings_eur !== undefined && t.earnings_eur !== null) {
      amount = this.normalizeAmount(t.earnings_eur);
    } else if (t.amount_eur !== undefined && t.amount_eur !== null) {
      amount = this.normalizeAmount(t.amount_eur);
    } else if (t.earnings && t.currency_code !== 'EUR' && t.exchange_rate) {
      amount = this.normalizeAmount(t.earnings) * t.exchange_rate;
    } else {
      amount = this.normalizeAmount(t.earnings || t.amount || 0);
    }
    
    if (!methodRevenue[method]) {
      methodRevenue[method] = {
        method,
        total: 0,
        count: 0
      };
    }
    
    methodRevenue[method].total += amount;
    methodRevenue[method].count++;
  });
  
  return {
    totalRevenue,
    totalEarnings,
    profitMargin: totalRevenue > 0 ? (totalEarnings / totalRevenue * 100) : 0,
    transactionCount: transactions.length,
    averageAmount: totalRevenue / (transactions.length || 1),
    products: Object.values(productRevenue).sort((a, b) => b.total - a.total),
    countries: Object.values(countryRevenue).sort((a, b) => b.total - a.total),
    methods: Object.values(methodRevenue).sort((a, b) => b.total - a.total)
  };
}
  
/**
 * Genera un informe de impuestos
 * @param {Object} options - Opciones del informe
 */
generateTaxReport(options) {
  try {
    // Filtrar transacciones por período
    let filteredTransactions = this.transactions;
    
    if (options.dateRange) {
      filteredTransactions = this.transactions.filter(transaction => {
        const txDate = new Date(transaction.updated_at || transaction.created_at);
        return txDate >= options.dateRange.start && txDate <= options.dateRange.end;
      });
    }
    
    // Verificar si hay datos para procesar
    if (!filteredTransactions || filteredTransactions.length === 0) {
      this.ui.showErrorMessage('Error', 'No hay datos de transacciones para el período seleccionado');
      return;
    }
    
    // Calcular resumen de impuestos
    const taxSummary = this.calculateTaxSummary(filteredTransactions);
    
    // Crear estructura del informe
    const reportData = {
      title: this.getReportTitle(options),
      period: options.period,
      generatedAt: new Date().toISOString(),
      summary: taxSummary,
      // Añadir el desglose de impuestos por país para exportar
      taxBreakdown: this.calculateTaxBreakdown(filteredTransactions)
    };
    
    // Exportar según formato seleccionado
    this.exportReport(reportData, options);
  } catch (error) {
    console.error('Error al generar informe de impuestos:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe de impuestos: ' + error.message);
  }
}
  
/**
 * Calcula resumen de impuestos usando directamente los campos de la base de datos
 * @param {Array} transactions - Transacciones a analizar
 * @returns {Object} Resumen de impuestos
 */
calculateTaxSummary(transactions) {
  // Usar los campos directamente disponibles en la base de datos
  
  // Inicializar totales
  let totalAmount = 0;
  let totalTax = 0;
  let spainTax = 0;
  let otherTax = 0;
  
  // Procesar transacciones usando amount_eur y tax_amount_eur
  transactions.forEach(transaction => {
    // Usar directamente amount_eur y tax_amount_eur de la base de datos
    const amount = this.normalizeAmount(transaction.amount_eur || 0);
    const taxAmount = this.normalizeAmount(transaction.tax_amount_eur || 0);
    
    totalAmount += amount;
    totalTax += taxAmount;
    
    // Clasificar impuesto por región
    if (transaction.country_code === 'ES') {
      spainTax += taxAmount;
    } else {
      otherTax += taxAmount;
    }
  });

  // Calcular porcentajes
  const spainTaxPercentage = totalTax > 0 ? (spainTax / totalTax) * 100 : 0;
  const otherTaxPercentage = totalTax > 0 ? (otherTax / totalTax) * 100 : 0;
  
  return {
    totalAmount,
    totalTax,
    spainTax,
    otherTax,
    taxableAmount: totalAmount - totalTax,
    taxRatio: totalTax / totalAmount || 0,
    spainTaxPercentage,
    otherTaxPercentage
  };
}

/**
 * Calcula el desglose de impuestos por país
 * @param {Array} transactions - Transacciones a analizar
 * @returns {Array} Desglose por país
 */
calculateTaxBreakdown(transactions) {
  // Objeto para agrupar por país
  const countryData = {};
  
  // Países que queremos destacar (primero en la lista)
  const importantCountries = ['ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'US', 'DE', 'FR', 'GB', 'IT'];
  
  // Procesar transacciones
  transactions.forEach(transaction => {
    const countryCode = transaction.country_code || 'UNKNOWN';
    const amount = this.normalizeAmount(transaction.amount_eur || 0);
    const taxAmount = this.normalizeAmount(transaction.tax_amount_eur || 0);
    const currency = transaction.currency_code || 'EUR';
    const exchangeRate = transaction.exchange_rate || 1;
    const taxRate = transaction.tax_rate || 0;
    
    // Si es una moneda que no es EUR, obtener los valores originales
    const amountOriginal = currency !== 'EUR' ? 
      this.normalizeAmount(transaction.amount || 0) : amount;
    const taxAmountOriginal = currency !== 'EUR' ? 
      this.normalizeAmount(transaction.tax_amount || 0) : taxAmount;
    
    // Inicializar país si no existe
    if (!countryData[countryCode]) {
      countryData[countryCode] = {
        code: countryCode,
        name: formatCountryName(countryCode),
        total: 0, // tax_amount_eur acumulado
        taxBase: 0, // amount_eur - tax_amount_eur acumulado
        count: 0, // contador de transacciones
        currency_code: currency,
        exchange_rate: exchangeRate,
        rate: taxRate,
        total_original: 0, // tax_amount original acumulado
        taxBase_original: 0 // amount original - tax_amount original acumulado
      };
    }
    
    // Si tenemos diferentes monedas para el mismo país, mantener la más común
    // o marcar como múltiple
    if (countryData[countryCode].currency_code !== currency && 
        countryData[countryCode].count > 0) {
      if (countryData[countryCode].currency_code !== 'MULTIPLE') {
        countryData[countryCode].currency_code = 'MULTIPLE';
      }
    }
    
    // Actualizar acumulados
    countryData[countryCode].total += taxAmount;
    countryData[countryCode].taxBase += (amount - taxAmount);
    countryData[countryCode].total_original += taxAmountOriginal;
    countryData[countryCode].taxBase_original += (amountOriginal - taxAmountOriginal);
    countryData[countryCode].count++;
    
    // Actualizar tasa promedio si es más precisa que la actual
    if (taxRate > countryData[countryCode].rate) {
      countryData[countryCode].rate = taxRate;
    }
  });
  
  // Convertir a array y ordenar
  let taxBreakdown = Object.values(countryData);
  
  // Ordenar: primero países importantes, luego resto por total
  taxBreakdown.sort((a, b) => {
    const aImportant = importantCountries.includes(a.code);
    const bImportant = importantCountries.includes(b.code);
    
    if (aImportant && !bImportant) return -1;
    if (!aImportant && bImportant) return 1;
    if (aImportant && bImportant) {
      return importantCountries.indexOf(a.code) - importantCountries.indexOf(b.code);
    }
    return b.total - a.total;
  });
  
  return taxBreakdown;
}

/**
 * Exporta un informe de impuestos usando exportManager
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportTaxReportWithManager(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación
    const dataToExport = this.prepareTaxDataForExport(reportData);
    
    // Configurar columnas con totales
    const columnsWithTotals = [
      'Base Imponible (EUR)', 
      'IVA (EUR)',
      'Total Facturado (EUR)'
    ];
    
    // Configurar formatos de moneda para columnas
    const currencyFormats = {
      'Base Imponible (EUR)': '#,##0.00 [$€]',
      'IVA (EUR)': '#,##0.00 [$€]',
      'Total Facturado (EUR)': '#,##0.00 [$€]',
      'Base Imponible Original': '#,##0.00',
      'IVA Original': '#,##0.00'
    };
    
    // Calcular resumen para las tasas de impuestos por región
    const statusSummary = {};
    if (reportData.taxBreakdown && reportData.taxBreakdown.length > 0) {
      // Contar países por región
      const regionCounts = {
        'España': 0,
        'Latinoamérica': 0,
        'Europa': 0,
        'Norteamérica': 0,
        'Otros': 0
      };
      
      // Asignar países a regiones
      reportData.taxBreakdown.forEach(country => {
        if (country.code === 'ES') {
          regionCounts['España']++;
        } else if (['MX', 'CO', 'AR', 'CL', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI'].includes(country.code)) {
          regionCounts['Latinoamérica']++;
        } else if (['FR', 'DE', 'IT', 'GB', 'PT', 'NL', 'BE', 'AT', 'GR', 'IE', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'RO', 'BG'].includes(country.code)) {
          regionCounts['Europa']++;
        } else if (['US', 'CA'].includes(country.code)) {
          regionCounts['Norteamérica']++;
        } else {
          regionCounts['Otros']++;
        }
      });
      
      // Añadir conteo a resumen
      Object.entries(regionCounts).forEach(([region, count]) => {
        if (count > 0) {
          statusSummary[region] = count;
        }
      });
    }
    
    // Añadir resumen de impuestos para España vs resto
    const deductibleSummary = {
      ivaEspana: reportData.summary.spainTax,
      ivaNoEspana: reportData.summary.otherTax,
      baseImponible: reportData.summary.taxableAmount,
      totalFacturado: reportData.summary.totalAmount
    };
    
    // Configurar opciones avanzadas para exportManager
    const exportOptions = {
      fileName,
      format: options.format || 'excel',
      sheetName: 'Impuestos',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeTotals: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      columnsWithTotals,
      currencyFormats,
      
      // Añadir información de periodo
      period: reportData.period,
      
      // Resaltar filas según país
      highlightStatus: true,
      statusColors: {
        'España': 'e6ffea',      // Verde claro
        'Latinoamérica': 'fff8e1', // Amarillo claro
        'Europa': 'e3f2fd',      // Azul claro
        'Norteamérica': 'f3e5f5' // Púrpura claro
      },
      
      // Añadir resúmenes
      statusSummary,
      deductibleSummary
    };
    
    // Exportar usando exportManager
    exportManager.exportData(dataToExport, exportOptions);
    
    this.ui.showSuccessMessage(`Informe de impuestos exportado correctamente en formato ${options.format.toUpperCase()}`);
  } catch (error) {
    console.error('Error al exportar informe de impuestos:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe. Revise la consola para más detalles.');
  }
}

/**
 * Prepara los datos de impuestos para exportación
 * @param {Object} reportData - Datos del informe
 * @returns {Array} Datos formateados para exportación
 */
prepareTaxDataForExport(reportData) {
  if (!reportData.taxBreakdown || reportData.taxBreakdown.length === 0) {
    return [];
  }
  
  // Determinar las regiones de los países
  const getRegionName = (countryCode) => {
    if (countryCode === 'ES') {
      return 'España';
    } else if (['MX', 'CO', 'AR', 'CL', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI'].includes(countryCode)) {
      return 'Latinoamérica';
    } else if (['FR', 'DE', 'IT', 'GB', 'PT', 'NL', 'BE', 'AT', 'GR', 'IE', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'RO', 'BG'].includes(countryCode)) {
      return 'Europa';
    } else if (['US', 'CA'].includes(countryCode)) {
      return 'Norteamérica';
    } else {
      return 'Otros';
    }
  };
  
  // Formatear para exportación
  return reportData.taxBreakdown.map(country => {
    // Aplicar formato de moneda solo si no es EUR o MULTIPLE
    const ivaOriginal = country.currency_code !== 'EUR' && country.currency_code !== 'MULTIPLE' 
      ? country.total_original 
      : null;
      
    const baseOriginal = country.currency_code !== 'EUR' && country.currency_code !== 'MULTIPLE'
      ? country.taxBase_original
      : null;
      
    // Determinar el símbolo de moneda para valores originales
    const currencySymbol = this.getCurrencySymbol(country.currency_code);
    
    return {
      'País': country.name,
      'Región': getRegionName(country.code),
      'Código': country.code,
      'Base Imponible (EUR)': country.taxBase || 0,
      'IVA (EUR)': country.total || 0,
      'Total Facturado (EUR)': (country.taxBase || 0) + (country.total || 0),
      'Tasa de IVA': country.rate || 0,
      'Transacciones': country.count || 0,
      'Moneda Original': country.currency_code || 'EUR',
      'Base Imponible Original': baseOriginal,
      'IVA Original': ivaOriginal,
      'Tasa de Cambio': country.exchange_rate || 1
    };
  });
}

/**
 * Obtiene el símbolo de moneda para un código dado
 * @param {string} currencyCode - Código de moneda
 * @returns {string} Símbolo de moneda
 */
getCurrencySymbol(currencyCode) {
  const symbols = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'MXN': '$',
    'COP': '$',
    'ARS': '$',
    'CLP': '$',
    'PEN': 'S/',
    'VES': 'Bs.'
  };
  
  return symbols[currencyCode] || currencyCode;
}

  
/**
 * Genera un informe de suscripciones
 * @param {Object} options - Opciones del informe
 */
generateSubscriptionsReport(options) {
  try {
    // Filtrar suscripciones por período
    let filteredSubscriptions = this.subscriptions;
    
    if (options.dateRange) {
      filteredSubscriptions = this.subscriptions.filter(subscription => {
        // Usar fecha de creación para nuevas y fecha de actualización para canceladas
        let date;
        if (subscription.status === 'canceled') {
          date = new Date(subscription.updated_at || subscription.created_at);
        } else {
          date = new Date(subscription.created_at);
        }
        
        return date >= options.dateRange.start && date <= options.dateRange.end;
      });
    }
    
    // Verificar si hay datos para procesar
    if (!filteredSubscriptions || filteredSubscriptions.length === 0) {
      this.ui.showErrorMessage('Error', 'No hay datos de suscripciones para el período seleccionado');
      return;
    }
    
    // Calcular resumen de suscripciones
    const subscriptionSummary = this.calculateSubscriptionsSummary(filteredSubscriptions);
    
    // Crear estructura del informe
    const reportData = {
      title: this.getReportTitle(options),
      period: options.period,
      generatedAt: new Date().toISOString(),
      summary: subscriptionSummary,
      subscriptions: filteredSubscriptions.map(s => ({
        id: s.subscription_id,
        subscription_id: s.subscription_id,
        user: s.user?.email || s.user_email || `Usuario ${s.id_user}`,
        id_user: s.id_user,
        product: s.product_name || s.carrera_nombre || `Producto ${s.product_id}`,
        product_id: s.product_id,
        carrera_nombre: s.carrera_nombre,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        next_billed_at: s.next_billed_at,
        amount: s.amount || 1900, // Valor predeterminado si no hay monto
        currency_code: s.currency_code || 'EUR',
        interval: s.interval
      })),
      dateRange: options.dateRange
    };
    
    // Exportar según formato seleccionado
    this.exportReport(reportData, options);
  } catch (error) {
    console.error('Error al generar informe de suscripciones:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe de suscripciones: ' + error.message);
  }
}

/**
 * Exporta un informe de suscripciones con formato mejorado usando exportManager
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportSubscriptionsReportWithManager(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación en formato optimizado
    const dataToExport = this.prepareSubscriptionsDataForExport(reportData);
    
    // Contar suscripciones por estado
    const statusCounts = {
      'Activa': 0,
      'Pausada': 0,
      'Cancelada': 0,
      'Expirada': 0
    };
    
    // Contamos cada tipo de estado
    dataToExport.forEach(subscription => {
      if (statusCounts[subscription['Estado']] !== undefined) {
        statusCounts[subscription['Estado']]++;
      }
    });
    
    // Solo la columna Precio debería tener total
    const columnsWithTotals = ['Precio'];
    
    // Configurar formatos de moneda para columnas
    const currencyFormats = {
      'Precio': '€#,##0.00'
    };
    
    // Configurar opciones avanzadas para exportManager
    const exportOptions = {
      fileName,
      format: options.format || 'excel',
      sheetName: 'Suscripciones',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeTotals: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      columnsWithTotals,
      currencyFormats,
      
      // Añadir información de periodo
      period: reportData.period,
      
      // Opciones para colorear estados
      highlightStatus: true,
      statusColors: {
        'Activa': 'e6ffea', // Verde claro
        'Pausada': 'fff8e1', // Amarillo claro
        'Cancelada': 'ffebee', // Rojo claro
        'Expirada': 'f5f5f5'  // Gris claro
      },
      
      // Añadir resumen de estados
      statusSummary: statusCounts
    };
    
    // Exportar usando exportManager
    exportManager.exportData(dataToExport, exportOptions);
    
    this.ui.showSuccessMessage(`Informe de suscripciones exportado correctamente en formato ${options.format.toUpperCase()}`);
  } catch (error) {
    console.error('Error al exportar informe de suscripciones:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe. Revise la consola para más detalles.');
  }
}

/**
 * Prepara los datos de suscripciones para exportación
 * @param {Object} reportData - Datos del informe
 * @returns {Array} Datos formateados para exportación
 */
prepareSubscriptionsDataForExport(reportData) {
  if (!reportData.subscriptions || reportData.subscriptions.length === 0) {
    return [];
  }
  
  // Mapear suscripciones a formato optimizado para Excel
  return reportData.subscriptions.map(subscription => {
    // Calcular precio según intervalo (usando la misma lógica que el panel original)
    const priceInfo = this.calculateSubscriptionPrice(subscription);
    
    // Normalizar estado para consistencia
    const estado = subscription.status === 'active' ? 'Activa' : 
                  subscription.status === 'paused' ? 'Pausada' : 
                  subscription.status === 'canceled' ? 'Cancelada' : 'Expirada';
    
    return {
      'ID Suscripción': subscription.id || subscription.subscription_id,
      'Usuario': subscription.user,
      'ID Usuario': subscription.id_user,
      'Producto': subscription.product,
      'Estado': estado,
      'Fecha de Creación': formatDate(subscription.created_at, 'short'),
      'Próximo Cobro': formatDate(subscription.next_billed_at, 'short'),
      'Precio': Number(priceInfo.amount), // Aseguramos que sea número para formato moneda
      'Intervalo': subscription.interval === 'year' ? 'Anual' : 'Mensual',
      'Última Actualización': formatDate(subscription.updated_at, 'short')
    };
  });
}


/**
 * Calcula el precio de la suscripción basado en su intervalo
 * @param {Object} subscription - Datos de la suscripción
 * @returns {Object} Información de precio
 */
calculateSubscriptionPrice(subscription) {
  // Obtener monto base - asegurándonos de que sea un número
  let amount = subscription.amount;
  
  // Si es string, normalizarlo
  if (typeof amount === 'string') {
    // Si no tiene punto decimal, asumir que está en centavos
    if (!amount.includes('.')) {
      amount = parseInt(amount) / 100;
    } else {
      amount = parseFloat(amount);
    }
  } else if (typeof amount === 'number' && amount > 100) {
    // Si es un número grande (como 1900), dividir por 100
    amount = amount / 100;
  }
  
  // Si no hay monto, usar un valor predeterminado
  if (!amount || isNaN(amount)) {
    amount = 19.00; // Valor predeterminado mensual
  }
  
  // Calcular el precio final según el intervalo
  let finalAmount = amount;
  
  // Para suscripciones anuales, aplicar el cálculo especial
  if (subscription.interval === 'year') {
    // Precio anual: mensual x 12 con 21% de descuento
    finalAmount = amount * 12 * 0.79;
  }
  
  // Determinar divisa
  const currency = subscription.currency_code || 'EUR';
  
  return {
    amount: finalAmount,
    baseMonthlyAmount: amount,
    currency,
    formatted: formatCurrency(finalAmount, currency)
  };
}
  
/**
 * Calcula resumen de suscripciones mejorado - CORREGIDO para tasa de cancelación
 * @param {Array} subscriptions - Suscripciones a analizar
 * @returns {Object} Resumen de suscripciones
 */
calculateSubscriptionsSummary(subscriptions) {
  // Contar por estado
  const statusCounts = {
    active: 0,
    paused: 0,
    canceled: 0,
    expired: 0
  };
  
  // Totales para cálculos financieros
  let totalMonthlyRevenue = 0;
  let totalYearlyRevenue = 0;
  let projectedAnnualRevenue = 0;
  
  subscriptions.forEach(sub => {
    // Conteo por estado
    if (statusCounts.hasOwnProperty(sub.status)) {
      statusCounts[sub.status]++;
    }
    
    // Solo calcular ingresos para suscripciones activas
    if (sub.status === 'active') {
      // Calcular precio según intervalo
      const priceInfo = this.calculateSubscriptionPrice(sub);
      
      if (sub.interval === 'year') {
        totalYearlyRevenue += priceInfo.amount;
        // Contribución mensual equivalente para proyección
        projectedAnnualRevenue += priceInfo.amount;
      } else {
        totalMonthlyRevenue += priceInfo.amount;
        // Proyección a 12 meses
        projectedAnnualRevenue += priceInfo.amount * 12;
      }
    }
  });
  
  // CORRECCIÓN: Contar explícitamente las suscripciones expired como canceladas
  const totalCanceled = statusCounts.canceled + statusCounts.expired;
  const cancelationRate = (totalCanceled / (subscriptions.length || 1)) * 100;
  
  // Agrupar por producto CORREGIDO para contar expired como canceled
  const productSubscriptions = {};
  subscriptions.forEach(sub => {
    const productId = sub.product_id;
    const productName = sub.product_name || sub.carrera_nombre || `Producto ${productId}`;
    
    if (!productSubscriptions[productId]) {
      productSubscriptions[productId] = {
        id: productId,
        name: productName,
        total: 0,
        active: 0,
        paused: 0,
        canceled: 0,
        expired: 0
      };
    }
    
    productSubscriptions[productId].total++;
    
    if (sub.status === 'active') {
      productSubscriptions[productId].active++;
    } else if (sub.status === 'paused') {
      productSubscriptions[productId].paused++;
    } else if (sub.status === 'canceled') {
      productSubscriptions[productId].canceled++;
    } else if (sub.status === 'expired') {
      productSubscriptions[productId].expired++;
    }
  });
  
  // Transformar para el resultado - MEJORADO
  const productsArray = Object.values(productSubscriptions)
    .map(product => {
      // CORRECCIÓN: Para cada producto, sumar expired a canceled
      return {
        ...product,
        canceled: product.canceled + product.expired // Combinar expired con canceled
      };
    })
    .sort((a, b) => b.total - a.total);
  
  return {
    total: subscriptions.length,
    active: statusCounts.active,
    paused: statusCounts.paused,
    canceled: totalCanceled, // CORREGIDO: Usar el total combinado de canceled + expired
    expired: statusCounts.expired,
    cancelationRate,
    monthlyRevenue: totalMonthlyRevenue,
    yearlyRevenue: totalYearlyRevenue,
    projectedAnnualRevenue,
    products: productsArray
  };
}
  
/**
 * Genera un informe de usuarios con información completa
 * @param {Object} options - Opciones del informe
 */
async generateUsersReport(options) {
  try {
    // Mostrar indicador de carga
    this.ui.showLoading('Generando informe de usuarios...');

    // Filtrar usuarios por período o criterios adicionales
    let filteredUsers = this.users;
    
    if (options.dateRange) {
      filteredUsers = this.users.filter(user => {
        // Filtrar por fecha de registro si está disponible
        if (user.fecha_registro || user.created_at) {
          const registrationDate = new Date(user.fecha_registro || user.created_at);
          return registrationDate >= options.dateRange.start && registrationDate <= options.dateRange.end;
        }
        return true; // Incluir usuarios sin fecha de registro
      });
    }
    
    // Si no hay usuarios filtrados, mostrar mensaje
    if (filteredUsers.length === 0) {
      this.ui.hideLoading();
      this.ui.showErrorMessage('No hay usuarios que cumplan con los criterios seleccionados');
      return;
    }

    // Enriquecer datos de usuarios con información completa
    // Verificar si ya tenemos datos enriquecidos
    let usersWithCompleteData = filteredUsers;
    if (!filteredUsers[0]?.perfil || !filteredUsers[0]?.subscriptions) {
      console.log('Enriqueciendo datos de usuarios con información completa...');
      usersWithCompleteData = await this.enrichUsersWithCompleteData(filteredUsers);
    }
    
    // Calcular resumen de usuarios
    const usersSummary = this.calculateUsersSummary(usersWithCompleteData);
    
    // Crear estructura del informe
    const reportData = {
      title: options.title || this.getReportTitle(options) || 'Informe de Usuarios',
      period: options.period || this.formatDateRange(options.dateRange),
      generatedAt: new Date().toISOString(),
      summary: usersSummary,
      users: usersWithCompleteData,
      dateRange: options.dateRange
    };
    
    // Exportar según formato seleccionado
    this.ui.hideLoading();
    this.exportReport(reportData, options);
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage(`Informe de usuarios generado correctamente en formato ${options.format.toUpperCase()}`);
  } catch (error) {
    this.ui.hideLoading();
    console.error('Error al generar informe de usuarios:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe de usuarios');
  }
}

/**
 * Formatea un rango de fechas para mostrar como período
 * @param {Object} dateRange - Objeto con fechas start y end
 * @returns {string} Rango formateado
 */
formatDateRange(dateRange) {
  try {
    if (!dateRange) {
      return 'Período completo';
    }
    
    console.log('Formateando rango de fechas:', dateRange);
    
    // Verificar que ambas fechas existan
    if (!dateRange.start || !dateRange.end) {
      console.warn('Rango de fechas incompleto:', dateRange);
      return 'Período parcial';
    }
    
    // Convertir a objetos Date si son strings
    const startDate = dateRange.start instanceof Date ? 
      dateRange.start : new Date(dateRange.start);
    
    const endDate = dateRange.end instanceof Date ?
      dateRange.end : new Date(dateRange.end);
    
    // Verificar que ambas fechas sean válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Rango de fechas contiene fechas inválidas:', {
        start: dateRange.start,
        end: dateRange.end,
        startValid: !isNaN(startDate.getTime()),
        endValid: !isNaN(endDate.getTime())
      });
      return 'Período indefinido';
    }
    
    // Formatear fechas en formato local
    const formattedStart = startDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    const formattedEnd = endDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    return `${formattedStart} - ${formattedEnd}`;
  } catch (error) {
    console.error('Error al formatear rango de fechas:', error);
    return 'Período no especificado';
  }
}

/**
 * Enriquece los datos de usuarios con información completa
 * Versión mejorada basada en users-inteligente.js
 * @param {Array} users - Lista de usuarios básicos
 * @returns {Promise<Array>} Usuarios con datos completos
 */
async enrichUsersWithCompleteData(users) {
  try {
    // Lista para usuarios enriquecidos
    const enrichedUsers = [];
    
    // Procesar cada usuario
    const enrichPromises = users.map(async (user) => {
      try {
        // 1. Obtener detalles del perfil
        let userDetails = null;
        try {
          // Esta es la API que usa el modal y que SÍ incluye last_login
          const detailResponse = await this.api.get(`/perfil/detail/${user.id_user}`);
          
          if (detailResponse.success && detailResponse.data) {
            userDetails = detailResponse.data;
            
            // Actualizar last_login si está disponible
            if (userDetails.usuario && userDetails.usuario.last_login) {
              user.last_login = userDetails.usuario.last_login;
            }
          }
        } catch (detailError) {
          console.warn(`No se pudo obtener detalles completos para usuario ${user.id_user}:`, detailError);
        }
        
        // 2. Obtener perfil con universidad
        let perfil = null;
        try {
          const perfilResponse = await this.api.get(`/perfil/with-university/${user.id_user}`);
          if (perfilResponse.success && perfilResponse.data) {
            perfil = perfilResponse.data;
          }
        } catch (perfilError) {
          console.warn(`Error al obtener perfil para usuario ${user.id_user}:`, perfilError);
        }
        
        // 3. Obtener suscripciones
        let subscriptions = [];
        try {
          const subsResponse = await this.api.get(`/payment/user/subscriptions/${user.id_user}`);
          if (subsResponse.success && subsResponse.data) {
            subscriptions = subsResponse.data;
          } else if (Array.isArray(subsResponse)) {
            subscriptions = subsResponse;
          }
        } catch (subsError) {
          console.warn(`Error al obtener suscripciones para usuario ${user.id_user}:`, subsError);
        }
        
        // 4. Obtener transacciones
        let transactions = [];
        try {
          const transResponse = await this.api.get(`/payment/user/transactions/${user.id_user}`);
          if (transResponse.success && transResponse.data) {
            transactions = transResponse.data;
          } else if (Array.isArray(transResponse)) {
            transactions = transResponse;
          }
        } catch (transError) {
          console.warn(`Error al obtener transacciones para usuario ${user.id_user}:`, transError);
        }
        
        // Calcular gasto total priorizando amount_eur
        const totalSpend = transactions.reduce((sum, trans) => {
          // Priorizar el uso de amount_eur si está disponible
          if (trans.amount_eur !== undefined && trans.amount_eur !== null) {
            return sum + this.normalizeAmount(trans.amount_eur);
          }
          
          // Si no tiene amount_eur pero tenemos divisa, intentar estimar manualmente
          if (trans.currency_code && trans.currency_code !== 'EUR' && trans.exchange_rate) {
            return sum + (this.normalizeAmount(trans.amount) * trans.exchange_rate);
          }
          
          // Si no hay más información, asumimos que amount ya está en EUR
          return sum + this.normalizeAmount(trans.amount);
        }, 0);
        
        // Determinar último acceso
        const lastLogin = user.last_login || 
                         (userDetails?.usuario?.last_login) || 
                         (user.ultimo_login) || 
                         null;
        
        // Añadir usuario enriquecido
        return {
          ...user,
          nombre: perfil?.nombre || (userDetails?.perfil?.nombre || ''),
          apellido: perfil?.apellido || (userDetails?.perfil?.apellido || ''),
          universidad: perfil?.nom_universidad || (userDetails?.perfil?.nom_universidad || ''),
          pais: perfil?.nombre_pais || (userDetails?.perfil?.nombre_pais || ''),
          id_pais: perfil?.id_pais || (userDetails?.perfil?.id_pais),
          id_universidad: perfil?.id_universidad || (userDetails?.perfil?.id_universidad),
          fecha_registro: user.created_at || new Date(),
          created_at: user.created_at || new Date(),
          last_login: lastLogin,
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
            lastAccess: lastLogin ? new Date(lastLogin) : null
          }
        };
      } catch (userError) {
        console.error(`Error procesando usuario ${user.id_user}:`, userError);
        // Devolver usuario con datos mínimos en caso de error
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
    return users;  // Devolver los usuarios originales en caso de error
  }
}

/**
 * Calcula resumen de estadísticas de usuarios con información mejorada
 * @param {Array} users - Lista de usuarios con estadísticas
 * @returns {Object} Resumen de estadísticas
 */
calculateUsersSummary(users) {
  // Contar usuarios por estado de suscripción
  const usersWithActiveSubscriptions = users.filter(user => user.stats.activeSubscriptions > 0);
  const usersWithNoSubscriptions = users.filter(user => user.stats.subscriptionsCount === 0);
  const inactiveUsers = users.filter(user => 
    user.stats.subscriptionsCount > 0 && user.stats.activeSubscriptions === 0
  );
  
  // Calcular totales
  const totalSpend = users.reduce((sum, user) => sum + user.stats.totalSpend, 0);
  const totalActiveSubscriptions = users.reduce((sum, user) => sum + user.stats.activeSubscriptions, 0);
  const totalTransactions = users.reduce((sum, user) => sum + user.stats.transactionsCount, 0);
  
  // Calcular promedios
  const avgSpendPerUser = users.length > 0 ? totalSpend / users.length : 0;
  const avgTransactionsPerUser = users.length > 0 ? totalTransactions / users.length : 0;
  
  // Calcular tasas
  const conversionRate = users.length > 0 ? (usersWithActiveSubscriptions.length / users.length) * 100 : 0;
  const churnRate = usersWithActiveSubscriptions.length > 0 ? 
    (inactiveUsers.length / (usersWithActiveSubscriptions.length + inactiveUsers.length)) * 100 : 0;
  
  // MEJORA: Agrupar por país con conteo de usuarios y gasto total
  const countryDistribution = {};
  users.forEach(user => {
    if (user.pais) {
      const country = user.pais;
      if (!countryDistribution[country]) {
        countryDistribution[country] = {
          count: 0,
          totalSpend: 0,
          activeUsers: 0
        };
      }
      countryDistribution[country].count++;
      countryDistribution[country].totalSpend += user.stats.totalSpend || 0;
      if (user.stats.activeSubscriptions > 0) {
        countryDistribution[country].activeUsers++;
      }
    } else if (user.id_pais) {
      const country = `País ID: ${user.id_pais}`;
      if (!countryDistribution[country]) {
        countryDistribution[country] = {
          count: 0,
          totalSpend: 0,
          activeUsers: 0
        };
      }
      countryDistribution[country].count++;
      countryDistribution[country].totalSpend += user.stats.totalSpend || 0;
      if (user.stats.activeSubscriptions > 0) {
        countryDistribution[country].activeUsers++;
      }
    }
  });
  
  // MEJORA: Agrupar por universidad
  const universityDistribution = {};
  users.forEach(user => {
    if (user.universidad) {
      const university = user.universidad;
      if (!universityDistribution[university]) {
        universityDistribution[university] = {
          count: 0,
          totalSpend: 0,
          activeUsers: 0
        };
      }
      universityDistribution[university].count++;
      universityDistribution[university].totalSpend += user.stats.totalSpend || 0;
      if (user.stats.activeSubscriptions > 0) {
        universityDistribution[university].activeUsers++;
      }
    } else if (user.id_universidad) {
      const university = `Universidad ID: ${user.id_universidad}`;
      if (!universityDistribution[university]) {
        universityDistribution[university] = {
          count: 0,
          totalSpend: 0,
          activeUsers: 0
        };
      }
      universityDistribution[university].count++;
      universityDistribution[university].totalSpend += user.stats.totalSpend || 0;
      if (user.stats.activeSubscriptions > 0) {
        universityDistribution[university].activeUsers++;
      }
    }
  });
  
  // MEJORA: Agrupar por producto suscrito
  const productDistribution = {};
  users.forEach(user => {
    if (user.subscriptions && user.subscriptions.length > 0) {
      user.subscriptions.forEach(sub => {
        const productName = sub.product_name || sub.carrera_nombre || `Producto ${sub.product_id}`;
        if (!productDistribution[productName]) {
          productDistribution[productName] = {
            count: 0,
            activeCount: 0,
            totalRevenue: 0
          };
        }
        productDistribution[productName].count++;
        if (sub.status === 'active') {
          productDistribution[productName].activeCount++;
        }
        
        // Agregar ingresos del producto
        // Buscar transacciones relacionadas con este producto
        if (user.transactions) {
          const productTransactions = user.transactions.filter(t => 
            t.product_id === sub.product_id || t.product_name === productName
          );
          
          productTransactions.forEach(trans => {
            // Priorizar amount_eur
            if (trans.amount_eur !== undefined && trans.amount_eur !== null) {
              productDistribution[productName].totalRevenue += this.normalizeAmount(trans.amount_eur);
            }
            // Fallback a conversión manual
            else if (trans.currency_code && trans.currency_code !== 'EUR' && trans.exchange_rate) {
              const convertedAmount = this.normalizeAmount(trans.amount) * trans.exchange_rate;
              productDistribution[productName].totalRevenue += convertedAmount;
            }
            // Si no hay más información, asumir que amount ya está en EUR
            else {
              productDistribution[productName].totalRevenue += this.normalizeAmount(trans.amount);
            }
          });
        }
      });
    }
  });
  
  // Convertir distribuciones a arrays ordenados
  const countriesArray = Object.entries(countryDistribution)
    .map(([country, data]) => ({ 
      country, 
      count: data.count,
      totalSpend: data.totalSpend,
      activeUsers: data.activeUsers,
      percentage: users.length > 0 ? (data.count / users.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
  
  const universitiesArray = Object.entries(universityDistribution)
    .map(([university, data]) => ({ 
      university, 
      count: data.count,
      totalSpend: data.totalSpend,
      activeUsers: data.activeUsers,
      percentage: users.length > 0 ? (data.count / users.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
  
  const productsArray = Object.entries(productDistribution)
    .map(([product, data]) => ({ 
      product, 
      count: data.count,
      activeCount: data.activeCount,
      totalRevenue: data.totalRevenue,
      percentage: users.length > 0 ? (data.count / users.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalUsers: users.length,
    activeUsers: usersWithActiveSubscriptions.length,
    inactiveUsers: inactiveUsers.length,
    newUsers: users.length, // Esto debe refinarse con fechas reales
    conversionRate,
    churnRate,
    totalSpend,
    avgSpendPerUser,
    totalActiveSubscriptions,
    totalTransactions,
    avgTransactionsPerUser,
    
    // Distribuciones mejoradas
    countryDistribution: countriesArray,
    universityDistribution: universitiesArray.slice(0, 10), // Top 10 universidades
    productDistribution: productsArray,
    
    // Datos para el resumen de inactividad
    inactive: {
      count: inactiveUsers.length,
      percentage: users.length > 0 ? (inactiveUsers.length / users.length) * 100 : 0,
      spend: inactiveUsers.reduce((sum, user) => sum + user.stats.totalSpend, 0),
      transactions: inactiveUsers.reduce((sum, user) => sum + user.stats.transactionsCount, 0)
    }
  };
}

/**
 * Exporta un informe de usuarios con formato mejorado usando exportManager
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportUsersReportWithManager(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación en formato optimizado
    const dataToExport = this.prepareUsersDataForExport(reportData);
    
    // Identificar usuarios inactivos (que tenían suscripciones pero ahora no tienen activas)
    const inactiveUsers = dataToExport.filter(user => 
      user['Total Suscripciones'] > 0 && user['Suscripciones Activas'] === 0
    );
    
    // Calcular estadísticas para el resumen
    const totalUsers = dataToExport.length;
    const inactiveCount = inactiveUsers.length;
    const inactivePercentage = totalUsers > 0 ? ((inactiveCount / totalUsers) * 100).toFixed(2) : 0;
    
    // Columnas que deben tener totales
    const columnsWithTotals = ['Suscripciones Activas', 'Transacciones', 'Gasto Total (EUR)'];
    
    // Configurar formatos específicos para columnas
    const currencyFormats = {
      'Gasto Total (EUR)': '€#,##0.00',
      'Suscripciones Activas': '#,##0',  // Formato entero sin decimales
      'Transacciones': '#,##0'           // Formato entero sin decimales
    };
    
    // MEJORA: Preparar datos de análisis para el informe
    // Incluir top 5 países por número de usuarios
    const topCountries = {};
    reportData.summary.countryDistribution.slice(0, 5).forEach(country => {
      topCountries[country.country] = {
        count: country.count,
        percentage: country.percentage,
        totalSpend: country.totalSpend
      };
    });
    
    // Incluir top 5 productos por número de usuarios
    const topProducts = {};
    reportData.summary.productDistribution.slice(0, 5).forEach(product => {
      topProducts[product.product] = {
        count: product.count,
        percentage: product.percentage,
        totalRevenue: product.totalRevenue
      };
    });
    
    // Configurar opciones avanzadas para exportManager
    const exportOptions = {
      fileName,
      format: options.format || 'excel',
      sheetName: 'Usuarios',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeTotals: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      columnsWithTotals,
      currencyFormats,
      
      // Añadir información de periodo
      period: reportData.period,
      
      // Opciones para resaltar usuarios inactivos
      highlightInactiveUsers: true,
      inactiveUserColor: 'ffebee',
      inactiveUserSummary: {
        count: inactiveCount,
        percentage: inactivePercentage
      },
      
      // MEJORA: Incluir análisis de usuarios 
      userAnalysis: {
        totalUsers: reportData.summary.totalUsers,
        activeUsers: reportData.summary.activeUsers,
        conversionRate: reportData.summary.conversionRate,
        churnRate: reportData.summary.churnRate,
        totalSpend: reportData.summary.totalSpend,
        avgSpendPerUser: reportData.summary.avgSpendPerUser,
        countries: topCountries,
        products: topProducts
      }
    };
    
    // Exportar usando exportManager
    exportManager.exportData(dataToExport, exportOptions);
  } catch (error) {
    console.error('Error al exportar informe de usuarios:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe. Revise la consola para más detalles.');
  }
}

/**
 * Prepara los datos de usuarios para exportación
 * @param {Object} reportData - Datos del informe
 * @returns {Array} Datos formateados para exportación
 */
prepareUsersDataForExport(reportData) {
  if (!reportData.users || reportData.users.length === 0) {
    return [];
  }
  
  // Mapear usuarios a formato optimizado para Excel
  return reportData.users.map(user => {
    return {
      'ID': user.id_user,
      'Correo': user.correo,
      'Nombre': user.nombre || '',
      'Apellido': user.apellido || '',
      'País': user.pais || (user.id_pais ? `País ID: ${user.id_pais}` : ''),
      'Universidad': user.universidad || (user.id_universidad ? `Universidad ID: ${user.id_universidad}` : ''),
      'Registro': formatDate(user.fecha_registro || user.created_at || new Date(), 'YYYY-MM-DD'),
      'Suscripciones Activas': Number(user.stats.activeSubscriptions || 0),
      'Total Suscripciones': Number(user.stats.subscriptionsCount || 0),
      'Transacciones': Number(user.stats.transactionsCount || 0),
      'Gasto Total (EUR)': Number(user.stats.totalSpend || 0),
      'Último Acceso': user.stats.lastAccess ? formatDate(user.stats.lastAccess, 'YYYY-MM-DD HH:mm') : 
                      (user.last_login ? formatDate(new Date(user.last_login), 'YYYY-MM-DD HH:mm') : '')
    };
  });
}
  
/**
 * Genera un informe de productos con información completa
 * @param {Object} options - Opciones del informe
 */
async generateProductsReport(options) {
  try {
    // Mostrar indicador de carga
    this.ui.showLoading('Generando informe de productos...');

    // Cargar datos necesarios si no están disponibles
    if (!this.loadRequiredData()) {
      await this.loadRequiredData();
    }

    console.log('Generando informe de productos con opciones:', options);

    // 1. Obtener productos/cursos
    let products = [];
    try {
      products = await this.api.getProducts();
      console.log('Productos obtenidos:', products.length);
      if (products.length > 0) {
        console.log('Muestra de estructura de producto:', JSON.stringify(products[0]));
      }
    } catch (error) {
      console.error('Error al obtener productos:', error);
      this.ui.showErrorMessage('Error', 'No se pudieron cargar los datos de productos.');
      this.ui.hideLoading();
      return;
    }

    // Si no hay productos, mostrar mensaje y salir
    if (!products || products.length === 0) {
      this.ui.hideLoading();
      this.ui.showErrorMessage('No hay datos de productos disponibles');
      return;
    }

    // 2. Obtener suscripciones si aún no están cargadas
    if (!this.subscriptions || this.subscriptions.length === 0) {
      try {
        this.subscriptions = await this.api.getSubscriptions();
        console.log('Suscripciones obtenidas:', this.subscriptions.length);
      } catch (error) {
        console.warn('Error al obtener suscripciones:', error);
        this.subscriptions = [];
      }
    }

    // 3. Obtener transacciones si aún no están cargadas
    if (!this.transactions || this.transactions.length === 0) {
      try {
        this.transactions = await this.api.getTransactions();
        console.log('Transacciones obtenidas:', this.transactions.length);
      } catch (error) {
        console.warn('Error al obtener transacciones:', error);
        this.transactions = [];
      }
    }

    // 4. Filtrar por fecha si es necesario
    let filteredTransactions = this.transactions;
    let filteredSubscriptions = this.subscriptions;

    if (options.dateRange) {
      console.log('Filtrando por rango de fechas:', options.dateRange);
      
      // Asegurar que las fechas sean objetos Date y válidas
      let startDate = null;
      let endDate = null;
      
      if (options.dateRange.start) {
        startDate = options.dateRange.start instanceof Date 
          ? new Date(options.dateRange.start) 
          : new Date(options.dateRange.start);
        startDate.setHours(0, 0, 0, 0); // Inicio del día
      }
      
      if (options.dateRange.end) {
        endDate = options.dateRange.end instanceof Date 
          ? new Date(options.dateRange.end) 
          : new Date(options.dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Fin del día
      }
      
      console.log('Rango de fechas normalizado:', {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        startValid: startDate ? !isNaN(startDate.getTime()) : false,
        endValid: endDate ? !isNaN(endDate.getTime()) : false
      });
      
      // Verificar que las fechas sean válidas antes de filtrar
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // Filtrar transacciones por fecha
        filteredTransactions = this.transactions.filter(transaction => {
          if (!transaction.updated_at && !transaction.created_at) return false;
          
          const txDate = new Date(transaction.updated_at || transaction.created_at);
          txDate.setHours(12, 0, 0, 0); // Normalizar a mediodía
          
          if (isNaN(txDate.getTime())) return false;
          
          return txDate >= startDate && txDate <= endDate;
        });

        // Filtrar suscripciones por fecha (creación para nuevas, actualización para canceladas)
        filteredSubscriptions = this.subscriptions.filter(subscription => {
          if (!subscription.created_at) return false;
          
          // Para suscripciones, usamos created_at para las nuevas y updated_at para las canceladas
          let subDate;
          if (subscription.status === 'canceled' && subscription.updated_at) {
            subDate = new Date(subscription.updated_at);
          } else {
            subDate = new Date(subscription.created_at);
          }
          
          subDate.setHours(12, 0, 0, 0); // Normalizar a mediodía
          
          if (isNaN(subDate.getTime())) return false;
          
          return subDate >= startDate && subDate <= endDate;
        });
        
        console.log(`Filtrado completado: ${filteredTransactions.length} transacciones y ${filteredSubscriptions.length} suscripciones`);
      }
    }

    // 5. Enriquecer los productos con estadísticas
    const enrichedProducts = this.calculateProductsStatistics(products, filteredSubscriptions, filteredTransactions);

    // 6. Calcular el resumen global de productos
    const productsSummary = this.calculateProductsSummary(enrichedProducts, filteredSubscriptions, filteredTransactions);

    // 7. Crear estructura del informe
    const reportData = {
      title: options.title || this.getReportTitle(options) || 'Informe de Productos',
      period: options.period || this.formatDateRange(options.dateRange),
      generatedAt: new Date().toISOString(),
      summary: productsSummary,
      products: enrichedProducts,
      dateRange: options.dateRange
    };

    // 8. Exportar según formato seleccionado
    this.ui.hideLoading();
    await this.exportReport(reportData, options);
    
    // 9. Mostrar mensaje de éxito
    this.ui.showSuccessMessage(`Informe de productos generado correctamente en formato ${options.format.toUpperCase()}`);
  } catch (error) {
    this.ui.hideLoading();
    console.error('Error al generar informe de productos:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe de productos: ' + error.message);
  }
}

/**
 * Calcula estadísticas para cada producto - CORREGIDO para usar earnings_eur
 * @param {Array} products - Lista de productos
 * @param {Array} subscriptions - Lista de suscripciones
 * @param {Array} transactions - Lista de transacciones
 * @returns {Array} Productos enriquecidos con estadísticas
 */
calculateProductsStatistics(products, subscriptions, transactions) {
  return products.map(product => {
    // Identificar planes de producto (mensual y anual)
    const monthPlanId = product.month;
    const yearPlanId = product.year;
    
    // Agrupar suscripciones por tipo de plan
    const productSubscriptions = subscriptions.filter(sub => 
      sub.product_id == product.id_carrera || 
      (monthPlanId && sub.price_id == monthPlanId) || 
      (yearPlanId && sub.price_id == yearPlanId)
    );
    
    // CORRECCIÓN: Contar suscripciones activas incluyendo 'paused'
    const activeSubscriptions = productSubscriptions.filter(sub => 
      sub.status === 'active' || sub.status === 'paused'
    );
    const monthlySubscriptions = activeSubscriptions.filter(sub => sub.interval === 'month');
    const yearlySubscriptions = activeSubscriptions.filter(sub => sub.interval === 'year');
    
    // CORRECCIÓN: Contar suscripciones canceladas y expiradas
    const canceledSubscriptions = productSubscriptions.filter(sub => 
      sub.status === 'canceled' || sub.status === 'expired'
    );
    
    // Calcular tasa de cancelación
    const cancelationRate = productSubscriptions.length > 0 
      ? (canceledSubscriptions.length / productSubscriptions.length) * 100 
      : 0;
    
    // Filtrar transacciones para este producto
    const productTransactions = transactions.filter(tx => 
      tx.product_id == product.id_carrera ||
      (monthPlanId && tx.price_id == monthPlanId) || 
      (yearPlanId && tx.price_id == yearPlanId)
    );
    
    // CORRECCIÓN: Calcular ingresos totales usando earnings_eur para consistencia
    const totalRevenue = productTransactions.reduce((sum, tx) => {
      // Priorizar earnings_eur si existe
      if (tx.earnings_eur !== undefined && tx.earnings_eur !== null) {
        return sum + this.normalizeAmount(tx.earnings_eur);
      }
      // Fallback a amount_eur si no hay earnings_eur
      else if (tx.amount_eur !== undefined && tx.amount_eur !== null) {
        return sum + this.normalizeAmount(tx.amount_eur);
      } 
      // Cálculo manual usando earnings y tasa de cambio
      else if (tx.earnings && tx.currency_code !== 'EUR' && tx.exchange_rate) {
        return sum + (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
      }
      // Último fallback
      else {
        return sum + this.normalizeAmount(tx.earnings || tx.amount || 0);
      }
    }, 0);
    
    // CORRECCIÓN: Calcular ingresos mensuales vs anuales usando earnings_eur
    const monthlyRevenue = productTransactions
      .filter(tx => tx.interval === 'month')
      .reduce((sum, tx) => {
        if (tx.earnings_eur !== undefined) {
          return sum + this.normalizeAmount(tx.earnings_eur);
        } else if (tx.amount_eur !== undefined) {
          return sum + this.normalizeAmount(tx.amount_eur);
        } else if (tx.earnings && tx.exchange_rate) {
          return sum + (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
        } else {
          return sum + this.normalizeAmount(tx.earnings || tx.amount || 0);
        }
      }, 0);
    
    const yearlyRevenue = productTransactions
      .filter(tx => tx.interval === 'year')
      .reduce((sum, tx) => {
        if (tx.earnings_eur !== undefined) {
          return sum + this.normalizeAmount(tx.earnings_eur);
        } else if (tx.amount_eur !== undefined) {
          return sum + this.normalizeAmount(tx.amount_eur);
        } else if (tx.earnings && tx.exchange_rate) {
          return sum + (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
        } else {
          return sum + this.normalizeAmount(tx.earnings || tx.amount || 0);
        }
      }, 0);
    
    // Organizar transacciones por mes para tendencias
    const monthlyTrends = this.calculateMonthlyTrendsForProduct(productTransactions);
    
    return {
      ...product,
      statistics: {
        totalSubscriptions: productSubscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        monthlySubscriptions: monthlySubscriptions.length,
        yearlySubscriptions: yearlySubscriptions.length,
        canceledSubscriptions: canceledSubscriptions.length,
        cancelationRate,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        transactionsCount: productTransactions.length,
        monthlyTrends
      }
    };
  });
}

/**
 * Calcula tendencias mensuales para un producto - CORREGIDO para usar earnings_eur
 * @param {Array} transactions - Transacciones del producto
 * @returns {Array} Tendencias mensuales
 */
calculateMonthlyTrendsForProduct(transactions) {
  // Obtener últimos 12 meses
  const today = new Date();
  const monthsMap = {};
  
  // Inicializar últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(date);
    
    monthsMap[monthKey] = {
      key: monthKey,
      label: monthLabel,
      transactions: 0,
      revenue: 0,
      subscriptions: 0
    };
  }
  
  // Agrupar transacciones por mes - CORREGIDO para usar earnings_eur
  transactions.forEach(tx => {
    if (!tx.updated_at && !tx.created_at) return;
    
    const txDate = new Date(tx.updated_at || tx.created_at);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Solo procesar si está en uno de los últimos 12 meses
    if (monthsMap[monthKey]) {
      monthsMap[monthKey].transactions++;
      
      // CORRECCIÓN: Priorizar earnings_eur para ingresos reales
      if (tx.earnings_eur !== undefined && tx.earnings_eur !== null) {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.earnings_eur);
      }
      // Fallback a amount_eur
      else if (tx.amount_eur !== undefined && tx.amount_eur !== null) {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.amount_eur);
      }
      // Cálculo manual usando earnings original y tasa de cambio
      else if (tx.earnings && tx.currency_code !== 'EUR' && tx.exchange_rate) {
        monthsMap[monthKey].revenue += (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
      }
      // Último fallback
      else {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.earnings || tx.amount || 0);
      }
      
      // Contar como nueva suscripción si es una transacción inicial
      if (tx.event_type === 'subscription_created' || tx.event_type === 'subscription_payment') {
        monthsMap[monthKey].subscriptions++;
      }
    }
  });
  
  // Convertir a array ordenado por mes
  return Object.values(monthsMap).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Calcula el resumen global de productos - CORREGIDO
 * @param {Array} products - Productos enriquecidos
 * @param {Array} subscriptions - Lista de suscripciones
 * @param {Array} transactions - Lista de transacciones
 * @returns {Object} Resumen global
 */
calculateProductsSummary(enrichedProducts, subscriptions, transactions) {
  // Productos más populares (por suscripciones activas)
  const sortedBySubscriptions = [...enrichedProducts].sort(
    (a, b) => b.statistics.activeSubscriptions - a.statistics.activeSubscriptions
  );
  
  // Productos más rentables (por ingresos)
  const sortedByRevenue = [...enrichedProducts].sort(
    (a, b) => b.statistics.totalRevenue - a.statistics.totalRevenue
  );
  
  // Calcular totales
  const totalActiveSubscriptions = enrichedProducts.reduce(
    (sum, product) => sum + product.statistics.activeSubscriptions, 0
  );
  
  const totalRevenue = enrichedProducts.reduce(
    (sum, product) => sum + product.statistics.totalRevenue, 0
  );
  
  const totalMonthlySubscriptions = enrichedProducts.reduce(
    (sum, product) => sum + product.statistics.monthlySubscriptions, 0
  );
  
  const totalYearlySubscriptions = enrichedProducts.reduce(
    (sum, product) => sum + product.statistics.yearlySubscriptions, 0
  );
  
  // Calcular porcentajes de distribución
  const subscriptionDistribution = enrichedProducts.map(product => ({
    id: product.id_carrera,
    name: product.nombre,
    count: product.statistics.activeSubscriptions,
    percentage: totalActiveSubscriptions > 0 
      ? (product.statistics.activeSubscriptions / totalActiveSubscriptions) * 100 
      : 0
  })).sort((a, b) => b.count - a.count);
  
  const revenueDistribution = enrichedProducts.map(product => ({
    id: product.id_carrera,
    name: product.nombre,
    amount: product.statistics.totalRevenue,
    percentage: totalRevenue > 0 
      ? (product.statistics.totalRevenue / totalRevenue) * 100 
      : 0
  })).sort((a, b) => b.amount - a.amount);
  
  // Calcular distribución de suscripciones mensuales vs anuales
  const monthlyPercentage = totalActiveSubscriptions > 0 
    ? (totalMonthlySubscriptions / totalActiveSubscriptions) * 100 
    : 0;
  
  const yearlyPercentage = totalActiveSubscriptions > 0 
    ? (totalYearlySubscriptions / totalActiveSubscriptions) * 100 
    : 0;
  
  // Calcular tendencias generales mensuales (últimos 12 meses)
  const monthlyTrends = this.calculateMonthlyTrendsForAllProducts(transactions);
  
  // CORRECCIÓN: Asegurar que las claves existan en los objetos de topProductsByRevenue
  const topProductsByRevenue = sortedByRevenue.slice(0, 5).map(p => ({
    id: p.id_carrera,
    name: p.nombre,
    revenue: p.statistics.totalRevenue,
    revenuePercentage: totalRevenue > 0 
      ? (p.statistics.totalRevenue / totalRevenue) * 100 
      : 0,
    // IMPORTANTE: Asegurar que las suscripciones activas se transfieran correctamente
    subscriptions: p.statistics.activeSubscriptions
  }));
  
  // CORRECCIÓN: También incluir conteo de suscripciones en topProductsBySubscriptions
  const topProductsBySubscriptions = sortedBySubscriptions.slice(0, 5).map(p => ({
    id: p.id_carrera,
    name: p.nombre,
    subscriptions: p.statistics.activeSubscriptions,
    subscriptionPercentage: totalActiveSubscriptions > 0 
      ? (p.statistics.activeSubscriptions / totalActiveSubscriptions) * 100 
      : 0
  }));
  
  return {
    totalProducts: enrichedProducts.length,
    totalActiveSubscriptions,
    totalMonthlySubscriptions,
    totalYearlySubscriptions,
    totalRevenue,
    subscriptionDistribution,
    revenueDistribution,
    planDistribution: {
      monthly: {
        count: totalMonthlySubscriptions,
        percentage: monthlyPercentage
      },
      yearly: {
        count: totalYearlySubscriptions,
        percentage: yearlyPercentage
      }
    },
    topProductsBySubscriptions,
    topProductsByRevenue,
    monthlyTrends
  };
}

/**
 * Calcula tendencias mensuales para todos los productos - CORREGIDO para usar earnings_eur
 * @param {Array} transactions - Lista de transacciones
 * @returns {Array} Tendencias mensuales
 */
calculateMonthlyTrendsForAllProducts(transactions) {
  // Similar a calculateMonthlyTrendsForProduct pero para todos los productos
  const today = new Date();
  const monthsMap = {};
  
  // Inicializar últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(date);
    
    monthsMap[monthKey] = {
      key: monthKey,
      label: monthLabel,
      transactions: 0,
      revenue: 0,
      subscriptions: 0,
      cancelations: 0
    };
  }
  
  // Agrupar transacciones por mes - CORREGIDO para usar earnings_eur
  transactions.forEach(tx => {
    if (!tx.updated_at && !tx.created_at) return;
    
    const txDate = new Date(tx.updated_at || tx.created_at);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Solo procesar si está en uno de los últimos 12 meses
    if (monthsMap[monthKey]) {
      monthsMap[monthKey].transactions++;
      
      // CORRECCIÓN: Priorizar earnings_eur para ingresos reales
      if (tx.earnings_eur !== undefined && tx.earnings_eur !== null) {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.earnings_eur);
      }
      // Fallback a amount_eur
      else if (tx.amount_eur !== undefined && tx.amount_eur !== null) {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.amount_eur);
      }
      // Cálculo manual usando earnings original y tasa de cambio
      else if (tx.earnings && tx.currency_code !== 'EUR' && tx.exchange_rate) {
        monthsMap[monthKey].revenue += (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
      }
      // Último fallback
      else {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.earnings || tx.amount || 0);
      }
      
      // Contar como nueva suscripción si es una transacción inicial
      if (tx.event_type === 'subscription_created' || tx.event_type === 'subscription_payment') {
        monthsMap[monthKey].subscriptions++;
      }
      
      // Contar cancelaciones
      if (tx.event_type === 'subscription_canceled') {
        monthsMap[monthKey].cancelations++;
      }
    }
  });
  
  // Convertir a array ordenado por mes
  return Object.values(monthsMap).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Prepara los datos de productos para exportación
 * @param {Object} reportData - Datos del informe
 * @returns {Array} Datos formateados para exportación
 */
prepareProductsDataForExport(reportData) {
  if (!reportData.products || reportData.products.length === 0) {
    return [];
  }
  
  // Mapear productos a formato optimizado para Excel
  return reportData.products.map(product => {
    const stats = product.statistics || {};
    
    return {
      'ID': product.id_carrera,
      'Producto': product.nombre,
      'Suscripciones Activas': Number(stats.activeSubscriptions || 0),
      'Suscripciones Mensuales': Number(stats.monthlySubscriptions || 0),
      'Suscripciones Anuales': Number(stats.yearlySubscriptions || 0),
      'Ingresos Totales (EUR)': Number(stats.totalRevenue || 0),
      'Ingresos Mensuales (EUR)': Number(stats.monthlyRevenue || 0),
      'Ingresos Anuales (EUR)': Number(stats.yearlyRevenue || 0),
      'Cancelaciones': Number(stats.canceledSubscriptions || 0),
      'Tasa Cancelación (%)': Number(stats.cancelationRate || 0),
      'Total Transacciones': Number(stats.transactionsCount || 0),
      'Plan Mensual ID': product.month || '',
      'Plan Anual ID': product.year || ''
    };
  });
}


/**
 * Exporta un informe de productos con formato mejorado usando exportManager
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportProductsReportWithManager(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación
    const dataToExport = this.prepareProductsDataForExport(reportData);
    
    // Columnas que deben tener totales
    const columnsWithTotals = [
      'Suscripciones Activas', 
      'Suscripciones Mensuales', 
      'Suscripciones Anuales',
      'Ingresos Totales (EUR)', 
      'Ingresos Mensuales (EUR)', 
      'Ingresos Anuales (EUR)',
      'Cancelaciones',
      'Total Transacciones'
    ];
    
    // Configurar formatos específicos para columnas
    const currencyFormats = {
      'Ingresos Totales (EUR)': '€#,##0.00',
      'Ingresos Mensuales (EUR)': '€#,##0.00',
      'Ingresos Anuales (EUR)': '€#,##0.00'
    };
    
    // CORRECCIÓN: Asegurarse de que los campos específicos tienen formato entero
    const integerFormats = {
      'Suscripciones Activas': '#,##0',
      'Suscripciones Mensuales': '#,##0',
      'Suscripciones Anuales': '#,##0',
      'Cancelaciones': '#,##0',
      'Total Transacciones': '#,##0',
      'Tasa Cancelación (%)': '0.0"%"'
    };
    
    // MEJORA: Preparar datos de análisis para el informe
    // Preparar datos para el resumen de tipos de suscripción (mensual/anual)
    const planDistribution = {
      'Mensual': reportData.summary.planDistribution.monthly.count,
      'Anual': reportData.summary.planDistribution.yearly.count
    };
    
    // CORRECCIÓN: Incluir TODOS los productos, no solo top 5
    const topProducts = {};
    // Usar toda la lista de productos ordenada por ingresos
    const sortedProducts = [...reportData.products].sort(
      (a, b) => (b.statistics?.totalRevenue || 0) - (a.statistics?.totalRevenue || 0)
    );
    
    // Añadir todos los productos con ingresos positivos
    sortedProducts.forEach(product => {
      if (product.statistics?.totalRevenue > 0) {
        topProducts[product.nombre] = {
          revenue: product.statistics.totalRevenue,
          percentage: reportData.summary.totalRevenue > 0 
            ? (product.statistics.totalRevenue / reportData.summary.totalRevenue) * 100 
            : 0
        };
      }
    });
    
    // Configurar opciones avanzadas para exportManager
    const exportOptions = {
      fileName,
      format: options.format || 'excel',
      sheetName: 'Productos',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: true,
      includeTotals: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      columnsWithTotals,
      currencyFormats,
      integerFormats, // NUEVO: Formatos para campos enteros
      
      // Añadir información de periodo
      period: reportData.period,
      
      // Opciones para análisis de productos
      productAnalysis: {
        totalRevenue: reportData.summary.totalRevenue,
        totalSubscriptions: reportData.summary.totalActiveSubscriptions,
        planDistribution,
        topProducts
      }
    };
    
    // Exportar usando exportManager
    exportManager.exportData(dataToExport, exportOptions);
  } catch (error) {
    console.error('Error al exportar informe de productos:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe. Revise la consola para más detalles.');
  }
}
  
  /**
   * Cuenta suscriptores por producto
   * @param {string|number} productId - ID del producto
   * @returns {number} Número de suscriptores
   */
  countSubscribersByProduct(productId) {
    return this.subscriptions.filter(s => s.product_id == productId && s.status === 'active').length;
  }
  
  /**
   * Calcula ingresos por producto
   * @param {string|number} productId - ID del producto
   * @returns {number} Ingresos totales
   */
  calculateRevenueByProduct(productId) {
    return this.transactions
      .filter(t => t.product_id == productId)
      .reduce((sum, t) => sum + this.normalizeAmount(t.amount), 0);
  }
  
/**
 * Genera un informe integral con información de todas las áreas
 * @param {Object} options - Opciones del informe
 */
async generateComprehensiveReport(options) {
  try {
    // Mostrar indicador de carga
    this.ui.showLoading('Generando informe integral...');

    // Cargar todos los datos necesarios
    if (!this.loadRequiredData()) {
      await this.loadRequiredData();
    }

    console.log('Generando informe integral con opciones:', options);

    // Filtrar datos por fecha si es necesario
    let filteredTransactions = this.transactions;
    let filteredSubscriptions = this.subscriptions;
    let filteredExpenses = this.expenses || [];
    
    if (options.dateRange) {
      console.log('Filtrando por rango de fechas:', options.dateRange);
      
      // Asegurar que las fechas sean objetos Date y válidas
      let startDate = null;
      let endDate = null;
      
      if (options.dateRange.start) {
        startDate = options.dateRange.start instanceof Date 
          ? new Date(options.dateRange.start) 
          : new Date(options.dateRange.start);
        startDate.setHours(0, 0, 0, 0); // Inicio del día
      }
      
      if (options.dateRange.end) {
        endDate = options.dateRange.end instanceof Date 
          ? new Date(options.dateRange.end) 
          : new Date(options.dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Fin del día
      }
      
      // Verificar que las fechas sean válidas antes de filtrar
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // Filtrar transacciones por fecha
        filteredTransactions = this.transactions.filter(transaction => {
          if (!transaction.updated_at && !transaction.created_at) return false;
          
          const txDate = new Date(transaction.updated_at || transaction.created_at);
          txDate.setHours(12, 0, 0, 0); // Normalizar a mediodía
          
          if (isNaN(txDate.getTime())) return false;
          
          return txDate >= startDate && txDate <= endDate;
        });

        // Filtrar suscripciones por fecha (incluir todas para análisis tendencial pero marcarlas en el período correcto)
        filteredSubscriptions = this.subscriptions;

        // Filtrar egresos por fecha
        filteredExpenses = this.expenses.filter(expense => {
          if (!expense.date) return false;
          
          const expenseDate = new Date(expense.date);
          expenseDate.setHours(12, 0, 0, 0); // Normalizar a mediodía
          
          if (isNaN(expenseDate.getTime())) return false;
          
          return expenseDate >= startDate && expenseDate <= endDate;
        });
        
        console.log(`Filtrado completado: ${filteredTransactions.length} transacciones, ${filteredSubscriptions.length} suscripciones, ${filteredExpenses.length} egresos`);
      }
    }

    // Obtener productos
    let products = await this.api.getProducts();

    // Calcular todos los resúmenes para el informe integral
    const executiveSummary = this.calculateExecutiveSummary(
      filteredTransactions, 
      filteredSubscriptions, 
      filteredExpenses, 
      this.users,
      products
    );

    // Calcular resumen de ingresos
    const revenueSummary = this.calculateRevenueSummary(filteredTransactions);

    // Calcular resumen de suscripciones
    const subscriptionSummary = this.calculateSubscriptionsSummary(filteredSubscriptions);

    // Calcular resumen de impuestos
    const taxSummary = this.calculateTaxSummary(filteredTransactions);

    // Calcular resumen de egresos
    const expensesSummary = this.calculateExpensesSummary(filteredExpenses);

    // Calcular estadísticas de productos - CORRECCIÓN: Pasar todas las suscripciones
    const productsData = this.calculateProductsStatistics(products, filteredSubscriptions, filteredTransactions);
    const productsSummary = this.calculateProductsSummary(productsData, filteredSubscriptions, filteredTransactions);

    // Calcular tendencias mensuales - CORRECCIÓN: Pasar explícitamente las suscripciones
    const monthlyTrends = this.calculateMonthlyTrendsForComprehensiveReport(
      filteredTransactions, 
      filteredExpenses,
      filteredSubscriptions // NUEVO: Pasamos directamente las suscripciones
    );

    // Crear estructura del informe
    const reportData = {
      title: options.title || this.getReportTitle(options) || 'Informe Integral',
      period: options.period || this.formatDateRange(options.dateRange),
      generatedAt: new Date().toISOString(),
      executiveSummary,
      revenueSummary,
      subscriptionSummary,
      taxSummary,
      expensesSummary,
      productsSummary,
      monthlyTrends,
      dateRange: options.dateRange
    };

    // Exportar según formato seleccionado
    this.ui.hideLoading();
    await this.exportComprehensiveReport(reportData, options);
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage(`Informe integral generado correctamente en formato ${options.format.toUpperCase()}`);
  } catch (error) {
    this.ui.hideLoading();
    console.error('Error al generar informe integral:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el informe integral: ' + error.message);
  }
}

/**
 * Calcula el resumen ejecutivo para el informe integral - CORREGIDO para usar earnings_eur
 * @param {Array} transactions - Transacciones
 * @param {Array} subscriptions - Suscripciones
 * @param {Array} expenses - Egresos
 * @param {Array} users - Usuarios
 * @param {Array} products - Productos
 * @returns {Object} Resumen ejecutivo
 */
calculateExecutiveSummary(transactions, subscriptions, expenses, users, products) {
  // 1. Cálculos de ingresos
  const totalRevenue = transactions.reduce((sum, tx) => {
    // Priorizar earnings_eur si existe
    if (tx.earnings_eur !== undefined && tx.earnings_eur !== null) {
      return sum + this.normalizeAmount(tx.earnings_eur);
    }
    // Fallback a amount_eur si no hay earnings_eur
    else if (tx.amount_eur !== undefined && tx.amount_eur !== null) {
      return sum + this.normalizeAmount(tx.amount_eur);
    }
    // Último fallback
    else if (tx.currency_code !== 'EUR' && tx.exchange_rate && tx.earnings) {
      return sum + (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
    } else if (tx.currency_code !== 'EUR' && tx.exchange_rate && tx.amount) {
      return sum + (this.normalizeAmount(tx.amount) * tx.exchange_rate);
    } else {
      return sum + this.normalizeAmount(tx.earnings || tx.amount || 0);
    }
  }, 0);

  // 2. Cálculos de egresos - CORREGIDO para incluir amount + tax_amount
  const totalExpenses = expenses.reduce((sum, expense) => {
    // Sumar explícitamente amount + tax_amount
    return sum + parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0);
  }, 0);

  // 3. Ganancia neta
  const netIncome = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  // 4. Estadísticas de usuarios
  const activeUsers = users.length;
  
  // 5. Estadísticas de suscripciones
  // CORRECCIÓN: Incluir también suscripciones expiradas como canceladas
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'paused').length;
  const canceledSubscriptions = subscriptions.filter(sub => 
    sub.status === 'canceled' || sub.status === 'expired'
  ).length;
  const totalSubscriptions = subscriptions.length;
  
  // 6. Cálculo de métricas de retención y conversión
  const retentionRate = totalSubscriptions > 0 
    ? ((activeSubscriptions / totalSubscriptions) * 100).toFixed(2) 
    : 0;
  
  const conversionRate = users.length > 0 
    ? ((activeSubscriptions / users.length) * 100).toFixed(2)
    : 0;

  // 7. Valor promedio por suscripción
  const avgRevenuePerSub = activeSubscriptions > 0 
    ? (totalRevenue / activeSubscriptions).toFixed(2)
    : 0;

  // 8. Top productos
  const productRevenue = {};
  
  // Agrupar transacciones por producto - MODIFICADO para usar earnings_eur
  transactions.forEach(tx => {
    const productId = tx.product_id;
    if (!productId) return;
    
    // CORRECCIÓN: Mejorar la búsqueda del nombre del producto
    let productName = `Producto ${productId}`;
    const productObj = products.find(p => p.id_carrera == productId);
    if (productObj && productObj.nombre) {
      productName = productObj.nombre;
    } else if (tx.product_name) {
      productName = tx.product_name;
    } else if (tx.carrera_nombre) {
      productName = tx.carrera_nombre;
    }
    
    if (!productRevenue[productId]) {
      productRevenue[productId] = {
        id: productId,
        name: productName,
        revenue: 0,
        subscriptions: 0
      };
    }
    
    // CORRECCIÓN: Priorizar earnings_eur
    if (tx.earnings_eur !== undefined && tx.earnings_eur !== null) {
      productRevenue[productId].revenue += this.normalizeAmount(tx.earnings_eur);
    } 
    // Fallback a amount_eur
    else if (tx.amount_eur !== undefined && tx.amount_eur !== null) {
      productRevenue[productId].revenue += this.normalizeAmount(tx.amount_eur);
    } 
    // Último fallback: calcular basado en moneda original y tasa de cambio
    else if (tx.currency_code !== 'EUR' && tx.exchange_rate && tx.earnings) {
      productRevenue[productId].revenue += (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
    } else if (tx.currency_code !== 'EUR' && tx.exchange_rate && tx.amount) {
      productRevenue[productId].revenue += (this.normalizeAmount(tx.amount) * tx.exchange_rate);
    } else {
      productRevenue[productId].revenue += this.normalizeAmount(tx.earnings || tx.amount || 0);
    }
  });
  
  // Contar suscripciones activas por producto
  subscriptions.filter(sub => sub.status === 'active' || sub.status === 'paused').forEach(sub => {
    const productId = sub.product_id;
    if (!productId || !productRevenue[productId]) return;
    
    productRevenue[productId].subscriptions++;
  });
  
  // Ordenar productos por ingresos
  const topProducts = Object.values(productRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  return {
    totalRevenue,
    totalExpenses,
    totalExpenses,
    netIncome,
    profitMargin,
    activeUsers,
    activeSubscriptions,
    retentionRate,
    conversionRate,
    avgRevenuePerSub,
    topProducts,
    transactionCount: transactions.length,
    expenseCount: expenses.length,
    
    // Indicadores financieros adicionales
    revenueVsExpensesRatio: totalExpenses > 0 ? (totalRevenue / totalExpenses).toFixed(2) : 'N/A',
    revenuePerUser: activeUsers > 0 ? (totalRevenue / activeUsers).toFixed(2) : 0,
    expensesPerUser: activeUsers > 0 ? (totalExpenses / activeUsers).toFixed(2) : 0
  };
}

/**
 * Calcula tendencias mensuales para el informe integral - CORREGIDO para usar earnings_eur
 * @param {Array} transactions - Transacciones
 * @param {Array} expenses - Egresos
 * @param {Array} subscriptions - Suscripciones directamente
 * @returns {Object} Tendencias mensuales
 */
calculateMonthlyTrendsForComprehensiveReport(transactions, expenses, subscriptions = []) {
  // Obtener últimos 12 meses
  const today = new Date();
  const monthsMap = {};
  
  // Inicializar últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' }).format(date);
    
    monthsMap[monthKey] = {
      key: monthKey,
      label: monthLabel,
      revenue: 0,
      expenses: 0,
      netIncome: 0,
      subscriptions: 0,
      cancelations: 0,
      transactions: 0
    };
  }
  
  // Agrupar transacciones por mes para ingresos - CORREGIDO para usar earnings_eur
  transactions.forEach(tx => {
    if (!tx.updated_at && !tx.created_at) return;
    
    const txDate = new Date(tx.updated_at || tx.created_at);
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Solo procesar si está en uno de los últimos 12 meses
    if (monthsMap[monthKey]) {
      monthsMap[monthKey].transactions++;
      
      // CORRECCIÓN: Priorizar earnings_eur para el ingreso real
      if (tx.earnings_eur !== undefined && tx.earnings_eur !== null) {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.earnings_eur);
      }
      // Fallback a amount_eur
      else if (tx.amount_eur !== undefined && tx.amount_eur !== null) {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.amount_eur);
      }
      // Cálculo manual usando earnings original y tasa de cambio
      else if (tx.earnings && tx.currency_code !== 'EUR' && tx.exchange_rate) {
        monthsMap[monthKey].revenue += (this.normalizeAmount(tx.earnings) * tx.exchange_rate);
      }
      // Último fallback a amount con conversión
      else if (tx.currency_code !== 'EUR' && tx.exchange_rate && tx.amount) {
        monthsMap[monthKey].revenue += (this.normalizeAmount(tx.amount) * tx.exchange_rate);
      } else {
        monthsMap[monthKey].revenue += this.normalizeAmount(tx.earnings || tx.amount || 0);
      }
    }
  });
  
  // Procesar suscripciones directamente para contar nuevas y canceladas
  subscriptions.forEach(sub => {
    // Nuevas suscripciones - basadas en created_at
    if (sub.created_at) {
      const createdDate = new Date(sub.created_at);
      const createdMonthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthsMap[createdMonthKey]) {
        monthsMap[createdMonthKey].subscriptions++;
      }
    }
    
    // Cancelaciones/Expiraciones - basadas en updated_at cuando status es 'canceled' o 'expired'
    if ((sub.status === 'canceled' || sub.status === 'expired') && sub.updated_at) {
      const updatedDate = new Date(sub.updated_at);
      const updatedMonthKey = `${updatedDate.getFullYear()}-${String(updatedDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthsMap[updatedMonthKey]) {
        monthsMap[updatedMonthKey].cancelations++;
      }
    }
  });
  
  // Agrupar egresos por mes
  expenses.forEach(expense => {
    if (!expense.date) return;
    
    const expenseDate = new Date(expense.date);
    const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Solo procesar si está en uno de los últimos 12 meses
    if (monthsMap[monthKey]) {
      monthsMap[monthKey].expenses += parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0);
    }
  });
  
  // Calcular ingreso neto para cada mes
  Object.values(monthsMap).forEach(month => {
    month.netIncome = month.revenue - month.expenses;
  });
  
  // Convertir a array ordenado por mes
  return Object.values(monthsMap).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Exporta un informe integral completo 
 * @param {Object} reportData - Datos del informe
 * @param {Object} options - Opciones de exportación
 */
async exportComprehensiveReport(reportData, options) {
  try {
    // Nombre del archivo
    const fileName = `Informe_Integral_${new Date().toISOString().slice(0, 10)}`;
    
    switch (options.format) {
      case 'excel':
        await this.exportComprehensiveReportToExcel(reportData, fileName, options);
        break;
      case 'pdf':
        // CORRECCIÓN: Usar nuestra implementación personalizada en lugar del método genérico
        await this.exportComprehensiveReportToPDF(reportData, fileName, {
          ...options,
          logoUrl: '/images/Imagotipo.webp' // Asegurar que siempre tenga logoUrl
        });
        break;
      case 'csv':
        await this.exportReportToCsv(reportData, fileName);
        break;
      default:
        await this.exportComprehensiveReportToExcel(reportData, fileName, options);
    }
  } catch (error) {
    console.error('Error al exportar informe integral:', error);
    throw error;
  }
}

/**
 * Exporta un informe integral a Excel con formato avanzado
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 */
async exportComprehensiveReportToExcel(reportData, fileName, options) {
  try {
    const Excel = window.ExcelJS;
    if (!Excel) {
      console.error('ExcelJS no está disponible');
      // Fallback al método tradicional
      return this.exportReportToExcel(reportData, fileName);
    }
    
    const workbook = new Excel.Workbook();
    
    // Configurar propiedades del documento
    workbook.creator = 'Acadelia';
    workbook.lastModifiedBy = 'Acadelia';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Crear hoja principal
    const worksheet = workbook.addWorksheet('Informe Integral', {
      views: [{ showGridLines: true }],
      properties: { tabColor: { argb: '656d4a' } }
    });
    
    // Añadir encabezado corporativo (sin logo para evitar el error)
    this.addSimpleHeaderToWorksheet(worksheet, {
      title: reportData.title,
      period: reportData.period
    });
    
    // =========== SECCIÓN 1: RESUMEN EJECUTIVO ===========
    this.addExecutiveSummarySection(worksheet, reportData.executiveSummary);
    
    // =========== SECCIÓN 2: ANÁLISIS FINANCIERO ===========
    this.addFinancialAnalysisSection(worksheet, reportData);
    
    // =========== SECCIÓN 3: ANÁLISIS DE SUSCRIPCIONES ===========
    this.addSubscriptionAnalysisSection(worksheet, reportData);
    
    // =========== SECCIÓN 4: ANÁLISIS DE PRODUCTOS ===========
    this.addProductAnalysisSection(worksheet, reportData);
    
    // =========== SECCIÓN 5: TENDENCIAS MENSUALES ===========
    this.addMonthlyTrendsSection(worksheet, reportData.monthlyTrends);
    
    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = Math.max(15, column.width || 15);
    });
    
    // Configuración de impresión
    worksheet.pageSetup = {
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      orientation: 'portrait',
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    };
    
    // Generar archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Crear blob y descargar
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    this.downloadBlob(blob, `${fileName}.xlsx`);
    
    console.log('Informe integral exportado correctamente');
    return true;
  } catch (error) {
    console.error('Error al exportar informe integral a Excel:', error);
    // Fallback al método tradicional
    return this.exportReportToExcel(reportData, fileName);
  }
}

/**
 * Añade un encabezado simple a una hoja de trabajo (sin imagen)
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Object} options - Opciones del encabezado
 */
addSimpleHeaderToWorksheet(worksheet, options) {
  // Fusionar celdas para el título
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = options.title;
  titleCell.font = {
    name: 'Poppins',
    size: 18,
    bold: true,
    color: { argb: '582f0e' }
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;
  
  // Añadir período
  worksheet.mergeCells('A2:G2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Período: ${options.period}`;
  periodCell.font = {
    name: 'Poppins',
    size: 11,
    italic: true
  };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Añadir fecha de generación
  worksheet.mergeCells('A3:G3');
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `Generado el: ${new Date().toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })}`;
  dateCell.font = {
    name: 'Poppins',
    size: 10,
    italic: true
  };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Línea separadora
  worksheet.addRow([]);
  const separatorRow = worksheet.addRow(['']);
  separatorRow.height = 6;
  separatorRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  worksheet.mergeCells(`A${separatorRow.number}:G${separatorRow.number}`);
  
  // Espacio adicional después del encabezado
  worksheet.addRow([]);
}

/**
 * Añade el encabezado corporativo a una hoja de trabajo
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Object} workbook - Libro de trabajo
 * @param {Object} options - Opciones del encabezado
 */
addCorporateHeaderToWorksheet(worksheet, workbook, options) {
  // Fusionar celdas para el título
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = options.title;
  titleCell.font = {
    name: 'Poppins',
    size: 18,
    bold: true,
    color: { argb: '582f0e' }
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;
  
  // Añadir período
  worksheet.mergeCells('A2:G2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Período: ${options.period}`;
  periodCell.font = {
    name: 'Poppins',
    size: 11,
    italic: true
  };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Añadir fecha de generación
  worksheet.mergeCells('A3:G3');
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `Generado el: ${new Date().toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })}`;
  dateCell.font = {
    name: 'Poppins',
    size: 10,
    italic: true
  };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Línea separadora
  worksheet.addRow([]);
  const separatorRow = worksheet.addRow(['']);
  separatorRow.height = 6;
  separatorRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  worksheet.mergeCells(`A${separatorRow.number}:G${separatorRow.number}`);
  
  // Intentar añadir la imagen del logo si está disponible
  try {
    if (options.logoUrl) {
      // Este código depende de la implementación específica en export.js
      // y puede requerir ajustes según tu implementación
      const logoId = workbook.addImage({
        uri: options.logoUrl,
        extension: 'png',
      });
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 100, height: 50 }
      });
    }
  } catch (error) {
    console.warn('No se pudo añadir el logo al informe:', error);
  }
  
  // Espacio adicional después del encabezado
  worksheet.addRow([]);
}

/**
 * Añade la sección de resumen ejecutivo al informe
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Object} executiveSummary - Datos del resumen ejecutivo
 */
addExecutiveSummarySection(worksheet, executiveSummary) {
  // Título de la sección
  const titleRow = worksheet.addRow(['RESUMEN EJECUTIVO']);
  titleRow.font = {
    name: 'Poppins',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFF' }
  };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 24;
  worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  
  // Crear tabla de resumen en dos columnas
  worksheet.addRow([]);
  
  // Primera fila: Ingresos y Egresos
  const row1 = worksheet.addRow(['Ingresos Totales', executiveSummary.totalRevenue, '', 'Egresos Totales', executiveSummary.totalExpenses]);
  row1.getCell(2).numFmt = '€#,##0.00';
  row1.getCell(5).numFmt = '€#,##0.00';
  row1.font = { bold: true };
  
  // Segunda fila: Ganancia Neta y Margen
  const row2 = worksheet.addRow(['Ganancia Neta', executiveSummary.netIncome, '', 'Margen de Beneficio', `${executiveSummary.profitMargin.toFixed(2)}%`]);
  row2.getCell(2).numFmt = '€#,##0.00';
  if (executiveSummary.netIncome < 0) {
    row2.getCell(2).font = { bold: true, color: { argb: 'FF0000' } };
  } else {
    row2.getCell(2).font = { bold: true, color: { argb: '008000' } };
  }
  row2.font = { bold: true };
  
  // Tercera fila: Usuarios y Suscripciones
  const row3 = worksheet.addRow(['Usuarios Activos', executiveSummary.activeUsers, '', 'Suscripciones Activas', executiveSummary.activeSubscriptions]);
  row3.getCell(2).numFmt = '#,##0';
  row3.getCell(5).numFmt = '#,##0';
  
  // Cuarta fila: Tasas
  const row4 = worksheet.addRow(['Tasa de Retención', `${executiveSummary.retentionRate}%`, '', 'Tasa de Conversión', `${executiveSummary.conversionRate}%`]);
  
  // Quinta fila: Promedio por suscripción
  const row5 = worksheet.addRow(['Ingreso Promedio por Suscripción', executiveSummary.avgRevenuePerSub, '', 'Ratio Ingresos/Gastos', executiveSummary.revenueVsExpensesRatio]);
  row5.getCell(2).numFmt = '€#,##0.00';
  
  // Sexta fila: Top Productos (cabecera)
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(['TOP 3 PRODUCTOS POR INGRESOS']);
  headerRow.font = { bold: true };
  worksheet.mergeCells(`A${headerRow.number}:G${headerRow.number}`);
  headerRow.alignment = { horizontal: 'center' };
  
  // Añadir top productos
  worksheet.addRow(['Producto', 'Ingresos', '', 'Suscripciones Activas']);
  executiveSummary.topProducts.forEach(product => {
    const productRow = worksheet.addRow([product.name, product.revenue, '', product.subscriptions]);
    productRow.getCell(2).numFmt = '€#,##0.00';
    productRow.getCell(4).numFmt = '#,##0';
  });
  
  // Espacio después de la sección
  worksheet.addRow([]);
  worksheet.addRow([]);
}

/**
 * Añade la sección de análisis financiero al informe
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Object} reportData - Datos del informe
 */
addFinancialAnalysisSection(worksheet, reportData) {
  // Título de la sección
  const titleRow = worksheet.addRow(['ANÁLISIS FINANCIERO']);
  titleRow.font = {
    name: 'Poppins',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFF' }
  };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 24;
  worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  
  // Espacio después del título
  worksheet.addRow([]);
  
  // Subtítulo: Desglose de Ingresos
  const subtitleRow1 = worksheet.addRow(['DESGLOSE DE INGRESOS']);
  subtitleRow1.font = { bold: true };
  subtitleRow1.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e2ddd6' }
  };
  worksheet.mergeCells(`A${subtitleRow1.number}:G${subtitleRow1.number}`);
  
  // Métodos de pago
  if (reportData.revenueSummary && reportData.revenueSummary.methods && reportData.revenueSummary.methods.length > 0) {
    // Cabecera de métodos de pago
    worksheet.addRow(['Método de Pago', 'Importe', '%', '', 'Transacciones', '%']);
    
    // CORRECCIÓN: calcular correctamente los porcentajes
    const totalRevenue = reportData.revenueSummary.totalRevenue || 1; // Evitar división por cero
    const totalTransactions = reportData.revenueSummary.transactionCount || 1; // Evitar división por cero
    
    // Datos de métodos de pago
    reportData.revenueSummary.methods.forEach(method => {
      const methodRow = worksheet.addRow([
        method.method, 
        method.total, 
        method.total / totalRevenue, // Para formato de porcentaje
        '',
        method.count,
        method.count / totalTransactions // Para formato de porcentaje
      ]);
      methodRow.getCell(2).numFmt = '€#,##0.00';
      methodRow.getCell(3).numFmt = '0.0%';
      methodRow.getCell(5).numFmt = '#,##0';
      methodRow.getCell(6).numFmt = '0.0%';
    });
  }
  
  // Espacio
  worksheet.addRow([]);
  
  // Subtítulo: Desglose de Egresos
  const subtitleRow2 = worksheet.addRow(['DESGLOSE DE EGRESOS']);
  subtitleRow2.font = { bold: true };
  subtitleRow2.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e2ddd6' }
  };
  worksheet.mergeCells(`A${subtitleRow2.number}:G${subtitleRow2.number}`);
  
  // Categorías de egresos
  if (reportData.expensesSummary && reportData.expensesSummary.categoryDistribution && reportData.expensesSummary.categoryDistribution.length > 0) {
    // Cabecera de categorías
    worksheet.addRow(['Categoría', 'Importe', '%', '', 'Cantidad', '%']);
    
    // CORRECCIÓN: calcular correctamente los porcentajes
    const totalExpenses = reportData.expensesSummary.totalAmount || 1; // Evitar división por cero
    const totalExpensesCount = reportData.expensesSummary.totalExpenses || 1; // Evitar división por cero
    
    // Datos de categorías
    reportData.expensesSummary.categoryDistribution.slice(0, 5).forEach(category => {
      const categoryRow = worksheet.addRow([
        category.name, 
        category.total, 
        category.total / totalExpenses, // Para formato de porcentaje
        '',
        category.count,
        category.count / totalExpensesCount // Para formato de porcentaje
      ]);
      categoryRow.getCell(2).numFmt = '€#,##0.00';
      categoryRow.getCell(3).numFmt = '0.0%';
      categoryRow.getCell(5).numFmt = '#,##0';
      categoryRow.getCell(6).numFmt = '0.0%';
    });
  }
  
  // Resumen de impuestos
  worksheet.addRow([]);
  const subtitleRow3 = worksheet.addRow(['RESUMEN DE IMPUESTOS']);
  subtitleRow3.font = { bold: true };
  subtitleRow3.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e2ddd6' }
  };
  worksheet.mergeCells(`A${subtitleRow3.number}:G${subtitleRow3.number}`);
  
  // IVA total recaudado
  const taxRow1 = worksheet.addRow(['IVA Total Recaudado', reportData.taxSummary.totalTax]);
  taxRow1.getCell(2).numFmt = '€#,##0.00';
  taxRow1.font = { bold: true };
  
  // IVA España vs Resto
  if (reportData.taxSummary.spainTax !== undefined && reportData.taxSummary.otherTax !== undefined) {
    const taxRow2 = worksheet.addRow(['IVA España', reportData.taxSummary.spainTax, '', 'IVA Otros Países', reportData.taxSummary.otherTax]);
    taxRow2.getCell(2).numFmt = '€#,##0.00';
    taxRow2.getCell(5).numFmt = '€#,##0.00';
  }
  
  // Egresos deducibles
  if (reportData.expensesSummary && reportData.expensesSummary.deductible) {
    const taxRow3 = worksheet.addRow([
      'Gastos Deducibles', 
      reportData.expensesSummary.deductible.amount,
      '',
      'IVA Deducible',
      reportData.expensesSummary.deductible.tax
    ]);
    taxRow3.getCell(2).numFmt = '€#,##0.00';
    taxRow3.getCell(5).numFmt = '€#,##0.00';
  }
  
  // Espacio después de la sección
  worksheet.addRow([]);
  worksheet.addRow([]);
}

/**
 * Añade la sección de análisis de suscripciones al informe - CORREGIDO
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Object} reportData - Datos del informe
 */
addSubscriptionAnalysisSection(worksheet, reportData) {
  // Título de la sección
  const titleRow = worksheet.addRow(['ANÁLISIS DE SUSCRIPCIONES']);
  titleRow.font = {
    name: 'Poppins',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFF' }
  };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 24;
  worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  
  // Espacio después del título
  worksheet.addRow([]);
  
  // Resumen de estado de suscripciones
  const summaryRow = worksheet.addRow(['RESUMEN POR ESTADO']);
  summaryRow.font = { bold: true };
  summaryRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e2ddd6' }
  };
  worksheet.mergeCells(`A${summaryRow.number}:G${summaryRow.number}`);
  
  // Cabecera de estados
  worksheet.addRow(['Estado', 'Cantidad', '%']);
  
  // Datos de estados
  if (reportData.subscriptionSummary) {
    const sub = reportData.subscriptionSummary;
    const totalSubs = sub.total || 1; // Evitar división por cero
    
    // CORRECCIÓN: incluir expiradas como canceladas y corregir cálculo de porcentajes
    // Activas
    const activeRow = worksheet.addRow(['Activas', sub.active, sub.active / totalSubs]);
    activeRow.getCell(2).numFmt = '#,##0';
    activeRow.getCell(3).numFmt = '0.0%';
    activeRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e6ffea' } // Verde claro
    };
    
    // Pausadas
    const pausedRow = worksheet.addRow(['Pausadas', sub.paused, sub.paused / totalSubs]);
    pausedRow.getCell(2).numFmt = '#,##0';
    pausedRow.getCell(3).numFmt = '0.0%';
    pausedRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'fff8e1' } // Amarillo claro
    };
    
    // Combinamos canceladas y expiradas para la visualización
    const canceledCount = sub.canceled + (sub.expired || 0);
    const canceledRow = worksheet.addRow(['Canceladas', canceledCount, canceledCount / totalSubs]);
    canceledRow.getCell(2).numFmt = '#,##0';
    canceledRow.getCell(3).numFmt = '0.0%';
    canceledRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ffebee' } // Rojo claro
    };
    
    // Distribución por producto (si está disponible)
    if (sub.products && sub.products.length > 0) {
      worksheet.addRow([]);
      const productsRow = worksheet.addRow(['DISTRIBUCIÓN POR PRODUCTO']);
      productsRow.font = { bold: true };
      productsRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e2ddd6' }
      };
      worksheet.mergeCells(`A${productsRow.number}:G${productsRow.number}`);
      
      // Cabecera de productos
      worksheet.addRow(['Producto', 'Activas', 'Pausadas', 'Canceladas', 'Total']);
      
      // Datos de productos
      sub.products.slice(0, 5).forEach(product => {
        // CORRECCIÓN: Sumar explícitamente active + paused para Activas
        const activeSubs = product.active + product.paused;
        const canceledSubs = product.canceled + (product.expired || 0); // CORRECCIÓN: incluir expiradas
        
        const productRow = worksheet.addRow([
          product.name,
          activeSubs, // CORRECCIÓN: active + paused 
          product.paused,
          canceledSubs, // CORRECCIÓN: incluir expiradas
          product.total
        ]);
        productRow.getCell(2).numFmt = '#,##0';
        productRow.getCell(3).numFmt = '#,##0';
        productRow.getCell(4).numFmt = '#,##0';
        productRow.getCell(5).numFmt = '#,##0';
      });
    }
    
    // Métricas adicionales
    worksheet.addRow([]);
    const metricsRow = worksheet.addRow(['MÉTRICAS CLAVE']);
    metricsRow.font = { bold: true };
    metricsRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e2ddd6' }
    };
    worksheet.mergeCells(`A${metricsRow.number}:G${metricsRow.number}`);
    
    // CORRECCIÓN: Usar el valor correcto de tasa de cancelación
    const cancelationRateValue = sub.cancelationRate !== undefined ? sub.cancelationRate : 0;
    worksheet.addRow(['Tasa de Cancelación', `${cancelationRateValue.toFixed(2)}%`]);
    
    // Ingresos mensuales vs anuales (si están disponibles)
    if (reportData.executiveSummary.monthlyRevenue !== undefined && reportData.executiveSummary.yearlyRevenue !== undefined) {
      const revenueRow = worksheet.addRow([
        'Ingresos de Planes Mensuales', 
        reportData.executiveSummary.monthlyRevenue,
        '',
        'Ingresos de Planes Anuales',
        reportData.executiveSummary.yearlyRevenue
      ]);
      revenueRow.getCell(2).numFmt = '€#,##0.00';
      revenueRow.getCell(5).numFmt = '€#,##0.00';
    }
  }
  
  // Espacio después de la sección
  worksheet.addRow([]);
  worksheet.addRow([]);
}

/**
 * Añade la sección de análisis de productos al informe - CORREGIDO
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Object} reportData - Datos del informe
 */
addProductAnalysisSection(worksheet, reportData) {
  // Título de la sección
  const titleRow = worksheet.addRow(['ANÁLISIS DE PRODUCTOS']);
  titleRow.font = {
    name: 'Poppins',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFF' }
  };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 24;
  worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  
  // Espacio después del título
  worksheet.addRow([]);
  
  // Top productos por ingresos
  const revenueRow = worksheet.addRow(['TOP PRODUCTOS POR INGRESOS']);
  revenueRow.font = { bold: true };
  revenueRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e2ddd6' }
  };
  worksheet.mergeCells(`A${revenueRow.number}:G${revenueRow.number}`);
  
  // Cabecera
  worksheet.addRow(['Producto', 'Ingresos', '%', '', 'Suscripciones Activas']);
  
  // CORRECCIÓN: Usar correctamente topProductsByRevenue
  if (reportData.productsSummary && reportData.productsSummary.topProductsByRevenue) {
    console.log("Datos de productos encontrados:", reportData.productsSummary.topProductsByRevenue);
    
    reportData.productsSummary.topProductsByRevenue.forEach(product => {
      console.log(`Procesando producto ${product.name}: ingresos=${product.revenue}, suscripciones=${product.subscriptions}`);
      
      const productRow = worksheet.addRow([
        product.name,
        product.revenue,
        product.revenuePercentage / 100, // Asegurar formato correcto de porcentaje
        '',
        product.subscriptions || 0 
      ]);
      productRow.getCell(2).numFmt = '€#,##0.00';
      productRow.getCell(3).numFmt = '0.0%';
      productRow.getCell(5).numFmt = '#,##0';
    });
  } else if (reportData.executiveSummary && reportData.executiveSummary.topProducts) {
    // Usar datos del resumen ejecutivo si no hay datos específicos
    console.log("Usando datos de resumen ejecutivo como alternativa");
    
    reportData.executiveSummary.topProducts.forEach(product => {
      const productRow = worksheet.addRow([
        product.name,
        product.revenue,
        product.revenue / (reportData.executiveSummary.totalRevenue || 1),
        '',
        product.subscriptions || 0
      ]);
      productRow.getCell(2).numFmt = '€#,##0.00';
      productRow.getCell(3).numFmt = '0.0%';
      productRow.getCell(5).numFmt = '#,##0';
    });
  } else {
    console.warn("No se encontraron datos de productos para mostrar");
  }
  
  // Distribución de tipos de plan (mensual vs anual)
  if (reportData.productsSummary && reportData.productsSummary.planDistribution) {
    worksheet.addRow([]);
    const planRow = worksheet.addRow(['DISTRIBUCIÓN DE PLANES']);
    planRow.font = { bold: true };
    planRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e2ddd6' }
    };
    worksheet.mergeCells(`A${planRow.number}:G${planRow.number}`);
    
    // Cabecera
    worksheet.addRow(['Tipo de Plan', 'Suscripciones', '%']);
    
    // CORRECCIÓN: calcular correctamente los porcentajes
    const monthly = reportData.productsSummary.planDistribution.monthly;
    const yearly = reportData.productsSummary.planDistribution.yearly;
    const totalPlans = (monthly.count || 0) + (yearly.count || 0) || 1; // Evitar división por cero
    
    // Planes mensuales
    const monthlyRow = worksheet.addRow([
      'Mensual',
      monthly.count || 0,
      (monthly.count || 0) / totalPlans  // Para formato de porcentaje
    ]);
    monthlyRow.getCell(2).numFmt = '#,##0';
    monthlyRow.getCell(3).numFmt = '0.0%';
    
    // Planes anuales
    const yearlyRow = worksheet.addRow([
      'Anual',
      yearly.count || 0,
      (yearly.count || 0) / totalPlans  // Para formato de porcentaje
    ]);
    yearlyRow.getCell(2).numFmt = '#,##0';
    yearlyRow.getCell(3).numFmt = '0.0%';
  }
  
  // Espacio después de la sección
  worksheet.addRow([]);
  worksheet.addRow([]);
}

/**
 * Añade la sección de tendencias mensuales al informe
 * @param {Object} worksheet - Hoja de trabajo
 * @param {Array} monthlyTrends - Datos de tendencias mensuales
 */
addMonthlyTrendsSection(worksheet, monthlyTrends) {
  // Título de la sección
  const titleRow = worksheet.addRow(['TENDENCIAS MENSUALES']);
  titleRow.font = {
    name: 'Poppins',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFF' }
  };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 24;
  worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '656d4a' }
  };
  
  // Espacio después del título
  worksheet.addRow([]);
  
  // Cabecera de tendencias
  worksheet.addRow(['Mes', 'Ingresos', 'Egresos', 'Beneficio Neto', 'Nuevas Suscripciones', 'Cancelaciones']);
  
  // Datos de tendencias por mes
  if (monthlyTrends && monthlyTrends.length > 0) {
    monthlyTrends.forEach(month => {
      const monthRow = worksheet.addRow([
        month.label,
        month.revenue,
        month.expenses,
        month.netIncome,
        month.subscriptions || 0, // CORRECCIÓN: asegurar valor
        month.cancelations || 0   // CORRECCIÓN: asegurar valor
      ]);
      monthRow.getCell(2).numFmt = '€#,##0.00';
      monthRow.getCell(3).numFmt = '€#,##0.00';
      monthRow.getCell(4).numFmt = '€#,##0.00';
      monthRow.getCell(5).numFmt = '#,##0'; // Formato entero
      monthRow.getCell(6).numFmt = '#,##0'; // Formato entero
      
      // Colorear celdas de beneficio neto según sea positivo o negativo
      if (month.netIncome < 0) {
        monthRow.getCell(4).font = { color: { argb: 'FF0000' } };
      } else {
        monthRow.getCell(4).font = { color: { argb: '008000' } };
      }
    });
  }
  
  // Espacio después de la sección
  worksheet.addRow([]);
  
  // Añadir nota final
  const noteRow = worksheet.addRow(['NOTA: Este informe integral proporciona una visión general del rendimiento de la empresa. Para análisis más detallados, consulte los informes específicos.']);
  noteRow.font = { italic: true };
  worksheet.mergeCells(`A${noteRow.number}:G${noteRow.number}`);
  
  // Espacio final
  worksheet.addRow([]);
}

/**
 * Crea un Blob y lo descarga como archivo
 * @param {Blob} blob - Blob a descargar
 * @param {string} fileName - Nombre del archivo
 */
downloadBlob(blob, fileName) {
  // Crear URL para el Blob
  const url = window.URL.createObjectURL(blob);
  
  // Crear enlace de descarga
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // Añadir al documento, simular clic y eliminar
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}
  
/**
 * Exporta un informe según el tipo y formato especificado
 * @param {Object} reportData - Datos del informe
 * @param {Object} options - Opciones de exportación
 */
exportReport(reportData, options) {
  // Nombre del archivo
  const fileName = `${reportData.title.replace(/\s+/g, '_')}`;
  
  // Verificar el formato seleccionado
  const format = options.format.toLowerCase();
  
  // Registro para diagnóstico
  console.log(`Exportando informe: ${reportData.title} en formato: ${format}`);
  
  // Verificar tipo de informe
  if (reportData.title.startsWith('Informe de Ingresos')) {
    if (format === 'pdf') {
      return this.exportRevenueReportToPDF(reportData, fileName, options);
    } else {
      return this.exportRevenueReportWithManager(reportData, fileName, options);
    }
  } else if (reportData.title.startsWith('Informe de Impuestos')) {
    if (format === 'pdf') {
      // Usar la implementación personalizada para PDF de impuestos
      return this.exportTaxReportToPDF(reportData, fileName, {
        ...options,
        logoUrl: '/images/Imagotipo.webp' // Asegurar que siempre tenga logoUrl
      });
    } else {
      return this.exportTaxReportWithManager(reportData, fileName, options);
    }
  } else if (reportData.title.startsWith('Informe de Suscripciones')) {
    if (format === 'pdf') {
      return this.exportSubscriptionsReportToPDF(reportData, fileName, options);
    } else {
      return this.exportSubscriptionsReportWithManager(reportData, fileName, options);
    }
  } else if (reportData.title.startsWith('Informe de Usuarios')) {
    if (format === 'pdf') {
      return this.exportUsersReportToPDF(reportData, fileName, options);
    } else {
      return this.exportUsersReportWithManager(reportData, fileName, options);
    }
  } else if (reportData.title.startsWith('Informe de Egresos')) {
    if (format === 'pdf') {
      return this.exportExpensesReportToPDF(reportData, fileName, options);
    } else {
      return this.exportExpensesReportWithManager(reportData, fileName, options);
    }
  } else if (reportData.title.startsWith('Informe de Productos')) {
    if (format === 'pdf') {
      // Usar la implementación personalizada para PDF de productos
      return this.exportProductsReportToPDF(reportData, fileName, {
        ...options,
        logoUrl: '/images/Imagotipo.webp' // Asegurar que siempre tenga logoUrl
      });
    } else {
      return this.exportProductsReportWithManager(reportData, fileName, options);
    }
  } else if (reportData.title.startsWith('Informe Integral')) {
    if (format === 'pdf') {
      // Usar la implementación personalizada para PDF de informe integral
      return this.exportComprehensiveReportToPDF(reportData, fileName, {
        ...options,
        logoUrl: '/images/Imagotipo.webp' // Asegurar que siempre tenga logoUrl
      });
    } else {
      return this.exportComprehensiveReportToExcel(reportData, fileName, options);
    }
  } else {
    // Para otros tipos, mantener el comportamiento original
    switch (format) {
      case 'excel':
      case 'xlsx':
        return this.exportReportToExcel(reportData, fileName);
      case 'pdf':
        return this.exportReportToPdf(reportData, fileName);
      case 'csv':
        return this.exportReportToCsv(reportData, fileName);
      default:
        return this.exportReportToExcel(reportData, fileName);
    }
  }
}
  
  /**
   * Exporta un informe de ingresos con formato mejorado usando exportManager
   * @param {Object} reportData - Datos del informe
   * @param {string} fileName - Nombre del archivo base
   * @param {Object} options - Opciones de exportación
   */
  exportRevenueReportWithManager(reportData, fileName, options) {
    try {
      // Preparar los datos para exportación en formato optimizado
      const dataToExport = this.prepareRevenueDataForExport(reportData);
      
      // Configurar columnas con totales (usar los campos exactos de tu estructura)
      const columnsWithTotals = [
        'Importe (EUR)', 
        'IVA (EUR)', 
        'Tarifa (EUR)',
        'Ingreso Neto (EUR)'
      ];
      
      // Configurar formatos de moneda para columnas
      const currencyFormats = {
        'Importe': '#,##0.00',
        'Importe (EUR)': '[$€] #,##0.00',
        'IVA': '#,##0.00',
        'IVA (EUR)': '[$€] #,##0.00',
        'Tarifa': '#,##0.00',
        'Tarifa (EUR)': '[$€] #,##0.00',
        'Ingreso Neto': '#,##0.00',
        'Ingreso Neto (EUR)': '[$€] #,##0.00'
      };
      
      // Preparar análisis para el informe
      const reportAnalysis = this.prepareRevenueAnalysis(reportData);
      
      // Configurar opciones avanzadas para exportManager
      const exportOptions = {
        fileName,
        format: options.format || 'excel',
        sheetName: 'Ingresos',
        useAdvancedFormat: true,
        includeCompanyHeader: true,
        includeFilters: true,
        includeTotals: true,
        includeLogo: true,
        logoUrl: '/images/Imagotipo.webp',
        title: reportData.title,
        columnsWithTotals,
        currencyFormats,
        
        // Añadir información de periodo
        period: reportData.period,
        
        // Añadir análisis de transacciones
        transactionAnalysis: reportAnalysis
      };
      
      // Exportar usando exportManager
      exportManager.exportData(dataToExport, exportOptions);
      
      this.ui.showSuccessMessage(`Informe de ingresos exportado correctamente en formato ${options.format.toUpperCase()}`);
    } catch (error) {
      console.error('Error al exportar informe de ingresos:', error);
      this.ui.showErrorMessage('Error', 'No se pudo exportar el informe. Revise la consola para más detalles.');
    }
  }
  
/**
 * Prepara los datos de ingresos para exportación
 * @param {Object} reportData - Datos del informe
 * @returns {Array} Datos formateados para exportación
 */
prepareRevenueDataForExport(reportData) {
  if (!reportData.transactions || reportData.transactions.length === 0) {
    return [];
  }
  
  // Mapear transacciones a formato optimizado para Excel
  return reportData.transactions.map(transaction => {
    // CORRECCIÓN: Mejorar la lógica para obtener el nombre del producto
    // Priorizar product_name, luego carrera_nombre, y finalmente construir con product_id
    const productName = 
      (transaction.product_name && transaction.product_name.trim()) || 
      (transaction.carrera_nombre && transaction.carrera_nombre.trim()) || 
      (transaction.product && transaction.product.trim()) || 
      (transaction.product_id ? `Producto ${transaction.product_id}` : '');
    
    return {
      'ID Transacción': transaction.id || transaction.transaction_id,
      'ID Usuario': transaction.id_user || '',
      'Producto': productName,
      'Importe': transaction.amount || 0,
      'Moneda': transaction.currency || transaction.currency_code || 'EUR',
      'Importe (EUR)': transaction.amount_eur || 0,
      'IVA': transaction.tax || transaction.tax_amount || 0,
      'IVA (EUR)': transaction.tax_eur || transaction.tax_amount_eur || 0,
      'Tarifa': transaction.fee_amount || 0,
      'Tarifa (EUR)': transaction.fee_amount_eur || 0,
      'Ingreso Neto': transaction.earnings || 0,
      'Ingreso Neto (EUR)': transaction.earnings_eur || 0,
      'Método de Pago': transaction.paymentMethod || transaction.payment_method || 'N/A',
      'País': formatCountryName(transaction.country || transaction.country_code || 'Desconocido'),
      'Fecha': formatDate(transaction.date || transaction.updated_at, 'YYYY-MM-DD HH:mm:ss'),
      'Intervalo': transaction.interval || 'N/A',
      'Factura': transaction.invoice_url || 'No disponible'
    };
  });
}
  
  /**
   * Prepara análisis de ingresos para incluir en el informe exportado
   * @param {Object} reportData - Datos del informe
   * @returns {Object} Análisis para el informe
   */
  prepareRevenueAnalysis(reportData) {
    const summary = reportData.summary;
    
    if (!summary || !summary.totalRevenue) {
      return {
        totalAmount: 0,
        paymentMethods: {},
        countries: {}
      };
    }
    
    // Crear análisis para métodos de pago
    const paymentMethods = {};
    if (summary.methods && summary.methods.length > 0) {
      // Tomar hasta los 5 principales métodos de pago
      const topMethods = summary.methods.slice(0, 5);
      
      topMethods.forEach(method => {
        paymentMethods[method.method || 'Desconocido'] = {
          amount: method.total,
          count: method.count,
          percentage: (method.total / summary.totalRevenue) * 100
        };
      });
    }
    
    // Crear análisis para países
    const countries = {};
    if (summary.countries && summary.countries.length > 0) {
      // Tomar hasta los 5 principales países
      const topCountries = summary.countries.slice(0, 5);
      
      topCountries.forEach(country => {
        const countryName = formatCountryName(country.code);
        countries[countryName] = {
          amount: country.total,
          count: country.count,
          percentage: (country.total / summary.totalRevenue) * 100
        };
      });
    }
    
    // Devolver el objeto de análisis completo
    return {
      totalAmount: summary.totalRevenue,
      paymentMethods,
      countries
    };
  }
  
  /**
   * Exporta un informe a Excel (método original)
   * @param {Object} reportData - Datos del informe
   * @param {string} fileName - Nombre del archivo
   */
  exportReportToExcel(reportData, fileName) {
    // Crear workbook
    const workbook = XLSX.utils.book_new();
    
    // Hoja de resumen
    let summaryData = [
      [reportData.title.toUpperCase(), '', ''],
      ['Período:', reportData.period, ''],
      ['Generado:', new Date().toLocaleDateString('es-ES'), ''],
      ['', '', '']
    ];
    
    // Añadir datos específicos según tipo de informe
    if (reportData.summary) {
      switch (reportData.title.split(' - ')[0]) {
        case 'Informe de Ingresos':
          summaryData = [
            ...summaryData,
            ['RESUMEN DE INGRESOS', '', ''],
            ['Ingresos Totales:', formatCurrency(reportData.summary.totalRevenue), ''],
            ['Transacciones:', reportData.summary.transactionCount, ''],
            ['Importe Promedio:', formatCurrency(reportData.summary.averageAmount), ''],
            ['', '', ''],
            ['INGRESOS POR PRODUCTO', '', ''],
            ['Producto', 'Ingresos', 'Transacciones']
          ];
          
          // Añadir datos de productos
          reportData.summary.products.forEach(product => {
            summaryData.push([
              product.name,
              formatCurrency(product.total),
              product.count
            ]);
          });
          
          break;
        
        case 'Informe de Impuestos':
          summaryData = [
            ...summaryData,
            ['RESUMEN DE IMPUESTOS', '', ''],
            ['IVA Total:', formatCurrency(reportData.summary.totalTax), ''],
            ['Base Imponible:', formatCurrency(reportData.summary.taxableAmount), ''],
            ['Total Facturado:', formatCurrency(reportData.summary.totalAmount), ''],
            ['', '', ''],
            ['DISTRIBUCIÓN DE IVA', '', ''],
            ['España:', formatCurrency(reportData.summary.spainTax), formatPercentage(reportData.summary.spainTaxPercentage / 100)],
            ['Unión Europea:', formatCurrency(reportData.summary.euTax), formatPercentage(reportData.summary.euTaxPercentage / 100)],
            ['Otros Países:', formatCurrency(reportData.summary.nonEuTax), formatPercentage((100 - reportData.summary.spainTaxPercentage - reportData.summary.euTaxPercentage) / 100)]
          ];
          
          break;
        
        case 'Informe de Suscripciones':
          summaryData = [
            ...summaryData,
            ['RESUMEN DE SUSCRIPCIONES', '', ''],
            ['Total Suscripciones:', reportData.summary.total, ''],
            ['Activas:', reportData.summary.active, ''],
            ['Pausadas:', reportData.summary.paused, ''],
            ['Canceladas:', reportData.summary.canceled, ''],
            ['Tasa de Cancelación:', formatPercentage(reportData.summary.cancelationRate / 100), ''],
            ['', '', ''],
            ['SUSCRIPCIONES POR PRODUCTO', '', ''],
            ['Producto', 'Total', 'Activas', 'Canceladas']
          ];
          
          // Añadir datos de productos
          reportData.summary.products.forEach(product => {
            summaryData.push([
              product.name,
              product.total,
              product.active,
              product.canceled
            ]);
          });
          
          break;
      }
    }
    
    // Crear hoja de resumen
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
    
    // Añadir hoja de datos detallados si existen
    if (reportData.transactions) {
      const transactionsData = [
        ['ID', 'Usuario', 'Producto', 'Importe', 'Moneda', 'IVA', 'Fecha', 'País', 'Método de Pago']
      ];
      
      reportData.transactions.forEach(t => {
        transactionsData.push([
          t.id,
          t.user,
          t.product,
          t.amount,
          t.currency,
          t.tax,
          formatDate(t.date, 'YYYY-MM-DD'),
          t.country,
          t.paymentMethod
        ]);
      });
      
      const transactionsWorksheet = XLSX.utils.aoa_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(workbook, transactionsWorksheet, 'Transacciones');
    }
    
    if (reportData.subscriptions) {
      const subscriptionsData = [
        ['ID', 'Usuario', 'Producto', 'Estado', 'Fecha de Creación', 'Próximo Cobro', 'Importe', 'Moneda']
      ];
      
      reportData.subscriptions.forEach(s => {
        subscriptionsData.push([
          s.id,
          s.user,
          s.product,
          s.status,
          formatDate(s.createdAt, 'YYYY-MM-DD'),
          formatDate(s.nextBillingDate, 'YYYY-MM-DD'),
          s.amount,
          s.currency
        ]);
      });
      
      const subscriptionsWorksheet = XLSX.utils.aoa_to_sheet(subscriptionsData);
      XLSX.utils.book_append_sheet(workbook, subscriptionsWorksheet, 'Suscripciones');
    }
    
    // Exportar
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }
  
/**
 * Método básico para exportar a PDF cualquier informe que no tenga método especializado
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo
 */
exportReportToPdf(reportData, fileName) {
  try {
    console.log('Exportando a PDF usando método genérico:', fileName);
    
    // Determinar qué datos exportar
    let dataToExport = [];
    let title = reportData.title || 'Informe';
    let period = reportData.period || '';
    
    if (reportData.transactions) {
      // Si hay transacciones, exportar esos datos
      dataToExport = reportData.transactions.map(t => ({
        'ID': t.id,
        'Usuario': t.user,
        'Producto': t.product,
        'Importe': t.amount,
        'Moneda': t.currency,
        'IVA': t.tax,
        'Fecha': formatDate(t.date, 'YYYY-MM-DD'),
        'País': t.country,
        'Método de Pago': t.paymentMethod
      }));
    } else if (reportData.subscriptions) {
      // Si hay suscripciones, exportar esos datos
      dataToExport = reportData.subscriptions.map(s => ({
        'ID': s.id,
        'Usuario': s.user,
        'Producto': s.product,
        'Estado': s.status,
        'Fecha de Creación': formatDate(s.createdAt, 'YYYY-MM-DD'),
        'Próximo Cobro': formatDate(s.nextBillingDate, 'YYYY-MM-DD'),
        'Importe': s.amount,
        'Moneda': s.currency
      }));
    } else if (reportData.expenses) {
      // Si hay egresos, exportar esos datos
      dataToExport = reportData.expenses.map(e => ({
        'ID': e.id,
        'Fecha': formatDate(e.date, 'YYYY-MM-DD'),
        'Categoría': e.category_name || 'Sin categoría',
        'Descripción': e.description || '',
        'Importe': e.amount || 0,
        'IVA': e.tax_amount || 0,
        'Total': (Number(e.amount || 0) + Number(e.tax_amount || 0)),
        'Método de Pago': e.payment_method || 'No especificado',
        'Deducible': e.is_tax_deductible ? 'Sí' : 'No'
      }));
    } else if (reportData.users) {
      // Si hay usuarios, exportar esos datos
      dataToExport = reportData.users.map(u => ({
        'ID': u.id_user,
        'Correo': u.correo,
        'Nombre': u.nombre || '',
        'Registro': formatDate(u.fecha_registro || u.created_at, 'YYYY-MM-DD'),
        'País': u.pais || '',
        'Universidad': u.universidad || '',
        'Suscripciones Activas': u.stats?.activeSubscriptions || 0,
        'Gasto Total': u.stats?.totalSpend || 0
      }));
    } else if (reportData.summary) {
      // Si no hay datos detallados pero hay resumen, exportar como tabla de resumen
      dataToExport = [
        {
          'Informe': title,
          'Período': period,
          'Generado el': new Date().toLocaleDateString('es-ES')
        }
      ];
      
      // Añadir datos relevantes del resumen según el tipo
      if (reportData.title.startsWith('Informe de Ingresos')) {
        dataToExport[0]['Ingresos Totales'] = reportData.summary.totalRevenue;
        dataToExport[0]['Transacciones'] = reportData.summary.transactionCount;
        dataToExport[0]['Importe Promedio'] = reportData.summary.averageAmount;
      } else if (reportData.title.startsWith('Informe de Impuestos')) {
        dataToExport[0]['IVA Total'] = reportData.summary.totalTax;
        dataToExport[0]['IVA España'] = reportData.summary.spainTax;
        dataToExport[0]['IVA Otros Países'] = reportData.summary.otherTax;
      }
    }
    
    // Si no hay datos, mostrar mensaje
    if (dataToExport.length === 0) {
      this.ui.showErrorMessage('Error', 'No hay datos para exportar a PDF');
      return false;
    }
    
    // Opciones de PDF optimizadas
    const pdfOptions = {
      pdf: {
        pageSize: 'A4',
        orientation: 'landscape',
        optimizeForWideTables: true,
        fontSizeReduction: 'medium',
        compressImages: true,
        fitToPage: true
      }
    };
    
    // Exportar usando exportManager
    return exportManager.exportData(dataToExport, {
      fileName,
      format: 'pdf',
      title,
      period,
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      ...pdfOptions
    });
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe a PDF');
    return false;
  }
}

/**
 * Exporta un informe de usuarios a PDF con formato optimizado
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportUsersReportToPDF(reportData, fileName, options) {
  try {
    // Usar tu método original para preparar los datos
    const dataToExport = this.prepareUsersDataForExport(reportData);
    
    // Verificar si hay datos para exportar
    if (!dataToExport || dataToExport.length === 0) {
      this.ui.showErrorMessage('Error', 'No hay datos de usuarios para exportar a PDF.');
      return false;
    }
    
    console.log(`Preparando exportación de ${dataToExport.length} usuarios a PDF...`);
    
    // Identificar usuarios inactivos (que tenían suscripciones pero ahora no tienen activas)
    const inactiveUsers = dataToExport.filter(user => 
      user['Total Suscripciones'] > 0 && user['Suscripciones Activas'] === 0
    );
    
    // Calcular estadísticas para el resumen
    const totalUsers = dataToExport.length;
    const inactiveCount = inactiveUsers.length;
    const inactivePercentage = totalUsers > 0 ? ((inactiveCount / totalUsers) * 100).toFixed(2) : 0;
    
    // Columnas que deben tener totales
    const columnsWithTotals = ['Suscripciones Activas', 'Transacciones', 'Gasto Total (EUR)'];
    
    // Configurar formatos específicos para columnas
    const currencyFormats = {
      'Gasto Total (EUR)': '€#,##0.00'
    };
    
    // Definir anchos de columna optimizados para PDF
    const columnWidths = {
      'ID': 25,
      'Correo': 80,
      'Nombre': 50,
      'Apellido': 50,
      'País': 35,
      'Universidad': 60,
      'Registro': 40,
      'Suscripciones Activas': 40,
      'Total Suscripciones': 40,
      'Transacciones': 35,
      'Gasto Total (EUR)': 40,
      'Último Acceso': 50
    };
    
    // Opciones específicas para PDF
    const pdfOptions = {
      pdf: {
        pageSize: 'A4',
        orientation: 'landscape',
        optimizeForWideTables: true,
        fontSizeReduction: 'medium',
        compressImages: true,
        fitToPage: true,
        margins: [10, 15, 10, 15]
      }
    };
    
    // Opciones de truncamiento de texto para PDF
    const truncateOptions = {
      truncateText: {
        'Correo': 35,
        'Universidad': 30,
        'Nombre': 20,
        'Apellido': 20
      }
    };
    
    // Preparar datos de análisis usando la información disponible en reportData
    let userAnalysis = null;
    
    if (reportData.summary) {
      // Extraer países por número de usuarios
      const topCountries = {};
      if (reportData.summary.countryDistribution) {
        reportData.summary.countryDistribution.slice(0, 5).forEach(country => {
          topCountries[country.country] = {
            count: country.count,
            percentage: country.percentage,
            totalSpend: country.totalSpend
          };
        });
      }
      
      // Extraer productos por número de usuarios
      const topProducts = {};
      if (reportData.summary.productDistribution) {
        reportData.summary.productDistribution.slice(0, 5).forEach(product => {
          topProducts[product.product] = {
            count: product.count,
            percentage: product.percentage,
            totalRevenue: product.totalRevenue
          };
        });
      }
      
      // Crear resumen para PDF
      userAnalysis = {
        totalUsers: reportData.summary.totalUsers,
        activeUsers: reportData.summary.activeUsers,
        conversionRate: reportData.summary.conversionRate,
        churnRate: reportData.summary.churnRate,
        totalSpend: reportData.summary.totalSpend,
        avgSpendPerUser: reportData.summary.avgSpendPerUser,
        countries: topCountries,
        products: topProducts
      };
    }
    
    // Exportar usando exportManager
    const result = exportManager.exportData(dataToExport, {
      fileName,
      format: 'pdf',
      sheetName: 'Usuarios',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      period: reportData.period,
      columnsWithTotals,
      currencyFormats,
      columnWidths,
      ...truncateOptions,
      ...pdfOptions,
      
      // Opciones para resaltar usuarios inactivos
      highlightInactiveUsers: true,
      inactiveUserColor: 'ffebee',
      inactiveUserSummary: {
        count: inactiveCount,
        percentage: inactivePercentage
      },
      
      // Incluir análisis si está disponible
      ...(userAnalysis ? { userAnalysis } : {})
    });
    
    if (result) {
      this.ui.showSuccessMessage(`Informe de usuarios exportado correctamente en formato PDF`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al exportar informe de usuarios a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe de usuarios a PDF.');
    return false;
  }
}

/**
 * Exporta un informe de egresos a PDF utilizando el exportManager existente
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportExpensesReportToPDF(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación en formato optimizado para PDF
    const dataToExport = this.prepareExpensesDataForExport(reportData);
    
    // Verificar si hay datos para exportar
    if (!dataToExport || dataToExport.length === 0) {
      this.ui.showErrorMessage('Error', 'No hay datos de egresos para exportar a PDF.');
      return false;
    }
    
    console.log(`Preparando exportación de ${dataToExport.length} egresos a PDF...`);
    
    // Columnas que deben tener totales
    const columnsWithTotals = ['Importe', 'IVA', 'Total'];
    
    // Configurar formatos específicos para columnas
    const currencyFormats = {
      'Importe': '€#,##0.00',
      'IVA': '€#,##0.00',
      'Total': '€#,##0.00'
    };
    
    // Definir anchos de columna optimizados para PDF
    const columnWidths = {
      'ID': 25,
      'Fecha': 40,
      'Categoría': 80,
      'Descripción': 120,
      'Importe': 40,
      'IVA': 35,
      'Total': 40,
      'Método de Pago': 60,
      'Referencia': 50,
      'Deducible': 35,
      'Factura': 40,
      'URL Factura': 50
    };
    
    // Opciones específicas para PDF
    const pdfOptions = {
      pdf: {
        pageSize: 'A4',
        orientation: 'landscape',
        optimizeForWideTables: true,
        fontSizeReduction: 'medium',
        compressImages: true,
        fitToPage: true,
        margins: [10, 15, 10, 15]
      }
    };
    
    // Opciones de truncamiento de texto para PDF
    const truncateOptions = {
      truncateText: {
        'Descripción': 50,
        'Referencia': 20,
        'URL Factura': 30,
        'Método de Pago': 20
      }
    };
    
    // Calcular totales para deducibles - Usar Importe (no Total) para gastos deducibles
    const deductibleItems = dataToExport.filter(item => item.Deducible === 'Sí');
    const totalDeductibleIVA = deductibleItems.reduce((sum, item) => sum + (typeof item.IVA === 'number' ? item.IVA : 0), 0);
    const totalDeductibleGasto = deductibleItems.reduce((sum, item) => sum + (typeof item.Importe === 'number' ? item.Importe : 0), 0);
    
    // Calcular el total deducible (IVA + Gasto)
    const totalDeducible = totalDeductibleIVA + totalDeductibleGasto;
    
    // Configurar resumen de deducibles para mostrar en el informe
    const deductibleSummary = {
      ivaDeducible: totalDeductibleIVA,
      gastoDeducible: totalDeductibleGasto,
      totalDeducible: totalDeducible
    };
    
    // Preparar datos de análisis para incluir en el informe
    
    // Preparar datos de top 5 categorías
    const topCategories = {};
    
    if (reportData.summary && reportData.summary.categoryDistribution) {
      reportData.summary.categoryDistribution.slice(0, 5).forEach(category => {
        topCategories[category.name] = {
          count: category.count,
          total: category.total,
          percentage: category.percentage,
          deductible: category.deductible
        };
      });
    }
    
    // Preparar datos de métodos de pago
    const paymentMethods = {};
    
    if (reportData.summary && reportData.summary.paymentMethodDistribution) {
      reportData.summary.paymentMethodDistribution.forEach(method => {
        paymentMethods[method.method] = {
          count: method.count,
          amount: method.total,
          percentage: method.percentage
        };
      });
    }
    
    // Análisis de egresos para el informe
    const expenseAnalysis = {
      totalAmount: reportData.summary ? reportData.summary.totalAmount : 0,
      totalTax: reportData.summary ? reportData.summary.totalTax : 0,
      deductiblePercentage: reportData.summary && reportData.summary.deductible ? reportData.summary.deductible.percentage : 0,
      avgMonthly: reportData.summary ? reportData.summary.monthlyAverage : 0,
      categories: topCategories,
      paymentMethods: paymentMethods,
      monthlyTrend: reportData.summary && reportData.summary.monthlyDistribution ? reportData.summary.monthlyDistribution.slice(-6) : [] // Últimos 6 meses
    };
    
    // Exportar usando exportManager
    const result = exportManager.exportData(dataToExport, {
      fileName,
      format: 'pdf',
      sheetName: 'Egresos',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      period: reportData.period,
      columnsWithTotals,
      currencyFormats,
      columnWidths,
      ...truncateOptions,
      ...pdfOptions,
      
      // Opciones para resaltar egresos deducibles/no deducibles
      highlightDeductibles: true,
      deductibleColor: 'e6fffa', // Color verde claro para deducibles
      nonDeductibleColor: 'ffebee', // Color rojo claro para no deducibles
      
      // Añadir resumen de deducibles
      deductibleSummary: deductibleSummary,
      
      // Añadir análisis de egresos
      expenseAnalysis: expenseAnalysis
    });
    
    if (result) {
      this.ui.showSuccessMessage(`Informe de egresos exportado correctamente en formato PDF`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al exportar informe de egresos a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe de egresos a PDF: ' + error.message);
    return false;
  }
}

/**
 * Exporta un informe de productos a PDF con formato personalizado
 * No depende de métodos genéricos de exportManager
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportProductsReportToPDF(reportData, fileName, options) {
  try {
    // Verificar que los datos necesarios estén disponibles
    if (!reportData || !reportData.summary || !reportData.products) {
      this.ui.showErrorMessage('Error', 'Datos insuficientes para generar el informe de productos en PDF.');
      return false;
    }
    
    // Verificar que pdfMake esté disponible
    if (typeof pdfMake === 'undefined') {
      console.error('La biblioteca pdfMake no está disponible. No se puede generar el PDF.');
      this.ui.showErrorMessage('Error', 'No se puede generar el PDF porque faltan componentes necesarios.');
      return false;
    }
    
    console.log('Iniciando creación del PDF de productos personalizado...');
    
    // Crear el contenido del PDF
    const content = [];
    
    // 1. Añadir título del informe
    content.push({
      text: reportData.title || 'Informe de Productos',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 5]
    });
    
    // 2. Añadir período
    content.push({
      text: `Período: ${reportData.period || 'No especificado'}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });
    
    // 3. Añadir fecha de generación
    content.push({
      text: `Generado el ${new Date().toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });
    
    // 4. Añadir resumen general
    content.push({
      text: 'RESUMEN GENERAL',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Datos para la tabla de resumen
    const summaryTableBody = [
      [
        { text: 'Métrica', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Valor', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ],
      ['Total de Productos', reportData.summary.totalProducts.toString()],
      ['Suscripciones Activas', reportData.summary.totalActiveSubscriptions.toString()],
      ['Suscripciones Mensuales', reportData.summary.totalMonthlySubscriptions.toString()],
      ['Suscripciones Anuales', reportData.summary.totalYearlySubscriptions.toString()],
      ['Ingresos Totales', `€${reportData.summary.totalRevenue.toFixed(2)}`]
    ];
    
    // Añadir tabla de resumen
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto'],
        body: summaryTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          return (rowIndex % 2 === 0) ? null : '#f0efe7';
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      },
      margin: [0, 0, 0, 20]
    });
    
    // 5. Añadir distribución de planes
    content.push({
      text: 'DISTRIBUCIÓN DE PLANES',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    const planDistribution = reportData.summary.planDistribution;
    
    // Datos para la tabla de distribución de planes
    const planTableBody = [
      [
        { text: 'Tipo de Plan', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Suscripciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Porcentaje', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ],
      [
        'Mensual',
        planDistribution.monthly.count.toString(),
        `${planDistribution.monthly.percentage.toFixed(2)}%`
      ],
      [
        'Anual',
        planDistribution.yearly.count.toString(),
        `${planDistribution.yearly.percentage.toFixed(2)}%`
      ]
    ];
    
    // Añadir tabla de distribución de planes
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto'],
        body: planTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          return (rowIndex % 2 === 0) ? null : '#f0efe7';
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      },
      margin: [0, 0, 0, 20]
    });
    
    // 6. Añadir tabla de productos por ingresos
    content.push({
      text: 'TOP PRODUCTOS POR INGRESOS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Encabezados para la tabla de productos
    const productTableHeaders = [
      { text: 'Producto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Ingresos (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Porcentaje', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Suscripciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
    ];
    
    // Datos para la tabla de productos
    const productTableBody = [productTableHeaders];
    
    // Añadir cada producto a la tabla
    if (reportData.summary.topProductsByRevenue) {
      reportData.summary.topProductsByRevenue.forEach((product, index) => {
        productTableBody.push([
          product.name,
          { text: `€${product.revenue.toFixed(2)}`, alignment: 'right' },
          { text: `${product.revenuePercentage.toFixed(2)}%`, alignment: 'right' },
          { text: product.subscriptions.toString(), alignment: 'right' }
        ]);
      });
    }
    
    // Añadir tabla de productos
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: productTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          return (rowIndex % 2 === 0) ? null : '#f0efe7';
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      },
      margin: [0, 0, 0, 20]
    });
    
    // 7. Añadir lista detallada de productos
    content.push({
      text: 'DETALLES DE PRODUCTOS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Encabezados para la tabla de detalles
    const detailsTableHeaders = [
      { text: 'ID', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Producto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Suscripciones Activas', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Mensuales', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Anuales', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Ingresos (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Cancelaciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
    ];
    
    // Datos para la tabla de detalles
    const detailsTableBody = [detailsTableHeaders];
    
    // Añadir cada producto detallado a la tabla
    let totalActive = 0;
    let totalMonthly = 0;
    let totalYearly = 0;
    let totalRevenue = 0;
    let totalCanceled = 0;
    
    reportData.products.forEach((product, index) => {
      const stats = product.statistics || {};
      
      // Acumular totales
      totalActive += stats.activeSubscriptions || 0;
      totalMonthly += stats.monthlySubscriptions || 0;
      totalYearly += stats.yearlySubscriptions || 0;
      totalRevenue += stats.totalRevenue || 0;
      totalCanceled += stats.canceledSubscriptions || 0;
      
      // Añadir fila del producto
      detailsTableBody.push([
        product.id_carrera.toString(),
        product.nombre,
        { text: (stats.activeSubscriptions || 0).toString(), alignment: 'right' },
        { text: (stats.monthlySubscriptions || 0).toString(), alignment: 'right' },
        { text: (stats.yearlySubscriptions || 0).toString(), alignment: 'right' },
        { text: `€${(stats.totalRevenue || 0).toFixed(2)}`, alignment: 'right' },
        { text: (stats.canceledSubscriptions || 0).toString(), alignment: 'right' }
      ]);
    });
    
    // Añadir fila de totales
    detailsTableBody.push([
      { text: 'TOTAL', bold: true },
      { text: '' },
      { text: totalActive.toString(), bold: true, alignment: 'right' },
      { text: totalMonthly.toString(), bold: true, alignment: 'right' },
      { text: totalYearly.toString(), bold: true, alignment: 'right' },
      { text: `€${totalRevenue.toFixed(2)}`, bold: true, alignment: 'right' },
      { text: totalCanceled.toString(), bold: true, alignment: 'right' }
    ]);
    
    // Añadir tabla de detalles
    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: detailsTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          if (rowIndex === 0) {
            return '#656d4a'; // Color de encabezado
          } else if (rowIndex === detailsTableBody.length - 1) {
            return '#a4ac86'; // Color para la fila de totales
          } else {
            return (rowIndex % 2 === 0) ? null : '#f0efe7'; // Filas alternadas
          }
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      }
    });
    
    // Crear definición del documento
    const docDefinition = {
      content: content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#582f0e',
          margin: [0, 0, 0, 5]
        },
        subheader: {
          fontSize: 11,
          italics: true,
          color: '#333333',
          margin: [0, 0, 0, 5]
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: '#582f0e',
          margin: [0, 20, 0, 10]
        },
        tableHeader: {
          fontSize: 11,
          bold: true,
          color: '#FFFFFF'
        }
      },
      defaultStyle: {
        fontSize: 10,
        color: '#333333'
      },
      // CONFIGURACIÓN PARA ORIENTACIÓN VERTICAL (Portrait)
      pageOrientation: 'portrait',
      pageSize: 'A4',
      // Márgenes optimizados para formato vertical
      pageMargins: [40, 30, 40, 30],
      footer: function(currentPage, pageCount) {
        return {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0]
        };
      }
    };
    
    // Intentar cargar el logo si la URL está disponible
    if (options.logoUrl) {
      this.getImageAsDataURL(options.logoUrl || '/images/Imagotipo.webp')
        .then(logoDataUrl => {
          // Añadir el logo al inicio del contenido
          docDefinition.content.unshift({
            image: logoDataUrl,
            width: 100,
            alignment: 'center',
            margin: [0, 0, 0, 10]
          });
          
          // Crear y descargar el PDF
          this.createAndDownloadPDF(docDefinition, fileName);
        })
        .catch(error => {
          console.warn('No se pudo cargar el logo:', error);
          // Continuar sin logo
          this.createAndDownloadPDF(docDefinition, fileName);
        });
    } else {
      // Crear y descargar el PDF sin logo
      this.createAndDownloadPDF(docDefinition, fileName);
    }
    
    return true;
  } catch (error) {
    console.error('Error al exportar informe de productos a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el PDF de productos. ' + error.message);
    return false;
  }
}


/**
 * Exporta un informe integral a PDF con formato personalizado
 * Versión completa con todas las secciones disponibles en Excel
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportComprehensiveReportToPDF(reportData, fileName, options) {
  try {
    // Verificar que los datos necesarios estén disponibles
    if (!reportData || !reportData.executiveSummary) {
      this.ui.showErrorMessage('Error', 'Datos insuficientes para generar el informe integral en PDF.');
      return false;
    }
    
    // Verificar que pdfMake esté disponible
    if (typeof pdfMake === 'undefined') {
      console.error('La biblioteca pdfMake no está disponible. No se puede generar el PDF.');
      this.ui.showErrorMessage('Error', 'No se puede generar el PDF porque faltan componentes necesarios.');
      return false;
    }
    
    console.log('Iniciando creación del PDF de informe integral personalizado...');
    
    // Crear el contenido del PDF
    const content = [];
    
    // 1. Añadir título del informe
    content.push({
      text: reportData.title || 'Informe Integral',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 5]
    });
    
    // 2. Añadir período
    content.push({
      text: `Período: ${reportData.period || 'No especificado'}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });
    
    // 3. Añadir fecha de generación
    content.push({
      text: `Generado el ${new Date().toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });
    
    // 4. Añadir resumen ejecutivo
    content.push({
      text: 'RESUMEN EJECUTIVO',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    const executiveSummary = reportData.executiveSummary;
    
    // Datos para la tabla de resumen ejecutivo
    const executiveTableBody = [
      [
        { text: 'Métrica', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Valor', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ],
      ['Ingresos Totales', `€${executiveSummary.totalRevenue.toFixed(2)}`],
      ['Egresos Totales', `€${executiveSummary.totalExpenses.toFixed(2)}`],
      ['Beneficio Neto', `€${executiveSummary.netIncome.toFixed(2)}`],
      ['Margen de Beneficio', `${executiveSummary.profitMargin.toFixed(2)}%`],
      ['Usuarios Activos', executiveSummary.activeUsers.toString()],
      ['Suscripciones Activas', executiveSummary.activeSubscriptions.toString()],
      ['Tasa de Retención', `${executiveSummary.retentionRate}%`],
      ['Tasa de Conversión', `${executiveSummary.conversionRate}%`]
    ];
    
    // Añadir Ratio Ingresos/Gastos si está disponible
    if (executiveSummary.revenueVsExpensesRatio !== undefined) {
      executiveTableBody.push(['Ratio Ingresos/Gastos', executiveSummary.revenueVsExpensesRatio]);
    }
    
    // Añadir Ingreso Promedio por Suscripción si está disponible
    if (executiveSummary.avgRevenuePerSub !== undefined) {
      executiveTableBody.push(['Ingreso Promedio por Suscripción', `€${executiveSummary.avgRevenuePerSub}`]);
    }
    
    // Añadir tabla de resumen ejecutivo
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto'],
        body: executiveTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          return (rowIndex % 2 === 0) ? null : '#f0efe7';
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      },
      margin: [0, 0, 0, 20]
    });
    
    // 5. Añadir ANÁLISIS FINANCIERO
    content.push({
      text: 'ANÁLISIS FINANCIERO',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // 5.1 Desglose de Ingresos
    content.push({
      text: 'DESGLOSE DE INGRESOS',
      style: 'subsectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Tabla de métodos de pago si está disponible
    if (reportData.revenueSummary && reportData.revenueSummary.methods && reportData.revenueSummary.methods.length > 0) {
      // Cabecera de la tabla de métodos de pago
      const methodsTableHeaders = [
        { text: 'Método de Pago', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Importe', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: '%', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Transacciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: '%', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ];
      
      // Datos para la tabla de métodos de pago
      const methodsTableBody = [methodsTableHeaders];
      
      // Calcular correctamente los porcentajes
      const totalRevenue = reportData.revenueSummary.totalRevenue || 1; // Evitar división por cero
      const totalTransactions = reportData.revenueSummary.transactionCount || 1; // Evitar división por cero
      
      // Añadir cada método de pago
      reportData.revenueSummary.methods.forEach(method => {
        methodsTableBody.push([
          method.method,
          { text: `€${method.total.toFixed(2)}`, alignment: 'right' },
          { text: `${(method.total / totalRevenue * 100).toFixed(1)}%`, alignment: 'right' },
          { text: method.count.toString(), alignment: 'right' },
          { text: `${(method.count / totalTransactions * 100).toFixed(1)}%`, alignment: 'right' }
        ]);
      });
      
      // Añadir tabla de métodos de pago
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: methodsTableBody
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            return (rowIndex % 2 === 0) ? null : '#f0efe7';
          },
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#e2ddd6'; },
          vLineColor: function(i, node) { return '#e2ddd6'; }
        },
        margin: [0, 0, 0, 15]
      });
    }

        // 5.2 Resumen de Impuestos
        content.push({
          text: 'RESUMEN DE IMPUESTOS',
          style: 'subsectionHeader',
          margin: [0, 10, 0, 10]
        });
        
        if (reportData.taxSummary) {
          const taxSummary = reportData.taxSummary;
          
          // Datos para la tabla de resumen de impuestos
          const taxTableBody = [
            [
              { text: 'Concepto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
              { text: 'Importe (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
              { text: 'Porcentaje', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
            ],
            [
              'IVA Total', 
              { text: `€${taxSummary.totalTax.toFixed(2)}`, alignment: 'right' }, 
              { text: '100.00%', alignment: 'right' }
            ],
            [
              'IVA España', 
              { text: `€${taxSummary.spainTax.toFixed(2)}`, alignment: 'right' }, 
              { text: `${taxSummary.spainTaxPercentage.toFixed(2)}%`, alignment: 'right' }
            ],
            [
              'IVA Otros Países', 
              { text: `€${taxSummary.otherTax.toFixed(2)}`, alignment: 'right' }, 
              { text: `${taxSummary.otherTaxPercentage.toFixed(2)}%`, alignment: 'right' }
            ]
          ];
          
          // Añadir tabla de resumen de impuestos
          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto'],
              body: taxTableBody
            },
            layout: {
              fillColor: function(rowIndex, node, columnIndex) {
                return (rowIndex % 2 === 0) ? null : '#f0efe7';
              },
              hLineWidth: function(i, node) { return 1; },
              vLineWidth: function(i, node) { return 1; },
              hLineColor: function(i, node) { return '#e2ddd6'; },
              vLineColor: function(i, node) { return '#e2ddd6'; }
            },
            margin: [0, 0, 0, 15]
          });
        }
    
    // 5.3 Desglose de Egresos
    content.push({
      text: 'DESGLOSE DE EGRESOS',
      style: 'subsectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Tabla de categorías de egresos si está disponible
    if (reportData.expensesSummary && reportData.expensesSummary.categoryDistribution && reportData.expensesSummary.categoryDistribution.length > 0) {
      // Cabecera de la tabla de categorías
      const categoriesTableHeaders = [
        { text: 'Categoría', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Importe', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: '%', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Cantidad', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: '%', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ];
      
      // Datos para la tabla de categorías
      const categoriesTableBody = [categoriesTableHeaders];
      
      // Calcular correctamente los porcentajes y totales
      const totalExpenses = reportData.expensesSummary.totalWithTax || reportData.expensesSummary.totalAmount + reportData.expensesSummary.totalTax || 1; // Evitar división por cero
      const totalExpensesCount = reportData.expensesSummary.totalExpenses || 1; // Evitar división por cero
      
      // Añadir cada categoría con el importe correcto que incluye impuestos
      reportData.expensesSummary.categoryDistribution.slice(0, 5).forEach(category => {
        // Calcular el monto total correcto (base + impuesto)
        const categoryTotal = category.totalWithTax || (category.total + category.tax);
        
        categoriesTableBody.push([
          category.name,
          { text: `€${categoryTotal.toFixed(2)}`, alignment: 'right' },
          { text: `${(categoryTotal / totalExpenses * 100).toFixed(1)}%`, alignment: 'right' },
          { text: category.count.toString(), alignment: 'right' },
          { text: `${(category.count / totalExpensesCount * 100).toFixed(1)}%`, alignment: 'right' }
        ]);
      });
      
      // Añadir tabla de categorías
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: categoriesTableBody
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            return (rowIndex % 2 === 0) ? null : '#f0efe7';
          },
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#e2ddd6'; },
          vLineColor: function(i, node) { return '#e2ddd6'; }
        },
        margin: [0, 0, 0, 15]
      });
    }
    
    // Egresos deducibles (si están disponibles)
    if (reportData.expensesSummary && reportData.expensesSummary.deductible) {
      const deductible = reportData.expensesSummary.deductible;
      
      const deductibleTableBody = [
        [
          { text: 'Concepto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
          { text: 'Importe (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
        ],
        ['Gastos Deducibles', { text: `€${deductible.amount.toFixed(2)}`, alignment: 'right' }],
        ['IVA Deducible', { text: `€${deductible.tax.toFixed(2)}`, alignment: 'right' }],
        [
          { text: 'Total Deducible', bold: true }, 
          { text: `€${(deductible.amount + deductible.tax).toFixed(2)}`, bold: true, alignment: 'right' }
        ]
      ];
      
      content.push({
        text: 'EGRESOS DEDUCIBLES',
        style: 'subsectionHeader',
        margin: [0, 10, 0, 10]
      });
      
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto'],
          body: deductibleTableBody
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            if (rowIndex === deductibleTableBody.length - 1) {
              return '#c3e6cb'; // Verde claro para el total
            }
            return (rowIndex % 2 === 0) ? null : '#f0efe7';
          },
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#e2ddd6'; },
          vLineColor: function(i, node) { return '#e2ddd6'; }
        },
        margin: [0, 0, 0, 20]
      });
    }
    
    // 6. Añadir ANÁLISIS DE PRODUCTOS
    content.push({
      text: 'ANÁLISIS DE PRODUCTOS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // 6.1 Top productos por ingresos
    content.push({
      text: 'TOP PRODUCTOS POR INGRESOS',
      style: 'subsectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Encabezados para la tabla de productos principales
    const topProductsTableHeaders = [
      { text: 'Producto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Ingresos (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: '%', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Suscripciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
    ];
    
    // Datos para la tabla de productos principales
    const topProductsTableBody = [topProductsTableHeaders];
    
    // Añadir cada producto principal a la tabla
    if (reportData.productsSummary && reportData.productsSummary.topProductsByRevenue) {
      // Usar los datos directamente del resumen de productos
      reportData.productsSummary.topProductsByRevenue.forEach(product => {
        topProductsTableBody.push([
          product.name,
          { text: `€${product.revenue.toFixed(2)}`, alignment: 'right' },
          { text: `${product.revenuePercentage.toFixed(2)}%`, alignment: 'right' },
          { text: product.subscriptions.toString(), alignment: 'right' }
        ]);
      });
    } else if (executiveSummary.topProducts && executiveSummary.topProducts.length > 0) {
      // Alternativamente, usar los datos del resumen ejecutivo
      executiveSummary.topProducts.forEach(product => {
        topProductsTableBody.push([
          product.name,
          { text: `€${product.revenue.toFixed(2)}`, alignment: 'right' },
          // Calcular porcentaje si no está disponible
          { text: `${((product.revenue / executiveSummary.totalRevenue) * 100).toFixed(2)}%`, alignment: 'right' },
          { text: product.subscriptions.toString(), alignment: 'right' }
        ]);
      });
    }
    
    // Añadir tabla de productos principales
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: topProductsTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          return (rowIndex % 2 === 0) ? null : '#f0efe7';
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      },
      margin: [0, 0, 0, 15]
    });
    
    // 6.2 Distribución de planes
    if (reportData.productsSummary && reportData.productsSummary.planDistribution) {
      content.push({
        text: 'DISTRIBUCIÓN DE PLANES',
        style: 'subsectionHeader',
        margin: [0, 10, 0, 10]
      });
      
      const planDistribution = reportData.productsSummary.planDistribution;
      
      // Datos para la tabla de distribución de planes
      const planTableBody = [
        [
          { text: 'Tipo de Plan', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
          { text: 'Suscripciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
          { text: 'Porcentaje', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
        ],
        [
          'Mensual',
          { text: planDistribution.monthly.count.toString(), alignment: 'right' },
          { text: `${planDistribution.monthly.percentage.toFixed(2)}%`, alignment: 'right' }
        ],
        [
          'Anual',
          { text: planDistribution.yearly.count.toString(), alignment: 'right' },
          { text: `${planDistribution.yearly.percentage.toFixed(2)}%`, alignment: 'right' }
        ]
      ];
      
      // Añadir tabla de distribución de planes
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: planTableBody
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            return (rowIndex % 2 === 0) ? null : '#f0efe7';
          },
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#e2ddd6'; },
          vLineColor: function(i, node) { return '#e2ddd6'; }
        },
        margin: [0, 0, 0, 20]
      });
    }
    
    // 7. Añadir resumen de suscripciones
    if (reportData.subscriptionSummary) {
      content.push({
        text: 'SUSCRIPCIONES',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      });
      
      const subscriptionSummary = reportData.subscriptionSummary;
      
      // Datos para la tabla de resumen de suscripciones
      const subTableBody = [
        [
          { text: 'Estado', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
          { text: 'Cantidad', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
          { text: 'Porcentaje', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
        ],
        [
          'Activas', 
          { text: subscriptionSummary.active.toString(), alignment: 'right' }, 
          { text: `${(subscriptionSummary.active / subscriptionSummary.total * 100).toFixed(2)}%`, alignment: 'right' }
        ],
        [
          'Pausadas', 
          { text: subscriptionSummary.paused.toString(), alignment: 'right' }, 
          { text: `${(subscriptionSummary.paused / subscriptionSummary.total * 100).toFixed(2)}%`, alignment: 'right' }
        ],
        [
          'Canceladas', 
          { text: subscriptionSummary.canceled.toString(), alignment: 'right' }, 
          { text: `${(subscriptionSummary.canceled / subscriptionSummary.total * 100).toFixed(2)}%`, alignment: 'right' }
        ],
        [
          { text: 'Total', bold: true }, 
          { text: subscriptionSummary.total.toString(), bold: true, alignment: 'right' }, 
          { text: '100.00%', bold: true, alignment: 'right' }
        ]
      ];
      
      // Añadir tabla de resumen de suscripciones
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: subTableBody
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            if (rowIndex === subTableBody.length - 1) {
              return '#a4ac86'; // Color para la fila de totales
            }
            return (rowIndex % 2 === 0) ? null : '#f0efe7';
          },
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#e2ddd6'; },
          vLineColor: function(i, node) { return '#e2ddd6'; }
        },
        margin: [0, 0, 0, 20]
      });
    }
    
    // 8. Añadir tendencias mensuales
    if (reportData.monthlyTrends && reportData.monthlyTrends.length > 0) {
      content.push({
        text: 'TENDENCIAS MENSUALES',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      });
      
      // Encabezados para la tabla de tendencias
      const trendsTableHeaders = [
        { text: 'Mes', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Ingresos', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Egresos', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Beneficio Neto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Nuevas Suscripciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Cancelaciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ];
      
      // Datos para la tabla de tendencias
      const trendsTableBody = [trendsTableHeaders];
      
      // Añadir cada mes a la tabla
      reportData.monthlyTrends.forEach(month => {
        trendsTableBody.push([
          month.label,
          { text: `€${month.revenue.toFixed(2)}`, alignment: 'right' },
          { text: `€${month.expenses.toFixed(2)}`, alignment: 'right' },
          { text: `€${month.netIncome.toFixed(2)}`, alignment: 'right' },
          { text: month.subscriptions.toString(), alignment: 'right' },
          { text: month.cancelations.toString(), alignment: 'right' }
        ]);
      });
      
      // Añadir tabla de tendencias
      content.push({
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: trendsTableBody
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            if (rowIndex === 0) {
              return '#656d4a'; // Color de encabezado
            } else {
              return (rowIndex % 2 === 0) ? null : '#f0efe7'; // Filas alternadas
            }
          },
          hLineWidth: function(i, node) { return 1; },
          vLineWidth: function(i, node) { return 1; },
          hLineColor: function(i, node) { return '#e2ddd6'; },
          vLineColor: function(i, node) { return '#e2ddd6'; }
        }
      });
    }
    
    // Crear definición del documento
    const docDefinition = {
      content: content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#582f0e',
          margin: [0, 0, 0, 5]
        },
        subheader: {
          fontSize: 11,
          italics: true,
          color: '#333333',
          margin: [0, 0, 0, 5]
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: '#582f0e',
          margin: [0, 20, 0, 10]
        },
        subsectionHeader: {
          fontSize: 12,
          bold: true,
          color: '#582f0e',
          margin: [0, 10, 0, 5]
        },
        tableHeader: {
          fontSize: 11,
          bold: true,
          color: '#FFFFFF'
        }
      },
      defaultStyle: {
        fontSize: 10,
        color: '#333333'
      },
      // CONFIGURACIÓN PARA ORIENTACIÓN VERTICAL (Portrait)
      pageOrientation: 'portrait',
      pageSize: 'A4',
      // Márgenes optimizados para formato vertical
      pageMargins: [40, 30, 40, 30],
      footer: function(currentPage, pageCount) {
        return {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0]
        };
      }
    };
    
    // Intentar cargar el logo si la URL está disponible
    if (options.logoUrl) {
      this.getImageAsDataURL(options.logoUrl || '/images/Imagotipo.webp')
        .then(logoDataUrl => {
          // Añadir el logo al inicio del contenido
          docDefinition.content.unshift({
            image: logoDataUrl,
            width: 100,
            alignment: 'center',
            margin: [0, 0, 0, 10]
          });
          
          // Crear y descargar el PDF
          this.createAndDownloadPDF(docDefinition, fileName);
        })
        .catch(error => {
          console.warn('No se pudo cargar el logo:', error);
          // Continuar sin logo
          this.createAndDownloadPDF(docDefinition, fileName);
        });
    } else {
      // Crear y descargar el PDF sin logo
      this.createAndDownloadPDF(docDefinition, fileName);
    }
    
    return true;
  } catch (error) {
    console.error('Error al exportar informe integral a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el PDF de informe integral. ' + error.message);
    return false;
  }
}
  
  /**
   * Exporta un informe a CSV
   * @param {Object} reportData - Datos del informe
   * @param {string} fileName - Nombre del archivo
   */
  exportReportToCsv(reportData, fileName) {
    // Determinar qué datos exportar
    let dataToExport = [];
    
    if (reportData.transactions) {
      // Si hay transacciones, exportar esos datos
      dataToExport = reportData.transactions.map(t => ({
        'ID': t.id,
        'Usuario': t.user,
        'Producto': t.product,
        'Importe': t.amount,
        'Moneda': t.currency,
        'IVA': t.tax,
        'Fecha': formatDate(t.date, 'YYYY-MM-DD'),
        'País': t.country,
        'Método de Pago': t.paymentMethod
      }));
    } else if (reportData.subscriptions) {
      // Si hay suscripciones, exportar esos datos
      dataToExport = reportData.subscriptions.map(s => ({
        'ID': s.id,
        'Usuario': s.user,
        'Producto': s.product,
        'Estado': s.status,
        'Fecha de Creación': formatDate(s.createdAt, 'YYYY-MM-DD'),
        'Próximo Cobro': formatDate(s.nextBillingDate, 'YYYY-MM-DD'),
        'Importe': s.amount,
        'Moneda': s.currency
      }));
    } else {
      // Si no hay datos detallados, exportar resumen
      dataToExport = [{
        'Informe': reportData.title,
        'Período': reportData.period,
        'Generado': new Date().toLocaleDateString('es-ES')
      }];
      
      // Añadir datos del resumen según el tipo de informe
      if (reportData.summary) {
        Object.entries(reportData.summary).forEach(([key, value]) => {
          // No incluir arrays, solo valores simples
          if (!Array.isArray(value)) {
            dataToExport[0][key] = value;
          }
        });
      }
    }
    
    // Exportar usando el exportManager
    exportManager.exportToCSV(dataToExport, {
      fileName,
      csvDelimiter: ';'
    });
  }
  
  /**
   * Guarda un informe programado
   */
  saveScheduledReport() {
    // Obtener datos del formulario
    const name = document.getElementById('scheduled-report-name').value;
    const type = document.getElementById('scheduled-report-type').value;
    const frequency = document.getElementById('scheduled-report-frequency').value;
    const format = document.getElementById('scheduled-report-format').value;
    const recipients = document.getElementById('scheduled-report-recipients').value;
    
    // Validar datos
    if (!name || !type || !frequency || !format) {
      this.ui.showErrorMessage('Error', 'Por favor, completa todos los campos obligatorios');
      return;
    }
    
    // Calcular próxima ejecución
    const nextRun = this.calculateNextRunDate(frequency);
    
    // Crear informe programado
    const scheduledReport = {
      id: 'scheduled_' + Date.now(),
      name,
      type,
      frequency,
      format,
      lastRun: null,
      nextRun: nextRun.toISOString(),
      recipients: recipients.split(',').map(r => r.trim()).filter(r => r),
      active: true
    };
    
    // Añadir a la lista
    this.scheduledReports.push(scheduledReport);
    
    // Guardar en localStorage
    localStorage.setItem('scheduledReports', JSON.stringify(this.scheduledReports));
    
    // Cerrar modal
    if (this.ui.modals.scheduleReportModal) {
      this.ui.modals.scheduleReportModal.hide();
    }
    
    this.ui.showSuccessMessage('Informe programado correctamente');
  }
  
  /**
   * Calcula la próxima fecha de ejecución
   * @param {string} frequency - Frecuencia del informe
   * @returns {Date} Próxima fecha de ejecución
   */
  calculateNextRunDate(frequency) {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      
      case 'weekly':
        // Próximo lunes
        const daysUntilMonday = 8 - now.getDay(); // 1 = Lunes, 7 = Domingo
        nextRun.setDate(nextRun.getDate() + daysUntilMonday);
        nextRun.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      
      case 'monthly':
        // Primer día del próximo mes
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(1);
        nextRun.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      
      case 'quarterly':
        // Primer día del próximo trimestre
        const currentQuarter = Math.floor(now.getMonth() / 3);
        nextRun.setMonth((currentQuarter + 1) * 3);
        nextRun.setDate(1);
        nextRun.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      
      case 'yearly':
        // Primer día del próximo año
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        nextRun.setMonth(0);
        nextRun.setDate(1);
        nextRun.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      
      default:
        // Por defecto, mañana a las 8:00 AM
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(8, 0, 0, 0); // 8:00 AM
    }
    
    return nextRun;
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
 * Exporta un informe de ingresos a PDF con formato optimizado
 * Implementación para el módulo reports-inteligente.js
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportRevenueReportToPDF(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación
    const dataToExport = this.prepareRevenueDataForExport(reportData);
    
    // Título del informe
    const title = reportData.title || 'Informe de Ingresos';
    
    // Opciones específicas para PDF
    const pdfOptions = {
      pdf: {
        // Usar formato apaisado (landscape) para dar más espacio horizontal
        pageSize: 'A4',
        orientation: 'landscape',
        // Activar optimizaciones para tablas anchas
        optimizeForWideTables: true,
        // Usar reducción de fuente para acomodar más datos
        fontSizeReduction: 'medium',
        // Comprimir imágenes para reducir tamaño
        compressImages: true,
        // Asegurar que las tablas se ajusten a la página
        fitToPage: true,
        // Márgenes reducidos
        margins: [10, 15, 10, 15]
      }
    };
    
    // Opciones de truncamiento de texto para evitar desbordamientos
    const truncateText = {
      'Producto': 25,
      'Usuario': 20,
      'Método de Pago': 15,
      'País': 12,
      'Factura': 15
    };
    
    // Configurar columnas con totales
    const columnsWithTotals = [
      'Importe (EUR)', 
      'IVA (EUR)', 
      'Tarifa (EUR)',
      'Ingreso Neto (EUR)'
    ];
    
    // Configurar formatos de moneda para columnas
    const currencyFormats = {
      'Importe': '#,##0.00',
      'Importe (EUR)': '€#,##0.00',
      'IVA': '#,##0.00',
      'IVA (EUR)': '€#,##0.00',
      'Tarifa': '#,##0.00',
      'Tarifa (EUR)': '€#,##0.00',
      'Ingreso Neto': '#,##0.00',
      'Ingreso Neto (EUR)': '€#,##0.00'
    };
    
    // Definir anchos de columna para optimizar espacio en PDF
    const columnWidths = {
      'ID Transacción': 35,
      'ID Usuario': 25,
      'Producto': 80,
      'Importe': 30,
      'Moneda': 25,
      'Importe (EUR)': 40,
      'IVA': 30,
      'IVA (EUR)': 35,
      'Tarifa': 30,
      'Tarifa (EUR)': 35,
      'Ingreso Neto': 35,
      'Ingreso Neto (EUR)': 40,
      'Método de Pago': 40,
      'País': 35,
      'Fecha': 40,
      'Intervalo': 25,
      'Factura': 30
    };
    
    // Preparar análisis para incluir en el informe
    const reportAnalysis = this.prepareRevenueAnalysis(reportData);
    
    // Exportar usando exportManager con configuración especializada para PDF
    exportManager.exportData(dataToExport, {
      fileName,
      format: 'pdf',
      sheetName: 'Ingresos',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeFilters: false, // Los filtros no funcionan en PDF
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: title,
      period: reportData.period,
      columnsWithTotals,
      currencyFormats,
      columnWidths,
      truncateText,
      ...pdfOptions,
      
      // Análisis para el informe
      transactionAnalysis: reportAnalysis
    });
    
    this.ui.showSuccessMessage(`Informe de ingresos exportado correctamente en formato PDF`);
    return true;
  } catch (error) {
    console.error('Error al exportar informe de ingresos a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe a PDF. Revise la consola para más detalles.');
    return false;
  }
}

/**
 * Versión corregida del método para exportar informes de impuestos a PDF
 * con la tasa de IVA en formato decimal (sin símbolo de porcentaje)
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportTaxReportToPDF(reportData, fileName, options) {
  try {
    // Verificar que los datos necesarios estén disponibles
    if (!reportData || !reportData.summary || !reportData.taxBreakdown) {
      this.ui.showErrorMessage('Error', 'Datos insuficientes para generar el informe de impuestos en PDF.');
      return false;
    }
    
    // Verificar que pdfMake esté disponible
    if (typeof pdfMake === 'undefined') {
      console.error('La biblioteca pdfMake no está disponible. No se puede generar el PDF.');
      this.ui.showErrorMessage('Error', 'No se puede generar el PDF porque faltan componentes necesarios.');
      return false;
    }
    
    console.log('Iniciando creación del PDF de impuestos personalizado...');
    console.log(`Datos disponibles: ${reportData.taxBreakdown.length} países`);
    
    // Crear el contenido del PDF
    const content = [];
    
    // 1. Añadir título del informe
    content.push({
      text: reportData.title || 'Informe de Impuestos',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 5]
    });
    
    // 2. Añadir período
    content.push({
      text: `Período: ${reportData.period || 'No especificado'}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });
    
    // 3. Añadir fecha de generación
    content.push({
      text: `Generado el ${new Date().toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });
    
    // 4. Añadir tabla de resumen
    content.push({
      text: 'RESUMEN DE IMPUESTOS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Datos para la tabla de resumen
    const summaryTableBody = [
      [
        { text: 'Concepto', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Importe (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Porcentaje', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Base Imponible', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
        { text: 'Total Facturado', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
      ],
      [
        'Total IVA Recaudado',
        { text: `€${reportData.summary.totalTax.toFixed(2)}`, alignment: 'right' },
        { text: '100.00%', alignment: 'right' },
        { text: `€${reportData.summary.taxableAmount.toFixed(2)}`, alignment: 'right' },
        { text: `€${reportData.summary.totalAmount.toFixed(2)}`, alignment: 'right' }
      ],
      [
        'IVA España',
        { text: `€${reportData.summary.spainTax.toFixed(2)}`, alignment: 'right' },
        { text: `${reportData.summary.spainTaxPercentage.toFixed(2)}%`, alignment: 'right' },
        { text: '', alignment: 'right' },
        { text: '', alignment: 'right' }
      ],
      [
        'IVA Otros Países',
        { text: `€${reportData.summary.otherTax.toFixed(2)}`, alignment: 'right' },
        { text: `${reportData.summary.otherTaxPercentage.toFixed(2)}%`, alignment: 'right' },
        { text: '', alignment: 'right' },
        { text: '', alignment: 'right' }
      ]
    ];
    
    // Añadir tabla de resumen
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: summaryTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          return (rowIndex % 2 === 0) ? null : '#f0efe7';
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      },
      margin: [0, 0, 0, 20]
    });
    
    // 5. Añadir tabla de desglose por país
    content.push({
      text: 'DESGLOSE DE IMPUESTOS POR PAÍS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    
    // Encabezados para la tabla de países
    const countryTableHeaders = [
      { text: 'País', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Código', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Base Imponible (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'IVA (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Total Facturado (EUR)', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Tasa IVA', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' },
      { text: 'Transacciones', style: 'tableHeader', fillColor: '#656d4a', color: '#FFFFFF' }
    ];
    
    // Datos para la tabla de países
    const countryTableBody = [countryTableHeaders];
    
    // Añadir cada país a la tabla
    let totalTaxBase = 0;
    let totalTaxAmount = 0;
    let totalBilled = 0;
    let totalTransactions = 0;
    
    reportData.taxBreakdown.forEach((country, index) => {
      // Calcular el total facturado para este país
      const taxBase = country.taxBase || 0;
      const taxAmount = country.total || 0;
      const totalBilledForCountry = taxBase + taxAmount;
      
      // Acumular totales
      totalTaxBase += taxBase;
      totalTaxAmount += taxAmount;
      totalBilled += totalBilledForCountry;
      totalTransactions += country.count || 0;
      
// Procesar la tasa de impuesto de manera segura - MODIFICADO para mostrar como decimal sin % y sin redondeo
let rateValue = 0.0;
let rateDisplay = '0';

try {
  if (typeof country.rate === 'string') {
    // Si es un string, intentar extraer el valor numérico
    // Eliminar cualquier símbolo de porcentaje o caracteres no numéricos
    const cleanRate = country.rate.replace(/[^0-9.,]/g, '').replace(',', '.');
    rateValue = parseFloat(cleanRate);
    
    // Si el valor original tenía un punto decimal, preservar la cantidad de decimales
    if (cleanRate.includes('.')) {
      // Usar el string limpio para la visualización, evitando el redondeo
      rateDisplay = cleanRate;
    } else {
      // Si no tenía punto decimal, mostrar como entero
      rateDisplay = String(rateValue);
    }
  } else if (typeof country.rate === 'number') {
    // Si ya es un número, usarlo directamente pero sin redondear
    rateValue = country.rate;
    
    // Convertir a string para evitar el redondeo
    // Si el número tiene decimales, los preservamos
    if (rateValue % 1 !== 0) {
      // Tiene decimales, convertir a string para preservarlos
      rateDisplay = String(rateValue);
    } else {
      // Es un entero
      rateDisplay = String(rateValue);
    }
  }
  
  // Verificar si es un número válido
  if (isNaN(rateValue)) {
    rateValue = 0.0;
    rateDisplay = '0';
  }
} catch (e) {
  console.warn(`Error al procesar tasa para país ${country.code}:`, e);
  rateValue = 0.0;
  rateDisplay = '0';
}
      
      // Añadir fila a la tabla
      countryTableBody.push([
        country.name,
        country.code,
        { text: `€${taxBase.toFixed(2)}`, alignment: 'right' },
        { text: `€${taxAmount.toFixed(2)}`, alignment: 'right' },
        { text: `€${totalBilledForCountry.toFixed(2)}`, alignment: 'right' },
        { text: rateDisplay, alignment: 'right' }, // CORREGIDO: Sin símbolo % y sin redondeo
        { text: country.count.toString(), alignment: 'right' }
      ]);
    });
    
    // Añadir fila de totales
    countryTableBody.push([
      { text: 'TOTAL', bold: true },
      { text: '' },
      { text: `€${totalTaxBase.toFixed(2)}`, bold: true, alignment: 'right' },
      { text: `€${totalTaxAmount.toFixed(2)}`, bold: true, alignment: 'right' },
      { text: `€${totalBilled.toFixed(2)}`, bold: true, alignment: 'right' },
      { text: '' },
      { text: totalTransactions.toString(), bold: true, alignment: 'right' }
    ]);
    
    // Añadir tabla de países
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: countryTableBody
      },
      layout: {
        fillColor: function(rowIndex, node, columnIndex) {
          if (rowIndex === 0) {
            return '#656d4a'; // Color de encabezado
          } else if (rowIndex === countryTableBody.length - 1) {
            return '#a4ac86'; // Color para la fila de totales
          } else {
            return (rowIndex % 2 === 0) ? null : '#f0efe7'; // Filas alternadas
          }
        },
        hLineWidth: function(i, node) { return 1; },
        vLineWidth: function(i, node) { return 1; },
        hLineColor: function(i, node) { return '#e2ddd6'; },
        vLineColor: function(i, node) { return '#e2ddd6'; }
      }
    });
    
    // Crear definición del documento
    const docDefinition = {
      content: content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#582f0e',
          margin: [0, 0, 0, 5]
        },
        subheader: {
          fontSize: 11,
          italics: true,
          color: '#333333',
          margin: [0, 0, 0, 5]
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: '#582f0e',
          margin: [0, 20, 0, 10]
        },
        tableHeader: {
          fontSize: 11,
          bold: true,
          color: '#FFFFFF'
        }
      },
      defaultStyle: {
        fontSize: 10,
        color: '#333333'
      },
      // CONFIGURACIÓN PARA ORIENTACIÓN VERTICAL (Portrait)
      pageOrientation: 'portrait',
      pageSize: 'A4',
      // Márgenes optimizados para formato vertical
      pageMargins: [40, 30, 40, 30],
      footer: function(currentPage, pageCount) {
        return {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0]
        };
      }
    };
    
    // Intentar cargar el logo si la URL está disponible
    if (options.logoUrl) {
      this.getImageAsDataURL(options.logoUrl || '/images/Imagotipo.webp')
        .then(logoDataUrl => {
          // Añadir el logo al inicio del contenido
          docDefinition.content.unshift({
            image: logoDataUrl,
            width: 100,
            alignment: 'center',
            margin: [0, 0, 0, 10]
          });
          
          // Crear y descargar el PDF
          this.createAndDownloadPDF(docDefinition, fileName);
        })
        .catch(error => {
          console.warn('No se pudo cargar el logo:', error);
          // Continuar sin logo
          this.createAndDownloadPDF(docDefinition, fileName);
        });
    } else {
      // Crear y descargar el PDF sin logo
      this.createAndDownloadPDF(docDefinition, fileName);
    }
    
    return true;
  } catch (error) {
    console.error('Error al exportar informe de impuestos a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo generar el PDF de impuestos. ' + error.message);
    return false;
  }
}

/**
 * Crea y descarga el PDF usando pdfMake
 * @param {Object} docDefinition - Definición del documento PDF
 * @param {string} fileName - Nombre del archivo
 */
createAndDownloadPDF(docDefinition, fileName) {
  try {
    // Mostrar mensaje de generación
    this.ui.showSuccessMessage('Generando PDF, espere un momento...');
    
    // Crear el PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);
    
    // Descargar el archivo
    pdfDoc.download(`${fileName}.pdf`);
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage('El informe ha sido exportado a PDF correctamente');
  } catch (error) {
    console.error('Error al generar PDF:', error);
    this.ui.showErrorMessage('Error', 'Ocurrió un problema al generar el PDF. ' + error.message);
  }
}

/**
 * Convierte una URL de imagen a dataURL para pdfmake
 * @param {string} url - URL de la imagen
 * @returns {Promise<string>} DataURL de la imagen
 */
getImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    // Verificar si la URL está vacía
    if (!url) {
      reject(new Error('URL de imagen vacía'));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    
    img.onerror = function() {
      reject(new Error(`No se pudo cargar la imagen: ${url}`));
    };
    
    img.src = url;
  });
}

/**
 * Inspecciona y registra la estructura de los datos de un informe para diagnóstico
 * Útil para depurar problemas con la exportación
 * @param {Object} reportData - Datos del informe
 * @param {string} reportType - Tipo de informe
 */
inspectReportDataStructure(reportData, reportType) {
  console.group(`Inspección de estructura de datos - Informe de ${reportType}`);
  
  try {
    console.log('Propiedades principales:', Object.keys(reportData));
    
    // Verificar propiedades específicas según el tipo de informe
    if (reportType === 'taxes') {
      if (reportData.summary) {
        console.log('Propiedades del resumen:', Object.keys(reportData.summary));
        
        // Mostrar valores y tipos de datos en el resumen
        Object.entries(reportData.summary).forEach(([key, value]) => {
          console.log(`- summary.${key}: ${value} (${typeof value})`);
        });
      } else {
        console.warn('Propiedad "summary" no encontrada');
      }
      
      if (reportData.taxBreakdown) {
        console.log('Total países en taxBreakdown:', reportData.taxBreakdown.length);
        
        // Mostrar ejemplo del primer país si existe
        if (reportData.taxBreakdown.length > 0) {
          const sampleCountry = reportData.taxBreakdown[0];
          console.log('Estructura de ejemplo de país:');
          
          // Listar propiedades y tipos del país de ejemplo
          Object.entries(sampleCountry).forEach(([key, value]) => {
            console.log(`- ${key}: ${value} (${typeof value})`);
          });
        }
      } else {
        console.warn('Propiedad "taxBreakdown" no encontrada');
      }
    } else if (reportType === 'revenue') {
      if (reportData.summary) {
        console.log('Propiedades del resumen:', Object.keys(reportData.summary));
      }
      
      if (reportData.transactions) {
        console.log('Total transacciones:', reportData.transactions.length);
        
        // Mostrar ejemplo de la primera transacción si existe
        if (reportData.transactions.length > 0) {
          console.log('Estructura de ejemplo de transacción:', 
            Object.keys(reportData.transactions[0]));
        }
      }
    } else if (reportType === 'subscriptions') {
      if (reportData.summary) {
        console.log('Propiedades del resumen:', Object.keys(reportData.summary));
      }
      
      if (reportData.subscriptions) {
        console.log('Total suscripciones:', reportData.subscriptions.length);
        
        // Mostrar ejemplo de la primera suscripción si existe
        if (reportData.subscriptions.length > 0) {
          console.log('Estructura de ejemplo de suscripción:', 
            Object.keys(reportData.subscriptions[0]));
        }
      }
    } else if (reportType === 'expenses') {
      if (reportData.summary) {
        console.log('Propiedades del resumen:', Object.keys(reportData.summary));
      }
      
      if (reportData.expenses) {
        console.log('Total egresos:', reportData.expenses.length);
        
        // Mostrar ejemplo del primer egreso si existe
        if (reportData.expenses.length > 0) {
          console.log('Estructura de ejemplo de egreso:', 
            Object.keys(reportData.expenses[0]));
        }
      }
    }
    
    // Verificar algunos valores comunes que pueden causar problemas
    console.log('Valores críticos:');
    console.log('- title:', reportData.title);
    console.log('- period:', reportData.period);
    console.log('- dateRange:', reportData.dateRange);
    
  } catch (error) {
    console.error('Error durante la inspección de la estructura de datos:', error);
  }
  
  console.groupEnd();
}

/**
 * Exporta un informe de suscripciones a PDF con formato optimizado
 * @param {Object} reportData - Datos del informe
 * @param {string} fileName - Nombre del archivo base
 * @param {Object} options - Opciones de exportación
 */
exportSubscriptionsReportToPDF(reportData, fileName, options) {
  try {
    // Preparar los datos para exportación en formato optimizado para PDF
    const dataToExport = this.prepareSubscriptionsDataForExport(reportData);
    
    // Verificar si hay datos para exportar
    if (!dataToExport || dataToExport.length === 0) {
      this.ui.showErrorMessage('Error', 'No hay datos de suscripciones para exportar a PDF.');
      return false;
    }
    
    console.log(`Preparando exportación de ${dataToExport.length} suscripciones a PDF...`);
    
    // Contar suscripciones por estado para el resumen
    const statusCounts = {
      'Activa': 0,
      'Pausada': 0,
      'Cancelada': 0,
      'Expirada': 0
    };
    
    // Contamos cada tipo de estado
    dataToExport.forEach(subscription => {
      if (statusCounts[subscription['Estado']] !== undefined) {
        statusCounts[subscription['Estado']]++;
      }
    });
    
    // Solo la columna Precio debería tener total
    const columnsWithTotals = ['Precio'];
    
    // Configurar formatos de moneda para columnas
    const currencyFormats = {
      'Precio': '€#,##0.00'
    };
    
    // Definir anchos de columna optimizados para PDF
    const columnWidths = {
      'ID Suscripción': 40,
      'Usuario': 80,
      'Producto': 100,
      'Estado': 30,
      'Fecha de Creación': 50,
      'Próximo Cobro': 50,
      'Precio': 40,
      'Intervalo': 30,
      'Última Actualización': 50
    };
    
    // Opciones específicas para PDF
    const pdfOptions = {
      pdf: {
        pageSize: 'A4',
        orientation: 'landscape',
        optimizeForWideTables: true,
        fontSizeReduction: 'medium',
        compressImages: true,
        fitToPage: true,
        margins: [10, 15, 10, 15]
      }
    };
    
    // Opciones de truncamiento de texto para PDF
    const truncateOptions = {
      truncateText: {
        'Usuario': 30,
        'Producto': 40,
      }
    };
    
    // Exportar usando exportManager
    const result = exportManager.exportData(dataToExport, {
      fileName,
      format: 'pdf',
      sheetName: 'Suscripciones',
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeLogo: true,
      logoUrl: '/images/Imagotipo.webp',
      title: reportData.title,
      period: reportData.period,
      columnsWithTotals,
      currencyFormats,
      columnWidths,
      ...truncateOptions,
      ...pdfOptions,
      
      // Opciones para colorear estados
      highlightStatus: true,
      statusColors: {
        'Activa': 'e6ffea', // Verde claro
        'Pausada': 'fff8e1', // Amarillo claro
        'Cancelada': 'ffebee', // Rojo claro
        'Expirada': 'f5f5f5'  // Gris claro
      },
      
      // Añadir resumen de estados
      statusSummary: statusCounts
    });
    
    if (result) {
      this.ui.showSuccessMessage(`Informe de suscripciones exportado correctamente en formato PDF`);
    }
    
    return result;
  } catch (error) {
    console.error('Error al exportar informe de suscripciones a PDF:', error);
    this.ui.showErrorMessage('Error', 'No se pudo exportar el informe de suscripciones a PDF.');
    return false;
  }
}
}