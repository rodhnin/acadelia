/**
 * Módulo para formatear datos para presentación
 */

/**
 * Formatea una fecha ISO a un formato legible
 * @param {string} dateString - Fecha en formato ISO
 * @param {boolean} [includeTime=true] - Si debe incluir la hora
 * @returns {string} Fecha formateada
 */
export function formatDateTime(dateString, includeTime = true) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.second = '2-digit';
        }
        
        return date.toLocaleDateString('es-ES', options);
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return dateString;
    }
}

/**
 * Calcula y formatea el tiempo restante
 * @param {number} seconds - Segundos restantes
 * @returns {string} Tiempo formateado
 */
export function formatTimeRemaining(seconds) {
    if (!seconds || seconds <= 0) return 'Expirado';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days} día${days !== 1 ? 's' : ''} ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hora${hours !== 1 ? 's' : ''} ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else {
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
}

/**
 * Formatea una dirección IP para mostrarla
 * @param {string} ip - Dirección IP
 * @returns {string} IP formateada
 */
export function formatIP(ip) {
    if (!ip) return '-';
    
    // Si es IPv6 abreviada
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }
    
    return ip;
}

/**
 * Aplica máscara a un correo electrónico para proteger privacidad
 * @param {string} email - Correo electrónico
 * @returns {string} Correo enmascarado
 */
export function maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return 'correo-inválido';
    }
    
    try {
        const [username, domain] = email.split('@');
        
        if (!username || !domain) {
            return 'formato-inválido';
        }
        
        const firstChar = username.charAt(0);
        const lastChar = username.length > 1 ? username.charAt(username.length - 1) : '';
        const maskedUsername = username.length <= 2 
            ? username 
            : `${firstChar}${'*'.repeat(username.length - 2)}${lastChar}`;
        
        const domainParts = domain.split('.');
        const tld = domainParts.pop(); // Extraer TLD (.com, .org, etc.)
        const domainName = domainParts.join('.');
        
        return `${maskedUsername}@${domainName}.${tld}`;
    } catch (error) {
        console.error('Error enmascarando email:', error);
        return 'error-máscara';
    }
}

/**
 * Trunca un texto largo y añade elipsis
 * @param {string} text - Texto a truncar
 * @param {number} [maxLength=30] - Longitud máxima
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength = 30) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Formatea un valor de severidad a texto legible
 * @param {string} severity - Valor de severidad
 * @returns {string} Texto formateado
 */
export function formatSeverity(severity) {
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
 * Obtiene la clase CSS de bootstrap según la severidad
 * @param {string} severity - Valor de severidad
 * @returns {string} Clase CSS
 */
export function getSeverityClass(severity) {
    const severityMap = {
        'critical': 'danger',
        'high': 'warning',
        'medium': 'warning',
        'low': 'info',
        'info': 'primary'
    };
    
    return severityMap[severity] || 'secondary';
}

/**
 * Formatea un objeto JSON para mostrar en HTML
 * @param {Object|string} jsonData - Datos JSON o string
 * @returns {string} HTML con el JSON formateado
 */
export function formatJsonToHtml(jsonData) {
    if (!jsonData) return '<em>No hay datos</em>';
    
    try {
        // Si es un string, intentar parsearlo
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        // Convertir a string formateado
        const formattedJson = JSON.stringify(data, null, 2)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            })
            .replace(/\n/g, '<br>')
            .replace(/\s{2}/g, '&nbsp;&nbsp;');
        
        return formattedJson;
    } catch (error) {
        console.error('Error formateando JSON:', error);
        
        // Si falla, mostrar como texto plano
        if (typeof jsonData === 'string') {
            return jsonData
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        } else {
            return JSON.stringify(jsonData);
        }
    }
}

/**
 * Formatea un valor numérico añadiendo separador de miles
 * @param {number} value - Valor numérico
 * @returns {string} Valor formateado
 */
export function formatNumber(value) {
    if (value === undefined || value === null) return '-';
    
    return new Intl.NumberFormat('es-ES').format(value);
}

/**
 * Convierte bytes a una unidad legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}