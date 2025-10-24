/**
 * Módulo para la sección de configuración de seguridad
 */

import { getSecurityConfig, saveSecurityConfig } from '../utils/api.js';
import { showNotification } from '../utils/notifications.js';
import { createTableRow } from '../utils/dom.js';

const configuration = {
    /**
     * Estado del módulo
     */
    state: {
        config: null,
        originalConfig: null,
        isLoading: false,
        isDirty: false
    },

    /**
     * Inicializa el módulo de configuración
     */
    async init() {
        try {
            // Mostrar indicador de carga
            this.state.isLoading = true;
            this.showLoading(true);
            
            // Cargar configuración actual
            await this.loadConfiguration();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Ocultar indicador de carga
            this.state.isLoading = false;
            this.showLoading(false);
        } catch (error) {
            console.error('Error inicializando módulo de configuración:', error);
            showNotification('Error', 'No se pudo inicializar el módulo de configuración', 'error');
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Formulario de configuración
        const configForm = document.getElementById('security-config-form');
        if (configForm) {
            configForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }
        
        // Botón de resetear configuración
        const resetBtn = document.getElementById('reset-config-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetConfiguration.bind(this));
        }
        
        // Botón de generar clave de emergencia
        const generateKeyBtn = document.getElementById('generate-key-btn');
        if (generateKeyBtn) {
            generateKeyBtn.addEventListener('click', this.generateEmergencyKey.bind(this));
        }
        
        // Botón de añadir IP a lista blanca
        const addWhitelistBtn = document.getElementById('add-whitelist-ip');
        if (addWhitelistBtn) {
            addWhitelistBtn.addEventListener('click', this.addWhitelistIP.bind(this));
        }
        
        // Detectar cambios en los campos para marcar el formulario como modificado
        const formInputs = document.querySelectorAll('#security-config-form input, #security-config-form select');
        formInputs.forEach(input => {
            input.addEventListener('change', this.handleFormChange.bind(this));
        });
    },

    /**
     * Manejador para el evento submit del formulario
     * @param {Event} e - Evento de submit
     */
    handleFormSubmit(e) {
        e.preventDefault();
        this.saveConfiguration();
    },

    /**
     * Manejador para cambios en el formulario
     */
    handleFormChange() {
        this.state.isDirty = true;
    },

    /**
     * Carga la configuración actual
     */
    async loadConfiguration() {
        try {
            // Obtener configuración del backend usando la API real
            const config = await getSecurityConfig();
            
            // Verificar si la respuesta es válida
            if (!config) {
                throw new Error('No se pudo obtener la configuración del servidor');
            }
            
            // Normalizar la estructura si es necesario
            const normalizedConfig = this.normalizeConfigStructure(config);
            
            // Actualizar estado
            this.state.config = normalizedConfig;
            this.state.originalConfig = JSON.parse(JSON.stringify(normalizedConfig)); // Copia profunda
            
            // Actualizar formulario
            this.updateConfigForm(normalizedConfig);
            
            // Actualizar lista blanca
            this.renderWhitelistIPs(normalizedConfig.whitelistIPs);
        } catch (error) {
            console.error('Error cargando configuración:', error);
            showNotification('Error', `No se pudo cargar la configuración: ${error.message}`, 'error');
            
            // Intentar cargar valores predeterminados
            this.loadDefaultConfig();
        }
    },

    /**
     * Normaliza la estructura de configuración recibida de la API
     * @param {Object} config - Configuración recibida de la API
     * @returns {Object} Configuración normalizada
     */
    normalizeConfigStructure(config) {
        // Crea una estructura básica con valores predeterminados
        const defaultStructure = this.getDefaultConfig();
        
        // Si la configuración está vacía, devolver la estructura predeterminada
        if (!config) return defaultStructure;
        
        // Asegurarse de que existen todas las secciones principales
        const normalized = {
            thresholds: {
                failedLogins: config.thresholds?.failedLogins || defaultStructure.thresholds.failedLogins,
                apiRequests: config.thresholds?.apiRequests || defaultStructure.thresholds.apiRequests,
                suspiciousActivities: config.thresholds?.suspiciousActivities || defaultStructure.thresholds.suspiciousActivities
            },
            blockDurations: {
                default: config.blockDurations?.default || defaultStructure.blockDurations.default,
                bruteForce: config.blockDurations?.bruteForce || defaultStructure.blockDurations.bruteForce,
                manual: config.blockDurations?.manual || defaultStructure.blockDurations.manual
            },
            retention: {
                archiveEventsDays: config.retention?.archiveEvents || config.retention?.archiveEventsDays || defaultStructure.retention.archiveEventsDays,
                deleteEventsDays: config.retention?.deleteEvents || config.retention?.deleteEventsDays || defaultStructure.retention.deleteEventsDays,
                deleteLoginsDays: config.retention?.deleteLogins || config.retention?.deleteLoginsDays || defaultStructure.retention.deleteLoginsDays
            },
            advanced: {
                enableGeolocation: config.advanced?.enableGeolocation !== undefined ? config.advanced.enableGeolocation : defaultStructure.advanced.enableGeolocation,
                enableAutoBlock: config.advanced?.enableAutoBlock !== undefined ? config.advanced.enableAutoBlock : defaultStructure.advanced.enableAutoBlock,
                emergencyUnblockKey: config.advanced?.emergencyUnblockKey || defaultStructure.advanced.emergencyUnblockKey
            },
            whitelistIPs: Array.isArray(config.whitelistIPs) ? config.whitelistIPs : defaultStructure.whitelistIPs
        };
        
        // Asegurarse de que cada IP en la lista blanca tenga los campos necesarios
        normalized.whitelistIPs = normalized.whitelistIPs.map(ip => {
            if (typeof ip === 'string') {
                // Si es solo una cadena, convertirla a objeto
                return {
                    ip: ip,
                    description: 'Importado automáticamente',
                    addedAt: new Date().toISOString()
                };
            } else if (typeof ip === 'object') {
                return {
                    ip: ip.ip || 'Desconocida',
                    description: ip.description || '',
                    addedAt: ip.addedAt || new Date().toISOString()
                };
            }
            return ip;
        });
        
        return normalized;
    },

    /**
     * Carga la configuración predeterminada
     */
    loadDefaultConfig() {
        // Configuración predeterminada
        const defaultConfig = this.getDefaultConfig();
        
        // Actualizar estado
        this.state.config = defaultConfig;
        this.state.originalConfig = JSON.parse(JSON.stringify(defaultConfig)); // Copia profunda
        
        // Actualizar formulario
        this.updateConfigForm(defaultConfig);
        
        // Actualizar lista blanca
        this.renderWhitelistIPs(defaultConfig.whitelistIPs);
        
        // Mostrar notificación
        showNotification('Advertencia', 'Se ha cargado la configuración predeterminada', 'warning');
    },

    /**
     * Devuelve la configuración predeterminada
     * @returns {Object} Configuración predeterminada
     */
    getDefaultConfig() {
        return {
            thresholds: {
                failedLogins: 5,
                apiRequests: 100,
                suspiciousActivities: 3
            },
            blockDurations: {
                default: 60,
                bruteForce: 30,
                manual: 60
            },
            retention: {
                archiveEventsDays: 90,
                deleteEventsDays: 365,
                deleteLoginsDays: 30
            },
            advanced: {
                enableGeolocation: true,
                enableAutoBlock: true,
                emergencyUnblockKey: ''
            },
            whitelistIPs: [
                {
                    ip: '127.0.0.1',
                    description: 'Localhost',
                    addedAt: '2025-01-01T00:00:00Z'
                },
                {
                    ip: '::1',
                    description: 'Localhost IPv6',
                    addedAt: '2025-01-01T00:00:00Z'
                }
            ]
        };
    },

    /**
     * Actualiza el formulario con los valores de configuración
     * @param {Object} config - Configuración de seguridad
     */
    updateConfigForm(config) {
        // Asegurar que existe una configuración válida
        if (!config) return;
        
        // Umbrales
        const failedLoginThreshold = document.getElementById('failed-login-threshold');
        const apiRequestsThreshold = document.getElementById('api-requests-threshold');
        const suspiciousActivityThreshold = document.getElementById('suspicious-activity-threshold');
        
        if (failedLoginThreshold) failedLoginThreshold.value = config.thresholds.failedLogins;
        if (apiRequestsThreshold) apiRequestsThreshold.value = config.thresholds.apiRequests;
        if (suspiciousActivityThreshold) suspiciousActivityThreshold.value = config.thresholds.suspiciousActivities;
        
        // Tiempos de bloqueo
        const defaultBlockDuration = document.getElementById('default-block-duration');
        const bruteForceBlockDuration = document.getElementById('brute-force-block-duration');
        const manualBlockDuration = document.getElementById('manual-block-duration');
        
        if (defaultBlockDuration) defaultBlockDuration.value = config.blockDurations.default;
        if (bruteForceBlockDuration) bruteForceBlockDuration.value = config.blockDurations.bruteForce;
        if (manualBlockDuration) manualBlockDuration.value = config.blockDurations.manual;
        
        // Políticas de retención
        const archiveEventsDays = document.getElementById('archive-events-days');
        const deleteEventsDays = document.getElementById('delete-events-days');
        const deleteLoginsDays = document.getElementById('delete-logins-days');
        
        if (archiveEventsDays) archiveEventsDays.value = config.retention.archiveEventsDays;
        if (deleteEventsDays) deleteEventsDays.value = config.retention.deleteEventsDays;
        if (deleteLoginsDays) deleteLoginsDays.value = config.retention.deleteLoginsDays;
        
        // Configuración avanzada
        const enableGeolocation = document.getElementById('enable-geolocation');
        const enableAutoBlock = document.getElementById('enable-auto-block');
        const emergencyUnblockKey = document.getElementById('emergency-unblock-key');
        
        if (enableGeolocation) enableGeolocation.checked = config.advanced.enableGeolocation;
        if (enableAutoBlock) enableAutoBlock.checked = config.advanced.enableAutoBlock;
        if (emergencyUnblockKey) emergencyUnblockKey.value = config.advanced.emergencyUnblockKey;
        
        // Actualizar también los valores en el modal de confirmación de limpieza
        const archiveDaysElem = document.getElementById('archive-days');
        const deleteDaysElem = document.getElementById('delete-days');
        const loginDaysElem = document.getElementById('login-days');
        
        if (archiveDaysElem) archiveDaysElem.textContent = config.retention.archiveEventsDays;
        if (deleteDaysElem) deleteDaysElem.textContent = config.retention.deleteEventsDays;
        if (loginDaysElem) loginDaysElem.textContent = config.retention.deleteLoginsDays;
    },

    /**
     * Renderiza la tabla de IPs en lista blanca
     * @param {Array} whitelistIPs - Lista de IPs en lista blanca
     */
    renderWhitelistIPs(whitelistIPs) {
        const tableBody = document.getElementById('whitelist-ips-table');
        if (!tableBody) return;
        
        // Limpiar tabla
        tableBody.innerHTML = '';
        
        // Si no hay IPs, mostrar mensaje
        if (!whitelistIPs || whitelistIPs.length === 0) {
            const emptyRow = createTableRow([
                { colspan: 4, className: 'text-center', text: 'No hay IPs en la lista blanca' }
            ]);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        // Añadir filas para cada IP
        whitelistIPs.forEach((ip, index) => {
            // Determinar si es fija (localhost) o editable
            const isFixed = index < 2 && (ip.ip === '127.0.0.1' || ip.ip === '::1' || ip.ip === 'localhost');
            
            const row = createTableRow([
                { text: ip.ip, className: 'text-nowrap' },
                { text: ip.description || '', className: 'text-wrap' },
                { 
                    text: ip.addedAt ? new Date(ip.addedAt).toLocaleDateString() : 'Desconocida', 
                    className: 'text-nowrap' 
                },
                { 
                    html: isFixed ? 
                        '<button class="btn btn-sm btn-danger disabled"><i class="bi bi-trash"></i></button>' :
                        `<button class="btn btn-sm btn-danger remove-whitelist-ip" data-index="${index}">
                            <i class="bi bi-trash"></i>
                        </button>`,
                    className: 'text-center'
                }
            ]);
            
            tableBody.appendChild(row);
            
            // Añadir event listener al botón de eliminar (solo si no es fija)
            if (!isFixed) {
                const removeBtn = row.querySelector('.remove-whitelist-ip');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => this.removeWhitelistIP(index));
                }
            }
        });
    },

    /**
     * Guarda la configuración
     */
    async saveConfiguration() {
        try {
            // Verificar si hay cambios
            if (!this.state.isDirty) {
                showNotification('Info', 'No hay cambios que guardar', 'info');
                return;
            }
            
            // Validar formulario
            if (!this.validateConfigForm()) {
                return;
            }
            
            // Mostrar indicador de carga
            this.state.isLoading = true;
            this.showLoading(true);
            
            // Recopilar valores del formulario
            const config = this.getFormValues();
            
            // Guardar configuración usando la API real
            const result = await saveSecurityConfig(config);
            
            // Verificar resultado
            if (!result || !result.success) {
                throw new Error(result?.error || 'Error desconocido al guardar la configuración');
            }
            
            // Actualizar estado con la configuración guardada (por si el servidor la modificó)
            this.state.config = result.config || config;
            this.state.originalConfig = JSON.parse(JSON.stringify(this.state.config)); // Copia profunda
            this.state.isDirty = false;
            
            // Actualizar interfaz
            this.updateConfigForm(this.state.config);
            
            // Ocultar indicador de carga
            this.state.isLoading = false;
            this.showLoading(false);
            
            // Mostrar notificación
            showNotification('Éxito', 'Configuración guardada correctamente', 'success');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            showNotification('Error', `No se pudo guardar la configuración: ${error.message || 'Error desconocido'}`, 'error');
            this.state.isLoading = false;
            this.showLoading(false);
        }
    },

    /**
     * Valida el formulario de configuración
     * @returns {boolean} Si el formulario es válido
     */
    validateConfigForm() {
        // Validar umbrales positivos
        const failedLoginThreshold = parseInt(document.getElementById('failed-login-threshold').value);
        const apiRequestsThreshold = parseInt(document.getElementById('api-requests-threshold').value);
        const suspiciousActivityThreshold = parseInt(document.getElementById('suspicious-activity-threshold').value);
        
        if (isNaN(failedLoginThreshold) || failedLoginThreshold < 1) {
            showNotification('Error', 'El umbral de intentos de login fallidos debe ser un número positivo', 'error');
            return false;
        }
        
        if (isNaN(apiRequestsThreshold) || apiRequestsThreshold < 10) {
            showNotification('Error', 'El umbral de solicitudes API debe ser al menos 10', 'error');
            return false;
        }
        
        if (isNaN(suspiciousActivityThreshold) || suspiciousActivityThreshold < 1) {
            showNotification('Error', 'El umbral de actividades sospechosas debe ser un número positivo', 'error');
            return false;
        }
        
        // Validar duraciones de bloqueo
        const defaultBlockDuration = parseInt(document.getElementById('default-block-duration').value);
        const bruteForceBlockDuration = parseInt(document.getElementById('brute-force-block-duration').value);
        const manualBlockDuration = parseInt(document.getElementById('manual-block-duration').value);
        
        if (isNaN(defaultBlockDuration) || defaultBlockDuration < 5) {
            showNotification('Error', 'La duración de bloqueo por defecto debe ser al menos 5 minutos', 'error');
            return false;
        }
        
        if (isNaN(bruteForceBlockDuration) || bruteForceBlockDuration < 5) {
            showNotification('Error', 'La duración de bloqueo por fuerza bruta debe ser al menos 5 minutos', 'error');
            return false;
        }
        
        if (isNaN(manualBlockDuration) || manualBlockDuration < 5) {
            showNotification('Error', 'La duración de bloqueo manual debe ser al menos 5 minutos', 'error');
            return false;
        }
        
        // Validar períodos de retención
        const archiveEventsDays = parseInt(document.getElementById('archive-events-days').value);
        const deleteEventsDays = parseInt(document.getElementById('delete-events-days').value);
        const deleteLoginsDays = parseInt(document.getElementById('delete-logins-days').value);
        
        if (isNaN(archiveEventsDays) || archiveEventsDays < 7) {
            showNotification('Error', 'El período de archivado debe ser al menos 7 días', 'error');
            return false;
        }
        
        if (isNaN(deleteEventsDays) || deleteEventsDays < 30) {
            showNotification('Error', 'El período de eliminación de eventos debe ser al menos 30 días', 'error');
            return false;
        }
        
        if (isNaN(deleteLoginsDays) || deleteLoginsDays < 7) {
            showNotification('Error', 'El período de eliminación de logins debe ser al menos 7 días', 'error');
            return false;
        }
        
        if (deleteEventsDays <= archiveEventsDays) {
            showNotification('Error', 'El período de eliminación debe ser mayor que el de archivado', 'error');
            return false;
        }
        
        // Validar clave de emergencia si está presente
        const emergencyUnblockKey = document.getElementById('emergency-unblock-key').value;
        if (emergencyUnblockKey && emergencyUnblockKey.length < 8) {
            showNotification('Error', 'La clave de desbloqueo debe tener al menos 8 caracteres', 'error');
            return false;
        }
        
        return true;
    },

    /**
     * Obtiene los valores del formulario
     * @returns {Object} Configuración del formulario
     */
    getFormValues() {
        return {
            thresholds: {
                failedLogins: parseInt(document.getElementById('failed-login-threshold').value),
                apiRequests: parseInt(document.getElementById('api-requests-threshold').value),
                suspiciousActivities: parseInt(document.getElementById('suspicious-activity-threshold').value)
            },
            blockDurations: {
                default: parseInt(document.getElementById('default-block-duration').value),
                bruteForce: parseInt(document.getElementById('brute-force-block-duration').value),
                manual: parseInt(document.getElementById('manual-block-duration').value)
            },
            retention: {
                archiveEventsDays: parseInt(document.getElementById('archive-events-days').value),
                deleteEventsDays: parseInt(document.getElementById('delete-events-days').value),
                deleteLoginsDays: parseInt(document.getElementById('delete-logins-days').value)
            },
            advanced: {
                enableGeolocation: document.getElementById('enable-geolocation').checked,
                enableAutoBlock: document.getElementById('enable-auto-block').checked,
                emergencyUnblockKey: document.getElementById('emergency-unblock-key').value
            },
            whitelistIPs: this.state.config.whitelistIPs
        };
    },

    /**
     * Resetea la configuración a sus valores originales
     */
    resetConfiguration() {
        // Verificar si hay configuración original
        if (!this.state.originalConfig) {
            showNotification('Error', 'No hay configuración original disponible', 'error');
            return;
        }
        
        // Pedir confirmación
        if (!confirm('¿Estás seguro de resetear la configuración a los valores originales?')) {
            return;
        }
        
        // Actualizar estado
        this.state.config = JSON.parse(JSON.stringify(this.state.originalConfig)); // Copia profunda
        this.state.isDirty = false;
        
        // Actualizar formulario
        this.updateConfigForm(this.state.config);
        
        // Actualizar lista blanca
        this.renderWhitelistIPs(this.state.config.whitelistIPs);
        
        // Mostrar notificación
        showNotification('Éxito', 'Configuración reseteada correctamente', 'success');
    },

    /**
     * Genera una clave de desbloqueo de emergencia
     */
    generateEmergencyKey() {
        // Generar clave aleatoria
        const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // Actualizar campo
        document.getElementById('emergency-unblock-key').value = key;
        
        // Marcar como modificado
        this.state.isDirty = true;
        
        // Mostrar notificación
        showNotification('Éxito', 'Clave de emergencia generada', 'success');
    },

    /**
     * Añade una IP a la lista blanca
     */
    addWhitelistIP() {
        // Obtener valor del campo
        const ip = document.getElementById('whitelist-ip').value.trim();
        
        if (!ip) {
            showNotification('Advertencia', 'Por favor introduce una IP', 'warning');
            return;
        }
        
        // Validar formato de IP
        if (!this.isValidIP(ip)) {
            showNotification('Error', 'Formato de IP inválido', 'error');
            return;
        }
        
        // Verificar si ya existe
        if (this.state.config.whitelistIPs.some(item => item.ip === ip)) {
            showNotification('Advertencia', 'Esta IP ya está en la lista blanca', 'warning');
            return;
        }
        
        // Añadir a la lista
        const newIP = {
            ip,
            description: 'Añadida manualmente',
            addedAt: new Date().toISOString()
        };
        
        this.state.config.whitelistIPs.push(newIP);
        
        // Actualizar tabla
        this.renderWhitelistIPs(this.state.config.whitelistIPs);
        
        // Limpiar campo
        document.getElementById('whitelist-ip').value = '';
        
        // Marcar como modificado
        this.state.isDirty = true;
        
        // Mostrar notificación
        showNotification('Éxito', `IP ${ip} añadida a la lista blanca`, 'success');
    },

    /**
     * Valida si una cadena es una dirección IP válida
     * @param {string} ip - Dirección IP a validar
     * @returns {boolean} Si la IP es válida
     */
    isValidIP(ip) {
        // Validar IPv4
        const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        if (ipv4Regex.test(ip)) {
            // Verificar que cada componente sea <= 255
            const parts = ip.split('.');
            return parts.every(part => parseInt(part) <= 255);
        }
        
        // Validar IPv6 (validación simplificada)
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}([0-9a-fA-F]{1,4})?$/;
        if (ipv6Regex.test(ip)) {
            return true;
        }
        
        // Validar localhost
        if (ip === 'localhost') {
            return true;
        }
        
        return false;
    },

    /**
     * Elimina una IP de la lista blanca
     * @param {number} index - Índice de la IP a eliminar
     */
    removeWhitelistIP(index) {
        // Verificar que el índice es válido
        if (index < 0 || index >= this.state.config.whitelistIPs.length) {
            showNotification('Error', 'No se puede eliminar esta IP', 'error');
            return;
        }
        
        // No permitir eliminar las IPs locales predefinidas
        const ip = this.state.config.whitelistIPs[index].ip;
        if ((index < 2 && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'))) {
            showNotification('Error', 'No se pueden eliminar las IPs locales predefinidas', 'error');
            return;
        }
        
        // Pedir confirmación
        if (!confirm(`¿Estás seguro de eliminar la IP ${ip} de la lista blanca?`)) {
            return;
        }
        
        // Eliminar de la lista
        this.state.config.whitelistIPs.splice(index, 1);
        
        // Actualizar tabla
        this.renderWhitelistIPs(this.state.config.whitelistIPs);
        
        // Marcar como modificado
        this.state.isDirty = true;
        
        // Mostrar notificación
        showNotification('Éxito', `IP ${ip} eliminada de la lista blanca`, 'success');
    },

    /**
     * Muestra u oculta indicadores de carga
     * @param {boolean} show - Si se deben mostrar los indicadores
     */
    showLoading(show) {
        // Botón de guardar
        const saveBtn = document.getElementById('save-config-btn');
        if (saveBtn) {
            saveBtn.disabled = show;
            
            if (show) {
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            } else {
                saveBtn.innerHTML = '<i class="bi bi-save me-1"></i> Guardar Configuración';
            }
        }
        
        // Deshabilitar o habilitar todos los campos
        const formInputs = document.querySelectorAll('#security-config-form input, #security-config-form select, #security-config-form button');
        formInputs.forEach(input => {
            input.disabled = show;
        });
    },

    /**
     * Limpia recursos al destruir el módulo
     */
    destroy() {
        // Limpiar event listeners específicamente enlazados con bind
        const configForm = document.getElementById('security-config-form');
        if (configForm) {
            configForm.removeEventListener('submit', this.handleFormSubmit.bind(this));
        }
        
        const resetBtn = document.getElementById('reset-config-btn');
        if (resetBtn) {
            resetBtn.removeEventListener('click', this.resetConfiguration.bind(this));
        }
        
        const generateKeyBtn = document.getElementById('generate-key-btn');
        if (generateKeyBtn) {
            generateKeyBtn.removeEventListener('click', this.generateEmergencyKey.bind(this));
        }
        
        const addWhitelistBtn = document.getElementById('add-whitelist-ip');
        if (addWhitelistBtn) {
            addWhitelistBtn.removeEventListener('click', this.addWhitelistIP.bind(this));
        }
        
        // Para otros listeners dinámicos como los botones de eliminar IP,
        // no es necesario eliminarlos específicamente ya que los elementos
        // se eliminan del DOM cuando se cambia de sección
    }
};

export default configuration;