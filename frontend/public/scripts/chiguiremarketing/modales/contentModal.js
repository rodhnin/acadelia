// contentModal.js - Modal de contenido con dashboard avanzado - CORREGIDO
import { getContents, deleteContent, deleteAllContents } from '../api/marketingAPI.js';
import { 
  formatNumber, 
  formatPercentage, 
  formatDate, 
  formatRelativeDate,
  formatChannelName,
  formatContentType
} from '../utils/formatting-marketing.js';

let contentData = [];
let filteredContent = [];
let currentView = 'grid';
let typeChart = null;
let channelChart = null;

let modalBodyEventAttached = false;

export function initContentModal() {
  console.log('🎨 Inicializando modal de contenido...');
  
  const modal = document.getElementById('contentModal');
  if (!modal) {
    console.error('Modal de contenido no encontrada');
    return;
  }
  
  cleanupEventListeners();
  
  modal.addEventListener('modal:open', handleContentModalOpen);
  
  // También escuchar el evento de apertura estándar
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'class' && 
          modal.classList.contains('active')) {
        handleContentModalOpen();
      }
    });
  });
  
  observer.observe(modal, { attributes: true });
  
  console.log('✅ Modal de contenido inicializada');
}

function cleanupEventListeners() {
  modalBodyEventAttached = false;
  
  const modalBody = document.querySelector('#contentModal .modal-body');
  if (modalBody && modalBody._contentClickHandler) {
    modalBody.removeEventListener('click', modalBody._contentClickHandler);
    delete modalBody._contentClickHandler;
  }
}

async function handleContentModalOpen() {
  console.log('📋 Abriendo modal de contenido...');
  
  if (window._contentModalLoading) {
    console.log('⚠️ Modal ya se está cargando, ignorando...');
    return;
  }
  
  window._contentModalLoading = true;
  
  try {
    showContentLoading();
    
    await loadContentData();
    
    const modalBody = document.querySelector('#contentModal .modal-body');
    createContentDashboardStructure(modalBody);
    
    renderContentDashboard();
    
    setupContentEvents();
    
    console.log('✅ Dashboard de contenido cargado correctamente');
  } catch (error) {
    console.error('❌ Error cargando dashboard de contenido:', error);
    showContentError(error);
  } finally {
    window._contentModalLoading = false;
  }
}

function showContentLoading() {
  const modalBody = document.querySelector('#contentModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="content-loading">
        <div class="spinner"></div>
        <p>Cargando análisis de contenido...</p>
      </div>
    `;
  }
}

function showContentError(error) {
  const modalBody = document.querySelector('#contentModal .modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div class="content-no-data">
        <i class='bx bx-error-circle'></i>
        <span>Error cargando contenido: ${error.message}</span>
        <button onclick="window.handleContentModalOpen()" style="margin-top: 16px; padding: 8px 16px; background: var(--color-primary-light); color: white; border: none; border-radius: 6px; cursor: pointer;">
          Reintentar
        </button>
      </div>
    `;
  }
}

function createContentDashboardStructure(container) {
  container.innerHTML = `
    <div class="content-dashboard-container">
      <!-- Header del Dashboard -->
      <div class="content-dashboard-header">
        <h1>Dashboard de Contenido</h1>
        <div class="content-dashboard-controls">
          <div class="content-search-bar">
            <input type="text" class="content-search-input" placeholder="Buscar contenido..." id="contentSearchInput">
            <i class='bx bx-search'></i>
          </div>
          <select class="content-filter-select" id="contentTypeFilter">
            <option value="">Todos los tipos</option>
            <option value="meme">Memes</option>
            <option value="video">Videos</option>
            <option value="campaign">Campañas</option>
            <option value="email">Emails</option>
            <option value="post">Posts</option>
          </select>
          <select class="content-filter-select" id="contentChannelFilter">
            <option value="">Todos los canales</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Email">Email</option>
            <option value="YouTube">YouTube</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>
          <button class="content-refresh-button" id="contentRefreshBtn" title="Actualizar datos">
            <i class='bx bx-refresh'></i>
          </button>
          <!-- BOTÓN PARA ELIMINAR TODOS LOS CONTENIDOS -->
          <button class="content-reset-button" id="contentResetBtn" title="Eliminar todo el contenido">
            <i class='bx bx-trash'></i>
            <span>Eliminar Todo</span>
          </button>
        </div>
      </div>

      <!-- Tarjetas de Resumen -->
      <div class="content-summary-cards" id="contentSummaryCards">
        <div class="content-loading">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Grid Principal -->
      <div class="content-main-grid">
        <!-- Lista de Contenido -->
        <div class="content-list-section">
          <div class="content-list-header">
            <h2><i class='bx bx-list-ul'></i> Contenido Generado</h2>
            <div class="content-list-controls">
              <div class="content-view-toggle">
                <button class="content-view-btn active" data-view="grid" title="Vista de tarjetas">
                  <i class='bx bx-grid-alt'></i>
                </button>
                <button class="content-view-btn" data-view="list" title="Vista de lista">
                  <i class='bx bx-list-ul'></i>
                </button>
              </div>
            </div>
          </div>
          <div class="content-content" id="contentList">
            <!-- Se llenará dinámicamente -->
          </div>
        </div>
        
        <!-- Distribución por Tipo -->
        <div class="content-analytics-section">
          <h2><i class='bx bx-pie-chart-alt-2'></i> Distribución por Tipo</h2>
          <div class="content-chart-wrapper">
            <div class="type-chart-container">
              <div class="type-chart-canvas">
                <canvas id="typeDistributionChart"></canvas>
              </div>
              <div class="type-stats" id="typeStats">
                <!-- Se llenarán dinámicamente -->
              </div>
            </div>
          </div>
        </div>

        <!-- Distribución por Canal -->
        <div class="content-analytics-section">
          <h2><i class='bx bx-broadcast'></i> Distribución por Canal</h2>
          <div class="content-chart-wrapper">
            <div class="channel-distribution" id="channelDistribution">
              <!-- Se llenará dinámicamente -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN PARA ELIMINAR CONTENIDO INDIVIDUAL -->
    <div class="content-delete-modal" id="contentDeleteModal">
      <div class="content-delete-content">
        <div class="content-delete-header">
          <h3>🗑️ Eliminar Contenido</h3>
          <button class="content-delete-close">×</button>
        </div>
        <div class="content-delete-body">
          <div class="content-delete-warning">
            <i class='bx bx-info-circle'></i>
            <p><strong>¿Estás seguro?</strong> Esta acción eliminará este contenido del sistema.</p>
          </div>
          <div class="content-delete-preview">
            <h4>Contenido a eliminar:</h4>
            <div class="content-delete-content-preview"></div>
          </div>
          <div class="content-delete-confirmation">
            <p>Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div class="content-delete-footer">
          <button class="content-delete-cancel">Cancelar</button>
          <button class="content-delete-confirm">Sí, eliminar</button>
        </div>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN PARA ELIMINAR TODO EL CONTENIDO -->
    <div class="content-reset-modal" id="contentResetModal">
      <div class="content-reset-content">
        <div class="content-reset-header">
          <h3>⚠️ Eliminar Todo el Contenido</h3>
          <button class="content-reset-close">×</button>
        </div>
        <div class="content-reset-body">
          <div class="content-reset-warning">
            <i class='bx bx-error-circle'></i>
            <p><strong>¡ATENCIÓN!</strong> Esta acción eliminará completamente todo el contenido generado.</p>
          </div>
          <div class="content-reset-details">
            <h4>Esto significa que se perderán:</h4>
            <ul>
              <li>Todos los contenidos generados (${contentData.length} contenidos)</li>
              <li>Todos los memes, videos, campañas y posts</li>
              <li>Las interacciones y estadísticas asociadas</li>
              <li>Todo el historial de contenido creado</li>
            </ul>
          </div>
          <div class="content-reset-confirmation">
            <h4>¿Estás seguro de que quieres continuar?</h4>
            <p>Esta acción es <strong>irreversible</strong> y eliminará completamente todo el contenido.</p>
          </div>
        </div>
        <div class="content-reset-footer">
          <button class="content-reset-cancel">Cancelar</button>
          <button class="content-reset-confirm">Sí, eliminar todo</button>
        </div>
      </div>
    </div>
  `;
}

