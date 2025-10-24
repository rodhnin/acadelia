/**
 * Módulo de Configuración Mejorado
 * Gestiona las preferencias y configuraciones del panel administrativo
 * Versión con corrección para el problema del separador CSV
 */

export class SettingsModule {
  constructor(api, ui, eventBus) {
    this.api = api;
    this.ui = ui;
    this.eventBus = eventBus;
    this.settings = {
      general: {
        defaultCurrency: 'EUR',
        dateFormat: 'dd/mm/yyyy',
        timezone: 'Europe/Madrid',
        darkMode: false
      },
      export: {
        defaultFormat: 'excel',
        csvDelimiter: 'semicolon', // Valor por defecto usando el identificador
        includeHeaders: true,
        autoFilename: true
      },
      notifications: {
        newSubscription: true,
        canceledSubscription: true,
        failedPayment: true,
        reportReady: true
      },
      paddle: {
        mode: 'live',
        webhookUrl: 'https://api.acadelia.com/api/webhook/paddle',
        apiKey: '••••••••••••••••' // Oculto por seguridad
      }
    };
    
    // Mapa de traducción entre valores descriptivos y caracteres reales
    this.delimiterMap = {
      'comma': ',',
      'semicolon': ';',
      'tab': '\t'
    };
    
    // Mapa inverso para traducir de caracteres a valores descriptivos
    this.delimiterReverseMap = {
      ',': 'comma',
      ';': 'semicolon',
      '\t': 'tab'
    };
    
    // Flag para rastrear si la configuración ha sido cargada
    this.settingsLoaded = false;
  }
  
  /**
   * Inicializa el módulo de configuración
   */
  async init() {
    console.log('Inicializando módulo de configuración');
    
    // Cargar configuración guardada
    await this.loadSettings();
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Inicializar formularios con valores actuales
    this.populateSettingsForms();
    
    return true;
  }
  
  /**
   * Traduce un valor descriptivo de delimitador a su carácter correspondiente
   * @param {string} delimiterValue - Valor descriptivo (comma, semicolon, tab)
   * @returns {string} - Carácter delimitador real
   */
  translateDelimiterToChar(delimiterValue) {
    return this.delimiterMap[delimiterValue] || ';'; // Por defecto punto y coma
  }
  
  /**
   * Traduce un carácter delimitador a su valor descriptivo
   * @param {string} delimiterChar - Carácter delimitador real
   * @returns {string} - Valor descriptivo (comma, semicolon, tab)
   */
  translateDelimiterToValue(delimiterChar) {
    return this.delimiterReverseMap[delimiterChar] || 'semicolon'; // Por defecto "semicolon"
  }
  
  /**
   * Obtiene el carácter delimitador actualmente configurado
   * @returns {string} - Carácter delimitador real
   */
  getDelimiterChar() {
    const delimiterValue = this.settings.export.csvDelimiter;
    return this.translateDelimiterToChar(delimiterValue);
  }
  
  /**
   * Carga la configuración desde el almacenamiento local con mejor manejo de errores
   */
  async loadSettings() {
    try {
      // Intentar cargar desde localStorage
      const savedSettings = localStorage.getItem('financeAdmin_settings');
      
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          
          // Combinar configuración guardada con valores por defecto usando merge profundo
          this.settings = this.deepMerge(this.settings, parsedSettings);
          
          // Validar valores específicos para asegurar integridad
          this.validateSettings();
          
          console.log('Configuración cargada correctamente:', this.settings);
          
          // Registrar específicamente el separador CSV para diagnóstico
          console.log('Separador CSV cargado (valor descriptivo):', this.settings.export.csvDelimiter);
          console.log('Separador CSV cargado (carácter real):', this.getDelimiterChar());
        } catch (parseError) {
          console.error('Error al parsear configuración guardada:', parseError);
          // Mantener configuración por defecto si hay error de parseo
        }
      } else {
        console.log('No se encontró configuración guardada, usando valores por defecto');
      }
      
      // Marcar como cargada
      this.settingsLoaded = true;
      
      // Sincronizar con módulos que dependen de la configuración
      this.syncSettingsWithModules();
      
