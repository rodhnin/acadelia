document.addEventListener('DOMContentLoaded', async () => {
    // Función para verificar la autenticación
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
                // Usuario autenticado - los botones permanecen ocultos
                // No agregar la clase show-login-buttons
            } else {
                // Usuario no autenticado - mostrar botones de login
                document.body.classList.add('show-login-buttons');
            }
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            // En caso de error, mostrar botones por seguridad
            document.body.classList.add('show-login-buttons');
        }
    };

    // Ejecutar verificación inmediatamente
    await checkAuthentication();
});