function extractContentInfo(payload) {
  if (!payload) return { 
    title: 'Sin título', 
    description: 'Sin descripción', 
    theme: null, 
    additional: [],
    enrichedContext: null 
  };
  
  let title = 'Sin título';
  let description = 'Sin descripción';
  let theme = null;
  let additional = [];
  let enrichedContext = {}; // NUEVO: Contexto enriquecido
  
  if (payload.theme) {
    theme = payload.theme;
  }
  
  if (payload.title) {
    title = payload.title;
  } else if (payload.meme?.titulo) {
    title = payload.meme.titulo;
  } else if (payload.meme?.caption) {
    title = payload.meme.caption;
  } else if (payload.video?.titulo) {
    title = payload.video.titulo;
  } else if (payload.contenido_video?.titulo) {
    title = payload.contenido_video.titulo;
  } else if (payload.titulo) {
    title = payload.titulo;
  } else if (payload.email?.subject) {
    title = payload.email.subject;
  } else if (payload.campaign?.name) {
    title = payload.campaign.name;
  } else if (payload.post?.punchline) {
    title = payload.post.punchline;
  } else if (payload.post?.opening_hook) {
    title = payload.post.opening_hook;
  } else if (theme) {
    title = theme;
  }
  
  if (payload.description) {
    description = payload.description;
  } else if (payload.meme?.descripcion) {
    description = payload.meme.descripcion;
  } else if (payload.meme?.punchline) {
    description = payload.meme.punchline;
  } else if (payload.text) {
    description = payload.text;
  } else if (payload.video?.contenido?.introduccion?.texto) {
    description = payload.video.contenido.introduccion.texto;
  } else if (payload.contenido_video?.descripcion) {
    description = payload.contenido_video.descripcion;
  } else if (payload.caption) {
    description = payload.caption;
  } else if (payload.email?.body_preview) {
    description = payload.email.body_preview;
  } else if (payload.campaign?.description) {
    description = payload.campaign.description;
  } else if (payload.post?.main_content) {
    description = payload.post.main_content;
  } else if (payload.post?.opening_hook) {
    description = payload.post.opening_hook;
  } else if (payload.post?.content) {
    description = payload.post.content;
  }
  
  
  if (payload.meme) {
    const meme = payload.meme;
    
    enrichedContext.type = 'meme';
    enrichedContext.memeData = {
      formato: meme.formato || null,
      target_emotion: meme.target_emotion || meme.targetEmotion || null,
      educational_value: meme.educational_value || meme.educationalValue || null,
      shareability: meme.shareability || null,
      relatability_factor: meme.relatability_factor || meme.relatabilityFactor || null,
      texto_principal: meme.texto_principal || meme.textoPrincipal || null,
      punchline: meme.punchline || null,
      acadel_role: meme.acadel_role || meme.acadelRole || null
    };
    
    // Elementos visuales específicos
    if (meme.visual_elements || meme.visualElements || meme.elementos_visuales) {
      const visuales = meme.visual_elements || meme.visualElements || meme.elementos_visuales;
      enrichedContext.memeData.visualElements = {
        props: visuales.props || null,
        background: visuales.background || null,
        text_style: visuales.text_style || visuales.textStyle || null,
        acadel_expression: visuales.acadel_expression || visuales.acadelExpression || null,
        escena: visuales.escena || null,
        texto_meme: visuales.texto_meme || visuales.textoMeme || null,
        estilo_visual: visuales.estilo_visual || visuales.estiloVisual || null
      };
    }
    
    // Target específico del meme
    if (meme.target) {
      enrichedContext.memeData.target = {
        carrera: meme.target.carrera || null,
        momento: meme.target.momento || null,
        accion_deseada: meme.target.accion_deseada || meme.target.accionDeseada || null,
        emocion_objetivo: meme.target.emocion_objetivo || meme.target.emocionObjetivo || null
      };
    }
    
    // Hashtags específicos del meme
    if (meme.hashtags && Array.isArray(meme.hashtags)) {
      enrichedContext.memeData.hashtags = meme.hashtags;
    }
  }
  
  if (payload.video || payload.contenido_video) {
    const video = payload.video || payload.contenido_video;
    
    enrichedContext.type = 'video';
    enrichedContext.videoData = {
      duracion: video.duracion || video.duration || null,
      plataforma: video.plataforma || video.platform || null,
      estilo: video.estilo || video.style || null,
      estructura: video.estructura || video.structure || null
    };
    
    // Contenido del video
    if (video.contenido) {
      enrichedContext.videoData.contenido = {
        introduccion: video.contenido.introduccion?.texto || null,
        desarrollo: video.contenido.desarrollo || null,
        conclusion: video.contenido.conclusion?.texto || null,
        secciones: video.contenido.desarrollo?.secciones || null
      };
    }
    
    // Elementos visuales del video
    if (video.elementos_visuales || video.elementosVisuales) {
      const visuales = video.elementos_visuales || video.elementosVisuales;
      enrichedContext.videoData.visualElements = {
        musica: visuales.musica || visuales.music || null,
        animaciones: visuales.animaciones || visuales.animations || null,
        transiciones: visuales.transiciones || visuales.transitions || null,
        colores: visuales.colores || visuales.colors || null
      };
    }
    
    // Hashtags del video
    if (video.hashtags && Array.isArray(video.hashtags)) {
      enrichedContext.videoData.hashtags = video.hashtags;
    }
  }
  
  if (payload.email) {
    const email = payload.email;
    
    enrichedContext.type = 'email';
    enrichedContext.emailData = {
      subject: email.subject || null,
      body_preview: email.body_preview || email.bodyPreview || null,
      cta: email.cta || null,
      tone: email.tone || email.tono || null,
      target_audience: email.target_audience || email.targetAudience || null,
      personalization: email.personalization || email.personalizacion || null
    };
    
    // Estructura del email
    if (email.estructura || email.structure) {
      enrichedContext.emailData.estructura = email.estructura || email.structure;
    }
    
    // Elementos de diseño
    if (email.design_elements || email.elementosDiseno) {
      enrichedContext.emailData.designElements = email.design_elements || email.elementosDiseno;
    }
  }
  
  if (payload.campaign) {
    const campaign = payload.campaign;
    
    enrichedContext.type = 'campaign';
    enrichedContext.campaignData = {
      name: campaign.name || null,
      core_message: campaign.core_message || campaign.coreMessage || null,
      duration: campaign.duration || campaign.duracion || null,
      budget: campaign.budget || campaign.presupuesto || null,
      objectives: campaign.objectives || campaign.objetivos || null
    };
    
    // Fases de la campaña
    if (campaign.phases || campaign.fases) {
      enrichedContext.campaignData.phases = campaign.phases || campaign.fases;
    }
    
    // Canales de la campaña
    if (campaign.channels || campaign.canales) {
      enrichedContext.campaignData.channels = campaign.channels || campaign.canales;
    }
    
    // KPIs
    if (campaign.kpis) {
      enrichedContext.campaignData.kpis = campaign.kpis;
    }
  }

  if (payload.post) {
    const post = payload.post;
    
    enrichedContext.type = 'post';
    enrichedContext.postData = {
      opening_hook: post.opening_hook || post.openingHook || null,
      main_content: post.main_content || post.mainContent || null,
      punchline: post.punchline || null,
      acadel_personality: post.acadel_personality || post.acadelPersonality || null,
      relatability_factor: post.relatability_factor || post.relatabilityFactor || null
    };
    
    // Potencial viral con subcampos detallados
    if (post.viral_potential || post.viralPotential) {
      const viral = post.viral_potential || post.viralPotential;
      enrichedContext.postData.viralPotential = {
        save_worthy: viral.save_worthy || viral.saveWorthy || null,
        share_trigger: viral.share_trigger || viral.shareTrigger || null,
        comment_magnet: viral.comment_magnet || viral.commentMagnet || null,
        trend_potential: viral.trend_potential || viral.trendPotential || null
      };
    }
    
    // Sugerencias visuales específicas
    if (post.visual_suggestion || post.visualSuggestion) {
      const visual = post.visual_suggestion || post.visualSuggestion;
      enrichedContext.postData.visualSuggestion = {
        mood: visual.mood || null,
        background: visual.background || null,
        acadel_pose: visual.acadel_pose || visual.acadelPose || null,
        text_overlay: visual.text_overlay || visual.textOverlay || null
      };
    }
    
    // Elementos de engagement detallados
    if (post.engagement_elements || post.engagementElements) {
      const engagement = post.engagement_elements || post.engagementElements;
      enrichedContext.postData.engagementElements = {
        humor: engagement.humor || null,
        question: engagement.question || null,
        validation: engagement.validation || null,
        controversy: engagement.controversy || null
      };
    }
    
    // Target específico del post
    if (post.target) {
      enrichedContext.postData.target = {
        carrera: post.target.carrera || null,
        momento: post.target.momento || null,
        accion_deseada: post.target.accion_deseada || post.target.accionDeseada || null,
        emocion_objetivo: post.target.emocion_objetivo || post.target.emocionObjetivo || null
      };
    }
    
    // Hashtags específicos del post
    if (post.hashtags && Array.isArray(post.hashtags)) {
      enrichedContext.postData.hashtags = post.hashtags;
    }
  }

  if (enrichedContext.type === 'post' && enrichedContext.postData) {
    const post = enrichedContext.postData;
    
    if (post.opening_hook) {
      additional.push({ 
        icon: 'bx bx-hook', 
        label: 'Hook de apertura', 
        value: post.opening_hook.substring(0, 50) + '...',
        category: 'content'
      });
    }
    
    if (post.punchline) {
      additional.push({ 
        icon: 'bx bx-message-square-dots', 
        label: 'Punchline', 
        value: post.punchline.substring(0, 50) + '...',
        category: 'content'
      });
    }
    
    if (post.acadel_personality) {
      additional.push({ 
        icon: 'bx bx-user-voice', 
        label: 'Personalidad Acadel', 
        value: post.acadel_personality.substring(0, 45) + '...',
        category: 'personality'
      });
    }
    
    if (post.relatability_factor) {
      additional.push({ 
        icon: 'bx bx-group', 
        label: 'Factor de identificación', 
        value: post.relatability_factor.substring(0, 50) + '...',
        category: 'psychological'
      });
    }
    
    // Potencial viral
    if (post.viralPotential) {
      if (post.viralPotential.save_worthy) {
        additional.push({ 
          icon: 'bx bx-bookmark', 
          label: 'Potencial para guardar', 
          value: post.viralPotential.save_worthy.substring(0, 45) + '...',
          category: 'viral'
        });
      }
      
      if (post.viralPotential.share_trigger) {
        additional.push({ 
          icon: 'bx bx-share-alt', 
          label: 'Trigger de compartir', 
          value: post.viralPotential.share_trigger.substring(0, 45) + '...',
          category: 'viral'
        });
      }
      
      if (post.viralPotential.comment_magnet) {
        additional.push({ 
          icon: 'bx bx-comment-dots', 
          label: 'Imán de comentarios', 
          value: post.viralPotential.comment_magnet.substring(0, 45) + '...',
          category: 'engagement'
        });
      }
      
      if (post.viralPotential.trend_potential) {
        additional.push({ 
          icon: 'bx bx-trending-up', 
          label: 'Potencial de trend', 
          value: post.viralPotential.trend_potential.substring(0, 45) + '...',
          category: 'viral'
        });
      }
    }
    
    // Sugerencias visuales
    if (post.visualSuggestion) {
      if (post.visualSuggestion.mood) {
        additional.push({ 
          icon: 'bx bx-palette', 
          label: 'Mood visual', 
          value: post.visualSuggestion.mood.substring(0, 40) + '...',
          category: 'visual'
        });
      }
      
      if (post.visualSuggestion.acadel_pose) {
        additional.push({ 
          icon: 'bx bx-user-circle', 
          label: 'Pose de Acadel', 
          value: post.visualSuggestion.acadel_pose.substring(0, 40) + '...',
          category: 'visual'
        });
      }
      
      if (post.visualSuggestion.background) {
        additional.push({ 
          icon: 'bx bx-landscape', 
          label: 'Fondo sugerido', 
          value: post.visualSuggestion.background.substring(0, 40) + '...',
          category: 'visual'
        });
      }
    }
    
    // Elementos de engagement
    if (post.engagementElements) {
      if (post.engagementElements.humor) {
        additional.push({ 
          icon: 'bx bx-laugh', 
          label: 'Elemento de humor', 
          value: post.engagementElements.humor.substring(0, 45) + '...',
          category: 'engagement'
        });
      }
      
      if (post.engagementElements.question) {
        additional.push({ 
          icon: 'bx bx-help-circle', 
          label: 'Pregunta de engagement', 
          value: post.engagementElements.question.substring(0, 45) + '...',
          category: 'engagement'
        });
      }
      
      if (post.engagementElements.controversy) {
        additional.push({ 
          icon: 'bx bx-fire', 
          label: 'Element controversia', 
          value: post.engagementElements.controversy.substring(0, 45) + '...',
          category: 'engagement'
        });
      }
    }
  } 


  
  // Target Audience Enriquecido
  let targetAudience = null;
  if (payload.targetAudience || payload.target_audience) {
    targetAudience = payload.targetAudience || payload.target_audience;
  } else if (payload.meme?.target) {
    targetAudience = payload.meme.target;
  } else if (payload.video?.target) {
    targetAudience = payload.video.target;
  } else if (payload.email?.target_audience) {
    targetAudience = payload.email.target_audience;
  } else if (payload.post?.target) {
    targetAudience = payload.post.target;
  }

  if (targetAudience) {
    enrichedContext.targetAudience = {
      carrera: targetAudience.carrera || null,
      edad: targetAudience.edad || targetAudience.age || null,
      nivel_academico: targetAudience.nivel_academico || targetAudience.academicLevel || null,
      curso: targetAudience.curso || targetAudience.course || null,
      hobbies: targetAudience.hobbies || targetAudience.intereses || null,
      momento: targetAudience.momento || targetAudience.timing || null,
      accion_deseada: targetAudience.accion_deseada || targetAudience.desiredAction || targetAudience.desired_action || null,
      emocion_objetivo: targetAudience.emocion_objetivo || targetAudience.targetEmotion || targetAudience.emotional_state || null
    };
    
    // Actitudes si están disponibles
    if (targetAudience.actitudes || targetAudience.attitudes) {
      enrichedContext.targetAudience.attitudes = targetAudience.actitudes || targetAudience.attitudes;
    }
    
    // Canales preferidos
    if (targetAudience.canales_preferidos || targetAudience.preferredChannels) {
      enrichedContext.targetAudience.preferredChannels = targetAudience.canales_preferidos || targetAudience.preferredChannels;
    }
    
    // Desafíos
    if (targetAudience.desafíos || targetAudience.challenges) {
      enrichedContext.targetAudience.challenges = targetAudience.desafíos || targetAudience.challenges;
    }
    
    // Campos específicos para posts
    if (targetAudience.community_impact) {
      enrichedContext.targetAudience.community_impact = targetAudience.community_impact;
    }
  }
  
  // Hashtags Generales
  let hashtags = null;
  if (payload.hashtags && Array.isArray(payload.hashtags)) {
    hashtags = payload.hashtags;
  } else if (payload.meme?.hashtags) {
    hashtags = payload.meme.hashtags;
  } else if (payload.video?.hashtags) {
    hashtags = payload.video.hashtags;
  } else if (payload.email?.hashtags) {
    hashtags = payload.email.hashtags;
  } else if (payload.post?.hashtags) {
    hashtags = payload.post.hashtags;
  }

  if (hashtags) {
    enrichedContext.hashtags = hashtags;
  }
  
  // CTA General
  if (payload.cta) {
    enrichedContext.cta = payload.cta;
  } else if (payload.meme?.target?.accion_deseada) {
    enrichedContext.cta = payload.meme.target.accion_deseada;
  } else if (payload.email?.cta) {
    enrichedContext.cta = payload.email.cta;
  } else if (payload.post?.target?.accion_deseada) {
    enrichedContext.cta = payload.post.target.accion_deseada;
  }
  
  additional = []; // Resetear array
  
  if (enrichedContext.type === 'meme' && enrichedContext.memeData) {
    const meme = enrichedContext.memeData;
    
    if (meme.formato) {
      additional.push({ 
        icon: 'bx bx-image', 
        label: 'Formato', 
        value: meme.formato,
        category: 'visual'
      });
    }
    
    if (meme.target_emotion) {
      additional.push({ 
        icon: 'bx bx-happy-heart-eyes', 
        label: 'Emoción objetivo', 
        value: meme.target_emotion,
        category: 'psychological'
      });
    }
    
    if (meme.shareability) {
      additional.push({ 
        icon: 'bx bx-share-alt', 
        label: 'Factor viral', 
        value: meme.shareability.substring(0, 60) + '...',
        category: 'engagement'
      });
    }
    
    if (meme.relatability_factor) {
      additional.push({ 
        icon: 'bx bx-group', 
        label: 'Identificación', 
        value: meme.relatability_factor.substring(0, 50) + '...',
        category: 'psychological'
      });
    }
    
    if (meme.educational_value) {
      additional.push({ 
        icon: 'bx bx-brain', 
        label: 'Valor educativo', 
        value: meme.educational_value.substring(0, 50) + '...',
        category: 'educational'
      });
    }
    
    if (meme.visualElements?.props) {
      additional.push({ 
        icon: 'bx bx-cube', 
        label: 'Props visuales', 
        value: meme.visualElements.props.substring(0, 40) + '...',
        category: 'visual'
      });
    }
    
    if (meme.visualElements?.background) {
      additional.push({ 
        icon: 'bx bx-landscape', 
        label: 'Escenario', 
        value: meme.visualElements.background.substring(0, 40) + '...',
        category: 'visual'
      });
    }
  }
  
  if (enrichedContext.type === 'video' && enrichedContext.videoData) {
    const video = enrichedContext.videoData;
    
    if (video.duracion) {
      additional.push({ 
        icon: 'bx bx-time', 
        label: 'Duración', 
        value: video.duracion,
        category: 'technical'
      });
    }
    
    if (video.plataforma) {
      additional.push({ 
        icon: 'bx bx-devices', 
        label: 'Plataforma', 
        value: video.plataforma,
        category: 'distribution'
      });
    }
    
    if (video.contenido?.secciones) {
      additional.push({ 
        icon: 'bx bx-list-ol', 
        label: 'Secciones', 
        value: `${video.contenido.secciones.length} partes`,
        category: 'structure'
      });
    }
    
    if (video.visualElements?.musica) {
      additional.push({ 
        icon: 'bx bx-music', 
        label: 'Música', 
        value: video.visualElements.musica.substring(0, 40) + '...',
        category: 'audio'
      });
    }
    
    if (video.visualElements?.animaciones) {
      additional.push({ 
        icon: 'bx bx-movie-play', 
        label: 'Animaciones', 
        value: video.visualElements.animaciones.substring(0, 40) + '...',
        category: 'visual'
      });
    }
  }
  
  if (enrichedContext.type === 'email' && enrichedContext.emailData) {
    const email = enrichedContext.emailData;
    
    if (email.tone) {
      additional.push({ 
        icon: 'bx bx-message-dots', 
        label: 'Tono', 
        value: email.tone,
        category: 'tone'
      });
    }
    
    if (email.personalization) {
      additional.push({ 
        icon: 'bx bx-user-circle', 
        label: 'Personalización', 
        value: email.personalization.substring(0, 40) + '...',
        category: 'personalization'
      });
    }
  }
  
  if (enrichedContext.type === 'campaign' && enrichedContext.campaignData) {
    const campaign = enrichedContext.campaignData;
    
    if (campaign.duration) {
      additional.push({ 
        icon: 'bx bx-calendar', 
        label: 'Duración', 
        value: campaign.duration,
        category: 'timeline'
      });
    }
    
    if (campaign.phases && Array.isArray(campaign.phases)) {
      additional.push({ 
        icon: 'bx bx-trending-up', 
        label: 'Fases', 
        value: `${campaign.phases.length} etapas`,
        category: 'structure'
      });
    }
    
    if (campaign.budget) {
      additional.push({ 
        icon: 'bx bx-dollar-circle', 
        label: 'Presupuesto', 
        value: campaign.budget,
        category: 'financial'
      });
    }
  }
  
  if (enrichedContext.targetAudience) {
    const target = enrichedContext.targetAudience;
    
    if (target.carrera) {
      additional.push({ 
        icon: 'bx bx-graduation', 
        label: 'Carrera objetivo', 
        value: target.carrera,
        category: 'audience'
      });
    }
    
    if (target.edad) {
      additional.push({ 
        icon: 'bx bx-user', 
        label: 'Edad', 
        value: target.edad,
        category: 'demographic'
      });
    }
    
    if (target.momento) {
      additional.push({ 
        icon: 'bx bx-time-five', 
        label: 'Momento ideal', 
        value: target.momento.substring(0, 50) + '...',
        category: 'timing'
      });
    }
    
    if (target.challenges && Array.isArray(target.challenges)) {
      additional.push({ 
        icon: 'bx bx-shield-quarter', 
        label: 'Desafíos', 
        value: target.challenges.slice(0, 2).join(', '),
        category: 'challenges'
      });
    }
    
    if (target.preferredChannels && Array.isArray(target.preferredChannels)) {
      additional.push({ 
        icon: 'bx bx-broadcast', 
        label: 'Canales preferidos', 
        value: target.preferredChannels.slice(0, 3).join(', '),
        category: 'distribution'
      });
    }
  }
  
  // Hashtags
  if (enrichedContext.hashtags && Array.isArray(enrichedContext.hashtags)) {
    additional.push({ 
      icon: 'bx bx-hash', 
      label: 'Hashtags', 
      value: enrichedContext.hashtags.slice(0, 3).join(' '),
      category: 'social'
    });
  }
  
  // CTA
  if (enrichedContext.cta) {
    additional.push({ 
      icon: 'bx bx-right-arrow-circle', 
      label: 'Llamada a la acción', 
      value: enrichedContext.cta.substring(0, 50) + '...',
      category: 'conversion'
    });
  }
  
  return { 
    title, 
    description, 
    theme, 
    additional,
    enrichedContext // Nuevo campo con todo el contexto enriquecido
  };
}