      return true;
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      return false;
    }
  }
  
  /**
   * Realiza una fusión profunda de objetos (deep merge)
   * @param {Object} target - Objeto destino
   * @param {Object} source - Objeto fuente
   * @returns {Object} - Objeto fusionado
   */
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * Comprueba si un valor es un objeto
   * @param {any} item - Valor a comprobar
   * @returns {boolean} - True si es un objeto
   */
  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  
  /**
   * Valida valores de configuración para asegurar integridad
   */
  validateSettings() {
    // Validar separador CSV
    if (!this.settings.export.csvDelimiter || 
        !['comma', 'semicolon', 'tab'].includes(this.settings.export.csvDelimiter)) {
      console.warn('Separador CSV inválido, restaurando valor por defecto');
      this.settings.export.csvDelimiter = 'semicolon';
    }
    
    // Otras validaciones pueden añadirse aquí
  }
  
  /**
   * Guarda la configuración actual en el almacenamiento local con mejor manejo
   */
  saveSettings() {
    try {
      // Realizar validación antes de guardar
      this.validateSettings();
      
      // Guardar en localStorage
      localStorage.setItem('financeAdmin_settings', JSON.stringify(this.settings));
      console.log('Configuración guardada correctamente en localStorage');
      
      // Sincronizar con módulos
      this.syncSettingsWithModules();
      
      return true;
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración');
      return false;
    }
  }
  
/**
 * Sincroniza configuración con otros módulos mediante eventos
 * Versión mejorada con mejor control para temas
 */
