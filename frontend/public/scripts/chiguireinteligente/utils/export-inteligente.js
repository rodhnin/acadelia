/**
 * Utilidades para exportar datos en diferentes formatos
 * Versión mejorada con formato corporativo para Excel
 */

import { formatCurrency, formatDate } from './formatter-inteligente.js';

/**
 * Clase para manejar exportaciones de datos
 */
export class ExportManager {
  constructor() {
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
    
    // Opciones de exportación por defecto
    this.defaultOptions = {
      fileName: 'datos_exportados',
      includeHeaders: true,
      includeTimestamp: true,
      dateFormat: 'DD/MM/YYYY',
      sheetName: 'Datos',
      format: 'excel',
      csvDelimiter: ';',  // Valor por defecto (carácter real)
      csvDelimiterValue: 'semicolon', // Valor descriptivo por defecto
      // Nuevas opciones para el formato mejorado
      useAdvancedFormat: true,
      includeCompanyHeader: true,
      includeTotals: true,
      includeFilters: true,
      logoUrl: '/images/Imagotipo.webp', // Ruta al logo de Acadelia
      companyName: 'Acadelia',
      // Nuevas opciones específicas para PDF
      pdf: {
        pageSize: 'auto',         // 'auto', 'A4', 'A3', 'letter', etc.
        orientation: 'landscape', // 'landscape' o 'portrait'
        optimizeForWideTables: true, // Activa optimizaciones para tablas anchas
        fontSizeReduction: 'auto', // 'auto', 'none', 'small', 'medium', 'large'
        compressImages: true,     // Comprimir imágenes para reducir tamaño
        splitSections: false,     // Poner cada sección en una nueva página
        fitToPage: true           // Intentar ajustar tablas al ancho de página
      }
    };
    
    // Colores de marca Acadelia
    this.brandColors = {
      primary: '656d4a',    // Verde principal
      secondary: 'a4ac86',  // Verde claro
      background: 'f0efe7',  // Fondo
      marron: '582f0e',     // Marrón
      marronOscuro: '442409', // Marrón oscuro
      text: '333333',       // Color texto
      white: 'FFFFFF',      // Blanco
      headerBg: 'e2ddd6'    // Fondo de encabezados
    };
    
    // Inicializar listener para cambios en configuración
    this.initSettingsListener();
  }
  
  /**
   * Exporta datos a Excel (XLSX)
   * @param {Array} data - Datos a exportar
   * @param {Object} options - Opciones de exportación
   * @returns {boolean} Éxito de la exportación
   */
  async exportToExcel(data, options = {}) {
    try {
      if (!data || data.length === 0) {
        console.warn('No hay datos para exportar');
        return false;
      }
      
      // Combinar opciones con valores por defecto
      const exportOptions = { ...this.defaultOptions, ...options };
      
      // Generar nombre de archivo con timestamp si se solicita
      const fileName = this.generateFileName(exportOptions);
      
      // Comprobar si usar el formato avanzado con ExcelJS
      if (exportOptions.useAdvancedFormat && typeof window.ExcelJS !== 'undefined') {
        // Usar ExcelJS para formato avanzado
        return await this.exportToExcelAdvanced(data, exportOptions);
      } else {
        // Usar el método tradicional con XLSX
        return this.exportToExcelLegacy(data, exportOptions);
      }
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      return false;
    }
  }

  /**
   * Inicializa el listener para cambios en configuración
   */
  initSettingsListener() {
    // Verificar si el evento está disponible
    if (window.addEventListener && window.financeAdmin && window.financeAdmin.eventBus) {
      // Escuchar cambios específicos en configuración de exportación
      window.financeAdmin.eventBus.on('exportSettingsChanged', (exportSettings) => {
        console.log('ExportManager: Recibida actualización de configuración de exportación', exportSettings);
        this.updateExportSettings(exportSettings);
      });
      
      // Escuchar cambios generales en configuración
      window.financeAdmin.eventBus.on('settingsChanged', (settings) => {
        if (settings && settings.export) {
          console.log('ExportManager: Recibida actualización de configuración general');
          this.updateExportSettings(settings.export);
        }
      });
    } else {
      console.warn('ExportManager: No se pudo inicializar el listener de cambios en configuración');
    }
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
   * Actualiza las opciones de exportación según la configuración recibida
   * @param {Object} exportSettings - Configuración de exportación
   */
  updateExportSettings(exportSettings) {
    if (!exportSettings) return;
    
    // Actualizar opciones relevantes
    if (exportSettings.csvDelimiter) {
      // Si recibimos un valor descriptivo, actualizamos ambos
      const delimiterValue = exportSettings.csvDelimiter;
      console.log(`ExportManager: Actualizando separador CSV a: "${delimiterValue}" (valor descriptivo)`);
      
      // Guardar el valor descriptivo
      this.defaultOptions.csvDelimiterValue = delimiterValue;
      
      // Traducir al carácter real
      const delimiterChar = this.translateDelimiterToChar(delimiterValue);
      this.defaultOptions.csvDelimiter = delimiterChar;
      console.log(`ExportManager: Carácter real del separador: "${delimiterChar}"`);
    }
    
    // Si recibimos explícitamente el carácter real del módulo de configuración
    if (exportSettings.actualDelimiter) {
      console.log(`ExportManager: Recibido carácter explícito del separador: "${exportSettings.actualDelimiter}"`);
      this.defaultOptions.csvDelimiter = exportSettings.actualDelimiter;
    }
    
    if (exportSettings.defaultFormat) {
      console.log(`ExportManager: Actualizando formato por defecto a: "${exportSettings.defaultFormat}"`);
      this.defaultOptions.format = exportSettings.defaultFormat;
    }
    
    if (exportSettings.includeHeaders !== undefined) {
      this.defaultOptions.includeHeaders = exportSettings.includeHeaders;
    }
    
    if (exportSettings.autoFilename !== undefined) {
      this.defaultOptions.includeTimestamp = exportSettings.autoFilename;
    }
  }

  /**
   * Obtiene el formato preferido del usuario desde la configuración guardada
   * @param {string} defaultFormat - Formato a usar si no hay configuración guardada
   * @returns {string} Formato preferido ('excel', 'pdf', 'csv' o 'json')
   */
  getPreferredFormat(defaultFormat = 'excel') {
    try {
      // Intentar leer configuración desde localStorage
      const savedSettings = JSON.parse(localStorage.getItem('financeAdmin_settings') || '{}');
      
      // Si hay configuración guardada, usarla
      if (savedSettings.export && savedSettings.export.defaultFormat) {
        const format = savedSettings.export.defaultFormat;
        console.log(`ExportManager: Usando formato preferido del usuario: ${format}`);
        return format;
      }
    } catch (e) {
      console.warn('ExportManager: Error al leer formato preferido:', e);
    }
    
    // Si no hay configuración o hubo error, usar valor por defecto
    return defaultFormat;
  }

  /**
   * Obtiene el separador CSV desde la configuración guardada
   * @returns {string} Separador CSV preferido (carácter real)
   */
  getPreferredCsvDelimiter() {
    try {
      // Intentar leer configuración desde localStorage
      const savedSettings = JSON.parse(localStorage.getItem('financeAdmin_settings') || '{}');
      
      // Si hay configuración guardada para el separador CSV, traducirla a carácter real
      if (savedSettings.export && savedSettings.export.csvDelimiter) {
        const delimiterValue = savedSettings.export.csvDelimiter;
        
        // Traducir el valor descriptivo al carácter real
        const delimiterChar = this.translateDelimiterToChar(delimiterValue);
        console.log(`ExportManager: Usando separador CSV del usuario: "${delimiterValue}" (valor descriptivo) => "${delimiterChar}" (carácter real)`);
        
        return delimiterChar;
      }
    } catch (e) {
      console.warn('ExportManager: Error al leer separador CSV preferido:', e);
    }
    
    // Si no hay configuración o hubo error, usar valor por defecto
    return this.defaultOptions.csvDelimiter;
  }
  
  /**
   * Exporta datos a Excel usando el método tradicional con XLSX
   * @param {Array} data - Datos a exportar
   * @param {Object} options - Opciones de exportación
   * @returns {boolean} Éxito de la exportación
   */
  exportToExcelLegacy(data, options) {
    try {
      // Crear libro y hoja
      const wb = XLSX.utils.book_new();
      
      // Convertir datos a formato de hoja
      const ws = XLSX.utils.json_to_sheet(data, {
        header: this.extractHeaders(data, options),
        skipHeader: !options.includeHeaders
      });
      
      // Añadir hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, options.sheetName);
      
      // Descargar archivo
      XLSX.writeFile(wb, `${options.fileName}.xlsx`);
      
      console.log('Datos exportados a Excel correctamente');
      return true;
    } catch (error) {
      console.error('Error al exportar a Excel (método legacy):', error);
      return false;
    }
  }

/**
 * Exporta datos a Excel con formato corporativo avanzado usando ExcelJS
 * @param {Array} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 * @returns {boolean} Éxito de la exportación
 */
async exportToExcelAdvanced(data, options) {
  try {
    const Excel = window.ExcelJS;
    const workbook = new Excel.Workbook();
    
    // Generar nombre de archivo con timestamp si se solicita
    const fileName = this.generateFileName(options);
    
    // Configurar propiedades del documento
    workbook.creator = options.companyName;
    workbook.lastModifiedBy = options.companyName;
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Crear hoja
    const worksheet = workbook.addWorksheet(options.sheetName, {
      views: [{showGridLines: true}],
      properties: {tabColor: {argb: this.brandColors.secondary}}
    });
    
    // Añadir encabezado corporativo si está habilitado
    if (options.includeCompanyHeader) {
      this.addCorporateHeader(worksheet, workbook, options);
    }
    
    // Extraer encabezados de columnas
    const headers = this.extractHeaders(data, options);
    
    // Detectar columnas numéricas y monetarias para sumatorias
    const numericColumns = this.detectNumericColumns(data, headers);
    const currencyColumns = this.detectCurrencyColumns(headers);
    
    // Obtener formatos específicos de moneda si se proporcionan
    const currencyFormats = options.currencyFormats || {};


// NUEVO: Obtener formatos enteros si se proporcionan
const integerFormats = options.integerFormats || {};
    
    // Añadir fila de encabezados con estilo
    const headerRow = worksheet.addRow(headers);
    // Guardamos la fila de los encabezados para los filtros
    const headerRowNum = worksheet.rowCount;
    
    // Aplicar estilo a los encabezados
    this.styleHeaderRow(headerRow, worksheet);
    
    // Añadir datos
    data.forEach((item, index) => {
      // Extraer valores de este elemento en el mismo orden que los encabezados
      const rowValues = headers.map(header => {
        let value = item[header];
        
        // Formatear fechas si el campo contiene fechas
        if (value instanceof Date) {
          return value; // ExcelJS manejará el formateo de fechas
        }
        
        // MODIFICADO: Verificar tanto formatos de moneda como enteros
        if ((currencyFormats && currencyFormats[header] || 
             integerFormats && integerFormats[header]) && 
            (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          return parseFloat(value);
        }
        
        // Devolver el valor tal cual para que Excel lo maneje
        return value;
      });
      
      const row = worksheet.addRow(rowValues);
      
      // Aplicar formato a celdas específicas de moneda
      if (currencyFormats) {
        headers.forEach((header, idx) => {
          if (currencyFormats[header]) {
            const cell = row.getCell(idx + 1);
            cell.numFmt = currencyFormats[header];
          }
        });
      }

      // NUEVO: Aplicar formato a celdas específicas de enteros
if (integerFormats) {
  headers.forEach((header, idx) => {
    if (integerFormats[header]) {
      const cell = row.getCell(idx + 1);
      cell.numFmt = integerFormats[header];
    }
  });
}
      
      // Aplicar estilos alternados para facilitar lectura
      if (index % 2 !== 0) {
        this.styleAlternateRow(row);
      }
      
      // Resaltar filas deducibles si está habilitado (específico para egresos)
      if (options.highlightDeductibles && headers.includes('Deducible')) {
        const deductibleIdx = headers.indexOf('Deducible');
        const deductibleValue = item['Deducible'];
        
        if (deductibleValue === 'Sí') {
          // Aplicar estilo de resaltado a toda la fila
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.deductibleColor || 'e6fffa' }
            };
            // Añadir borde más visible
            cell.border = {
              top: { style: 'thin', color: { argb: 'c3e6cb' } },
              left: { style: 'thin', color: { argb: 'c3e6cb' } },
              bottom: { style: 'thin', color: { argb: 'c3e6cb' } },
              right: { style: 'thin', color: { argb: 'c3e6cb' } }
            };
          });
        } else if (deductibleValue === 'No') {
          // Aplicar estilo de resaltado rojizo a toda la fila para no deducibles
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.nonDeductibleColor || 'ffebee' } // Color rojizo claro
            };
            // Añadir borde más visible
            cell.border = {
              top: { style: 'thin', color: { argb: 'ffcdd2' } },
              left: { style: 'thin', color: { argb: 'ffcdd2' } },
              bottom: { style: 'thin', color: { argb: 'ffcdd2' } },
              right: { style: 'thin', color: { argb: 'ffcdd2' } }
            };
          });
        }
      }
      
      // Resaltar filas según estado (para suscripciones)
      if (options.highlightStatus && headers.includes('Estado') && options.statusColors) {
        const statusValue = item['Estado'];
        
        if (statusValue && options.statusColors[statusValue]) {
          // Aplicar estilo de resaltado a toda la fila
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.statusColors[statusValue] }
            };
            
            // Color de borde en base al estado
            let borderColor;
            switch(statusValue) {
              case 'Activa': borderColor = 'c3e6cb'; break; // Verde
              case 'Pausada': borderColor = 'ffeeba'; break; // Amarillo
              case 'Cancelada': borderColor = 'ffcdd2'; break; // Rojo
              case 'Expirada': borderColor = 'e0e0e0'; break; // Gris
              default: borderColor = 'e0e0e0';
            }
            
            // Añadir borde visible
            cell.border = {
              top: { style: 'thin', color: { argb: borderColor } },
              left: { style: 'thin', color: { argb: borderColor } },
              bottom: { style: 'thin', color: { argb: borderColor } },
              right: { style: 'thin', color: { argb: borderColor } }
            };
          });
        }
      }
      
      // Resaltar usuarios inactivos (para exportación de usuarios)
      if (options.highlightInactiveUsers && 
          headers.includes('Suscripciones Activas') && 
          headers.includes('Total Suscripciones')) {
        
        const activeSubs = Number(item['Suscripciones Activas'] || 0);
        const totalSubs = Number(item['Total Suscripciones'] || 0);
        
        // Si el usuario tenía suscripciones pero ya no tiene activas
        if (totalSubs > 0 && activeSubs === 0) {
          // Aplicar estilo de resaltado a toda la fila
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.inactiveUserColor || 'ffebee' }
            };
            // Añadir borde más visible
            cell.border = {
              top: { style: 'thin', color: { argb: 'ffcdd2' } },
              left: { style: 'thin', color: { argb: 'ffcdd2' } },
              bottom: { style: 'thin', color: { argb: 'ffcdd2' } },
              right: { style: 'thin', color: { argb: 'ffcdd2' } }
            };
          });
        }
      }
    });
    
    // Ajustar ancho de columnas automáticamente
    worksheet.columns.forEach(column => {
      column.width = Math.max(15, this.getMaxLength(column.values) + 2);
    });
    
    // Añadir sumatorias si está habilitado
    if (options.includeTotals && 
        (numericColumns.length > 0 || (options.columnsWithTotals && options.columnsWithTotals.length > 0))) {
      this.addTotalsRow(worksheet, headers, numericColumns, currencyColumns, options);
    }
    
