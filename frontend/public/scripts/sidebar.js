document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('sidebarToggle');
    const closeButton = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // Toggle al abrir
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    closeButton.addEventListener('click', closeSidebar);
    
    overlay.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
});