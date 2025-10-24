/**
 * 🦫 SISTEMA DE NOTIFICACIONES DEL PROFESOR ACADEL - CONFETTI MEJORADO
 * Un sistema divertido y con personalidad para todas las notificaciones
 * VERSIÓN CON CONFETTI REALISTA
 */

// ====== CONFIGURACIÓN Y FRASES DEL PROFESOR ACADEL ======
const ACADEL_FRASES = {
  exito: {
    titulos: [
      "¡Excelente trabajo! 🎉",
      "¡Lo lograste! 🦫",
      "¡Perfecto! Como mi pelaje",
      "¡Bien hecho, estudiante!",
      "¡Eso es lo que me gusta ver!",
      "¡Magistral! 🎓",
      "¡Increíble progreso!",
      "¡Como todo un académico!"
    ],
    mensajes: [
      "Acadel está orgulloso de tu progreso",
      "Otro éxito más para la colección",
      "Sigue así y superarás hasta a Einstein",
      "Tu capibara favorito está feliz",
      "Operación exitosa, como siempre",
      "El conocimiento fluye como el agua",
      "¡Eres imparable, estudiante!",
      "Academia level: Expert unlocked"
    ]
  },
  
  error: {
    titulos: [
      "¡Ups! Algo no salió bien 😅",
      "Houston, tenemos un problema",
      "Error detectado por Acadel",
      "¡Vaya! Se complicó la cosa",
      "Acadel está confundido 🤔",
      "¡Rayos! Falló el plan",
      "Error nivel: Intermedio",
      "¡Momento awkward académico!"
    ],
    mensajes: [
      "Pero no te preocupes, todos erramos",
      "Hasta los capibara tenemos días difíciles",
      "Es parte del proceso de aprendizaje",
      "¡Tranquilo! Lo resolveremos juntos",
      "Error temporal, paciencia infinita",
      "Acadel está investigando el problema",
      "Los errores son oportunidades disfrazadas",
      "Reinicia y volvemos a la carga"
    ]
  },
  
  info: {
    titulos: [
      "Acadel tiene algo que decirte 📢",
      "Información importante aquí",
      "Tu profesor capibara informa:",
      "Dato curioso del día",
      "Acadel explica:",
      "Información académica detectada",
      "¡Atención, estudiante!",
      "Desde el laboratorio de Acadel:"
    ],
    mensajes: [
      "Mantente informado, mantente sabio",
      "El conocimiento es poder, úsalo bien",
      "Acadel siempre tiene algo interesante",
      "Información fresca del mundo académico",
      "Tu dosis diaria de sabiduría",
      "Porque estar informado es estar preparado",
      "Datos importantes para tu progreso",
      "Academia news, fresh from the lab"
    ]
  },
  
  warning: {
    titulos: [
      "⚠️ Acadel advierte:",
      "Cuidado con eso, estudiante",
      "Atención: Zona de precaución",
      "¡Ojo aquí! 👁️",
      "Acadel detecta riesgo",
      "Advertencia académica",
      "¡Alto! Moment to think",
      "Red flag detected 🚩"
    ],
    mensajes: [
      "Mejor prevenir que lamentar",
      "Acadel cuida de sus estudiantes",
      "La precaución es sabiduría",
      "Un paso atrás, dos hacia adelante",
      "Safety first, como dice mi abuela capibara",
      "Revisemos esto antes de continuar",
      "La prudencia es virtud académica",
      "Tu bienestar es mi prioridad"
    ]
  },
  
  loading: {
    titulos: [
      "Acadel está trabajando... 🔄",
      "Procesando datos académicos",
      "Cargando sabiduría...",
      "Acadel piensa intensamente",
      "Calculando respuesta perfecta",
      "Loading... Como mi conexión wifi",
      "Procesando en el laboratorio",
      "Acadel está en modo focus"
    ],
    mensajes: [
      "La paciencia es virtud de sabios",
      "Buenos resultados toman tiempo",
      "Preparando algo increíble para ti",
      "El cerebro de capibara está a full",
      "Loading bar al 99%... eternamente",
      "Procesando con amor académico",
      "Worth the wait, prometo",
      "Acadel doesn't rush excellence"
    ]
  },
  
  confetti: {
    titulos: [
      "🎉 ¡CELEBRACIÓN ACADÉMICA! 🎉",
      "¡PARTY TIME EN LA ACADEMIA!",
      "🎊 ¡MOMENTO ÉPICO! 🎊",
      "¡ACADEL ESTÁ EUFÓRICO!",
      "🥳 ¡ACHIEVEMENT UNLOCKED! 🥳",
      "¡ESTO MERECE FIESTA!",
      "🎈 ¡CELEBREMOS JUNTOS! 🎈",
      "¡ACADEL DANCE MODE: ON!"
    ],
    mensajes: [
      "¡Esto definitivamente merece confetti!",
      "Acadel está bailando de felicidad",
      "¡Momento histórico en la academia!",
      "Tu progreso emociona hasta a los capibara",
      "¡Celebration level: MAXIMUM!",
      "¡Eres oficialmente increíble!",
      "Acadel approved celebration 🦫",
      "¡Party like it's 1999! (pero académico)"
    ]
  }
};