// Añadir sección de totales deducibles si está habilitado (específico para egresos)
if (options.deductibleSummary && 
    (options.deductibleSummary.ivaDeducible !== undefined || 
     options.deductibleSummary.gastoDeducible !== undefined)) {
  // Añadir espacio entre los totales normales y la sección de deducibles
  worksheet.addRow([]);
  
  // Añadir título para la sección de deducibles
  const deductibleTitle = worksheet.addRow(['RESUMEN DE GASTOS DEDUCIBLES']);
  deductibleTitle.font = {
    name: 'Poppins',
    family: 4,
    size: 12,
    bold: true,
    color: { argb: this.brandColors.marron }
  };
  deductibleTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'c3e6cb' } // Verde claro
  };
  
  // Añadir IVA deducible
  if (options.deductibleSummary.ivaDeducible !== undefined) {
    const ivaDeducibleRow = worksheet.addRow(['IVA DEDUCIBLE:', options.deductibleSummary.ivaDeducible]);
    
    // Aplicar formato de moneda
    const ivaCell = ivaDeducibleRow.getCell(2);
    ivaCell.numFmt = '€#,##0.00';
    
    // Estilos para fila de IVA Deducible
    ivaDeducibleRow.font = {
      bold: true
    };
    ivaDeducibleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e8f4ea' } // Verde muy claro
    };
  }
  
  // Añadir GASTO deducible
  if (options.deductibleSummary.gastoDeducible !== undefined) {
    const gastoDeducibleRow = worksheet.addRow(['GASTO DEDUCIBLE:', options.deductibleSummary.gastoDeducible]);
    
    // Aplicar formato de moneda
    const gastoCell = gastoDeducibleRow.getCell(2);
    gastoCell.numFmt = '€#,##0.00';
    
    // Estilos para fila de Gasto Deducible
    gastoDeducibleRow.font = {
      bold: true
    };
    gastoDeducibleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e8f4ea' } // Verde muy claro
    };
  }
  
  // NUEVO: Añadir TOTAL DEDUCIBLE (suma de IVA y GASTO)
  if (options.deductibleSummary.totalDeducible !== undefined) {
    const totalDeducibleRow = worksheet.addRow(['TOTAL DEDUCIBLE:', options.deductibleSummary.totalDeducible]);
    
    // Aplicar formato de moneda
    const totalCell = totalDeducibleRow.getCell(2);
    totalCell.numFmt = '€#,##0.00';
    
    // Estilos para fila de Total Deducible (más destacada)
    totalDeducibleRow.font = {
      bold: true,
      size: 11
    };
    totalDeducibleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'c3e6cb' } // Verde más oscuro para destacar
    };
    totalDeducibleRow.getCell(2).font = {
      bold: true,
      size: 11,
      color: { argb: '006400' } // Verde oscuro para el valor
    };
    
    // Agregar borde inferior para separar visualmente
    totalDeducibleRow.border = {
      bottom: { style: 'thin', color: { argb: '006400' } }
    };
  }
}
    
    // Añadir sección de resumen de estados (para suscripciones)
    if (options.statusSummary) {
      // Añadir espacio entre secciones
      worksheet.addRow([]);
      
      // Añadir título para la sección de resumen
      const summaryTitle = worksheet.addRow(['RESUMEN DE SUSCRIPCIONES POR ESTADO']);
      summaryTitle.font = {
        name: 'Poppins',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: this.brandColors.marron }
      };
      summaryTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e0e0e0' } // Gris claro
      };
      
      // Añadir conteo por cada estado
      for (const [status, count] of Object.entries(options.statusSummary)) {
        const statusRow = worksheet.addRow([`${status}:`, count]);
        
        // Aplicar formato de número entero sin decimales
        const countCell = statusRow.getCell(2);
        countCell.numFmt = '#,##0';
        
        // Estilos para fila de estado
        statusRow.font = {
          bold: true
        };
        
        // Color de celda según estado
        let bgColor;
        switch(status) {
          case 'Activa': bgColor = 'e6ffea'; break; // Verde claro
          case 'Pausada': bgColor = 'fff8e1'; break; // Amarillo claro
          case 'Cancelada': bgColor = 'ffebee'; break; // Rojo claro
          case 'Expirada': bgColor = 'f5f5f5'; break; // Gris claro
          default: bgColor = 'f5f5f5';
        }
        
        statusRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
      }
      
      // Añadir total
      const totalCount = Object.values(options.statusSummary).reduce((a, b) => a + b, 0);
      const totalRow = worksheet.addRow(['TOTAL:', totalCount]);
      
      // Aplicar formato de número entero sin decimales
      const totalCell = totalRow.getCell(2);
      totalCell.numFmt = '#,##0';
      
      totalRow.font = {
        bold: true,
        size: 12
      };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.brandColors.headerBg }
      };
    }
    
    // Añadir sección de resumen de usuarios inactivos
    if (options.inactiveUserSummary) {
      // Añadir espacio entre secciones
      worksheet.addRow([]);
      
      // Añadir título para la sección de resumen
      const summaryTitle = worksheet.addRow(['ANÁLISIS DE RETENCIÓN DE USUARIOS']);
      summaryTitle.font = {
        name: 'Poppins',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: this.brandColors.marron }
      };
      summaryTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'f5f5f5' } // Gris claro
      };
      
      // Añadir contador de usuarios inactivos
      const inactiveCount = worksheet.addRow(['Usuarios que han dejado de usar la plataforma:', options.inactiveUserSummary.count]);
      
      // Aplicar formato de número entero sin decimales
      const countCell = inactiveCount.getCell(2);
      countCell.numFmt = '#,##0';
      
      inactiveCount.font = {
        bold: true
      };
      inactiveCount.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ffebee' } // Rojizo claro
      };
      
      // Añadir porcentaje de usuarios inactivos
      const inactivePercentage = worksheet.addRow(['Porcentaje de abandono:', `${options.inactiveUserSummary.percentage}%`]);
      inactivePercentage.font = {
        bold: true
      };
    }

// Añadir sección de análisis de productos si está habilitado
if (options.productAnalysis) {
  // Añadir espacio entre secciones
  worksheet.addRow([]);
  
  // Añadir título para la sección de análisis
  const analysisTitleRow = worksheet.addRow(['ANÁLISIS DE PRODUCTOS']);
  analysisTitleRow.font = {
    name: 'Poppins',
    family: 4,
    size: 12,
    bold: true,
    color: { argb: this.brandColors.marron }
  };
  analysisTitleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'f5f5f5' } // Gris claro
  };
  
  // Total suscripciones e ingresos
  const totalRow = worksheet.addRow(['Total Suscripciones Activas:', options.productAnalysis.totalSubscriptions]);
  totalRow.getCell(2).numFmt = '#,##0'; // CORRECCIÓN: Formato entero sin decimales
  totalRow.font = { bold: true };
  
  const revenueRow = worksheet.addRow(['Total Ingresos:', options.productAnalysis.totalRevenue]);
  revenueRow.getCell(2).numFmt = '€#,##0.00';
  revenueRow.font = { bold: true };
  
  // Añadir distribución de planes
  worksheet.addRow(['']);
  const plansTitleRow = worksheet.addRow(['DISTRIBUCIÓN DE PLANES']);
  plansTitleRow.font = {
    name: 'Poppins',
    family: 4,
    size: 11,
    bold: true,
    color: { argb: this.brandColors.marron }
  };
  plansTitleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e3f2fd' } // Azul claro
  };
  
  // Encabezados para planes
  const plansHeaderRow = worksheet.addRow(['Tipo de Plan', 'Suscripciones', '%']);
  plansHeaderRow.font = { bold: true };
  
  // Calcular totales primero para porcentajes correctos
  const totalPlans = (options.productAnalysis.planDistribution['Mensual'] || 0) + 
                     (options.productAnalysis.planDistribution['Anual'] || 0);
  
  // Datos de planes con cálculo de porcentaje correcto
  const monthlyRow = worksheet.addRow([
    'Mensual',
    options.productAnalysis.planDistribution['Mensual'] || 0,
    totalPlans > 0 ? (options.productAnalysis.planDistribution['Mensual'] / totalPlans) : 0
  ]);
  monthlyRow.getCell(2).numFmt = '#,##0'; // CORRECCIÓN: Formato entero sin decimales
  monthlyRow.getCell(3).numFmt = '0.0%';  // Formato de porcentaje
  
  const yearlyRow = worksheet.addRow([
    'Anual',
    options.productAnalysis.planDistribution['Anual'] || 0,
    totalPlans > 0 ? (options.productAnalysis.planDistribution['Anual'] / totalPlans) : 0
  ]);
  yearlyRow.getCell(2).numFmt = '#,##0'; // CORRECCIÓN: Formato entero sin decimales
  yearlyRow.getCell(3).numFmt = '0.0%';  // Formato de porcentaje
  
  // Añadir TOP productos
  worksheet.addRow(['']);
  const productsTitleRow = worksheet.addRow(['LISTA DE PRODUCTOS POR INGRESOS']);
  productsTitleRow.font = {
    name: 'Poppins',
    family: 4,
    size: 11,
    bold: true,
    color: { argb: this.brandColors.marron }
  };
  productsTitleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'e8f5e9' } // Verde claro
  };
  
  // Encabezados para productos
  const productsHeaderRow = worksheet.addRow(['Producto', 'Ingresos (EUR)', '%']);
  productsHeaderRow.font = { bold: true };
  
  // Datos de todos los productos
  let productIndex = 0;
  Object.entries(options.productAnalysis.topProducts).forEach(([product, data]) => {
    const row = worksheet.addRow([
      product,
      data.revenue,
      data.percentage / 100  // Dividir por 100 para formato de porcentaje
    ]);
    
    // Formato numérico
    row.getCell(2).numFmt = '€#,##0.00';
    row.getCell(3).numFmt = '0.0%';
    
    // Estilo alternado
    if (productIndex % 2 !== 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'f1f8f1' } // Verde muy claro
        };
      });
    }
    
    productIndex++;
  });
}
    
    // NUEVO: Añadir sección de análisis de transacciones
    if (options.transactionAnalysis) {
      // Añadir espacio entre secciones
      worksheet.addRow([]);
      
      // Añadir título para la sección de análisis
      const analysisTitleRow = worksheet.addRow(['ANÁLISIS DE TRANSACCIONES']);
      analysisTitleRow.font = {
        name: 'Poppins',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: this.brandColors.marron }
      };
      analysisTitleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'f5f5f5' } // Gris claro
      };
      
      // Total general
      const totalRow = worksheet.addRow(['Monto total de transacciones:', options.transactionAnalysis.totalAmount]);
      totalRow.getCell(2).numFmt = '€#,##0.00';
      totalRow.font = {
        bold: true
      };
      
      // Añadir análisis de métodos de pago
      worksheet.addRow(['']);
      const methodsTitleRow = worksheet.addRow(['TOP 5 MÉTODOS DE PAGO']);
      methodsTitleRow.font = {
        name: 'Poppins',
        family: 4,
        size: 11,
        bold: true,
        color: { argb: this.brandColors.marron }
      };
      methodsTitleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e3f2fd' } // Azul claro
      };
      
      // Encabezados para métodos de pago
      const methodsHeaderRow = worksheet.addRow(['Método de Pago', 'Importe (EUR)', '%', 'Transacciones']);
      methodsHeaderRow.font = {
        bold: true
      };
      
      // Datos de métodos de pago
      let methodIndex = 0;
      Object.entries(options.transactionAnalysis.paymentMethods).forEach(([method, data]) => {
        const row = worksheet.addRow([
          method,
          data.amount,
          data.percentage / 100,
          data.count
        ]);
        
        // Formato numérico
        row.getCell(2).numFmt = '€#,##0.00';
        row.getCell(3).numFmt = '0.0%';
        row.getCell(4).numFmt = '#,##0';
        
        // Estilo alternado
        if (methodIndex % 2 !== 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f3f9fe' } // Azul muy claro
            };
          });
        }
        
        methodIndex++;
      });
      
      // Añadir análisis de países
      worksheet.addRow(['']);
      const countriesTitleRow = worksheet.addRow(['TOP 5 PAÍSES']);
      countriesTitleRow.font = {
        name: 'Poppins',
        family: 4,
        size: 11,
        bold: true,
        color: { argb: this.brandColors.marron }
      };
      countriesTitleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e8f5e9' } // Verde claro
      };
      
      // Encabezados para países
      const countriesHeaderRow = worksheet.addRow(['País', 'Importe (EUR)', '%', 'Transacciones']);
      countriesHeaderRow.font = {
        bold: true
      };
      
      // Datos de países
      let countryIndex = 0;
      Object.entries(options.transactionAnalysis.countries).forEach(([country, data]) => {
        const row = worksheet.addRow([
          country,
          data.amount,
          data.percentage / 100,
          data.count
        ]);
        
        // Formato numérico
        row.getCell(2).numFmt = '€#,##0.00';
        row.getCell(3).numFmt = '0.0%';
        row.getCell(4).numFmt = '#,##0';
        
        // Estilo alternado
        if (countryIndex % 2 !== 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f1f8f1' } // Verde muy claro
            };
          });
        }
        
        countryIndex++;
      });
    }
    
    // Añadir filtros si está habilitado
    if (options.includeFilters) {
      // Calcular el rango donde aplicar los filtros (excluyendo el encabezado corporativo)
      worksheet.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to: { row: headerRowNum, column: headers.length }
      };
    }
    
    // Configurar propiedades de impresión
    worksheet.pageSetup = {
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
    
// Congelar la fila de encabezados para facilitar la navegación
const freezeRow = options.includeCompanyHeader ? 4 : 1; // Cambiado de 6 a 4
worksheet.views = [
  { state: 'frozen', xSplit: 0, ySplit: freezeRow, activeCell: 'A1' }
];
    
    // Generar archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Crear blob y descargar
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    this.downloadBlob(blob, `${fileName}.xlsx`);
    
    console.log('Datos exportados a Excel correctamente con formato corporativo');
    return true;
  } catch (error) {
    console.error('Error al exportar a Excel con formato avanzado:', error);
    // Si falla el formato avanzado, intentar con el método tradicional como fallback
    console.log('Intentando exportar con método tradicional como fallback...');
    return this.exportToExcelLegacy(data, options);
  }
}
  
