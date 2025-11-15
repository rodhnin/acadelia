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
  
  // Asegurar que el DOM esté actualizado antes de mostrar la alerta
  window.requestAnimationFrame(() => {
    setTimeout(() => alertDiv.classList.add('show'), 10);
  });
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => alertDiv.remove(), 400);
  }, duration);
}

let loadingElement;
let successElement;
let errorElement;
let errorMessageElement;

async function verifyEmailToken(token) {
  if (!token) {
    showNoToken();
    return;
  }
  
  try {
    console.log("Verificando token:", token);
    
    const response = await fetch(`/api/usuarios/verify-email?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log("Respuesta recibida:", response.status);
    
    const data = await response.json();
    
    // Asegurar que los elementos del DOM están disponibles
    ensureDOMElements();
    
    if (loadingElement) loadingElement.style.display = 'none';
    
    if (response.ok) {
      // Verificación exitosa
      console.log("Verificación exitosa:", data);
      if (successElement) successElement.style.display = 'block';
      showAlert('Verificación exitosa. ¡Bienvenido a Acadelia!', 'success');
    } else {
      // Error en la verificación
      console.log("Error en verificación:", data);
      if (errorElement) errorElement.style.display = 'block';
      if (errorMessageElement) errorMessageElement.textContent = data.error || 'Error desconocido.';
      showAlert(`Error: ${data.error || 'No se pudo verificar el correo.'}`, 'error');
    }
  } catch (error) {
    console.error("Error durante la verificación:", error);
    
    // Asegurar que los elementos del DOM están disponibles
    ensureDOMElements();
    
    // Error de red o procesamiento
    if (loadingElement) loadingElement.style.display = 'none';
    if (errorElement) errorElement.style.display = 'block';
    if (errorMessageElement) errorMessageElement.textContent = 'Error de conexión. Por favor intenta nuevamente.';
    showAlert('Error de conexión. Por favor intenta nuevamente.', 'error');
  }
}

function ensureDOMElements() {
  if (!loadingElement) loadingElement = document.getElementById('verification-loading');
  if (!successElement) successElement = document.getElementById('verification-success');
  if (!errorElement) errorElement = document.getElementById('verification-error');
  if (!errorMessageElement) errorMessageElement = document.getElementById('error-message');
  
  if (!loadingElement || !successElement || !errorElement || !errorMessageElement) {
    console.warn("No se pudieron encontrar todos los elementos del DOM necesarios");
  }
}

function showNoToken() {
  ensureDOMElements();
  
  if (loadingElement) loadingElement.style.display = 'none';
  if (errorElement) errorElement.style.display = 'block';
  if (errorMessageElement) errorMessageElement.textContent = 'No se proporcionó un token de verificación.';
  showAlert('No se proporcionó un token de verificación.', 'error');
}

function init() {
  try {
    console.log("DOM completamente cargado, inicializando verificación");
    
    loadingElement = document.getElementById('verification-loading');
    successElement = document.getElementById('verification-success');
    errorElement = document.getElementById('verification-error');
    errorMessageElement = document.getElementById('error-message');
    
    if (!loadingElement || !successElement || !errorElement || !errorMessageElement) {
      console.error("No se pudieron encontrar todos los elementos necesarios en el DOM:", {
        loadingElement: !!loadingElement,
        successElement: !!successElement,
        errorElement: !!errorElement,
        errorMessageElement: !!errorMessageElement
      });
      
      setTimeout(() => {
        console.log("Reintentando obtener elementos del DOM...");
        ensureDOMElements();
        
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        console.log("Token obtenido:", token);
        verifyEmailToken(token);
      }, 500);
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    console.log("Token obtenido:", token);
    
    verifyEmailToken(token);
  } catch (error) {
    console.error("Error en la inicialización:", error);
    showAlert('Error al inicializar la verificación. Por favor actualiza la página.', 'error');
  }
}

function attemptInitialization() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log(`Inicializando desde attemptInitialization (readyState: ${document.readyState})`);
    init();
  } else {
    console.log(`Esperando a que el DOM se cargue completamente (readyState: ${document.readyState})`);
  }
}

// Primera verificación inmediata
attemptInitialization();

if (document.readyState === 'loading') {
  console.log("Configurando evento DOMContentLoaded");
  document.addEventListener('DOMContentLoaded', function() {
    console.log("Evento DOMContentLoaded disparado");
    init();
  });
} 

// Siempre añadir el manejador de evento load como último recurso
window.addEventListener('load', function() {
  console.log("Evento load disparado");
  if (!loadingElement) {
    console.log("Inicializando por evento load como respaldo");
    init();
  }
});

setTimeout(function() {
  if (!loadingElement) {
    console.log("Inicializando por timeout como último recurso");
    init();
  }
}, 1000);