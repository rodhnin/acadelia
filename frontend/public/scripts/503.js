// Script para la página de mantenimiento (503)
document.addEventListener('DOMContentLoaded', function() {
  function updateTimer() {
    const timerElement = document.querySelector('.eta-timer');
    if (!timerElement) return;
    
    const currentText = timerElement.textContent;
    const [hours, minutes, seconds] = currentText.split(':').map(num => parseInt(num, 10));
    
    let newSeconds = seconds - 1;
    let newMinutes = minutes;
    let newHours = hours;
    
    if (newSeconds < 0) {
      newSeconds = 59;
      newMinutes -= 1;
      
      if (newMinutes < 0) {
        newMinutes = 59;
        newHours -= 1;
        
        if (newHours < 0) {
          // El temporizador ha llegado a cero, mantenerlo en 00:00:00
          newHours = 0;
          newMinutes = 0;
          newSeconds = 0;
          clearInterval(timerInterval);
          
          // Opcional: Mostrar un mensaje o actualizar algo cuando llegue a cero
          document.querySelector('.progress-bar').style.width = '100%';
          document.querySelectorAll('.task-item.pending, .task-item.in-progress')
            .forEach(el => {
              el.classList.remove('pending', 'in-progress');
              el.classList.add('completed');
              el.querySelector('i').className = 'bx bx-check-circle';
            });
        }
      }
    }
    
    const formattedHours = newHours.toString().padStart(2, '0');
    const formattedMinutes = newMinutes.toString().padStart(2, '0');
    const formattedSeconds = newSeconds.toString().padStart(2, '0');
    
    timerElement.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }
  
  const timerInterval = setInterval(updateTimer, 1000);
  
  // Efecto de animación para la barra de progreso
  const progressBar = document.querySelector('.progress-bar');
  if (progressBar) {
    // Pequeña animación para la barra de progreso
    let currentWidth = 65; // Comienza con el 65% que teníamos
    
    function animateProgress() {
      // Simulamos progreso agregando entre 0 y 0.5% en cada iteración
      if (currentWidth < 100) {
        currentWidth += Math.random() * 0.5;
        if (currentWidth > 100) currentWidth = 100;
        progressBar.style.width = `${currentWidth}%`;
      }
    }
    
    setInterval(animateProgress, 5000);
  }
  
  // Formulario de suscripción
  const subscribeForm = document.querySelector('.form-group');
  const subscribeInput = document.querySelector('.subscribe-input');
  const subscribeBtn = document.querySelector('.subscribe-btn');
  
  if (subscribeBtn && subscribeInput) {
    subscribeBtn.addEventListener('click', function() {
      const email = subscribeInput.value.trim();
      if (email && isValidEmail(email)) {
        // En un caso real, enviarías esto a un servidor
        // Aquí solo simulamos la acción
        subscribeInput.value = '';
        subscribeBtn.innerHTML = '<i class="bx bx-check"></i> ¡Te avisaremos!';
        subscribeBtn.disabled = true;
        
        setTimeout(() => {
          subscribeBtn.innerHTML = '<i class="bx bx-bell"></i> Notificarme';
          subscribeBtn.disabled = false;
        }, 3000);
      } else {
        // Resaltar el campo con error
        subscribeInput.style.borderColor = '#ff6b6b';
        subscribeInput.focus();
        
        setTimeout(() => {
          subscribeInput.style.borderColor = '';
        }, 2000);
      }
    });
    
    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
  }
});