document.addEventListener('DOMContentLoaded', async () => {
    // Oculta el contenido inicialmente
    document.body.style.display = 'none';
    
    // Función para verificar la autenticación usando la ruta pública
    const checkAuthentication = async () => {
        try {
            // Usar la API pública que siempre devuelve 200 OK
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
            
            // Verificar si está autenticado según el campo 'authenticated'
            if (data.authenticated) {
                console.log('Usuario autenticado:', data.user);
                // Mostrar el contenido de la página ya que el usuario está autenticado
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

    // Ejecuta la verificación de autenticación
    await checkAuthentication();
});