// Iconos para cada tipo de notificación
const ACADEL_ICONOS = {
  exito: ['bx-check-circle', 'bx-party', 'bx-trophy', 'bx-medal'],
  error: ['bx-confused', 'bx-dizzy', 'bx-question-mark', 'bx-sad'],
  info: ['bx-info-circle', 'bx-bulb', 'bx-brain', 'bx-bookmark'],
  warning: ['bx-traffic-cone', 'bx-shield', 'bx-alarm', 'bx-error-alt'],
  loading: ['bx-loader-alt', 'bx-cog', 'bx-refresh', 'bx-time'],
  confetti: ['bx-party', 'bx-crown', 'bx-star', 'bx-rocket']
};

// ====== SISTEMA DE CONFETTI REALISTA ======
class ConfettiParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6; // Velocidad horizontal aleatoria
    this.vy = Math.random() * -4 - 2; // Velocidad vertical inicial (hacia arriba)
    this.gravity = 0.2;
    this.friction = 0.98;
    this.color = color;
    this.width = Math.random() * 8 + 4;
    this.height = Math.random() * 8 + 4;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.opacity = 1;
    this.fadeSpeed = Math.random() * 0.02 + 0.005;
    this.life = 0;
    this.maxLife = 200 + Math.random() * 100;
  }
  
  update() {
    this.life++;
    
    // Física
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    
    // Fade out
    if (this.life > this.maxLife * 0.7) {
      this.opacity -= this.fadeSpeed;
    }
    
    return this.opacity > 0 && this.life < this.maxLife;
  }
  
  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
    ctx.restore();
  }
}

class ConfettiSystem {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.isActive = false;
    
    this.colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
    ];
  }
  
  createCanvas(notification) {
    // Crear canvas si no existe
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'acadel-confetti-canvas';
      this.ctx = this.canvas.getContext('2d');
      
      // Estilos del canvas
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '9999';
      this.canvas.style.borderRadius = '16px';
      this.canvas.style.overflow = 'hidden';
      
      // Agregar al container de notificaciones
      const container = document.querySelector('.acadel-notifications-container');
      if (container) {
        container.appendChild(this.canvas);
      }
    }
    
    // Ajustar tamaño del canvas al área de notificaciones
    const container = document.querySelector('.acadel-notifications-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = window.innerHeight;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
    }
  }
  
  launch(notification) {
    if (!notification) return;
    
    this.createCanvas();
    
    // Obtener posición de la notificación
    const rect = notification.getBoundingClientRect();
    const containerRect = document.querySelector('.acadel-notifications-container').getBoundingClientRect();
    
    // Calcular posición relativa al contenedor
    const startX = rect.left - containerRect.left + rect.width / 2;
    const startY = rect.top - containerRect.top + rect.height;
    
    // Crear partículas desde el bottom center de la notificación
    const particleCount = 25 + Math.random() * 15;
    
    for (let i = 0; i < particleCount; i++) {
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      const offsetX = (Math.random() - 0.5) * rect.width * 0.8;
      const particle = new ConfettiParticle(startX + offsetX, startY, color);
      this.particles.push(particle);
    }
    
    // Iniciar animación si no está activa
    if (!this.isActive) {
      this.isActive = true;
      this.animate();
    }
  }
  
  animate() {
    if (!this.ctx) return;
    
    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Actualizar y renderizar partículas
    this.particles = this.particles.filter(particle => {
      const alive = particle.update();
      if (alive) {
        particle.render(this.ctx);
      }
      return alive;
    });
    
    // Continuar animación si hay partículas
    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }
  
  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Limpiar canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  cleanup() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
      this.ctx = null;
    }
    this.particles = [];
  }
}

