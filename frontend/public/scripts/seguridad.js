/**
 * Security Dashboard - Acadelia
 * Punto de entrada para el panel de seguridad
 * 
 * Este archivo inicializa la aplicación del panel de seguridad
 * cuando se carga la página security-dashboard.html
 */

import securityApp from './chiguireloco/app.js';

// Inicializar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Security Dashboard de Acadelia...');
    
    try {
        // Inicializar la aplicación
        await securityApp.init();
        console.log('Security Dashboard inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando Security Dashboard:', error);
        
        // Mostrar mensaje de error en la página
        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger m-4';
        errorContainer.innerHTML = `
            <h4 class="alert-heading">Error de inicialización</h4>
            <p>No se pudo inicializar el panel de seguridad: ${error.message}</p>
            <hr>
            <p class="mb-0">Por favor, recarga la página o contacta al administrador del sistema.</p>
        `;
        
        // Insertar al principio del contenido principal
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.insertBefore(errorContainer, mainContent.firstChild);
        } else {
            document.body.prepend(errorContainer);
        }
    }
});

// Limpiar recursos cuando el usuario abandona la página
window.addEventListener('beforeunload', () => {
    // Limpiar recursos
    securityApp.destroy();
});