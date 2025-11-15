/**
 * Módulo principal que inicializa y coordina todos los componentes del Panel
 */

import { ApiService } from './modules/api-inteligente.js';
import { UiManager } from './modules/ui-inteligente.js';
import { DashboardModule } from './modules/dashboard-inteligente.js';
import { SubscriptionsModule } from './modules/subscriptions-inteligente.js';
import { TransactionsModule } from './modules/transactions-inteligente.js';
import { UsersModule } from './modules/users-inteligente.js';
import { ReportsModule } from './modules/reports-inteligente.js';
import { TaxesModule } from './modules/taxes-inteligente.js';
import { AnalyticsModule } from './modules/analytics-inteligente.js';
import { SettingsModule } from './modules/settings-inteligente.js';
import { ThemeManager } from './utils/theme-inteligente.js';
import { DateRangeManager } from './utils/date-range-inteligente.js';
import { EventBus } from './utils/event-bus-inteligente.js';
import { ExpensesModule } from './modules/expenses-inteligente.js';


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * App principal que orquesta los diferentes módulos
 */
class App {
  constructor() {
    // Servicios centrales
    this.api = new ApiService();
    this.ui = new UiManager();
    this.eventBus = new EventBus();
    this.themeManager = new ThemeManager();
    this.dateRangeManager = new DateRangeManager();
    
    // Módulos por sección
    this.modules = {
      dashboard: new DashboardModule(this.api, this.ui, this.eventBus),
      subscriptions: new SubscriptionsModule(this.api, this.ui, this.eventBus),
      transactions: new TransactionsModule(this.api, this.ui, this.eventBus),
      users: new UsersModule(this.api, this.ui, this.eventBus),
      reports: new ReportsModule(this.api, this.ui, this.eventBus),
      taxes: new TaxesModule(this.api, this.ui, this.eventBus),
      analytics: new AnalyticsModule(this.api, this.ui, this.eventBus),
      settings: new SettingsModule(this.api, this.ui, this.eventBus),
      expenses: new ExpensesModule(this.api, this.ui, this.eventBus)
    };
    
    // Variables de control
    this.isInitialized = false;
    this.loadingProgress = 0;
    this.totalModules = Object.keys(this.modules).length + 3; // +3 por servicios centrales
  }
  
  /**
   * Inicializa la aplicación completa y todos sus módulos
   */
async init() {
  try {
    // Simular progreso de carga para la pantalla inicial
    this.startProgressAnimation();
    
    await this.initCoreServices();
    
    for (const [name, module] of Object.entries(this.modules)) {
      await this.initModule(name, module);
    }
    
    this.setupNavigation();
    this.setupEventListeners();
    
    this.ensureThemeSynchronization();
    
    this.isInitialized = true;
    
    this.finishLoading();
    
    this.ui.showSection('dashboard');
    
    console.log('Panel de administración financiera inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    this.handleInitError(error);
  }
}

  /**
 * Carga dinámicamente la biblioteca ExcelJS
 * Añade esta función dentro de tu clase App, después del constructor
 */
async loadExcelJS() {
  if (window.ExcelJS) {
    console.log('ExcelJS ya está disponible');
    return true;
  }

  console.log('Cargando biblioteca ExcelJS para exportaciones mejoradas...');
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('ExcelJS cargado correctamente');
      window.ExcelJS = ExcelJS;
      resolve(true);
    };
    
    script.onerror = () => {
      console.warn('No se pudo cargar ExcelJS. Las exportaciones usarán el formato básico.');
      resolve(false); // Resolvemos con false en lugar de rechazar para seguir con la inicialización
    };
    
    document.body.appendChild(script);
  });
}
  
  /**
   * Inicia la animación de progreso para la pantalla de carga
   */
