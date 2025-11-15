// ---------------------------
// ---------------------------
const LoadingOverlay = {
  overlay: null,
  count: 0,

  init() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'loading-overlay';
      this.overlay.innerHTML = `
              <div class="loading-spinner">
                  <div class="spinner-circle"></div>
                  <div class="spinner-text">Procesando solicitud...</div>
              </div>
          `;
      document.body.appendChild(this.overlay);

      // Inyectar estilos
      const style = document.createElement('style');
      style.textContent = `
              .loading-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(0, 0, 0, 0.7);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 10001;
                  backdrop-filter: blur(5px);
                  -webkit-backdrop-filter: blur(5px);
                  opacity: 0;
                  visibility: hidden;
                  transition: opacity 0.3s ease, visibility 0.3s ease;
              }
              
              .loading-overlay.active {
                  opacity: 1;
                  visibility: visible;
              }
              
              .loading-spinner {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 1.5rem;
                  color: white;
              }
              
              .spinner-circle {
                  width: 60px;
                  height: 60px;
                  border: 4px solid rgba(255, 255, 255, 0.2);
                  border-top-color: var(--marron, #582f0e);
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
              }
              
              .spinner-text {
                  font-size: 1.2rem;
                  font-weight: 500;
              }
              
              @keyframes spin {
                  to { transform: rotate(360deg); }
              }
              
              [data-theme="dark"] .spinner-circle {
                  border-top-color: var(--secondary-color, #2B3230);
              }
          `;
      document.head.appendChild(style);
    }
  },

  show(message = 'Procesando solicitud...') {
    this.init();
    this.count++;

    const textElement = this.overlay.querySelector('.spinner-text');
    if (textElement) {
      textElement.textContent = message;
    }

    this.overlay.classList.add('active');
    document.body.classList.add('modal-open');
  },

  hide() {
    if (!this.overlay) return;

    this.count = Math.max(0, this.count - 1);

    if (this.count === 0) {
      this.overlay.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  },

  // Método para envolver cualquier función asíncrona con la pantalla de carga
  async withLoading(fn, message = 'Procesando solicitud...') {
    this.show(message);
    try {
      return await fn();
    } finally {
      this.hide();
    }
  }
};

// ---------------------------
// ---------------------------
function showAlert(message, type = 'info', duration = 3000) {
  if (window.showAlert) {
    return window.showAlert(message, type, duration);
  } else if (window.notifyService) {
    return window.notifyService.add(message, type, duration);
  } else {
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
}

// ---------------------------
// ---------------------------
const Cache = {
  data: new Map(),
  defaultExpiration: 5 * 60 * 1000, // 5 minutos por defecto

  set(key, value, expirationMs = this.defaultExpiration) {
    this.data.set(key, {
      value,
      expires: Date.now() + expirationMs
    });
  },

  get(key) {
    const item = this.data.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  },

  clear() {
    this.data.clear();
  },

  delete(key) {
    this.data.delete(key);
  }
};

// ---------------------------
// Funciones Globales (Top-Level)
// ---------------------------
const rolesMapping = { 1: "Gratuito", 2: "Premium", 3: "Administrador" };

const checkAuthentication = async () => {
  return await LoadingOverlay.withLoading(async () => {
    try {
      const cachedAuth = Cache.get('auth');
      if (cachedAuth) return cachedAuth;

      console.log('🔍 Verificando autenticación...');
      const response = await fetch('/api/usuarios/authenticate', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error('Formato de respuesta inválido');
      }

      const userData = await response.json();
      Cache.set('auth', userData, 30 * 60 * 1000);
      return userData;
    } catch (error) {
      console.error('❌ Error en autenticación:', error);
      throw error;
    }
  }, 'Verificando autenticación...');
};

const performForcedLogout = async () => {
  return await LoadingOverlay.withLoading(async () => {
    try {
      console.log('🔒 Iniciando logout forzado...');
      await fetch('/api/usuarios/logout', { method: 'POST', credentials: 'include' });
    } finally {
      Cache.clear();
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=').map(c => c.trim());
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      });
      showAlert('Sesión cerrada. Redirigiendo a la página de inicio de sesión.', 'info');
      window.location.href = 'login.html';
    }
  }, 'Cerrando sesión...');
};

// Accesible globalmente para usar en event listeners
let globalUserEmail = '';

function clearPasswordIndicators() {
  const strengthIndicator = document.querySelector('.password-strength');
  if (strengthIndicator) strengthIndicator.remove();

  const matchIndicator = document.querySelector('.password-match');
  if (matchIndicator) matchIndicator.remove();

  const verificationIndicator = document.getElementById('passwordVerificationIndicator');
  if (verificationIndicator) verificationIndicator.remove();
}

