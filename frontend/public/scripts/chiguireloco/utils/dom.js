/**
 * Módulo con utilidades para manipulación del DOM
 */

/**
 * Crea un elemento HTML con atributos y contenido
 * @param {string} tag - Etiqueta HTML
 * @param {Object} [attrs={}] - Atributos del elemento
 * @param {string|HTMLElement|Array<HTMLElement>} [content] - Contenido del elemento
 * @returns {HTMLElement} Elemento creado
 */
export function createElement(tag, attrs = {}, content) {
    const element = document.createElement(tag);
    
    // Establecer atributos
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else {
            element.setAttribute(key, value);
        }
    }
    
    // Añadir contenido
    if (content !== undefined) {
        if (typeof content === 'string') {
            element.innerText = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        }
    }
    
    return element;
}

/**
 * Vacía un elemento HTML
 * @param {HTMLElement|string} element - Elemento o ID del elemento
 */
export function clearElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }
}

/**
 * Crea una fila de tabla con celdas
 * @param {Array<string|Object>} cells - Contenido de las celdas o objetos con configuración
 * @param {Object} [options={}] - Opciones adicionales para la fila
 * @returns {HTMLTableRowElement} Fila de tabla creada
 */
export function createTableRow(cells, options = {}) {
    const row = document.createElement('tr');
    
    // Aplicar opciones a la fila
    if (options.className) {
        row.className = options.className;
    }
    
    if (options.id) {
        row.id = options.id;
    }
    
    if (options.onClick) {
        row.addEventListener('click', options.onClick);
    }
    
    // Crear celdas
    cells.forEach(cell => {
        let td;
        
        if (typeof cell === 'object' && cell !== null) {
            // Configuración avanzada de celda
            td = document.createElement('td');
            
            if (cell.className) {
                td.className = cell.className;
            }
            
            if (cell.colspan) {
                td.setAttribute('colspan', cell.colspan);
            }
            
            if (cell.rowspan) {
                td.setAttribute('rowspan', cell.rowspan);
            }
            
            if (cell.style) {
                Object.assign(td.style, cell.style);
            }
            
            if (cell.html) {
                td.innerHTML = cell.html;
            } else if (cell.text) {
                td.textContent = cell.text;
            } else if (cell.element) {
                td.appendChild(cell.element);
            }
        } else {
            // Contenido simple
            td = document.createElement('td');
            td.textContent = cell !== undefined && cell !== null ? cell.toString() : '';
        }
        
        row.appendChild(td);
    });
    
    return row;
}

/**
 * Crea un badge para severidad
 * @param {string} severity - Nivel de severidad
 * @returns {HTMLElement} Elemento badge
 */
export function createSeverityBadge(severity) {
    const badge = document.createElement('span');
    badge.className = `badge badge-severity severity-${severity}`;
    badge.textContent = formatSeverity(severity);
    return badge;
}

/**
 * Formatea un valor de severidad
 * @param {string} severity - Valor de severidad
 * @returns {string} Texto formateado
 */
function formatSeverity(severity) {
    const severityMap = {
        'critical': 'Crítico',
        'high': 'Alto',
        'medium': 'Medio',
        'low': 'Bajo',
        'info': 'Info'
    };
    
    return severityMap[severity] || severity;
}

/**
 * Crea un botón con ícono
 * @param {string} icon - Clase de ícono (Bootstrap Icons)
 * @param {Function} onClick - Función de click
 * @param {string} [tooltip] - Texto del tooltip
 * @param {string} [className='btn-sm btn-outline-primary'] - Clases adicionales
 * @returns {HTMLButtonElement} Botón creado
 */
export function createIconButton(icon, onClick, tooltip, className = 'btn-sm btn-outline-primary') {
    const button = document.createElement('button');
    button.className = `btn ${className}`;
    button.innerHTML = `<i class="bi bi-${icon}"></i>`;
    
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    
    if (tooltip) {
        button.setAttribute('title', tooltip);
        
        // Inicializar tooltip si Bootstrap está disponible
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            new bootstrap.Tooltip(button);
        }
    }
    
    return button;
}

/**
 * Crea un elemento de paginación
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 * @param {Function} onPageChange - Función al cambiar de página
 * @returns {HTMLElement} Elemento de paginación
 */