startProgressAnimation() {
  // Referencias a elementos del DOM
  this.progressBar = document.getElementById('loading-progress-bar');
  this.percentageText = document.getElementById('loading-percentage');
  this.stageText = document.getElementById('loading-stage-text');
  
  if (!this.progressBar) return;
  
  // Forzar tema correcto en la pantalla de carga
  this.syncLoadingScreenTheme();
  
  this.loadingStages = [
    { id: 'init', name: 'Inicialización', start: 0, end: 15, 
      messages: ['Inicializando componentes', 'Preparando entorno', 'Configurando sistema']},
    { id: 'core', name: 'Servicios Centrales', start: 15, end: 40, 
      messages: ['Cargando API', 'Iniciando interfaz', 'Configurando tema', 'Cargando bibliotecas']},
    { id: 'modules', name: 'Módulos', start: 40, end: 70, 
      messages: ['Cargando dashboard', 'Preparando transacciones', 'Iniciando suscripciones', 'Configurando análisis']},
    { id: 'data', name: 'Datos', start: 70, end: 90, 
      messages: ['Cargando datos financieros', 'Procesando transacciones', 'Calculando métricas', 'Preparando visualizaciones']},
    { id: 'finish', name: 'Finalización', start: 90, end: 100, 
      messages: ['Finalizando carga', 'Aplicando configuraciones', 'Todo listo']}
  ];
  
  // Estado inicial - importante empezar en 0 real y no saltar inmediatamente
  this.currentStage = 0;
  this.updateLoadingProgress(0);
  this.updateStageMarkers('init');
  this.setLoadingStageText(this.loadingStages[0].messages);
  
  // Avanzar al siguiente nivel después de un tiempo para dar sensación de progreso
  // Usamos avance gradual en lugar de salto para evitar fluctuaciones
  setTimeout(() => {
    // En lugar de saltar a la etapa 1, avanzamos gradualmente dentro de la etapa 0
    this.simulateStageProgress(this.loadingStages[0]);
    
    // Después de un tiempo, avanzamos a la etapa 1
    setTimeout(() => this.advanceToStage(1), 1200);
  }, 500);
}

/**
 * Verifica y repara la sincronización del tema
 * Colocar esta función después de setupEventListeners()
 */
ensureThemeSynchronization() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const toggleState = themeToggle.checked;
    
    // Si hay desincronización, corregirla
    if (isDarkMode !== toggleState) {
      console.log('Corrigiendo desincronización de tema. DOM:', isDarkMode, 'Toggle:', toggleState);
      themeToggle.checked = isDarkMode;
      
      // Forzar una actualización del tema desde el estado actual del DOM
      this.themeManager.setTheme(isDarkMode);
    }
  }
}

/**
 * Sincroniza el tema de la pantalla de carga con las preferencias actuales
 * Evita iniciar en modo oscuro si no corresponde
 */
