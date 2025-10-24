const menuToggle = document.getElementById('menuToggle');
if (menuToggle) {
    menuToggle.addEventListener('click', function() {
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            navButtons.classList.toggle('show');
        }
    });
}