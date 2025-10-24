// Tutorial section functionality - Final version
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS library for animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out',
            once: false,
            mirror: true
        });
    }

    // Get all tutorial navigation buttons and items
    const tutorialNavBtns = document.querySelectorAll('.tutorial-nav-btn');
    const tutorialItems = document.querySelectorAll('.tutorial-item');
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    // Variables for tracking
    let activeIndex = 0;
    let isAnimating = false;
    
    // Function to activate a specific tutorial
    function activateTutorial(targetId) {
        if (isAnimating) return;
        isAnimating = true;
        
        // Find the index of the target tutorial
        const targetIndex = Array.from(tutorialItems).findIndex(item => item.id === targetId);
        if (targetIndex === -1) {
            isAnimating = false;
            return;
        }
        
        // Store the current active index
        activeIndex = targetIndex;
        
        // Remove active class from all items with fade out effect
        tutorialItems.forEach(item => {
            if (item.classList.contains('active')) {
                item.style.opacity = '0';
                item.style.transform = 'translateY(30px)';
                
                // After fade out animation completes, remove active class
                setTimeout(() => {
                    item.classList.remove('active');
                    
                    // Activate the target tutorial after delay
                    activateTargetTutorial();
                }, 300);
            } else {
                item.classList.remove('active');
            }
        });
        
        // Remove active class from all buttons
        tutorialNavBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Function to activate the target tutorial
        function activateTargetTutorial() {
            // Activate the target tutorial
            const targetTutorial = document.getElementById(targetId);
            if (targetTutorial) {
                targetTutorial.classList.add('active');
                
                // Reset opacity and transform
                setTimeout(() => {
                    targetTutorial.style.opacity = '1';
                    targetTutorial.style.transform = 'translateY(0)';
                    
                    // Scroll to the tutorial with offset after a slight delay
                    scrollToTutorial(targetTutorial);
                    
                    // Activate animation for child elements
                    animateElements(targetTutorial);
                }, 50);
            }
            
            // Activate the corresponding button
            const targetBtn = document.querySelector(`.tutorial-nav-btn[data-target="${targetId}"]`);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }
            
            // Reset animation flag after a delay
            setTimeout(() => {
                isAnimating = false;
            }, 600);
        }
    }
    
    // Function to scroll to the tutorial
    function scrollToTutorial(targetTutorial) {
        const headerOffset = 150; // Adjusted for header height + some padding
        const elementPosition = targetTutorial.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        // Smooth scroll to the tutorial with offset
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    // Function to animate elements within a tutorial
    function animateElements(tutorial) {
        const animElements = tutorial.querySelectorAll('.anim-element');
        animElements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('animated');
            }, 300 + (index * 150)); // Staggered animation
        });
    }
    
    // Add click handlers to tutorial navigation buttons
    tutorialNavBtns.forEach((btn, index) => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add ripple effect
            createRippleEffect(e, this);
            
            const targetId = this.getAttribute('data-target');
            activateTutorial(targetId);
        });
        
        // Add keyboard navigation
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const targetId = this.getAttribute('data-target');
                activateTutorial(targetId);
            }
        });
    });
    
    // Add smooth scroll for the "Try Now" buttons
    const tryNowBtns = document.querySelectorAll('.try-now-btn');
    tryNowBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add ripple effect
            createRippleEffect(e, this);
            
            // Scroll to the AVA grid container
            const avaGridContainer = document.querySelector('.ava-grid-container');
            if (avaGridContainer) {
                // Apply highlight effect to AVA grid container
                avaGridContainer.classList.add('highlight-attention');
                
                // Smooth scroll with a slight delay for better UX
                setTimeout(() => {
                    avaGridContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Remove highlight effect after animation
                    setTimeout(() => {
                        avaGridContainer.classList.remove('highlight-attention');
                    }, 2000);
                }, 300);
            }
        });
    });
    
    // Create ripple effect function
    function createRippleEffect(e, element) {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.classList.add('btn-ripple');
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 800);
    }
    
    // Handle intersection observer for animations
    const setupIntersectionObserver = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    
                    // Only unobserve in non-active tutorials to allow re-animation when activated
                    const parentTutorial = entry.target.closest('.tutorial-item');
                    if (!parentTutorial || !parentTutorial.classList.contains('active')) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -100px 0px'
        });
        
        // Observe all animation elements
        document.querySelectorAll('.anim-element').forEach(el => {
            observer.observe(el);
        });
    };
    
    // Handle sticky navigation on scroll
    const setupStickyNav = () => {
        const tutorialsNavWrapper = document.querySelector('.tutorials-nav-wrapper');
        const tutorialsSection = document.querySelector('.tutorials-section');
        
        if (!tutorialsNavWrapper || !tutorialsSection) return;
        
        const tutorialsTopPosition = tutorialsSection.offsetTop;
        
        // Function to toggle sticky navigation
        const toggleStickyNav = () => {
            const scrollY = window.scrollY || window.pageYOffset;
            
            if (scrollY > tutorialsTopPosition) {
                tutorialsNavWrapper.classList.add('sticky-nav');
                
                // Update active button based on current scroll position
                updateActiveButtonOnScroll();
            } else {
                tutorialsNavWrapper.classList.remove('sticky-nav');
            }
        };
        
        // Function to toggle back-to-top button
        const toggleBackToTop = () => {
            const scrollY = window.scrollY || window.pageYOffset;
            
            if (scrollY > tutorialsTopPosition + 300) {
                backToTopBtn?.parentElement.classList.add('visible');
            } else {
                backToTopBtn?.parentElement.classList.remove('visible');
            }
        };
        
        // Update active nav button based on scroll position
        const updateActiveButtonOnScroll = () => {
            if (isAnimating) return;
            
            // Get all visible tutorial items
            const visibleTutorials = Array.from(tutorialItems).filter(item => 
                item.classList.contains('active')
            );
            
            if (visibleTutorials.length === 0) return;
            
            // Get current scroll position
            const scrollY = window.scrollY || window.pageYOffset;
            const viewportHeight = window.innerHeight;
            
            // Calculate which tutorial is most visible in the viewport
            let maxVisibleArea = 0;
            let mostVisibleTutorial = null;
            
            visibleTutorials.forEach(tutorial => {
                const rect = tutorial.getBoundingClientRect();
                const tutorialTop = rect.top;
                const tutorialBottom = rect.bottom;
                
                // Calculate visible area of the tutorial in the viewport
                const visibleTop = Math.max(0, tutorialTop);
                const visibleBottom = Math.min(viewportHeight, tutorialBottom);
                const visibleArea = Math.max(0, visibleBottom - visibleTop);
                
                if (visibleArea > maxVisibleArea) {
                    maxVisibleArea = visibleArea;
                    mostVisibleTutorial = tutorial;
                }
            });
            
            // Update active button if a tutorial is visible
            if (mostVisibleTutorial) {
                const tutorialId = mostVisibleTutorial.id;
                
                // Remove active class from all buttons
                tutorialNavBtns.forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to the corresponding button
                const activeBtn = document.querySelector(`.tutorial-nav-btn[data-target="${tutorialId}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    
                    // Center the active button in the navigation (only on mobile)
                    if (window.innerWidth <= 768) {
                        const navContainer = document.querySelector('.tutorials-nav');
                        if (navContainer) {
                            const btnRect = activeBtn.getBoundingClientRect();
                            const navRect = navContainer.getBoundingClientRect();
                            
                            const scrollAmount = btnRect.left - navRect.left - (navRect.width / 2) + (btnRect.width / 2);
                            navContainer.scrollTo({
                                left: navContainer.scrollLeft + scrollAmount,
                                behavior: 'smooth'
                            });
                        }
                    }
                }
            }
        };
        
        // Attach scroll event
        window.addEventListener('scroll', () => {
            toggleStickyNav();
            toggleBackToTop();
        });
        
        // Initial check
        toggleStickyNav();
        toggleBackToTop();
    };
    
    // Initialize back to top button functionality
    const initBackToTop = () => {
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Add ripple effect
                createRippleEffect(e, backToTopBtn);
                
                // Scroll to top
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    };
    
    // Apply horizontal scroll with mouse wheel for tutorial navigation
    const initHorizontalScroll = () => {
        const tutorialsNav = document.querySelector('.tutorials-nav');
        if (!tutorialsNav) return;
        
        tutorialsNav.addEventListener('wheel', (event) => {
            if (window.innerWidth <= 768 && event.deltaY !== 0) {
                event.preventDefault();
                tutorialsNav.scrollLeft += event.deltaY;
            }
        });
        
        // Add dragging functionality for mobile
        let isDragging = false;
        let startX;
        let scrollLeft;
        
        tutorialsNav.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - tutorialsNav.offsetLeft;
            scrollLeft = tutorialsNav.scrollLeft;
            tutorialsNav.style.cursor = 'grabbing';
        });
        
        tutorialsNav.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].pageX - tutorialsNav.offsetLeft;
            scrollLeft = tutorialsNav.scrollLeft;
        });
        
        tutorialsNav.addEventListener('mouseleave', () => {
            isDragging = false;
            tutorialsNav.style.cursor = 'grab';
        });
        
        tutorialsNav.addEventListener('mouseup', () => {
            isDragging = false;
            tutorialsNav.style.cursor = 'grab';
        });
        
        tutorialsNav.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        tutorialsNav.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - tutorialsNav.offsetLeft;
            const walk = (x - startX) * 2;
            tutorialsNav.scrollLeft = scrollLeft - walk;
        });
        
        tutorialsNav.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const x = e.touches[0].pageX - tutorialsNav.offsetLeft;
            const walk = (x - startX) * 2;
            tutorialsNav.scrollLeft = scrollLeft - walk;
        });
    };
    
    // Add highlight effect CSS for AVA grid container
    const addHighlightEffect = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes highlight-pulse {
                0%, 100% { box-shadow: 0 0 10px 5px rgba(164, 172, 134, 0); }
                50% { box-shadow: 0 0 20px 10px rgba(164, 172, 134, 0.3); }
            }
            
            .highlight-attention {
                animation: highlight-pulse 1.5s ease-in-out 2;
            }
        `;
        document.head.appendChild(style);
    };
    
    // Function to initialize the first tutorial
    const initFirstTutorial = () => {
        // Show the first tutorial by default
        if (tutorialItems.length > 0 && tutorialNavBtns.length > 0) {
            const firstId = tutorialNavBtns[0].getAttribute('data-target');
            // We just add the classes without scrolling on initial load
            tutorialItems.forEach(item => {
                if (item.id === firstId) {
                    item.classList.add('active');
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                    
                    // Activate animations for the first tutorial
                    const animElements = item.querySelectorAll('.anim-element');
                    animElements.forEach((el, index) => {
                        setTimeout(() => {
                            el.classList.add('animated');
                        }, 500 + (index * 150));
                    });
                }
            });
            
            tutorialNavBtns[0].classList.add('active');
        }
    };
    
    // Initialize ripple effect styles
    const initRippleStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .btn-ripple {
                position: absolute;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                pointer-events: none;
                width: 100px;
                height: 100px;
                transform: translate(-50%, -50%) scale(0);
                animation: ripple 0.8s linear;
            }
            
            @keyframes ripple {
                to {
                    transform: translate(-50%, -50%) scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    };
    
    // Función para añadir las burbujas a los personajes
const setupCharacterBubbles = () => {
    // Añadir estilos para las burbujas dinámicamente
    const bubbleStyles = document.createElement('style');
    bubbleStyles.textContent = `
        .character-bubble {
            position: absolute;
            top: -25px;
            right: 30px;
            background-color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--third-color);
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            z-index: 10;
            pointer-events: none;
            white-space: nowrap;
        }
        
        .character-bubble::after {
            content: '';
            position: absolute;
            bottom: -8px;
            right: 20px;
            width: 15px;
            height: 15px;
            background-color: white;
            transform: rotate(45deg);
            z-index: -1;
            box-shadow: 4px 4px 5px rgba(0, 0, 0, 0.05);
        }
        
        .character-bubble.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        [data-theme="dark"] .character-bubble {
            background-color: var(--third-color);
            color: white;
        }
        
        [data-theme="dark"] .character-bubble::after {
            background-color: var(--third-color);
        }
        
        @media (max-width: 768px) {
            .character-bubble {
                top: 15px;
                right: 60px;
                font-size: 0.8rem;
                padding: 0.4rem 0.8rem;
            }
        }
        
        @media (max-width: 576px) {
            .character-bubble {
                top: 10px;
                right: 50px;
                font-size: 0.7rem;
                padding: 0.3rem 0.6rem;
            }
            
            .character-bubble::after {
                right: 15px;
                width: 12px;
                height: 12px;
            }
        }
    `;
    document.head.appendChild(bubbleStyles);
    
    // Definir los textos para cada tipo de tutorial
    const bubbleTexts = {
        'conceptMaps': '¡Organiza tus ideas!',
        'calculator': '¡Resuelve paso a paso!',
        'search': '¡Busca con precisión!',
        'pdf': '¡Analiza tus PDFs!',
        'video': '¡Analiza multimedia!',
        'exams': '¡Prepárate para exámenes!'
    };
    
    // Crear y añadir burbujas al header en lugar de al corner
    const tutorialHeaders = document.querySelectorAll('.tutorial-header');
    tutorialHeaders.forEach(header => {
        // Buscar a qué tutorial pertenece
        const tutorialItem = header.closest('.tutorial-item');
        const tutorialId = tutorialItem ? tutorialItem.id : '';
        
        // Crear la burbuja si no existe
        if (!header.querySelector('.character-bubble')) {
            const bubble = document.createElement('div');
            bubble.className = 'character-bubble';
            
            const span = document.createElement('span');
            span.textContent = bubbleTexts[tutorialId] || '¡Hola!';
            
            bubble.appendChild(span);
            header.appendChild(bubble);
            
            // Eventos para mostrar/ocultar burbuja en todo el header
            header.addEventListener('mouseenter', () => {
                bubble.classList.add('visible');
            });
            
            header.addEventListener('mouseleave', () => {
                bubble.classList.remove('visible');
            });
        }
    });
    
    // Observador para detectar nuevos headers añadidos dinámicamente
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    // Si se añade un nodo que contiene tutorial-header
                    if (node.nodeType === 1 && (node.classList?.contains('tutorial-header') || node.querySelector?.('.tutorial-header'))) {
                        setupCharacterBubbles(); // Volver a ejecutar la configuración
                    }
                });
            }
        });
    });
    
    // Observar cambios en el contenedor de tutoriales
    const tutorialContainer = document.querySelector('.tutorial-container');
    if (tutorialContainer) {
        observer.observe(tutorialContainer, { childList: true, subtree: true });
    }
};

    
    // Initialize all functionality
    const init = () => {
        initFirstTutorial();
        setupIntersectionObserver();
        setupStickyNav();
        initBackToTop();
        initHorizontalScroll();
        addHighlightEffect();
        initRippleStyles();
        setupCharacterBubbles(); // Añadir las burbujas
    };
    
    // Run initialization
    init();
});