syncLoadingScreenTheme() {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen) return;
  
  let darkModePreferred = false;
  
  try {
    // Primero intentar leer de localStorage
    const savedTheme = localStorage.getItem('financeDashboard_darkMode');
    if (savedTheme !== null) {
      darkModePreferred = savedTheme === 'true';
    } else {
      // Si no hay tema guardado, usar preferencia del sistema
      darkModePreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch (error) {
    console.warn('Error al leer preferencia de tema:', error);
  }
  
  if (darkModePreferred) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

/**
 * Avanza a una etapa específica - versión mejorada para evitar retrocesos
 * @param {number} stageIndex - Índice de la etapa
 */
advanceToStage(stageIndex) {
  if (stageIndex >= this.loadingStages.length) return;
  
  if (this.currentSimulationInterval) {
    clearInterval(this.currentSimulationInterval);
    this.currentSimulationInterval = null;
  }
  
  const prevStage = this.loadingStages[this.currentStage];
  const newStage = this.loadingStages[stageIndex];
  this.currentStage = stageIndex;
  
  this.updateStageMarkers(newStage.id);
  this.setLoadingStageText(newStage.messages);
  
  // Importante: verificar si el progreso actual ya excede el inicio de la nueva etapa
  const targetValue = Math.max(this.loadingProgress, newStage.start);
  
  // Animación suave hasta el valor objetivo
  this.animateProgressTo(this.loadingProgress, targetValue, 600, () => {
    // Solo simular progreso si no estamos ya por delante
    if (this.loadingProgress < newStage.end * 0.85) {
      this.simulateStageProgress(newStage);
    }
  });
}


/**
 * Configura un mensaje de texto para la etapa de carga
 * @param {string[]} messages - Array de posibles mensajes
 */
setLoadingStageText(messages) {
  if (!this.stageText || !messages || !messages.length) return;
  
  // Seleccionar un mensaje aleatorio
  const message = messages[Math.floor(Math.random() * messages.length)];
  
  // Animación de desvanecimiento
  this.stageText.style.opacity = 0;
  setTimeout(() => {
    this.stageText.textContent = message;
    this.stageText.style.opacity = 0.8;
  }, 300);
}


/**
 * Actualiza los marcadores de etapa en la UI
 * @param {string} currentStageId - ID de la etapa actual
 */
updateStageMarkers(currentStageId) {
  this.loadingStages.forEach(stage => {
    const marker = document.getElementById(`stage-${stage.id}`);
    const label = document.getElementById(`label-${stage.id}`);
    
    if (marker && label) {
      if (stage.id === currentStageId) {
        marker.classList.add('active');
        label.classList.add('active');
      } else if (stage.start < this.loadingStages[this.currentStage].start) {
        // Etapas anteriores
        marker.classList.add('active');
        label.classList.remove('active');
      } else {
        // Etapas siguientes
        marker.classList.remove('active');
        label.classList.remove('active');
      }
    }
  });
}

/**
 * Anima la barra de progreso de un valor a otro
 * @param {number} from - Porcentaje inicial
 * @param {number} to - Porcentaje final
 * @param {number} duration - Duración en ms
 * @param {Function} callback - Función a ejecutar al terminar
 */
animateProgressTo(from, to, duration, callback) {
  const startTime = performance.now();
  
  const animate = (time) => {
    const elapsedTime = time - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easedProgress = this.easeOutCubic(progress);
    
    const currentValue = from + (to - from) * easedProgress;
    this.updateLoadingProgress(currentValue);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else if (callback) {
      callback();
    }
  };
  
  requestAnimationFrame(animate);
}

/**
 * Función de suavizado para animaciones
 * @param {number} x - Valor entre 0 y 1
 * @returns {number} Valor suavizado
 */
easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Simula el progreso dentro de una etapa - versión mejorada
 * @param {Object} stage - Etapa actual
 */
simulateStageProgress(stage) {
  // No simular en la etapa final
  if (stage.id === 'finish') return;
  
  // Solo permitir una simulación por etapa para evitar múltiples intervalos
  if (this.currentSimulationInterval) {
    clearInterval(this.currentSimulationInterval);
  }
  
  const duration = getRandomInt(1500, 3000); // Duración aleatoria
  const steps = getRandomInt(5, 8); // Número de pasos aleatorio
  const stepTime = duration / steps;
  
  let currentStep = 0;
  // Importante: empezar siempre desde el valor actual real para evitar retrocesos
  let currentProgress = this.loadingProgress;
  const targetProgress = stage.start + (stage.end - stage.start) * 0.85; // Usar 85% de la etapa
  const progressIncrement = (targetProgress - currentProgress) / steps;
  
  // Asegurarnos de que siempre sea incremento positivo
  if (progressIncrement <= 0) return;
  
  // Ciclo de pasos
  this.currentSimulationInterval = setInterval(() => {
    currentStep++;
    if (currentStep >= steps) {
      clearInterval(this.currentSimulationInterval);
      this.currentSimulationInterval = null;
      return;
    }
    
    currentProgress += progressIncrement;
    // Asegurarnos de no exceder el límite de la etapa
    if (currentProgress > targetProgress) {
      currentProgress = targetProgress;
    }
    this.updateLoadingProgress(currentProgress);
  }, stepTime);
}

  
  /**
   * Actualiza el indicador de progreso de carga
   * @param {number} value - Porcentaje de progreso (0-100)
   */
  updateLoadingProgress(value) {
    if (!this.progressBar) return;
    
    const cappedValue = Math.min(Math.max(value, 0), 100);
    this.progressBar.style.width = `${cappedValue}%`;
    this.loadingProgress = cappedValue;
    
    if (this.percentageText) {
      this.percentageText.textContent = `${Math.round(cappedValue)}%`;
    }
  }


  /**
 * Carga dinámicamente la biblioteca pdfmake
 * Añade esta función dentro de tu clase App, después de loadExcelJS
 */
async loadPDFMake() {
  if (window.pdfMake) {
    console.log('pdfMake ya está disponible');
    return true;
  }

  console.log('Cargando biblioteca pdfMake para exportaciones a PDF...');
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('pdfMake cargado correctamente');
      
      const fontsScript = document.createElement('script');
      fontsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
      fontsScript.async = true;
      
      fontsScript.onload = () => {
        console.log('vfs_fonts cargado correctamente');
        resolve(true);
      };
      
      fontsScript.onerror = () => {
        console.warn('No se pudo cargar vfs_fonts. Las exportaciones a PDF usarán fuentes predeterminadas.');
        // Resolvemos con true de todos modos porque pdfmake funciona incluso sin fuentes personalizadas
        resolve(true);
      };
      
      document.body.appendChild(fontsScript);
    };
    
    script.onerror = () => {
      console.warn('No se pudo cargar pdfMake. Las exportaciones a PDF no estarán disponibles.');
      resolve(false); // Resolvemos con false en lugar de rechazar para seguir con la inicialización
    };
    
    document.body.appendChild(script);
  });
}
  
/**
 * Inicializa los servicios centrales de la aplicación
 */