/**
 * Añade un encabezado corporativo con logo a la hoja
 * @param {Object} worksheet - Hoja de Excel
 * @param {Object} workbook - Libro de Excel
 * @param {Object} options - Opciones de exportación
 */
addCorporateHeader(worksheet, workbook, options) {
  // Añadir título del informe directamente en la primera fila visible
  const reportTitle = options.title || `Informe de ${options.sheetName}`;
  const titleRow = worksheet.addRow([reportTitle]);
  
  // Estilo para el título
  titleRow.height = 30;
  titleRow.font = {
    name: 'Poppins',
    family: 4,
    size: 18,
    bold: true,
    color: { argb: this.brandColors.marron }
  };
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Fusionar celdas para el título
  worksheet.mergeCells(`B1:${this.getColumnLetter(this.extractHeaders([], options).length)}1`);
  
  // Añadir subtítulo con fecha (sin fila en blanco en medio)
  const today = new Date();
  const formattedDate = formatDate(today, 'long');
  const subtitleRow = worksheet.addRow([`Generado el ${formattedDate}`]);
  
  // Estilo para el subtítulo
  subtitleRow.font = {
    name: 'Poppins',
    family: 4,
    size: 11,
    italic: true,
    color: { argb: this.brandColors.text }
  };
  subtitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Fusionar celdas para el subtítulo
  worksheet.mergeCells(`A2:${this.getColumnLetter(this.extractHeaders([], options).length)}2`);
  
  // Añadir borde inferior para separar el encabezado corporativo (sin filas en blanco)
  const borderRow = worksheet.addRow([]);
  borderRow.border = {
    bottom: { style: 'medium', color: { argb: this.brandColors.primary } }
  };
  
  // Intentar añadir imagen si está habilitado
  if (options.includeLogo !== false && options.logoUrl) {
    try {
      // Uso de imagen base64 para entorno de navegador
      this.addLogoToWorkbook(workbook, worksheet, options.logoUrl);
    } catch (error) {
      console.warn('No se pudo agregar el logo al documento Excel:', error);
    }
  }
}

/**
 * Añade un logo al libro de Excel
 * @param {Object} workbook - Libro de Excel
 * @param {Object} worksheet - Hoja de Excel
 * @param {string} logoUrl - URL del logo
 */
async addLogoToWorkbook(workbook, worksheet, logoUrl) {
  try {
    // Intentar cargar la imagen usando fetch (funciona en navegador)
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    
    // Convertir blob a base64
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result.split(',')[1];
        
        // Añadir imagen usando base64
        const imageId = workbook.addImage({
          base64: base64,
          extension: 'png',
        });
        
        // Añadir a la hoja en posición A1
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          br: { col: 1, row: 2 },
          editAs: 'oneCell'
        });
      } catch (e) {
        console.error('Error al procesar imagen para Excel:', e);
      }
    };
    
    reader.readAsDataURL(blob);
  } catch (error) {
    console.error('Error al cargar imagen desde URL:', error);
  }
}
  
  /**
   * Aplica estilos a la fila de encabezados
   * @param {Object} headerRow - Fila de encabezados
   * @param {Object} worksheet - Hoja de Excel
   */
  styleHeaderRow(headerRow, worksheet) {
    // Estilo para encabezados
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.brandColors.primary }
      };
      cell.font = {
        name: 'Poppins',
        family: 4,
        size: 12,
        bold: true,
        color: { argb: this.brandColors.white }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: this.brandColors.primary } },
        left: { style: 'thin', color: { argb: this.brandColors.primary } },
        bottom: { style: 'thin', color: { argb: this.brandColors.primary } },
        right: { style: 'thin', color: { argb: this.brandColors.primary } }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
    
    // Establecer altura de la fila de encabezados
    headerRow.height = 25;
  }
  
  /**
   * Aplica estilo a filas alternas para mejor legibilidad
   * @param {Object} row - Fila a estilizar
   */
  styleAlternateRow(row) {
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: this.brandColors.background }
      };
    });
  }
  
/**
 * Añade una fila de totales al final del documento
 * @param {Object} worksheet - Hoja de Excel
 * @param {Array} headers - Encabezados de columnas
 * @param {Array} numericColumns - Índices de columnas numéricas
 * @param {Array} currencyColumns - Índices de columnas monetarias
 * @param {Object} options - Opciones de exportación
 */
addTotalsRow(worksheet, headers, numericColumns, currencyColumns, options = {}) {
  // IMPORTANTE: Guardar el número actual de filas ANTES de añadir la fila de totales
  // Esta será exactamente la última fila de datos
  const lastDataRow = worksheet.rowCount;
  
  // Crear la fila de totales
  const totalsRowData = Array(headers.length).fill('');
  
  // Añadir etiqueta "TOTAL" en la primera columna
  totalsRowData[0] = 'TOTAL';
  
  // Verificar si hay columnas específicas para totalizar
  const specificColumnsToTotal = options.columnsWithTotals || [];
  
  // Obtener formatos específicos de moneda y enteros si se proporcionan
  const currencyFormats = options.currencyFormats || {};
  const integerFormats = options.integerFormats || {}; // NUEVO: Obtener formatos enteros
  
  // CORREGIDO: Ajustar el cálculo del rango de filas para la suma
  // El rango debe incluir desde la primera fila de datos hasta la última fila de datos
  const startRow = options.includeCompanyHeader ? 5 : 2;
  const endRow = lastDataRow; // Usar exactamente la última fila antes de añadir los totales
  
  // Si hay columnas específicas para totalizar, usarlas
  if (specificColumnsToTotal.length > 0) {
    // Iterar a través de los encabezados para encontrar las columnas específicas
    headers.forEach((header, colIndex) => {
      if (specificColumnsToTotal.includes(header)) {
        const colLetter = this.getColumnLetter(colIndex + 1);
        
        // Crear fórmula de suma con rango preciso
        totalsRowData[colIndex] = {
          formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
          result: 0 // Valor por defecto
        };
      }
    });
  } else {
    // Si no hay columnas específicas, usar todas las columnas numéricas detectadas
    numericColumns.forEach(colIndex => {
      const colLetter = this.getColumnLetter(colIndex + 1);
      
      // Crear fórmula de suma con rango preciso
      totalsRowData[colIndex] = {
        formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
        result: 0 // Valor por defecto
      };
    });
  }
  
  // Añadir fila de totales
  const totalsRow = worksheet.addRow(totalsRowData);
  
  // Estilizar fila de totales
  totalsRow.eachCell((cell, colNumber) => {
    // Aplicar estilo base a todas las celdas
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: this.brandColors.secondary }
    };
    cell.font = {
      name: 'Poppins',
      family: 4,
      size: 12,
      bold: true,
      color: { argb: this.brandColors.white }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: this.brandColors.secondary } },
      left: { style: 'thin', color: { argb: this.brandColors.secondary } },
      bottom: { style: 'thin', color: { argb: this.brandColors.secondary } },
      right: { style: 'thin', color: { argb: this.brandColors.secondary } }
    };
    
    // Obtener el nombre del encabezado para esta columna
    const headerName = headers[colNumber - 1];
    
    // CORRECCIÓN: Priorizar los formatos explícitos de enteros sobre otros formatos
    if (integerFormats && integerFormats[headerName]) {
      // Aplicar formato entero específico (esto tiene la mayor prioridad)
      cell.numFmt = integerFormats[headerName];
    }
    // Si no hay formato entero específico, verificar si es un formato de moneda
    else if (currencyFormats && currencyFormats[headerName]) {
      cell.numFmt = currencyFormats[headerName];
    }
    // Si no hay formato específico, usar los formatos predeterminados por tipo
    else if (currencyColumns.includes(colNumber - 1)) {
      cell.numFmt = '€#,##0.00';
    } else if (numericColumns.includes(colNumber - 1)) {
      cell.numFmt = '#,##0.00';
    }
  });
  
  // Altura especial para fila de totales
  totalsRow.height = 25;
}
  
  /**
   * Detecta columnas con valores numéricos
   * @param {Array} data - Datos a analizar
   * @param {Array} headers - Encabezados de columnas
   * @returns {Array} Índices de columnas numéricas (base 0)
   */
  detectNumericColumns(data, headers) {
    if (!data || data.length === 0) return [];
    
    const numericColumns = [];
    
    // Examinar el primer elemento para detectar campos numéricos
    const firstItem = data[0];
    
    headers.forEach((header, index) => {
      const value = firstItem[header];
      
      // Verificar si el valor parece numérico
      if (
        (typeof value === 'number' && !isNaN(value)) ||
        (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '')
      ) {
        numericColumns.push(index);
      }
    });
    
    return numericColumns;
  }
  
  /**
   * Detecta columnas con valores monetarios basado en nombres de columna
   * @param {Array} headers - Encabezados de columnas
   * @returns {Array} Índices de columnas monetarias (base 0)
   */
  detectCurrencyColumns(headers) {
    const currencyFields = [
      'amount', 'price', 'total', 'subtotal', 'tax', 'fee', 'discount',
      'importe', 'precio', 'costo', 'valor', 'iva', 'gasto', 'ingreso'
    ];
    
    return headers.map((header, index) => {
      const headerLower = header.toLowerCase();
      // Verificar si el encabezado contiene alguna palabra clave monetaria
      const isCurrency = currencyFields.some(field => 
        headerLower.includes(field.toLowerCase())
      );
      
      return isCurrency ? index : null;
    }).filter(index => index !== null);
  }
  
  /**
   * Obtiene la longitud máxima de valores en una columna para ajustar el ancho
   * @param {Array} values - Valores de la columna
   * @returns {number} Longitud máxima
   */
  getMaxLength(values) {
    let maxLength = 0;
    
    values.forEach(value => {
      if (value) {
        const valueString = String(value);
        maxLength = Math.max(maxLength, valueString.length);
      }
    });
    
    return maxLength;
  }
  
  /**
   * Convierte un número de columna en letra (1=A, 2=B, etc.)
   * @param {number} columnNumber - Número de columna (base 1)
   * @returns {string} Letra de columna
   */
  getColumnLetter(columnNumber) {
    let columnLetter = '';
    
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      columnLetter = String.fromCharCode(65 + remainder) + columnLetter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    
    return columnLetter;
  }
  
  /**
   * Exporta datos a CSV con manejo mejorado del separador
   * @param {Array} data - Datos a exportar
   * @param {Object} options - Opciones de exportación
   * @returns {boolean} Éxito de la exportación
   */
  exportToCSV(data, options = {}) {
    try {
      if (!data || data.length === 0) {
        console.warn('No hay datos para exportar');
        return false;
      }
      
      // Combinar opciones con valores por defecto
      const exportOptions = { ...this.defaultOptions, ...options };
      
      // Generar nombre de archivo con timestamp si se solicita
      const fileName = this.generateFileName(exportOptions);
      
      // Obtener separador de la configuración o usar el pasado en opciones
      let delimiter = exportOptions.csvDelimiter;
      
      // Validar que el separador sea válido (como carácter real, no valor descriptivo)
      if (delimiter !== ',' && delimiter !== ';' && delimiter !== '\t') {
        console.warn(`ExportManager: Separador CSV inválido: "${delimiter}", usando por defecto: ";"`);
        delimiter = ';';
      }
      
      console.log(`ExportManager: Exportando CSV con separador: "${delimiter}"`);
      
      // Extraer encabezados
      const headers = this.extractHeaders(data, exportOptions);
      
      // Crear contenido CSV
      let csvContent = '';
      
      // Añadir encabezados si se solicita
      if (exportOptions.includeHeaders) {
        csvContent += headers.join(delimiter) + '\n';
      }
      
      // Añadir filas de datos
      data.forEach(row => {
        const rowValues = headers.map(header => {
          const value = row[header];
          
          // Formatear según tipo
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string') {
            // Escapar comillas y encerrar en comillas si contiene el delimitador
            if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
              return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
          } else if (value instanceof Date) {
            return formatDate(value, exportOptions.dateFormat);
          } else {
            return String(value);
          }
        });
        
        csvContent += rowValues.join(delimiter) + '\n';
      });
      
      // Crear Blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, `${fileName}.csv`);
      
      console.log('Datos exportados a CSV correctamente');
      return true;
    } catch (error) {
      console.error('Error al exportar a CSV:', error);
      return false;
    }
  }
  
  /**
   * Exporta datos a JSON
   * @param {Array} data - Datos a exportar
   * @param {Object} options - Opciones de exportación
   * @returns {boolean} Éxito de la exportación
   */
  exportToJSON(data, options = {}) {
    try {
      if (!data || data.length === 0) {
        console.warn('No hay datos para exportar');
        return false;
      }
      
      // Combinar opciones con valores por defecto
      const exportOptions = { ...this.defaultOptions, ...options };
      
      // Generar nombre de archivo con timestamp si se solicita
      const fileName = this.generateFileName(exportOptions);
      
      // Crear objeto JSON con metadatos
      const jsonData = {
        exportDate: new Date().toISOString(),
        reportName: exportOptions.title || `Informe de ${exportOptions.sheetName}`,
        totalRecords: data.length,
        data: data
      };
      
      // Convertir a string
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      // Crear Blob y descargar
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      this.downloadBlob(blob, `${fileName}.json`);
      
      console.log('Datos exportados a JSON correctamente');
      return true;
    } catch (error) {
      console.error('Error al exportar a JSON:', error);
      return false;
    }
  }
  
  /**
   * Exporta datos según el formato especificado
   * @param {Array} data - Datos a exportar
   * @param {Object} options - Opciones de exportación
   * @returns {boolean} Éxito de la exportación
   */
  exportData(data, options = {}) {
    // Combinar opciones con valores por defecto
    const exportOptions = { ...this.defaultOptions, ...options };
    
    // Actualizar con preferencias del usuario si no se especifica
    if (!options.format) {
      exportOptions.format = this.getPreferredFormat();
    }
    
    // Actualizar con preferencias del usuario para CSV si corresponde
    if (exportOptions.format === 'csv' && !options.csvDelimiter) {
      exportOptions.csvDelimiter = this.getPreferredCsvDelimiter();
    }
    
    // Log para depuración
    console.log(`ExportManager: Exportando en formato ${exportOptions.format} con separador CSV: "${exportOptions.csvDelimiter}"`);
    
    // Preprocesar datos si es necesario
    const processedData = this.processDataForExport(data, exportOptions);
    
    // Exportar según formato
    switch (exportOptions.format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        return this.exportToExcel(processedData, exportOptions);
      case 'csv':
        return this.exportToCSV(processedData, exportOptions);
      case 'json':
        return this.exportToJSON(processedData, exportOptions);
      case 'pdf':
        return this.exportToPDF(processedData, exportOptions);
      default:
        console.error(`Formato de exportación no soportado: ${exportOptions.format}`);
        return false;
    }
  }
  
  
  /**
   * Extrae los encabezados de los datos
   * @param {Array} data - Datos a analizar
   * @param {Object} options - Opciones de exportación
   * @returns {Array} Lista de encabezados
   */
  extractHeaders(data, options) {
    // Si se proporcionan encabezados específicos, usarlos
    if (options.headers && Array.isArray(options.headers)) {
      return options.headers;
    }
    
    // Si no hay datos, devolver array vacío
    if (!data || data.length === 0) {
      return [];
    }
    
    // Extraer encabezados del primer elemento
    const firstItem = data[0];
    return Object.keys(firstItem);
  }
  
  /**
   * Genera un nombre de archivo con timestamp opcional
   * @param {Object} options - Opciones de exportación
   * @returns {string} Nombre de archivo
   */
  generateFileName(options) {
    let fileName = options.fileName || this.defaultOptions.fileName;
    
    // Añadir timestamp si se solicita
    if (options.includeTimestamp) {
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/T/, '_')
        .replace(/\..+/, '')
        .replace(/:/g, '-');
      
      fileName = `${fileName}_${timestamp}`;
    }
    
    return fileName;
  }
  
  /**
   * Descarga un Blob como archivo
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
   * Procesa datos para exportación
   * @param {Array} data - Datos a procesar
   * @param {Object} options - Opciones de procesamiento
   * @returns {Array} Datos procesados
   */
  processDataForExport(data, options = {}) {
    if (!data || data.length === 0) {
      return [];
    }
    
    // Opciones de procesamiento
    const processingOptions = {
      formatCurrency: true,
      formatDates: false, // Cambiado a false para que ExcelJS lo maneje
      removeNulls: true,
      renameFields: {},
      includeFields: null,
      excludeFields: null,
      ...options.processing
    };
    
    // Procesar cada elemento
    return data.map(item => {
      // Crear objeto procesado
      const processedItem = {};
      
      // Procesar cada campo
      Object.keys(item).forEach(key => {
        // Verificar si se debe incluir o excluir
        if (
          (processingOptions.includeFields && !processingOptions.includeFields.includes(key)) ||
          (processingOptions.excludeFields && processingOptions.excludeFields.includes(key))
        ) {
          return;
        }
        
        // Obtener valor
        let value = item[key];
        
        // Eliminar null/undefined si se solicita
        if (processingOptions.removeNulls && (value === null || value === undefined)) {
          value = '';
        }
        
        // Determinar nombre de campo (original o renombrado)
        const fieldName = processingOptions.renameFields[key] || key;
        
        // Asignar al objeto procesado
        processedItem[fieldName] = value;
      });
      
      return processedItem;
    });
  }
  
  /**
   * Crea una plantilla de exportación basada en el tipo de reporte
   * @param {string} reportType - Tipo de reporte ('expenses', 'transactions', 'subscriptions', etc.)
   * @returns {Object} Configuración de plantilla
   */
  getTemplateConfig(reportType) {
    const templates = {
      expenses: {
        title: 'Reporte de Egresos',
        sheetName: 'Egresos',
        headers: [
          'ID', 'Fecha', 'Categoría', 'Descripción', 'Importe', 
          'IVA', 'Total', 'Método de Pago', 'Referencia', 'Deducible'
        ],
        renameFields: {
          id: 'ID',
          date: 'Fecha',
          category_name: 'Categoría',
          description: 'Descripción',
          amount: 'Importe',
          tax_amount: 'IVA',
          total: 'Total',
          payment_method: 'Método de Pago',
          reference: 'Referencia',
          is_tax_deductible: 'Deducible'
        },
        processing: {
          formatCurrency: true
        }
      },
      transactions: {
        title: 'Reporte de Transacciones',
        sheetName: 'Transacciones',
        headers: [
          'ID Transacción', 'Usuario', 'Producto', 'Importe', 
          'Moneda', 'Importe (EUR)', 'IVA', 'Método de Pago', 'País', 'Fecha'
        ],
        renameFields: {
          transaction_id: 'ID Transacción',
          user_email: 'Usuario',
          product_name: 'Producto',
          amount: 'Importe',
          currency_code: 'Moneda',
          amount_eur: 'Importe (EUR)',
          tax_amount: 'IVA',
          payment_method: 'Método de Pago',
          country_code: 'País',
          updated_at: 'Fecha'
        },
        processing: {
          formatCurrency: true
        }
      },
      subscriptions: {
        title: 'Reporte de Suscripciones',
        sheetName: 'Suscripciones',
        headers: [
          'ID', 'Usuario', 'Producto', 'Estado', 'Creada', 
          'Próximo Cobro', 'Importe', 'Intervalo'
        ],
        renameFields: {
          subscription_id: 'ID',
          user_email: 'Usuario',
          product_name: 'Producto',
          status: 'Estado',
          created_at: 'Creada',
          next_billed_at: 'Próximo Cobro',
          amount: 'Importe',
          interval: 'Intervalo'
        },
        processing: {
          formatCurrency: true
        }
      },
      taxes: {
        title: 'Reporte de Impuestos',
        sheetName: 'Impuestos',
        headers: [
          'País', 'Tasa Impositiva', 'Base Imponible', 'Impuesto Recaudado', 
          'Transacciones', 'Divisa'
        ],
        processing: {
          formatCurrency: true
        }
      },
      users: {
        title: 'Reporte de Usuarios',
        sheetName: 'Usuarios',
        headers: [
          'ID', 'Correo', 'Nombre', 'Registro', 'Suscripciones', 
          'Gasto Total', 'Último Acceso', 'País', 'Universidad'
        ],
        processing: {
          formatCurrency: true
        }
      }
    };
    
    return templates[reportType] || {
      title: 'Reporte de Datos',
      sheetName: 'Datos',
      processing: {
        formatCurrency: true
      }
    };
  }
  
  /**
   * Exporta datos utilizando una plantilla predefinida
   * @param {Array} data - Datos a exportar
   * @param {string} reportType - Tipo de reporte
   * @param {Object} customOptions - Opciones personalizadas
   * @returns {boolean} Éxito de la exportación
   */
  exportWithTemplate(data, reportType, customOptions = {}) {
    // Obtener configuración de plantilla
    const templateConfig = this.getTemplateConfig(reportType);
    
    // Combinar opciones de plantilla con opciones personalizadas
    const exportOptions = {
      ...this.defaultOptions,
      ...templateConfig,
      ...customOptions,
      processing: {
        ...this.defaultOptions.processing,
        ...templateConfig.processing,
        ...customOptions.processing
      }
    };
    
    // Preprocesar datos si es necesario para aplicar las transformaciones de la plantilla
    let processedData = data;
    
    // Si hay renombrado de campos, aplicarlo
    if (exportOptions.renameFields && Object.keys(exportOptions.renameFields).length > 0) {
      processedData = this.processDataForExport(data, {
        renameFields: exportOptions.renameFields,
        includeFields: null,
        excludeFields: null
      });
    }
    
    // Exportar datos
    return this.exportData(processedData, exportOptions);
  }
  
  /**
   * Verifica si un campo es de tipo monetario
   * @param {string} fieldName - Nombre del campo
   * @returns {boolean} Si es campo monetario
   */
  isCurrencyField(fieldName) {
    const currencyFields = [
      'amount', 'price', 'total', 'subtotal', 'tax', 'fee', 'discount',
      'importe', 'precio', 'costo', 'valor', 'iva'
    ];
    
    // Comprobar si el nombre del campo contiene alguna de las palabras clave
    return currencyFields.some(cf => 
      fieldName.toLowerCase().includes(cf.toLowerCase())
    );
  }
  
  /**
   * Verifica si un campo es de tipo fecha
   * @param {string} fieldName - Nombre del campo
   * @returns {boolean} Si es campo de fecha
   */
  isDateField(fieldName) {
    const dateFields = [
      'date', 'time', 'created', 'updated', 'timestamp', 'start', 'end', 'expiry',
      'fecha', 'hora', 'creado', 'actualizado', 'inicio', 'fin', 'expiracion', 'next', 'last'
    ];
    
    // Comprobar si el nombre del campo contiene alguna de las palabras clave
    return dateFields.some(df => 
      fieldName.toLowerCase().includes(df.toLowerCase())
    );
  }
  
