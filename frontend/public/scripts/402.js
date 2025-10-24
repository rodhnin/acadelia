// Script para el manejo de la página 402
document.addEventListener('DOMContentLoaded', function() {
  // Animación para el botón de compra
  const purchaseButton = document.querySelector('.purchase-btn');
  
  if (purchaseButton) {
    purchaseButton.addEventListener('mouseenter', function() {
      this.innerHTML = '<i class="bx bx-crown"></i> ¡Desbloquear contenido!';
    });
    
    purchaseButton.addEventListener('mouseleave', function() {
      this.innerHTML = '<i class="bx bx-shopping-bag"></i> Explorar carreras';
    });
  }

  // Animación para el botón de inicio
  const homeButton = document.querySelector('.home-btn');
  
  if (homeButton) {
    homeButton.addEventListener('mouseenter', function() {
      this.innerHTML = '<i class="bx bx-arrow-back"></i> Volver al inicio';
    });
    
    homeButton.addEventListener('mouseleave', function() {
      this.innerHTML = '<i class="bx bx-home"></i> Volver al inicio';
    });
  }

  // Animación para los feature items
  const featureItems = document.querySelectorAll('.feature-item');
  
  featureItems.forEach((item, index) => {
    // Agregar delay escalonado para la animación inicial
    item.style.animationDelay = `${index * 0.1}s`;
    
    // Efecto hover mejorado
    item.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Detectar si viene de una página específica y personalizar el mensaje
  const urlParams = new URLSearchParams(window.location.search);
  const fromPage = urlParams.get('from');
  
  if (fromPage) {
    personalizeMessage(fromPage);
  }

  // Efecto de typing para el título (opcional)
  const title = document.querySelector('.auth-title');
  if (title) {
    title.style.opacity = '0';
    setTimeout(() => {
      title.style.transition = 'opacity 0.5s ease-in';
      title.style.opacity = '1';
    }, 200);
  }
});

// Función para personalizar el mensaje basado en la página de origen
function personalizeMessage(fromPage) {
  const description = document.querySelector('.auth-description');
  const badge = document.querySelector('.auth-badge');
  
  // Mapeo de páginas a carreras/especialidades
  const pageToCareer = {
    'patologia': 'Medicina',
    'anatomia': 'Medicina', 
    'farmacologia': 'Medicina',
    'fisiologia': 'Medicina',
    'fisica': 'Ingeniería',
    'calculo-diferencial': 'Ingeniería',
    'algebra-lineal': 'Ingeniería',
    'microeconomia': 'Economía',
    'macroeconomia': 'Economía',
    'psicologia-general': 'Psicología',
    'derecho-civil': 'Derecho',
    'quimica-organica': 'Química'
  };
  
  const career = pageToCareer[fromPage];
  
  if (career && description && badge) {
    // Personalizar badge
    badge.innerHTML = `<i class='bx bx-graduation'></i> Contenido de ${career}`;
    
    // Personalizar descripción
    description.innerHTML = `
      Has intentado acceder a contenido especializado de <strong>${career}</strong>. 
      Este material forma parte de nuestro programa académico premium diseñado específicamente 
      para estudiantes de ${career}. ¡Cada carrera incluye AVAs únicos y contenido exclusivo 
      curado por el Profesor Acadel!
    `;
  }
}

// Función para mostrar información adicional sobre beneficios premium
function showPremiumBenefits() {
  const benefits = [
    'Acceso completo a todos los AVAs de la carrera',
    'Contenido actualizado semanalmente',
    'Ejercicios prácticos personalizados',
    'Evaluaciones automáticas con feedback',
    'Certificados de progreso',
    'Soporte directo del Profesor Acadel'
  ];
  
  // Esta función podría expandir dinámicamente la lista de beneficios
  console.log('Beneficios premium disponibles:', benefits);
}

// Tracking de interacciones para analytics (opcional)
function trackUserInteraction(action, element) {
  // Aquí podrías enviar datos a tu sistema de analytics
  console.log(`User interaction: ${action} on ${element}`);
  
  // Ejemplo de envío a analytics (descomenta si usas)
  // if (typeof gtag !== 'undefined') {
  //   gtag('event', action, {
  //     'event_category': '402_page',
  //     'event_label': element
  //   });
  // }
}

// Event listeners para tracking
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('purchase-btn')) {
    trackUserInteraction('click', 'purchase_button');
  } else if (e.target.classList.contains('home-btn')) {
    trackUserInteraction('click', 'home_button');
  }
});

// Función para manejar redirección inteligente a tienda
function redirectToStore() {
  // Detectar la página de origen para redirigir a la carrera específica
  const urlParams = new URLSearchParams(window.location.search);
  const fromPage = urlParams.get('from');
  
  let storeUrl = '/tienda';
  
  // Agregar parámetros para mostrar carrera específica
  if (fromPage) {
    storeUrl += `?highlight=${fromPage}`;
  }
  
  window.location.href = storeUrl;
}

// Auto-redirect después de cierto tiempo (opcional, comentado por defecto)
// setTimeout(() => {
//   if (confirm('¿Te gustaría ser redirigido automáticamente a la tienda para explorar las carreras disponibles?')) {
//     redirectToStore();
//   }
// }, 30000); // 30 segundos