/**
 * Clase para manejar la animación circular del chigüire durante la carga de PDFs
 */
export class ChiguireAnimation {
/**
 * Constructor con corrección de circunferencia
 * @param {Object} options - Opciones de configuración
 */
constructor(options = {}) {
  this.container = options.container || document.querySelector('.chiguire-circle-container');
  this.chiguire = options.chiguire || document.querySelector('.chiguire-gif');
  this.progressRing = options.progressRing || document.querySelector('.progress-ring-circle');
  this.progressText = options.progressText || document.querySelector('.progress-text');
  this.progressPercentage = options.progressPercentage || document.querySelector('.progress-percentage');
  
  this.isAnimating = false;
  this.progress = 0;
  this.particles = [];
  this.particlesContainer = null;
  
  // CORREGIDO: Calcular la circunferencia correctamente basada en los atributos reales del SVG
  if (this.progressRing) {
    // Intentar obtener el radio del atributo r del SVG
    const radius = parseFloat(this.progressRing.getAttribute('r') || 90);
    this.circumference = 2 * Math.PI * radius;
    console.log(`Circunferencia inicializada: ${this.circumference} (radio: ${radius})`);
    
    // Inicializar el dasharray y dashoffset
    this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
    this.progressRing.style.strokeDashoffset = this.circumference; // Inicia en 0%
  } else {
    // Valor predeterminado si no se puede obtener del SVG
    this.circumference = 2 * Math.PI * 90;
    console.warn('No se pudo obtener el elemento progressRing, usando valor predeterminado para la circunferencia');
  }
  
  this.options = {
    particleCount: options.particleCount || 15,
    particleColors: options.particleColors || ['#a4ac86', '#d5dac7', '#7f4f24', '#936639'],
    walkingSpeed: options.walkingSpeed || 80, // ms por efecto
    celebrationColors: options.celebrationColors || ['#FFD700', '#FF6B6B', '#4CAF50', '#42A5F5', '#FFA726'],
    ...options
  };
  
  this.init();
}
  
  /**
   * Inicializa la animación
   */
  init() {
    if (!this.container) return;
    
    // Crear contenedor de partículas si no existe
    if (!this.particlesContainer) {
      this.particlesContainer = document.querySelector('.particles-container');
      if (!this.particlesContainer) {
        this.particlesContainer = document.createElement('div');
        this.particlesContainer.className = 'particles-container';
        this.container.appendChild(this.particlesContainer);
      }
    }
    
    // Crear gradiente SVG dinámicamente si no existe
    this.createGradientDefinition();
  }
  
  /**
 * Pausa la animación del chigüire sin resetear el progreso
 * Nuevo método para evitar el reseteo del progreso al completar
 */
  pause() {
    // Detener intervalos de animación pero mantener el estado visual
    if (this.walkingInterval) {
      clearInterval(this.walkingInterval);
    }
    
    if (this.orbitalInterval) {
      clearInterval(this.orbitalInterval);
    }
    
    this.isAnimating = false;
  
  // IMPORTANTE: No eliminar la clase 'completed' ni resetear el progreso
  // La diferencia con stop() es que no resetea el estado visual
}

  /**
   * Crea la definición de gradiente para el anillo de progreso
   */
  createGradientDefinition() {
    // Verificar si ya existe
    if (document.getElementById('chiguire-progress-gradient')) return;
    
    // Crear elemento defs para el SVG
    const svgElement = document.querySelector('.chiguire-progress-ring');
    if (!svgElement) return;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Crear gradiente lineal
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'chiguire-progress-gradient');
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    
    // Definir los stops del gradiente
    const stops = [
      { offset: '0%', color: '#a4ac86' },
      { offset: '50%', color: '#7f4f24' },
      { offset: '100%', color: '#a4ac86' }
    ];
    
