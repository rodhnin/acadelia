document.addEventListener('DOMContentLoaded', () => {
    let userId = null;

    // Debug: Inicio de carga
    console.log('Iniciando verificación de autenticación...');
    
    checkAuthentication()
        .then(userData => {
            userId = userData.id_user;
            console.log('✅ Usuario autenticado - Datos completos:', userData);
            console.log('🆔 User ID obtenido:', userId);
            initProfileForm(userId);
        })
        .catch(error => {
            console.error('❌ Error en autenticación:', error);
            performForcedLogout();
        });
});

const checkAuthentication = async () => {
    try {
        console.log('🔍 Verificando autenticación...');
        const response = await fetch('/api/usuarios/authenticate', {
            method: 'GET',
            credentials: 'include'
        });

        console.log('⚡ Estado de autenticación:', response.status);
        console.log('🔗 URL verificada:', response.url);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Respuesta no JSON:', text);
            throw new Error('Formato de respuesta inválido');
        }

        return await response.json();

    } catch (error) {
        console.error('❌ Error en autenticación completa:', error);
        throw error;
    }
};

const showAlert = (message, type = 'info', duration = 3000) => {
    console.log(`🔔 Mostrando alerta: ${type} - ${message}`);
    
    // Configuración de tipos de alertas
    const alertTypes = {
        success: { icon: '✓', class: 'alert-success' },
        error: { icon: '✖', class: 'alert-error' },
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
};

const performForcedLogout = async () => {
    console.log('🔒 Iniciando logout forzado...');
    try {
        const response = await fetch('/api/usuarios/logout', {
            method: 'POST',
            credentials: 'include'
        });
        console.log('🚪 Respuesta de logout:', response.status);
    } catch (error) {
        console.error('❌ Error en logout:', error);
    } finally {
        // Limpieza agresiva de cookies
        document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.split('=').map(c => c.trim());
            document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        });
        console.log('🔄 Redirigiendo a login...');
        showAlert('Sesión cerrada. Redirigiendo a login...', 'info');
        window.location.href = 'login';
    }
};

const initProfileForm = (userId) => {
    console.log('📝 Inicializando formulario para user ID:', userId);
    
    const form = document.querySelector('form');
    const userIdField = document.createElement('input');
    userIdField.type = 'hidden';
    userIdField.name = 'id_usuario';
    userIdField.value = userId;
    form.prepend(userIdField);
    console.log('📌 Campo oculto creado:', userIdField);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📤 Evento submit detectado');
        
        if (validateForm()) {
            await handleFormSubmit(userId);
        } else {
            console.warn('⚠️ Validación de formulario fallida');
            showAlert('Por favor complete todos los campos requeridos', 'warning');
            form.reportValidity();
        }
    });

    initializeSelects();
};

const validateForm = () => {
    console.log('🔎 Validando campos...');
    
    const fields = {
        nombre: document.getElementById('nombre'),
        apellido: document.getElementById('apellido'),
        pais: document.getElementById('pais'),
        universidad: document.getElementById('universidad'),
        fechaNacimiento: document.getElementById('datePicker'),
        idRol: document.getElementById('idRol')
    };

    console.log('📋 Valores actuales:', {
        nombre: fields.nombre.value,
        apellido: fields.apellido.value,
        pais: fields.pais.value,
        universidad: fields.universidad.value,
        fechaNacimiento: fields.fechaNacimiento.value,
        idRol: fields.idRol.value
    });

    return Object.values(fields).every(field => {
        const isValid = field.checkValidity();
        console.log(`➡️ Campo ${field.id}:`, {
            valor: field.value,
            valido: isValid
        });
        return isValid;
    });
};

const handleFormSubmit = async (userId) => {
    try {
        console.log('🚀 Iniciando envío de formulario...');
        
        const elements = {
            nombre: document.getElementById('nombre'),
            apellido: document.getElementById('apellido'),
            pais: document.getElementById('pais'),
            universidad: document.getElementById('universidad'),
            fechaNacimiento: document.getElementById('datePicker'),
            idRol: document.getElementById('idRol')
        };

        const formData = {
            id_usuario: userId,
            id_rol: elements.idRol.value,
            nombre: elements.nombre.value.trim(),
            apellido: elements.apellido.value.trim(),
            id_pais: parseInt(elements.pais.value, 10),
            nacimiento: elements.fechaNacimiento.value,
            id_universidad: parseInt(elements.universidad.value, 10)
        };

        console.log('📦 Datos procesados:', formData);

        if (Object.values(formData).some(v => v === undefined || v === null || v === '')) {
            throw new Error('⚠️ Campos vacíos detectados después de validación');
        }

        console.log('📨 Enviando datos al servidor...');
        const response = await fetch('api/perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        const responseText = await response.text();
        console.log('📩 Respuesta cruda del servidor:', responseText);

        if (!response.ok) {
            throw new Error(`❌ Error ${response.status}: ${responseText}`);
        }

        const responseData = JSON.parse(responseText);
        console.log('✅ Respuesta exitosa:', responseData);
        showAlert('¡Perfil actualizado con éxito!', 'success');
        setTimeout(() => {
            window.location.href = 'principal';
        }, 1500);

    } catch (error) {
        console.error('🔥 Error completo:', {
            mensaje: error.message,
            stack: error.stack,
            error: error
        });
        
        if (error.message.includes('Error 4')) {
            showAlert('Error en los datos: ' + error.message, 'error');
        } else {
            showAlert('Error del servidor: ' + error.message, 'error', 5000);
        }
    }
};

const initializeSelects = async () => {
    try {
        const paisSelect = document.getElementById('pais');
        const universidadSelect = document.getElementById('universidad');

        const paises = await fetch('/api/paises')
            .then(res => {
                if (!res.ok) throw new Error('Error cargando países');
                return res.json();
            });

        paisSelect.innerHTML = '<option value="" disabled selected hidden></option>';
        paises.forEach(pais => {
            const option = new Option(pais.nombre_pais, pais.id_pais);
            paisSelect.add(option);
        });

        paisSelect.addEventListener('change', async (e) => {
            if (!e.target.value) return;

            const universidades = await fetch(`/api/universidades/${e.target.value}`)
                .then(res => {
                    if (!res.ok) throw new Error('Error cargando universidades');
                    return res.json();
                });

            universidadSelect.innerHTML = '<option value="" disabled selected hidden></option>';
            universidades.forEach(universidad => {
                const option = new Option(universidad.nom_universidad, universidad.id_universidad);
                universidadSelect.add(option);
            });
        });

    } catch (error) {
        console.error('Error cargando datos:', error);
        showAlert('Error cargando opciones', 'error');
    }
};