/**
 * Exporta datos a PDF con optimizaciones avanzadas
 * @param {Array} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<boolean>} Éxito de la exportación
 */
async exportToPDF(data, options = {}) {
  try {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar');
      return false;
    }
    
    console.log('Iniciando exportación a PDF...');
    
    // Combinar opciones con valores por defecto
    const exportOptions = { ...this.defaultOptions, ...options };
    
    // Extraer encabezados para análisis
    const headers = this.extractHeaders(data, exportOptions);
    console.log(`Exportando tabla con ${headers.length} columnas a PDF`);
    
    // Analizar si la tabla es ancha y necesita optimizaciones
    const optimizationConfig = this.getPDFOptimizationConfig(exportOptions, headers);
    console.log('Configuración de optimización PDF:', optimizationConfig);
    
    // Modificar opciones según optimización
    exportOptions._pdfOptimization = optimizationConfig;
    
    // Generar nombre de archivo con timestamp si se solicita
    const fileName = this.generateFileName(exportOptions);
    
    // Cargar la biblioteca pdfmake si no está ya cargada
    if (typeof pdfMake === 'undefined') {
      await this.loadPDFMakeLibrary();
    }
    
    // Crear definición del documento PDF
    const docDefinition = await this.createPDFDocDefinition(data, exportOptions);
    
    // Detectar si el usuario está usando Internet Explorer (que tiene problemas con PDF grandes)
    const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || 
                window.navigator.userAgent.indexOf('Trident/') > -1;
    
    // Añadir información de progreso
    let progressMsg = `Generando PDF para ${data.length} filas...`;
    if (options.sheetName) {
      progressMsg = `Generando ${options.sheetName} en PDF...`;
    }
    
    // Mostrar mensaje si hay alguna función UI disponible
    if (typeof window.showGeneratingMessage === 'function') {
      window.showGeneratingMessage(progressMsg);
    } else {
      console.log(progressMsg);
    }
    
    // Log para depuración
    console.log('Configuración final para PDF:', {
      pageSize: docDefinition.pageSize,
      pageOrientation: docDefinition.pageOrientation,
      userRequestedOrientation: exportOptions.pdf?.orientation || 'default'
    });
    
    // Generar y descargar el PDF
    if (isIE) {
      // Para IE, abrimos en nueva ventana
      pdfMake.createPdf(docDefinition).open();
    } else {
      // Para navegadores modernos, descarga directa
      pdfMake.createPdf(docDefinition).download(`${fileName}.pdf`);
    }
    
    console.log('Datos exportados a PDF correctamente');
    return true;
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    return false;
  }
}

/**
 * Carga dinámicamente la biblioteca pdfmake
 * @returns {Promise<void>}
 */
loadPDFMakeLibrary() {
  return new Promise((resolve, reject) => {
    // Verificar si ya está cargada
    if (typeof pdfMake !== 'undefined') {
      resolve();
      return;
    }
    
    console.log('Cargando biblioteca pdfmake para exportaciones a PDF...');
    
    // Cargar pdfmake
    const scriptPdfMake = document.createElement('script');
    scriptPdfMake.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    scriptPdfMake.async = true;
    
    // Cargar vfs_fonts para las fuentes
    const scriptVfsFonts = document.createElement('script');
    scriptVfsFonts.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
    scriptVfsFonts.async = true;
    
    // Manejar eventos de carga
    scriptPdfMake.onload = () => {
      console.log('pdfmake cargado correctamente');
      document.body.appendChild(scriptVfsFonts);
    };
    
    scriptVfsFonts.onload = () => {
      console.log('vfs_fonts cargado correctamente');
      // Registrar fuente Poppins si es posible
      try {
        this.registerPDFFonts();
      } catch (e) {
        console.warn('No se pudieron registrar fuentes adicionales para PDF:', e);
      }
      resolve();
    };
    
    scriptPdfMake.onerror = () => {
      console.error('No se pudo cargar pdfmake');
      reject(new Error('Error al cargar pdfmake'));
    };
    
    scriptVfsFonts.onerror = () => {
      console.error('No se pudo cargar vfs_fonts');
      reject(new Error('Error al cargar vfs_fonts'));
    };
    
    // Añadir scripts al documento
    document.body.appendChild(scriptPdfMake);
  });
}

/**
 * Registra fuentes personalizadas para PDF
 */
registerPDFFonts() {
  // Solo si pdfMake está disponible
  if (typeof pdfMake === 'undefined') return;
  
  // Definir fuentes
  const fontDefinitions = {
    Poppins: {
      normal: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2',
      bold: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
      italics: 'https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmE0tCMPI.woff2',
      bolditalics: 'https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmv1pVF9eO.woff2'
    }
  };
  
  // Registrar fuentes (esto podría no funcionar dependiendo de la configuración de pdfmake)
  // En caso de error, se usarán las fuentes por defecto
  try {
    pdfMake.fonts = {
      ...pdfMake.fonts,
      ...fontDefinitions
    };
  } catch (e) {
    console.warn('No se pudieron registrar fuentes personalizadas para PDF:', e);
  }
}

/**
 * Método a añadir para determinar la optimización de PDF según opciones
 * @param {Object} options - Opciones de exportación
 * @param {Array} headers - Encabezados de tabla
 * @returns {Object} Configuración de optimización
 */
