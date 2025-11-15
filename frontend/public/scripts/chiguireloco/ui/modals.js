/**
 * Módulo para gestionar los modales del dashboard
 */

import { blockIP, revokeUserTokens } from '../utils/api.js';
import { showNotification } from '../utils/notifications.js';

const modals = {
    /**
     * Modal Bootstrap actual
     */
    currentModal: null,

    /**
     * Referencias a los modales
     */
    modalInstances: {},

    /**
     * Inicializa los modales
     */
    init() {
        document.querySelectorAll('.modal').forEach(modalElement => {
            this.modalInstances[modalElement.id] = new bootstrap.Modal(modalElement);
            
            // Restablecer datos al cerrar un modal
            modalElement.addEventListener('hidden.bs.modal', () => {
                if (modalElement.id === 'blockIpModal') {
                    document.getElementById('block-ip-form').reset();
                } else if (modalElement.id === 'revokeTokensModal') {
                    document.getElementById('revoke-tokens-form').reset();
                } else if (modalElement.id === 'confirmUnblockAllModal') {
                    document.getElementById('unblock-confirmation').value = '';
                    document.getElementById('confirm-unblock-all').disabled = true;
                } else if (modalElement.id === 'eventDetailsModal') {
                    document.getElementById('event-detail-data').innerText = '{}';
                }
            });
        });

        this.setupEventListeners();
    },

    /**
     * Configura los event listeners para los modales
     */
    setupEventListeners() {
        document.getElementById('confirm-block-ip')?.addEventListener('click', () => {
            this.handleBlockIp();
        });

        document.getElementById('confirm-revoke-tokens')?.addEventListener('click', () => {
            this.handleRevokeTokens();
        });

        const unblockConfirmField = document.getElementById('unblock-confirmation');
        if (unblockConfirmField) {
            unblockConfirmField.addEventListener('input', (e) => {
                document.getElementById('confirm-unblock-all').disabled = e.target.value !== 'DESBLOQUEAR';
            });
        }

        // Botón de bloquear IP desde evento
        document.getElementById('block-ip-from-event')?.addEventListener('click', () => {
            this.handleBlockIpFromEvent();
        });

        // Botón de revocar tokens desde evento
        document.getElementById('revoke-user-from-event')?.addEventListener('click', () => {
            this.handleRevokeTokensFromEvent();
        });

        // Botón para copiar datos del evento
        document.getElementById('copy-event-data')?.addEventListener('click', () => {
            this.copyEventData();
        });
    },

    /**
     * Muestra un modal
     * @param {string} modalId - ID del modal a mostrar
     */
    show(modalId) {
        if (this.modalInstances[modalId]) {
            this.currentModal = this.modalInstances[modalId];
            this.currentModal.show();
        } else {
            console.error(`Modal con ID ${modalId} no encontrado`);
        }
    },

    /**
     * Oculta el modal actual
     */
    hide() {
        if (this.currentModal) {
            this.currentModal.hide();
            this.currentModal = null;
        }
    },

    /**
     * Prepara el modal de bloqueo de IP con datos predefinidos
     * @param {string} ip - Dirección IP a bloquear
     * @param {string} reason - Motivo del bloqueo
     */
    prepareBlockIp(ip, reason) {
        document.getElementById('ip-to-block').value = ip || '';
        document.getElementById('block-reason').value = reason || '';
        this.show('blockIpModal');
    },

    /**
     * Prepara el modal de revocación de tokens con datos predefinidos
     * @param {string} userId - ID del usuario
     * @param {string} reason - Motivo de la revocación
     */
    prepareRevokeTokens(userId, reason) {
        document.getElementById('user-id-to-revoke').value = userId || '';
        document.getElementById('revoke-reason').value = reason || '';
        this.show('revokeTokensModal');
    },

    /**
     * Procesa el bloqueo de IP desde el modal
     */
    async handleBlockIp() {
        try {
            const ip = document.getElementById('ip-to-block').value;
            const reason = document.getElementById('block-reason').value;
            const duration = document.getElementById('block-duration').value;
            
            if (!ip || !reason) {
                showNotification('Error', 'Debe proporcionar IP y razón', 'error');
                return;
            }
            
            const response = await blockIP(ip, reason, duration);
            
            if (response.success) {
                this.hide();
                showNotification('Éxito', `IP ${ip} bloqueada por ${duration} minutos`, 'success');
                
                window.dispatchEvent(new CustomEvent('ipBlocked', { 
                    detail: { ip, reason, duration }
                }));
            } else {
                showNotification('Error', response.error || 'No se pudo bloquear la IP', 'error');
            }
        } catch (error) {
            console.error('Error al bloquear IP:', error);
            showNotification('Error', 'No se pudo completar la operación', 'error');
        }
    },

    /**
     * Procesa la revocación de tokens desde el modal
     */
    async handleRevokeTokens() {
        try {
            const userId = document.getElementById('user-id-to-revoke').value;
            const reason = document.getElementById('revoke-reason').value;
            const revokeAll = document.getElementById('revoke-all-sessions').checked;
            
            if (!userId || !reason) {
                showNotification('Error', 'Debe proporcionar ID de usuario y razón', 'error');
                return;
            }
            
            const response = await revokeUserTokens(userId, reason, revokeAll);
            
            if (response.success) {
                this.hide();
                showNotification('Éxito', `Tokens revocados para el usuario ${userId}`, 'success');
                
                window.dispatchEvent(new CustomEvent('tokensRevoked', { 
                    detail: { userId, reason, tokensRevoked: response.tokensRevoked }
                }));
            } else {
                showNotification('Error', response.error || 'No se pudieron revocar los tokens', 'error');
            }
        } catch (error) {
            console.error('Error al revocar tokens:', error);
            showNotification('Error', 'No se pudo completar la operación', 'error');
        }
    },

    /**
     * Prepara y muestra los detalles de un evento
     * @param {Object} event - Objeto con datos del evento
     */
    showEventDetails(event) {
        const detailId = document.getElementById('event-detail-id');
        const detailType = document.getElementById('event-detail-type');
        const detailSeverity = document.getElementById('event-detail-severity');
        const detailTimestamp = document.getElementById('event-detail-timestamp');
        const detailMessage = document.getElementById('event-detail-message');
        const detailIp = document.getElementById('event-detail-ip');
        const detailUser = document.getElementById('event-detail-user');
        const detailData = document.getElementById('event-detail-data');
        
        // Llenar campos del modal con datos del evento
        if (detailId) detailId.textContent = event.id || '-';
        if (detailType) detailType.textContent = event.eventType || '-';
        if (detailSeverity) {
            detailSeverity.textContent = event.severity || '-';
            detailSeverity.className = 'form-control-plaintext';
            if (event.severity) {
                detailSeverity.classList.add(`text-${this.getSeverityClass(event.severity)}`);
            }
        }
        if (detailTimestamp) detailTimestamp.textContent = this.formatDateTime(event.timestamp) || '-';
        if (detailMessage) detailMessage.textContent = event.message || '-';
        if (detailIp) detailIp.textContent = event.ipAddress || '-';
        if (detailUser) detailUser.textContent = event.userId || '-';
        
        if (detailData) {
            try {
                const jsonData = typeof event.data === 'string' 
                    ? JSON.parse(event.data) 
                    : event.data || {};
                
                detailData.textContent = JSON.stringify(jsonData, null, 2);
            } catch (e) {
                detailData.textContent = typeof event.data === 'string' 
                    ? event.data 
                    : JSON.stringify(event.data || {});
            }
        }
        
        const blockIpBtn = document.getElementById('block-ip-from-event');
        const revokeUserBtn = document.getElementById('revoke-user-from-event');
        
        if (blockIpBtn) blockIpBtn.disabled = !event.ipAddress;
        if (revokeUserBtn) revokeUserBtn.disabled = !event.userId;
        
        this._currentEvent = event;
        
        this.show('eventDetailsModal');
    },

    /**
     * Prepara el modal de bloqueo con datos del evento actual
     */
    handleBlockIpFromEvent() {
        if (this._currentEvent && this._currentEvent.ipAddress) {
            this.hide();
            
            this.prepareBlockIp(
                this._currentEvent.ipAddress,
                `Bloqueado desde evento: ${this._currentEvent.eventType} - ${this._currentEvent.id}`
            );
        }
    },

    /**
     * Prepara el modal de revocación con datos del evento actual
     */
    handleRevokeTokensFromEvent() {
        if (this._currentEvent && this._currentEvent.userId) {
            this.hide();
            
            this.prepareRevokeTokens(
                this._currentEvent.userId,
                `Revocado desde evento: ${this._currentEvent.eventType} - ${this._currentEvent.id}`
            );
        }
    },

    /**
     * Copia los datos del evento al portapapeles
     */
    copyEventData() {
        const dataElement = document.getElementById('event-detail-data');
        if (dataElement) {
            try {
                navigator.clipboard.writeText(dataElement.textContent);
                showNotification('Copiado', 'Datos copiados al portapapeles', 'success');
            } catch (error) {
                console.error('Error al copiar datos:', error);
                showNotification('Error', 'No se pudieron copiar los datos', 'error');
            }
        }
    },

    /**
     * Obtiene la clase CSS de Bootstrap según la severidad
     * @param {string} severity - Nivel de severidad
     * @returns {string} Clase CSS correspondiente
     */
    getSeverityClass(severity) {
        const severityMap = {
            'critical': 'danger',
            'high': 'warning',
            'medium': 'warning',
            'low': 'info',
            'info': 'primary'
        };
        
        return severityMap[severity] || 'secondary';
    },

    /**
     * Formatea una fecha ISO a formato legible
     * @param {string} dateString - Fecha en formato ISO
     * @returns {string} Fecha formateada
     */
    formatDateTime(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (e) {
            return dateString;
        }
    }
};

export default modals;