async function loadContentData() {
  console.log('📡 Cargando datos de contenido...');
  
  try {
    const response = await getContents();
    
    if (response && response.success) {
      contentData = response.contents || [];
      filteredContent = [...contentData];
      
      console.log(`✅ ${contentData.length} contenidos cargados`);
      
      contentData = contentData.map(content => {
        const parsedPayload = typeof content.payload === 'string' 
          ? JSON.parse(content.payload) 
          : content.payload;
        
        const extractedInfo = extractContentInfo(parsedPayload);
        
        return {
          ...content,
          parsedPayload,
          extractedInfo,
          createdDate: new Date(content.created_at),
          formattedDate: formatContentDate(content.created_at)
        };
      });
      
      filteredContent = [...contentData];
      
    } else {
      throw new Error('No se pudieron cargar los contenidos');
    }
  } catch (error) {
    console.error('Error cargando contenidos:', error);
    contentData = generateSampleContentData();
    filteredContent = [...contentData];
  }
}

function generateSampleContentData() {
  const sampleData = [
    {
      id: '1',
      type: 'meme',
      channel: 'Instagram',
      parsedPayload: {
        title: 'Capibara vs Exámenes',
        description: 'Meme sobre la lucha diaria de los estudiantes con los exámenes',
        caption: 'Cuando estudias toda la noche y el examen es sobre el capítulo que no leíste',
        target_emotion: 'humor relatable',
        theme: 'La lucha diaria de los estudiantes'
      },
      createdDate: new Date(),
      formattedDate: formatContentDate(new Date().toISOString()),
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      type: 'video',
      channel: 'TikTok',
      parsedPayload: {
        contenido_video: {
          titulo: 'Consejos de Estudio con Capibara',
          descripcion: 'Video con tips para estudiar mejor',
          duracion: '60 segundos'
        },
        theme: 'Consejos de estudio efectivos',
        targetAudience: {
          carrera: 'Estudiantes universitarios',
          edad: '18-25'
        }
      },
      createdDate: new Date(Date.now() - 86400000),
      formattedDate: formatContentDate(new Date(Date.now() - 86400000).toISOString()),
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '3',
      type: 'campaign',
      channel: 'Instagram',
      parsedPayload: {
        title: 'Desafío Creativo Capibara',
        description: 'Campaña para conectar con estudiantes de publicidad',
        theme: 'Conexión de marcas con temas sociales',
        target: 'Estudiantes de publicidad',
        cta: '¡Participa en nuestro desafío creativo!'
      },
      createdDate: new Date(Date.now() - 172800000),
      formattedDate: formatContentDate(new Date(Date.now() - 172800000).toISOString()),
      created_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
    id: '4',
    type: 'post',
    channel: 'Instagram',
    parsedPayload: {
      post: {
        target: {
          carrera: 'Ingeniería de Sistemas'
        },
        hashtags: [
          '#ProfesorAcadel',
          '#IngenieríaDeSistemasTruth',
          '#AcadelSpeaks',
          '#RealTalk',
          '#CaféDeIngeniería',
          '#EstudiantesUnidos'
        ],
        punchline: 'Así que, ¿quieres un café mediocre o prefieres el espresso de tus sueños? ¡Tú decides!',
        main_content: 'Primero, necesitas los ingredientes correctos: conocimiento y práctica. Sin ellos, tu café (o tu proyecto de ingeniería) queda más plano que una galleta.',
        opening_hook: '¿Sabías que estudiar ingeniería es como hacer café? ¡Déjame explicarte por qué!',
        viral_potential: {
          save_worthy: 'Este post ofrece una perspectiva única que los estudiantes querrán guardar.',
          share_trigger: 'La conexión entre café e ingeniería hará que los estudiantes se rían y compartan.',
          comment_magnet: 'La pregunta sobre experiencias con café generará historias divertidas.',
          trend_potential: 'Podría dar pie a memes sobre la vida estudiantil y el café.'
        },
        visual_suggestion: {
          mood: 'Vibe relajado y cómico, que invite a la reflexión y a la risa.',
          background: 'Una cocina desordenada, como la vida de un estudiante.',
          acadel_pose: 'Acadel sosteniendo una taza de café con una expresión de sabiduría.',
          text_overlay: 'Ingeniería = Café: Ingredientes + Proceso + Amor'
        },
        acadel_personality: 'Acadel es brutalmente honesto y divertido, usando su estilo único para conectar.',
        engagement_elements: {
          humor: 'Porque, seamos sinceros, a veces nuestras tareas parecen más difíciles que hacer café con una máquina rota.',
          question: '¿Cuál ha sido tu mejor (o peor) experiencia haciendo café?',
          validation: 'Este post valida que todos enfrentamos desafíos en nuestras carreras.',
          controversy: 'Algunos dirán que hacer café es fácil, pero ¿realmente lo es?'
        },
        relatability_factor: 'Porque todos hemos tenido días en los que el café parece más complicado que resolver un cubo Rubik a ciegas.'
      },
      theme: 'Truth bomb que Acadel está dropping',
      targetAudience: {
        carrera: 'Ingeniería de Sistemas',
        desired_action: 'Queremos que comenten sus experiencias y compartan el post.',
        emotional_state: 'Cansados pero con ganas de reír y aprender algo nuevo.',
        community_impact: 'Fortalece la comunidad Acadelia al unir a estudiantes.'
      }
    },
    createdDate: new Date(Date.now() - 259200000),
    formattedDate: formatContentDate(new Date(Date.now() - 259200000).toISOString()),
    created_at: new Date(Date.now() - 259200000).toISOString()
  }
  ];
  
  return sampleData.map(content => ({
    ...content,
    extractedInfo: extractContentInfo(content.parsedPayload)
  }));
}

