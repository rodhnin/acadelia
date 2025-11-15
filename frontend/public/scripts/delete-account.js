// Script mejorado para la página de eliminación de cuenta
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM - Modal de confirmación
  const confirmModal = document.getElementById('confirmModal');
  const openDeleteModal = document.getElementById('openDeleteModal');
  const closeConfirmModal = document.getElementById('closeConfirmModal');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmText = document.getElementById('confirmText');
  const confirmCheck = document.getElementById('confirmCheck');
  const finalConfirmDelete = document.getElementById('finalConfirmDelete');
  
  // Referencias a elementos del DOM - Modal de verificación
  const verificationModal = document.getElementById('verificationModal');
  const closeVerificationModal = document.getElementById('closeVerificationModal');
  const cancelVerification = document.getElementById('cancelVerification');
  const verificationCode = document.getElementById('verificationCode');
  const submitVerificationCode = document.getElementById('submitVerificationCode');
  const resendCode = document.getElementById('resendCode');
  
  // Referencias a elementos del DOM - Modal de carga
  const loadingModal = document.getElementById('loadingModal');
  const loadingText = document.getElementById('loadingText');
  
  // Referencias a elementos del DOM - Modal de éxito
  const successModal = document.getElementById('successModal');
  const countdownElement = document.getElementById('countdown');
  
  // Variable global para almacenar el token de eliminación
  let deletionToken = localStorage.getItem('account_deletion_token') || null;
  
  function showConfirmModal() {
    confirmModal.classList.add('active');
    confirmText.value = '';
    confirmCheck.checked = false;
    updateDeleteButton();
    
    const modalContent = confirmModal.querySelector('.modal-content');
    modalContent.style.animation = 'modalOpen 0.4s ease forwards';
  }
  
  function hideConfirmModal() {
    const modalContent = confirmModal.querySelector('.modal-content');
    modalContent.style.animation = 'modalClose 0.3s ease forwards';
    
    setTimeout(() => {
      confirmModal.classList.remove('active');
    }, 300);
  }
  
  function showVerificationModal() {
    hideConfirmModal();
    
    // Pequeña pausa para permitir que el modal anterior se cierre primero
    setTimeout(() => {
      verificationModal.classList.add('active');
      verificationCode.value = '';
      
      const modalContent = verificationModal.querySelector('.modal-content');
      modalContent.style.animation = 'modalOpen 0.4s ease forwards';
    }, 350);
  }
  
  function hideVerificationModal() {
    const modalContent = verificationModal.querySelector('.modal-content');
    modalContent.style.animation = 'modalClose 0.3s ease forwards';
    
    setTimeout(() => {
      verificationModal.classList.remove('active');
    }, 300);
  }
  
  function showLoadingModal(message = 'Procesando tu solicitud...') {
    loadingText.textContent = message;
    loadingModal.classList.add('active');
  }
  
  function hideLoadingModal() {
    loadingModal.classList.remove('active');
  }
  
  function showSuccessModal() {
    successModal.classList.add('active');
    
    let countdown = 5;
    countdownElement.textContent = countdown;
    
    const interval = setInterval(() => {
      countdown--;
      countdownElement.textContent = countdown;
      
      if (countdown <= 0) {
        clearInterval(interval);
        window.location.href = '/';
      }
    }, 1000);
  }
  
  function updateDeleteButton() {
    if (confirmText.value.trim().toUpperCase() === 'ELIMINAR' && confirmCheck.checked) {
      finalConfirmDelete.disabled = false;
    } else {
      finalConfirmDelete.disabled = true;
    }
  }
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalOpen {
      0% { transform: translateY(20px) scale(0.95); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    
    @keyframes modalClose {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(20px) scale(0.95); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  // Event listeners para abrir/cerrar modales
  if (openDeleteModal) {
    openDeleteModal.addEventListener('click', showConfirmModal);
    
    // Efecto hover en el botón de eliminar
    openDeleteModal.addEventListener('mouseenter', function() {
      const icon = this.querySelector('i');
      if (icon) {
        icon.className = 'bx bx-error-circle';
      }
      this.innerHTML = '<i class="bx bx-error-circle"></i> ¿Estás seguro?';
    });
    
    openDeleteModal.addEventListener('mouseleave', function() {
      const icon = this.querySelector('i');
      if (icon) {
        icon.className = 'bx bx-trash';
      }
      this.innerHTML = '<i class="bx bx-trash"></i> Eliminar mi cuenta';
    });
  }
  
  if (closeConfirmModal) {
    closeConfirmModal.addEventListener('click', hideConfirmModal);
  }
  
  if (cancelDelete) {
    cancelDelete.addEventListener('click', hideConfirmModal);
  }
  
  if (closeVerificationModal) {
    closeVerificationModal.addEventListener('click', hideVerificationModal);
  }
  
  if (cancelVerification) {
    cancelVerification.addEventListener('click', hideVerificationModal);
  }
  
  // Event listeners para validación de formulario
  if (confirmText) {
    confirmText.addEventListener('input', updateDeleteButton);
  }
  
  if (confirmCheck) {
    confirmCheck.addEventListener('change', updateDeleteButton);
  }
  
  // Event listener para envío del formulario de confirmación
  if (finalConfirmDelete) {
    finalConfirmDelete.addEventListener('click', async function(e) {
      e.preventDefault();
      
      hideConfirmModal();
      showLoadingModal('Enviando solicitud de código de verificación...');
      
      try {
        const response = await fetch('/api/usuarios/cuenta/solicitar-eliminacion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log('Solicitud exitosa, token recibido:', data.deletionToken);
          
          deletionToken = data.deletionToken;
          localStorage.setItem('account_deletion_token', deletionToken);
          
          hideLoadingModal();
          showVerificationModal();
        } else {
          hideLoadingModal();
          console.error('Error en la respuesta:', data);
          
          showCustomModal('Error', `No se pudo enviar el código de verificación: ${data.error || 'Error desconocido'}`, 'error');
        }
      } catch (error) {
        hideLoadingModal();
        console.error('Error al solicitar código de verificación:', error);
        
        showCustomModal('Error de conexión', 'No se pudo conectar con el servidor. Por favor intenta de nuevo más tarde.', 'error');
      }
    });
  }
  
  function showCustomModal(title, message, type = 'info') {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay active';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.animation = 'modalOpen 0.4s ease forwards';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const headerTitle = document.createElement('h2');
    let iconClass = '';
    
    switch (type) {
      case 'error':
        iconClass = 'bx bx-error-circle';
        modalHeader.style.backgroundColor = 'var(--danger-light)';
        break;
      case 'success':
        iconClass = 'bx bx-check-circle';
        modalHeader.style.backgroundColor = '#C6F6D5';
        break;
      default:
        iconClass = 'bx bx-info-circle';
        modalHeader.style.backgroundColor = '#BEE3F8';
    }
    
    headerTitle.innerHTML = `<i class='${iconClass}'></i> ${title}`;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-modal';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      modalContent.style.animation = 'modalClose 0.3s ease forwards';
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
      }, 300);
    });
    
    modalHeader.appendChild(headerTitle);
    modalHeader.appendChild(closeButton);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.innerHTML = `<p>${message}</p>`;
    
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const okButton = document.createElement('button');
    okButton.className = type === 'error' ? 'confirm-delete-btn' : 'cancel-btn';
    okButton.innerHTML = 'Aceptar';
    okButton.addEventListener('click', () => {
      modalContent.style.animation = 'modalClose 0.3s ease forwards';
      setTimeout(() => {
        document.body.removeChild(modalOverlay);
      }, 300);
    });
    
    modalFooter.appendChild(okButton);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        modalContent.style.animation = 'modalClose 0.3s ease forwards';
        setTimeout(() => {
          document.body.removeChild(modalOverlay);
        }, 300);
      }
    });
  }
  
  // Event listener para reenvío de código
  if (resendCode) {
    resendCode.addEventListener('click', async function(e) {
      e.preventDefault();
      
      hideVerificationModal();
      showLoadingModal('Reenviando código de verificación...');
      
      try {
        const response = await fetch('/api/usuarios/cuenta/solicitar-eliminacion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        hideLoadingModal();
        
        if (response.ok && data.success) {
          console.log('Reenvío exitoso, nuevo token recibido:', data.deletionToken);
          
          deletionToken = data.deletionToken;
          localStorage.setItem('account_deletion_token', deletionToken);
          
          showCustomModal('Código reenviado', 'Se ha enviado un nuevo código a tu correo electrónico.', 'success');
          
          // Volver a mostrar el modal de verificación después de cerrar el modal de éxito
          setTimeout(() => {
            showVerificationModal();
          }, 500);
        } else {
          console.error('Error en la respuesta:', data);
          showCustomModal('Error', `No se pudo reenviar el código: ${data.error || 'Error desconocido'}`, 'error');
        }
      } catch (error) {
        hideLoadingModal();
        console.error('Error al reenviar código:', error);
        showCustomModal('Error de conexión', 'No se pudo conectar con el servidor. Por favor intenta de nuevo más tarde.', 'error');
      }
    });
  }
  
  // Event listener para envío del código de verificación
  if (submitVerificationCode) {
    submitVerificationCode.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const code = verificationCode.value.trim();
      if (!code) {
        showCustomModal('Código requerido', 'Por favor, introduce el código de verificación.', 'error');
        return;
      }
      
      if (!deletionToken) {
        showCustomModal('Error', 'Token de eliminación no encontrado. Por favor solicita un nuevo código.', 'error');
        hideVerificationModal();
        setTimeout(() => showConfirmModal(), 500);
        return;
      }
      
      console.log('Enviando confirmación con token:', deletionToken);
      console.log('Código:', code);
      
      hideVerificationModal();
      showLoadingModal('Verificando código y procesando eliminación...');
      
      try {
        const bodyData = {
          verificationCode: code,
          deletionToken: deletionToken,
          reason: 'Eliminación solicitada por el usuario'
        };
        
        console.log('Datos a enviar:', bodyData);
        
        const response = await fetch('/api/usuarios/cuenta/confirmar-eliminacion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          body: JSON.stringify(bodyData),
          credentials: 'include'
        });
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Error al parsear respuesta JSON:', e);
          data = { error: 'Error al procesar la respuesta del servidor' };
        }
        
        console.log('Respuesta recibida:', data);
        
        hideLoadingModal();
        
        if (response.ok && data.success) {
          localStorage.removeItem('account_deletion_token');
          
          showSuccessModal();
        } else {
          if (data.error && data.error.includes('expirado')) {
            showCustomModal('Código expirado', 'La solicitud ha expirado. Por favor solicita un nuevo código de verificación.', 'error');
            setTimeout(() => showConfirmModal(), 500);
          } else if (data.error && data.error.includes('incorrecto')) {
            showCustomModal('Código incorrecto', 'El código de verificación es incorrecto. Por favor verifica e intenta nuevamente.', 'error');
            setTimeout(() => showVerificationModal(), 500);
          } else {
            showCustomModal('Error', `No se pudo verificar el código: ${data.error || 'Error desconocido'}`, 'error');
          }
        }
      } catch (error) {
        hideLoadingModal();
        console.error('Error verificando código:', error);
        showCustomModal('Error de conexión', 'No se pudo conectar con el servidor. Por favor intenta de nuevo más tarde.', 'error');
      }
    });
  }
  
  window.addEventListener('click', function(e) {
    if (e.target === confirmModal) {
      hideConfirmModal();
    }
    if (e.target === verificationModal) {
      hideVerificationModal();
    }
  });
});