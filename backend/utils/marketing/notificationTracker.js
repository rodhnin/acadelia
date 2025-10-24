// notificationTracker.js - Sistema de rastreo TRANSFORMADO PARA ACADELIA
// Rastrea elementos que pueden hacer viral al Profesor Acadel

class NotificationTracker {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.savedElements = {
      profiles: [],
      contents: [],
      trends: [],
      memory: []
    };
    this.sessionId = this.generateSessionId();
  }
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 🆕 NUEVA FUNCIÓN: Limpiar sección específica
  clearSection(section) {
    try {
      // Validar que la sección existe
      if (!this.savedElements.hasOwnProperty(section)) {
        return {
          success: false,
          error: `Sección ${section} no existe en el tracker`
        };
      }
      
      const previousCount = this.savedElements[section].length;
      
      // Limpiar la sección específica
      this.savedElements[section] = [];
      
      console.log(`🧹 Tracker: Limpiada sección ${section} (${previousCount} elementos eliminados)`);
      
      return {
        success: true,
        section: section,
        clearedCount: previousCount,
        remainingTotal: this.getTotalCount()
      };
      
    } catch (error) {
      console.error(`❌ Error limpiando sección ${section} en tracker:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // 🆕 NUEVA FUNCIÓN: Obtener conteo total actual
  getTotalCount() {
    return Object.values(this.savedElements).reduce((sum, arr) => sum + arr.length, 0);
  }
  
  // 🆕 NUEVA FUNCIÓN: Verificar si una sección tiene notificaciones
  hasNotificationsInSection(section) {
    return this.savedElements[section] && this.savedElements[section].length > 0;
  }
  
  // 🆕 NUEVA FUNCIÓN: Obtener conteo por sección específica
  getCountBySection(section) {
    return this.savedElements[section] ? this.savedElements[section].length : 0;
  }
  
  // ============== MÉTODOS TRANSFORMADOS PARA ACADELIA ==============
  
  // Registrar perfil guardado - ACADELIA VERSION
  trackProfile(profileData) {
    const notification = {
      id: profileData.id,
      type: 'profile',
      title: this.generateProfileTitle(profileData),
      description: this.generateProfileDescription(profileData),
      timestamp: new Date().toISOString(),
      data: profileData
    };
    
    this.savedElements.profiles.push(notification);
    console.log('📱 Futuro fan de Acadel rastreado:', notification.title);
    return notification;
  }
  
  // Registrar contenido guardado - ACADELIA VERSION
  trackContent(contentData) {
    const notification = {
      id: contentData.id,
      type: 'content',
      title: this.generateContentTitle(contentData),
      description: this.generateContentDescription(contentData),
      timestamp: new Date().toISOString(),
      data: contentData
    };
    
    this.savedElements.contents.push(notification);
    console.log('📱 Content viral de Acadel rastreado:', notification.title);
    return notification;
  }
  
  // Registrar tendencia guardada - ACADELIA VERSION
  trackTrend(trendData) {
    const notification = {
      id: trendData.id,
      type: 'trend',
      title: this.generateTrendTitle(trendData),
      description: this.generateTrendDescription(trendData),
      timestamp: new Date().toISOString(),
      data: trendData
    };
    
    this.savedElements.trends.push(notification);
    console.log('📱 Trend para Acadel rastreado:', notification.title);
    return notification;
  }
  
  // Registrar insight de memoria guardado - ACADELIA VERSION
  trackMemory(memoryData) {
    const notification = {
      id: memoryData.id,
      type: 'memory',
      title: this.generateMemoryTitle(memoryData),
      description: this.generateMemoryDescription(memoryData),
      timestamp: new Date().toISOString(),
      data: memoryData
    };
    
    this.savedElements.memory.push(notification);
    console.log('📱 Insight viral de Acadel rastreado:', notification.title);
    return notification;
  }
  
  // ============== GENERADORES DE TÍTULOS TRANSFORMADOS PARA ACADELIA ==============
  
  generateProfileTitle(profileData) {
    const metadata = profileData.metadata || profileData;
    const carrera = metadata.carrera || metadata.Carrera || 'Estudiante';
    const personalidad = metadata.personalidad || metadata.tipo_personalidad || '';
    
    // 🎯 CLASIFICACIÓN BASADA EN POTENCIAL CON ACADEL
    if (personalidad.toLowerCase().includes('ansioso') || 
        personalidad.includes('INFP') || 
        personalidad.includes('ISFP') ||
        metadata.ansiedad_academica) {
      return `${carrera} Ansioso - Perfect Acadel Material 🎯`;
    }
    
    if (personalidad.toLowerCase().includes('rebel') || 
        personalidad.includes('ENTP') || 
        personalidad.includes('ESTP') ||
        metadata.actitud?.includes('rebelde')) {
      return `${carrera} Rebelde - Acadel Fan Potential 🔥`;
    }
    
    if (personalidad.toLowerCase().includes('memero') || 
        personalidad.toLowerCase().includes('humor') ||
        metadata.hobbies?.includes('memes')) {
      return `${carrera} Memero - Acadel Tribe Member ✨`;
    }
    
    if (personalidad.toLowerCase().includes('procrastin') ||
        metadata.comportamiento?.includes('procrastina')) {
      return `${carrera} Procrastinador - Needs Acadel Motivation 💪`;
    }
    
    if (metadata.burnout || metadata.cansancio_academico) {
      return `${carrera} Quemado - Acadel Can Heal This 🦫`;
    }
    
    // Default con potencial
    return `${carrera} - Futuro Acadel Evangelista 🦫`;
  }
  
  generateProfileDescription(profileData) {
    const metadata = profileData.metadata || profileData;
    const nivel = metadata.nivel_academico || metadata.nivel || '';
    const edad = metadata.edad || metadata.Edad;
    const personalidad = metadata.personalidad || '';
    
    // 🎯 DESCRIPCIONES ENFOCADAS EN POTENCIAL CON ACADEL
    if (personalidad.toLowerCase().includes('ansioso')) {
      return `${edad ? edad + ' años, ' : ''}Necesita tough love de Acadel`;
    }
    
    if (personalidad.toLowerCase().includes('humor') || metadata.hobbies?.includes('memes')) {
      return `${edad ? edad + ' años, ' : ''}Speaks Acadel's humor language`;
    }
    
    if (personalidad.toLowerCase().includes('rebel')) {
      return `${edad ? edad + ' años, ' : ''}Anti-establishment like Acadel`;
    }
    
    // Descripción basada en carrera + nivel
    if (nivel) {
      return `${nivel}${edad ? `, ${edad} años` : ''} - Ready for Acadel wisdom`;
    }
    
    return `${edad ? edad + ' años, ' : ''}Prime candidate for Acadel conversion`;
  }
  
  generateContentTitle(contentData) {
    const type = contentData.type || 'content';
    const channel = contentData.channel || '';
    const payload = contentData.payload || {};
    
    // 🎯 EMOJIS Y CLASIFICACIÓN VIRAL
    const typeViralEmojis = {
      'meme': '😂',
      'video': '🎬', 
      'tiktok': '📱',
      'post': '📝',
      'campaign': '🚀',
      'story': '📖',
      'email': '📧',
      'reel': '🎭'
    };
    
    const emoji = typeViralEmojis[type.toLowerCase()] || '✨';
    
    // 🔥 DETECTAR POTENCIAL VIRAL EN EL CONTENIDO
    const viralIndicators = [
      payload.viral_potential,
      payload.shareability,
      payload.humor_level,
      payload.acadel_personality
    ].filter(Boolean);
    
    const viralLevel = viralIndicators.length > 2 ? 'VIRAL' : 
                     viralIndicators.length > 1 ? 'Trending' : 
                     'Content';
    
    if (channel) {
      return `${viralLevel} ${type} para ${channel} ${emoji}`;
    }
    return `${viralLevel} Acadel ${type} ${emoji}`;
  }
  
  generateContentDescription(contentData) {
    const payload = contentData.payload || {};
    const type = contentData.type || '';
    
    // 🎯 DESCRIPCIONES ENFOCADAS EN ACADEL Y VIRALIDAD
    if (payload.acadel_personality) {
      return `Acadel siendo ${payload.acadel_personality} - Peak content`;
    }
    
    if (payload.viral_potential === 'high' || payload.shareability > 0.8) {
      return `🔥 HIGH VIRAL POTENTIAL - Students will share this`;
    }
    
    if (payload.humor_level === 'high' || payload.target_emotion?.includes('humor')) {
      return `😂 Peak Acadel humor - Gen Z will love this`;
    }
    
    // Contenido específico por tipo
    if (type === 'meme' && payload.caption) {
      return `"${payload.caption.substring(0, 50)}..." - Meme gold`;
    }
    
    if (payload.titulo || payload.title) {
      const title = payload.titulo || payload.title;
      return title.length > 60 ? `${title.substring(0, 60)}...` : title;
    }
    
    if (payload.descripcion || payload.description) {
      const desc = payload.descripcion || payload.description;
      return desc.length > 60 ? `${desc.substring(0, 60)}...` : desc;
    }
    
    return `Nuevo content que hará viral a Acadel`;
  }
  
  generateTrendTitle(trendData) {
    const theme = trendData.theme || trendData.title || 'Nueva tendencia';
    const popularity = trendData.popularity || 0;
    
    // 🎯 CLASIFICACIÓN POR POTENCIAL VIRAL
    if (popularity > 0.8) {
      return `🔥 MEGA TREND: ${theme.substring(0, 25)} - Acadel MUST dominate`;
    }
    if (popularity > 0.6) {
      return `📈 Rising Fast: ${theme.substring(0, 30)} - Acadel opportunity`;
    }
    if (popularity > 0.4) {
      return `👀 Emerging: ${theme.substring(0, 35)} - Watch for Acadel`;
    }
    
    return `🌱 New: ${theme.substring(0, 40)} - Acadel potential`;
  }
  
  generateTrendDescription(trendData) {
    const popularity = trendData.popularity || 0;
    const metadata = trendData.metadata || {};
    
    // 🎯 DESCRIPCIONES ENFOCADAS EN OPORTUNIDAD PARA ACADEL
    const percentage = Math.round(popularity * 100);
    
    if (popularity > 0.8) {
      return `${percentage}% popularidad - CRITICAL for Acadel to join NOW`;
    }
    if (popularity > 0.6) {
      return `${percentage}% popularidad - Perfect timing for Acadel entry`;
    }
    if (popularity > 0.4) {
      return `${percentage}% popularidad - Early Acadel adoption opportunity`;
    }
    
    // Información adicional si está disponible
    if (metadata.carreras_afectadas) {
      return `${percentage}% popularidad - Affects ${metadata.carreras_afectadas.join(', ')}`;
    }
    
    return `${percentage}% popularidad - Monitoring for Acadel potential`;
  }
  
  generateMemoryTitle(memoryData) {
    const content = memoryData.content || {};
    const importance = memoryData.importance || 0;
    const type = memoryData.type || '';
    
    // 🎯 TÍTULOS ENFOCADOS EN VALOR PARA ACADEL
    if (content.insight) {
      const insight = content.insight.substring(0, 35);
      
      if (importance > 0.9) {
        return `🧠 GAME CHANGER: ${insight}... - Acadel Empire Builder`;
      }
      if (importance > 0.8) {
        return `🧠 CRITICAL INSIGHT: ${insight}... - Viral Potential`;
      }
      if (importance > 0.7) {
        return `💡 Key Learning: ${insight}... - Acadel Growth`;
      }
      
      return `💡 Insight: ${insight}... - Building Acadel wisdom`;
    }
    
    // Títulos por tipo de memoria
    if (type.includes('viral') || type.includes('trend')) {
      return `🚀 Viral Intelligence - Acadel Strategy Update`;
    }
    if (type.includes('student') || type.includes('profile')) {
      return `🎯 Student Psychology - Acadel Connection Intel`;
    }
    if (type.includes('content') || type.includes('campaign')) {
      return `🎬 Content Formula - Acadel Viral Recipe`;
    }
    
    return `🧠 Acadel Brain Expansion - New Neural Pathway`;
  }
  
  generateMemoryDescription(memoryData) {
    const type = memoryData.type || 'insight';
    const importance = memoryData.importance || 0;
    const content = memoryData.content || {};
    
    // 🎯 DESCRIPCIONES ENFOCADAS EN VALOR ESTRATÉGICO PARA ACADEL
    let description = '';
    
    // Descripción basada en importancia
    if (importance >= 0.9) {
      description = `🔥 TRANSFORMATIONAL - Can make Acadel viral`;
    } else if (importance >= 0.8) {
      description = `⭐ HIGH IMPACT - Significant for Acadel growth`;
    } else if (importance >= 0.7) {
      description = `💎 VALUABLE - Important for Acadel strategy`;
    } else if (importance >= 0.6) {
      description = `📈 USEFUL - Helps Acadel connection`;
    } else {
      description = `📝 NOTED - Basic Acadel intelligence`;
    }
    
    // Información adicional según tipo
    if (type.includes('viral')) {
      description += ` | Viralidad pattern`;
    } else if (type.includes('student') || type.includes('profile')) {
      description += ` | Student behavior`;
    } else if (type.includes('content')) {
      description += ` | Content optimization`;
    } else if (type.includes('trend')) {
      description += ` | Trend analysis`;
    }
    
    // Si hay información específica sobre audiencia
    if (content.target_audience || content.carrera) {
      const audience = content.target_audience || content.carrera;
      description += ` | Target: ${audience}`;
    }
    
    return description;
  }
  
  // ============== MÉTODOS ORIGINALES (SIN CAMBIOS) ==============
  
  // Obtener resumen de notificaciones
  getNotificationSummary() {
    const summary = {
      total: 0,
      byType: {
        profiles: this.savedElements.profiles.length,
        contents: this.savedElements.contents.length,
        trends: this.savedElements.trends.length,
        memory: this.savedElements.memory.length
      },
      notifications: {
        profiles: this.savedElements.profiles,
        contents: this.savedElements.contents,
        trends: this.savedElements.trends,
        memory: this.savedElements.memory
      },
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };
    
    summary.total = Object.values(summary.byType).reduce((sum, count) => sum + count, 0);
    
    return summary;
  }
  
  // Verificar si hay notificaciones
  hasNotifications() {
    return this.savedElements.profiles.length > 0 ||
           this.savedElements.contents.length > 0 ||
           this.savedElements.trends.length > 0 ||
           this.savedElements.memory.length > 0;
  }
  
  // Obtener conteo por tipo
  getCountByType(type) {
    return this.savedElements[type]?.length || 0;
  }
  
  // Método para debug - ACTUALIZADO CON ACADELIA VIBE
  logSummary() {
    const summary = this.getNotificationSummary();
    console.log('📊 Acadel Empire Building Progress:', {
      total: summary.total,
      'Futuros Fans': summary.byType.profiles,
      'Content Viral': summary.byType.contents,
      'Trends Dominables': summary.byType.trends,
      'Wisdom Gained': summary.byType.memory
    });
  }
}

// Instancia global del tracker
const notificationTracker = new NotificationTracker();

export { notificationTracker, NotificationTracker };