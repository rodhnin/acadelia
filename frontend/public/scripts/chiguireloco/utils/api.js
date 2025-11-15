/**
 * Módulo para gestionar llamadas a la API de seguridad
 */

/**
 * Obtiene el token CSRF de la cookie o meta tag
 * @returns {string} Token CSRF
 */
function getCsrfToken() {
    // Intenta obtener de la función global si existe
    if (window.csrfUtils && typeof window.csrfUtils.getToken === 'function') {
        return window.csrfUtils.getToken();
    }

    // Si no, intenta obtener de la cookie
    const csrfCookie = document.cookie.split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='));
    
    if (csrfCookie) {
        return decodeURIComponent(csrfCookie.split('=')[1]);
    }

    // Como último recurso, busca en la etiqueta meta
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    console.warn('No se pudo obtener token CSRF');
    return '';
}

/**
 * Realiza una petición fetch con las cabeceras necesarias
 * @param {string} url - URL de la petición
 * @param {Object} options - Opciones de fetch
 * @returns {Promise<Object>} Respuesta en formato JSON
 */
async function fetchWithCSRF(url, options = {}) {
    try {
        // Si existe csrfUtils, usarlo
        if (window.csrfUtils && typeof window.csrfUtils.fetch === 'function') {
            return window.csrfUtils.fetch(url, options)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error HTTP: ${response.status}`);
                    }
                    return response.json();
                });
        }

        // Si no, implementar manualmente
        const csrfToken = getCsrfToken();
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
        };
        
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
            defaultHeaders['X-CSRF-Token'] = csrfToken;
        }
        
        const fetchOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'include'
        };
        
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.error('Sesión expirada o token inválido');
                showNotification('Error', 'Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
            } else if (response.status === 403) {
                console.error('Acceso denegado. No tienes permisos suficientes.');
                showNotification('Error', 'No tienes permisos para realizar esta acción', 'error');
            }
            
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `Error HTTP: ${response.status}`;
            } catch (e) {
                errorMessage = `Error HTTP: ${response.status}`;
            }
            
            throw new Error(errorMessage);
        }
        
        return response.json();
    } catch (error) {
        console.error('Error en la petición:', error.message);
        // Re-lanzar el error para que pueda ser manejado por el llamador
        throw error;
    }
}

/**
 * API para obtener métricas de seguridad
 * @returns {Promise<Object>} Métricas de seguridad
 */
export async function getSecurityMetrics() {
    return fetchWithCSRF('/api/security/metrics');
}

/**
 * API para obtener eventos de seguridad con filtros
 * @param {Object} filters - Filtros a aplicar
 * @param {number} page - Número de página
 * @param {number} limit - Cantidad de elementos por página
 * @returns {Promise<Object>} Lista de eventos y datos de paginación
 */
export async function getSecurityEvents(filters = {}, page = 1, limit = 50) {
    const params = new URLSearchParams({
        page,
        limit
    });
    
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    
    return fetchWithCSRF(`/api/security/events?${params.toString()}`);
}

/**
 * API para obtener detalles de un evento
 * @param {number|string} eventId - ID del evento
 * @returns {Promise<Object>} Detalles del evento
 */
export async function getEventDetails(eventId) {
    return fetchWithCSRF(`/api/security/events/${eventId}`);
}

/**
 * API para obtener IPs bloqueadas
 * @returns {Promise<Array>} Lista de IPs bloqueadas
 */
export async function getBlockedIPs() {
    return fetchWithCSRF('/api/security/blocked-ips');
}

/**
 * API para bloquear una IP
 * @param {string} ip - Dirección IP
 * @param {string} reason - Razón del bloqueo
 * @param {number} duration - Duración en minutos
 * @returns {Promise<Object>} Resultado del bloqueo
 */
export async function blockIP(ip, reason, duration = 60) {
    return fetchWithCSRF('/api/security/block-ip', {
        method: 'POST',
        body: JSON.stringify({
            ip,
            reason,
            duration: duration * 60 // Convertir a segundos
        })
    });
}

/**
 * API para desbloquear una IP
 * @param {string} ip - Dirección IP
 * @returns {Promise<Object>} Resultado del desbloqueo
 */
export async function unblockIP(ip) {
    return fetchWithCSRF(`/api/security/unblock-ip/${ip}`, {
        method: 'DELETE'
    });
}

/**
 * API para desbloquear todas las IPs
 * @returns {Promise<Object>} Resultado del desbloqueo
 */
export async function unblockAllIPs() {
    return fetchWithCSRF('/api/security/unblock-ip/all', {
        method: 'DELETE'
    });
}

/**
 * API para obtener intentos de login fallidos
 * @returns {Promise<Array>} Lista de intentos de login fallidos
 */
export async function getFailedLoginAttempts() {
    return fetchWithCSRF('/api/security/failed-logins');
}

/**
 * API para obtener actividad sospechosa
 * @returns {Promise<Object>} Actividad sospechosa
 */
export async function getSuspiciousActivity() {
    return fetchWithCSRF('/api/security/suspicious-activity');
}

/**
 * API para obtener información de seguridad de un usuario
 * @param {string|number} userId - ID del usuario
 * @returns {Promise<Object>} Información de seguridad del usuario
 */
export async function getUserSecurityInfo(userId) {
    return fetchWithCSRF(`/api/security/user/${userId}`);
}

/**
 * API para revocar tokens de un usuario
 * @param {string|number} userId - ID del usuario
 * @param {string} reason - Razón de la revocación
 * @param {boolean} revokeAll - Si debe revocar todas las sesiones
 * @returns {Promise<Object>} Resultado de la revocación
 */
export async function revokeUserTokens(userId, reason, revokeAll = true) {
    return fetchWithCSRF('/api/security/revoke-tokens', {
        method: 'POST',
        body: JSON.stringify({
            userId,
            reason,
            keepCurrentSession: !revokeAll
        })
    });
}

/**
 * API para reiniciar contadores de seguridad
 * @returns {Promise<Object>} Resultado del reinicio
 */
export async function resetSecurityCounters() {
    return fetchWithCSRF('/api/security/reset-counters', {
        method: 'POST'
    });
}

/**
 * API para obtener configuración de seguridad
 * @returns {Promise<Object>} Configuración de seguridad
 */
export async function getSecurityConfig() {
    return fetchWithCSRF('/api/security/config');
}

/**
 * API para guardar configuración de seguridad
 * @param {Object} config - Objeto de configuración
 * @returns {Promise<Object>} Resultado del guardado
 */
export async function saveSecurityConfig(config) {
    return fetchWithCSRF('/api/security/config', {
        method: 'POST',
        body: JSON.stringify(config)
    });
}

/**
 * API para ejecutar la limpieza de seguridad
 * @returns {Promise<Object>} Resultado de la limpieza
 */
export async function runSecurityCleanup() {
    return fetchWithCSRF('/api/admin/run-security-cleanup', {
        method: 'POST'
    });
}

/**
 * API para ejecutar diagnóstico de seguridad
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
export async function runSecurityDiagnostic() {
    return fetchWithCSRF('/api/security/diagnostic', {
        method: 'POST'
    });
}

/**
 * API para obtener registros de seguridad
 * @param {string} type - Tipo de log (security, error, combined)
 * @param {number} lines - Número de líneas
 * @returns {Promise<Object>} Contenido del log
 */
export async function getSecurityLogs(type = 'security', lines = 100) {
    return fetchWithCSRF(`/api/security/logs?type=${type}&lines=${lines}`);
}

/**
 * API para obtener estadísticas de colas
 * @returns {Promise<Object>} Estadísticas de colas
 */
export async function getQueueStats() {
    try {
        // En producción, se debería usar una ruta adecuada
        const response = await fetchWithCSRF('/api/test-queues/stats');
        return response;
    } catch (error) {
        console.error('Error al obtener estadísticas de colas:', error);
        throw new Error('Error al obtener estadísticas de colas');
    }
}

/**
 * API para limpiar una cola específica
 * @param {string} queueType - Tipo de cola a limpiar
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function cleanQueue(queueType) {
    try {
        const response = await fetchWithCSRF(`/api/test-queues/clean/${queueType}`, {
            method: 'POST'
        });
        return response;
    } catch (error) {
        console.error('Error al limpiar cola:', error);
        throw new Error('Error al limpiar cola');
    }
}

/**
 * API para exportar eventos de seguridad
 * @param {Object} filters - Filtros a aplicar
 * @param {string} format - Formato de exportación (csv, json, excel)
 * @returns {Promise<Blob>} Blob con los datos exportados
 */
export async function exportSecurityEvents(filters = {}, format = 'csv') {
    const params = new URLSearchParams({
        format
    });
    
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    
    const csrfToken = getCsrfToken();
    
    return fetch(`/api/security/export-events?${params.toString()}`, {
        method: 'GET',
        headers: {
            'X-CSRF-Token': csrfToken
        },
        credentials: 'include'
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.blob();
    });
}

/**
 * API para generar informe de seguridad
 * @param {Object} options - Opciones del informe
 * @returns {Promise<Blob>} Blob con el informe
 */
export async function generateSecurityReport(options) {
    const csrfToken = getCsrfToken();
    
    return fetch('/api/security/generate-report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(options),
        credentials: 'include'
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.blob();
    });
}

/**
 * Helper para descargar un blob como archivo
 * @param {Blob} blob - Blob a descargar
 * @param {string} filename - Nombre del archivo
 */
export function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, 100);
}

/**
 * Helper para mostrar notificaciones
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 */
function showNotification(title, message, type = 'info') {
    // Si existe un sistema de notificaciones global, usarlo
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(title, message, type);
        return;
    }
    
    // Si no hay sistema de notificaciones pero hay un elemento toast, usarlo
    const toast = document.getElementById('security-toast');
    if (toast) {
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        const toastTime = document.getElementById('toast-time');
        
        if (toastTitle) toastTitle.textContent = title;
        if (toastMessage) toastMessage.textContent = message;
        if (toastTime) toastTime.textContent = 'ahora';
        
        toast.className = toast.className.replace(/bg-\w+/g, '');
        
        switch (type) {
            case 'success':
                toast.classList.add('bg-success');
                break;
            case 'error':
                toast.classList.add('bg-danger');
                break;
            case 'warning':
                toast.classList.add('bg-warning');
                break;
            default:
                toast.classList.add('bg-info');
        }
        
        if (window.bootstrap && typeof bootstrap.Toast === 'function') {
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        } else {
            // Alternativa manual si Bootstrap no está disponible
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 5000);
        }
    } else {
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
}