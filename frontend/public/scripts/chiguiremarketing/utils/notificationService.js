// notificationService.js - Servicio OPTIMIZADO con limpieza por sección persistente
import { 
  getNotifications, 
  getNotificationCounts, 
  clearNotifications, 
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
      onSectionCleared: []
    };
    
    this.isInitialized = false;
    this.init();
  }
  
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔔 Inicializando servicio de notificaciones optimizado con limpieza por sección');
    
    window.addEventListener('newNotifications', this.handleNewNotifications.bind(this));
    window.addEventListener('notificationsCleared', this.handleNotificationsCleared.bind(this));
    
    window.addEventListener('sectionNotificationsCleared', this.handleSectionNotificationsCleared.bind(this));
    window.addEventListener('sectionMarkedAsViewed', this.handleSectionMarkedAsViewed.bind(this));
    
    await this.loadNotifications();
    
    this.setupSidebarIndicators();
    this.setupHeaderIndicator();
    
    this.setupSectionModalListeners();
    
    this.isInitialized = true;
    console.log('✅ Servicio de notificaciones optimizado inicializado con limpieza por sección');
  }
  
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
  
  handleNewNotifications(event) {
    const { notifications, hasNewContent } = event.detail;
    
    console.log('🔔 Nuevas notificaciones recibidas:', notifications.total);
    
    this.notifications = notifications;
    
    if (hasNewContent) {
      this.updateUI();
      
      this.callbacks.onNewNotification.forEach(callback => {
        try {
          callback(notifications);
        } catch (error) {
          console.error('Error en callback de nueva notificación:', error);
        }
      });
      
      this.showNotificationToast();
    }
  }
  
  handleNotificationsCleared(event) {
    console.log('🧹 Notificaciones limpiadas');
    
    this.notifications = {
      total: 0,
      byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
      notifications: { profiles: [], contents: [], trends: [], memory: [] },
      sessionId: null
    };
    
    this.updateUI();
    
    this.callbacks.onClear.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error en callback de limpieza:', error);
      }
    });
  }
  
  handleSectionNotificationsCleared(event) {
    const { section, notifications } = event.detail;
    
    console.log(`🧹 Notificaciones de sección ${section} limpiadas en el servidor`);
    
    this.notifications = notifications;
    
    this.updateUI();
    
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
  
  handleSectionMarkedAsViewed(event) {
    const { section, notifications, userId } = event.detail;
    
    console.log(`👁️ Sección ${section} marcada como vista en el servidor`);
    
    this.notifications = notifications;
    
    this.updateUI();
    
    this.callbacks.onUpdate.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error en callback de actualización:', error);
      }
    });
  }
  
  setupSidebarIndicators() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      console.warn('Sidebar no encontrado para configurar indicadores');
      return;
    }
    
    this.createSectionIndicators();
    
    const observer = new MutationObserver(() => {
      this.updateIndicatorVisibility();
    });
    
    observer.observe(sidebar, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    sidebar.addEventListener('mouseenter', () => {
      setTimeout(() => this.updateIndicatorVisibility(), 100);
    });
    
    sidebar.addEventListener('mouseleave', () => {
      setTimeout(() => this.updateIndicatorVisibility(), 100);
    });
  }
  
  setupHeaderIndicator() {
    const header = document.querySelector('.main-header');
    if (!header) {
      console.warn('Header no encontrado para configurar indicador');
      return;
    }
    
    this.createHeaderIndicator();
  }
  
  setupSectionModalListeners() {
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
  
  async clearSectionNotificationsPersistent(section) {
    try {
      console.log(`🧹 Iniciando limpieza persistente para sección: ${section}`);
      
      const sectionMapping = {
        'information': 'all', // Information muestra todas, así que limpia todas
        'profiles': 'profiles',
        'content': 'contents',
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
        const response = await clearSectionNotifications(backendSection);
        
        if (response.success) {
          console.log(`✅ Notificaciones de ${section} limpiadas exitosamente en el servidor`);
          
          // Las notificaciones se actualizarán automáticamente a través del evento
          // 'sectionNotificationsCleared' que dispara clearSectionNotifications
          
          return response;
        } else {
          console.error(`❌ Error limpiando notificaciones de ${section}:`, response.error);
          
          this.clearSectionNotificationsLocal(section);
          
          return { success: false, error: response.error };
        }
      }
    } catch (error) {
      console.error(`❌ Error en clearSectionNotificationsPersistent para ${section}:`, error);
      
      this.clearSectionNotificationsLocal(section);
      
      return { success: false, error: error.message };
    }
  }
  
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
      this.notifications = {
        total: 0,
        byType: { profiles: 0, contents: 0, trends: 0, memory: 0 },
        notifications: { profiles: [], contents: [], trends: [], memory: [] },
        sessionId: this.notifications.sessionId
      };
    } else if (notificationType && this.notifications.byType[notificationType] > 0) {
      this.notifications.byType[notificationType] = 0;
      this.notifications.notifications[notificationType] = [];
      
      // Recalcular total
      this.notifications.total = Object.values(this.notifications.byType).reduce((sum, count) => sum + count, 0);
    }
    
    this.updateUI();
    
    console.log(`🧹 Notificaciones de ${section} limpiadas localmente (fallback)`);
  }
  
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
    
    headerIndicator.addEventListener('click', () => {
      this.handleHeaderIndicatorClick();
    });
    
    header.style.position = 'relative';
    header.appendChild(headerIndicator);
  }
  
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
    
    if (window.showNotification) {
      window.showNotification('Revisa las secciones del sidebar para ver la información guardada', 'info', 3000);
    }
  }
  
  updateUI() {
    console.log('🎨 Actualizando UI de notificaciones:', this.notifications.total);
    
    this.updateHeaderIndicator();
    
    this.updateSectionIndicators();
    
    this.updateIndicatorVisibility();
    
    this.callbacks.onUpdate.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error en callback de actualización:', error);
      }
    });
  }
  
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
  
  getCountBySection(section) {
    const mapping = {
      'profiles': this.notifications.byType.profiles,
      'content': this.notifications.byType.contents,
      'trends': this.notifications.byType.trends,
      'memory': this.notifications.byType.memory
    };
    return mapping[section] || 0;
  }
  
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
    
    if (window.showNotification) {
      window.showNotification(message, 'info', 5000);
    } else {
      console.log('📱 Notificación:', message);
    }
  }
  
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
  
  async clearSection(section) {
    return await this.clearSectionNotificationsPersistent(section);
  }
  
  async markSectionViewed(section, userId = null) {
    return await this.markSectionAsViewedPersistent(section, userId);
  }
  
  getNotificationsByType(type) {
    return this.notifications.notifications[type] || [];
  }
  
  getCountByType(type) {
    return this.notifications.byType[type] || 0;
  }
  
  hasNotifications() {
    return this.notifications.total > 0;
  }
  
  onUpdate(callback) {
    this.callbacks.onUpdate.push(callback);
  }
  
  onClear(callback) {
    this.callbacks.onClear.push(callback);
  }
  
  onNewNotification(callback) {
    this.callbacks.onNewNotification.push(callback);
  }
  
  onSectionCleared(callback) {
    this.callbacks.onSectionCleared.push(callback);
  }
}

const notificationService = new NotificationService();

// Exponer globalmente para uso en otros scripts
window.notificationService = notificationService;

export default notificationService;