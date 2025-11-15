// Eliminada la importación no utilizada de Redis
import { 
    parseUserAgent, 
    formatUserAgentForDisplay, 
    getSecurityAlertInfo 
} from '../../utils/userAgentParser.js';

/**
 * Servicio para gestionar notificaciones en tiempo real
 * Implementa un mecanismo de longpolling para notificaciones de intentos de login
 */
class NotificationService {
    constructor() {
        // Map para almacenar las conexiones activas
        this.activeConnections = new Map();
        
        // Tiempo máximo de espera para una conexión (ms)
        this.connectionTimeout = 60000;
        
        // Máximo de conexiones activas por usuario
        this.maxConnectionsPerUser = 4;
        
        // Nivel de log (0=mínimo, 1=normal, 2=detallado)
        this.logLevel = 1;
        
        console.log('✅ Servicio de notificaciones en tiempo real inicializado');
    }
    
    /**
     * Registra una conexión activa para un usuario
     * @param {string} userId - ID del usuario
     * @param {object} res - Objeto response de Express
     */
    registerConnection(userId, res) {
        if (!this.activeConnections.has(userId)) {
            this.activeConnections.set(userId, []);
        }
        
        const connections = this.activeConnections.get(userId);
        
        // Limitar el número de conexiones activas por usuario
        // Si ya hay muchas conexiones, cerrar las más antiguas
        if (connections.length >= this.maxConnectionsPerUser) {
            const oldestConnection = connections[0];
            this.cleanupConnection(userId, oldestConnection);
            
            if (!oldestConnection.headersSent) {
                oldestConnection.status(200).json({ 
                    pendingAttempt: null,
                    meta: { reason: 'connection_limit_reached' }
                });
            }
            
            if (this.logLevel >= 1) {
                console.log(`⚠️ Límite de conexiones alcanzado para usuario ${userId}, cerrando conexión antigua`);
            }
        }
        
        connections.push(res);
        
        const timeoutId = setTimeout(() => {
            this.cleanupConnection(userId, res);
            
            // Si la conexión aún está abierta, enviar respuesta vacía
            if (!res.headersSent) {
                res.status(200).json({ 
                    pendingAttempt: null,
                    meta: { reason: 'timeout' }
                });
            }
        }, this.connectionTimeout);
        
        res.timeoutId = timeoutId;
        
        res.on('close', () => {
            if (res.timeoutId) {
                clearTimeout(res.timeoutId);
            }
            this.cleanupConnection(userId, res);
        });
        
        if (this.logLevel >= 1) {
            console.log(`👂 Nueva conexión registrada para usuario ${userId}, total: ${connections.length}`);
        }
    }
    
    /**
     * Limpia una conexión de la lista de conexiones activas
     * @param {string} userId - ID del usuario
     * @param {object} res - Objeto response de Express a eliminar
     */
    cleanupConnection(userId, res) {
        if (!this.activeConnections.has(userId)) return;
        
        const connections = this.activeConnections.get(userId);
        const index = connections.indexOf(res);
        
        if (index !== -1) {
            connections.splice(index, 1);
            
            if (this.logLevel >= 1) {
                console.log(`🧹 Conexión cerrada para usuario ${userId}, restantes: ${connections.length}`);
            }
        }
        
        // Si no quedan conexiones, eliminar la entrada
        if (connections.length === 0) {
            this.activeConnections.delete(userId);
        }
    }
    
    /**
     * Obtiene las conexiones activas para un usuario
     * @param {string} userId - ID del usuario
     * @returns {Array} - Array de objetos response activos
     */
    getActiveConnections(userId) {
        return this.activeConnections.get(userId) || [];
    }
    
    /**
     * Notifica a todas las conexiones activas de un usuario sobre un nuevo intento de login
     * @param {string} userId - ID del usuario
     * @param {object} attemptData - Datos del intento de login
     * @returns {number} - Número de conexiones notificadas
     */
    notifyNewLoginAttempt(userId, attemptData) {
        // Enriquecer con información parseada si no la tiene
        if (!attemptData.userAgentInfo && attemptData.userAgent) {
            const userAgentInfo = parseUserAgent(attemptData.userAgent);
            const userAgentDisplay = formatUserAgentForDisplay(attemptData.userAgent, {
                showIcons: true,
                format: 'full'
            });
            const securityInfo = getSecurityAlertInfo(attemptData.userAgent);
            
            attemptData.userAgentInfo = userAgentInfo;
            attemptData.userAgentDisplay = userAgentDisplay;
            attemptData.securityInfo = securityInfo;
        }
        
        const connections = this.getActiveConnections(userId);
        let notifiedCount = 0;
        
        connections.forEach(res => {
            if (!res.headersSent) {
                try {
                    if (res.timeoutId) {
                        clearTimeout(res.timeoutId);
                    }
                    
                    res.status(200).json({ 
                        status: "success",
                        pendingAttempt: attemptData,
                        meta: { reason: 'new_attempt' }
                    });
                    notifiedCount++;
                } catch (error) {
                    console.error('Error notificando intento de login:', error);
                }
            }
        });
        
        this.activeConnections.delete(userId);
        
        if (this.logLevel >= 1 || notifiedCount > 0) {
            console.log(`📢 Notificado nuevo intento de login a ${notifiedCount} conexiones para usuario ${userId}`);
        }
        
        return notifiedCount;
    }
    
    /**
     * Verifica si hay un intento de login pendiente para un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<object|null>} - Datos del intento pendiente o null
     */
    async checkForPendingAttempt(userId) {
        try {
            const query = `
                SELECT 
                    id, 
                    ip_address as "ipAddress", 
                    user_agent as "userAgent", 
                    created_at as "timestamp", 
                    status
                FROM login_attempts 
                WHERE user_id = $1 
                AND status = 'pending' 
                AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            // Importamos dinámicamente pool para evitar dependencias circulares
            const { default: pool } = await import('../../lib/dbPool.js');
            const { rows } = await pool.query(query, [userId]);
            
            if (rows.length === 0) {
                return null;
            }
            
            // Enriquecer los datos con información geográfica si está disponible
            const attempt = rows[0];
            
            // NUEVO: Agregar información parseada del User-Agent
            if (attempt.userAgent && attempt.userAgent !== 'Unknown') {
                const userAgentInfo = parseUserAgent(attempt.userAgent);
                const userAgentDisplay = formatUserAgentForDisplay(attempt.userAgent, {
                    showIcons: true,
                    format: 'full'
                });
                const securityInfo = getSecurityAlertInfo(attempt.userAgent);
                
                attempt.userAgentInfo = userAgentInfo;
                attempt.userAgentDisplay = userAgentDisplay;
                attempt.securityInfo = securityInfo;
            } else {
                // Valores por defecto si no hay User-Agent válido
                attempt.userAgentInfo = parseUserAgent('');
                attempt.userAgentDisplay = 'Dispositivo desconocido';
                attempt.securityInfo = getSecurityAlertInfo('');
            }
            
            attempt.location = "Ubicación desconocida"; // O usa geoip-lite si lo tienes
            
            return attempt;
        } catch (error) {
            console.error("Error verificando intentos pendientes:", error);
            return null;
        }
    }
    
    /**
     * Configura el nivel de logging del servicio
     * @param {number} level - Nivel de log (0=mínimo, 1=normal, 2=detallado)
     */
    setLogLevel(level) {
        this.logLevel = level;
        console.log(`Nivel de logging establecido a ${level}`);
    }
}

export const notificationService = new NotificationService();