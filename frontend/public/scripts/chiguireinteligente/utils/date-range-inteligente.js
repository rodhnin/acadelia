/**
 * Gestor de selección de rangos de fechas
 * Inicializa y gestiona el componente daterangepicker
 */
export class DateRangeManager {
    constructor() {
      this.dateRangeElement = null;
      this.dateRangePicker = null;
      this.currentRange = null;
      this.eventBus = null;
      this.defaultRanges = {
        'Hoy': [moment().startOf('day'), moment().endOf('day')],
        'Ayer': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
        'Últimos 7 días': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
        'Últimos 30 días': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
        'Este mes': [moment().startOf('month'), moment().endOf('month')],
        'Mes anterior': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
        'Este trimestre': [moment().startOf('quarter'), moment().endOf('quarter')],
        'Este año': [moment().startOf('year'), moment().endOf('year')],
        'Año anterior': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')]
      };
    }
    
    /**
     * Inicializa el selector de rango de fechas
     * @param {Object} eventBus - Sistema de eventos para comunicación
     */
    init(eventBus = null) {
      console.log('Inicializando DateRangeManager...');
      this.eventBus = eventBus;
      this.dateRangeElement = document.getElementById('date-range');
      
      if (!this.dateRangeElement) {
        console.error('Elemento de rango de fechas no encontrado. Selector: #date-range');
        return false;
      }
      
      try {
        // Verificar que jQuery esté disponible
        if (typeof $ === 'undefined' || typeof $.fn.daterangepicker === 'undefined') {
          console.error('jQuery o daterangepicker no están disponibles');
          return false;
        }
        
        console.log('Aplicando daterangepicker al elemento...');
        
        // Aplicar daterangepicker al elemento
        $(this.dateRangeElement).daterangepicker({
          ranges: this.defaultRanges,
          startDate: moment().subtract(29, 'days'),
          endDate: moment(),
          locale: {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: 'Aplicar',
            cancelLabel: 'Cancelar',
            fromLabel: 'Desde',
            toLabel: 'Hasta',
            customRangeLabel: 'Personalizado',
            weekLabel: 'S',
            daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
            monthNames: [
              'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ],
            firstDay: 1
          },
          opens: 'left',
          autoApply: false,
          alwaysShowCalendars: true
        }, this.handleDateRangeCallback.bind(this));
        
        // Guardar referencia para uso posterior
        this.dateRangePicker = $(this.dateRangeElement).data('daterangepicker');
        
        // Establecer rango inicial
        this.setDefaultRange();
        
        // Añadir evento apply.daterangepicker para capturar cambios
        $(this.dateRangeElement).on('apply.daterangepicker', (event, picker) => {
          console.log('Evento apply.daterangepicker capturado');
          this.handleDateRangeCallback(picker.startDate, picker.endDate, picker.chosenLabel);
        });
        
        // Configurar report date range si existe
        this.setupReportDateRange();
        
        console.log('DateRangeManager inicializado correctamente');
        return true;
      } catch (error) {
        console.error('Error al inicializar daterangepicker:', error);
        return false;
      }
    }
    
    /**
     * Maneja el callback de selección de fechas
     * @param {moment} start - Fecha de inicio
     * @param {moment} end - Fecha de fin
     * @param {string} label - Etiqueta del rango seleccionado
     */
    handleDateRangeCallback(start, end, label) {
      console.log(`Nuevo rango de fechas seleccionado: ${start.format('YYYY-MM-DD')} a ${end.format('YYYY-MM-DD')} (${label})`);
      
      this.currentRange = {
        start: start.format('YYYY-MM-DD'),
        end: end.format('YYYY-MM-DD'),
        label: label,
        startDate: start,
        endDate: end
      };
      
      // Emitir evento con el sistema de eventos si está disponible
      if (this.eventBus) {
        console.log('Emitiendo evento dateRangeChanged a través del eventBus');
        this.eventBus.emit('dateRangeChanged', this.currentRange);
      }
      
      // También disparar un evento del DOM para compatibilidad
      console.log('Disparando evento dateRangeChanged a través del DOM');
      const event = new CustomEvent('dateRangeChanged', {
        detail: this.currentRange
      });
      document.dispatchEvent(event);
    }
    
    /**
     * Establece el rango por defecto (últimos 30 días)
     */
    setDefaultRange() {
      const start = moment().subtract(29, 'days');
      const end = moment();
      
      console.log(`Estableciendo rango por defecto: ${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}`);
      
      // Actualizar el rango actual
      this.currentRange = {
        start: start.format('YYYY-MM-DD'),
        end: end.format('YYYY-MM-DD'),
        label: 'Últimos 30 días',
        startDate: start,
        endDate: end
      };
      
      // Actualizar el texto del elemento
      this.dateRangeElement.value = start.format('DD/MM/YYYY') + ' - ' + end.format('DD/MM/YYYY');
      
      // Actualizar el picker si ya está inicializado
      if (this.dateRangePicker) {
        this.dateRangePicker.setStartDate(start);
        this.dateRangePicker.setEndDate(end);
      }
      
      // Emitir evento con el sistema de eventos si está disponible
      if (this.eventBus) {
        this.eventBus.emit('dateRangeChanged', this.currentRange);
      }
    }
    
    /**
     * Configura el selector de fechas para informes si existe
     */
    setupReportDateRange() {
      const reportDateRange = document.getElementById('report-date-range');
      const manualReportDateRange = document.getElementById('manual-report-date-range');
      
      // Configurar daterangepicker para informes regulares
      if (reportDateRange) {
        try {
          console.log('Configurando daterangepicker para informes regulares');
          // Aplicar daterangepicker similar al principal
          $(reportDateRange).daterangepicker({
            ranges: this.defaultRanges,
            startDate: moment().startOf('month'),
            endDate: moment().endOf('month'),
            locale: {
              format: 'DD/MM/YYYY',
              separator: ' - ',
              applyLabel: 'Aplicar',
              cancelLabel: 'Cancelar',
              fromLabel: 'Desde',
              toLabel: 'Hasta',
              customRangeLabel: 'Personalizado',
              weekLabel: 'S',
              daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
              monthNames: [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ],
              firstDay: 1
            },
            opens: 'right',
            autoApply: true
          });
          
          // Escuchar cambios en el selector de período para mostrar/ocultar el selector personalizado
          const reportPeriod = document.getElementById('report-period');
          if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => {
              const customContainer = document.querySelector('.custom-date-range');
              if (customContainer) {
                customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
              }
            });
          }
        } catch (error) {
          console.error('Error al inicializar daterangepicker para informes regulares:', error);
        }
      }
      
