document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });
    
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
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.style.display = mobileMenu.style.display === 'none' ? 'flex' : 'none';
        });
    }
    
    // Media carousel functionality
    const mediaOptions = document.querySelectorAll('.media-option');
    const mediaElements = document.querySelectorAll('.media-display video, .media-display img');
    
    if (mediaOptions.length > 0 && mediaElements.length > 0) {
        function changeMedia(mediaId) {
            mediaElements.forEach(media => {
                media.classList.remove('active');
                if (media.tagName.toLowerCase() === 'video') {
                    media.pause();
                }
            });
            
            const selectedMedia = document.getElementById(mediaId);
            if (selectedMedia) {
                selectedMedia.classList.add('active');
                
                // Si es un video, reproducirlo
                if (selectedMedia.tagName.toLowerCase() === 'video') {
                    selectedMedia.currentTime = 0; // Reiniciar el video
                    selectedMedia.play()
                      .catch(e => console.log("Error al reproducir el video:", e));
                }
            }
            
            mediaOptions.forEach(option => {
                if (option.getAttribute('data-media') === mediaId) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        }
        
        mediaOptions.forEach(option => {
            option.addEventListener('click', function() {
                const mediaId = this.getAttribute('data-media');
                changeMedia(mediaId);
            });
        });
        
        const firstOption = mediaOptions[0];
        if (firstOption) {
            const firstMediaId = firstOption.getAttribute('data-media');
            if (firstMediaId) {
                changeMedia(firstMediaId);
            }
        }
    }
    
    // Animated counters for stats in hero section
    const statValues = document.querySelectorAll('.stat-value');
    
    if (statValues.length > 0) {
        const animateCounter = (el, target, suffix) => {
            let count = 1; // Start from 1 instead of 0
            const duration = 2000; // 2 seconds
            const frameDuration = 1000 / 60; // 60fps
            const totalFrames = Math.round(duration / frameDuration);
            const countIncrement = (target - 1) / totalFrames; // Adjust for starting at 1
            
            // Initialize with starting value
            el.textContent = suffix ? `${Math.floor(count)}${suffix}` : Math.floor(count);
            
            const timer = setInterval(() => {
                count += countIncrement;
                
                if (count >= target) {
                    clearInterval(timer);
                    el.textContent = suffix ? `${Math.floor(target)}${suffix}` : target;
                } else {
                    el.textContent = suffix ? `${Math.floor(count)}${suffix}` : Math.floor(count);
                }
            }, frameDuration);
        };
        
        // Intersection Observer to trigger animation when stats are in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const value = target.textContent;
                    let numericValue, suffix = '';
                    
                    // Handle different formats (%, +, /)
                    if (value.includes('%')) {
                        numericValue = parseFloat(value.replace('%', ''));
                        suffix = '%';
                    } else if (value.includes('+')) {
                        numericValue = parseFloat(value.replace('+', ''));
                        suffix = '+';
                    } else if (value.includes('/')) {
                        const parts = value.split('/');
                        numericValue = parseFloat(parts[0]);
                        suffix = '/' + parts[1];
                    } else {
                        numericValue = parseFloat(value);
                    }
                    
                    animateCounter(target, numericValue, suffix);
                    observer.unobserve(target);
                }
            });
        }, { threshold: 0.5 });
        
        statValues.forEach(stat => observer.observe(stat));
    }
    
    // Add hover animations to cards and features
    const hoverElements = document.querySelectorAll('.ava-card, .feature-box, .service-card');
    
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        element.addEventListener('mouseleave', function() {
            if (!this.classList.contains('highlighted')) {
                this.style.transform = '';
            } else {
                this.style.transform = 'scale(1.05)';
            }
        });
    });
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});