/**
 * reset-password.js - Script para página de restablecimiento de contraseña
 */

document.addEventListener('DOMContentLoaded', async () => {
  
  // Elementos del DOM
  const resetForm = document.getElementById('resetForm');
  const tokenError = document.getElementById('tokenError');
  const resetSuccess = document.getElementById('resetSuccess');
  const resetStatus = document.getElementById('resetStatus');
  const formResetPassword = document.getElementById('formResetPassword');
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userId = urlParams.get('id');
  
    const validateToken = async () => {
    try {
        resetForm.style.display = 'none';
        tokenError.style.display = 'none';
        resetSuccess.style.display = 'none';
        resetStatus.style.display = 'flex';
        
        if (!token || !userId) {
        showTokenError('Enlace incompleto. Faltan parámetros necesarios.');
        return;
        }
        
        console.log('Validando token:', { token: token.substring(0, 10) + '...', userId });
        
        // Hacer la verificación normal
        const response = await fetch(`/api/usuarios/verify-reset-token?token=${token}&id=${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
        });
        
        const data = await response.json();
        console.log('Respuesta de la API:', data);
        
        if (response.ok && data.valid) {
        // Token válido, mostrar formulario normalmente
        resetStatus.style.display = 'none';
        resetForm.style.display = 'block';
        tokenError.style.display = 'none';
        
        if (data.expiresIn) {
            createExpiryTimer(data.expiresIn);
        }
        } else {
        // Token inválido, mostrar error
        showTokenError(data.error || 'El enlace ha expirado o no es válido');
        }
    } catch (error) {
        console.error('Error al validar token:', error);
        showTokenError('Error al validar el enlace. Intenta nuevamente.');
    }
    };
  
  const showTokenError = (message) => {
    resetStatus.style.display = 'none';
    tokenError.style.display = 'block';
    
    const errorMessage = tokenError.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  };
  
  const showSuccess = () => {
    resetForm.style.display = 'none';
    resetSuccess.style.display = 'block';
  };
  
  if (formResetPassword) {
    formResetPassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (newPassword !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'warning');
        return;
      }
      
      if (newPassword.length < 8) {
        showAlert('La contraseña debe tener al menos 8 caracteres', 'warning');
        return;
      }
      
      try {
        showAlert('Actualizando contraseña...', 'info');
        
        const csrfToken = window.csrfUtils && typeof window.csrfUtils.refreshToken === 'function' ? 
                        window.csrfUtils.refreshToken() : null;
        
        const response = await fetch('/api/usuarios/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
          },
          body: JSON.stringify({
            token,
            id: userId,
            newPassword,
            confirmPassword
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al restablecer la contraseña');
        }
        
        showAlert('¡Contraseña actualizada con éxito!', 'success');
        showSuccess();
        
      } catch (error) {
        showAlert(error.message || 'Error al procesar la solicitud', 'error');
      }
    });
  }
  
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  
  togglePasswordButtons.forEach((button) => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const input = this.closest('.input-box').querySelector('input');
      const icon = this.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bx-show');
        icon.classList.add('bx-hide');
        this.setAttribute('aria-label', 'Ocultar contraseña');
        this.setAttribute('title', 'Ocultar contraseña');
      } else {
        input.type = 'password';
        icon.classList.remove('bx-hide');
        icon.classList.add('bx-show');
        this.setAttribute('aria-label', 'Mostrar contraseña');
        this.setAttribute('title', 'Mostrar contraseña');
      }
    });
  });
  
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', function() {
      validatePasswordStrength(this.value);
      
      // Si hay algo en la confirmación, validar coincidencia
      if (confirmPasswordInput && confirmPasswordInput.value) {
        validatePasswordMatch(this.value, confirmPasswordInput.value);
      }
    });
  }
  
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function() {
      validatePasswordMatch(newPasswordInput.value, this.value);
    });
  }
  
  function validatePasswordStrength(password) {
    const existingIndicator = document.querySelector('.password-strength');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    if (!password) return;
    
    let strength = 0;
    let message = '';
    let color = '';
    
    // Criterios de validación
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
    if (password.match(/\d/)) strength += 1;
    if (password.match(/[^a-zA-Z\d]/)) strength += 1;
    
    if (strength === 0) {
      message = 'Muy débil';
      color = '#ff4d4d';
    } else if (strength === 1) {
      message = 'Débil';
      color = '#ffa64d';
    } else if (strength === 2) {
      message = 'Media';
      color = '#ffff4d';
    } else if (strength === 3) {
      message = 'Fuerte';
      color = '#4dff4d';
    } else {
      message = 'Muy fuerte';
      color = '#4d4dff';
    }
    
    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';
    
    const passwordInput = document.getElementById('newPassword');
    const parentDiv = passwordInput.closest('.input-box');
    parentDiv.insertAdjacentElement('afterend', strengthIndicator);
    
    strengthIndicator.innerHTML = `
      <div class="strength-bar">
        <div class="strength-fill"></div>
      </div>
      <span style="color: ${color};">${message}</span>
    `;
    
    const strengthFill = strengthIndicator.querySelector('.strength-fill');
    strengthFill.style.width = `${(strength / 4) * 100}%`;
    strengthFill.style.backgroundColor = color;
    
    setTimeout(() => {
      strengthFill.style.transition = 'width 0.3s ease-in-out';
    }, 10);
  }
  
  function validatePasswordMatch(password, confirm) {
    const existingMessage = document.querySelector('.password-match');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    if (!confirm) return;
    
    const matchMessage = document.createElement('div');
    matchMessage.className = 'password-match';
    
    if (password === confirm) {
      matchMessage.innerHTML = '<span style="color: #4dff4d;">✓ Las contraseñas coinciden</span>';
    } else {
      matchMessage.innerHTML = '<span style="color: #ff4d4d;">✗ Las contraseñas no coinciden</span>';
    }
    
    matchMessage.style.marginTop = '-10px';
    matchMessage.style.marginBottom = '10px';
    matchMessage.style.fontSize = '0.8rem';
    matchMessage.style.width = '100%';
    
    const confirmInput = document.getElementById('confirmPassword');
    const parentDiv = confirmInput.closest('.input-box');
    parentDiv.insertAdjacentElement('afterend', matchMessage);
  }
  
  // Botón para volver a login
  const backToLoginBtn = document.querySelector('.back-to-login-btn');
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', () => {
      window.location.href = '/login';
    });
  }
  
  validateToken();
});

function createExpiryTimer(expiresInMinutes) {
  const existingTimer = document.querySelector('.timer-container');
  if (existingTimer) existingTimer.remove();
  
  const timerContainer = document.createElement('div');
  timerContainer.className = 'timer-container';
  
  const timerLabel = document.createElement('div');
  timerLabel.className = 'timer-label';
  timerLabel.innerHTML = `
    <span>Tiempo restante</span>
    <span>Expira en ${expiresInMinutes} min</span>
  `;
  
  const timerProgress = document.createElement('div');
  timerProgress.className = 'timer-progress';
  
  const timerBar = document.createElement('div');
  timerBar.className = 'timer-bar timer-high';
  timerProgress.appendChild(timerBar);
  
  const timerDigits = document.createElement('div');
  timerDigits.className = 'timer-digits';
  
  timerContainer.appendChild(timerLabel);
  timerContainer.appendChild(timerProgress);
  timerContainer.appendChild(timerDigits);
  
  // Encontrar lugar para insertar
  // Buscamos después del texto de descripción del formulario
  const formDescription = document.querySelector('.form-description');
  if (formDescription && formDescription.nextElementSibling) {
    formDescription.parentNode.insertBefore(timerContainer, formDescription.nextElementSibling);
  } else if (resetForm) {
    // Si no podemos encontrar la descripción, lo añadimos al principio del formulario
    resetForm.insertBefore(timerContainer, resetForm.firstChild);
  }
  
  const expiryTime = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  updateTimer(timerBar, timerDigits, expiryTime, expiresInMinutes * 60);
  
  return timerContainer;
}

function updateTimer(timerBar, timerDigits, expiryTime, totalSeconds) {
  const now = new Date();
  const diffMs = expiryTime - now;
  
  // Si ya expiró
  if (diffMs <= 0) {
    timerBar.style.width = '0%';
    timerDigits.textContent = 'Expirado';
    
    // Recargar página o mostrar error después de un breve retardo
    setTimeout(() => {
      // Aquí podríamos recargar la página o mostrar mensaje de error
      showTokenError('El enlace ha expirado. Por favor solicita uno nuevo.');
    }, 1000);
    
    return;
  }
  
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  timerDigits.textContent = timeString;
  
  const secondsLeft = Math.floor(diffMs / 1000);
  const percentage = (secondsLeft / totalSeconds) * 100;
  timerBar.style.width = `${percentage}%`;
  
  timerBar.className = 'timer-bar';
  if (percentage > 60) {
    timerBar.classList.add('timer-high');
  } else if (percentage > 30) {
    timerBar.classList.add('timer-medium');
  } else {
    timerBar.classList.add('timer-low');
    timerBar.classList.add('timer-pulse');
  }
  
  setTimeout(() => updateTimer(timerBar, timerDigits, expiryTime, totalSeconds), 1000);
}

function showAlert(message, type = 'info', duration = 3000) {
  const alertTypes = {
    success: { icon: '✓', class: 'alert-success' },
    error: { icon: '⚠', class: 'alert-error' },
    warning: { icon: '⚠', class: 'alert-warning' },
    info: { icon: 'ⓘ', class: 'alert-info' }
  };

  const alertDiv = document.createElement('div');
  alertDiv.className = `custom-alert ${alertTypes[type].class}`;
  
  alertDiv.innerHTML = `
    <span class="alert-icon">${alertTypes[type].icon}</span>
    <div class="alert-content">${message}</div>
  `;

  document.body.appendChild(alertDiv);
  
  setTimeout(() => alertDiv.classList.add('show'), 10);
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => alertDiv.remove(), 400);
  }, duration);
}