      // Configurar daterangepicker para informes manuales
      if (manualReportDateRange) {
        try {
          console.log('Configurando daterangepicker para informes manuales');
          $(manualReportDateRange).daterangepicker({
            ranges: this.defaultRanges,
            startDate: moment().startOf('month'),
            endDate: moment().endOf('month'),
            locale: {
              format: 'DD/MM/YYYY',
              separator: ' - ',
              applyLabel: 'Aplicar',
              cancelLabel: 'Cancelar',
              fromLabel: 'Desde',
              toLabel: 'Hasta',
              customRangeLabel: 'Personalizado',
              weekLabel: 'S',
              daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
              monthNames: [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
              ],
              firstDay: 1
            },
            opens: 'right',
            autoApply: true
          });
        } catch (error) {
          console.error('Error al inicializar daterangepicker para informes manuales:', error);
        }
      }
      
      console.log('Configuración de daterangepickers adicionales completada');
    }
    
    /**
     * Obtiene el rango de fechas actual
     * @returns {Object} Rango actual con start, end y label
     */
    getCurrentRange() {
      return this.currentRange;
    }
    
    /**
     * Establece un rango específico
     * @param {string} rangeName - Nombre del rango predefinido
     * @returns {boolean} Éxito de la operación
     */
    setRange(rangeName) {
      if (!this.dateRangeElement || !this.dateRangePicker) {
        console.error('DateRangePicker no inicializado');
        return false;
      }
      
      // Si el rango solicitado existe en los predefinidos
      if (this.defaultRanges[rangeName]) {
        try {
          console.log(`Estableciendo rango predefinido: ${rangeName}`);
          
          // Obtener el rango
          const [start, end] = this.defaultRanges[rangeName];
          
          // Establecer el rango en el picker
          this.dateRangePicker.setStartDate(start);
          this.dateRangePicker.setEndDate(end);
          
          // Actualizar el rango actual
          this.currentRange = {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD'),
            label: rangeName,
            startDate: start,
            endDate: end
          };
          
          // Emitir evento con el sistema de eventos si está disponible
          if (this.eventBus) {
            this.eventBus.emit('dateRangeChanged', this.currentRange);
          }
          
          // También disparar un evento del DOM para compatibilidad
          const event = new CustomEvent('dateRangeChanged', {
            detail: this.currentRange
          });
          document.dispatchEvent(event);
          
          return true;
        } catch (error) {
          console.error(`Error al establecer rango ${rangeName}:`, error);
          return false;
        }
      }
      
      console.warn(`Rango no encontrado: ${rangeName}`);
      return false;
    }
    
    /**
     * Establece un rango personalizado
     * @param {string|Date} start - Fecha de inicio
     * @param {string|Date} end - Fecha de fin
     * @returns {boolean} Éxito de la operación
     */
    setCustomRange(start, end) {
      if (!this.dateRangeElement || !this.dateRangePicker) {
        console.error('DateRangePicker no inicializado');
        return false;
      }
      
      try {
        // Convertir a objetos moment
        const startDate = moment(start);
        const endDate = moment(end);
        
        // Validar fechas
        if (!startDate.isValid() || !endDate.isValid()) {
          console.error('Fechas inválidas para rango personalizado:', start, end);
          return false;
        }
        
        console.log(`Estableciendo rango personalizado: ${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`);
        
        // Establecer el rango en el picker
        this.dateRangePicker.setStartDate(startDate);
        this.dateRangePicker.setEndDate(endDate);
        
        // Actualizar el rango actual
        this.currentRange = {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD'),
          label: 'Personalizado',
          startDate: startDate,
          endDate: endDate
        };
        
        // Emitir evento con el sistema de eventos si está disponible
        if (this.eventBus) {
          this.eventBus.emit('dateRangeChanged', this.currentRange);
        }
        
        // También disparar un evento del DOM para compatibilidad
        const event = new CustomEvent('dateRangeChanged', {
          detail: this.currentRange
        });
        document.dispatchEvent(event);
        
        return true;
      } catch (error) {
        console.error('Error al establecer rango personalizado:', error);
        return false;
      }
    }
    
    /**
     * Obtiene el rango de fechas en formato específico
     * @param {string} format - Formato de fecha (YYYY-MM-DD por defecto)
     * @returns {Object} Rango formateado
     */
    getFormattedRange(format = 'YYYY-MM-DD') {
      if (!this.currentRange) return null;
      
      const { startDate, endDate, label } = this.currentRange;
      
      return {
        start: startDate.format(format),
        end: endDate.format(format),
        label
      };
    }
    
    /**
     * Obtiene parámetros de URL para el rango actual
     * @returns {string} Query string con parámetros de rango
     */
    getQueryParams() {
      if (!this.currentRange) return '';
      
      const { start, end } = this.currentRange;
      return `start_date=${start}&end_date=${end}`;
    }
    
    /**
     * Refresca el daterangepicker (útil después de cambios en el DOM)
     */
    refresh() {
      if (this.dateRangePicker) {
        console.log('Refrescando daterangepicker');
        // Actualizar picker si es necesario
        this.dateRangePicker.updateView();
        this.dateRangePicker.updateCalendars();
      }
    }
    
    /**
     * Destruye el daterangepicker actual (útil para reinicializar)
     */
    destroy() {
      if (this.dateRangePicker) {
        console.log('Destruyendo daterangepicker');
        this.dateRangePicker.remove();
        this.dateRangePicker = null;
      }
    }
  }