// Instancia global del sistema de confetti
const confettiSystem = new ConfettiSystem();

// ====== CLASE PRINCIPAL DEL SISTEMA ======
class AcadelNotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.duplicateMap = new Map(); // Para trackear duplicados
    this.queue = [];
    this.maxVisible = 3;
    this.currentId = 0;
    this.isProcessingQueue = false;
    
    this.init();
    this.setupEventDelegation();
  }
  
  init() {
    // Crear contenedor si no existe
    if (!document.querySelector('.acadel-notifications-container')) {
      this.container = document.createElement('div');
      this.container.className = 'acadel-notifications-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.acadel-notifications-container');
    }
  }
  
  setupEventDelegation() {
    if (this.container) {
      this.container.addEventListener('click', (event) => {
        const closeButton = event.target.closest('.acadel-close');
        if (closeButton) {
          event.preventDefault();
          event.stopPropagation();
          
          const notificationElement = closeButton.closest('.notificacion-acadel');
          if (notificationElement && notificationElement.dataset.id) {
            const notificationId = parseInt(notificationElement.dataset.id);
            this.cerrar(notificationId);
          }
        }
      });
    }
  }
  
mostrar(tipo, titulo = null, mensaje = null, duracion = 2500, opciones = {}) {
  const id = ++this.currentId;
  
  // Obtener frase aleatoria si no se proporciona
  if (!titulo || !mensaje) {
    const frases = this.obtenerFraseAleatoria(tipo);
    titulo = titulo || frases.titulo;
    mensaje = mensaje || frases.mensaje;
  }
  
  // Crear key único para detectar duplicados
  const duplicateKey = this.crearClaveUnica(tipo, titulo, mensaje);
  
  // Si ya existe una notificación idéntica, actualizarla en lugar de crear nueva
  if (this.duplicateMap.has(duplicateKey)) {
    const existingId = this.duplicateMap.get(duplicateKey);
    const existingElement = this.notifications.get(existingId);
    
    if (existingElement && !existingElement.classList.contains('hide')) {
      // Actualizar la notificación existente
      this.actualizarNotificacion(existingId, titulo, mensaje, duracion);
      return existingId;
    } else {
      // La notificación anterior ya no existe o se está ocultando, limpiar el map
      this.duplicateMap.delete(duplicateKey);
    }
  }
  
  const notificacion = {
    id,
    tipo,
    titulo,
    mensaje,
    duracion,
    icono: this.obtenerIconoAleatorio(tipo),
    duplicateKey,
    ...opciones
  };
  
  // Registrar en el mapa de duplicados
  this.duplicateMap.set(duplicateKey, id);
  
  // Si hay muchas notificaciones visibles, agregar a la cola
  if (this.notifications.size >= this.maxVisible) {
    this.queue.push(notificacion);
  } else {
    this.crear(notificacion);
  }
  
  return id;
}

