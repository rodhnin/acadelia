document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('sidebarToggle');
    const closeButton = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    // Función para cerrar el sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // Toggle al abrir
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    // Cerrar con botón X
    closeButton.addEventListener('click', closeSidebar);
    
    // Cerrar con overlay
    overlay.addEventListener('click', closeSidebar);

    // Cerrar al hacer clic en cualquier enlace
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
});