// ---------------------------
// Configuración Principal
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  LoadingOverlay.init();

  // Elementos del DOM existentes
  const profileEdit = document.getElementById('profileEdit');
  const editToggleBtn = document.getElementById('editToggleBtn');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const profileView = document.getElementById('profileView');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const cancelPasswordChange = document.getElementById('cancelPasswordChange');
  const profileContent = document.querySelector('.profile-content');

  // Nuevos elementos para completar perfil
  const profileCompleteSection = document.getElementById('profileCompleteSection');
  const profileExistingSection = document.getElementById('profileExistingSection');
  const profileCompleteForm = document.getElementById('profileCompleteForm');

  // Campos de contraseña
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  // Estado de la aplicación
  let userId = null;
  let correo = '';
  let currentProfileData = null;
  let userHasCompleteProfile = false;

  window.currentPasswordInput = currentPasswordInput;
  window.newPasswordInput = newPasswordInput;
  window.confirmPasswordInput = confirmPasswordInput;

  // ---------------------------
  // Funciones de Interfaz
  // ---------------------------
  function toggleEditMode(editMode) {
    profileView.classList.toggle('hidden', editMode);
    profileEdit.classList.toggle('hidden', !editMode);
    editToggleBtn.classList.toggle('hidden', editMode);
    cancelEditBtn.classList.toggle('hidden', !editMode);
    changePasswordBtn.classList.toggle('hidden', editMode);
    if (editMode) adjustLabels();
  }

  function togglePasswordMode(showPasswordForm) {
    if (showPasswordForm) {
      profileView.classList.add('hidden');
      profileEdit.classList.add('hidden');
      editToggleBtn.classList.add('hidden');
      changePasswordBtn.classList.add('hidden');
      changePasswordForm.classList.remove('hidden');

      // Restablecer campos
      if (currentPasswordInput) currentPasswordInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';

      if (newPasswordInput) newPasswordInput.setAttribute('disabled', '');
      if (confirmPasswordInput) confirmPasswordInput.setAttribute('disabled', '');

      clearPasswordIndicators();

      // Enfocar el campo de contraseña actual
      setTimeout(() => {
        if (currentPasswordInput) currentPasswordInput.focus();
      }, 100);
    } else {
      changePasswordForm.classList.add('hidden');
      profileView.classList.remove('hidden');
      editToggleBtn.classList.remove('hidden');
      changePasswordBtn.classList.remove('hidden');
      // Asegurar que el formulario de edición está oculto
      profileEdit.classList.add('hidden');
      cancelEditBtn.classList.add('hidden');
    }
  }

  // Nueva función para alternar entre vista de completar perfil y vista existente
  function toggleProfileView(showCompleteProfile) {
    if (showCompleteProfile) {
      profileCompleteSection.classList.remove('hidden');
      profileExistingSection.classList.add('hidden');
    } else {
      profileCompleteSection.classList.add('hidden');
      profileExistingSection.classList.remove('hidden');
    }
  }

  function adjustLabels() {
    document.querySelectorAll('.profile-edit .form-group select').forEach(select => {
      const hasValue = select.value.trim() !== '' && select.value !== '';
      select.classList.toggle('has-value', hasValue);
      const label = select.nextElementSibling;
      if (label?.tagName === 'LABEL') {
        label.classList.toggle('fixed-label', hasValue);
      }
    });

    document.querySelectorAll('.profile-complete-form .form-group select').forEach(select => {
      const hasValue = select.value.trim() !== '' && select.value !== '';
      select.classList.toggle('has-value', hasValue);
      const label = select.nextElementSibling;
      if (label?.tagName === 'LABEL') {
        label.classList.toggle('fixed-label', hasValue);
      }
    });
  }

  // ---------------------------
  // ---------------------------

  const togglePasswordButtons = document.querySelectorAll('.toggle-password');

  togglePasswordButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const input = this.closest('.input-wrapper').querySelector('input');
      const icon = this.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bx-show');
        icon.classList.add('bx-hide');
      } else {
        input.type = 'password';
        icon.classList.remove('bx-hide');
        icon.classList.add('bx-show');
      }
    });
  });

  if (currentPasswordInput) {
    currentPasswordInput.addEventListener('blur', async function () {
      // Solo validar si hay contenido
      if (this.value.trim().length === 0) return;

      let verificationIndicator = document.getElementById('passwordVerificationIndicator');

      if (!verificationIndicator) {
        verificationIndicator = document.createElement('div');
        verificationIndicator.id = 'passwordVerificationIndicator';
        verificationIndicator.className = 'password-verification';

        // Encontrar dónde insertar el indicador
        const parentDiv = this.closest('.input-wrapper');
        if (parentDiv) {
          parentDiv.insertAdjacentElement('afterend', verificationIndicator);
        } else {
          console.error('No se encontró el contenedor adecuado para el indicador');
          return; // Salir si no se encuentra dónde insertar
        }
      }

      verificationIndicator.innerHTML = '<span style="color: #ffaa00;">⟳ Verificando contraseña...</span>';

      try {
        await LoadingOverlay.withLoading(async () => {
          console.log('Verificando contraseña para:', correo);

          const response = await fetch('/api/usuarios/verifyPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              correo: correo,
              contraseña: this.value
            }),
            credentials: 'include'
          });

          console.log('Respuesta del servidor:', response.status);

          verificationIndicator = document.getElementById('passwordVerificationIndicator');
          if (!verificationIndicator) {
            console.error('El indicador ya no existe en el DOM');
            return;
          }

          if (response.ok) {
            // Contraseña correcta
            verificationIndicator.innerHTML = '<span style="color: #4dff4d;">✓ Contraseña correcta</span>';
            showAlert('Contraseña verificada correctamente', 'success', 2000);

            if (newPasswordInput) {
              newPasswordInput.removeAttribute('disabled');

              // Enfocar en nueva contraseña
              setTimeout(() => {
                newPasswordInput.focus();
              }, 100);
            }
          } else {
            // Contraseña incorrecta
            verificationIndicator.innerHTML = '<span style="color: #ff4d4d;">✗ Contraseña incorrecta</span>';
            showAlert('La contraseña actual es incorrecta', 'error');

            if (newPasswordInput) newPasswordInput.setAttribute('disabled', '');
            if (confirmPasswordInput) confirmPasswordInput.setAttribute('disabled', '');
          }
        }, 'Verificando contraseña...');
      } catch (error) {
        console.error('Error al verificar contraseña:', error);

        verificationIndicator = document.getElementById('passwordVerificationIndicator');
        if (verificationIndicator) {
          verificationIndicator.innerHTML = '<span style="color: #ff4d4d;">Error al verificar</span>';
        }

        // En caso de error, no bloqueamos pero mostramos alerta
        showAlert('Error al verificar contraseña. Intente nuevamente.', 'warning');
      }
    });
  }

  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', function () {
      validatePasswordStrength(this.value);

      if (this.value.trim().length > 0) {
        if (confirmPasswordInput) confirmPasswordInput.removeAttribute('disabled');
      } else {
        if (confirmPasswordInput) {
          confirmPasswordInput.setAttribute('disabled', '');
          confirmPasswordInput.value = '';
        }

        const existingMatch = document.querySelector('.password-match');
        if (existingMatch) existingMatch.remove();
      }

      // Si hay algo en la confirmación, validar coincidencia
      if (confirmPasswordInput && confirmPasswordInput.value) {
        validatePasswordMatch(this.value, confirmPasswordInput.value);
      }
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function () {
      if (newPasswordInput) {
        validatePasswordMatch(newPasswordInput.value, this.value);
      }
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
    if (passwordInput) {
      const parentDiv = passwordInput.closest('.input-wrapper');
      if (parentDiv) {
        parentDiv.insertAdjacentElement('afterend', strengthIndicator);
      }
    }

    strengthIndicator.innerHTML = `
    <div class="strength-bar">
      <div class="strength-fill"></div>
    </div>
    <span style="color: ${color};">${message}</span>
  `;

    const strengthFill = strengthIndicator.querySelector('.strength-fill');
    if (strengthFill) {
      strengthFill.style.width = `${(strength / 4) * 100}%`;
      strengthFill.style.backgroundColor = color;

      setTimeout(() => {
        strengthFill.style.transition = 'width 0.3s ease-in-out';
      }, 10);
    }
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

    const confirmInput = document.getElementById('confirmPassword');
    if (confirmInput) {
      const parentDiv = confirmInput.closest('.input-wrapper');
      if (parentDiv) {
        parentDiv.insertAdjacentElement('afterend', matchMessage);
      }
    }
  }

  // ---------------------------
  // Funciones de Datos con Caché (mantener existentes)
  // ---------------------------
  const fetchPaises = async () => {
    return await LoadingOverlay.withLoading(async () => {
      const cachedPaises = Cache.get('paises');
      if (cachedPaises) return cachedPaises;

      try {
        const response = await fetch('/api/paises', { credentials: 'include' });
        const responseData = await response.json();

        // Verificación explícita y con log para depuración
        console.log('Respuesta API países:', responseData);

        let paises = [];
        if (responseData && responseData.success === true && Array.isArray(responseData.data)) {
          paises = responseData.data;
        } else if (Array.isArray(responseData)) {
          paises = responseData;
        } else {
          console.error('Formato de respuesta de países inesperado:', responseData);
        }

        Cache.set('paises', paises, 60 * 60 * 1000);
        return paises;
      } catch (error) {
        console.error('Error al obtener países:', error);
        showAlert('Error al cargar la lista de países', 'error');
        return [];
      }
    }, 'Cargando países...');
  };

  const fetchUniversidades = async (idPais) => {
    return await LoadingOverlay.withLoading(async () => {
      const cacheKey = `universidades_${idPais}`;
      const cachedUniversidades = Cache.get(cacheKey);
      if (cachedUniversidades) return cachedUniversidades;

      try {
        const response = await fetch(`/api/paises/${idPais}/universidades`, {
          credentials: 'include'
        });

        const responseData = await response.json();

        // Verificación explícita y con log para depuración
        console.log('Respuesta API universidades:', responseData);

        let universidades = [];
        if (responseData && responseData.success === true && Array.isArray(responseData.data)) {
          universidades = responseData.data;
        } else if (Array.isArray(responseData)) {
          universidades = responseData;
        } else {
          console.error('Formato de respuesta de universidades inesperado:', responseData);
        }

        Cache.set(cacheKey, universidades, 30 * 60 * 1000);
        return universidades;
      } catch (error) {
        console.error('Error al obtener universidades:', error);
        showAlert('Error al cargar universidades', 'error');
        return [];
      }
    }, 'Cargando universidades...');
  };

  const initializeSelects = async () => {
    const paisSelect = document.getElementById('pais');
    if (!paisSelect) return;

    paisSelect.addEventListener('change', () => {
      loadUniversidades(paisSelect.value);
      showAlert('País seleccionado: ' + paisSelect.options[paisSelect.selectedIndex].text, 'info', 1500);
    });

    try {
      const paises = await fetchPaises();
      paisSelect.innerHTML = '<option value="" disabled selected hidden>Seleccione un país</option>';
      paises.forEach(pais => {
        paisSelect.add(new Option(pais.nombre_pais, pais.id_pais));
      });

      if (currentProfileData) {
        paisSelect.value = currentProfileData.id_pais;
        loadUniversidades(currentProfileData.id_pais, currentProfileData.id_universidad);
      }
    } catch (error) {
      console.error('Error al cargar países:', error);
      showAlert('Error al inicializar selectores de países', 'error');
    }
  };

  // Nueva función para inicializar selectores del formulario de completar perfil
  const initializeCompleteSelects = async () => {
    const completeCountrySelect = document.getElementById('completeCountry');
    const completeUniversitySelect = document.getElementById('completeUniversity');

    if (!completeCountrySelect || !completeUniversitySelect) return;

    // Event listener para el selector de país de completar perfil
    completeCountrySelect.addEventListener('change', () => {
      loadCompleteUniversidades(completeCountrySelect.value);
      showAlert('País seleccionado: ' + completeCountrySelect.options[completeCountrySelect.selectedIndex].text, 'info', 1500);
    });

    try {
      const paises = await fetchPaises();
      completeCountrySelect.innerHTML = '<option value="" disabled selected hidden>Seleccione un país</option>';
      paises.forEach(pais => {
        completeCountrySelect.add(new Option(pais.nombre_pais, pais.id_pais));
      });
    } catch (error) {
      console.error('Error al cargar países para completar perfil:', error);
      showAlert('Error al inicializar selectores de países', 'error');
    }
  };

  const loadUniversidades = async (idPais, idUniversidad = null) => {
    const universidadSelect = document.getElementById('universidad');
    if (!universidadSelect) return;

    universidadSelect.innerHTML = '<option value="" disabled selected hidden>Cargando universidades...</option>';

    try {
      const universidades = await fetchUniversidades(idPais);
      universidadSelect.innerHTML = '<option value="" disabled selected hidden>Seleccione una universidad</option>';
      universidades.forEach(uni => {
        universidadSelect.add(new Option(uni.nom_universidad, uni.id_universidad));
      });

      if (idUniversidad) {
        setTimeout(() => universidadSelect.value = idUniversidad, 100);
      }
      adjustLabels();
    } catch (error) {
      console.error('Error al cargar universidades:', error);
      showAlert('Error al cargar la lista de universidades', 'error');
    }
  };

  // Nueva función para cargar universidades en el formulario de completar perfil
  const loadCompleteUniversidades = async (idPais) => {
    const completeUniversitySelect = document.getElementById('completeUniversity');
    if (!completeUniversitySelect) return;

    completeUniversitySelect.innerHTML = '<option value="" disabled selected hidden>Cargando universidades...</option>';

    try {
      const universidades = await fetchUniversidades(idPais);
      completeUniversitySelect.innerHTML = '<option value="" disabled selected hidden>Seleccione una universidad</option>';
      universidades.forEach(uni => {
        completeUniversitySelect.add(new Option(uni.nom_universidad, uni.id_universidad));
      });
      adjustLabels();
    } catch (error) {
      console.error('Error al cargar universidades para completar perfil:', error);
      showAlert('Error al cargar la lista de universidades', 'error');
    }
  };

  const loadProfile = async () => {
    return await LoadingOverlay.withLoading(async () => {
      if (!userId) return performForcedLogout();

      try {
        const cacheKey = `profile_${userId}`;
        const cachedProfile = Cache.get(cacheKey);

        if (cachedProfile) {
          currentProfileData = cachedProfile;
          checkProfileCompleteness(cachedProfile);
          return;
        }

        const response = await fetch(`/api/perfil/with-university/${userId}`, { credentials: 'include' });
        const responseData = await response.json();

        console.log('🔍 Datos de perfil recibidos:', responseData);

        const profileData = responseData.success && responseData.data ? responseData.data : responseData;

        Cache.set(cacheKey, profileData);
        currentProfileData = profileData;
        checkProfileCompleteness(profileData);

      } catch (error) {
        console.error('Error al cargar perfil:', error);
        showAlert('Error al cargar datos del perfil. Intente nuevamente.', 'error');
      }
    }, 'Cargando perfil...');
  };

  const checkProfileCompleteness = (profileData) => {
    console.log('🔍 Verificando completitud del perfil:', profileData);

    const hasBasicData = profileData &&
      profileData.nombre &&
      profileData.nombre.trim() !== '' &&
      profileData.apellido &&
      profileData.apellido.trim() !== '' &&
      profileData.id_pais &&
      profileData.id_universidad &&
      profileData.nacimiento;

    console.log('🔍 ¿Perfil completo?', hasBasicData);
    console.log('🔍 Datos del perfil:', {
      nombre: profileData?.nombre,
      apellido: profileData?.apellido,
      id_pais: profileData?.id_pais,
      id_universidad: profileData?.id_universidad,
      nacimiento: profileData?.nacimiento
    });

    userHasCompleteProfile = hasBasicData;

    if (userHasCompleteProfile) {
      console.log('✅ Mostrando vista de perfil completo');
      toggleProfileView(false);
      updateProfileView(profileData);
      populateEditForm(profileData);
      showAlert('Perfil cargado correctamente', 'success', 2000);
    } else {
      console.log('⚠️ Mostrando vista de completar perfil');
      toggleProfileView(true);
      initializeCompleteSelects();
      showAlert('Complete su perfil para acceder a todas las funcionalidades', 'info', 4000);
    }
  };

  const updateProfileView = async (profileData) => {
    const fieldValues = document.querySelectorAll('#profileView .field-value');
    if (fieldValues.length < 7) return;

    fieldValues[0].textContent = correo;
    fieldValues[1].textContent = rolesMapping[profileData.id_rol] || '';
    fieldValues[2].textContent = profileData.nombre || '';
    fieldValues[3].textContent = profileData.apellido || '';

    try {
      const [paises, universidades] = await Promise.all([
        fetchPaises(),
        fetchUniversidades(profileData.id_pais)
      ]);

      const pais = paises.find(p => p.id_pais === profileData.id_pais);
      const universidad = universidades.find(u => u.id_universidad === profileData.id_universidad);

      fieldValues[4].textContent = pais?.nombre_pais || '';
      fieldValues[5].textContent = universidad?.nom_universidad || '';
      fieldValues[6].textContent = profileData.nacimiento?.split('T')[0] || '';
    } catch (error) {
      console.error('Error al actualizar vista del perfil:', error);
      showAlert('Error al actualizar la vista del perfil', 'error');
    }
  };

  const populateEditForm = (profileData) => {
    const rolInput = document.getElementById('Rol');
    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');
    const fechaInput = document.getElementById('fecha');

    if (rolInput) rolInput.value = rolesMapping[profileData.id_rol] || '';
    if (nombreInput) nombreInput.value = profileData.nombre || '';
    if (apellidoInput) apellidoInput.value = profileData.apellido || '';
    if (fechaInput) fechaInput.value = profileData.nacimiento?.split('T')[0] || '';

    if (document.getElementById('profileEdit')) initializeSelects();
  };

  // Nueva función de validación (agregar antes de handleCompleteProfileSubmit)
  function validateProfileForm(nombre, apellido, fecha) {
    const errors = [];

    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/;
    if (!nameRegex.test(nombre.trim())) {
      errors.push("El nombre debe contener solo letras y tener entre 2 y 50 caracteres");
    }

    if (!nameRegex.test(apellido.trim())) {
      errors.push("El apellido debe contener solo letras y tener entre 2 y 50 caracteres");
    }

    const birthDate = new Date(fecha);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (birthDate > today) {
      errors.push("La fecha de nacimiento no puede ser futura");
    } else if (age < 13 || (age === 13 && monthDiff < 0)) {
      errors.push("Debes tener al menos 13 años para registrarte");
    } else if (age > 120) {
      errors.push("Por favor ingresa una fecha de nacimiento válida");
    }

    return errors;
  }

  const handleCompleteProfileSubmit = async (e) => {
    e.preventDefault();

    return await LoadingOverlay.withLoading(async () => {
      const completeNameInput = document.getElementById('completeName');
      const completeLastNameInput = document.getElementById('completeLastName');
      const completeCountrySelect = document.getElementById('completeCountry');
      const completeBirthdateInput = document.getElementById('completeBirthdate');
      const completeUniversitySelect = document.getElementById('completeUniversity');

      if (!completeNameInput || !completeLastNameInput || !completeCountrySelect || !completeBirthdateInput || !completeUniversitySelect) {
        showAlert('Error: Faltan campos en el formulario', 'error');
        return;
      }

      if (!completeNameInput.value.trim() ||
        !completeLastNameInput.value.trim() ||
        !completeCountrySelect.value ||
        !completeBirthdateInput.value ||
        !completeUniversitySelect.value) {
        showAlert('Por favor complete todos los campos obligatorios', 'warning');
        return;
      }

      const validationErrors = validateProfileForm(
        completeNameInput.value,
        completeLastNameInput.value,
        completeBirthdateInput.value
      );

      if (validationErrors.length > 0) {
        showAlert(validationErrors[0], 'warning');
        return;
      }

      const formData = {
        id_usuario: userId,
        id_rol: 1, // Rol gratuito por defecto
        nombre: completeNameInput.value.trim(),
        apellido: completeLastNameInput.value.trim(),
        id_pais: parseInt(completeCountrySelect.value),
        nacimiento: completeBirthdateInput.value,
        id_universidad: parseInt(completeUniversitySelect.value)
      };
      console.log('📤 Enviando datos de perfil:', formData);

      try {
        const response = await fetch('/api/perfil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include'
        });

        console.log('📥 Respuesta del servidor:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Error del servidor:', errorData);
          throw new Error(errorData.error || 'Error al completar el perfil');
        }

        const responseData = await response.json();
        console.log('✅ Perfil completado exitosamente:', responseData);

        Cache.delete(`profile_${userId}`);

        userHasCompleteProfile = true;
        currentProfileData = responseData.data;

        toggleProfileView(false);
        updateProfileView(currentProfileData);
        populateEditForm(currentProfileData);

        showAlert('¡Perfil completado exitosamente! Ahora puede acceder a todas las funcionalidades de Acadelia.', 'success', 5000);
      } catch (error) {
        console.error('❌ Error al completar perfil:', error);
        showAlert(`Error al completar perfil: ${error.message}`, 'error');
      }
    }, 'Completando perfil...');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    return await LoadingOverlay.withLoading(async () => {
      const nombreInput = document.getElementById('nombre');
      const apellidoInput = document.getElementById('apellido');
      const paisSelect = document.getElementById('pais');
      const fechaInput = document.getElementById('fecha');
      const universidadSelect = document.getElementById('universidad');

      if (!nombreInput || !apellidoInput || !paisSelect || !fechaInput || !universidadSelect) {
        showAlert('Error: Faltan campos en el formulario', 'error');
        return;
      }

      if (!nombreInput.value.trim() ||
        !apellidoInput.value.trim() ||
        !paisSelect.value ||
        !fechaInput.value ||
        !universidadSelect.value) {
        showAlert('Por favor complete todos los campos obligatorios', 'warning');
        return;
      }

      const validationErrors = validateProfileForm(
        nombreInput.value,
        apellidoInput.value,
        fechaInput.value
      );

      if (validationErrors.length > 0) {
        showAlert(validationErrors[0], 'warning');
        return;
      }

      const formData = {
        id_rol: currentProfileData.id_rol,
        nombre: nombreInput.value.trim(),
        apellido: apellidoInput.value.trim(),
        id_pais: parseInt(paisSelect.value),
        nacimiento: fechaInput.value,
        id_universidad: parseInt(universidadSelect.value)
      };

      try {
        const response = await fetch(`/api/perfil/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al guardar');

        Cache.delete(`profile_${userId}`);
        await loadProfile();
        toggleEditMode(false);
        showAlert('Cambios guardados exitosamente', 'success');
      } catch (error) {
        showAlert(`Error al guardar cambios: ${error.message}`, 'error');
        console.error('Error:', error);
      }
    }, 'Guardando cambios...');
  };

  const checkUserAuthType = async (userId) => {
    return await LoadingOverlay.withLoading(async () => {
      // Intentamos usar datos cacheados primero
      const cacheKey = `authtype_${userId}`;
      const cachedAuthType = Cache.get(cacheKey);

      if (cachedAuthType) {
        console.log('🔍 Usando datos de auth cacheados:', cachedAuthType);
        return cachedAuthType;
      }

      try {
        // Consultamos al servidor
        const response = await fetch(`/api/usuarios/authtype/${userId}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const responseData = await response.json();
        const authInfo = responseData.success ? responseData.data : responseData;

        console.log('🔍 Información de autenticación recibida:', {
          isGoogleUser: authInfo.isGoogleUser,
          hasPassword: authInfo.hasPassword,
          id_user: authInfo.id_user
        });

        // Guardamos en caché por 5 minutos
        Cache.set(cacheKey, authInfo, 5 * 60 * 1000);

        return authInfo;
      } catch (error) {
        console.error('Error al verificar tipo de autenticación:', error);
        showAlert('Error al verificar tipo de cuenta', 'error');

        // 🆕 NUEVO: Valor por defecto más seguro
        const defaultAuth = {
          isGoogleUser: false,
          hasPassword: true,
          id_user: userId
        };

        console.log('🔍 Usando valores por defecto:', defaultAuth);
        return defaultAuth;
      }
    }, 'Verificando tipo de cuenta...');
  };

  // Evento para el botón de cambio de contraseña (mantener existente)
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', async () => {
      try {
        const authInfo = await checkUserAuthType(userId);

        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';

        clearPasswordIndicators();

        profileView.classList.add('hidden');
        profileEdit.classList.add('hidden');
        editToggleBtn.classList.add('hidden');
        changePasswordBtn.classList.add('hidden');

        changePasswordForm.classList.remove('hidden');

        // Elemento del grupo de contraseña actual
        const currentPasswordGroup = document.getElementById('currentPasswordGroup');

        // Si es usuario de Google SIN contraseña establecida
        if (authInfo.isGoogleUser && !authInfo.hasPassword) {
          if (currentPasswordGroup) currentPasswordGroup.classList.add('hidden');
          if (currentPasswordInput) currentPasswordInput.removeAttribute('required');

          if (newPasswordInput) newPasswordInput.removeAttribute('disabled');

          const formTitle = document.querySelector('.password-form-header h2');
          const formSubtitle = document.querySelector('.password-form-header p');
          const submitBtn = changePasswordForm.querySelector('button[type="submit"]');

          if (formTitle) formTitle.textContent = 'Establecer contraseña';
          if (formSubtitle) formSubtitle.textContent = 'Tu cuenta está vinculada a Google. Establece una contraseña para poder acceder también con tu correo.';
          if (submitBtn) submitBtn.textContent = 'Establecer contraseña';

          // Enfocar directamente en nueva contraseña
          setTimeout(() => {
            if (newPasswordInput) newPasswordInput.focus();
          }, 100);

          showAlert('Puedes establecer una contraseña para acceder también con tu correo', 'info');
        } else {
          // Usuario normal O usuario de Google CON contraseña establecida
          if (currentPasswordGroup) currentPasswordGroup.classList.remove('hidden');
          if (currentPasswordInput) currentPasswordInput.setAttribute('required', 'required');

          // Nueva contraseña deshabilitada hasta verificar la actual
          if (newPasswordInput) newPasswordInput.setAttribute('disabled', '');
          if (confirmPasswordInput) confirmPasswordInput.setAttribute('disabled', '');

          const formTitle = document.querySelector('.password-form-header h2');
          const formSubtitle = document.querySelector('.password-form-header p');
          const submitBtn = changePasswordForm.querySelector('button[type="submit"]');

          if (formTitle) formTitle.textContent = 'Cambiar contraseña';
          if (formSubtitle) formSubtitle.textContent = 'Ingresa tu contraseña actual para verificar tu identidad.';
          if (submitBtn) submitBtn.textContent = 'Guardar Cambios';

          // Enfocar en contraseña actual
          setTimeout(() => {
            if (currentPasswordInput) currentPasswordInput.focus();
          }, 100);
        }
      } catch (error) {
        console.error('Error al verificar tipo de autenticación:', error);
        showAlert('Error al cargar el formulario de contraseña', 'error');
      }
    });
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    return await LoadingOverlay.withLoading(async () => {
      try {
        const authInfo = await checkUserAuthType(userId);

        const newPasswordValue = newPasswordInput ? newPasswordInput.value : '';
        const confirmPasswordValue = confirmPasswordInput ? confirmPasswordInput.value : '';

        if (newPasswordValue !== confirmPasswordValue) {
          showAlert('Las contraseñas nuevas no coinciden', 'warning');
          return;
        }

        if (newPasswordValue.length < 6) {
          showAlert('La contraseña debe tener al menos 6 caracteres', 'warning');
          return;
        }

        // 🆕 NUEVO: Determinar si es establecimiento o cambio de contraseña
        const isPasswordSetup = authInfo.isGoogleUser && !authInfo.hasPassword;

        // Preparamos los datos según el caso
        const userData = {
          correo: correo,
          contraseña: newPasswordValue
        };

        if (!isPasswordSetup) {
          const currentPasswordValue = currentPasswordInput ? currentPasswordInput.value : '';

          if (!currentPasswordValue) {
            showAlert('Debes ingresar tu contraseña actual', 'warning');
            return;
          }

          userData.currentPassword = currentPasswordValue;
        }

        // 🆕 NUEVO: Agregar flag para identificar el tipo de operación
        userData.isPasswordSetup = isPasswordSetup;

        console.log('🔍 Enviando datos de contraseña:', {
          isPasswordSetup,
          hasCurrentPassword: !!userData.currentPassword,
          userType: authInfo.isGoogleUser ? 'Google' : 'Regular',
          hasExistingPassword: authInfo.hasPassword
        });

        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Guardar';
        if (submitBtn) {
          submitBtn.textContent = isPasswordSetup ? 'Estableciendo...' : 'Procesando...';
          submitBtn.disabled = true;
        }

        const response = await fetch(`/api/usuarios/usuarios/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
          credentials: 'include'
        });

        if (submitBtn) {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }

        if (!response.ok) {
          const errorData = await response.json();

          // 🆕 NUEVO: Manejo específico de errores
          if (response.status === 401 && errorData.code === 'INVALID_CURRENT_PASSWORD') {
            showAlert('La contraseña actual es incorrecta', 'error');
            if (currentPasswordInput) currentPasswordInput.focus();
            return;
          }

          if (response.status === 400 && errorData.code === 'CURRENT_PASSWORD_REQUIRED') {
            showAlert('Se requiere la contraseña actual', 'error');
            if (currentPasswordInput) currentPasswordInput.focus();
            return;
          }

          throw new Error(errorData.message || errorData.error || 'Error al procesar la contraseña');
        }

        const responseData = await response.json();
        const passwordChangeEmailSent = responseData.passwordChangeEmailSent === true;
        const isSetupComplete = responseData.isPasswordSetup === true;

        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';

        clearPasswordIndicators();

        Cache.delete(`profile_${userId}`);
        Cache.delete(`authtype_${userId}`);

        togglePasswordMode(false);

        // 🆕 NUEVO: Mostrar mensaje específico según el caso
        if (isSetupComplete) {
          showAlert('¡Contraseña establecida exitosamente! Ahora puedes acceder con tu correo y contraseña además de Google.', 'success', 6000);
        } else if (passwordChangeEmailSent) {
          showAlert('Contraseña cambiada exitosamente. Se ha enviado un correo de confirmación a tu dirección de email registrada.', 'success', 6000);
        } else {
          showAlert('Contraseña actualizada exitosamente', 'success');
        }

      } catch (error) {
        showAlert(`Error: ${error.message}`, 'error');
        console.error('Error al cambiar contraseña:', error);
      }
    }, 'Procesando contraseña...');
  };
  // ---------------------------
  // Configuración Inicial
  // ---------------------------
  if (profileView) profileView.classList.remove('hidden');
  if (profileEdit) profileEdit.classList.add('hidden');
  if (editToggleBtn) editToggleBtn.classList.remove('hidden');
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
  if (changePasswordBtn) changePasswordBtn.classList.remove('hidden');
  if (changePasswordForm) changePasswordForm.classList.add('hidden');

  if (profileCompleteSection) profileCompleteSection.classList.add('hidden');
  if (profileExistingSection) profileExistingSection.classList.remove('hidden');

  // Event Listeners existentes
  if (editToggleBtn) {
    editToggleBtn.addEventListener('click', () => {
      toggleEditMode(true);
      showAlert('Modo de edición activado', 'info', 1500);
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      toggleEditMode(false);
      showAlert('Edición cancelada', 'info', 1500);
    });
  }

  if (profileEdit) {
    profileEdit.addEventListener('submit', handleFormSubmit);
  }

  // Event Listeners para cambio de contraseña
  if (cancelPasswordChange) {
    cancelPasswordChange.addEventListener('click', () => {
      togglePasswordMode(false);
      showAlert('Cambio de contraseña cancelado', 'info', 1500);
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', handlePasswordChange);
  }

  // Nuevo Event Listener para el formulario de completar perfil
  if (profileCompleteForm) {
    profileCompleteForm.addEventListener('submit', handleCompleteProfileSubmit);
  }

  // Si usas un botón con ID, como sugerí en la primera respuesta
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      showAlert('Redirigiendo a la página de eliminación de cuenta...', 'warning');
      window.location.href = '/delete-account';
    });
  }

  // Inicialización
  checkAuthentication()
    .then(userData => {
      userId = userData.id_user;
      correo = userData.correo;

      globalUserEmail = correo;

      const rolInput = document.getElementById('Rol');
      if (rolInput) rolInput.value = rolesMapping[userData.id_rol] || '';

      if (!userId) throw new Error("No se pudo obtener el ID de usuario");

      console.log('🚀 Iniciando carga de perfil para usuario:', userId);
      loadProfile();
    })
    .catch(error => {
      console.error("Error en la autenticación:", error);
      performForcedLogout();
    });
});