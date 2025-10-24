document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animation library
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });

    // Pricing toggle functionality
    const billingToggle = document.getElementById('billing-toggle');
    const yearlyLabel = document.querySelector('.toggle-label:last-child');
    const monthlyLabel = document.querySelector('.toggle-label:first-child');
    
    // Function to update period text
    function updatePeriodText() {
        const periods = document.querySelectorAll('.period');
        periods.forEach(period => {
            if (billingToggle.checked) {
                period.textContent = '/anual';
            } else {
                period.textContent = '/mes';
            }
        });
    }
    
    // Show appropriate prices based on toggle state
    billingToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('yearly');
            yearlyLabel.classList.add('active');
            monthlyLabel.classList.remove('active');
        } else {
            document.body.classList.remove('yearly');
            monthlyLabel.classList.add('active');
            yearlyLabel.classList.remove('active');
        }
        updatePeriodText();
    });
    
    // Set default to monthly (unchecked)
    billingToggle.checked = false;
    document.body.classList.remove('yearly');
    monthlyLabel.classList.add('active');
    yearlyLabel.classList.remove('active');
    updatePeriodText();
    
    // Mobile navigation toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.style.display = mobileMenu.style.display === 'none' ? 'flex' : 'none';
        });
    }
    
    // Header scroll behavior
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Add animation to pricing cards on hover
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('featured')) {
                this.style.transform = 'translateY(-10px)';
                this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.15)';
            } else {
                this.style.transform = 'scale(1.05) translateY(-10px)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('featured')) {
                this.style.transform = '';
                this.style.boxShadow = '';
            } else {
                this.style.transform = 'scale(1.05)';
            }
        });
    });
});