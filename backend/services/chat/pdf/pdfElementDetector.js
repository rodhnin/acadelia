import { PDFPathConfig } from './pdfConfig.js';

export const PDFElementDetector = {
  /**
   * Extrae imágenes de una página PDF
   * @param {Object} page - Página PDF.js
   * @param {number} pageNum - Número de página
   * @returns {Promise<Array>} - Lista de imágenes encontradas
   */
  async extractImagesFromPage(page, pageNum) {
    const images = [];

    try {
      // Método 1: A través de los operadores de renderizado
      console.log(`Extrayendo imágenes de página ${pageNum} usando operatorList...`);
      const operatorList = await page.getOperatorList();
      const imageOperatorSet = new Set([82, 83, 84, 85, 92, 642, 'Do', 'Tj', 'TJ']);

      for (let j = 0; j < operatorList.fnArray.length; j++) {
        const fnId = operatorList.fnArray[j];

        if (imageOperatorSet.has(fnId)) {
          const args = operatorList.argsArray[j];
          const image = {
            pageNum: pageNum,
            position: j,
            reference: `page_${pageNum}_op_${j}`,
            type: 'image',
            operator: fnId
          };
          images.push(image);
        }
      }

      // Método 2: A través de XObjects (más fiable para ciertos tipos de PDF)
      console.log(`Extrayendo imágenes de página ${pageNum} usando XObjects...`);
      try {
        const resources = await page.getOperatorList().then(() => page.commonObjs);
        if (resources && typeof resources.getAll === 'function') {
          const xObjects = resources.getAll();
          let xObjectCount = 0;

          for (const key in xObjects) {
            if (key.startsWith('img_') || key.startsWith('xobj_')) {
              xObjectCount++;
              images.push({
                pageNum: pageNum,
                reference: `page_${pageNum}_xobj_${key}`,
                type: 'image',
                source: 'xobject',
                key: key
              });
            }
          }
          console.log(`Encontrados ${xObjectCount} XObjects en página ${pageNum}`);
        }
      } catch (err) {
        console.log(`Error accediendo a XObjects en página ${pageNum}:`, err.message);
      }

      // Método 3: Análisis directo del contenido (para PDFs simples)
      try {
        const content = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        const potentialImages = [];
        const items = content.items;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Si un elemento tiene un área significativa pero poco o ningún texto,
          // podría ser una imagen o un contenedor de imagen
          if (item.width > viewport.width * 0.1 && item.height > viewport.height * 0.1) {
            if (!item.str || item.str.trim().length < 5) {
              potentialImages.push({
                pageNum: pageNum,
                reference: `page_${pageNum}_area_${i}`,
                type: 'image',
                source: 'content',
                position: { x: item.transform?.[4] || 0, y: item.transform?.[5] || 0 },
                width: item.width,
                height: item.height
              });
            }
          }
        }

        if (potentialImages.length > 0) {
          console.log(`Encontradas ${potentialImages.length} áreas potenciales de imagen en página ${pageNum}`);
          images.push(...potentialImages);
        }
      } catch (err) {
        console.log(`Error analizando contenido en página ${pageNum}:`, err.message);
      }
    } catch (err) {
      console.error(`Error extrayendo imágenes de página ${pageNum}:`, err);
    }

    return images;
  },

  /**
   * Detecta fórmulas matemáticas en una página PDF
   * @param {Object} page - Página PDF.js
   * @param {number} pageNum - Número de página
   * @returns {Promise<Array>} - Lista de fórmulas encontradas
   */
  async detectFormulas(page, pageNum) {
    try {
      const textContent = await page.getTextContent();
      const formulas = [];
      
      const text = textContent.items.map(item => item.str).join(' ');
      
      for (const pattern of PDFPathConfig.formulaPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(formula => {
            if (this.validateFormula(formula)) {
              formulas.push({
                pageNum: pageNum,
                content: formula,
                type: 'formula',
                detectionPattern: String(pattern)
              });
            }
          });
        }
      }
      
      textContent.items.forEach((item, index) => {
        if (item.str && (
            // Operadores matemáticos consecutivos
            /[+\-*/^=<>]+/.test(item.str) ||
            // Símbolos matemáticos especiales
            /[∑∫∂√πΔ∇∈∉∋∌∞∝∀∃∄∴∵∼≅≈≠≤≥⊂⊃⊆⊇⊕⊗⊥]/.test(item.str)
          )) {
          const context = this.getContextItems(textContent.items, index, 3);
          if (context && this.looksLikeFormulaContext(context)) {
            const formulaText = context.map(item => item.str).join('');
            formulas.push({
              pageNum: pageNum,
              content: formulaText,
              type: 'formula',
              detectionMethod: 'visual-context'
            });
          }
        }
      });
      
      return formulas;
    } catch (error) {
      console.error(`Error detectando fórmulas en página ${pageNum}:`, error);
      return [];
    }
  },

  /**
   * Valida si un texto es realmente una fórmula matemática
   * @param {string} formula - Texto candidato a fórmula
   * @returns {boolean} - true si parece una fórmula válida
   */
  validateFormula(formula) {
    if (formula.length < 3) return false;
    
    const hasMathSymbol = /[+\-*/^=<>≤≥±∑∫∂√πα-ωΑ-Ω]/.test(formula);
    
    const normalTextPattern = /^[a-zA-Z\s,.]+$/;
    const isJustText = normalTextPattern.test(formula);
    
    const isBalanced = this.checkBalancedSymbols(formula);
    
    return hasMathSymbol && !isJustText && isBalanced;
  },

  /**
   * Verifica el balance de símbolos de apertura y cierre en una fórmula
   * @param {string} text - Texto a verificar
   * @returns {boolean} - true si los símbolos están balanceados
   */
  checkBalancedSymbols(text) {
    const stack = [];
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '\\(': '\\)',
      '\\[': '\\]',
      '\\{': '\\}'
    };
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (text.substring(i, i + 2) === '\\(' || 
          text.substring(i, i + 2) === '\\[' || 
          text.substring(i, i + 2) === '\\{') {
        stack.push(text.substring(i, i + 2));
        i++; // Saltamos un caracter extra
        continue;
      }
      
      if (char === '(' || char === '[' || char === '{') {
        stack.push(char);
      } else if (text.substring(i, i + 2) === '\\)' || 
                text.substring(i, i + 2) === '\\]' || 
                text.substring(i, i + 2) === '\\}') {
        const last = stack.pop();
        const expected = Object.keys(pairs).find(key => pairs[key] === text.substring(i, i + 2));
        if (last !== expected) return false;
        i++; // Saltamos un caracter extra
      } else if (char === ')' || char === ']' || char === '}') {
        const last = stack.pop();
        const expected = Object.keys(pairs).find(key => pairs[key] === char);
        if (last !== expected) return false;
      }
    }
    
    return stack.length === 0; // Balanceado si la pila está vacía
  },

  /**
   * Obtiene elementos de contexto alrededor de un punto de interés
   * @param {Array} items - Lista de elementos
   * @param {number} currentIndex - Índice actual
   * @param {number} range - Rango de elementos a incluir
   * @returns {Array} - Elementos de contexto
   */
  getContextItems(items, currentIndex, range) {
    const start = Math.max(0, currentIndex - range);
    const end = Math.min(items.length - 1, currentIndex + range);
    return items.slice(start, end + 1);
  },

  /**
   * Verifica si un conjunto de elementos parece formar parte de una fórmula
   * @param {Array} items - Elementos a verificar
   * @returns {boolean} - true si parece contexto de fórmula
   */
  looksLikeFormulaContext(items) {
    const text = items.map(item => item.str).join('');
    
    const mathSymbolCount = (text.match(/[+\-*/^=<>≤≥±∑∫∂√πα-ωΑ-Ω]/g) || []).length;
    const density = mathSymbolCount / text.length;
    
    const hasEquality = /=/.test(text);
    const hasVariables = /[a-zA-Z][0-9]/.test(text) || /[a-zA-Z]_[0-9a-zA-Z]/.test(text);
    
    return (density > 0.15) || (hasEquality && hasVariables);
  },

  /**
   * Detecta tablas en una página PDF
   * @param {Object} page - Página PDF.js
   * @param {number} pageNum - Número de página
   * @param {number} pageWidth - Ancho de la página
   * @param {number} pageHeight - Alto de la página
   * @returns {Promise<Array>} - Lista de tablas encontradas
   */
  async detectTables(page, pageNum, pageWidth, pageHeight) {
    try {
      const textContent = await page.getTextContent();
      
      // Agrupar elementos de texto por líneas con mayor precisión
      const lines = this.groupTextItemsByLines(textContent.items, pageHeight);
      
      const tables = [];
      let tableStartIndex = -1;
      let inTable = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Si la línea actual parece una fila de tabla
        const isTableRow = this.looksLikeTableRow(line, pageWidth);
        
        if (isTableRow && !inTable) {
          // Inicio potencial de tabla
          tableStartIndex = i;
          inTable = true;
        } else if (!isTableRow && inTable) {
          // Fin de tabla
          if (i - tableStartIndex >= 2) { // Mínimo 2 filas para ser tabla
            const extractedTable = this.extractTable(lines, tableStartIndex, i - 1, pageWidth);
            if (extractedTable && this.isValidTable(extractedTable)) {
              tables.push({
                ...extractedTable,
                pageNum: pageNum,
                type: 'table'
              });
            }
          }
          inTable = false;
        }
      }
      
      if (inTable && tableStartIndex >= 0 && lines.length - tableStartIndex >= 2) {
        const extractedTable = this.extractTable(lines, tableStartIndex, lines.length - 1, pageWidth);
        if (extractedTable && this.isValidTable(extractedTable)) {
          tables.push({
            ...extractedTable,
            pageNum: pageNum,
            type: 'table'
          });
        }
      }
      
      return tables;
    } catch (error) {
      console.error(`Error detectando tablas en página ${pageNum}:`, error);
      return [];
    }
  },

  /**
   * Agrupa elementos de texto por líneas
   * @param {Array} items - Elementos de texto
   * @param {number} pageHeight - Alto de la página
   * @returns {Array} - Agrupación por líneas
   */
  groupTextItemsByLines(items, pageHeight) {
    if (!items || items.length === 0) return [];
    
    const sortedItems = [...items].sort((a, b) => {
      const yA = a.transform ? a.transform[5] : a.y;
      const yB = b.transform ? b.transform[5] : b.y;
      return yB - yA; // Ordenar de arriba a abajo
    });
    
    const lineHeights = [];
    for (let i = 1; i < sortedItems.length; i++) {
      const yPrev = sortedItems[i-1].transform ? sortedItems[i-1].transform[5] : sortedItems[i-1].y;
      const yCurr = sortedItems[i].transform ? sortedItems[i].transform[5] : sortedItems[i].y;
      const diff = Math.abs(yPrev - yCurr);
      if (diff > 0 && diff < pageHeight * 0.05) {
        lineHeights.push(diff);
      }
    }
    
    const avgLineHeight = lineHeights.length > 0 
      ? lineHeights.reduce((sum, h) => sum + h, 0) / lineHeights.length 
      : 12; // Valor predeterminado si no hay suficientes datos
    
    // Umbral como fracción de la altura de línea promedio
    const threshold = avgLineHeight * 0.6;
    
    // Agrupar elementos en líneas usando el umbral adaptativo
    const lines = [];
    let currentLine = [];
    let currentY = sortedItems[0].transform ? sortedItems[0].transform[5] : sortedItems[0].y;
    
    sortedItems.forEach(item => {
      const itemY = item.transform ? item.transform[5] : item.y;
      
      if (Math.abs(itemY - currentY) > threshold) {
        if (currentLine.length > 0) {
          currentLine.sort((a, b) => {
            const xA = a.transform ? a.transform[4] : a.x;
            const xB = b.transform ? b.transform[4] : b.x;
            return xA - xB;
          });
          lines.push(currentLine);
        }
        currentLine = [];
        currentY = itemY;
      }
      currentLine.push(item);
    });
    
    // No olvidar la última línea
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => {
        const xA = a.transform ? a.transform[4] : a.x;
        const xB = b.transform ? b.transform[4] : b.x;
        return xA - xB;
      });
      lines.push(currentLine);
    }
    
    return lines;
  },

  /**
   * Determina si una línea parece ser una fila de tabla
   * @param {Array} line - Línea de elementos de texto
   * @param {number} pageWidth - Ancho de la página
   * @returns {boolean} - true si la línea parece una fila de tabla
   */
  looksLikeTableRow(line, pageWidth) {
    if (!line || line.length < 2) return false;
    
    // Características de una fila de tabla
    const columnCount = line.length;
    const hasEnoughColumns = columnCount >= 3;
    const hasRegularSpacing = this.checkRegularSpacing(line);
    const coversMostOfPage = this.calculateLineWidth(line) > pageWidth * 0.5;
    const hasTabularContent = this.checkTabularContent(line);
    
    // Diferentes criterios para diferentes tipos de tablas
    if (hasEnoughColumns && hasRegularSpacing) return true;
    if (columnCount >= 2 && coversMostOfPage && hasTabularContent) return true;
    
    return false;
  },

  /**
   * Verifica si hay espaciado regular entre elementos (típico de tablas)
   * @param {Array} line - Línea de elementos de texto
   * @returns {boolean} - true si hay espaciado regular
   */
  checkRegularSpacing(line) {
    if (line.length < 3) return false;
    
    const spaces = [];
    for (let i = 1; i < line.length; i++) {
      const x1 = line[i-1].transform ? line[i-1].transform[4] + this.getItemWidth(line[i-1]) : line[i-1].x + line[i-1].width;
      const x2 = line[i].transform ? line[i].transform[4] : line[i].x;
      spaces.push(x2 - x1);
    }
    
    if (spaces.length === 0) return false;
    
    const avgSpace = spaces.reduce((sum, space) => sum + space, 0) / spaces.length;
    const variance = spaces.reduce((sum, space) => sum + Math.pow(space - avgSpace, 2), 0) / spaces.length;
    const stdDev = Math.sqrt(variance);
    
    // Coeficiente de variación (CV) - menor CV indica mayor regularidad
    const cv = stdDev / avgSpace;
    
    return cv < 0.5; // Umbral ajustable para CV
  },

  /**
   * Estima el ancho de un elemento de texto
   * @param {Object} item - Elemento de texto
   * @returns {number} - Ancho estimado
   */
  getItemWidth(item) {
    if (item.width !== undefined) return item.width;
    
    // Estimar ancho basado en el texto y un factor promedio
    return (item.str || '').length * 5; // 5 es un factor promedio para caracteres
  },

  /**
   * Calcula el ancho de una línea de texto
   * @param {Array} line - Línea de elementos de texto
   * @returns {number} - Ancho de la línea
   */
  calculateLineWidth(line) {
    if (line.length === 0) return 0;
    
    const firstX = line[0].transform ? line[0].transform[4] : line[0].x;
    const lastItem = line[line.length - 1];
    const lastX = lastItem.transform 
      ? lastItem.transform[4] + this.getItemWidth(lastItem) 
      : lastItem.x + lastItem.width;
    
    return lastX - firstX;
  },

  /**
   * Verifica si una línea contiene contenido tabular
   * @param {Array} line - Línea de elementos de texto
   * @returns {boolean} - true si parece contener datos tabulares
   */
  checkTabularContent(line) {
    const numericItems = line.filter(item => /^\s*[0-9]+([.,][0-9]+)?\s*$/.test(item.str));
    const hasNumericColumns = numericItems.length >= 2;
    
    const headerPattern = /^\s*(id|nombre|fecha|total|valor|precio|cantidad|descripción|description)\s*$/i;
    const hasHeaders = line.some(item => headerPattern.test(item.str));
    
    const alignedItems = this.countAlignedItems(line);
    const hasGoodAlignment = alignedItems / line.length > 0.7;
    
    return hasNumericColumns || hasHeaders || hasGoodAlignment;
  },

  /**
   * Cuenta elementos alineados de manera similar
   * @param {Array} line - Línea de elementos de texto
   * @returns {number} - Cantidad de elementos alineados
   */
  countAlignedItems(line) {
    if (line.length < 3) return 0;
    
    let alignedCount = 0;
    
    const rightAligned = line.filter(item => /^\s+\S+\s*$/.test(item.str)).length;
    
    const leftAligned = line.filter(item => /^\S+\s+$/.test(item.str)).length;
    
    const centered = line.filter(item => /^\s+\S+\s+$/.test(item.str)).length;
    
    alignedCount = Math.max(rightAligned, leftAligned, centered);
    return alignedCount;
  },

  /**
   * Extrae una tabla a partir de líneas de texto
   * @param {Array} lines - Líneas de texto agrupadas
   * @param {number} startIndex - Índice de inicio de la tabla
   * @param {number} endIndex - Índice de fin de la tabla
   * @param {number} pageWidth - Ancho de la página
   * @returns {Object} - Tabla extraída
   */
  extractTable(lines, startIndex, endIndex, pageWidth) {
    if (!lines || startIndex < 0 || endIndex >= lines.length || startIndex > endIndex) {
      return null;
    }
    
    const tableLines = lines.slice(startIndex, endIndex + 1);
    
    const maxColumns = Math.max(...tableLines.map(line => line.length));
    
    const columnBoundaries = this.detectColumnBoundaries(tableLines, pageWidth);
    
    const rows = tableLines.map(line => {
      const cells = new Array(columnBoundaries.length - 1).fill("");
      
      line.forEach(item => {
        const x = item.transform ? item.transform[4] : item.x;
        const width = this.getItemWidth(item);
        const itemEnd = x + width;
        
        // Encontrar a qué columna pertenece este elemento
        for (let i = 0; i < columnBoundaries.length - 1; i++) {
          const colStart = columnBoundaries[i];
          const colEnd = columnBoundaries[i + 1];
          
          // Si el centro del elemento está dentro de los límites de la columna
          const itemCenter = x + width / 2;
          if (itemCenter >= colStart && itemCenter < colEnd) {
            cells[i] += (cells[i] && item.str ? " " : "") + (item.str || "");
            break;
          }
        }
      });
      
      return cells.map(cell => cell.trim());
    });
    
    return {
      rows: rows,
      rowCount: rows.length,
      columnCount: columnBoundaries.length - 1
    };
  },

  /**
   * Detecta límites de columnas para una tabla
   * @param {Array} tableLines - Líneas que forman una tabla
   * @param {number} pageWidth - Ancho de la página
   * @returns {Array} - Posiciones de los límites de columnas
   */
  detectColumnBoundaries(tableLines, pageWidth) {
    // Recopilar todas las posiciones X de inicio y fin de los elementos
    const positions = [];
    
    tableLines.forEach(line => {
      line.forEach(item => {
        const x = item.transform ? item.transform[4] : item.x;
        const width = this.getItemWidth(item);
        positions.push(x);
        positions.push(x + width);
      });
    });
    
    positions.sort((a, b) => a - b);
    
    const uniquePositions = [0]; // Empezar desde el borde izquierdo
    let lastPosition = 0;
    
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] - lastPosition > 5) {
        uniquePositions.push(positions[i]);
        lastPosition = positions[i];
      }
    }
    
    if (!uniquePositions.includes(pageWidth)) {
      uniquePositions.push(pageWidth);
    }
    
    if (uniquePositions.length > 20) {
      return this.createHistogramBoundaries(positions, pageWidth);
    }
    
    return uniquePositions;
  },

  /**
   * Crea límites basados en histograma de posiciones
   * @param {Array} positions - Posiciones X
   * @param {number} pageWidth - Ancho de la página
   * @returns {Array} - Límites de columnas
   */
  createHistogramBoundaries(positions, pageWidth) {
    const binSize = pageWidth / 20; // 20 bins para la página completa
    const histogram = new Array(20).fill(0);
    
    positions.forEach(pos => {
      const binIndex = Math.floor(pos / binSize);
      if (binIndex >= 0 && binIndex < 20) {
        histogram[binIndex]++;
      }
    });
    
    const valleys = [];
    
    for (let i = 1; i < 19; i++) {
      if (histogram[i] < histogram[i-1] && histogram[i] < histogram[i+1]) {
        valleys.push(i);
      }
    }
    
    const boundaries = [0]; // Siempre empezar desde el borde izquierdo
    
    valleys.forEach(valley => {
      boundaries.push((valley + 0.5) * binSize); // Centro del bin
    });
    
    boundaries.push(pageWidth); // Siempre terminar en el borde derecho
    
    return boundaries;
  },

  /**
   * Valida si una tabla extraída es válida
   * @param {Object} table - Tabla extraída
   * @returns {boolean} - true si la tabla parece válida
   */
  isValidTable(table) {
    if (!table || !table.rows || table.rows.length < 2 || table.columnCount < 2) {
      return false;
    }
    
    const nonEmptyCells = table.rows.flat().filter(cell => cell && cell.trim() !== "").length;
    const totalCells = table.rowCount * table.columnCount;
    
    // Al menos 25% de las celdas deben tener contenido
    if (nonEmptyCells < totalCells * 0.25) {
      return false;
    }
    
    const expectedLength = table.columnCount;
    let consistentRows = 0;
    
    table.rows.forEach(row => {
      const nonEmptyInRow = row.filter(cell => cell && cell.trim() !== "").length;
      
      if (nonEmptyInRow >= expectedLength * 0.5) {
        consistentRows++;
      }
    });
    
    return consistentRows >= table.rowCount * 0.7;
  }
};

export default PDFElementDetector;