syncSettingsWithModules() {
  // Notificar de cambios en configuración
  this.eventBus.emit('settingsChanged', this.settings);
  
  // Traducir valor descriptivo del separador CSV al carácter real para ExportManager
  const exportSettings = { ...this.settings.export };
  
  // Añadir el separador CSV real basado en el valor descriptivo
  if (this.delimiterMap && this.settings.export.csvDelimiter) {
    exportSettings.actualDelimiter = this.delimiterMap[this.settings.export.csvDelimiter] || ';';
  }
  
  // Emitir evento específico para cambios en configuración de exportación
  this.eventBus.emit('exportSettingsChanged', exportSettings);
  
  // Sincronizar tema oscuro/claro con evento detallado
  document.dispatchEvent(new CustomEvent('themePreferenceChanged', {
    detail: {
      darkMode: this.settings.general.darkMode,
      timestamp: new Date(),
      source: 'syncSettings'
    }
  }));
  
  console.log('Configuración sincronizada con otros módulos');
}
  
  /**
   * Configura los event listeners para el módulo
   */
  setupEventListeners() {
    // Formulario de configuración general
    const generalForm = document.getElementById('general-settings-form');
    if (generalForm) {
      generalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveGeneralSettings();
      });
    }
    
    // Formulario de configuración de exportación
    const exportForm = document.getElementById('export-settings-form');
    if (exportForm) {
      exportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveExportSettings();
      });
      
      // Añadir listener específico para cambios en el selector de separador CSV
      const csvDelimiterSelect = document.getElementById('csv-delimiter');
      if (csvDelimiterSelect) {
        csvDelimiterSelect.addEventListener('change', (e) => {
          console.log('Cambio detectado en separador CSV:', e.target.value);
        });
      }
    }
    
    // Formulario de configuración de notificaciones
    const notificationForm = document.getElementById('notification-settings-form');
    if (notificationForm) {
      notificationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveNotificationSettings();
      });
    }
    
    // Botón para mostrar/ocultar API key
    const apiKeyToggle = document.querySelector('#paddle-settings-form button');
    if (apiKeyToggle) {
      apiKeyToggle.addEventListener('click', () => {
        const apiKeyInput = document.getElementById('paddle-api-key');
        const isVisible = apiKeyInput.type === 'text';
        
        apiKeyInput.type = isVisible ? 'password' : 'text';
        apiKeyToggle.innerHTML = isVisible ? 
          '<i class="bi bi-eye"></i>' : 
          '<i class="bi bi-eye-slash"></i>';
      });
    }
    
    // Al cambiar de sección
    document.addEventListener('sectionChanged', (e) => {
      if (e.detail.section === 'settings') {
        this.onSectionActivated();
      }
    });
  }
  
  /**
   * Se ejecuta cuando se activa la sección de configuración
   */
  onSectionActivated() {
    // Asegurar que los formularios estén actualizados con la configuración actual
    this.populateSettingsForms();
  }
  
  /**
   * Rellena los formularios con los valores actuales
   */
  populateSettingsForms() {
    // Configuración general
    this.ui.updateFormField('default-currency', this.settings.general.defaultCurrency);
    this.ui.updateFormField('date-format', this.settings.general.dateFormat);
    this.ui.updateFormField('timezone', this.settings.general.timezone);
    
    // Configuración de exportación
    this.ui.updateFormField('default-export-format', this.settings.export.defaultFormat);
    
    // Configuración específica para el selector de separador CSV
    const csvDelimiterSelect = document.getElementById('csv-delimiter');
    if (csvDelimiterSelect) {
      // Usar directamente el valor descriptivo que ya está en la configuración
      csvDelimiterSelect.value = this.settings.export.csvDelimiter;
      console.log('Formulario actualizado - Separador CSV:', csvDelimiterSelect.value);
    }
    
    const includeHeadersCheck = document.getElementById('include-headers');
    if (includeHeadersCheck) {
      includeHeadersCheck.checked = this.settings.export.includeHeaders;
    }
    
    const autoFilenameCheck = document.getElementById('auto-filename');
    if (autoFilenameCheck) {
      autoFilenameCheck.checked = this.settings.export.autoFilename;
    }
    
    // Configuración de notificaciones
    const newSubNotify = document.getElementById('new-subscription-notify');
    if (newSubNotify) {
      newSubNotify.checked = this.settings.notifications.newSubscription;
    }
    
    const canceledSubNotify = document.getElementById('canceled-subscription-notify');
    if (canceledSubNotify) {
      canceledSubNotify.checked = this.settings.notifications.canceledSubscription;
    }
    
    const failedPaymentNotify = document.getElementById('failed-payment-notify');
    if (failedPaymentNotify) {
      failedPaymentNotify.checked = this.settings.notifications.failedPayment;
    }
    
    const reportReadyNotify = document.getElementById('report-ready-notify');
    if (reportReadyNotify) {
      reportReadyNotify.checked = this.settings.notifications.reportReady;
    }
    
    // Configuración de Paddle
    this.ui.updateFormField('paddle-mode', this.settings.paddle.mode);
    this.ui.updateFormField('paddle-webhook-url', this.settings.paddle.webhookUrl);
    this.ui.updateFormField('paddle-api-key', this.settings.paddle.apiKey);
  // Deshabilitar campos específicos
  const fieldsToDisable = ['default-currency', 'date-format', 'timezone'];
  fieldsToDisable.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      // Deshabilitar
      field.disabled = true;
      field.style.opacity = '0.6';
      field.style.cursor = 'not-allowed';
      
      // Añadir tooltip
      field.setAttribute('title', 'Este campo no se puede modificar');
      
    }
  });
  
  // Añadir mensaje informativo si no existe ya
  const formElement = document.getElementById('general-settings-form');
  if (formElement && !formElement.querySelector('.settings-disabled-info')) {
    const infoAlert = document.createElement('div');
    infoAlert.className = 'alert alert-info mb-3 settings-disabled-info';
    infoAlert.innerHTML = '<i class="bi bi-info-circle me-2"></i> Algunos campos de configuración no pueden ser modificados por razones de consistencia del sistema.';
    formElement.insertBefore(infoAlert, formElement.firstChild);
  }
}
  
/**
 * Guarda la configuración general con mejoras para el tema oscuro
 */
