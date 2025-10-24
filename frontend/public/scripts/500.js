// Script para el manejo de la página 500
document.addEventListener('DOMContentLoaded', function() {
  // Pequeña animación para el botón de inicio
  const homeButton = document.querySelector('.home-btn');
  
  if (homeButton) {
    homeButton.addEventListener('mouseenter', function() {
      this.innerHTML = '<i class="bx bx-run"></i> ¡Escapar de la explosión!';
    });
    
    homeButton.addEventListener('mouseleave', function() {
      this.innerHTML = '<i class="bx bx-home"></i> Volver al inicio';
    });
  }
  
  // Pequeña animación para el botón de reporte
  const reportButton = document.querySelector('.report-btn');
  
  if (reportButton) {
    reportButton.addEventListener('mouseenter', function() {
      this.innerHTML = '<i class="bx bx-message-detail"></i> Ayudar al Profesor';
    });
    
    reportButton.addEventListener('mouseleave', function() {
      this.innerHTML = '<i class="bx bx-bug"></i> Reportar problema';
    });
  }
  
  // Toggle para mostrar detalles técnicos del error (si existen)
  const errorCode = document.querySelector('.error-code');
  const errorDetails = document.getElementById('error-details');
  
  if (errorCode && errorDetails && errorDetails.textContent.trim() !== '<%= errorDetails %>') {
    errorCode.style.cursor = 'pointer';
    errorCode.title = 'Haz clic para ver detalles técnicos';
    
    errorCode.addEventListener('click', function() {
      errorDetails.classList.toggle('active');
      if (errorDetails.classList.contains('active')) {
        errorCode.textContent = '500 (Ocultar detalles)';
      } else {
        errorCode.textContent = '500';
      }
    });
  }
});