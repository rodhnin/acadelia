// notificationService.js - Servicio OPTIMIZADO con limpieza por sección persistente
import { 
  getNotifications, 
  getNotificationCounts, 
  clearNotifications, 
  // 🆕 NUEVAS IMPORTACIONES PARA LIMPIEZA POR SECCIÓN
  clearSectionNotifications,
  markSectionAsViewed,
  getCurrentNotifications,
  hasNotifications 
} from '../api/marketingAPI.js';

class NotificationService {
  constructor() {
    this.notifications = {
      total: 0,
      byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
      notifications: { profiles: [], contents: [], trends: [], memory: [] },
      sessionId: null
    };
    
    this.callbacks = {
      onUpdate: [],
      onClear: [],
      onNewNotification: [],
      onSectionCleared: [] // 🆕 NUEVO callback para limpieza por sección
    };
    
    this.isInitialized = false;
    this.init();
  }
  
  // Inicializar el servicio
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔔 Inicializando servicio de notificaciones optimizado con limpieza por sección');
    
    // Escuchar eventos de notificaciones
    window.addEventListener('newNotifications', this.handleNewNotifications.bind(this));
    window.addEventListener('notificationsCleared', this.handleNotificationsCleared.bind(this));
    
    // 🆕 NUEVOS EVENTOS para limpieza por sección
    window.addEventListener('sectionNotificationsCleared', this.handleSectionNotificationsCleared.bind(this));
    window.addEventListener('sectionMarkedAsViewed', this.handleSectionMarkedAsViewed.bind(this));
    
    // Cargar notificaciones existentes
    await this.loadNotifications();
    
    // Configurar solo indicadores necesarios
    this.setupSidebarIndicators();
    this.setupHeaderIndicator();
    
    // Configurar listeners para auto-limpiar por sección
    this.setupSectionModalListeners();
    
