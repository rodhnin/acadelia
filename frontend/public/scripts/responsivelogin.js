document.addEventListener('DOMContentLoaded', function() {
    const isMobile = () => window.innerWidth <= 870;
    
    // Seleccionar el wrapper y los contenedores
    const wrapper = document.querySelector('.wrapper');
    const loginContainer = document.querySelector('.login-container');
    const registerContainer = document.querySelector('.register-container');
    
    function showRegister(e) {
        if (e) e.preventDefault();
        console.log('Cambiando a registro');
        wrapper.classList.add('active');
        
        if (isMobile()) {
            loginContainer.style.display = 'none';
            registerContainer.style.display = 'flex';
        }
    }
    
    function showLogin(e) {
        if (e) e.preventDefault();
        console.log('Cambiando a login');
        wrapper.classList.remove('active');
        
        if (isMobile()) {
            registerContainer.style.display = 'none';
            loginContainer.style.display = 'flex';
        }
    }
    
    // ESPECÍFICO PARA LOS BOTONES GHOST
    const ghostBtnRegistro = document.querySelector('.ghost-btn.link-registro');
    const ghostBtnIngresar = document.querySelector('.ghost-btn.link-ingresar');
    
    if (ghostBtnRegistro) {
        ghostBtnRegistro.addEventListener('click', showRegister);
    }
    
    if (ghostBtnIngresar) {
        ghostBtnIngresar.addEventListener('click', showLogin);
    }
    
    function createResponsiveButtons() {
        // Solo crear los botones si estamos en móvil y no existen ya
        if (!isMobile()) return;
        
        if (!document.getElementById('mobile-ghost-register')) {
            const mobileRegisterBtn = document.createElement('button');
            mobileRegisterBtn.id = 'mobile-ghost-register';
            mobileRegisterBtn.className = 'ghost-btn link-registro mobile-ghost-btn';
            mobileRegisterBtn.textContent = 'Crear cuenta';
            
            const loginForm = document.getElementById('formLogin');
            if (loginForm) {
                loginForm.appendChild(mobileRegisterBtn);
                mobileRegisterBtn.addEventListener('click', showRegister);
            }
        }
        
        if (!document.getElementById('mobile-ghost-login')) {
            const mobileLoginBtn = document.createElement('button');
            mobileLoginBtn.id = 'mobile-ghost-login';
            mobileLoginBtn.className = 'ghost-btn link-ingresar mobile-ghost-btn';
            mobileLoginBtn.textContent = 'Ingresar';
            
            const registerForm = document.getElementById('formRegistro');
            if (registerForm) {
                registerForm.appendChild(mobileLoginBtn);
                mobileLoginBtn.addEventListener('click', showLogin);
            }
        }
    }
    
    createResponsiveButtons();
    
    // También crear los botones cuando cambie el tamaño de la ventana
    window.addEventListener('resize', function() {
        // Primero eliminar los botones existentes para evitar duplicados
        const existingButtons = document.querySelectorAll('.mobile-ghost-btn');
        existingButtons.forEach(btn => btn.remove());
        
        // Luego crear nuevos si es necesario
        createResponsiveButtons();
    });
    
    // Enlaces móviles existentes (asegurarse de que también funcionen)
    const mobileRegistroLink = document.querySelector('.mobile-link a.link-registro');
    if (mobileRegistroLink) {
        mobileRegistroLink.addEventListener('click', showRegister);
    }
    
    const mobileIngresarLink = document.querySelector('.mobile-link a.link-ingresar');
    if (mobileIngresarLink) {
        mobileIngresarLink.addEventListener('click', showLogin);
    }
});