getPDFOptimizationConfig(options, headers) {
  // Opciones por defecto
  let config = {
    isWideTable: false,
    fontSize: 10,
    headerFontSize: 12,
    titleFontSize: 18,
    pageSize: 'A4',
    margins: [40, 40, 40, 60]
  };
  
  // Obtener opciones específicas de PDF
  const pdfOptions = options.pdf || {};
  
  // Determinar si es una tabla ancha
  const tableWidth = headers.length;
  let isWideTable = tableWidth > 7;
  
  // Anular automático si está específicamente configurado
  if (pdfOptions.optimizeForWideTables === false) {
    isWideTable = false;
  } else if (pdfOptions.optimizeForWideTables === true) {
    isWideTable = tableWidth > 5; // Umbral más bajo cuando se solicita optimización
  }
  
  config.isWideTable = isWideTable;
  
  // Determinar tamaño de página (siempre A3 para tablas con 10+ columnas)
  if (pdfOptions.pageSize && pdfOptions.pageSize !== 'auto') {
    config.pageSize = pdfOptions.pageSize;
  } else if (isWideTable && tableWidth >= 10) {
    config.pageSize = 'A3';
  }
  
  // Determinar tamaños de fuente
  if (pdfOptions.fontSizeReduction === 'none') {
    // No reducir tamaño de fuente
    config.fontSize = 10;
    config.headerFontSize = 12;
    config.titleFontSize = 18;
  } else if (pdfOptions.fontSizeReduction === 'small') {
    config.fontSize = 9;
    config.headerFontSize = 11;
    config.titleFontSize = 16;
  } else if (pdfOptions.fontSizeReduction === 'medium') {
    config.fontSize = 8;
    config.headerFontSize = 10;
    config.titleFontSize = 14;
  } else if (pdfOptions.fontSizeReduction === 'large') {
    config.fontSize = 7;
    config.headerFontSize = 9;
    config.titleFontSize = 12;
  } else if (isWideTable) {
    // Auto - reducir según ancho de tabla
    if (tableWidth > 12) {
      config.fontSize = 7;
      config.headerFontSize = 9;
      config.titleFontSize = 12;
    } else if (tableWidth > 9) {
      config.fontSize = 8;
      config.headerFontSize = 10;
      config.titleFontSize = 14;
    } else {
      config.fontSize = 9;
      config.headerFontSize = 11;
      config.titleFontSize = 16;
    }
  }
  
  // Determinar márgenes basados en la orientación
  const orientation = pdfOptions.orientation || 'landscape';
  
  // Aplicar márgenes según orientación y ancho de tabla
  if (orientation === 'portrait') {
    // Para portrait, ajustar márgenes para aprovechar el espacio vertical
    if (isWideTable && tableWidth >= 10) {
      config.margins = [5, 10, 5, 15]; // Márgenes muy pequeños para tablas muy anchas
    } else if (isWideTable) {
      config.margins = [10, 15, 10, 20];
    } else {
      config.margins = [15, 20, 15, 25]; // Márgenes normales para tablas estándar
    }
  } else {
    // Para landscape (horizontal), usar los márgenes originales
    if (isWideTable && tableWidth >= 10) {
      config.margins = [5, 10, 5, 20]; // Márgenes muy pequeños para tablas muy anchas
    } else if (isWideTable) {
      config.margins = [15, 20, 15, 40];
    } else {
      config.margins = [40, 40, 40, 60]; // Márgenes originales para tablas estándar
    }
  }
  
  // Si se especificaron márgenes exactos, respetarlos
  if (pdfOptions.margins) {
    config.margins = pdfOptions.margins;
  }
  
  return config;
}


/**
 * Crea la definición de documento para pdfmake con ajuste forzado a la página
 * @param {Array} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 * @returns {Object} Definición del documento PDF
 */
async createPDFDocDefinition(data, options) {
  // Extraer encabezados
  const headers = this.extractHeaders(data, options);
  
  // Obtener configuración de optimización
  const optimization = options._pdfOptimization || this.getPDFOptimizationConfig(options, headers);
  const isWideTable = optimization.isWideTable;
  const fontSize = optimization.fontSize;
  const headerFontSize = optimization.headerFontSize;
  const titleFontSize = optimization.titleFontSize;
  const pageSize = optimization.pageSize;
  const margins = optimization.margins;
  
  // CLAVE: Forzar el ajuste de anchos al tamaño de la página
  // Usar el nuevo método en lugar del cálculo normal de anchos
  const columnWidths = this.calculateForcedFitColumnWidths(headers, options);
  
  // Convertir datos a formato de tabla para PDF
  const pdfTableBody = [];
  
  // Añadir fila de encabezados
  const headerRow = headers.map(header => ({
    text: header,
    style: 'tableHeader',
    fillColor: `#${this.brandColors.primary}`,
    color: '#FFFFFF',
    bold: true,
    fontSize: isWideTable ? fontSize : fontSize + 1  // Reducir diferencia para encabezados
  }));
  pdfTableBody.push(headerRow);
  
  // Añadir filas de datos
  data.forEach((item, index) => {
    const row = headers.map(header => {
      let value = item[header];
      
      // Formatear según tipo
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string') {
        // Usar método de truncamiento inteligente
        return this.truncateTextForPDF(value, header, options, isWideTable);
      } else if (value instanceof Date) {
        return formatDate(value, options.dateFormat || 'DD/MM/YYYY');
      } else if (typeof value === 'number') {
        // Verificar si es un campo de moneda
        if (options.currencyFormats && options.currencyFormats[header]) {
          // Es un campo de moneda, formatear como tal
          if (options.currencyFormats[header].includes('€')) {
            return `€${value.toFixed(2)}`;
          } else if (options.currencyFormats[header].includes('$')) {
            return `$${value.toFixed(2)}`;
          } else {
            return value.toFixed(2);
          }
        }
        return value.toString();
      } else {
        return String(value);
      }
    });
    
    // Si es una tabla ancha, reducir el tamaño de fuente
    if (isWideTable) {
      const rowWithStyle = row.map(cell => ({
        text: cell,
        fontSize: fontSize - 1,  // Reducir aún más para garantizar ajuste
        // Aplicar colores de fondo alternados
        fillColor: index % 2 !== 0 ? `#${this.brandColors.background}` : null
      }));
      pdfTableBody.push(rowWithStyle);
    } else {
      // Aplicar colores de fondo alternados para tablas normales
      if (index % 2 !== 0) {
        pdfTableBody.push(row.map(cell => ({
          text: cell,
          fillColor: `#${this.brandColors.background}`
        })));
      } else {
        pdfTableBody.push(row);
      }
    }
  });
  
  // Si hay columnas con totales, añadir fila de totales
  if (options.includeTotals && options.columnsWithTotals && options.columnsWithTotals.length > 0) {
    const totalsRow = this.createPDFTotalsRow(headers, data, options, isWideTable);
    pdfTableBody.push(totalsRow);
  }
  
  // Crear contenido del documento
  const content = [];
  
  // Añadir título
  const title = options.title || `Informe de ${options.sheetName || 'Datos'}`;
  content.push({
    text: title,
    style: 'header',
    alignment: 'center',
    margin: [0, 0, 0, 5]  // Reducir margen inferior
  });
  
  // Añadir fecha de generación (con margen reducido)
  const today = new Date();
  const formattedDate = formatDate ? formatDate(today, 'long') : today.toLocaleDateString();
  content.push({
    text: `Generado el ${formattedDate}`,
    style: 'subheader',
    alignment: 'center',
    margin: [0, 0, 0, 10]  // Reducir margen inferior
  });
  
  // MODIFICADO: Añadir tabla principal con configuración optimizada para ocupar todo el ancho
  content.push({
    table: {
      headerRows: 1,
      widths: columnWidths,
      body: pdfTableBody,
      // IMPORTANTE: Configuración para asegurar ancho completo
      width: '100%'
    },
    layout: {
      fillColor: function(rowIndex, node, columnIndex) {
        if (rowIndex === 0) {
          return `#${this.brandColors.primary}`;
        }
        return (rowIndex % 2 === 0) ? null : `#${this.brandColors.background}`;
      }.bind(this),
      hLineWidth: function(i, node) {
        // Líneas extremadamente finas para ahorrar espacio
        return (i === 0 || i === node.table.body.length) ? 0.5 : 0.2;
      },
      vLineWidth: function(i, node) {
        // Líneas extremadamente finas para ahorrar espacio
        return (i === 0 || i === node.table.widths.length) ? 0.5 : 0.2;
      },
      hLineColor: function(i, node) {
        return (i === 0 || i === node.table.body.length) ? `#${this.brandColors.primary}` : `#${this.brandColors.secondary}`;
      }.bind(this),
      vLineColor: function(i, node) {
        return (i === 0 || i === node.table.widths.length) ? `#${this.brandColors.primary}` : `#${this.brandColors.secondary}`;
      }.bind(this),
      // Padding mínimo para maximizar espacio
      paddingLeft: function(i, node) { return 2; },
      paddingRight: function(i, node) { return 2; },
      paddingTop: function(i, node) { return 2; },
      paddingBottom: function(i, node) { return 2; }
    },
    // CLAVE: Forzar que la tabla ocupe el 100% del ancho disponible
    width: '100%',
    // Eliminar márgenes horizontales para maximizar el ancho utilizado
    margin: [0, 2, 0, 5]
  });
  
  // Añadir análisis si están disponibles
  if (options.transactionAnalysis) {
    content.push(this.createPDFTransactionAnalysis(options.transactionAnalysis, isWideTable));
  }
  
  if (options.productAnalysis) {
    content.push(this.createPDFProductAnalysis(options.productAnalysis, isWideTable));
  }
  
  if (options.statusSummary) {
    content.push(this.createPDFStatusSummary(options.statusSummary, isWideTable));
  }
  
  if (options.deductibleSummary) {
    content.push(this.createPDFDeductibleSummary(options.deductibleSummary, isWideTable));
  }

  if (options.inactiveUserSummary) {
    content.push(this.createPDFInactiveUserAnalysis(options.inactiveUserSummary, isWideTable));
  }
  
  // IMPORTANTE: Obtener la orientación correctamente desde las opciones
  // Respetar la orientación especificada en las opciones de PDF
  let pageOrientation = 'landscape'; // Valor por defecto
  
  // Si las opciones de PDF especifican una orientación, usarla
  if (options.pdf && options.pdf.orientation) {
    console.log(`Aplicando orientación especificada en opciones: ${options.pdf.orientation}`);
    pageOrientation = options.pdf.orientation;
  } else if (isWideTable) {
    // Solo usar landscape automáticamente si la tabla es ancha y no se especificó orientación
    console.log('Tabla ancha detectada, usando orientación landscape por defecto');
    pageOrientation = 'landscape';
  }
  
  console.log(`Orientación final seleccionada: ${pageOrientation}`);
  
  // Crear definición del documento con configuración optimizada
  const docDefinition = {
    content: content,
    styles: {
      header: {
        fontSize: isWideTable ? titleFontSize - 2 : titleFontSize,
        bold: true,
        color: `#${this.brandColors.marron}`,
        margin: [0, 0, 0, 5]
      },
      subheader: {
        fontSize: isWideTable ? headerFontSize - 2 : headerFontSize - 1,
        bold: false,
        color: `#${this.brandColors.text}`,
        margin: [0, 0, 0, 3]
      },
      tableHeader: {
        bold: true,
        fontSize: isWideTable ? fontSize - 1 : fontSize,
        color: '#FFFFFF'
      },
      totalsRow: {
        bold: true,
        fontSize: isWideTable ? fontSize - 1 : fontSize,
        color: '#FFFFFF',
        fillColor: `#${this.brandColors.secondary}`
      },
      sectionHeader: {
        bold: true,
        fontSize: isWideTable ? headerFontSize - 2 : headerFontSize - 1,
        color: `#${this.brandColors.marron}`,
        margin: [0, 10, 0, 3]
      }
    },
    defaultStyle: {
      fontSize: isWideTable ? fontSize - 1 : fontSize,
      color: `#${this.brandColors.text}`
    },
    // Aplicar orientación según lo determinado anteriormente
    pageOrientation: pageOrientation,
    // Configuración de página específica para tablas
    pageSize: pageSize,
    // Márgenes según configuración
    pageMargins: options.pdf?.margins || margins,
    footer: function(currentPage, pageCount) {
      return {
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        fontSize: fontSize - 2,
        margin: [0, 5, 0, 0]
      };
    }
  };
  
  // Añadir logo si está disponible
  if (options.includeLogo && options.logoUrl) {
    try {
      // En PDF no podemos usar directamente la URL, necesitamos convertirla a dataURL
      const logoDataUrl = await this.getImageAsDataURL(options.logoUrl);
      
      // Ajustar tamaño del logo para tablas anchas
      const logoWidth = isWideTable ? 80 : 100;
      
      // Añadir logo al inicio del contenido
      docDefinition.content.unshift({
        image: logoDataUrl,
        width: logoWidth,
        alignment: 'left',
        margin: [0, 0, 0, 10]
      });
    } catch (error) {
      console.warn('No se pudo cargar el logo para PDF:', error);
    }
  }
  
  return docDefinition;
}

/**
 * Calcula anchos de columna que garanticen que la tabla se ajuste a la página
 * y ocupe el ancho completo disponible
 */
