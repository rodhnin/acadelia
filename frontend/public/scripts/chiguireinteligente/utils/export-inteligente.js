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
      
      const exportOptions = { ...this.defaultOptions, ...options };
      
      const fileName = this.generateFileName(exportOptions);
      
      if (exportOptions.useAdvancedFormat && typeof window.ExcelJS !== 'undefined') {
        return await this.exportToExcelAdvanced(data, exportOptions);
      } else {
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
    if (window.addEventListener && window.financeAdmin && window.financeAdmin.eventBus) {
      window.financeAdmin.eventBus.on('exportSettingsChanged', (exportSettings) => {
        console.log('ExportManager: Recibida actualización de configuración de exportación', exportSettings);
        this.updateExportSettings(exportSettings);
      });
      
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
    
    if (exportSettings.csvDelimiter) {
      // Si recibimos un valor descriptivo, actualizamos ambos
      const delimiterValue = exportSettings.csvDelimiter;
      console.log(`ExportManager: Actualizando separador CSV a: "${delimiterValue}" (valor descriptivo)`);
      
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
      const wb = XLSX.utils.book_new();
      
      const ws = XLSX.utils.json_to_sheet(data, {
        header: this.extractHeaders(data, options),
        skipHeader: !options.includeHeaders
      });
      
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
    
    const fileName = this.generateFileName(options);
    
    workbook.creator = options.companyName;
    workbook.lastModifiedBy = options.companyName;
    workbook.created = new Date();
    workbook.modified = new Date();
    
    const worksheet = workbook.addWorksheet(options.sheetName, {
      views: [{showGridLines: true}],
      properties: {tabColor: {argb: this.brandColors.secondary}}
    });
    
    if (options.includeCompanyHeader) {
      this.addCorporateHeader(worksheet, workbook, options);
    }
    
    const headers = this.extractHeaders(data, options);
    
    const numericColumns = this.detectNumericColumns(data, headers);
    const currencyColumns = this.detectCurrencyColumns(headers);
    
    const currencyFormats = options.currencyFormats || {};


// NUEVO: Obtener formatos enteros si se proporcionan
const integerFormats = options.integerFormats || {};
    
    const headerRow = worksheet.addRow(headers);
    // Guardamos la fila de los encabezados para los filtros
    const headerRowNum = worksheet.rowCount;
    
    this.styleHeaderRow(headerRow, worksheet);
    
    data.forEach((item, index) => {
      const rowValues = headers.map(header => {
        let value = item[header];
        
        if (value instanceof Date) {
          return value; // ExcelJS manejará el formateo de fechas
        }
        
        // MODIFICADO: Verificar tanto formatos de moneda como enteros
        if ((currencyFormats && currencyFormats[header] || 
             integerFormats && integerFormats[header]) && 
            (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          return parseFloat(value);
        }
        
        return value;
      });
      
      const row = worksheet.addRow(rowValues);
      
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
      
      if (index % 2 !== 0) {
        this.styleAlternateRow(row);
      }
      
      // Resaltar filas deducibles si está habilitado (específico para egresos)
      if (options.highlightDeductibles && headers.includes('Deducible')) {
        const deductibleIdx = headers.indexOf('Deducible');
        const deductibleValue = item['Deducible'];
        
        if (deductibleValue === 'Sí') {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.deductibleColor || 'e6fffa' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'c3e6cb' } },
              left: { style: 'thin', color: { argb: 'c3e6cb' } },
              bottom: { style: 'thin', color: { argb: 'c3e6cb' } },
              right: { style: 'thin', color: { argb: 'c3e6cb' } }
            };
          });
        } else if (deductibleValue === 'No') {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.nonDeductibleColor || 'ffebee' } // Color rojizo claro
            };
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
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: options.inactiveUserColor || 'ffebee' }
            };
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
    
    if (options.includeTotals && 
        (numericColumns.length > 0 || (options.columnsWithTotals && options.columnsWithTotals.length > 0))) {
      this.addTotalsRow(worksheet, headers, numericColumns, currencyColumns, options);
    }
    