    this.isInitialized = true;
    console.log('✅ Servicio de notificaciones optimizado inicializado con limpieza por sección');
  }
  
  // Cargar notificaciones desde el servidor
  async loadNotifications() {
    try {
      const response = await getNotifications();
      if (response.success && response.notifications) {
        this.notifications = response.notifications;
        this.updateUI();
      }
    } catch (error) {
      console.warn('Error cargando notificaciones:', error);
    }
  }
  
  // Manejar nuevas notificaciones
  handleNewNotifications(event) {
    const { notifications, hasNewContent } = event.detail;
    
    console.log('🔔 Nuevas notificaciones recibidas:', notifications.total);
    
    // Actualizar notificaciones locales
    this.notifications = notifications;
    
    if (hasNewContent) {
      // Mostrar indicadores visuales
      this.updateUI();
      
      // Ejecutar callbacks
      this.callbacks.onNewNotification.forEach(callback => {
        try {
          callback(notifications);
        } catch (error) {
          console.error('Error en callback de nueva notificación:', error);
        }
      });
      
      // Mostrar notificación toast
      this.showNotificationToast();
    }
  }
  
  // Manejar limpieza de notificaciones
  handleNotificationsCleared(event) {
    console.log('🧹 Notificaciones limpiadas');
    
    this.notifications = {
      total: 0,
      byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
      notifications: { profiles: [], contents: [], trends: [], memory: [] },
      sessionId: null
    };
    
    this.updateUI();
    
    // Ejecutar callbacks
    this.callbacks.onClear.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error en callback de limpieza:', error);
      }
    });
  }
  
  // 🆕 NUEVO: Manejar limpieza de notificaciones por sección
  handleSectionNotificationsCleared(event) {
    const { section, notifications } = event.detail;
    
    console.log(`🧹 Notificaciones de sección ${section} limpiadas en el servidor`);
    
    // Actualizar notificaciones locales con el estado del servidor
    this.notifications = notifications;
    
    // Actualizar UI
    this.updateUI();
    
    // Ejecutar callbacks específicos de sección
    this.callbacks.onSectionCleared.forEach(callback => {
      try {
        callback(section, notifications);
      } catch (error) {
        console.error('Error en callback de limpieza por sección:', error);
      }
    });
    
    // También ejecutar callbacks generales de actualización
    this.callbacks.onUpdate.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error en callback de actualización:', error);
      }
    });
  }
  
  // 🆕 NUEVO: Manejar marcado de sección como vista
  handleSectionMarkedAsViewed(event) {
    const { section, notifications, userId } = event.detail;
    
    console.log(`👁️ Sección ${section} marcada como vista en el servidor`);
    
    // Actualizar notificaciones locales
    this.notifications = notifications;
    
    // Actualizar UI
    this.updateUI();
    
    // Ejecutar callbacks
    this.callbacks.onUpdate.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error en callback de actualización:', error);
      }
    });
  }
  
  // Configurar indicadores en el sidebar (solo badges de sección)
  setupSidebarIndicators() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      console.warn('Sidebar no encontrado para configurar indicadores');
      return;
    }
    
    // Crear indicadores específicos para cada sección
    this.createSectionIndicators();
    
    // Escuchar cambios en el estado del sidebar
    const observer = new MutationObserver(() => {
      this.updateIndicatorVisibility();
    });
    
    observer.observe(sidebar, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Escuchar hover en el sidebar
    sidebar.addEventListener('mouseenter', () => {
      setTimeout(() => this.updateIndicatorVisibility(), 100);
    });
    
    sidebar.addEventListener('mouseleave', () => {
      setTimeout(() => this.updateIndicatorVisibility(), 100);
    });
  }
  
  // Configurar indicador del header (único indicador principal)
  setupHeaderIndicator() {
    const header = document.querySelector('.main-header');
    if (!header) {
      console.warn('Header no encontrado para configurar indicador');
      return;
    }
    
    // Crear indicador del header si no existe
    this.createHeaderIndicator();
  }
  
  // Configurar listeners para auto-limpiar por sección - 🆕 MEJORADO
  setupSectionModalListeners() {
    // Escuchar cuando se abren modales específicas
    const sections = ['information', 'profiles', 'content', 'trends', 'memory'];
    
    sections.forEach(section => {
      const modal = document.getElementById(`${section}Modal`);
      if (modal) {
        // Listener para cuando se abre la modal
        modal.addEventListener('modal:open', async () => {
          console.log(`📂 Modal ${section} abierta, limpiando notificaciones de esta sección en el servidor`);
          await this.clearSectionNotificationsPersistent(section);
        });
        
        // Listener adicional para clics en elementos del sidebar
        const sidebarItem = document.querySelector(`[data-section="${section}"]`);
        if (sidebarItem) {
          sidebarItem.addEventListener('click', async () => {
            // Delay para que se abra la modal primero
            setTimeout(async () => {
              console.log(`📂 Sección ${section} clicada, limpiando notificaciones en el servidor`);
              await this.clearSectionNotificationsPersistent(section);
            }, 500);
          });
        }
      }
    });
  }
  
  // 🆕 NUEVO: Limpiar notificaciones de una sección específica EN EL SERVIDOR
  async clearSectionNotificationsPersistent(section) {
    try {
      console.log(`🧹 Iniciando limpieza persistente para sección: ${section}`);
      
      // Mapear secciones del frontend a tipos de notificación
      const sectionMapping = {
        'information': 'all', // Information muestra todas, así que limpia todas
        'profiles': 'profiles',
        'content': 'contents', // Note: contents en plural en el backend
        'trends': 'trends',
        'memory': 'memory'
      };
      
      const backendSection = sectionMapping[section] || section;
      
      if (backendSection === 'all') {
        // Si es 'information', limpiar todas las notificaciones
        console.log('🧹 Sección information detectada, limpiando todas las notificaciones');
        const response = await this.clearAll();
        return response;
      } else {
        // Limpiar solo la sección específica en el servidor
        const response = await clearSectionNotifications(backendSection);
        
        if (response.success) {
          console.log(`✅ Notificaciones de ${section} limpiadas exitosamente en el servidor`);
          
          // Las notificaciones se actualizarán automáticamente a través del evento
          // 'sectionNotificationsCleared' que dispara clearSectionNotifications
          
          return response;
        } else {
          console.error(`❌ Error limpiando notificaciones de ${section}:`, response.error);
          
          // Fallback: limpiar localmente si el servidor falla
          this.clearSectionNotificationsLocal(section);
          
          return { success: false, error: response.error };
        }
      }
    } catch (error) {
      console.error(`❌ Error en clearSectionNotificationsPersistent para ${section}:`, error);
      
      // Fallback: limpiar localmente si hay error de comunicación
      this.clearSectionNotificationsLocal(section);
      
      return { success: false, error: error.message };
    }
  }
  
  // 🆕 NUEVO: Fallback para limpiar notificaciones localmente
  clearSectionNotificationsLocal(section) {
    console.log(`🔄 Fallback: Limpiando notificaciones de ${section} localmente`);
    
    const sectionMapping = {
      'information': 'all',
      'profiles': 'profiles',
      'content': 'contents',
      'trends': 'trends',
      'memory': 'memory'
    };
    
    const notificationType = sectionMapping[section];
    
    if (notificationType === 'all') {
      // Limpiar todas las notificaciones
      this.notifications = {
        total: 0,
        byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
        notifications: { profiles: [], contents: [], trends: [], memory: [] },
        sessionId: this.notifications.sessionId
      };
    } else if (notificationType && this.notifications.byType[notificationType] > 0) {
      // Limpiar solo la sección específica
      this.notifications.byType[notificationType] = 0;
      this.notifications.notifications[notificationType] = [];
      
      // Recalcular total
      this.notifications.total = Object.values(this.notifications.byType).reduce((sum, count) => sum + count, 0);
    }
    
    // Actualizar UI
    this.updateUI();
    
    console.log(`🧹 Notificaciones de ${section} limpiadas localmente (fallback)`);
  }
  
  // 🆕 NUEVO: Marcar sección como vista de forma persistente
  async markSectionAsViewedPersistent(section, userId = null) {
    try {
      console.log(`👁️ Marcando sección ${section} como vista en el servidor`);
      
      const response = await markSectionAsViewed(section, userId);
      
      if (response.success) {
        console.log(`✅ Sección ${section} marcada como vista exitosamente`);
        return response;
      } else {
        console.error(`❌ Error marcando sección ${section} como vista:`, response.error);
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error(`❌ Error en markSectionAsViewedPersistent para ${section}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Crear indicador del header
  createHeaderIndicator() {
    if (document.getElementById('acadelia-notif-header-indicator')) return;
    
    const header = document.querySelector('.main-header');
    if (!header) return;
    
    const headerIndicator = document.createElement('div');
    headerIndicator.id = 'acadelia-notif-header-indicator';
    headerIndicator.className = 'acadelia-notif-header-badge acadelia-notif-hidden';
    headerIndicator.innerHTML = `
      <i class='bx bx-bell'></i>
      <span>Nuevos datos</span>
      <div class="acadelia-notif-header-count">0</div>
    `;
    
    // Agregar evento de clic
    headerIndicator.addEventListener('click', () => {
      this.handleHeaderIndicatorClick();
    });
    
    // Agregar al header con posición relativa
    header.style.position = 'relative';
    header.appendChild(headerIndicator);
  }
  
  // Crear indicadores para cada sección del sidebar
  createSectionIndicators() {
    const sections = [
      { key: 'profiles', selector: '[data-section="profiles"]' },
      { key: 'content', selector: '[data-section="content"]' },
      { key: 'trends', selector: '[data-section="trends"]' },
      { key: 'memory', selector: '[data-section="memory"]' }
    ];
    
    sections.forEach(section => {
      const sectionEl = document.querySelector(section.selector);
      if (sectionEl && !sectionEl.querySelector('.acadelia-notif-section-badge')) {
        const badge = document.createElement('div');
        badge.className = 'acadelia-notif-section-badge acadelia-notif-hidden';
        badge.innerHTML = '<span class="acadelia-notif-badge-count">0</span>';
        badge.setAttribute('data-section', section.key);
        
        sectionEl.style.position = 'relative'; // Asegurar posición relativa
        sectionEl.appendChild(badge);
      }
    });
  }
  
  // Manejar clic en indicador del header
  handleHeaderIndicatorClick() {
    console.log('🔔 Clic en indicador del header');
    
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // Siempre expandir/mostrar sidebar
    if (window.innerWidth <= 768) {
      // En móvil, abrir sidebar
      sidebar.classList.add('mobile-open');
      const overlay = document.getElementById('mobile-sidebar-overlay');
      if (overlay) {
        overlay.classList.add('active');
      }
    } else {
      // En desktop, fijar sidebar si no está fijado
      if (!sidebar.classList.contains('pinned')) {
        sidebar.classList.add('pinned');
        localStorage.setItem('sidebar-pinned', 'true');
      }
    }
    
    // Mostrar mensaje informativo
    if (window.showNotification) {
      window.showNotification('Revisa las secciones del sidebar para ver la información guardada', 'info', 3000);
    }
  }
  
  // Actualizar interfaz de usuario
  updateUI() {
    console.log('🎨 Actualizando UI de notificaciones:', this.notifications.total);
    
    // Actualizar indicador del header
    this.updateHeaderIndicator();
    
    // Actualizar indicadores de sección
    this.updateSectionIndicators();
    
    // Actualizar visibilidad según estado del sidebar
    this.updateIndicatorVisibility();
    
    // Ejecutar callbacks de actualización
    this.callbacks.onUpdate.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error en callback de actualización:', error);
      }
    });
  }
  
  // Actualizar indicador del header
  updateHeaderIndicator() {
    const headerIndicator = document.getElementById('acadelia-notif-header-indicator');
    if (!headerIndicator) return;
    
    const countEl = headerIndicator.querySelector('.acadelia-notif-header-count');
    
    if (this.notifications.total > 0) {
      headerIndicator.classList.remove('acadelia-notif-hidden');
      headerIndicator.classList.add('acadelia-notif-show');
      countEl.textContent = this.notifications.total > 99 ? '99+' : this.notifications.total;
    } else {
      headerIndicator.classList.add('acadelia-notif-hidden');
      headerIndicator.classList.remove('acadelia-notif-show');
    }
  }
  
  // Actualizar indicadores de sección
  updateSectionIndicators() {
    const sectionMap = {
      'profiles': this.notifications.byType.profiles,
      'content': this.notifications.byType.contents,
      'trends': this.notifications.byType.trends,
      'memory': this.notifications.byType.memory
    };
    
    Object.entries(sectionMap).forEach(([section, count]) => {
      const badge = document.querySelector(`[data-section="${section}"] .acadelia-notif-section-badge`);
      if (badge) {
        const countEl = badge.querySelector('.acadelia-notif-badge-count');
        
        if (count > 0) {
          badge.classList.remove('acadelia-notif-hidden');
          badge.classList.add('acadelia-notif-show');
          countEl.textContent = count > 99 ? '99+' : count;
        } else {
          badge.classList.add('acadelia-notif-hidden');
          badge.classList.remove('acadelia-notif-show');
        }
      }
    });
  }
  
  // Actualizar visibilidad de indicadores según estado del sidebar
  updateIndicatorVisibility() {
    const sidebar = document.querySelector('.sidebar');
    const headerIndicator = document.getElementById('acadelia-notif-header-indicator');
    
    if (!sidebar) return;
    
    const isExpanded = sidebar.classList.contains('pinned') || 
                      sidebar.matches(':hover') || 
                      sidebar.classList.contains('mobile-open');
    
    // El indicador del header siempre se muestra si hay notificaciones
    if (headerIndicator && this.notifications.total > 0) {
      headerIndicator.style.display = 'flex';
    } else if (headerIndicator) {
      headerIndicator.style.display = 'none';
    }
    
    // Los badges de sección se muestran cuando el sidebar está expandido
    this.showSectionBadges(isExpanded);
  }
  
  // Mostrar/ocultar badges de sección
  showSectionBadges(show) {
    const badges = document.querySelectorAll('.acadelia-notif-section-badge');
    badges.forEach(badge => {
      const section = badge.getAttribute('data-section');
      const count = this.getCountBySection(section);
      
      if (show && count > 0) {
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
  }
  
  // Obtener conteo por sección
  getCountBySection(section) {
    const mapping = {
      'profiles': this.notifications.byType.profiles,
      'content': this.notifications.byType.contents,
      'trends': this.notifications.byType.trends,
      'memory': this.notifications.byType.memory
    };
    return mapping[section] || 0;
  }
  
  // Mostrar notificación toast
  showNotificationToast() {
    if (this.notifications.total === 0) return;
    
    let message = `Se guardó nueva información en ${this.notifications.total} categoría${this.notifications.total > 1 ? 's' : ''}`;
    
    // Detallar por tipo
    const details = [];
    if (this.notifications.byType.profiles > 0) {
      details.push(`${this.notifications.byType.profiles} perfil${this.notifications.byType.profiles > 1 ? 'es' : ''}`);
    }
    if (this.notifications.byType.contents > 0) {
      details.push(`${this.notifications.byType.contents} contenido${this.notifications.byType.contents > 1 ? 's' : ''}`);
    }
    if (this.notifications.byType.trends > 0) {
      details.push(`${this.notifications.byType.trends} tendencia${this.notifications.byType.trends > 1 ? 's' : ''}`);
    }
    if (this.notifications.byType.memory > 0) {
      details.push(`${this.notifications.byType.memory} insight${this.notifications.byType.memory > 1 ? 's' : ''}`);
    }
    
    if (details.length > 0) {
      message += `: ${details.join(', ')}`;
    }
    
    // Mostrar usando el sistema de notificaciones existente (externo)
    if (window.showNotification) {
      window.showNotification(message, 'info', 5000);
    } else {
      console.log('📱 Notificación:', message);
    }
  }
  
  // Limpiar notificaciones - 🆕 MEJORADO para usar servidor
  async clearAll() {
    try {
      const response = await clearNotifications();
      if (response.success) {
        console.log('✅ Notificaciones limpiadas exitosamente en el servidor');
      }
      return response;
    } catch (error) {
      console.error('Error limpiando notificaciones:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 🆕 NUEVA FUNCIÓN: Limpiar sección específica (interfaz pública)
  async clearSection(section) {
    return await this.clearSectionNotificationsPersistent(section);
  }
  
  // 🆕 NUEVA FUNCIÓN: Marcar sección como vista (interfaz pública)
  async markSectionViewed(section, userId = null) {
    return await this.markSectionAsViewedPersistent(section, userId);
  }
  
  // Obtener notificaciones de un tipo específico
  getNotificationsByType(type) {
    return this.notifications.notifications[type] || [];
  }
  
  // Obtener conteo de un tipo específico
  getCountByType(type) {
    return this.notifications.byType[type] || 0;
  }
  
  // Verificar si hay notificaciones
  hasNotifications() {
    return this.notifications.total > 0;
  }
  
  // Registrar callback para eventos
  onUpdate(callback) {
    this.callbacks.onUpdate.push(callback);
  }
  
  onClear(callback) {
    this.callbacks.onClear.push(callback);
  }
  
  onNewNotification(callback) {
    this.callbacks.onNewNotification.push(callback);
  }
  
  // 🆕 NUEVO callback para limpieza por sección
  onSectionCleared(callback) {
    this.callbacks.onSectionCleared.push(callback);
  }
}

// Crear instancia global del servicio
const notificationService = new NotificationService();

// Exponer globalmente para uso en otros scripts
window.notificationService = notificationService;

export default notificationService;