/**
 * Security Dashboard - Acadelia
 * Punto de entrada para el panel de seguridad
 * 
 * Este archivo inicializa la aplicación del panel de seguridad
 * cuando se carga la página security-dashboard.html
 */

import securityApp from './chiguireloco/app.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Security Dashboard de Acadelia...');
    
    try {
        await securityApp.init();
        console.log('Security Dashboard inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando Security Dashboard:', error);
        
        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger m-4';
        errorContainer.innerHTML = `
            <h4 class="alert-heading">Error de inicialización</h4>
            <p>No se pudo inicializar el panel de seguridad: ${error.message}</p>
            <hr>
            <p class="mb-0">Por favor, recarga la página o contacta al administrador del sistema.</p>
        `;
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.insertBefore(errorContainer, mainContent.firstChild);
        } else {
            document.body.prepend(errorContainer);
        }
    }
});

window.addEventListener('beforeunload', () => {
    securityApp.destroy();
});