calculateForcedFitColumnWidths(headers, options) {
  // 1. Determinar el ancho total disponible basado en el tamaño de página
  const pageSize = options.pdf?.pageSize || 'A4';
  const orientation = options.pdf?.orientation || 'landscape';
  
  console.log(`Calculando anchos para PDF: ${pageSize} ${orientation}`);
  
  // Anchos de página aproximados en puntos (con márgenes ya restados)
  const pageSizes = {
    'A4': { 'portrait': 530, 'landscape': 780 },
    'A3': { 'portrait': 740, 'landscape': 1050 },
    'letter': { 'portrait': 550, 'landscape': 720 }
  };
  
  // Obtener ancho disponible (con margen mínimo de seguridad)
  const availableWidth = (pageSizes[pageSize]?.[orientation] || 780) - 20; // 20 puntos de margen de seguridad
  
  console.log(`Ancho disponible para tabla: ${availableWidth} puntos`);
  
  // 2. Asignar importancia/prioridad a cada columna según su tipo
  const columnPriorities = {};
  let totalPriority = 0;
  
  headers.forEach(header => {
    const headerLower = header.toLowerCase();
    let priority = 1; // Prioridad base
    
    // Ajustar prioridad según tipo de columna
    if (headerLower.includes('id') && headerLower.length < 5) {
      priority = 0.5; // IDs cortos
    } else if (headerLower.includes('correo') || headerLower.includes('email')) {
      priority = 1.5; // Correos
    } else if (headerLower.includes('nombre') || headerLower.includes('apellido')) {
      priority = 1.2; // Nombres
    } else if (headerLower.includes('descripción') || headerLower.includes('comentario')) {
      priority = 1.8; // Campos descriptivos largos
    } else if (headerLower.includes('universidad') || headerLower.includes('dirección')) {
      priority = 1.4; // Campos que pueden ser largos
    } else if (headerLower.includes('fecha') || headerLower.includes('date')) {
      priority = 0.9; // Fechas
    } else if (headerLower.includes('importe') || headerLower.includes('total') || 
              headerLower.includes('precio') || headerLower.includes('gasto')) {
      priority = 0.8; // Campos numéricos
    } else if (headerLower === 'factura' || headerLower.includes('referencia')) {
      priority = 1.6; // AUMENTAMOS prioridad para las columnas de la derecha
    } else if (headerLower === 'deducible' || headerLower.includes('deducible')) {
      priority = 0.9; // AUMENTAMOS prioridad para campo deducible
    }
    
    // Si es una de las últimas columnas, aumentar ligeramente su prioridad
    // para garantizar que tengan suficiente espacio
    const columnIndex = headers.indexOf(header);
    if (columnIndex >= headers.length - 3) {
      priority *= 1.2; // Aumentar un 20% la prioridad de las últimas columnas
    }
    
    columnPriorities[header] = priority;
    totalPriority += priority;
  });
  
  // 3. Verificar si hay anchos explícitamente definidos y usarlos como guía
  let hasExplicitWidths = false;
  const explicitWidths = {};
  let totalExplicitWidth = 0;
  
  if (options.columnWidths) {
    hasExplicitWidths = true;
    headers.forEach(header => {
      if (options.columnWidths[header]) {
        // IMPORTANTE: Asegurar valores mínimos adecuados para las columnas de la derecha
        if (header.toLowerCase() === 'factura') {
          explicitWidths[header] = Math.max(60, options.columnWidths[header]);
        } else if (header.toLowerCase() === 'referencia') {
          explicitWidths[header] = Math.max(55, options.columnWidths[header]);
        } else if (header.toLowerCase() === 'deducible') {
          explicitWidths[header] = Math.max(45, options.columnWidths[header]);
        } else {
          explicitWidths[header] = options.columnWidths[header];
        }
        totalExplicitWidth += explicitWidths[header];
      }
    });
  }
  
  // 4. Calcular anchos basados en prioridad o anchos explícitos
  const columnWidths = [];
  
  if (hasExplicitWidths && totalExplicitWidth > 0) {
    // Usar anchos explícitos como guía pero ajustar para asegurar que se ajuste
    const scaleFactor = availableWidth / totalExplicitWidth;
    
    headers.forEach(header => {
      let width;
      if (explicitWidths[header]) {
        // Escalar anchos explícitos proporcionalmente
        width = Math.max(20, Math.floor(explicitWidths[header] * scaleFactor));
      } else {
        // Para columnas sin ancho explícito, usar la prioridad
        const priorityRatio = columnPriorities[header] / totalPriority;
        width = Math.max(20, Math.floor(availableWidth * priorityRatio));
      }
      columnWidths.push(width);
    });
  } else {
    // Distribuir según prioridades
    headers.forEach(header => {
      const priorityRatio = columnPriorities[header] / totalPriority;
      const width = Math.max(20, Math.floor(availableWidth * priorityRatio));
      columnWidths.push(width);
    });
  }
  
  // 5. Verificar que la suma no exceda el ancho disponible y ajustar si es necesario
  const totalCalculatedWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  
  if (totalCalculatedWidth > availableWidth) {
    // Ajustar proporcionalmente todos los anchos
    const adjustmentFactor = availableWidth / totalCalculatedWidth;
    for (let i = 0; i < columnWidths.length; i++) {
      columnWidths[i] = Math.max(20, Math.floor(columnWidths[i] * adjustmentFactor));
    }
  }
  
  // 6. Si todavía hay espacio, distribuirlo proporcionalmente a la prioridad
  const finalTotalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  
  if (finalTotalWidth < availableWidth) {
    // Calcular el espacio adicional disponible
    const extraSpace = availableWidth - finalTotalWidth;
    console.log(`Espacio extra disponible: ${extraSpace} puntos`);
    
    // Crear un array de prioridades para distribuir el espacio extra
    const priorities = headers.map(header => columnPriorities[header]);
    
    // Distribuir el espacio extra según prioridades
    this.distributeExtraSpace(columnWidths, priorities, extraSpace);
  }
  
  console.log('Anchos de columna calculados:', columnWidths);
  console.log('Ancho total de columnas:', columnWidths.reduce((sum, width) => sum + width, 0));
  
  return columnWidths;
}

/**
 * Distribuye espacio extra entre columnas según sus prioridades
 * @param {Array} widths - Anchos actuales de columna
 * @param {Array} priorities - Prioridades de cada columna
 * @param {number} extraSpace - Espacio extra a distribuir
 */
distributeExtraSpace(widths, priorities, extraSpace) {
  // Total de prioridades
  const totalPriority = priorities.reduce((sum, p) => sum + p, 0);
  
  // Calcular incrementos iniciales basados en prioridad
  const increments = priorities.map(p => Math.floor((p / totalPriority) * extraSpace));
  
  // Verificar si hay espacio no distribuido por redondeo
  const distributedSpace = increments.reduce((sum, i) => sum + i, 0);
  const remaining = extraSpace - distributedSpace;
  
  // Distribuir el espacio restante a las columnas con mayor prioridad
  if (remaining > 0) {
    // Crear pares de [índice, prioridad] para ordenar
    const pairs = priorities.map((p, i) => [i, p]);
    // Ordenar por prioridad (descendente)
    pairs.sort((a, b) => b[1] - a[1]);
    
    // Distribuir el espacio restante entre las columnas con mayor prioridad
    for (let i = 0; i < remaining; i++) {
      const columnIndex = pairs[i % pairs.length][0];
      increments[columnIndex]++;
    }
  }
  
  // Aplicar los incrementos
  for (let i = 0; i < widths.length; i++) {
    widths[i] += increments[i];
  }
}

/**
 * Trunca texto según configuración para PDF
 * @param {string} text - Texto a truncar
 * @param {string} column - Nombre de la columna
 * @param {Object} options - Opciones de exportación
 * @param {boolean} isWideTable - Si la tabla es ancha
 * @returns {string} Texto truncado
 */
truncateTextForPDF(text, column, options, isWideTable) {
  if (!text) return '';
  
  // Convertir a string si no lo es
  const textStr = String(text);
  
  // Verificar si hay configuración específica para esta columna
  if (options.truncateText && options.truncateText[column]) {
    const maxLength = options.truncateText[column];
    // Si el texto es más largo que el máximo permitido, truncarlo
    if (textStr.length > maxLength) {
      return textStr.substring(0, maxLength) + '...';
    }
  }
  // Si no hay configuración específica pero la tabla es ancha,
  // aplicar truncamiento por defecto basado en tipo de columna
  else if (isWideTable) {
    const columnLower = column.toLowerCase();
    
    // Correos electrónicos (truncar más agresivamente)
    if (columnLower.includes('correo') || columnLower.includes('email')) {
      if (textStr.length > 20) {
        // Intentar preservar el dominio
        const parts = textStr.split('@');
        if (parts.length === 2) {
          // Truncar solo la parte del usuario, manteniendo el dominio
          const username = parts[0];
          const domain = parts[1];
          if (username.length > 10) {
            return username.substring(0, 8) + '...@' + domain;
          }
        }
        return textStr.substring(0, 18) + '...';
      }
    }
    // Nombres, apellidos, universidad (truncar moderadamente)
    else if (
      columnLower.includes('nombre') || 
      columnLower.includes('apellido') || 
      columnLower.includes('universidad')
    ) {
      if (textStr.length > 15) {
        return textStr.substring(0, 13) + '...';
      }
    }
    // Descripción o notas (truncar agresivamente)
    else if (
      columnLower.includes('descripción') || 
      columnLower.includes('nota') || 
      columnLower.includes('comentario')
    ) {
      if (textStr.length > 25) {
        return textStr.substring(0, 22) + '...';
      }
    }
    // Truncamiento por defecto para otras columnas en tablas anchas
    else if (textStr.length > 30) {
      return textStr.substring(0, 27) + '...';
    }
  }
  
  // Si no se requiere truncamiento, devolver el texto original
  return textStr;
}

/**
 * Calcula anchos óptimos de columnas para PDF basado en datos con mejor manejo de tablas muy anchas
 * @param {Array} headers - Encabezados de la tabla
 * @param {Array} data - Datos para estimar anchos
 * @param {boolean} isWideTable - Si la tabla es muy ancha
 * @returns {Array} Anchos óptimos para cada columna
 */
calculateOptimalColumnWidths(headers, data, isWideTable) {
  // Verificar si hay anchos de columna predefinidos
  if (this.defaultOptions && this.defaultOptions.columnWidths) {
    const predefinedWidths = [];
    headers.forEach(header => {
      if (this.defaultOptions.columnWidths[header]) {
        predefinedWidths.push(this.defaultOptions.columnWidths[header]);
      } else {
        // Si no hay un ancho predefinido, usar un valor por defecto basado en el tipo de tabla
        predefinedWidths.push(isWideTable ? 30 : 50);
      }
    });
    return predefinedWidths;
  }
  
  // Si la tabla es muy ancha, usar un enfoque más agresivo
  if (isWideTable) {
    // Determinar el tamaño de página para calcular el ancho disponible
    const pageWidth = headers.length > 12 ? 1100 :   // A3
                      headers.length > 8 ? 800 :     // A4 landscape
                      750;                           // A4 landscape con márgenes normales
    
    // Restar algunos puntos para márgenes y espaciado
    const availableWidth = pageWidth - 40; // 20px a cada lado para márgenes
    
    // Si tenemos más de 10 columnas, necesitamos ser muy agresivos
    if (headers.length > 10) {
      const baseWidth = Math.max(15, Math.floor(availableWidth / headers.length));
      
      // Análisis de importancia por tipo de columna
      return headers.map(header => {
        const headerLower = header.toLowerCase();
        
        // Columnas de ID o pequeñas
        if (headerLower.includes('id') || 
            headerLower === 'iva' || 
            headerLower === '%') {
          return Math.max(15, baseWidth * 0.5);
        }
        
        // Columnas de correo (suelen ser largas)
        if (headerLower.includes('correo') || headerLower.includes('email')) {
          return Math.max(20, baseWidth * 1.2); 
        }
        
        // Columnas de fechas
        if (headerLower.includes('fecha') || 
            headerLower.includes('date') || 
            headerLower.includes('creado')) {
          return Math.max(20, baseWidth * 0.9);
        }
        
        // Columnas con valores monetarios
        if (headerLower.includes('importe') || 
            headerLower.includes('precio') || 
            headerLower.includes('valor') || 
            headerLower.includes('total') ||
            headerLower.includes('gasto') ||
            headerLower.includes('eur')) {
          return Math.max(20, baseWidth * 0.8);
        }
        
        // Columnas descriptivas que suelen ser largas, pero truncables
        if (headerLower.includes('descripción') || 
            headerLower.includes('producto') || 
            headerLower.includes('usuario') || 
            headerLower.includes('nombre')) {
          return Math.max(20, baseWidth * 0.9);
        }
        
        // Valor por defecto
        return baseWidth;
      });
    } 
    else {
      // Para tablas anchas pero manejables (8-10 columnas)
      // Calcular ancho base pero dar más espacio a columnas importantes
      const baseWidth = Math.max(20, Math.floor(availableWidth / headers.length));
      
      return headers.map(header => {
        const headerLower = header.toLowerCase();
        
        // Asignar anchos según tipo de columna
        if (headerLower.includes('correo') || headerLower.includes('email')) {
          return baseWidth * 1.5; // Dar más espacio a correos
        } else if (headerLower.includes('nombre') || headerLower.includes('apellido')) {
          return baseWidth * 1.2; // Dar más espacio a nombres
        } else if (headerLower.includes('id') && !headerLower.includes('transacción')) {
          return baseWidth * 0.6; // Reducir espacio para IDs
        } else {
          return baseWidth;
        }
      });
    }
  } 
  else {
    // Para tablas normales, mantener el comportamiento actual
    const columnWidths = [];
    
    headers.forEach((header) => {
      // Estimar longitud máxima basada en encabezado y muestreo de datos
      let maxLength = header.length;
      
      // Tomar muestra de hasta 20 filas para estimar longitud
      const sampleSize = Math.min(20, data.length);
      for (let i = 0; i < sampleSize; i++) {
        const value = String(data[i][header] || '');
        maxLength = Math.max(maxLength, Math.min(value.length, 40)); // Limitar a 40 caracteres
      }
      
      // Calcular ancho en puntos (aproximación basada en fuente)
      let width = Math.min(maxLength * 5 + 8, 180); // Limitado a 180 puntos
      
      // Asegurar un mínimo razonable
      width = Math.max(width, 25);
      
      // Ajustes específicos por tipo de columna
      const headerLower = header.toLowerCase();
      
      // Columnas de ID suelen ser cortas
      if (headerLower.includes('id') && !headerLower.includes('transacción')) {
        width = Math.min(width, 40);
      }
      
      // Columnas de fechas necesitan un ancho consistente
      if (headerLower.includes('fecha') || 
          headerLower.includes('date') || 
          headerLower.includes('creado')) {
        width = Math.max(40, Math.min(width, 70));
      }
      
      // Columnas monetarias necesitan un ancho medio
      if (headerLower.includes('importe') || 
          headerLower.includes('precio') || 
          headerLower.includes('total')) {
        width = Math.max(50, Math.min(width, 70));
      }
      
      // Correos electrónicos (a menudo son muy largos)
      if (headerLower.includes('correo') || headerLower.includes('email')) {
        width = Math.min(width, 120); // Limitar a 120 puntos máximo
      }
      
      columnWidths.push(width);
    });
    
    return columnWidths;
  }
}


/**
 * Crea la sección de análisis de retención de usuarios para PDF
 * @param {Object} inactiveUserSummary - Datos de análisis de usuarios inactivos
 * @param {boolean} isWideTable - Si el documento contiene tablas anchas
 * @returns {Object} Contenido formateado para PDF
 */
