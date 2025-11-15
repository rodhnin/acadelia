// Script para el manejo de la página 429
document.addEventListener('DOMContentLoaded', function() {
  // Simulación de temporizador de espera
  const timerBar = document.getElementById('timerBar');
  const timeRemaining = document.getElementById('timeRemaining');
  
  // Duración del temporizador en segundos
  const totalWaitTime = 120;
  let secondsLeft = totalWaitTime;
  
  function startTimer() {
    timerBar.style.width = '0%';
    
    // Actualización cada segundo
    const timerInterval = setInterval(function() {
      secondsLeft--;
      
      const percentComplete = ((totalWaitTime - secondsLeft) / totalWaitTime) * 100;
      
      timerBar.style.width = percentComplete + '%';
      timeRemaining.textContent = secondsLeft > 0 
        ? `${secondsLeft} ${secondsLeft === 1 ? 'segundo' : 'segundos'}`
        : 'Puedes intentarlo ahora';
      
      // Cuando termina el temporizador
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        
        const backButton = document.querySelector('.back-btn');
        backButton.innerHTML = '<i class="bx bx-refresh"></i> Intentar nuevamente';
        backButton.style.backgroundColor = '#6a994e';
        backButton.style.borderColor = '#6a994e';
        
        backButton.onclick = function() {
          window.location.reload();
        };
      }
    }, 1000);
  }
  
  // Animación para el botón de volver
  const backButton = document.querySelector('.back-btn');
  
  if (backButton) {
    backButton.addEventListener('mouseenter', function() {
      if (secondsLeft > 0) {
        this.innerHTML = '<i class="bx bx-time"></i> Espera un momento...';
      } else {
        this.innerHTML = '<i class="bx bx-refresh"></i> ¡Vamos a intentarlo!';
      }
    });
    
    backButton.addEventListener('mouseleave', function() {
      if (secondsLeft > 0) {
        this.innerHTML = '<i class="bx bx-arrow-back"></i> Volver atrás';
      } else {
        this.innerHTML = '<i class="bx bx-refresh"></i> Intentar nuevamente';
      }
    });
  }
  startTimer();
});