export function createPagination(currentPage, totalPages, onPageChange) {
    // Crear contenedor
    const pagination = document.createElement('ul');
    pagination.className = 'pagination pagination-sm';
    
    // Añadir botón de anterior
    const prevBtn = document.createElement('li');
    prevBtn.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo;';
    
    if (currentPage > 1) {
        prevLink.addEventListener('click', e => {
            e.preventDefault();
            onPageChange(currentPage - 1);
        });
    }
    
    prevBtn.appendChild(prevLink);
    pagination.appendChild(prevBtn);
    
    // Determinar rango de páginas a mostrar
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Ajustar startPage si endPage está limitado
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // Añadir botones de página
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('li');
        pageBtn.className = `page-item ${i === currentPage ? 'active' : ''}`;
        
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        
        if (i !== currentPage) {
            pageLink.addEventListener('click', e => {
                e.preventDefault();
                onPageChange(i);
            });
        }
        
        pageBtn.appendChild(pageLink);
        pagination.appendChild(pageBtn);
    }
    
    // Añadir botón de siguiente
    const nextBtn = document.createElement('li');
    nextBtn.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '&raquo;';
    
    if (currentPage < totalPages) {
        nextLink.addEventListener('click', e => {
            e.preventDefault();
            onPageChange(currentPage + 1);
        });
    }
    
    nextBtn.appendChild(nextLink);
    pagination.appendChild(nextBtn);
    
    return pagination;
}

/**
 * Inicializa tooltips en un contenedor
 * @param {HTMLElement|string} container - Contenedor o ID del contenedor
 */
export function initTooltips(container) {
    if (typeof bootstrap === 'undefined' || !bootstrap.Tooltip) {
        console.warn('Bootstrap no está disponible para inicializar tooltips');
        return;
    }
    
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    
    if (el) {
        const tooltips = el.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }
}

/**
 * Actualiza la información de paginación
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 * @param {number} itemCount - Cantidad de elementos
 * @param {number} perPage - Elementos por página
 */
export function updatePaginationInfo(currentPage, totalPages, itemCount, perPage) {
    const showingElement = document.getElementById('showing-events');
    const totalElement = document.getElementById('total-events');
    
    if (showingElement) {
        const start = (currentPage - 1) * perPage + 1;
        const end = Math.min(currentPage * perPage, itemCount);
        showingElement.textContent = `${start}-${end}`;
    }
    
    if (totalElement) {
        totalElement.textContent = itemCount;
    }
    
    // Actualizar botones de paginación
    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }
    
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }
}

/**
 * Crea una alerta Bootstrap
 * @param {string} message - Mensaje de la alerta
 * @param {string} [type='info'] - Tipo de alerta (success, danger, warning, info)
 * @param {boolean} [dismissible=true] - Si la alerta puede cerrarse
 * @returns {HTMLElement} Elemento de alerta
 */
export function createAlert(message, type = 'info', dismissible = true) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} ${dismissible ? 'alert-dismissible fade show' : ''}`;
    alert.role = 'alert';
    
    alert.innerHTML = message;
    
    if (dismissible) {
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        
        alert.appendChild(closeButton);
    }
    
    return alert;
}

/**
 * Añade un spinner de carga
 * @param {HTMLElement|string} container - Contenedor o ID del contenedor
 * @param {string} [size=''] - Tamaño del spinner (sm, lg)
 * @param {string} [color='primary'] - Color del spinner
 * @returns {HTMLElement} Elemento spinner
 */
export function addSpinner(container, size = '', color = 'primary') {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    
    if (!el) return null;
    
    // Limpiar contenedor
    clearElement(el);
    
    // Crear spinner
    const spinner = document.createElement('div');
    spinner.className = `spinner-border text-${color} ${size ? `spinner-border-${size}` : ''}`;
    spinner.setAttribute('role', 'status');
    
    const span = document.createElement('span');
    span.className = 'visually-hidden';
    span.textContent = 'Cargando...';
    
    spinner.appendChild(span);
    el.appendChild(spinner);
    
    return spinner;
}

/**
 * Descarga un archivo a partir de un blob
 * @param {Blob} blob - Blob con el contenido del archivo
 * @param {string} filename - Nombre del archivo
 */
export function downloadBlob(blob, filename) {
    // Crear URL para el blob
    const url = URL.createObjectURL(blob);
    
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Añadir temporalmente al documento
    document.body.appendChild(link);
    
    // Simular clic
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}