// ====== CREAR CLAVE ÚNICA PARA DETECTAR DUPLICADOS ======
crearClaveUnica(tipo, titulo, mensaje) {
  // Normalizar texto para comparación más efectiva
  const tituloNorm = (titulo || '').toLowerCase().trim();
  const mensajeNorm = (mensaje || '').toLowerCase().trim();
  return `${tipo}:${tituloNorm}:${mensajeNorm}`;
}

// ====== ACTUALIZAR NOTIFICACIÓN EXISTENTE ======
actualizarNotificacion(id, titulo, mensaje, duracion) {
  const elemento = this.notifications.get(id);
  if (!elemento) return;
  
  // Actualizar contenido
  const tituloEl = elemento.querySelector('.acadel-titulo');
  const mensajeEl = elemento.querySelector('.acadel-mensaje');
  const progressEl = elemento.querySelector('.acadel-progress');
  
  if (tituloEl) tituloEl.textContent = titulo;
  if (mensajeEl) mensajeEl.textContent = mensaje;
  
  // Reiniciar barra de progreso si existe
  if (progressEl && duracion > 0) {
    progressEl.style.animation = 'none';
    progressEl.offsetHeight; // Trigger reflow
    progressEl.style.setProperty('--duration', `${duracion}ms`);
    progressEl.style.animation = 'acadel-progress-animation var(--duration) linear forwards';
  }
  
  // Agregar efecto visual de actualización
  elemento.classList.add('updated');
  setTimeout(() => elemento.classList.remove('updated'), 300);
  
  // Limpiar timeout anterior si existe
  if (elemento.autoCloseTimeout) {
    clearTimeout(elemento.autoCloseTimeout);
  }
  
  // Configurar nuevo auto-close si tiene duración
  if (duracion > 0) {
    elemento.autoCloseTimeout = setTimeout(() => {
      this.cerrar(id);
    }, duracion);
  }
}
  // ====== CREAR ELEMENTO DE NOTIFICACIÓN - CON CONFETTI MEJORADO ======
  crear(notificacion) {
    // Si ya tenemos el máximo, eliminar la más antigua
    if (this.notifications.size >= this.maxVisible) {
      const primeraNotificacion = this.notifications.keys().next().value;
      if (primeraNotificacion) {
        const elementoAntiguo = this.notifications.get(primeraNotificacion);
        if (elementoAntiguo) {
          elementoAntiguo.classList.add('being-replaced');
          setTimeout(() => {
            this.cerrar(primeraNotificacion);
          }, 100);
        }
      }
    }
    
    const elemento = document.createElement('div');
    elemento.className = `notificacion-acadel ${notificacion.tipo}`;
    elemento.dataset.id = notificacion.id;
    
    elemento.innerHTML = `
      <div class="acadel-avatar">
        <i class="bx ${notificacion.icono}"></i>
      </div>
      <div class="acadel-content">
        <h4 class="acadel-titulo">${notificacion.titulo}</h4>
        <p class="acadel-mensaje">${notificacion.mensaje}</p>
      </div>
      <button class="acadel-close" type="button" aria-label="Cerrar notificación">
        <i class="bx bx-x"></i>
      </button>
      ${notificacion.duracion > 0 ? `<div class="acadel-progress" style="--duration: ${notificacion.duracion}ms;"></div>` : ''}
    `;
    
    // Agregar al contenedor
    this.container.appendChild(elemento);
    this.notifications.set(notificacion.id, elemento);
    
    // Gestionar stacking
    this.gestionarStack();
    
    // Mostrar con animación
    requestAnimationFrame(() => {
      elemento.classList.add('show');
      
      // ⭐ LANZAR CONFETTI SI ES TIPO CONFETTI
      if (notificacion.tipo === 'confetti') {
        setTimeout(() => {
          confettiSystem.launch(elemento);
        }, 200); // Pequeño delay para que la notificación esté completamente visible
      }
    });
    
// Almacenar información adicional en el elemento
elemento.duplicateKey = notificacion.duplicateKey;
elemento.autoCloseTimeout = null;

// Auto-remove si tiene duración
if (notificacion.duracion > 0) {
  elemento.autoCloseTimeout = setTimeout(() => {
    this.cerrar(notificacion.id);
  }, notificacion.duracion);
}
    // Agregar eventos adicionales
    this.agregarEventos(elemento, notificacion);
  }
  
  // ====== GESTIONAR STACK VISUAL ======
  gestionarStack() {
    const elementos = Array.from(this.container.children).filter(el => 
      el.classList.contains('notificacion-acadel')
    );
    const total = elementos.length;
    
    if (total >= this.maxVisible) {
      this.container.classList.add('max-stack');
    } else {
      this.container.classList.remove('max-stack');
    }
    
    elementos.forEach((el, index) => {
      el.classList.remove('stacked', 'stacked-2');
      
      const position = total - 1 - index;
      
      if (position === 1) {
        el.classList.add('stacked');
      } else if (position === 2) {
        el.classList.add('stacked-2');
      }
    });
    
    if (total > this.maxVisible) {
      elementos.slice(0, total - this.maxVisible).forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(0) translateY(-20px) scale(0.85)';
      });
    }
  }
  
  // ====== CERRAR NOTIFICACIÓN ======