if (options.deductibleSummary && 
    (options.deductibleSummary.ivaDeducible !== undefined || 
     options.deductibleSummary.gastoDeducible !== undefined)) {
  worksheet.addRow([]);
  
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
  
  if (options.deductibleSummary.ivaDeducible !== undefined) {
    const ivaDeducibleRow = worksheet.addRow(['IVA DEDUCIBLE:', options.deductibleSummary.ivaDeducible]);
    
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
  
  if (options.deductibleSummary.gastoDeducible !== undefined) {
    const gastoDeducibleRow = worksheet.addRow(['GASTO DEDUCIBLE:', options.deductibleSummary.gastoDeducible]);
    
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
    
    totalDeducibleRow.border = {
      bottom: { style: 'thin', color: { argb: '006400' } }
    };
  }
}
    
    if (options.statusSummary) {
      worksheet.addRow([]);
      
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
      
      for (const [status, count] of Object.entries(options.statusSummary)) {
        const statusRow = worksheet.addRow([`${status}:`, count]);
        
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
      
      const totalCount = Object.values(options.statusSummary).reduce((a, b) => a + b, 0);
      const totalRow = worksheet.addRow(['TOTAL:', totalCount]);
      
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
    
    if (options.inactiveUserSummary) {
      worksheet.addRow([]);
      
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
      
      const inactiveCount = worksheet.addRow(['Usuarios que han dejado de usar la plataforma:', options.inactiveUserSummary.count]);
      
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
      
      const inactivePercentage = worksheet.addRow(['Porcentaje de abandono:', `${options.inactiveUserSummary.percentage}%`]);
      inactivePercentage.font = {
        bold: true
      };
    }

if (options.productAnalysis) {
  worksheet.addRow([]);
  
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
      worksheet.addRow([]);
      
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
    
    if (options.includeFilters) {
      worksheet.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to: { row: headerRowNum, column: headers.length }
      };
    }
    
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
    
    const buffer = await workbook.xlsx.writeBuffer();
    
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
  
  const borderRow = worksheet.addRow([]);
  borderRow.border = {
    bottom: { style: 'medium', color: { argb: this.brandColors.primary } }
  };
  
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
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result.split(',')[1];
        
        const imageId = workbook.addImage({
          base64: base64,
          extension: 'png',
        });
        
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
  
  const totalsRowData = Array(headers.length).fill('');
  
  totalsRowData[0] = 'TOTAL';
  
  const specificColumnsToTotal = options.columnsWithTotals || [];
  
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
      
      totalsRowData[colIndex] = {
        formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
        result: 0 // Valor por defecto
      };
    });
  }
  
  const totalsRow = worksheet.addRow(totalsRowData);
  
  // Estilizar fila de totales
  totalsRow.eachCell((cell, colNumber) => {
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
    
    const headerName = headers[colNumber - 1];
    
    // CORRECCIÓN: Priorizar los formatos explícitos de enteros sobre otros formatos
    if (integerFormats && integerFormats[headerName]) {
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
      
      const exportOptions = { ...this.defaultOptions, ...options };
      
      const fileName = this.generateFileName(exportOptions);
      
      let delimiter = exportOptions.csvDelimiter;
      
      if (delimiter !== ',' && delimiter !== ';' && delimiter !== '\t') {
        console.warn(`ExportManager: Separador CSV inválido: "${delimiter}", usando por defecto: ";"`);
        delimiter = ';';
      }
      
      console.log(`ExportManager: Exportando CSV con separador: "${delimiter}"`);
      
      const headers = this.extractHeaders(data, exportOptions);
      
      let csvContent = '';
      
      if (exportOptions.includeHeaders) {
        csvContent += headers.join(delimiter) + '\n';
      }
      
      data.forEach(row => {
        const rowValues = headers.map(header => {
          const value = row[header];
          
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
      
      const exportOptions = { ...this.defaultOptions, ...options };
      
      const fileName = this.generateFileName(exportOptions);
      
      const jsonData = {
        exportDate: new Date().toISOString(),
        reportName: exportOptions.title || `Informe de ${exportOptions.sheetName}`,
        totalRecords: data.length,
        data: data
      };
      
      const jsonString = JSON.stringify(jsonData, null, 2);
      
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
    const exportOptions = { ...this.defaultOptions, ...options };
    
    if (!options.format) {
      exportOptions.format = this.getPreferredFormat();
    }
    
    if (exportOptions.format === 'csv' && !options.csvDelimiter) {
      exportOptions.csvDelimiter = this.getPreferredCsvDelimiter();
    }
    
    console.log(`ExportManager: Exportando en formato ${exportOptions.format} con separador CSV: "${exportOptions.csvDelimiter}"`);
    
    // Preprocesar datos si es necesario
    const processedData = this.processDataForExport(data, exportOptions);
    
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
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
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
    
    return data.map(item => {
      const processedItem = {};
      
      Object.keys(item).forEach(key => {
        if (
          (processingOptions.includeFields && !processingOptions.includeFields.includes(key)) ||
          (processingOptions.excludeFields && processingOptions.excludeFields.includes(key))
        ) {
          return;
        }
        
        let value = item[key];
        
        if (processingOptions.removeNulls && (value === null || value === undefined)) {
          value = '';
        }
        
        const fieldName = processingOptions.renameFields[key] || key;
        
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
    const templateConfig = this.getTemplateConfig(reportType);
    
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
    
    const exportOptions = { ...this.defaultOptions, ...options };
    
    const headers = this.extractHeaders(data, exportOptions);
    console.log(`Exportando tabla con ${headers.length} columnas a PDF`);
    
    const optimizationConfig = this.getPDFOptimizationConfig(exportOptions, headers);
    console.log('Configuración de optimización PDF:', optimizationConfig);
    
    exportOptions._pdfOptimization = optimizationConfig;
    
    const fileName = this.generateFileName(exportOptions);
    
    if (typeof pdfMake === 'undefined') {
      await this.loadPDFMakeLibrary();
    }
    
    const docDefinition = await this.createPDFDocDefinition(data, exportOptions);
    
    const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || 
                window.navigator.userAgent.indexOf('Trident/') > -1;
    
    let progressMsg = `Generando PDF para ${data.length} filas...`;
    if (options.sheetName) {
      progressMsg = `Generando ${options.sheetName} en PDF...`;
    }
    
    if (typeof window.showGeneratingMessage === 'function') {
      window.showGeneratingMessage(progressMsg);
    } else {
      console.log(progressMsg);
    }
    
    console.log('Configuración final para PDF:', {
      pageSize: docDefinition.pageSize,
      pageOrientation: docDefinition.pageOrientation,
      userRequestedOrientation: exportOptions.pdf?.orientation || 'default'
    });
    
    if (isIE) {
      pdfMake.createPdf(docDefinition).open();
    } else {
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
    if (typeof pdfMake !== 'undefined') {
      resolve();
      return;
    }
    
    console.log('Cargando biblioteca pdfmake para exportaciones a PDF...');
    
    const scriptPdfMake = document.createElement('script');
    scriptPdfMake.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    scriptPdfMake.async = true;
    
    const scriptVfsFonts = document.createElement('script');
    scriptVfsFonts.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
    scriptVfsFonts.async = true;
    
    scriptPdfMake.onload = () => {
      console.log('pdfmake cargado correctamente');
      document.body.appendChild(scriptVfsFonts);
    };
    
    scriptVfsFonts.onload = () => {
      console.log('vfs_fonts cargado correctamente');
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
    
    document.body.appendChild(scriptPdfMake);
  });
}

/**
 * Registra fuentes personalizadas para PDF
 */
registerPDFFonts() {
  // Solo si pdfMake está disponible
  if (typeof pdfMake === 'undefined') return;
  
  const fontDefinitions = {
    Poppins: {
      normal: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2',
      bold: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
      italics: 'https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmE0tCMPI.woff2',
      bolditalics: 'https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmv1pVF9eO.woff2'
    }
  };
  
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
  
  const pdfOptions = options.pdf || {};
  
  const tableWidth = headers.length;
  let isWideTable = tableWidth > 7;
  
  // Anular automático si está específicamente configurado
  if (pdfOptions.optimizeForWideTables === false) {
    isWideTable = false;
  } else if (pdfOptions.optimizeForWideTables === true) {
    isWideTable = tableWidth > 5; // Umbral más bajo cuando se solicita optimización
  }
  
  config.isWideTable = isWideTable;
  
  if (pdfOptions.pageSize && pdfOptions.pageSize !== 'auto') {
    config.pageSize = pdfOptions.pageSize;
  } else if (isWideTable && tableWidth >= 10) {
    config.pageSize = 'A3';
  }
  
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
  
  const orientation = pdfOptions.orientation || 'landscape';
  
  if (orientation === 'portrait') {
    if (isWideTable && tableWidth >= 10) {
      config.margins = [5, 10, 5, 15]; // Márgenes muy pequeños para tablas muy anchas
    } else if (isWideTable) {
      config.margins = [10, 15, 10, 20];
    } else {
      config.margins = [15, 20, 15, 25]; // Márgenes normales para tablas estándar
    }
  } else {
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
  const headers = this.extractHeaders(data, options);
  
  const optimization = options._pdfOptimization || this.getPDFOptimizationConfig(options, headers);
  const isWideTable = optimization.isWideTable;
  const fontSize = optimization.fontSize;
  const headerFontSize = optimization.headerFontSize;
  const titleFontSize = optimization.titleFontSize;
  const pageSize = optimization.pageSize;
  const margins = optimization.margins;
  
  // CLAVE: Forzar el ajuste de anchos al tamaño de la página
  const columnWidths = this.calculateForcedFitColumnWidths(headers, options);
  
  const pdfTableBody = [];
  
  const headerRow = headers.map(header => ({
    text: header,
    style: 'tableHeader',
    fillColor: `#${this.brandColors.primary}`,
    color: '#FFFFFF',
    bold: true,
    fontSize: isWideTable ? fontSize : fontSize + 1  // Reducir diferencia para encabezados
  }));
  pdfTableBody.push(headerRow);
  
  data.forEach((item, index) => {
    const row = headers.map(header => {
      let value = item[header];
      
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string') {
        return this.truncateTextForPDF(value, header, options, isWideTable);
      } else if (value instanceof Date) {
        return formatDate(value, options.dateFormat || 'DD/MM/YYYY');
      } else if (typeof value === 'number') {
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
        fillColor: index % 2 !== 0 ? `#${this.brandColors.background}` : null
      }));
      pdfTableBody.push(rowWithStyle);
    } else {
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
  
  const content = [];
  
  const title = options.title || `Informe de ${options.sheetName || 'Datos'}`;
  content.push({
    text: title,
    style: 'header',
    alignment: 'center',
    margin: [0, 0, 0, 5]  // Reducir margen inferior
  });
  
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
    margin: [0, 2, 0, 5]
  });
  
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
  
  if (options.includeLogo && options.logoUrl) {
    try {
      // En PDF no podemos usar directamente la URL, necesitamos convertirla a dataURL
      const logoDataUrl = await this.getImageAsDataURL(options.logoUrl);
      
      // Ajustar tamaño del logo para tablas anchas
      const logoWidth = isWideTable ? 80 : 100;
      
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
    const scaleFactor = availableWidth / totalExplicitWidth;
    
    headers.forEach(header => {
      let width;
      if (explicitWidths[header]) {
        // Escalar anchos explícitos proporcionalmente
        width = Math.max(20, Math.floor(explicitWidths[header] * scaleFactor));
      } else {
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
    const extraSpace = availableWidth - finalTotalWidth;
    console.log(`Espacio extra disponible: ${extraSpace} puntos`);
    
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
  
  const increments = priorities.map(p => Math.floor((p / totalPriority) * extraSpace));
  
  const distributedSpace = increments.reduce((sum, i) => sum + i, 0);
  const remaining = extraSpace - distributedSpace;
  
  // Distribuir el espacio restante a las columnas con mayor prioridad
  if (remaining > 0) {
    const pairs = priorities.map((p, i) => [i, p]);
    pairs.sort((a, b) => b[1] - a[1]);
    
    // Distribuir el espacio restante entre las columnas con mayor prioridad
    for (let i = 0; i < remaining; i++) {
      const columnIndex = pairs[i % pairs.length][0];
      increments[columnIndex]++;
    }
  }
  
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
  
  const textStr = String(text);
  
  if (options.truncateText && options.truncateText[column]) {
    const maxLength = options.truncateText[column];
    // Si el texto es más largo que el máximo permitido, truncarlo
    if (textStr.length > maxLength) {
      return textStr.substring(0, maxLength) + '...';
    }
  }
  // Si no hay configuración específica pero la tabla es ancha,
  else if (isWideTable) {
    const columnLower = column.toLowerCase();
    
    // Correos electrónicos (truncar más agresivamente)
    if (columnLower.includes('correo') || columnLower.includes('email')) {
      if (textStr.length > 20) {
        const parts = textStr.split('@');
        if (parts.length === 2) {
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
    const pageWidth = headers.length > 12 ? 1100 :   // A3
                      headers.length > 8 ? 800 :     // A4 landscape
                      750;                           // A4 landscape con márgenes normales
    
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
      const baseWidth = Math.max(20, Math.floor(availableWidth / headers.length));
      
      return headers.map(header => {
        const headerLower = header.toLowerCase();
        
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
  
  analysisTableBody.push([
    { text: 'Usuarios que han dejado de usar la plataforma', fontSize: fontSize },
    { text: inactiveUserSummary.count.toString(), fontSize: fontSize }
  ]);
  
  analysisTableBody.push([
    { text: 'Porcentaje de abandono', fontSize: fontSize, fillColor: '#f3f9fe' },
    { text: `${inactiveUserSummary.percentage}%`, fontSize: fontSize, fillColor: '#f3f9fe' }
  ]);
  
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
    
    const needsTotal = options.columnsWithTotals && options.columnsWithTotals.includes(header);
    
    if (needsTotal) {
      let total = 0;
      data.forEach(item => {
        const value = item[header];
        if (typeof value === 'number') {
          total += value;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
          total += parseFloat(value);
        }
      });
      
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
  
  let methodIndex = 0;
  Object.entries(transactionAnalysis.paymentMethods).forEach(([method, data]) => {
    const row = [
      method,
      `€${data.amount.toFixed(2)}`,
      `${(data.percentage).toFixed(1)}%`,
      data.count.toString()
    ];
    
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
    
    let countryIndex = 0;
    Object.entries(transactionAnalysis.countries).forEach(([country, data]) => {
      const row = [
        country,
        `€${data.amount.toFixed(2)}`,
        `${(data.percentage).toFixed(1)}%`,
        data.count.toString()
      ];
      
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
    
    content.push({
      table: {
        headerRows: 1,
        widths: ['25%', '25%', '25%', '25%'],
        body: countriesTableBody
      },
      margin: [0, 3, 0, 5]
    });
  } else {
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
    
    let countryIndex = 0;
    Object.entries(transactionAnalysis.countries).forEach(([country, data]) => {
      const row = [
        country,
        `€${data.amount.toFixed(2)}`,
        `${(data.percentage).toFixed(1)}%`,
        data.count.toString()
      ];
      
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
  
  const totalPlans = (productAnalysis.planDistribution['Mensual'] || 0) + 
                    (productAnalysis.planDistribution['Anual'] || 0);
  
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
  
  let productIndex = 0;
  Object.entries(productAnalysis.topProducts).forEach(([product, data]) => {
    const row = [
      product,
      `€${data.revenue.toFixed(2)}`,
      `${data.percentage.toFixed(1)}%`
    ];
    
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
  
  const totalCount = Object.values(statusSummary).reduce((a, b) => a + b, 0);
  
  statusTableBody.push([
    { text: 'TOTAL', bold: true, fillColor: '#e0e0e0' },
    { text: totalCount.toString(), bold: true, fillColor: '#e0e0e0' }
  ]);
  
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
  
  if (deductibleSummary.ivaDeducible !== undefined) {
    deductibleTableBody.push([
      { text: 'IVA DEDUCIBLE', bold: true, fillColor: '#e8f4ea' },
      { text: `€${deductibleSummary.ivaDeducible.toFixed(2)}`, bold: true, fillColor: '#e8f4ea' }
    ]);
  }
  
  if (deductibleSummary.gastoDeducible !== undefined) {
    deductibleTableBody.push([
      { text: 'GASTO DEDUCIBLE', bold: true, fillColor: '#e8f4ea' },
      { text: `€${deductibleSummary.gastoDeducible.toFixed(2)}`, bold: true, fillColor: '#e8f4ea' }
    ]);
  }
  
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
    
    const exportOptions = { ...this.defaultOptions, ...options };
    
    if (!exportOptions.pdf) {
      exportOptions.pdf = {};
    }
    
    exportOptions.pdf.fitToPage = true;
    exportOptions.pdf.pageSize = exportOptions.pdf.pageSize || 'A4';
    exportOptions.pdf.orientation = exportOptions.pdf.orientation || 'portrait';
    
    if (typeof pdfMake === 'undefined') {
      await this.loadPDFMakeLibrary();
    }
    
    const docDefinition = await this.createTaxReportPDFDefinition(sections, exportOptions);
    
    const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || 
                window.navigator.userAgent.indexOf('Trident/') > -1;
    
    let progressMsg = `Generando informe de impuestos en PDF...`;
    
    if (typeof window.showGeneratingMessage === 'function') {
      window.showGeneratingMessage(progressMsg);
    } else {
      console.log(progressMsg);
    }
    
    if (isIE) {
      pdfMake.createPdf(docDefinition).open();
    } else {
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
    const optimization = options.pdf || {};
    const fontSize = 8; // Ligeramente aumentado para A4
    const headerFontSize = 10;
    const titleFontSize = 14;
    const margins = [10, 10, 10, 10]; // Márgenes ajustados para A4 portrait
    
    const content = [];
    
    if (options.includeLogo && options.logoUrl) {
      try {
        const logoDataUrl = await this.getImageAsDataURL(options.logoUrl);
        
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
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      switch (section.type) {
        case 'header':
          content.push({
            text: section.title,
            style: 'mainHeader',
            alignment: 'center',
            margin: [0, 0, 0, 3]
          });
          
          if (section.subtitle) {
            content.push({
              text: section.subtitle,
              style: 'subHeader',
              alignment: 'center',
              margin: [0, 0, 0, 3]
            });
          }
          
          content.push({
            text: `Generado el ${new Date().toLocaleDateString('es-ES')}`,
            style: 'subHeader',
            alignment: 'center',
            margin: [0, 0, 0, 5]
          });
          break;
          
        case 'table':
          if (i > 0) {
            content.push({ text: '', margin: [0, 5, 0, 0] });
          }
          
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
          
          const headers = Object.keys(section.data[0]);
          
          const tableBody = [];
          
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
          
          section.data.forEach((row, rowIndex) => {
            const cells = headers.map(header => {
              let value = row[header];
              let cellContent = { text: '', fontSize: fontSize };
              
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
              
              if (typeof cellContent.text === 'string' && cellContent.text.length > 30) {
                cellContent.text = cellContent.text.substring(0, 27) + '...';
              }
              
              return cellContent;
            });
            
            tableBody.push(cells);
          });
          
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
          else {
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

export default new ExportManager();