saveGeneralSettings() {
  try {
    // Mantener los valores originales para los campos deshabilitados
    this.settings.general = {
      defaultCurrency: this.settings.general.defaultCurrency, // Mantener el valor original
      dateFormat: this.settings.general.dateFormat,           // Mantener el valor original 
      timezone: this.settings.general.timezone,               // Mantener el valor original
    };

    // Guardar configuración
    this.saveSettings();
    
    // Mostrar mensaje de éxito
    this.ui.showSuccessMessage('Configuración general guardada correctamente');
    
    return true;
  } catch (error) {
    console.error('Error al guardar configuración general:', error);
    this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración general');
    return false;
  }
}
  
  /**
   * Guarda la configuración de exportación con mejoras para el separador CSV
   */
  saveExportSettings() {
    try {
      // Obtener elemento del selector de separador CSV
      const csvDelimiterSelect = document.getElementById('csv-delimiter');
      
      // Verificar que el elemento existe
      if (!csvDelimiterSelect) {
        console.error('No se encontró el elemento selector de separador CSV');
        this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración de exportación');
        return false;
      }
      
      // Obtener valores del formulario - usando valores descriptivos directamente
      const defaultFormat = document.getElementById('default-export-format').value;
      const csvDelimiter = csvDelimiterSelect.value; // Valor descriptivo (comma, semicolon, tab)
      const includeHeaders = document.getElementById('include-headers').checked;
      const autoFilename = document.getElementById('auto-filename').checked;
      
      // Validar el separador CSV (debe ser uno de los valores permitidos)
      if (!['comma', 'semicolon', 'tab'].includes(csvDelimiter)) {
        console.warn(`Separador CSV inválido: "${csvDelimiter}", usando valor por defecto: "semicolon"`);
        csvDelimiterSelect.value = 'semicolon';
      }
      
      console.log('Guardando configuración de exportación:', {
        defaultFormat,
        csvDelimiter,
        includeHeaders,
        autoFilename
      });
      
      // Actualizar estado manteniendo los valores descriptivos
      this.settings.export = {
        defaultFormat,
        csvDelimiter,  // Guardar el valor descriptivo
        includeHeaders,
        autoFilename
      };
      
      // Guardar configuración
      const success = this.saveSettings();
      
      if (success) {
        // Mostrar mensaje de éxito
        this.ui.showSuccessMessage('Configuración de exportación guardada correctamente');
        
        // Verificar que se guardó correctamente
        const savedSettings = JSON.parse(localStorage.getItem('financeAdmin_settings') || '{}');
        console.log('Configuración guardada en localStorage:', savedSettings);
        
        // Verificar específicamente el separador CSV
        if (savedSettings.export && savedSettings.export.csvDelimiter) {
          console.log('Valor descriptivo del separador CSV guardado:', savedSettings.export.csvDelimiter);
          console.log('Carácter real del separador CSV:', this.translateDelimiterToChar(savedSettings.export.csvDelimiter));
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error al guardar configuración de exportación:', error);
      this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración de exportación');
      return false;
    }
  }
  
  /**
   * Guarda la configuración de notificaciones
   */
  saveNotificationSettings() {
    try {
      this.settings.notifications = {
        newSubscription: document.getElementById('new-subscription-notify').checked,
        canceledSubscription: document.getElementById('canceled-subscription-notify').checked,
        failedPayment: document.getElementById('failed-payment-notify').checked,
        reportReady: document.getElementById('report-ready-notify').checked
      };
      
      // Guardar configuración
      this.saveSettings();
      
      // Mostrar mensaje de éxito
      this.ui.showSuccessMessage('Configuración de notificaciones guardada correctamente');
      
      return true;
    } catch (error) {
      console.error('Error al guardar configuración de notificaciones:', error);
      this.ui.showErrorMessage('Error', 'No se pudo guardar la configuración de notificaciones');
      return false;
    }
  }
  
  /**
   * Obtiene una configuración específica
   * @param {string} category - Categoría de configuración
   * @param {string} key - Clave de configuración
   * @returns {any} - Valor de la configuración
   */
  getSetting(category, key) {
    if (this.settings[category] && this.settings[category][key] !== undefined) {
      return this.settings[category][key];
    }
    
    console.warn(`Configuración no encontrada: ${category}.${key}`);
    return null;
  }
  
  /**
   * Establece una configuración específica
   * @param {string} category - Categoría de configuración
   * @param {string} key - Clave de configuración
   * @param {any} value - Valor a establecer
   * @returns {boolean} - Éxito de la operación
   */
  setSetting(category, key, value) {
    if (!this.settings[category]) {
      console.warn(`Categoría de configuración no encontrada: ${category}`);
      return false;
    }
    
    // Actualizar valor
    this.settings[category][key] = value;
    
    // Guardar configuración
    this.saveSettings();
    
    return true;
  }
  
  /**
   * Restablece la configuración a valores predeterminados
   * @param {string} category - Categoría a restablecer (o undefined para todo)
   * @returns {boolean} - Éxito de la operación
   */
  resetSettings(category) {
    // Configuraciones por defecto
    const defaultSettings = {
      general: {
        defaultCurrency: 'EUR',
        dateFormat: 'dd/mm/yyyy',
        timezone: 'Europe/Madrid',
        darkMode: false
      },
      export: {
        defaultFormat: 'excel',
        csvDelimiter: 'semicolon',  // Valor descriptivo por defecto
        includeHeaders: true,
        autoFilename: true
      },
      notifications: {
        newSubscription: true,
        canceledSubscription: true,
        failedPayment: true,
        reportReady: true
      },
      paddle: {
        mode: 'live',
        webhookUrl: 'https://api.acadelia.com/api/webhook/paddle',
        apiKey: '••••••••••••••••'
      }
    };
    
    try {
      if (category) {
        // Restablecer solo una categoría
        if (!defaultSettings[category]) {
          console.warn(`Categoría de configuración no encontrada: ${category}`);
          return false;
        }
        
        this.settings[category] = { ...defaultSettings[category] };
      } else {
        // Restablecer toda la configuración
        this.settings = { ...defaultSettings };
      }
      
      // Guardar configuración
      this.saveSettings();
      
      // Actualizar formularios
      this.populateSettingsForms();
      
      // Mostrar mensaje de éxito
      this.ui.showSuccessMessage(`Configuración ${category ? category : 'completa'} restablecida`);
      
      return true;
    } catch (error) {
      console.error('Error al restablecer configuración:', error);
      this.ui.showErrorMessage('Error', 'No se pudo restablecer la configuración');
      return false;
    }
  }
  
  /**
   * Exporta la configuración actual en formato JSON
   * @returns {string|null} - Configuración en formato JSON o null en caso de error
   */
  exportSettings() {
    try {
      // Crear copia profunda de la configuración para eliminar datos sensibles
      const exportableSettings = JSON.parse(JSON.stringify(this.settings));
      
      // Eliminar datos sensibles
      if (exportableSettings.paddle) {
        exportableSettings.paddle.apiKey = '[REDACTED]';
      }
      
      // Convertir a JSON formateado
      const jsonSettings = JSON.stringify(exportableSettings, null, 2);
      
      // Crear blob y descargar
      const blob = new Blob([jsonSettings], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance_admin_settings_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      
      return jsonSettings;
    } catch (error) {
      console.error('Error al exportar configuración:', error);
      this.ui.showErrorMessage('Error', 'No se pudo exportar la configuración');
      return null;
    }
  }
  
  /**
   * Importa configuración desde un archivo JSON
   * @param {File} file - Archivo JSON con la configuración
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async importSettings(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            // Parsear JSON
            const importedSettings = JSON.parse(e.target.result);
            
            // Validar estructura básica
            if (!importedSettings.general || !importedSettings.export) {
              this.ui.showErrorMessage('Error', 'El archivo no contiene una configuración válida');
              resolve(false);
              return;
            }
            
            // Fusionar con la configuración actual usando deep merge
            this.settings = this.deepMerge(this.settings, importedSettings);
            
            // Validar configuración importada
            this.validateSettings();
            
            // No importar la API key por seguridad
            if (importedSettings.paddle) {
              this.settings.paddle.apiKey = this.settings.paddle.apiKey;
            }
            
            // Guardar y actualizar UI
            this.saveSettings();
            this.populateSettingsForms();
            
            // Mostrar mensaje de éxito
            this.ui.showSuccessMessage('Configuración importada correctamente');
            
            resolve(true);
          } catch (parseError) {
            console.error('Error al parsear configuración:', parseError);
            this.ui.showErrorMessage('Error', 'El archivo no contiene JSON válido');
            resolve(false);
          }
        };
        
        reader.onerror = () => {
          this.ui.showErrorMessage('Error', 'No se pudo leer el archivo');
          resolve(false);
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('Error al importar configuración:', error);
        this.ui.showErrorMessage('Error', 'No se pudo importar la configuración');
        resolve(false);
      }
    });
  }
}