cerrar(id) {
  const elemento = this.notifications.get(id);
  if (!elemento) return;
  
  // Limpiar timeout si existe
  if (elemento.autoCloseTimeout) {
    clearTimeout(elemento.autoCloseTimeout);
    elemento.autoCloseTimeout = null;
  }
  
  // Limpiar del mapa de duplicados
  if (elemento.duplicateKey) {
    this.duplicateMap.delete(elemento.duplicateKey);
  }
  
  // Agregar clase de ocultamiento
  elemento.classList.add('hide');
  
  // Actualizar el stack inmediatamente
  setTimeout(() => {
    this.gestionarStack();
  }, 50);
  
  // Eliminar del DOM después de la animación
  setTimeout(() => {
    if (elemento.parentNode) {
      elemento.parentNode.removeChild(elemento);
    }
    this.notifications.delete(id);
    
    // Actualizar stack nuevamente después de eliminar
    this.gestionarStack();
    this.procesarCola();
  }, 300);
}
  
  // ====== PROCESAR COLA DE NOTIFICACIONES ======
  procesarCola() {
    if (this.queue.length > 0 && this.notifications.size < this.maxVisible) {
      const siguiente = this.queue.shift();
      this.crear(siguiente);
    }
  }
  
  // ====== OBTENER FRASE ALEATORIA ======
  obtenerFraseAleatoria(tipo) {
    const frases = ACADEL_FRASES[tipo] || ACADEL_FRASES.info;
    const titulo = frases.titulos[Math.floor(Math.random() * frases.titulos.length)];
    const mensaje = frases.mensajes[Math.floor(Math.random() * frases.mensajes.length)];
    
    return { titulo, mensaje };
  }
  
  // ====== OBTENER ICONO ALEATORIO ======
  obtenerIconoAleatorio(tipo) {
    const iconos = ACADEL_ICONOS[tipo] || ACADEL_ICONOS.info;
    return iconos[Math.floor(Math.random() * iconos.length)];
  }
  
  // ====== AGREGAR EVENTOS ======
  agregarEventos(elemento, notificacion) {
    // Pausar auto-close en hover
    if (notificacion.duracion > 0) {
      const progressBar = elemento.querySelector('.acadel-progress');
      
      elemento.addEventListener('mouseenter', () => {
        if (progressBar) {
          progressBar.style.animationPlayState = 'paused';
        }
      });
      
      elemento.addEventListener('mouseleave', () => {
        if (progressBar) {
          progressBar.style.animationPlayState = 'running';
        }
      });
    }
    
    // Click en la notificación (opcional callback)
    if (notificacion.onClick) {
      elemento.addEventListener('click', (e) => {
        if (!e.target.closest('.acadel-close')) {
          notificacion.onClick(notificacion.id);
        }
      });
      elemento.style.cursor = 'pointer';
    }
  }
  
  // ====== LIMPIAR TODAS LAS NOTIFICACIONES ======
  limpiarTodas() {
    this.notifications.forEach((elemento, id) => {
      this.cerrar(id);
    });
    this.queue = [];
    confettiSystem.cleanup(); // Limpiar confetti también
  }
}

