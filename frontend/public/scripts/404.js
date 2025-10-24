// Script para el manejo de la página 404
document.addEventListener('DOMContentLoaded', function() {
  // Pequeña animación para el botón
  const homeButton = document.querySelector('.home-btn');
  
  if (homeButton) {
    homeButton.addEventListener('mouseenter', function() {
      this.innerHTML = '<i class="bx bx-run"></i> ¡Sácame de aquí, rápidooo!';
    });
    
    homeButton.addEventListener('mouseleave', function() {
      this.innerHTML = '<i class="bx bx-home"></i> Volver al campus principal';
    });
  }
});