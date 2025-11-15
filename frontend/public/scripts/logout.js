/**
 * Script dedicado para manejar el logout
 */
(function() {
    const getCsrfToken = () => {
        // 1. Primero intentar obtener de la variable global
        if (window.CSRF_TOKEN) {
            return window.CSRF_TOKEN;
        }
        
        // 2. Intentar obtener de la cookie
        const csrfCookie = document.cookie.split('; ')
            .find(row => row.startsWith('XSRF-TOKEN='));
        if (csrfCookie) {
            const token = decodeURIComponent(csrfCookie.split('=')[1]);
            return token;
        }
        
        // 3. Como último recurso, intentar la meta tag
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            const metaValue = metaTag.getAttribute('content');
            if (metaValue && !metaValue.includes('<%=')) {
                return metaValue;
            }
        }
        
        return null;
    };

    async function performLogout() {
        try {
            console.log('Iniciando logout...');
            const csrfToken = getCsrfToken();
            console.log('Token CSRF obtenido:', csrfToken);
            
            const options = {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (csrfToken) {
                options.headers['X-CSRF-Token'] = csrfToken;
            }
            
            const response = await fetch('/api/usuarios/logout', options);

            if (!response.ok) {
                throw new Error('Error al cerrar sesión');
            }

            document.cookie.split(';').forEach(cookie => {
                document.cookie = cookie.replace(/^ +/, '')
                    .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
            });

            localStorage.clear();
            sessionStorage.clear();

            console.log('Logout exitoso, redirigiendo...');
            redirectToLogin();
        } catch (error) {
            console.error('Error en logout:', error);
            // IMPORTANTE: Redirigir de todas formas para evitar que el usuario quede atrapado
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        window.location.href = 'login';
    }

    document.addEventListener('DOMContentLoaded', () => {
        const logoutElements = [
            document.querySelector('.logout a'),
            document.querySelector('a.logout'),
            document.querySelector('button.logout'),
            document.querySelector('a[href="logout"]'),
            ...Array.from(document.querySelectorAll('a')).filter(a => 
                a.textContent.includes('Cerrar sesión') || 
                a.textContent.includes('Logout') || 
                a.innerHTML.includes('bx-log-out')
            )
        ].filter(Boolean); // Filtrar elementos nulos
        
        console.log('Elementos de logout encontrados:', logoutElements.length);
        
        logoutElements.forEach(element => {
            element.addEventListener('click', async (e) => {
                e.preventDefault();
                await performLogout();
            });
        });
    });
})();