createPDFInactiveUserAnalysis(inactiveUserSummary, isWideTable = false) {
  if (!inactiveUserSummary) return [];
  
  const content = [];
  
  // Ajustar márgenes y tamaños para tablas anchas
  const fontSize = isWideTable ? 8 : 10;
  const titleFontSize = isWideTable ? 10 : 12;
  const sectionMargin = isWideTable ? [0, 10, 0, 5] : [0, 20, 0, 10];
  
  // Espacio antes de la sección
  content.push({ text: '', margin: sectionMargin });
  
  // Título de la sección
  content.push({
    text: inactiveUserSummary.title || 'ANÁLISIS DE RETENCIÓN DE USUARIOS',
    style: 'sectionHeader',
    fontSize: titleFontSize,
    fillColor: '#f5f5f5',
    margin: [0, 10, 0, 5]
  });
  
  // Descripción si existe
  if (inactiveUserSummary.description) {
    content.push({
      text: inactiveUserSummary.description,
      fontSize: fontSize,
      margin: [0, 0, 0, 5]
    });
  }
  
  // Tabla de análisis
  const analysisTableBody = [
    [
      { text: 'Métrica', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
      { text: 'Valor', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize }
    ]
  ];
  
  // Añadir filas con métricas importantes
  analysisTableBody.push([
    { text: 'Usuarios que han dejado de usar la plataforma', fontSize: fontSize },
    { text: inactiveUserSummary.count.toString(), fontSize: fontSize }
  ]);
  
  analysisTableBody.push([
    { text: 'Porcentaje de abandono', fontSize: fontSize, fillColor: '#f3f9fe' },
    { text: `${inactiveUserSummary.percentage}%`, fontSize: fontSize, fillColor: '#f3f9fe' }
  ]);
  
  // Añadir métricas adicionales si están disponibles
  if (inactiveUserSummary.totalSpend !== undefined) {
    analysisTableBody.push([
      { text: 'Gasto total de usuarios inactivos', fontSize: fontSize },
      { text: `€${inactiveUserSummary.totalSpend.toFixed(2)}`, fontSize: fontSize }
    ]);
  }
  
  if (inactiveUserSummary.avgSpend !== undefined) {
    analysisTableBody.push([
      { text: 'Gasto promedio por usuario inactivo', fontSize: fontSize, fillColor: '#f3f9fe' },
      { text: `€${inactiveUserSummary.avgSpend}`, fontSize: fontSize, fillColor: '#f3f9fe' }
    ]);
  }
  
  if (inactiveUserSummary.transactionsCount !== undefined) {
    analysisTableBody.push([
      { text: 'Transacciones de usuarios inactivos', fontSize: fontSize },
      { text: inactiveUserSummary.transactionsCount.toString(), fontSize: fontSize }
    ]);
  }
  
  // Añadir tabla con el análisis
  content.push({
    table: {
      headerRows: 1,
      widths: ['70%', '30%'],
      body: analysisTableBody
    },
    margin: [0, 3, 0, 8]
  });
  
  return content;
}


/**
 * Convierte una URL de imagen a dataURL para pdfmake
 * @param {string} url - URL de la imagen
 * @returns {Promise<string>} DataURL de la imagen
 */
async getImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
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
 * Crea una fila de totales para la tabla PDF con optimizaciones para tablas anchas
 * @param {Array} headers - Encabezados de la tabla
 * @param {Array} data - Datos para calcular totales
 * @param {Object} options - Opciones de exportación
 * @param {boolean} isWideTable - Si es una tabla ancha
 * @returns {Array} Fila de totales formateada para PDF
 */
createPDFTotalsRow(headers, data, options, isWideTable = false) {
  const totalsRow = headers.map((header, index) => {
    // Primera columna es el título "TOTAL"
    if (index === 0) {
      return {
        text: 'TOTAL',
        style: 'totalsRow',
        fillColor: `#${this.brandColors.secondary}`,
        fontSize: isWideTable ? 8 : 10
      };
    }
    
    // Verificar si esta columna debe tener total
    const needsTotal = options.columnsWithTotals && options.columnsWithTotals.includes(header);
    
    if (needsTotal) {
      // Calcular total para esta columna
      let total = 0;
      data.forEach(item => {
        const value = item[header];
        if (typeof value === 'number') {
          total += value;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          total += parseFloat(value);
        }
      });
      
      // Formatear según tipo (moneda, etc.)
      let formattedTotal = total.toString();
      if (options.currencyFormats && options.currencyFormats[header]) {
        if (options.currencyFormats[header].includes('€')) {
          formattedTotal = `€${total.toFixed(2)}`;
        } else if (options.currencyFormats[header].includes('$')) {
          formattedTotal = `$${total.toFixed(2)}`;
        }
      }
      
      return {
        text: formattedTotal,
        style: 'totalsRow',
        fillColor: `#${this.brandColors.secondary}`,
        fontSize: isWideTable ? 8 : 10
      };
    }
    
    // Columna sin total
    return {
      text: '',
      style: 'totalsRow',
      fillColor: `#${this.brandColors.secondary}`,
      fontSize: isWideTable ? 8 : 10
    };
  });
  
  return totalsRow;
}

/**
 * Crea la sección de análisis de transacciones para PDF con soporte para tablas anchas
 * @param {Object} transactionAnalysis - Datos de análisis de transacciones
 * @param {boolean} isWideTable - Si el documento contiene tablas anchas
 * @returns {Object} Contenido formateado para PDF
 */
createPDFTransactionAnalysis(transactionAnalysis, isWideTable = false) {
  const content = [];
  
  // Ajustar márgenes y tamaños para tablas anchas
  const fontSize = isWideTable ? 8 : 10;
  const titleFontSize = isWideTable ? 10 : 12;
  const sectionMargin = isWideTable ? [0, 10, 0, 5] : [0, 20, 0, 10];
  
  // Espacio antes de la sección
  content.push({ text: '', margin: sectionMargin });
  
  // Título de la sección
  content.push({
    text: 'ANÁLISIS DE TRANSACCIONES',
    style: 'sectionHeader',
    fontSize: titleFontSize,
    fillColor: '#f5f5f5',
    margin: [0, 10, 0, 5]
  });
  
  // Total general
  content.push({
    text: `Monto total de transacciones: €${transactionAnalysis.totalAmount.toFixed(2)}`,
    bold: true,
    fontSize: fontSize,
    margin: [0, 5, 0, isWideTable ? 5 : 10]
  });
  
  // Análisis de métodos de pago
  content.push({
    text: 'TOP 5 MÉTODOS DE PAGO',
    style: 'sectionHeader',
    fontSize: titleFontSize,
    fillColor: '#e3f2fd',
    margin: [0, 5, 0, 3]
  });
  
  // Tabla de métodos de pago
  const methodsTableBody = [
    [
      { text: 'Método de Pago', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
      { text: 'Importe (EUR)', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
      { text: '%', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
      { text: 'Transacciones', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize }
    ]
  ];
  
  // Añadir filas de métodos
  let methodIndex = 0;
  Object.entries(transactionAnalysis.paymentMethods).forEach(([method, data]) => {
    const row = [
      method,
      `€${data.amount.toFixed(2)}`,
      `${(data.percentage).toFixed(1)}%`,
      data.count.toString()
    ];
    
    // Aplicar estilo alternado
    if (methodIndex % 2 !== 0) {
      methodsTableBody.push(row.map(cell => ({
        text: cell,
        fillColor: '#f3f9fe',
        fontSize: fontSize
      })));
    } else {
      methodsTableBody.push(row.map(cell => ({
        text: cell,
        fontSize: fontSize
      })));
    }
    
    methodIndex++;
  });
  
  // Añadir tabla de métodos con optimizaciones
  content.push({
    table: {
      headerRows: 1,
      widths: isWideTable ? ['25%', '25%', '25%', '25%'] : ['*', '*', '*', '*'],
      body: methodsTableBody
    },
    margin: [0, 3, 0, isWideTable ? 8 : 15]
  });
  
  // Si es una tabla ancha, mostrar solo una columna de análisis en lugar de dos
  if (isWideTable) {
    // Análisis de países (una sola columna)
    content.push({
      text: 'TOP 5 PAÍSES',
      style: 'sectionHeader',
      fontSize: titleFontSize,
      fillColor: '#e8f5e9',
      margin: [0, 5, 0, 3]
    });
    
    // Tabla de países
    const countriesTableBody = [
      [
        { text: 'País', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
        { text: 'Importe (EUR)', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
        { text: '%', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize },
        { text: 'Transacciones', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF', fontSize: fontSize }
      ]
    ];
    
    // Añadir filas de países
    let countryIndex = 0;
    Object.entries(transactionAnalysis.countries).forEach(([country, data]) => {
      const row = [
        country,
        `€${data.amount.toFixed(2)}`,
        `${(data.percentage).toFixed(1)}%`,
        data.count.toString()
      ];
      
      // Aplicar estilo alternado
      if (countryIndex % 2 !== 0) {
        countriesTableBody.push(row.map(cell => ({
          text: cell,
          fillColor: '#f1f8f1',
          fontSize: fontSize
        })));
      } else {
        countriesTableBody.push(row.map(cell => ({
          text: cell,
          fontSize: fontSize
        })));
      }
      
      countryIndex++;
    });
    
    // Añadir tabla de países
    content.push({
      table: {
        headerRows: 1,
        widths: ['25%', '25%', '25%', '25%'],
        body: countriesTableBody
      },
      margin: [0, 3, 0, 5]
    });
  } else {
    // Versión normal (dos columnas) para tablas estándar
    content.push({
      text: 'TOP 5 PAÍSES',
      style: 'sectionHeader',
      fillColor: '#e8f5e9',
      margin: [0, 10, 0, 5]
    });
    
    // Tabla de países
    const countriesTableBody = [
      [
        { text: 'País', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
        { text: 'Importe (EUR)', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
        { text: '%', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
        { text: 'Transacciones', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' }
      ]
    ];
    
    // Añadir filas de países
    let countryIndex = 0;
    Object.entries(transactionAnalysis.countries).forEach(([country, data]) => {
      const row = [
        country,
        `€${data.amount.toFixed(2)}`,
        `${(data.percentage).toFixed(1)}%`,
        data.count.toString()
      ];
      
      // Aplicar estilo alternado
      if (countryIndex % 2 !== 0) {
        countriesTableBody.push(row.map(cell => ({
          text: cell,
          fillColor: '#f1f8f1'
        })));
      } else {
        countriesTableBody.push(row);
      }
      
      countryIndex++;
    });
    
    // Añadir tabla de países
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*'],
        body: countriesTableBody
      },
      margin: [0, 5, 0, 10]
    });
  }
  
  return content;
}

/**
 * Crea la sección de análisis de productos para PDF
 * @param {Object} productAnalysis - Datos de análisis de productos
 * @returns {Object} Contenido formateado para PDF
 */
createPDFProductAnalysis(productAnalysis) {
  const content = [];
  
  // Espacio antes de la sección
  content.push({ text: '', margin: [0, 20, 0, 0] });
  
  // Título de la sección
  content.push({
    text: 'ANÁLISIS DE PRODUCTOS',
    style: 'sectionHeader',
    fillColor: '#f5f5f5',
    margin: [0, 10, 0, 10]
  });
  
  // Total suscripciones e ingresos
  content.push({
    text: `Total Suscripciones Activas: ${productAnalysis.totalSubscriptions}`,
    bold: true,
    margin: [0, 5, 0, 5]
  });
  
  content.push({
    text: `Total Ingresos: €${productAnalysis.totalRevenue.toFixed(2)}`,
    bold: true,
    margin: [0, 0, 0, 10]
  });
  
  // Distribución de planes
  content.push({
    text: 'DISTRIBUCIÓN DE PLANES',
    style: 'sectionHeader',
    fillColor: '#e3f2fd',
    margin: [0, 10, 0, 5]
  });
  
  // Tabla de planes
  const plansTableBody = [
    [
      { text: 'Tipo de Plan', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
      { text: 'Suscripciones', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
      { text: '%', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' }
    ]
  ];
  
  // Calcular totales para porcentajes correctos
  const totalPlans = (productAnalysis.planDistribution['Mensual'] || 0) + 
                    (productAnalysis.planDistribution['Anual'] || 0);
  
  // Añadir filas de planes
  const monthlyCount = productAnalysis.planDistribution['Mensual'] || 0;
  const monthlyPercentage = totalPlans > 0 ? (monthlyCount / totalPlans) * 100 : 0;
  
  const yearlyCount = productAnalysis.planDistribution['Anual'] || 0;
  const yearlyPercentage = totalPlans > 0 ? (yearlyCount / totalPlans) * 100 : 0;
  
  plansTableBody.push(['Mensual', monthlyCount.toString(), `${monthlyPercentage.toFixed(1)}%`]);
  plansTableBody.push([
    { text: 'Anual', fillColor: '#f3f9fe' },
    { text: yearlyCount.toString(), fillColor: '#f3f9fe' },
    { text: `${yearlyPercentage.toFixed(1)}%`, fillColor: '#f3f9fe' }
  ]);
  
  // Añadir tabla de planes
  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: plansTableBody
    },
    margin: [0, 5, 0, 15]
  });
  
  // Lista de productos por ingresos
  content.push({
    text: 'LISTA DE PRODUCTOS POR INGRESOS',
    style: 'sectionHeader',
    fillColor: '#e8f5e9',
    margin: [0, 10, 0, 5]
  });
  
  // Tabla de productos
  const productsTableBody = [
    [
      { text: 'Producto', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
      { text: 'Ingresos (EUR)', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
      { text: '%', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' }
    ]
  ];
  
  // Añadir filas de productos
  let productIndex = 0;
  Object.entries(productAnalysis.topProducts).forEach(([product, data]) => {
    const row = [
      product,
      `€${data.revenue.toFixed(2)}`,
      `${data.percentage.toFixed(1)}%`
    ];
    
    // Aplicar estilo alternado
    if (productIndex % 2 !== 0) {
      productsTableBody.push(row.map(cell => ({
        text: cell,
        fillColor: '#f1f8f1'
      })));
    } else {
      productsTableBody.push(row);
    }
    
    productIndex++;
  });
  
  // Añadir tabla de productos
  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: productsTableBody
    },
    margin: [0, 5, 0, 10]
  });
  
  return content;
}

/**
 * Crea la sección de resumen de estados para PDF
 * @param {Object} statusSummary - Datos de resumen de estados
 * @returns {Object} Contenido formateado para PDF
 */
createPDFStatusSummary(statusSummary) {
  const content = [];
  
  // Espacio antes de la sección
  content.push({ text: '', margin: [0, 20, 0, 0] });
  
  // Título de la sección
  content.push({
    text: 'RESUMEN DE SUSCRIPCIONES POR ESTADO',
    style: 'sectionHeader',
    fillColor: '#e0e0e0',
    margin: [0, 10, 0, 10]
  });
  
  // Tabla de estados
  const statusTableBody = [
    [
      { text: 'Estado', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
      { text: 'Cantidad', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' }
    ]
  ];
  
  // Añadir filas de estados
  Object.entries(statusSummary).forEach(([status, count], index) => {
    // Color de fondo según estado
    let bgColor;
    switch(status) {
      case 'Activa': bgColor = '#e6ffea'; break;
      case 'Pausada': bgColor = '#fff8e1'; break;
      case 'Cancelada': bgColor = '#ffebee'; break;
      case 'Expirada': bgColor = '#f5f5f5'; break;
      default: bgColor = '#f5f5f5';
    }
    
    statusTableBody.push([
      { text: status, fillColor: bgColor },
      { text: count.toString(), fillColor: bgColor }
    ]);
  });
  
  // Calcular total
  const totalCount = Object.values(statusSummary).reduce((a, b) => a + b, 0);
  
  // Añadir fila de total
  statusTableBody.push([
    { text: 'TOTAL', bold: true, fillColor: '#e0e0e0' },
    { text: totalCount.toString(), bold: true, fillColor: '#e0e0e0' }
  ]);
  
  // Añadir tabla de estados
  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*'],
      body: statusTableBody
    },
    margin: [0, 5, 0, 10]
  });
  
  return content;
}

/**
 * Crea la sección de resumen de gastos deducibles para PDF con ancho completo
 * @param {Object} deductibleSummary - Datos de resumen de gastos deducibles
 * @returns {Object} Contenido formateado para PDF
 */
createPDFDeductibleSummary(deductibleSummary) {
  const content = [];
  
  // Espacio antes de la sección
  content.push({ text: '', margin: [0, 20, 0, 0] });
  
  // Título de la sección
  content.push({
    text: 'RESUMEN DE GASTOS DEDUCIBLES',
    style: 'sectionHeader',
    fillColor: '#c3e6cb',
    margin: [0, 10, 0, 10]
  });
  
  // Tabla de resumen deducible
  const deductibleTableBody = [
    [
      { text: 'Concepto', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' },
      { text: 'Importe (EUR)', style: 'tableHeader', fillColor: `#${this.brandColors.primary}`, color: '#FFFFFF' }
    ]
  ];
  
  // Añadir IVA deducible si existe
  if (deductibleSummary.ivaDeducible !== undefined) {
    deductibleTableBody.push([
      { text: 'IVA DEDUCIBLE', bold: true, fillColor: '#e8f4ea' },
      { text: `€${deductibleSummary.ivaDeducible.toFixed(2)}`, bold: true, fillColor: '#e8f4ea' }
    ]);
  }
  
  // Añadir GASTO deducible si existe
  if (deductibleSummary.gastoDeducible !== undefined) {
    deductibleTableBody.push([
      { text: 'GASTO DEDUCIBLE', bold: true, fillColor: '#e8f4ea' },
      { text: `€${deductibleSummary.gastoDeducible.toFixed(2)}`, bold: true, fillColor: '#e8f4ea' }
    ]);
  }
  
  // Añadir TOTAL DEDUCIBLE si existe
  if (deductibleSummary.totalDeducible !== undefined) {
    deductibleTableBody.push([
      { text: 'TOTAL DEDUCIBLE', bold: true, fillColor: '#c3e6cb' },
      { text: `€${deductibleSummary.totalDeducible.toFixed(2)}`, bold: true, fillColor: '#c3e6cb', color: '#006400' }
    ]);
  }
  
  // CLAVE: Asegurar que la tabla use todo el ancho disponible
  content.push({
    table: {
      headerRows: 1,
      // Mantener mismo esquema de distribución de ancho que la tabla principal
      widths: ['70%', '30%'],
      body: deductibleTableBody,
      // Forzar a que ocupe el ancho completo
      width: '100%'
    },
    layout: {
      fillColor: function(rowIndex, node, columnIndex) {
        if (rowIndex === 0) {
          return `#${this.brandColors.primary}`;
        }
        return null;
      }.bind(this),
      hLineWidth: function(i, node) { return 0.5; },
      vLineWidth: function(i, node) { return 0.5; },
      hLineColor: function(i, node) {
        return (i === 0 || i === node.table.body.length) ? `#${this.brandColors.primary}` : `#${this.brandColors.secondary}`;
      }.bind(this),
      vLineColor: function(i, node) {
        return (i === 0 || i === node.table.widths.length) ? `#${this.brandColors.primary}` : `#${this.brandColors.secondary}`;
      }.bind(this)
    },
    // Asegurar que todo el contenedor ocupa todo el ancho
    width: '100%',
    // Eliminar márgenes horizontales para maximizar el ancho utilizado
    margin: [0, 5, 0, 10]
  });
  
  return content;
}

/**
 * Exporta un informe de impuestos a PDF con secciones múltiples
 * @param {string} fileName - Nombre del archivo
 * @param {Array} sections - Secciones del informe
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<boolean>} Éxito de la exportación
 */
async exportTaxReportToPDF(fileName, sections, options = {}) {
  try {
    console.log('Iniciando exportación de informe de impuestos a PDF...');
    
    // Combinar opciones con valores por defecto
    const exportOptions = { ...this.defaultOptions, ...options };
    
    // Configurar opciones de PDF para formato A4 vertical
    if (!exportOptions.pdf) {
      exportOptions.pdf = {};
    }
    
    // Usar las opciones pasadas o establecer valores predeterminados para A4 portrait
    exportOptions.pdf.fitToPage = true;
    exportOptions.pdf.pageSize = exportOptions.pdf.pageSize || 'A4';
    exportOptions.pdf.orientation = exportOptions.pdf.orientation || 'portrait';
    
    // Cargar la biblioteca pdfmake si no está ya cargada
    if (typeof pdfMake === 'undefined') {
      await this.loadPDFMakeLibrary();
    }
    
    // Crear definición del documento PDF
    const docDefinition = await this.createTaxReportPDFDefinition(sections, exportOptions);
    
    // Detectar si el usuario está usando Internet Explorer (que tiene problemas con PDF grandes)
    const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || 
                window.navigator.userAgent.indexOf('Trident/') > -1;
    
    // Añadir información de progreso
    let progressMsg = `Generando informe de impuestos en PDF...`;
    
    // Mostrar mensaje si hay alguna función UI disponible
    if (typeof window.showGeneratingMessage === 'function') {
      window.showGeneratingMessage(progressMsg);
    } else {
      console.log(progressMsg);
    }
    
    // Generar y descargar el PDF
    if (isIE) {
      // Para IE, abrimos en nueva ventana
      pdfMake.createPdf(docDefinition).open();
    } else {
      // Para navegadores modernos, descarga directa
      pdfMake.createPdf(docDefinition).download(`${fileName}.pdf`);
    }
    
    console.log('Informe de impuestos exportado a PDF correctamente');
    return true;
  } catch (error) {
    console.error('Error al exportar informe de impuestos a PDF:', error);
    return false;
  }
}

/**
 * Crea la definición del documento PDF para el informe de impuestos en una sola página
 * @param {Array} sections - Secciones del informe
 * @param {Object} options - Opciones de exportación
 * @returns {Object} Definición del documento PDF
 */
async createTaxReportPDFDefinition(sections, options) {
  try {
    // Obtener configuración de optimización
    const optimization = options.pdf || {};
    // Reducir tamaño de fuente para que quepa mejor en una página
    const fontSize = 8; // Ligeramente aumentado para A4
    const headerFontSize = 10;
    const titleFontSize = 14;
    const margins = [10, 10, 10, 10]; // Márgenes ajustados para A4 portrait
    
    // Definir el contenido del documento
    const content = [];
    
    // Añadir logo si está disponible (tamaño reducido)
    if (options.includeLogo && options.logoUrl) {
      try {
        // Convertir logo a dataURL
        const logoDataUrl = await this.getImageAsDataURL(options.logoUrl);
        
        // Añadir logo al inicio del contenido
        content.push({
          image: logoDataUrl,
          width: 80, // Aumentado ligeramente para A4
          alignment: 'left',
          margin: [0, 0, 0, 5]
        });
      } catch (error) {
        console.warn('No se pudo cargar el logo para PDF:', error);
      }
    }
    
    // Procesar cada sección - TODO EN UNA SOLA PÁGINA
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      switch (section.type) {
        case 'header':
          // Añadir título principal
          content.push({
            text: section.title,
            style: 'mainHeader',
            alignment: 'center',
            margin: [0, 0, 0, 3]
          });
          
          // Añadir subtítulo si existe
          if (section.subtitle) {
            content.push({
              text: section.subtitle,
              style: 'subHeader',
              alignment: 'center',
              margin: [0, 0, 0, 3]
            });
          }
          
          // Añadir fecha de generación
          content.push({
            text: `Generado el ${new Date().toLocaleDateString('es-ES')}`,
            style: 'subHeader',
            alignment: 'center',
            margin: [0, 0, 0, 5]
          });
          break;
          
        case 'table':
          // Añadir espacio mínimo entre secciones
          if (i > 0) {
            content.push({ text: '', margin: [0, 5, 0, 0] });
          }
          
          // Añadir encabezado de sección
          content.push({
            text: section.title,
            style: 'sectionHeader',
            margin: [0, 5, 0, 3],
          });
          
          // Si no hay datos, mostrar mensaje
          if (!section.data || section.data.length === 0) {
            content.push({
              text: 'No hay datos disponibles para esta sección',
              margin: [0, 3, 0, 3],
              italics: true
            });
            continue;
          }
          
          // Extraer encabezados
          const headers = Object.keys(section.data[0]);
          
          // Crear cuerpo de la tabla
          const tableBody = [];
          
          // Añadir fila de encabezados
          tableBody.push(
            headers.map(header => ({
              text: header,
              style: 'tableHeader',
              fillColor: `#${this.brandColors.primary}`,
              color: '#FFFFFF',
              bold: true,
              fontSize: fontSize
            }))
          );
          
          // Añadir filas de datos
          section.data.forEach((row, rowIndex) => {
            const cells = headers.map(header => {
              let value = row[header];
              let cellContent = { text: '', fontSize: fontSize };
              
              // Formatear según tipo
              if (value === null || value === undefined || value === '') {
                cellContent.text = '';
              }
              // Formato de porcentaje
              else if (section.percentFormats && section.percentFormats.includes(header)) {
                const numValue = typeof value === 'number' ? value : parseFloat(value);
                if (!isNaN(numValue)) {
                  cellContent.text = `${(numValue * 100).toFixed(1)}%`;
                } else {
                  cellContent.text = value.toString();
                }
              }
              // Formato de moneda
              else if (section.currencyFormats && section.currencyFormats[header]) {
                const numValue = typeof value === 'number' ? value : parseFloat(value);
                if (!isNaN(numValue)) {
                  // Determinar símbolo de moneda según formato
                  const format = section.currencyFormats[header];
                  let symbol = '';
                  if (format.includes('€')) symbol = '€';
                  else if (format.includes('$')) symbol = '$';
                  
                  cellContent.text = `${symbol}${numValue.toFixed(2)}`;
                } else {
                  cellContent.text = value.toString();
                }
              }
              // Valor normal
              else {
                cellContent.text = value.toString();
              }
              
              // Estilo para la última fila (totales)
              if (rowIndex === section.data.length - 1) {
                cellContent.bold = true;
                cellContent.fillColor = `#${this.brandColors.headerBg}`;
              }
              // Estilos alternados para filas normales
              else if (rowIndex % 2 !== 0) {
                cellContent.fillColor = `#${this.brandColors.background}`;
              }
              
              // Aplicar truncamiento para textos muy largos
              if (typeof cellContent.text === 'string' && cellContent.text.length > 30) {
                cellContent.text = cellContent.text.substring(0, 27) + '...';
              }
              
              return cellContent;
            });
            
            tableBody.push(cells);
          });
          
          // Calcular anchos de columna
          let columnWidths;
          
          // Si se proporcionan anchos específicos
          if (section.columnWidths) {
            columnWidths = headers.map(header => {
              if (section.columnWidths[header]) {
                // Si es porcentaje, convertir a string
                if (typeof section.columnWidths[header] === 'string' && 
                    section.columnWidths[header].includes('%')) {
                  return section.columnWidths[header];
                }
                // Si es número, usar directamente
                return section.columnWidths[header];
              }
              // Valor por defecto si no se especifica
              return '*';
            });
          }
          // Calcular automáticamente para ocupar todo el ancho
          else {
            // Usar ponderación según tipo de columna
            columnWidths = headers.map(header => {
              const headerLower = header.toLowerCase();
              
              // Columnas estrechas (IDs, porcentajes, etc.)
              if (headerLower.includes('código') || 
                  headerLower.includes('tasa') ||
                  headerLower.includes('%') ||
                  headerLower === 'moneda' ||
                  headerLower === 'id') {
                return 'auto';
              }
              
              // Columnas más anchas (descripciones, nombres, etc.)
              if (headerLower.includes('país') || 
                  headerLower.includes('región') ||
                  headerLower.includes('concepto')) {
                return '*';
              }
              
              // Valor por defecto
              return 'auto';
            });
          }
          
          // Añadir tabla al contenido
          content.push({
            table: {
              headerRows: 1,
              widths: columnWidths,
              body: tableBody,
              width: '100%'
            },
            layout: {
              fillColor: function(rowIndex, node, columnIndex) {
                if (rowIndex === 0) {
                  return `#${this.brandColors.primary}`;
                }
                if (rowIndex === tableBody.length - 1) {
                  return `#${this.brandColors.headerBg}`;
                }
                return (rowIndex % 2 === 0) ? null : `#${this.brandColors.background}`;
              }.bind(this),
              hLineWidth: function(i, node) { return 0.2; }, // Líneas más finas
              vLineWidth: function(i, node) { return 0.2; }, // Líneas más finas
              hLineColor: function(i, node) {
                return (i === 0 || i === node.table.body.length) ? 
                  `#${this.brandColors.primary}` : `#${this.brandColors.secondary}`;
              }.bind(this),
              vLineColor: function(i, node) {
                return (i === 0 || i === node.table.widths.length) ? 
                  `#${this.brandColors.primary}` : `#${this.brandColors.secondary}`;
              }.bind(this),
              paddingLeft: function(i, node) { return 2; }, // Padding reducido
              paddingRight: function(i, node) { return 2; }, // Padding reducido
              paddingTop: function(i, node) { return 2; }, // Padding reducido
              paddingBottom: function(i, node) { return 2; } // Padding reducido
            },
            width: '100%',
            margin: [0, 2, 0, 5] // Margen muy reducido entre tablas
          });
          break;
      }
    }
    
    // Crear definición del documento
    const docDefinition = {
      content: content,
      defaultStyle: {
        fontSize: fontSize,
        font: 'Roboto'
      },
      styles: {
        mainHeader: {
          fontSize: titleFontSize,
          bold: true,
          color: `#${this.brandColors.marron}`,
          margin: [0, 0, 0, 2]
        },
        subHeader: {
          fontSize: headerFontSize - 2,
          italics: true,
          color: `#${this.brandColors.text}`,
          margin: [0, 1, 0, 1]
        },
        sectionHeader: {
          fontSize: headerFontSize,
          bold: true,
          color: `#${this.brandColors.marron}`,
          fillColor: `#${this.brandColors.background}`,
          margin: [0, 3, 0, 1]
        },
        tableHeader: {
          fontSize: fontSize,
          bold: true,
          color: '#FFFFFF'
        }
      },
      pageOrientation: 'portrait', // Cambiado a portrait (vertical)
      pageSize: 'A4', // Cambiado a A4
      pageMargins: margins, // Usar los márgenes definidos
      footer: function(currentPage, pageCount) {
        return {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: fontSize - 2,
          margin: [0, 3, 0, 0]
        };
      }
    };
    
    return docDefinition;
  } catch (error) {
    console.error('Error al crear definición de PDF para informe de impuestos:', error);
    throw error;
  }
}
}

// Exportar instancia única
export default new ExportManager();