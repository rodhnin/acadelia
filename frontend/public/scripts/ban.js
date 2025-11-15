// Script para el manejo de la página de baneo
document.addEventListener('DOMContentLoaded', function() {
  // Animación para el botón de apelación
  const appealButton = document.querySelector('.appeal-btn');
  
  if (appealButton) {
    appealButton.addEventListener('mouseenter', function() {
      this.innerHTML = '<i class="bx bx-message-alt-detail"></i> Explicar mi situación';
    });
    
    appealButton.addEventListener('mouseleave', function() {
      this.innerHTML = '<i class="bx bx-conversation"></i> Solicitar una revisión';
    });
  }
  
  const startDateElement = document.querySelector('.detail-row:nth-child(2) .detail-value');
  if (startDateElement) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30); // 30 días de suspensión
    
    // Encontrar el elemento de duración
    const durationElement = document.querySelector('.detail-row:nth-child(3) .detail-value');
    if (durationElement) {
      durationElement.innerHTML += ` <span style="color: #666; font-size: 0.9rem;">(hasta el ${endDate.toLocaleDateString('es-ES')})</span>`;
    }
  }
});