    stops.forEach(stop => {
      const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopElement.setAttribute('offset', stop.offset);
      stopElement.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopElement);
    });
    
    // Añadir animación de rotación al gradiente
    const animateTransform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
    animateTransform.setAttribute('attributeName', 'gradientTransform');
    animateTransform.setAttribute('type', 'rotate');
    animateTransform.setAttribute('from', '0 0.5 0.5');
    animateTransform.setAttribute('to', '360 0.5 0.5');
    animateTransform.setAttribute('dur', '8s');
    animateTransform.setAttribute('repeatCount', 'indefinite');
    
    gradient.appendChild(animateTransform);
    defs.appendChild(gradient);
    svgElement.appendChild(defs);
  }
  
/**
 * Actualiza el progreso visual del anillo circular y texto
 * @param {number} progress - Porcentaje de progreso (0-100)
 * @param {string} statusText - Texto descriptivo del estado actual
 */
updateProgress(progress, statusText = null) {
  if (!this.container) return;
  
  // Convertir progress a número y asegurar que esté entre 0-100
  const newProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  
  // IMPORTANTE: No permitir reducir el progreso una vez alcanzado 100%
  if (this._progressLocked || this.progress === 100) {
    // Si ya alcanzamos 100%, no permitimos retrocesos
    // Solo actualizamos texto si es necesario
    if (statusText && this.progressText && statusText !== this.progressText.textContent) {
      console.log(`Actualizando solo texto (progreso bloqueado): ${statusText}`);
      this.progressText.textContent = statusText;
    }
    return;
  }
  
  // MEJORA: No actualizar si el cambio es insignificante (evita actualizaciones innecesarias)
  // Excepto si el texto cambia o estamos cerca de completar
  const isSignificantChange = 
    Math.abs(newProgress - this.progress) >= 1 || // Cambio de al menos 1%
    newProgress >= 99 || // Estamos completando
    (statusText && (!this.lastStatusText || statusText !== this.lastStatusText)); // Texto cambiado
  
  if (!isSignificantChange) {
    return;
  }
  
  // MODIFICADO: No permitir NINGÚN retroceso en el progreso, siempre hacia adelante
  if (newProgress < this.progress) {
    console.warn(`Intento de reducir progreso: ${this.progress}% -> ${newProgress}%, ignorando cambio de progreso`);
    // Permitir avanzar el texto pero mantener el progreso visual
    if (statusText && this.progressText) {
      this.progressText.textContent = statusText;
      this.lastStatusText = statusText;
    }
    return;
  }
  
  // Guardamos el progreso anterior para debugging
  const oldProgress = this.progress;
  
  // Actualizamos el progreso interno
  this.progress = newProgress;
  this.lastStatusText = statusText || this.lastStatusText;
  
  // Log para debugging (solo cambios significativos)
  if (Math.abs(newProgress - oldProgress) >= 2 || statusText !== this.lastStatusText) {
    console.log(`Actualizando progreso: ${oldProgress}% -> ${newProgress}%, texto: "${statusText || 'sin cambios'}"`);
  }
  
  // CORREGIDO: Ajustar la forma de calcular el offset para garantizar distribución correcta
  // Usar un valor máximo de 100 en lugar de 90 para el progreso visual
  if (this.progressRing) {
    // Si el progreso es 100, asegurarnos que el círculo esté completamente cerrado
    if (this.progress >= 100) {
      this.progressRing.style.strokeDashoffset = '0';
    } else {
      // Calcular el offset usando una distribución lineal mejorada que cierre el círculo correctamente
      // La escala del 0-90 debe mapear a 0-100 para el progreso visual
      const visualProgress = this.progress;
      const offset = this.circumference - (visualProgress / 100) * this.circumference;
      this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
      this.progressRing.style.strokeDashoffset = offset;
    }
  }
  
  // MODIFICADO: Siempre actualizar el texto de progreso si se proporciona uno nuevo
  if (this.progressText && statusText) {
    // Comprobar si realmente ha cambiado para evitar reflow innecesarios
    if (statusText !== this.progressText.textContent) {
      this.progressText.textContent = statusText;
    }
  }
  
  // Actualizar porcentaje explícitamente
  if (this.progressPercentage) {
    const percentageText = `${Math.round(this.progress)}%`;
    if (this.progressPercentage.textContent !== percentageText) {
      this.progressPercentage.textContent = percentageText;
    }
    
    // Cambiar color según el progreso
    if (this.progress < 30) {
      this.progressPercentage.style.color = 'var(--pdf-primary-dark)';
    } else if (this.progress < 70) {
      this.progressPercentage.style.color = 'var(--pdf-primary)';
    } else if (this.progress < 100) {
      this.progressPercentage.style.color = 'var(--pdf-secondary)';
    } else {
      this.progressPercentage.style.color = '#4caf50'; // Verde para 100%
    }
  }
  
  // Si está animando, crear partículas
  if (this.isAnimating && this.progress < 100) {
    this.createProcessingParticle();
  }
  
  // Si alcanzamos el 100%, mostrar celebración
  if (this.progress >= 100 && this.isAnimating) {
    // Asegurar que el progreso sea exactamente 100%
    this.progress = 100;
    
    // Bloquear futuras actualizaciones de progreso
    this._progressLocked = true;
    
    // Actualizar también visualmente para asegurar consistencia
    if (this.progressPercentage) {
      this.progressPercentage.textContent = "100%";
      this.progressPercentage.style.color = '#4caf50';
    }
    
    this.celebrate();
    
    // No detenemos la animación, solo bloqueamos actualizaciones de progreso
    // Para permitir que la celebración siga ocurriendo
    
    // Añadir clase para efectos especiales al completar
    if (this.container) {
      this.container.classList.add('completed');
    }
  }
}
  
  /**
   * Inicia la animación del chigüire
   */
  start() {
    if (!this.container) return;
    
    this.isAnimating = true;
    
    // Limpiar contenedor de partículas
    this.clearParticles();
    
    // Crear partículas iniciales
    this.createInitialParticles();
    
    // Iniciar animación de efectos
    this.walkingInterval = setInterval(() => {
      if (!this.isAnimating) {
        clearInterval(this.walkingInterval);
        return;
      }
      
      this.createProcessingParticle();
    }, this.options.walkingSpeed);
    
    // También crear partículas orbitales
    this.orbitalInterval = setInterval(() => {
      if (!this.isAnimating) {
        clearInterval(this.orbitalInterval);
        return;
      }
      
      this.createOrbitalParticle();
    }, 500);
  }
  
  /**
   * Detiene la animación del chigüire
   */
  stop() {
    this.isAnimating = false;
    
    if (this.walkingInterval) {
      clearInterval(this.walkingInterval);
    }
    
    if (this.orbitalInterval) {
      clearInterval(this.orbitalInterval);
    }
    
    // Quitar clase de completado si existe
    if (this.container) {
      this.container.classList.remove('completed');
    }
  }
  
  /**
   * Crea partículas iniciales
   */
  createInitialParticles() {
    if (!this.particlesContainer) return;
    
    for (let i = 0; i < this.options.particleCount; i++) {
      setTimeout(() => {
        this.createParticle();
      }, i * 200);
    }
  }
  
  /**
   * Crea una partícula de fondo
   */
  createParticle() {
    if (!this.particlesContainer || !this.isAnimating) return;
    
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Tamaño aleatorio
    const size = Math.random() * 6 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Posición aleatoria en el círculo
    const radius = 100; // Radio del círculo
    const angle = Math.random() * Math.PI * 2; // Ángulo aleatorio en radianes
    const distance = Math.random() * radius * 0.8; // Distancia aleatoria desde el centro (80% del radio)
    
    const posX = 50 + Math.cos(angle) * distance; // 50% es el centro
    const posY = 50 + Math.sin(angle) * distance; // 50% es el centro
    
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    
    // Color aleatorio de la paleta
    const colorIndex = Math.floor(Math.random() * this.options.particleColors.length);
    particle.style.backgroundColor = this.options.particleColors[colorIndex];
    
    // Opacidad aleatoria
    particle.style.opacity = Math.random() * 0.5 + 0.2;
    
    // Duración aleatoria
    const duration = Math.random() * 3 + 2;
    
    // Animación personalizada - pulsar y desvanecer
    particle.animate([
      { transform: 'scale(0.8)', opacity: particle.style.opacity },
      { transform: 'scale(1.2)', opacity: particle.style.opacity * 0.7 },
      { transform: 'scale(0.9)', opacity: particle.style.opacity * 0.5 },
      { transform: 'scale(0)', opacity: 0 }
    ], {
      duration: duration * 1000,
      easing: 'ease-in-out'
    });
    
    // Añadir al contenedor
    this.particlesContainer.appendChild(particle);
    this.particles.push(particle);
    
    // Eliminar después de la animación
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
      
      // Eliminar de la lista
      const index = this.particles.indexOf(particle);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, duration * 1000);
  }
  
  /**
   * Crea una partícula de procesamiento que sigue el anillo de progreso
   */
  createProcessingParticle() {
    if (!this.particlesContainer || !this.isAnimating) return;
    
    const particle = document.createElement('div');
    particle.className = 'processing-particle';
    
    // Tamaño aleatorio
    const size = Math.random() * 8 + 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Posición en el anillo según el progreso actual
    const radius = 100; // Radio del anillo
    const angleOffset = Math.random() * 30 - 15; // Variación de ángulo (-15° a +15°)
    const progressAngle = (this.progress / 100) * 360 + angleOffset; // Ángulo según progreso (0-360°)
    const angle = (progressAngle - 90) * (Math.PI / 180); // Convertir a radianes, -90° para comenzar desde arriba
    
    // Calcular posición en el círculo
    const posX = 50 + Math.cos(angle) * 1.05; // 50% es el centro, 1.05 para estar justo fuera del anillo
    const posY = 50 + Math.sin(angle) * 1.05; // 50% es el centro
    
    particle.style.left = `${posX * radius}%`;
    particle.style.top = `${posY * radius}%`;
    
    // Dirección aleatoria (hacia fuera del círculo)
    const directionX = Math.cos(angle) * (Math.random() * 40 + 20);
    const directionY = Math.sin(angle) * (Math.random() * 40 + 20);
    
    // Establecer variables CSS para la animación
    particle.style.setProperty('--x', `${directionX}px`);
    particle.style.setProperty('--y', `${directionY}px`);
    
    // Color aleatorio de la paleta
    const colorIndex = Math.floor(Math.random() * this.options.particleColors.length);
    particle.style.backgroundColor = this.options.particleColors[colorIndex];
    
    // Añadir regla de animación
    particle.style.animation = 'processingParticle 1.5s ease-out forwards';
    
    // Añadir al contenedor
    this.particlesContainer.appendChild(particle);
    this.particles.push(particle);
    
    // Eliminar después de la animación
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
      
      const index = this.particles.indexOf(particle);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, 1500);
  }
  
  /**
   * Crea una partícula orbital que rodea el círculo
   */
  createOrbitalParticle() {
    if (!this.particlesContainer || !this.isAnimating) return;
    
    const particle = document.createElement('div');
    particle.className = 'orbit-particle';
    
    // Tamaño aleatorio
    const size = Math.random() * 5 + 3;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Color aleatorio de la paleta
    const colorIndex = Math.floor(Math.random() * this.options.particleColors.length);
    particle.style.backgroundColor = this.options.particleColors[colorIndex];
    
    // Posición en el centro
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.transform = 'translate(-50%, -50%)';
    
    // Ángulo inicial aleatorio
    const startAngle = Math.random() * 360;
    particle.style.setProperty('--start-angle', `${startAngle}deg`);
    
    // Dirección de rotación (horaria o antihoraria)
    const direction = Math.random() > 0.5 ? 1 : -1;
    particle.style.setProperty('--direction', direction);
    
    // Duración aleatoria
    const duration = Math.random() * 2 + 3;
    particle.style.setProperty('--duration', `${duration}s`);
    
    // Añadir animación personalizada via CSS
    particle.style.animation = `orbitParticle var(--duration) linear forwards`;
    
    // Añadir al contenedor
    this.particlesContainer.appendChild(particle);
    this.particles.push(particle);
    
    // Eliminar después de la animación
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
      
      const index = this.particles.indexOf(particle);
      if (index > -1) {
        this.particles.splice(index, 1);
      }
    }, duration * 1000);
  }
  
  /**
   * Resetea el estado de la animación
   */
  reset(preserveProgress = false) {
    this.isAnimating = false;
    
    // Solo resetear progreso si no se debe preservar
    if (!preserveProgress) {
      this.progress = 0;
      this._progressLocked = false; // MODIFICADO: Asegurarnos de desbloquear el progreso
    }
    
    // Limpiar partículas
    this.clearParticles();
    
    // Resetear círculo de progreso solo si no se debe preservar
    if (!preserveProgress && this.progressRing) {
      this.progressRing.style.strokeDashoffset = this.circumference;
    }
    
    // Resetear texto e información solo si no se debe preservar
    if (!preserveProgress) {
      if (this.progressText) {
        this.progressText.textContent = 'Preparando PDF...';
        this.lastStatusText = 'Preparando PDF...';
      }
      
      if (this.progressPercentage) {
        this.progressPercentage.textContent = '0%';
        this.progressPercentage.style.color = 'var(--pdf-primary-dark)';
      }
      
      // Quitar clase de completado
      if (this.container) {
        this.container.classList.remove('completed');
      }
    }
  }
  
  /**
   * Limpia todas las partículas
   */
  clearParticles() {
    if (!this.particlesContainer) return;
    
    while (this.particlesContainer.firstChild) {
      this.particlesContainer.removeChild(this.particlesContainer.firstChild);
    }
    
    this.particles = [];
  }
  
  /**
   * Celebración al completar
   */
  celebrate() {
    // Crear partículas de celebración
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        this.createCelebrationParticle();
      }, i * 50);
    }
    
    // Aplicar efecto de bounce al contenedor del chigüire
    const chiguireContainer = document.querySelector('.chiguire-gif-container');
    if (chiguireContainer) {
      chiguireContainer.style.animation = 'bounce 0.5s 3';
      
      // Quitar animación después
      setTimeout(() => {
        chiguireContainer.style.animation = 'subtle-glow 3s infinite alternate';
      }, 1500);
    }
  }
  
  /**
   * Crea una partícula de celebración
   */
  createCelebrationParticle() {
    if (!this.particlesContainer) return;
    
    const particle = document.createElement('div');
    particle.className = 'celebration-particle';
    
    // Tamaño aleatorio más grande para celebración
    const size = Math.random() * 10 + 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Posición en el centro
    particle.style.left = '50%';
    particle.style.top = '50%';
    
    // Dirección aleatoria
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 80 + 40;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const rotation = Math.random() * 360;
    
    // Establecer variables CSS para la animación
    particle.style.setProperty('--x', `${x}px`);
    particle.style.setProperty('--y', `${y}px`);
    particle.style.setProperty('--r', `${rotation}deg`);
    
    // Color aleatorio brillante de celebración
    const colorIndex = Math.floor(Math.random() * this.options.celebrationColors.length);
    particle.style.backgroundColor = this.options.celebrationColors[colorIndex];
    
    // Añadir regla de animación
    particle.style.animation = 'celebrationParticle 1.5s ease-out forwards';
    
    // Añadir al contenedor
    this.particlesContainer.appendChild(particle);
    
    // Eliminar después de la animación
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 1500);
  }
}

export default ChiguireAnimation;