// ====== CREAR INSTANCIA GLOBAL ======
const acadelNotifications = new AcadelNotificationManager();

// ====== HACER LA INSTANCIA ACCESIBLE GLOBALMENTE ======
window.acadelNotifications = acadelNotifications;

// ====== FUNCIONES GLOBALES FÁCILES DE USAR ======

/**
 * 🎉 Mostrar notificación de ÉXITO
 */
window.acadelExito = (titulo, mensaje, duracion = 3000) => {
  return acadelNotifications.mostrar('exito', titulo, mensaje, duracion);
};

/**
 * ❌ Mostrar notificación de ERROR
 */
window.acadelError = (titulo, mensaje, duracion = 3000) => {
  return acadelNotifications.mostrar('error', titulo, mensaje, duracion);
};

/**
 * ℹ️ Mostrar notificación de INFORMACIÓN
 */
window.acadelInfo = (titulo, mensaje, duracion = 2000) => {
  return acadelNotifications.mostrar('info', titulo, mensaje, duracion);
};

/**
 * ⚠️ Mostrar notificación de ADVERTENCIA
 */
window.acadelWarning = (titulo, mensaje, duracion = 3000) => {
  return acadelNotifications.mostrar('warning', titulo, mensaje, duracion);
};

/**
 * 🔄 Mostrar notificación de CARGA
 */
window.acadelLoading = (titulo, mensaje, duracion = 0) => {
  return acadelNotifications.mostrar('loading', titulo, mensaje, duracion);
};

/**
 * 🎊 Mostrar notificación de CELEBRACIÓN CON CONFETTI REALISTA
 */
window.acadelConfetti = (titulo, mensaje, duracion = 4000) => {
  return acadelNotifications.mostrar('confetti', titulo, mensaje, duracion);
};

/**
 * 🧹 Cerrar notificación específica
 */
window.acadelCerrar = (id) => {
  return acadelNotifications.cerrar(id);
};

/**
 * 🧹 Limpiar todas las notificaciones
 */
window.acadelLimpiarTodas = () => {
  return acadelNotifications.limpiarTodas();
};

/**
 * 🎯 Función general con más opciones
 */
window.acadelMostrar = (tipo, titulo, mensaje, duracion = 5000, opciones = {}) => {
  return acadelNotifications.mostrar(tipo, titulo, mensaje, duracion, opciones);
};

// ====== INTEGRACIÓN CON EL SISTEMA EXISTENTE ======
window.showError = (mensaje) => acadelError(null, mensaje);
window.showSuccess = (mensaje) => acadelExito(null, mensaje);
window.showNotification = (mensaje, tipo = 'info') => {
  const tipoMap = {
    'error': 'error',
    'success': 'exito',
    'info': 'info',
    'warning': 'warning'
  };
  
  const tipoAcadel = tipoMap[tipo] || 'info';
  return acadelNotifications.mostrar(tipoAcadel, null, mensaje);
};

// ⭐ FUNCIÓN DE PRUEBA MEJORADA
window.testAcadelNotifications = () => {
  console.log('🧪 Probando sistema de notificaciones...');
  
  acadelExito('¡Prueba exitosa!', 'El sistema funciona perfectamente');
  
  setTimeout(() => {
    acadelInfo('Notificación de prueba', 'Todo funcionando correctamente');
  }, 500);
  
  setTimeout(() => {
    acadelConfetti('¡CONFETTI REALISTA!', '¡Mira cómo caen las partículas!');
  }, 1000);
};

console.log('✅ Sistema de notificaciones Acadel con confetti realista cargado');
console.log('🎊 Usa testAcadelNotifications() para ver el confetti en acción');