async initCoreServices() {
  try {
    await this.api.init();
    this.updateLoadingProgress(20);
    
    this.ui.init();
    this.updateLoadingProgress(25);
    
    await this.themeManager.init();
    this.updateLoadingProgress(30);
    
    await this.loadExcelJS();
    this.advanceToStage(2); // Avanzar a la etapa de módulos
    
    await this.loadPDFMake();
    this.updateLoadingProgress(45);
    
    try {
      console.log('Inicializando DateRangeManager con eventBus...');
      await this.dateRangeManager.init(this.eventBus);
      console.log('DateRangeManager inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar DateRangeManager:', error);
    }
    this.updateLoadingProgress(50);
    
    if (!window.financeAdmin) {
      window.financeAdmin = {};
    }
    window.financeAdmin.eventBus = this.eventBus;
    console.log('EventBus exportado globalmente para comunicación entre módulos');
  } catch (error) {
    console.error('Error al inicializar servicios centrales:', error);
    throw error;
  }
}
  
  /**
   * Inicializa un módulo específico
   * @param {string} name - Nombre del módulo
   * @param {object} module - Instancia del módulo
   */
async initModule(name, module) {
  console.log(`Inicializando módulo: ${name}`);
  
  if (this.stageText) {
    this.stageText.style.opacity = 0;
    setTimeout(() => {
      this.stageText.textContent = `Cargando módulo: ${name}`;
      this.stageText.style.opacity = 0.8;
    }, 200);
  }
  
  await module.init();
  
  const progressIncrement = 20 / this.totalModules;
  this.updateLoadingProgress(this.loadingProgress + progressIncrement);
  
  // Si hemos cargado la mitad de los módulos, avanzar a la siguiente etapa
  const loadedModuleIndex = Object.keys(this.modules).indexOf(name);
  if (loadedModuleIndex === Math.floor(Object.keys(this.modules).length / 2)) {
    this.advanceToStage(3); // Avanzar a la etapa de datos
  }
}
  
  /**
   * Configura la navegación entre secciones
   */
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const sectionId = link.getAttribute('data-section');
        if (!sectionId) return;
        
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        link.classList.add('active');
        
        this.ui.showSection(sectionId);
        
        // En móvil, cerrar sidebar automáticamente
        if (window.innerWidth < 992) {
          this.ui.toggleSidebar(false);
        }
        
        window.location.hash = sectionId;
      });
    });
    
    this.handleInitialHash();
  }
  
  /**
   * Maneja el hash inicial de la URL para navegación directa
   */
  handleInitialHash() {
    const hash = window.location.hash.substring(1); // Quitar # del hash
    if (hash) {
      const targetLink = document.querySelector(`.nav-link[data-section="${hash}"]`);
      if (targetLink) {
        // Simular clic en el enlace
        targetLink.click();
      }
    }
  }
  
  /**
   * Configura los event listeners globales
   */
  setupEventListeners() {
    // Toggle del sidebar en móvil
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        this.ui.toggleSidebar(true);
      });
    }
    
    // Botón de cierre del sidebar en móvil
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        this.ui.toggleSidebar(false);
      });
    }
    
    // Backdrop para cerrar sidebar al hacer clic fuera
    const backdrop = document.getElementById('content-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.ui.toggleSidebar(false);
      });
    }
    
    // Toggle de tema claro/oscuro
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      console.log('Theme toggle clicked');
      this.themeManager.toggleTheme();
    });
    
    themeToggle.addEventListener('change', () => {
      console.log('Theme toggle changed');
      this.themeManager.toggleTheme();
    });
    
    themeToggle.checked = this.themeManager.isDarkMode();
    console.log('Theme toggle initial state:', themeToggle.checked);
  } else {
    console.warn('Theme toggle element not found');
  }
    
    document.getElementById('date-range').addEventListener('change', (e) => {
      const dateRange = e.target.value;
      this.eventBus.emit('dateRangeChanged', dateRange);
    });
    
    window.addEventListener('resize', () => {
      this.ui.handleResize();
    });
  }
  
  /**
   * Finaliza la carga y oculta la pantalla de carga
   */
  finishLoading() {
    // Avanzar a la etapa final
    this.advanceToStage(this.loadingStages.length - 1);
    
    if (this.stageText) {
      this.stageText.style.opacity = 0;
      setTimeout(() => {
        this.stageText.textContent = "¡Todo listo!";
        this.stageText.style.opacity = 1;
      }, 300);
    }
    
    this.animateProgressTo(this.loadingProgress, 100, 800, () => {
      // Pequeña pausa antes de ocultar
      setTimeout(() => {
        window.financeAdmin.hideLoadingScreen();
      }, 600);
    });
    
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }
  
  /**
   * Maneja errores durante la inicialización
   * @param {Error} error - Error ocurrido
   */
  handleInitError(error) {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
    
    window.financeAdmin.hideLoadingScreen();
    
    this.ui.showErrorMessage('Error al inicializar la aplicación', error.message);
    
    console.error('Detalles del error:', error);
  }
}

export default new App();