function renderContentDashboard() {
  renderSummaryCards();
  renderTypeChart();
  renderChannelDistribution();
  renderContentList();
}

function renderSummaryCards() {
  const container = document.getElementById('contentSummaryCards');
  if (!container) return;
  
  const stats = calculateContentStats();
  
  container.innerHTML = `
    <div class="content-summary-card">
      <div class="content-card-icon">📊</div>
      <div class="content-card-value">${stats.total}</div>
      <div class="content-card-label">Total Contenidos</div>
    </div>
    <div class="content-summary-card">
      <div class="content-card-icon">🎭</div>
      <div class="content-card-value">${stats.memes}</div>
      <div class="content-card-label">Memes</div>
    </div>
    <div class="content-summary-card">
      <div class="content-card-icon">🎥</div>
      <div class="content-card-value">${stats.videos}</div>
      <div class="content-card-label">Videos</div>
    </div>
    <div class="content-summary-card">
      <div class="content-card-icon">📝</div>
      <div class="content-card-value">${stats.posts}</div>
      <div class="content-card-label">Posts</div>
    </div>
    <div class="content-summary-card">
      <div class="content-card-icon">🚀</div>
      <div class="content-card-value">${stats.campaigns}</div>
      <div class="content-card-label">Campañas</div>
    </div>
    <div class="content-summary-card">
      <div class="content-card-icon">📱</div>
      <div class="content-card-value">${stats.thisWeek}</div>
      <div class="content-card-label">Esta Semana</div>
    </div>
  `;
}

function calculateContentStats() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    total: contentData.length,
    memes: contentData.filter(c => c.type === 'meme').length,
    videos: contentData.filter(c => c.type === 'video').length,
    emails: contentData.filter(c => c.type === 'email').length,
    campaigns: contentData.filter(c => c.type === 'campaign').length,
    posts: contentData.filter(c => c.type === 'post').length,
    thisWeek: contentData.filter(c => c.createdDate >= oneWeekAgo).length
  };
}

