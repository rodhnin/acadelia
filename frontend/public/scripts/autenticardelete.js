document.addEventListener('DOMContentLoaded', async () => {
    // Oculta el contenido inicialmente
    document.body.style.display = 'none';
    
    const checkAuthentication = async () => {
        try {
            const response = await fetch('/api/usuarios/auth-status', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            const data = await response.json();
            
            if (data.authenticated) {
                console.log('Usuario autenticado:', data.user);
                document.body.style.display = 'block';
            } else {
                console.log('Usuario no autenticado, redirigiendo...');
                // Redirigir a la página de login si no está autenticado
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            // En caso de error, redirigir a la página de login
            window.location.href = '/login';
        }
    };

    await checkAuthentication();
});