function renderTypeChart() {
  const canvas = document.getElementById('typeDistributionChart');
  const statsContainer = document.getElementById('typeStats');
  
  if (!canvas || !statsContainer || !window.Chart) return;
  
  if (typeChart) {
    typeChart.destroy();
  }
  
  const typeDistribution = {};
  contentData.forEach(content => {
    typeDistribution[content.type] = (typeDistribution[content.type] || 0) + 1;
  });
  
  const types = Object.keys(typeDistribution);
  const counts = Object.values(typeDistribution);
  const colors = ['#a4ac86', '#7f4f24', '#936639', '#5C5858', '#2d3748', '#4a5568'];
  
  const ctx = canvas.getContext('2d');
  typeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: types.map(type => type.charAt(0).toUpperCase() + type.slice(1)),
      datasets: [{
        data: counts,
        backgroundColor: colors.slice(0, types.length),
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue('--color-background')
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
  
  statsContainer.innerHTML = types.map((type, index) => `
    <div class="type-stat-item">
      <div class="type-stat-color" style="background-color: ${colors[index]}"></div>
      <div class="type-stat-label">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
      <div class="type-stat-count">${counts[index]}</div>
    </div>
  `).join('');
}

function renderChannelDistribution() {
  const container = document.getElementById('channelDistribution');
  if (!container) return;
  
  const channelData = {};
  contentData.forEach(content => {
    const channelName = formatChannelName(content.channel);
    if (!channelData[channelName]) {
      channelData[channelName] = {
        count: 0,
        types: new Set()
      };
    }
    channelData[channelName].count++;
    channelData[channelName].types.add(formatContentType(content.type));
  });
  
  const channelIcons = {
    'Instagram': 'bx bxl-instagram',
    'TikTok': 'bx bxl-tiktok',
    'Email': 'bx bx-envelope',
    'YouTube': 'bx bxl-youtube',
    'WhatsApp': 'bx bxl-whatsapp',
    'Facebook': 'bx bxl-facebook',
    'Twitter/X': 'bx bxl-twitter',
    'LinkedIn': 'bx bxl-linkedin',
    'Discord': 'bx bxl-discord',
    'Telegram': 'bx bxl-telegram'
  };
  
  container.innerHTML = Object.entries(channelData)
    .sort(([,a], [,b]) => b.count - a.count)
    .map(([channel, data]) => `
      <div class="channel-item">
        <div class="channel-info">
          <div class="channel-name">
            <i class="${channelIcons[channel] || 'bx bx-broadcast'} channel-icon"></i>
            ${channel}
          </div>
          <div class="channel-types">${Array.from(data.types).join(', ')}</div>
        </div>
        <div class="channel-count">${formatNumber(data.count)}</div>
      </div>
    `).join('');
}

function renderContentList() {
  const container = document.getElementById('contentList');
  if (!container) return;
  
  if (filteredContent.length === 0) {
    container.innerHTML = `
      <div class="content-no-data">
        <i class='bx bx-file-blank'></i>
        <span>No se encontró contenido que coincida con los filtros</span>
      </div>
    `;
    return;
  }
  
  if (currentView === 'grid') {
    renderContentGrid(container);
  } else {
    renderContentTable(container);
  }
  
  setupViewToggleEvents();
}

function renderContentCard(content) {
  const info = content.extractedInfo || extractContentInfo(content.parsedPayload);
  const importancePercentage = (content.importance || 0.5) * 100;
  
  // Categorizar información adicional
  const categorizedInfo = {
    primary: info.additional.filter(item => 
      ['visual', 'psychological', 'audience'].includes(item.category)
    ).slice(0, 2),
    secondary: info.additional.filter(item => 
      ['technical', 'structure', 'engagement'].includes(item.category)
    ).slice(0, 2),
    metadata: info.additional.filter(item => 
      ['demographic', 'timing', 'social'].includes(item.category)
    ).slice(0, 2)
  };
  
  return `
    <div class="content-card enhanced" data-content-id="${content.id}" style="--importance-width: ${importancePercentage}%">
      <div class="content-card-header">
        <div class="content-card-info">
          <h3 class="content-card-title" title="${info.title}">${info.title}</h3>
          <div class="content-card-meta">
            <span class="content-card-type">${content.type}</span>
            <span class="content-card-channel">${content.channel}</span>
            ${info.enrichedContext?.type ? `<span class="content-card-subtype">${info.enrichedContext.type}</span>` : ''}
          </div>
        </div>
        <div class="content-card-top-right">
          <div class="content-card-date">${content.formattedDate}</div>
          <button class="content-card-delete-btn" data-content-id="${content.id}" title="Eliminar contenido">
            <i class='bx bx-trash'></i>
          </button>
        </div>
      </div>
      
      <div class="content-card-description" title="${info.description}">
        ${info.description}
      </div>
      
      ${categorizedInfo.primary.length > 0 ? `
        <div class="content-card-info-section primary">
          <div class="section-label">
            <i class='bx bx-star'></i>
            <span>Información Clave</span>
          </div>
          <div class="info-items">
            ${categorizedInfo.primary.map(item => `
              <div class="content-card-info-item">
                <i class='${item.icon}'></i>
                <span class="info-label">${item.label}:</span>
                <span class="info-value">${item.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${categorizedInfo.secondary.length > 0 ? `
        <div class="content-card-info-section secondary">
          <div class="section-label">
            <i class='bx bx-cog'></i>
            <span>Detalles Técnicos</span>
          </div>
          <div class="info-items">
            ${categorizedInfo.secondary.map(item => `
              <div class="content-card-info-item">
                <i class='${item.icon}'></i>
                <span class="info-label">${item.label}:</span>
                <span class="info-value">${item.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${info.enrichedContext?.targetAudience ? `
        <div class="content-card-audience">
          <div class="audience-header">
            <i class='bx bx-target-lock'></i>
            <span>Audiencia Objetivo</span>
          </div>
          <div class="audience-details">
            ${info.enrichedContext.targetAudience.carrera ? 
              `<span class="audience-tag carrera">${info.enrichedContext.targetAudience.carrera}</span>` : ''}
            ${info.enrichedContext.targetAudience.edad ? 
              `<span class="audience-tag edad">${info.enrichedContext.targetAudience.edad} años</span>` : ''}
            ${info.enrichedContext.targetAudience.momento ? 
              `<span class="audience-tag momento" title="${info.enrichedContext.targetAudience.momento}">
                ${info.enrichedContext.targetAudience.momento.substring(0, 25)}...
              </span>` : ''}
          </div>
        </div>
      ` : ''}
      
      ${info.theme ? `
        <div class="content-card-theme enhanced">
          <i class='bx bx-category'></i>
          <span>${info.theme.length > 60 ? info.theme.substring(0, 60) + '...' : info.theme}</span>
        </div>
      ` : ''}
      
      ${info.enrichedContext?.hashtags ? `
        <div class="content-card-hashtags">
          <i class='bx bx-hash'></i>
          <div class="hashtag-list">
            ${info.enrichedContext.hashtags.slice(0, 4).map(tag => 
              `<span class="hashtag">${tag}</span>`
            ).join('')}
            ${info.enrichedContext.hashtags.length > 4 ? 
              `<span class="hashtag-more">+${info.enrichedContext.hashtags.length - 4}</span>` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="content-card-footer">
        <div class="content-stats">
          ${info.enrichedContext?.type ? `
            <span class="stat-item">
              <i class='bx bx-category-alt'></i>
              ${info.enrichedContext.type}
            </span>
          ` : ''}
          <span class="stat-item">
            <i class='bx bx-data'></i>
            ${info.additional.length} propiedades
          </span>
        </div>
        <div class="expand-indicator">
          <i class='bx bx-chevron-right'></i>
        </div>
      </div>
    </div>
  `;
}

function renderContentGrid(container) {
  container.innerHTML = `
    <div class="content-grid">
      ${filteredContent.map(content => renderContentCard(content)).join('')}
    </div>
  `;
}

function renderContentTable(container) {
  container.innerHTML = `
    <table class="content-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Canal</th>
          <th>Descripción</th>
          <th>Tema</th>
          <th>Fecha</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${filteredContent.map(content => {
          const info = content.extractedInfo || extractContentInfo(content.parsedPayload);
          return `
            <tr data-content-id="${content.id}">
              <td><strong>${info.title}</strong></td>
              <td><span class="content-table-type">${content.type}</span></td>
              <td><span class="content-table-channel">${content.channel}</span></td>
              <td>${info.description.length > 80 ? info.description.substring(0, 80) + '...' : info.description}</td>
              <td>${info.theme ? (info.theme.length > 50 ? info.theme.substring(0, 50) + '...' : info.theme) : '-'}</td>
              <td>${content.formattedDate}</td>
              <td class="content-actions-cell">
                <button class="content-action-btn content-detail-btn" data-content-id="${content.id}" title="Ver detalles">
                  <i class='bx bx-show'></i>
                </button>
                <button class="content-action-btn content-delete-btn" data-content-id="${content.id}" title="Eliminar">
                  <i class='bx bx-trash'></i>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function setupContentEvents() {
  console.log('🔧 Configurando eventos de contenido...');
  
  setupStaticEvents();
  setupContentDelegation();
  setupModalHierarchy();
  
  console.log('✅ Eventos de contenido configurados');
}

function setupStaticEvents() {
  // Búsqueda
  const searchInput = document.getElementById('contentSearchInput');
  if (searchInput && !searchInput._contentEventAttached) {
    searchInput.addEventListener('input', handleContentSearch);
    searchInput._contentEventAttached = true;
    console.log('✅ Event listener de búsqueda configurado correctamente');
  }
  
  const typeFilter = document.getElementById('contentTypeFilter');
  const channelFilter = document.getElementById('contentChannelFilter');
  
  if (typeFilter && !typeFilter._contentEventAttached) {
    typeFilter.addEventListener('change', () => {
      console.log('🎛️ Filtro de tipo cambiado a:', typeFilter.value);
      applyContentFilters(); // Sin parámetros, leerá del DOM
    });
    typeFilter._contentEventAttached = true;
    console.log('✅ Event listener de filtro de tipo configurado correctamente');
  }
  
  if (channelFilter && !channelFilter._contentEventAttached) {
    channelFilter.addEventListener('change', () => {
      console.log('📺 Filtro de canal cambiado a:', channelFilter.value);
      applyContentFilters(); // Sin parámetros, leerá del DOM
    });
    channelFilter._contentEventAttached = true;
    console.log('✅ Event listener de filtro de canal configurado correctamente');
  }
  
  // Refrescar
  const refreshBtn = document.getElementById('contentRefreshBtn');
  if (refreshBtn && !refreshBtn._contentEventAttached) {
    refreshBtn.addEventListener('click', handleRefreshContent);
    refreshBtn._contentEventAttached = true;
  }
  
  const debugBtn = document.getElementById('contentDebugBtn');
  if (debugBtn && !debugBtn._contentEventAttached) {
    debugBtn.addEventListener('click', () => {
      console.log('🐛 Debug ejecutado manualmente');
      debugContentFilters();
      
      if (window.showNotification) {
        window.showNotification('Debug ejecutado - revisa la consola', 'info', 3000);
      }
    });
    debugBtn._contentEventAttached = true;
  }
  
  const resetBtn = document.getElementById('contentResetBtn');
  if (resetBtn && !resetBtn._contentEventAttached) {
    resetBtn.addEventListener('click', showResetContentModal);
    resetBtn._contentEventAttached = true;
  }
  
  // Toggle de vista
  setupViewToggleEvents();
  
  console.log('✅ Todos los event listeners configurados correctamente');
}

function resetContentFilters() {
  console.log('🔄 Reseteando filtros de contenido...');
  
  const searchInput = document.getElementById('contentSearchInput');
  const typeFilter = document.getElementById('contentTypeFilter');
  const channelFilter = document.getElementById('contentChannelFilter');
  
  if (searchInput) searchInput.value = '';
  if (typeFilter) typeFilter.value = '';
  if (channelFilter) channelFilter.value = '';
  
  filteredContent = [...contentData];
  renderContentList();
  
  console.log('✅ Filtros reseteados');
  
  if (window.showNotification) {
    window.showNotification('Filtros limpiados', 'info', 2000);
  }
}


function setupViewToggleEvents() {
  const viewToggleBtns = document.querySelectorAll('.content-view-toggle .content-view-btn');
  
  viewToggleBtns.forEach(btn => {
    if (btn._viewToggleHandler) {
      btn.removeEventListener('click', btn._viewToggleHandler);
    }
    
    btn._viewToggleHandler = (e) => handleViewToggle(e);
    btn.addEventListener('click', btn._viewToggleHandler);
    
    console.log('🔧 Event listener configurado para botón de vista:', btn.dataset.view);
  });
}

function setupContentDelegation() {
  const modalBody = document.querySelector('#contentModal .modal-body');
  if (!modalBody || modalBodyEventAttached) return;
  
  const contentClickHandler = (e) => {
    if (e.target.closest('.content-card-delete-btn') || e.target.closest('.content-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const contentId = e.target.closest('[data-content-id]').dataset.contentId;
      console.log('🗑️ Click en eliminar contenido:', contentId);
      handleDeleteContent(contentId);
      return;
    }
    
    // VER DETALLES (CLICK EN TARJETA, PERO NO EN BOTONES)
    const card = e.target.closest('.content-card');
    if (card && !e.target.closest('.content-card-delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const contentId = card.dataset.contentId;
      const content = contentData.find(c => c.id === contentId);
      if (content) {
        console.log('👁️ Click en ver detalles (tarjeta):', contentId);
        showContentDetail(content);
      }
      return;
    }
    
    if (e.target.closest('.content-detail-btn')) {
      e.preventDefault();
      e.stopPropagation();
      const contentId = e.target.closest('.content-detail-btn').dataset.contentId;
      const content = contentData.find(c => c.id === contentId);
      if (content) {
        console.log('👁️ Click en botón ver detalles (tabla):', contentId);
        showContentDetail(content);
      }
      return;
    }
    
  };
  
  modalBody._contentClickHandler = contentClickHandler;
  modalBody.addEventListener('click', contentClickHandler);
  modalBodyEventAttached = true;
  
  console.log('✅ Delegación de eventos configurada');
}

async function handleRefreshContent() {
  console.log('🔄 Refrescando contenido...');
  
  try {
    await loadContentData();
    renderContentDashboard();
    
    if (window.showNotification) {
      window.showNotification('Contenido actualizado', 'success', 2000);
    }
  } catch (error) {
    console.error('Error refrescando contenido:', error);
    if (window.showNotification) {
      window.showNotification('Error al actualizar contenido', 'error', 3000);
    }
  }
}

function handleViewToggle(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const clickedBtn = e.currentTarget;
  const newView = clickedBtn.dataset.view;
  
  if (currentView === newView) return;
  
  document.querySelectorAll('.content-view-btn').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
  
  currentView = newView;
  renderContentList();
}

function showDeleteContentModal(content) {
  console.log('🚀 Mostrando modal de eliminar para:', content.extractedInfo?.title || content.type);
  
  const deleteModal = document.querySelector('#contentDeleteModal');
  if (!deleteModal) {
    console.error('❌ Modal de eliminar no encontrada en el DOM');
    return;
  }
  
  const confirmBtn = deleteModal.querySelector('.content-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  // Llenar la preview del contenido
  const previewDiv = deleteModal.querySelector('.content-delete-content-preview');
  if (!previewDiv) {
    console.error('❌ Preview div no encontrado');
    return;
  }
  
  const info = content.extractedInfo || extractContentInfo(content.parsedPayload);
  
  previewDiv.innerHTML = `
    <div class="content-card-type-badge">${formatContentType(content.type)}</div>
    <div class="content-card-channel-badge">${formatChannelName(content.channel)}</div>
    <div class="content-insight-text">"${info.title}"</div>
    <div class="content-description-preview">${info.description.substring(0, 100)}${info.description.length > 100 ? '...' : ''}</div>
    <div class="content-meta-preview">
      <span>Creado: ${formatDate(content.created_at)}</span>
      ${info.theme ? `<span>Tema: ${info.theme.substring(0, 30)}${info.theme.length > 30 ? '...' : ''}</span>` : ''}
    </div>
  `;
  
  if (deleteModal._deleteHandlers) {
    const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._deleteHandlers;
    
    const closeBtn = deleteModal.querySelector('.content-delete-close');
    const cancelBtn = deleteModal.querySelector('.content-delete-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteEsc, true);
    deleteModal.removeEventListener('click', deleteModal._deleteBackdropHandler);
    
    delete deleteModal._deleteHandlers;
    delete deleteModal._deleteBackdropHandler;
  }
  
  const closeHandler = () => closeDeleteContentModal(deleteModal);
  const confirmHandler = () => confirmDeleteContent(content.id, deleteModal);
  
  const closeBtn = deleteModal.querySelector('.content-delete-close');
  const cancelBtn = deleteModal.querySelector('.content-delete-cancel');
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  
  const backdropHandler = (e) => {
    if (e.target === deleteModal) {
      closeHandler();
    }
  };
  deleteModal.addEventListener('click', backdropHandler);
  deleteModal._deleteBackdropHandler = backdropHandler;
  
  const handleDeleteEsc = (e) => {
    if (e.key === 'Escape' && deleteModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleDeleteEsc, true);
  
  deleteModal._deleteHandlers = { 
    closeHandler, 
    confirmHandler,
    handleDeleteEsc
  };
  
  deleteModal.classList.add('active');
}

function closeDeleteContentModal(deleteModal) {
  console.log('🚪 Cerrando modal de eliminar contenido...');
  
  const confirmBtn = deleteModal.querySelector('.content-delete-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  deleteModal.classList.remove('active');
  
  if (deleteModal._deleteHandlers) {
    const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._deleteHandlers;
    const closeBtn = deleteModal.querySelector('.content-delete-close');
    const cancelBtn = deleteModal.querySelector('.content-delete-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleDeleteEsc, true);
    deleteModal.removeEventListener('click', deleteModal._deleteBackdropHandler);
    
    delete deleteModal._deleteHandlers;
    delete deleteModal._deleteBackdropHandler;
  }
  
  console.log('✅ Modal de eliminar contenido cerrada y limpiada');
}

async function confirmDeleteContent(contentId, deleteModal) {
  console.log('🔥 Iniciando eliminación de contenido:', contentId);
  
  const confirmBtn = deleteModal.querySelector('.content-delete-confirm');
  
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    const response = await deleteContent(contentId);
    
    if (response && response.success) {
      if (confirmBtn) {
        confirmBtn.textContent = originalButtonState.text;
        confirmBtn.disabled = originalButtonState.disabled;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeDeleteContentModal(deleteModal);
      }, 100);
      
      await loadContentData();
      renderContentDashboard();
      
      if (window.showNotification) {
        window.showNotification('Contenido eliminado correctamente', 'success', 2000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido en la respuesta');
    }
  } catch (error) {
    console.error('❌ Error eliminando contenido:', error);
    
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar el contenido: ' + error.message, 'error', 5000);
    }
  }
}

async function handleDeleteContent(contentId) {
  console.log('🗑️ Intentando eliminar contenido con ID:', contentId);
  
  const content = contentData.find(c => c.id === contentId);
  if (!content) {
    console.warn('❌ No se encontró contenido con ID:', contentId);
    if (window.showNotification) {
      window.showNotification('Error: Contenido no encontrado', 'error', 3000);
    }
    return;
  }
  
  console.log('✅ Contenido encontrado, mostrando modal de confirmación');
  showDeleteContentModal(content);
}

function showResetContentModal() {
  console.log('🚀 Mostrando modal de reseteo de contenido...');
  
  const resetModal = document.querySelector('#contentResetModal');
  if (!resetModal) {
    console.error('❌ Modal de reseteo no encontrada');
    return;
  }
  
  const confirmBtn = resetModal.querySelector('.content-reset-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar todo';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  if (resetModal._resetHandlers) {
    const { closeHandler, confirmHandler, handleResetEsc } = resetModal._resetHandlers;
    
    const closeBtn = resetModal.querySelector('.content-reset-close');
    const cancelBtn = resetModal.querySelector('.content-reset-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleResetEsc, true);
    resetModal.removeEventListener('click', resetModal._resetBackdropHandler);
    
    delete resetModal._resetHandlers;
    delete resetModal._resetBackdropHandler;
  }
  
  const closeHandler = () => closeResetContentModal(resetModal);
  const confirmHandler = () => handleResetAllContent(resetModal);
  
  const closeBtn = resetModal.querySelector('.content-reset-close');
  const cancelBtn = resetModal.querySelector('.content-reset-cancel');
  
  closeBtn.addEventListener('click', closeHandler);
  cancelBtn.addEventListener('click', closeHandler);
  confirmBtn.addEventListener('click', confirmHandler);
  
  const backdropHandler = (e) => {
    if (e.target === resetModal) {
      closeHandler();
    }
  };
  resetModal.addEventListener('click', backdropHandler);
  resetModal._resetBackdropHandler = backdropHandler;
  
  const handleResetEsc = (e) => {
    if (e.key === 'Escape' && resetModal.classList.contains('active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeHandler();
    }
  };
  
  document.addEventListener('keydown', handleResetEsc, true);
  
  resetModal._resetHandlers = { 
    closeHandler, 
    confirmHandler,
    handleResetEsc
  };
  
  resetModal.classList.add('active');
}

function closeResetContentModal(resetModal) {
  console.log('🚪 Cerrando modal de reseteo de contenido...');
  
  const confirmBtn = resetModal.querySelector('.content-reset-confirm');
  if (confirmBtn) {
    confirmBtn.textContent = 'Sí, eliminar todo';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.cursor = 'pointer';
  }
  
  resetModal.classList.remove('active');
  
  if (resetModal._resetHandlers) {
    const { closeHandler, confirmHandler, handleResetEsc } = resetModal._resetHandlers;
    const closeBtn = resetModal.querySelector('.content-reset-close');
    const cancelBtn = resetModal.querySelector('.content-reset-cancel');
    
    if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
    if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
    if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
    
    document.removeEventListener('keydown', handleResetEsc, true);
    resetModal.removeEventListener('click', resetModal._resetBackdropHandler);
    
    delete resetModal._resetHandlers;
    delete resetModal._resetBackdropHandler;
  }
  
  console.log('✅ Modal de reseteo de contenido cerrada y limpiada');
}

async function handleResetAllContent(resetModal) {
  console.log('🔥 Iniciando eliminación masiva de contenido...');
  
  const confirmBtn = resetModal.querySelector('.content-reset-confirm');
  
  const originalButtonState = {
    text: confirmBtn ? confirmBtn.textContent : 'Sí, eliminar todo',
    disabled: confirmBtn ? confirmBtn.disabled : false
  };
  
  try {
    if (confirmBtn) {
      confirmBtn.textContent = 'Eliminando...';
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.7';
      confirmBtn.style.cursor = 'wait';
    }
    
    const response = await deleteAllContents();
    
    if (response && response.success) {
      if (confirmBtn) {
        confirmBtn.textContent = originalButtonState.text;
        confirmBtn.disabled = originalButtonState.disabled;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Pequeño delay para que se vea la restauración
      setTimeout(() => {
        closeResetContentModal(resetModal);
      }, 100);
      
      await loadContentData();
      renderContentDashboard();
      
      if (window.showNotification) {
        window.showNotification('Todo el contenido eliminado correctamente', 'success', 3000);
      }
    } else {
      throw new Error(response?.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error eliminando todo el contenido:', error);
    
    if (confirmBtn) {
      confirmBtn.textContent = originalButtonState.text;
      confirmBtn.disabled = originalButtonState.disabled;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    if (window.showNotification) {
      window.showNotification('Error al eliminar el contenido: ' + error.message, 'error', 3000);
    }
  }
}

function resetAllContentDeleteModals() {
  console.log('🔄 Reseteando todas las modales de eliminación de contenido...');
  
  const deleteModal = document.querySelector('#contentDeleteModal');
  if (deleteModal) {
    const confirmBtn = deleteModal.querySelector('.content-delete-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Sí, eliminar';
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    deleteModal.classList.remove('active');
    
    if (deleteModal._deleteHandlers) {
      const { closeHandler, confirmHandler, handleDeleteEsc } = deleteModal._deleteHandlers;
      const closeBtn = deleteModal.querySelector('.content-delete-close');
      const cancelBtn = deleteModal.querySelector('.content-delete-cancel');
      
      if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
      if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
      if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
      
      document.removeEventListener('keydown', handleDeleteEsc, true);
      deleteModal.removeEventListener('click', deleteModal._deleteBackdropHandler);
      
      delete deleteModal._deleteHandlers;
      delete deleteModal._deleteBackdropHandler;
    }
  }
  
  const resetModal = document.querySelector('#contentResetModal');
  if (resetModal) {
    const confirmBtn = resetModal.querySelector('.content-reset-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Sí, eliminar todo';
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
    
    resetModal.classList.remove('active');
    
    if (resetModal._resetHandlers) {
      const { closeHandler, confirmHandler, handleResetEsc } = resetModal._resetHandlers;
      const closeBtn = resetModal.querySelector('.content-reset-close');
      const cancelBtn = resetModal.querySelector('.content-reset-cancel');
      
      if (closeBtn) closeBtn.removeEventListener('click', closeHandler);
      if (cancelBtn) cancelBtn.removeEventListener('click', closeHandler);
      if (confirmBtn) confirmBtn.removeEventListener('click', confirmHandler);
      
      document.removeEventListener('keydown', handleResetEsc, true);
      resetModal.removeEventListener('click', resetModal._resetBackdropHandler);
      
      delete resetModal._resetHandlers;
      delete resetModal._resetBackdropHandler;
    }
  }
  
  console.log('✅ Todas las modales de eliminación de contenido reseteadas');
}

function setupModalHierarchy() {
  if (window._contentMainEscHandler) {
    document.removeEventListener('keydown', window._contentMainEscHandler, true);
  }
  
  const handleMainModalEsc = (e) => {
    if (e.key === 'Escape') {
      const contentDetailModal = document.querySelector('#content-detail-modal');
      const contentResetModal = document.querySelector('#contentResetModal');
      const contentDeleteModal = document.querySelector('#contentDeleteModal');
      const contentModal = document.querySelector('#contentModal');
      
      if (contentModal && contentModal.classList.contains('active')) {
        if ((contentDetailModal && contentDetailModal.classList.contains('active')) ||
            (contentResetModal && contentResetModal.classList.contains('active')) ||
            (contentDeleteModal && contentDeleteModal.classList.contains('active'))) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (window.closeModal && typeof window.closeModal === 'function') {
          window.closeModal(contentModal);
        } else {
          contentModal.classList.remove('active');
        }
        
        cleanupModalHierarchy();
      }
    }
  };
  
  window._contentMainEscHandler = handleMainModalEsc;
  document.addEventListener('keydown', handleMainModalEsc, false);
}

function cleanupModalHierarchy() {
  if (window._contentMainEscHandler) {
    document.removeEventListener('keydown', window._contentMainEscHandler, true);
    delete window._contentMainEscHandler;
  }
}

function showContentDetail(content) {
  const info = content.extractedInfo || extractContentInfo(content.parsedPayload);
  
  console.log('📋 Mostrando detalles del contenido:', info.title);
  
  createContentDetailModal(content);
}

function createContentDetailModal(content) {
  const info = content.extractedInfo || extractContentInfo(content.parsedPayload);
  
  console.log('🎯 Creando mini modal para:', info.title);
  
  const existingModal = document.getElementById('content-detail-modal');
  if (existingModal) {
    console.log('🧹 Removiendo modal anterior');
    closeContentDetailModal(existingModal);
  }
  
  const modal = document.createElement('div');
  modal.id = 'content-detail-modal';
  modal.className = 'content-detail-modal';
  
  modal.innerHTML = `
    <div class="content-detail-content">
      <div class="content-detail-header">
        <button class="content-detail-close" title="Cerrar detalles">&times;</button>
        <div class="content-detail-main-info">
          <h2 class="content-detail-title">${info.title}</h2>
          <div class="content-detail-meta">
            <span class="content-detail-badge">${content.type}</span>
            <span class="content-detail-badge">${content.channel}</span>
          </div>
        </div>
      </div>
      
      <div class="content-detail-body">
        ${renderContentDetailSections(content, info)}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  console.log('✅ Mini modal agregada al DOM');
  
  setupContentDetailEvents(modal);
  
  setTimeout(() => {
    modal.classList.add('active');
    console.log('🎭 Mini modal activada');
  }, 10);
  
  return modal;
}

function closeContentDetailModal(modal) {
  if (!modal) {
    console.warn('⚠️ Intentando cerrar modal null/undefined');
    return;
  }
  
  console.log('🚪 Cerrando mini modal de contenido...');
  
  modal.classList.remove('active');
  
  if (modal._escHandler) {
    document.removeEventListener('keydown', modal._escHandler, true);
    delete modal._escHandler;
    console.log('🧹 Event listener ESC removido');
  }
  
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
      console.log('✅ Mini modal de contenido removida del DOM');
    }
  }, 300);
}

function setupContentDetailEvents(modal) {
  const closeBtn = modal.querySelector('.content-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContentDetailModal(modal);
    });
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.stopPropagation();
      closeContentDetailModal(modal);
    }
  });
  
  const content = modal.querySelector('.content-detail-content');
  if (content) {
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      closeContentDetailModal(modal);
      document.removeEventListener('keydown', handleEsc, true);
    }
  };
  
  document.addEventListener('keydown', handleEsc, true);
  modal._escHandler = handleEsc;
}

function renderContentDetailSections(content, info) {
  const sections = [];
  
  // Sección de información general
  sections.push(`
    <div class="content-detail-section">
      <h3><i class='bx bx-info-circle'></i> Información General</h3>
      <div class="content-detail-grid">
        <div class="content-detail-item">
          <div class="content-detail-item-label">
            <i class='bx bx-key'></i> ID del Contenido
          </div>
          <div class="content-detail-item-value">${content.id}</div>
        </div>
        <div class="content-detail-item">
          <div class="content-detail-item-label">
            <i class='bx bx-calendar'></i> Fecha de Creación
          </div>
          <div class="content-detail-item-value">
            ${formatDate(content.created_at)} (${formatRelativeDate(content.created_at)})
          </div>
        </div>
        <div class="content-detail-item">
          <div class="content-detail-item-label">
            <i class='bx bx-category-alt'></i> Tipo de Contenido
          </div>
          <div class="content-detail-item-value">${formatContentType(content.type)}</div>
        </div>
        <div class="content-detail-item">
          <div class="content-detail-item-label">
            <i class='bx bx-broadcast'></i> Canal de Distribución
          </div>
          <div class="content-detail-item-value">${formatChannelName(content.channel)}</div>
        </div>
        ${info.theme ? `
          <div class="content-detail-item">
            <div class="content-detail-item-label">
              <i class='bx bx-palette'></i> Tema Principal
            </div>
            <div class="content-detail-item-value">${info.theme}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `);
  
  // Sección específica para MEMES
  if (info.enrichedContext?.type === 'meme' && info.enrichedContext.memeData) {
    const meme = info.enrichedContext.memeData;
    
    sections.push(`
      <div class="content-detail-section meme-specific">
        <h3><i class='bx bx-laugh'></i> Detalles del Meme</h3>
        <div class="content-detail-grid">
          ${meme.formato ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-image'></i> Formato
              </div>
              <div class="content-detail-item-value">${meme.formato}</div>
            </div>
          ` : ''}
          ${meme.target_emotion ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-happy-heart-eyes'></i> Emoción Objetivo
              </div>
              <div class="content-detail-item-value">${meme.target_emotion}</div>
            </div>
          ` : ''}
          ${meme.punchline ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-message-square-dots'></i> Punchline
              </div>
              <div class="content-detail-item-value">${meme.punchline}</div>
            </div>
          ` : ''}
          ${meme.texto_principal ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-text'></i> Texto Principal
              </div>
              <div class="content-detail-item-value">${meme.texto_principal}</div>
            </div>
          ` : ''}
        </div>
        
        ${meme.educational_value ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-brain'></i> Valor Educativo</h4>
            <div class="content-detail-description">
              ${meme.educational_value}
            </div>
          </div>
        ` : ''}
        
        ${meme.shareability ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-share-alt'></i> Factor de Viralidad</h4>
            <div class="content-detail-description">
              ${meme.shareability}
            </div>
          </div>
        ` : ''}
        
        ${meme.relatability_factor ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-group'></i> Factor de Identificación</h4>
            <div class="content-detail-description">
              ${meme.relatability_factor}
            </div>
          </div>
        ` : ''}
        
        ${meme.acadel_role ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-user-voice'></i> Rol de Acadel</h4>
            <div class="content-detail-description">
              ${meme.acadel_role}
            </div>
          </div>
        ` : ''}
      </div>
    `);
    
    // Elementos visuales del meme
    if (meme.visualElements) {
      sections.push(`
        <div class="content-detail-section visual-elements">
          <h3><i class='bx bx-palette'></i> Elementos Visuales</h3>
          <div class="content-detail-grid">
            ${meme.visualElements.props ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-cube'></i> Props
                </div>
                <div class="content-detail-item-value">${meme.visualElements.props}</div>
              </div>
            ` : ''}
            ${meme.visualElements.background ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-landscape'></i> Fondo/Escenario
                </div>
                <div class="content-detail-item-value">${meme.visualElements.background}</div>
              </div>
            ` : ''}
            ${meme.visualElements.text_style ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-font'></i> Estilo de Texto
                </div>
                <div class="content-detail-item-value">${meme.visualElements.text_style}</div>
              </div>
            ` : ''}
            ${meme.visualElements.acadel_expression ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-smile'></i> Expresión de Acadel
                </div>
                <div class="content-detail-item-value">${meme.visualElements.acadel_expression}</div>
              </div>
            ` : ''}
            ${meme.visualElements.escena ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-camera'></i> Escena
                </div>
                <div class="content-detail-item-value">${meme.visualElements.escena}</div>
              </div>
            ` : ''}
            ${meme.visualElements.texto_meme ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-text'></i> Texto del Meme
                </div>
                <div class="content-detail-item-value">${meme.visualElements.texto_meme}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    }
  }
  
  // Sección específica para VIDEOS
  if (info.enrichedContext?.type === 'video' && info.enrichedContext.videoData) {
    const video = info.enrichedContext.videoData;
    
    sections.push(`
      <div class="content-detail-section video-specific">
        <h3><i class='bx bx-video'></i> Detalles del Video</h3>
        <div class="content-detail-grid">
          ${video.duracion ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-time'></i> Duración
              </div>
              <div class="content-detail-item-value">${video.duracion}</div>
            </div>
          ` : ''}
          ${video.plataforma ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-devices'></i> Plataforma
              </div>
              <div class="content-detail-item-value">${video.plataforma}</div>
            </div>
          ` : ''}
          ${video.estilo ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-brush'></i> Estilo
              </div>
              <div class="content-detail-item-value">${video.estilo}</div>
            </div>
          ` : ''}
        </div>
        
        ${video.contenido ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-list-ul'></i> Estructura del Contenido</h4>
            ${video.contenido.introduccion ? `
              <div class="content-subsection-item">
                <strong>Introducción:</strong> ${video.contenido.introduccion}
              </div>
            ` : ''}
            ${video.contenido.desarrollo ? `
              <div class="content-subsection-item">
                <strong>Desarrollo:</strong> 
                ${typeof video.contenido.desarrollo === 'string' ? 
                  video.contenido.desarrollo : 
                  JSON.stringify(video.contenido.desarrollo, null, 2)}
              </div>
            ` : ''}
            ${video.contenido.conclusion ? `
              <div class="content-subsection-item">
                <strong>Conclusión:</strong> ${video.contenido.conclusion}
              </div>
            ` : ''}
            ${video.contenido.secciones ? `
              <div class="content-subsection-item">
                <strong>Secciones:</strong> ${video.contenido.secciones.length} partes
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `);
    
    // Elementos audiovisuales
    if (video.visualElements) {
      sections.push(`
        <div class="content-detail-section audio-visual">
          <h3><i class='bx bx-movie-play'></i> Elementos Audiovisuales</h3>
          <div class="content-detail-grid">
            ${video.visualElements.musica ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-music'></i> Música
                </div>
                <div class="content-detail-item-value">${video.visualElements.musica}</div>
              </div>
            ` : ''}
            ${video.visualElements.animaciones ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-movie'></i> Animaciones
                </div>
                <div class="content-detail-item-value">${video.visualElements.animaciones}</div>
              </div>
            ` : ''}
            ${video.visualElements.transiciones ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-transfer'></i> Transiciones
                </div>
                <div class="content-detail-item-value">${video.visualElements.transiciones}</div>
              </div>
            ` : ''}
            ${video.visualElements.colores ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-palette'></i> Colores
                </div>
                <div class="content-detail-item-value">${video.visualElements.colores}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    }
  }
  
  // Sección específica para EMAILS
  if (info.enrichedContext?.type === 'email' && info.enrichedContext.emailData) {
    const email = info.enrichedContext.emailData;
    
    sections.push(`
      <div class="content-detail-section email-specific">
        <h3><i class='bx bx-envelope'></i> Detalles del Email</h3>
        <div class="content-detail-grid">
          ${email.subject ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-text'></i> Asunto
              </div>
              <div class="content-detail-item-value">${email.subject}</div>
            </div>
          ` : ''}
          ${email.tone ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-message-dots'></i> Tono
              </div>
              <div class="content-detail-item-value">${email.tone}</div>
            </div>
          ` : ''}
          ${email.cta ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-right-arrow-circle'></i> CTA
              </div>
              <div class="content-detail-item-value">${email.cta}</div>
            </div>
          ` : ''}
        </div>
        
        ${email.body_preview ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-file-blank'></i> Vista Previa del Contenido</h4>
            <div class="content-detail-description">
              ${email.body_preview}
            </div>
          </div>
        ` : ''}
        
        ${email.personalization ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-user-circle'></i> Personalización</h4>
            <div class="content-detail-description">
              ${email.personalization}
            </div>
          </div>
        ` : ''}
      </div>
    `);
  }
  
  // Sección específica para CAMPAÑAS
  if (info.enrichedContext?.type === 'campaign' && info.enrichedContext.campaignData) {
    const campaign = info.enrichedContext.campaignData;
    
    sections.push(`
      <div class="content-detail-section campaign-specific">
        <h3><i class='bx bx-bullseye'></i> Detalles de la Campaña</h3>
        <div class="content-detail-grid">
          ${campaign.name ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-tag'></i> Nombre
              </div>
              <div class="content-detail-item-value">${campaign.name}</div>
            </div>
          ` : ''}
          ${campaign.duration ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-calendar'></i> Duración
              </div>
              <div class="content-detail-item-value">${campaign.duration}</div>
            </div>
          ` : ''}
          ${campaign.budget ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-dollar-circle'></i> Presupuesto
              </div>
              <div class="content-detail-item-value">${campaign.budget}</div>
            </div>
          ` : ''}
        </div>
        
        ${campaign.core_message ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-message-square'></i> Mensaje Central</h4>
            <div class="content-detail-description">
              ${campaign.core_message}
            </div>
          </div>
        ` : ''}
        
        ${campaign.phases && Array.isArray(campaign.phases) ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-trending-up'></i> Fases de la Campaña</h4>
            <div class="campaign-phases">
              ${campaign.phases.map((phase, index) => `
                <div class="phase-item">
                  <strong>Fase ${index + 1}:</strong> 
                  ${typeof phase === 'string' ? phase : JSON.stringify(phase, null, 2)}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${campaign.objectives ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-target-lock'></i> Objetivos</h4>
            <div class="content-detail-description">
              ${typeof campaign.objectives === 'string' ? 
                campaign.objectives : 
                JSON.stringify(campaign.objectives, null, 2)}
            </div>
          </div>
        ` : ''}
      </div>
    `);
  }

  // Sección específica para POSTS
    if (info.enrichedContext?.type === 'post' && info.enrichedContext.postData) {
    const post = info.enrichedContext.postData;
    
    sections.push(`
      <div class="content-detail-section post-specific">
        <h3><i class='bx bx-edit-alt'></i> Detalles del Post</h3>
        <div class="content-detail-grid">
          ${post.opening_hook ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-hook'></i> Hook de Apertura
              </div>
              <div class="content-detail-item-value">${post.opening_hook}</div>
            </div>
          ` : ''}
          ${post.punchline ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-message-square-dots'></i> Punchline
              </div>
              <div class="content-detail-item-value">${post.punchline}</div>
            </div>
          ` : ''}
          ${post.acadel_personality ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-user-voice'></i> Personalidad Acadel
              </div>
              <div class="content-detail-item-value">${post.acadel_personality}</div>
            </div>
          ` : ''}
        </div>
        
        ${post.main_content ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-file-blank'></i> Contenido Principal</h4>
            <div class="content-detail-description">
              ${post.main_content}
            </div>
          </div>
        ` : ''}
        
        ${post.relatability_factor ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-group'></i> Factor de Identificación</h4>
            <div class="content-detail-description">
              ${post.relatability_factor}
            </div>
          </div>
        ` : ''}
      </div>
    `);
    
    // Potencial viral detallado
    if (post.viralPotential) {
      sections.push(`
        <div class="content-detail-section viral-potential">
          <h3><i class='bx bx-trending-up'></i> Potencial Viral</h3>
          <div class="content-detail-grid">
            ${post.viralPotential.save_worthy ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-bookmark'></i> Potencial para Guardar
                </div>
                <div class="content-detail-item-value">${post.viralPotential.save_worthy}</div>
              </div>
            ` : ''}
            ${post.viralPotential.share_trigger ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-share-alt'></i> Trigger de Compartir
                </div>
                <div class="content-detail-item-value">${post.viralPotential.share_trigger}</div>
              </div>
            ` : ''}
            ${post.viralPotential.comment_magnet ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-comment-dots'></i> Imán de Comentarios
                </div>
                <div class="content-detail-item-value">${post.viralPotential.comment_magnet}</div>
              </div>
            ` : ''}
            ${post.viralPotential.trend_potential ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-fire'></i> Potencial de Trend
                </div>
                <div class="content-detail-item-value">${post.viralPotential.trend_potential}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    }
    
    // Sugerencias visuales específicas
    if (post.visualSuggestion) {
      sections.push(`
        <div class="content-detail-section visual-suggestions">
          <h3><i class='bx bx-palette'></i> Sugerencias Visuales</h3>
          <div class="content-detail-grid">
            ${post.visualSuggestion.mood ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-color-palette'></i> Mood Visual
                </div>
                <div class="content-detail-item-value">${post.visualSuggestion.mood}</div>
              </div>
            ` : ''}
            ${post.visualSuggestion.background ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-landscape'></i> Fondo Sugerido
                </div>
                <div class="content-detail-item-value">${post.visualSuggestion.background}</div>
              </div>
            ` : ''}
            ${post.visualSuggestion.acadel_pose ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-user-circle'></i> Pose de Acadel
                </div>
                <div class="content-detail-item-value">${post.visualSuggestion.acadel_pose}</div>
              </div>
            ` : ''}
            ${post.visualSuggestion.text_overlay ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-text'></i> Texto Overlay
                </div>
                <div class="content-detail-item-value">${post.visualSuggestion.text_overlay}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    }
    
    // Elementos de engagement
    if (post.engagementElements) {
      sections.push(`
        <div class="content-detail-section engagement-elements">
          <h3><i class='bx bx-chat'></i> Elementos de Engagement</h3>
          <div class="content-detail-grid">
            ${post.engagementElements.humor ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-laugh'></i> Elemento de Humor
                </div>
                <div class="content-detail-item-value">${post.engagementElements.humor}</div>
              </div>
            ` : ''}
            ${post.engagementElements.question ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-help-circle'></i> Pregunta de Engagement
                </div>
                <div class="content-detail-item-value">${post.engagementElements.question}</div>
              </div>
            ` : ''}
            ${post.engagementElements.validation ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-check-circle'></i> Validación
                </div>
                <div class="content-detail-item-value">${post.engagementElements.validation}</div>
              </div>
            ` : ''}
            ${post.engagementElements.controversy ? `
              <div class="content-detail-item">
                <div class="content-detail-item-label">
                  <i class='bx bx-fire'></i> Elemento de Controversia
                </div>
                <div class="content-detail-item-value">${post.engagementElements.controversy}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `);
    }
  }
  
  // Sección de audiencia objetivo enriquecida
  if (info.enrichedContext?.targetAudience) {
    const target = info.enrichedContext.targetAudience;
    
    sections.push(`
      <div class="content-detail-section audience-section">
        <h3><i class='bx bx-target-lock'></i> Audiencia Objetivo Detallada</h3>
        <div class="content-detail-grid">
          ${target.carrera ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-graduation'></i> Carrera
              </div>
              <div class="content-detail-item-value">${target.carrera}</div>
            </div>
          ` : ''}
          ${target.edad ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-user'></i> Edad
              </div>
              <div class="content-detail-item-value">${target.edad}</div>
            </div>
          ` : ''}
          ${target.nivel_academico ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-book'></i> Nivel Académico
              </div>
              <div class="content-detail-item-value">${target.nivel_academico}</div>
            </div>
          ` : ''}
          ${target.curso ? `
            <div class="content-detail-item">
              <div class="content-detail-item-label">
                <i class='bx bx-calendar-check'></i> Curso
              </div>
              <div class="content-detail-item-value">${target.curso}</div>
            </div>
          ` : ''}
        </div>
        
        ${target.momento ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-time-five'></i> Momento Ideal</h4>
            <div class="content-detail-description">
              ${target.momento}
            </div>
          </div>
        ` : ''}
        
        ${target.accion_deseada ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-bullseye'></i> Acción Deseada</h4>
            <div class="content-detail-description">
              ${target.accion_deseada}
            </div>
          </div>
        ` : ''}
        
        ${target.emocion_objetivo ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-heart'></i> Emoción Objetivo</h4>
            <div class="content-detail-description">
              ${target.emocion_objetivo}
            </div>
          </div>
        ` : ''}
        
        ${target.hobbies && Array.isArray(target.hobbies) ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-joystick'></i> Hobbies e Intereses</h4>
            <div class="content-detail-tags">
              ${target.hobbies.map(hobby => 
                `<span class="content-detail-tag hobby">${hobby}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${target.challenges && Array.isArray(target.challenges) ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-shield-quarter'></i> Desafíos</h4>
            <div class="content-detail-tags">
              ${target.challenges.map(challenge => 
                `<span class="content-detail-tag challenge">${challenge}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${target.preferredChannels && Array.isArray(target.preferredChannels) ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-broadcast'></i> Canales Preferidos</h4>
            <div class="content-detail-tags">
              ${target.preferredChannels.map(channel => 
                `<span class="content-detail-tag channel">${channel}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        ${target.attitudes ? `
          <div class="content-detail-subsection">
            <h4><i class='bx bx-brain'></i> Actitudes</h4>
            <div class="attitudes-grid">
              ${Object.entries(target.attitudes).map(([key, value]) => `
                <div class="attitude-item">
                  <span class="attitude-label">${key}:</span>
                  <div class="attitude-bar">
                    <div class="attitude-fill" style="width: ${(value * 100)}%"></div>
                    <span class="attitude-value">${(value * 100).toFixed(0)}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `);
  }
  
  // Sección de descripción general (si existe y es diferente del título)
  if (info.description !== 'Sin descripción' && info.description !== info.title) {
    sections.push(`
      <div class="content-detail-section">
        <h3><i class='bx bx-text'></i> Descripción</h3>
        <div class="content-detail-description">
          ${info.description}
        </div>
      </div>
    `);
  }
  
  // Sección de hashtags
  if (info.enrichedContext?.hashtags && Array.isArray(info.enrichedContext.hashtags)) {
    sections.push(`
      <div class="content-detail-section">
        <h3><i class='bx bx-hash'></i> Hashtags</h3>
        <div class="content-detail-tags">
          ${info.enrichedContext.hashtags.map(tag => `
            <span class="content-detail-tag hashtag">${tag}</span>
          `).join('')}
        </div>
      </div>
    `);
  }
  
  // Sección de CTA
  if (info.enrichedContext?.cta) {
    sections.push(`
      <div class="content-detail-section">
        <h3><i class='bx bx-right-arrow-circle'></i> Llamada a la Acción</h3>
        <div class="content-detail-description cta-section">
          ${info.enrichedContext.cta}
        </div>
      </div>
    `);
  }
  
  // Sección del payload completo
  sections.push(`
    <div class="content-detail-section">
      <h3><i class='bx bx-code-alt'></i> Payload Completo (JSON)</h3>
      <div class="content-detail-json">
        <pre>${JSON.stringify(content.parsedPayload, null, 2)}</pre>
      </div>
    </div>
  `);
  
  return sections.join('');
}

function handleContentSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  console.log('🔍 Búsqueda activada:', searchTerm);
  applyContentFilters(searchTerm); // Pasar directamente el término
}

function applyContentFilters(searchTermOrEvent = null) {
  const typeFilter = document.getElementById('contentTypeFilter')?.value || '';
  const channelFilter = document.getElementById('contentChannelFilter')?.value || '';
  
  let search = '';
  if (searchTermOrEvent && typeof searchTermOrEvent === 'string') {
    // Es un término de búsqueda directo
    search = searchTermOrEvent.toLowerCase();
  } else if (searchTermOrEvent && searchTermOrEvent.target) {
    // Es un evento, ignorarlo y obtener el valor del input
    search = document.getElementById('contentSearchInput')?.value.toLowerCase() || '';
  } else {
    // Es null o undefined, obtener del input
    search = document.getElementById('contentSearchInput')?.value.toLowerCase() || '';
  }
  
  console.log('🔍 Aplicando filtros:', { typeFilter, channelFilter, search });
  
  let totalChecked = 0;
  let typeMatches = 0;
  let channelMatches = 0;
  let searchMatches = 0;
  let finalMatches = 0;
  
  filteredContent = contentData.filter(content => {
    totalChecked++;
    const info = content.extractedInfo || extractContentInfo(content.parsedPayload);
    
    const contentType = (content.type || '').toLowerCase().trim();
    const filterType = typeFilter.toLowerCase().trim();
    const matchesType = !typeFilter || contentType === filterType;
    
    if (matchesType) typeMatches++;
    
    const contentChannel = (content.channel || '').toLowerCase().trim();
    const filterChannel = channelFilter.toLowerCase().trim();
    const matchesChannel = !channelFilter || contentChannel === filterChannel;
    
    if (matchesChannel) channelMatches++;
    
    const matchesSearch = !search || 
      (info.title && info.title.toLowerCase().includes(search)) ||
      (info.description && info.description.toLowerCase().includes(search)) ||
      (info.theme && info.theme.toLowerCase().includes(search)) ||
      contentType.includes(search) ||
      contentChannel.includes(search) ||
      (info.additional && info.additional.some(item => 
        (item.label && item.label.toLowerCase().includes(search)) || 
        (item.value && typeof item.value === 'string' && item.value.toLowerCase().includes(search))
      ));
    
    if (matchesSearch) searchMatches++;
    
    const finalMatch = matchesType && matchesChannel && matchesSearch;
    if (finalMatch) finalMatches++;
    
    if (!matchesType && typeFilter) {
      console.log(`❌ Tipo no coincide - Esperado: "${filterType}", Encontrado: "${contentType}"`, content);
    }
    
    return finalMatch;
  });
  
  console.log('📊 Resultados del filtrado:');
  console.log(`- Total revisados: ${totalChecked}`);
  console.log(`- Coinciden tipo: ${typeMatches}`);
  console.log(`- Coinciden canal: ${channelMatches}`);
  console.log(`- Coinciden búsqueda: ${searchMatches}`);
  console.log(`- Coincidencias finales: ${finalMatches}`);
  
  renderContentList();
  
  if (filteredContent.length === 0 && contentData.length > 0) {
    console.warn('⚠️ No se encontraron coincidencias. Ejecutando análisis de debug...');
    debugContentFilters();
  }
}


function formatContentDate(dateString) {
  if (!dateString) return 'Fecha no disponible';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return formatRelativeDate(dateString);
  } else {
    return formatDate(dateString);
  }
}

// Exponer funciones globalmente
window.contentModal = {
  init: initContentModal,
  refresh: async () => {
    await loadContentData();
    renderContentDashboard();
  }
};

if (typeof window !== 'undefined') {
  window.initContentModal = initContentModal;
  window.handleContentModalOpen = handleContentModalOpen;
  window.showContentDetail = showContentDetail;
  window.createContentDetailModal = createContentDetailModal;
  window.closeContentDetailModal = closeContentDetailModal;
  window.handleDeleteContent = handleDeleteContent;
  window.applyContentFilters = applyContentFilters;
  window.handleContentSearch = handleContentSearch;
  window.resetContentFilters = resetContentFilters;
  window.showDeleteContentModal = showDeleteContentModal;
  window.showResetContentModal = showResetContentModal;
}

function resetContentModalState() {
  console.log('🔄 Reiniciando estado de content modal...');
  
  if (typeof contentData !== 'undefined') {
    contentData = [];
  }
  if (typeof filteredContent !== 'undefined') {
    filteredContent = [];
  }
  if (typeof currentView !== 'undefined') {
    currentView = 'grid';
  }
  
  // Destruir gráficos anteriores
  if (typeof typeChart !== 'undefined' && typeChart) {
    try {
      typeChart.destroy();
      typeChart = null;
    } catch (e) {
      console.warn('Error destruyendo typeChart:', e);
    }
  }
  if (typeof channelChart !== 'undefined' && channelChart) {
    try {
      channelChart.destroy();
      channelChart = null;
    } catch (e) {
      console.warn('Error destruyendo channelChart:', e);
    }
  }
  
  if (typeof cleanupEventListeners === 'function') {
    cleanupEventListeners();
  }
  
  if (typeof window !== 'undefined') {
    window._contentModalLoading = false;
  }
  
  resetAllContentDeleteModals();
  
  console.log('✅ Estado de content modal reiniciado completamente');
}

// Exponer función globalmente para content modal
if (typeof window !== 'undefined') {
  window.initContentModal = initContentModal;
  window.handleContentModalOpen = handleContentModalOpen;
  window.showContentDetail = showContentDetail;
  window.createContentDetailModal = createContentDetailModal;
  window.closeContentDetailModal = closeContentDetailModal;
  window.handleDeleteContent = handleDeleteContent;
  window.showDeleteContentModal = showDeleteContentModal;
  window.showResetContentModal = showResetContentModal;
  
  window.resetAllContentDeleteModals = resetAllContentDeleteModals;
  
  if (!window.contentModal) {
    window.contentModal = {};
  }
  window.contentModal.reset = resetContentModalState;
  window.contentModal.resetDeleteModals = resetAllContentDeleteModals;
}