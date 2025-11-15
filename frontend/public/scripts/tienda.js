document.addEventListener("DOMContentLoaded", function () {
    // Referencias a elementos del DOM
    const searchInput = document.getElementById("searchInput");
    const track = document.getElementById("track");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const regresarBtn = document.getElementById("regresarBtn");
    const searchIcon = document.getElementById("searchIcon");
    const comparisonSection = document.querySelector('.ava-comparison');
    const countrySelect = document.getElementById('countrySelect');
    const billingButtons = document.querySelectorAll('#monthlyBtn, #yearlyBtn');
    const suggestionsBox = document.getElementById("suggestions") || document.createElement('div');
    
    suggestionsBox.className = 'suggestions-box';
    searchInput?.parentNode.appendChild(suggestionsBox);
    
    // Variables del sistema
    let currentIndex = 0;
    let itemsToShow = getItemsToShow();
    let maxIndex = 0;
    let isDragging = false;
    let startX;
    let originalContent = null;
    let carrerasCache = null;
    let isLoading = true;
    
    // Variable para controlar el estado de la vista
    let isDetailView = false;

    
    function getItemsToShow() {
        if (window.innerWidth <= 576) return 1;
        if (window.innerWidth <= 768) return 2;
        if (window.innerWidth <= 1200) return 3;
        if (window.innerWidth <= 1500) return 4;
        return 5;
    }

    function updateCarousel(smooth = true) {
        if (!track?.children.length) return;
        
        const visibleCards = Array.from(track.children).filter(card => 
            card.style.display !== 'none' && card.classList.contains('content-box')
        );
        
        if (visibleCards.length <= itemsToShow) {
            track.style.transition = 'none';
            track.style.transform = 'none';
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            return;
        }
        
        const cardWidth = visibleCards[0].offsetWidth + 16; // Incluye el gap
        maxIndex = Math.max(0, visibleCards.length - itemsToShow);
        currentIndex = Math.min(currentIndex, maxIndex);
        
        // Asegurarse de que el track esté en el DOM antes de manipularlo
    if (track.parentNode) {
        track.style.transition = smooth ? 'transform 0.3s ease-out' : 'none';
        track.style.transform = `translateX(-${(currentIndex * cardWidth) + 30}px)`;
        updateNavigation();
    }
}
    function moveSlide(direction) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex <= maxIndex) {
            currentIndex = newIndex;
            updateCarousel(true);
        }
    }

    function updateNavigation() {
        if (!track || !prevBtn || !nextBtn) return;
        
        const visibleCards = Array.from(track.children).filter(card => 
            card.style.display !== 'none' && card.classList.contains('content-box')
        );
        
        if (visibleCards.length <= itemsToShow) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            return;
        }
        
        prevBtn.style.opacity = currentIndex > 0 ? '1' : '0';
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        
        nextBtn.style.opacity = currentIndex < maxIndex ? '1' : '0';
        nextBtn.style.display = currentIndex < maxIndex ? 'flex' : 'none';
    }


    const addEntranceEffects = () => {
        if (!track) return;
        
        // Verificamos que existen tarjetas antes de animarlas
        const contentBoxes = track.querySelectorAll('.content-box');
        if (contentBoxes.length === 0) return;
        
        // Las tarjetas son visibles por defecto, y solo las animamos si el script funciona correctamente
        contentBoxes.forEach((box, index) => {
            // Aseguramos que las tarjetas son visibles primero
            box.style.opacity = '1';
            
            // Luego aplicamos la animación de entrada
            setTimeout(() => {
                box.style.transform = 'translateY(0)';
            }, 100 * index);
        });
        
        if (comparisonSection) {
            setTimeout(() => {
                comparisonSection.classList.add('visible');
            }, 500);
        }
    };
    
    // Hover effects para las tarjetas
    const setupCardHoverEffects = () => {
        if (!track) return;
        
        const contentBoxes = track.querySelectorAll('.content-box');
        if (contentBoxes.length === 0) return;
        
        contentBoxes.forEach(box => {
            box.addEventListener('mouseenter', function() {
                box.classList.add('hover-active');
                contentBoxes.forEach(otherBox => {
                    if (otherBox !== box) {
                        otherBox.style.opacity = '0.7';
                    }
                });
            });
            
            box.addEventListener('mouseleave', function() {
                box.classList.remove('hover-active');
                contentBoxes.forEach(otherBox => {
                    otherBox.style.opacity = '1';
                });
            });
        });
    };
    
    // Mejoras para el botón de búsqueda
    const enhanceSearchInput = () => {
        if (!searchInput || !searchIcon) return;
        
        searchInput.addEventListener('focus', function() {
            searchIcon.classList.add('searching');
        });
        
        searchInput.addEventListener('blur', function() {
            if (!this.value) {
                searchIcon.classList.remove('searching');
            }
        });
        
        const placeholders = [
            "Busca tu carrera ideal...",
            "Encuentra tu AVA perfecto...",
            "¿Qué quieres aprender hoy?",
            "Descubre AVAs especializados..."
        ];
        
        let currentPlaceholder = 0;
        
        const initialPlaceholder = searchInput.placeholder;
        if (initialPlaceholder) {
            placeholders.unshift(initialPlaceholder);
        }
        
        setInterval(() => {
            searchInput.placeholder = placeholders[currentPlaceholder];
            currentPlaceholder = (currentPlaceholder + 1) % placeholders.length;
        }, 3000);
    };
    
    const addSmoothScrolling = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };
    
    const enhanceControls = () => {
        if (billingButtons.length > 0) {
            billingButtons.forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    if (!this.classList.contains('active')) {
                        this.style.transform = 'scale(1.05)';
                    }
                });
                
                btn.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('active')) {
                        this.style.transform = '';
                    }
                });
            });
        }
        
        if (countrySelect) {
            countrySelect.addEventListener('change', function() {
                this.classList.add('selected');
                setTimeout(() => {
                    this.classList.remove('selected');
                }, 500);
            });
        }
    };
    
    const setupConfettiEffect = () => {
        const triggerConfetti = () => {
            const colors = ['#a4ac86', '#656d4a', '#f0efe7', '#8B4513'];
            const confettiCount = 150;
            const container = document.createElement('div');
            container.className = 'confetti-container';
            document.body.appendChild(container);
            
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                container.appendChild(confetti);
            }
            
            setTimeout(() => {
                container.remove();
            }, 8000);
        };
        
        document.addEventListener('click', function(e) {
            const comprarBtn = e.target.closest('.comprar-btn');
            if (comprarBtn) {
                triggerConfetti();
            }
        });
    };
    
    const addCounters = () => {
        if (!comparisonSection) return;
        
        const stats = [
            { number: 5000, text: 'Estudiantes activos', icon: 'bx-user' },
            { number: 50, text: 'Universidades', icon: 'bx-building-house' },
            { number: 300, text: 'AVAs disponibles', icon: 'bx-bot' },
            { number: 95, text: 'Satisfacción', icon: 'bx-like', suffix: '%' }
        ];
        
        const statsContainer = document.createElement('div');
        statsContainer.className = 'stats-container';
        
        stats.forEach(stat => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `
                <i class='bx ${stat.icon}'></i>
                <div class="stat-number" data-target="${stat.number}">0${stat.suffix || ''}</div>
                <div class="stat-text">${stat.text}</div>
            `;
            statsContainer.appendChild(statItem);
        });
        
        comparisonSection.parentNode.insertBefore(statsContainer, comparisonSection);
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = statsContainer.querySelectorAll('.stat-number');
                    counters.forEach(counter => {
                        const target = parseInt(counter.getAttribute('data-target'));
                        const suffix = counter.textContent.replace(/[0-9]/g, '');
                        let count = 0;
                        
                        const updateCounter = () => {
                            const increment = target / 100;
                            if (count < target) {
                                count += increment;
                                counter.textContent = Math.ceil(count) + suffix;
                                setTimeout(updateCounter, 20);
                            } else {
                                counter.textContent = target + suffix;
                            }
                        };
                        
                        updateCounter();
                    });
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(statsContainer);
    };
    
    const addTestimonials = () => {
        const testimonials = [
            {
                name: "Jose Ramiez",
                role: "Estudiante de Medicina",
                text: "Los AVAs de Acadelia revolucionaron mi forma de estudiar anatomía. Las explicaciones visuales son increíbles.",
                avatar: "/images/avatars/avatar1.webp"
            },
            {
                name: "Carlos Rodríguez",
                role: "Estudiante de Ingeniería",
                text: "El asistente matemático me ayudó a superar cálculo avanzado. Las explicaciones paso a paso son muy claras.",
                avatar: "/images/avatars/avatar2.webp"
            },
            {
                name: "María López",
                role: "Estudiante de Derecho",
                text: "La herramienta de PDF me permite analizar casos complejos en minutos. Increíblemente útil para mis estudios.",
                avatar: "/images/avatars/avatar3.webp"
            }
        ];

        initIvaNoticeSystem();


function initIvaNoticeSystem() {
    addIvaNoticeToCards();
    handleFloatingNotice();
}

function addIvaNoticeToCards() {
    const contentBoxes = document.querySelectorAll('.content-box');
    
    contentBoxes.forEach(box => {
        if (box.querySelector('.price-disclaimer')) return;
        
        const priceElement = box.querySelector('.price, h1.price');
        if (priceElement) {
            if (!priceElement.parentElement.classList.contains('price-container')) {
                const priceContainer = document.createElement('div');
                priceContainer.className = 'price-container';
                priceElement.parentNode.insertBefore(priceContainer, priceElement);
                priceContainer.appendChild(priceElement);
            }
            
            const disclaimer = document.createElement('div');
            disclaimer.className = 'price-disclaimer';
            disclaimer.innerHTML = '<i class="bx bx-info-circle" style="margin-right: 0.25rem;"></i>Sin IVA';
            
            priceElement.parentElement.appendChild(disclaimer);
        }
    });
}

function handleFloatingNotice() {
    const floatingNotice = document.getElementById('floatingIvaNotice');
    const mainNotice = document.getElementById('mainIvaNotice');
    
    if (!floatingNotice || !mainNotice) return;
    
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    function updateFloatingVisibility() {
        // Si estamos en vista detalle, siempre mostrar flotante
        if (isDetailView) {
            floatingNotice.classList.add('show');
            return;
        }
        
        if (isMobile()) {
            floatingNotice.classList.add('show');
            return;
        }
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (isDetailView) {
                    floatingNotice.classList.add('show');
                } else if (entry.isIntersecting) {
                    floatingNotice.classList.remove('show');
                } else {
                    floatingNotice.classList.add('show');
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(mainNotice);
    }
    
    updateFloatingVisibility();
    
    window.addEventListener('resize', updateFloatingVisibility);
    
    floatingNotice.addEventListener('click', () => {
        floatingNotice.classList.remove('show');
        setTimeout(() => {
            if (isDetailView || isMobile() || !mainNotice.getBoundingClientRect().top > 0) {
                floatingNotice.classList.add('show');
            }
        }, 5000);
    });
}
        
        const testimonialsContainer = document.createElement('div');
        testimonialsContainer.className = 'testimonials-container';
        testimonialsContainer.style.maxWidth = '100%';
        testimonialsContainer.style.overflowX = 'hidden';
        
        const header = document.createElement('h2');
        header.textContent = 'Lo que dicen nuestros usuarios';
        testimonialsContainer.appendChild(header);
        
        const slider = document.createElement('div');
        slider.className = 'testimonials-slider';
        slider.style.width = '300%';
        slider.style.transition = 'transform 0.5s ease';
        
        testimonials.forEach(t => {
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.style.width = '33.33%';
            card.style.padding = '0 1rem';
            card.style.boxSizing = 'border-box';
            
            const content = document.createElement('div');
            content.className = 'testimonial-content';
            
            const text = document.createElement('p');
            text.textContent = t.text;
            content.appendChild(text);
            
            const author = document.createElement('div');
            author.className = 'testimonial-author';
            
            const avatar = document.createElement('div');
            avatar.className = 'author-avatar';
            
            const img = document.createElement('img');
            img.src = t.avatar;
            img.alt = t.name;
            img.onerror = function() { this.src = '/images/default-avatar.png'; };
            
            avatar.appendChild(img);
            
            const info = document.createElement('div');
            info.className = 'author-info';
            
            const name = document.createElement('h4');
            name.textContent = t.name;
            
            const role = document.createElement('span');
            role.textContent = t.role;
            
            info.appendChild(name);
            info.appendChild(role);
            
            author.appendChild(avatar);
            author.appendChild(info);
            
            card.appendChild(content);
            card.appendChild(author);
            
            slider.appendChild(card);
        });
        
        testimonialsContainer.appendChild(slider);
        
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'testimonial-dots';
        
        testimonials.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'dot';
            if (i === 0) {
                dot.classList.add('active');
            }
            // Utilizar data-index en lugar de onclick
            dot.setAttribute('data-index', i);
            dotsContainer.appendChild(dot);
        });
        
        testimonialsContainer.appendChild(dotsContainer);
        
        const footer = document.querySelector('.main-footer');
        if (footer) {
            footer.parentNode.insertBefore(testimonialsContainer, footer);
            
            const slider = testimonialsContainer.querySelector('.testimonials-slider');
            const dots = testimonialsContainer.querySelectorAll('.dot');
            let currentSlide = 0;
            
            const goToSlide = (index) => {
                currentSlide = index;
                slider.style.transform = `translateX(-${index * 100 / testimonials.length}%)`;
                
                dots.forEach((dot, i) => {
                    if (i === index) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            };
            
            dotsContainer.addEventListener('click', (e) => {
                const dot = e.target.closest('.dot');
                if (dot) {
                    const index = parseInt(dot.getAttribute('data-index'), 10);
                    if (!isNaN(index)) {
                        goToSlide(index);
                    }
                }
            });
            
            // Auto-rotación
            setInterval(() => {
                currentSlide = (currentSlide + 1) % testimonials.length;
                goToSlide(currentSlide);
            }, 5000);
        }
    };

    
    function showSkeleton() {
        const itemsToShow = getItemsToShow();
        const skeletonHTML = Array(itemsToShow).fill().map(() => `
            <div class="content-box skeleton-box">
                <div class="box-content">
                    <div class="image-container skeleton">
                        <div class="skeleton-img"></div>
                    </div>
                    <div class="text-content">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-description"></div>
                        <div class="skeleton-buttons">
                            <div class="skeleton-btn vermas"></div>
                            <div class="skeleton-btn comprar"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        track.innerHTML = skeletonHTML;
        
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }

    function filterItems(searchTerm) {
        if (!track) return;
        
        setTimeout(() => {
            const contentBoxes = track.getElementsByClassName("content-box");
            searchTerm = searchTerm.toLowerCase();
            let anyVisible = false;
            
            if (searchTerm === "") {
                Array.from(contentBoxes).forEach(box => {
                    box.style.display = "flex";
                });
                anyVisible = true;
            } else {
                Array.from(contentBoxes).forEach(box => {
                    const title = box.querySelector("h2")?.textContent.toLowerCase() || "";
                    const description = box.querySelector("p")?.textContent.toLowerCase() || "";
                    const matches = title.includes(searchTerm) || description.includes(searchTerm);
                    
                    box.style.display = matches ? "flex" : "none";
                    if (matches) anyVisible = true;
                });
            }
            
            const noResultsMsg = track.querySelector('.no-results-message');
            if (!anyVisible && searchTerm) {
                if (!noResultsMsg) {
                    const msg = document.createElement('p');
                    msg.className = 'no-results-message';
                    msg.textContent = 'No se encontraron resultados para tu búsqueda';
                    track.appendChild(msg);
                }
            } else if (noResultsMsg) {
                noResultsMsg.remove();
            }
            
            currentIndex = 0;
            updateCarousel(false);
            
            setupCardHoverEffects();
        }, 300);
    }

    async function showSuggestions(searchTerm) {
        suggestionsBox.innerHTML = "";
        if (!searchTerm) {
            suggestionsBox.style.display = "none";
            return;
        }

        const carreras = await getAllCarreras();
        const filtered = carreras.filter(carrera => 
            carrera.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (carrera.descripcion && carrera.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        filtered.forEach(carrera => {
            const div = document.createElement("div");
            div.classList.add("suggestion-item");
            
            div.innerHTML = `
                <span>${carrera.nombre}</span>
                <span class="suggestion-type">Carrera</span>
            `;

            div.addEventListener("click", function() {
                searchInput.value = carrera.nombre;
                filterItems(carrera.nombre);
                suggestionsBox.style.display = "none";
            });
            
            suggestionsBox.appendChild(div);
        });

        suggestionsBox.style.display = filtered.length > 0 ? "block" : "none";
    }

    async function getAllCarreras() {
        try {
            if (carrerasCache) {
                return carrerasCache;
            }

            isLoading = true;
            showSkeleton();

            const userResponse = await fetch('/api/usuarios/authenticate');
            if (!userResponse.ok) throw new Error('Error de autenticación');
            const userData = await userResponse.json();

            const response = await fetch(`/api/compra/carrera/available/${userData.id_user}`);
            if (!response.ok) throw new Error('Error al obtener las carreras');
            const carreras = await response.json();

            carrerasCache = carreras;
            isLoading = false;
            return carreras;
        } catch (error) {
            console.error('Error al obtener carreras:', error);
            isLoading = false;
            return [];
        }
    }
    
    
    function storeInitialContent() {
        initialContent = track.innerHTML;
        originalContent = track.innerHTML;
    }

    // 5. Asegúrate de tener la función para configurar los botones de compra
function asignarEventoComprar() {
    // Usamos delegación de eventos para los botones de compra
    // (Esta función puede estar ya definida en tu código o importarse desde utils.js)
    // Aquí solo una implementación de respaldo por si no existe
    if (typeof window.setupComprarBtnListeners === 'function') {
        window.setupComprarBtnListeners();
    } else {
        document.addEventListener('click', function(e) {
            const comprarBtn = e.target.closest('.comprar-btn');
            if (comprarBtn) {
                e.preventDefault();
                const producto = comprarBtn.getAttribute('data-producto');
                const dataId = comprarBtn.getAttribute('data-id');
                
                if (window.AcadeliaPagos && typeof window.AcadeliaPagos.procesarCompra === 'function') {
                    window.AcadeliaPagos.procesarCompra(producto, dataId);
                } else if (typeof window.handleCompra === 'function') {
                    window.handleCompra(producto, dataId);
                } else {
                    console.error('Sistema de pagos no disponible');
                }
            }
        });
    }
}
    
    function asignarEventoVerMas() {
        const botones = document.querySelectorAll('.vermas-btn');
        botones.forEach(boton => {
            boton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const idCarrera = this.getAttribute('data-id');
                if (!idCarrera) return;
                
                try {
                    isDetailView = true;

                    document.getElementById('mainIvaNotice').classList.add('hidden');
                    regresarBtn.style.display = 'flex';
                    
                    showSkeleton();
                    
                    // CORRECCIÓN: Obtener los AVAs desde la API
                    const avas = await fetchAVAsFromAPI(idCarrera);
                    
                    let html = "";
                    // CORRECCIÓN: Generar HTML para cada AVA
                    avas.forEach(ava => {
                        html += generarTarjeta({
                            imagen: ava.imagen || "./images/default_ava.jpg",
                            alt: ava.nom_ava,
                            titulo: ava.nom_ava,
                            descripcion: ava.descripcion || "",
                            dataId: ava.id_ava,
                            producto: ava.nom_ava,
                            esVerMas: false,
                            mostrarComprar: false
                        });
                    });
                    
                    track.innerHTML = html;
                    
                    // Reiniciar el carrusel
                    currentIndex = 0;
                    
                    // Actualizamos de forma segura
                    requestAnimationFrame(() => {
                        track.style.transition = 'none';
                        track.style.transform = 'none';
                        updateCarousel(false);
                        
                        // Volvemos a aplicar los hover effects a las nuevas tarjetas
                        setupCardHoverEffects();
                    });
                    
                } catch (error) {
                    console.error('Error al cargar los AVAs:', error);
                    track.innerHTML = `
                        <div class="content-box">
                            <div class="box-content">
                                <p>Error al cargar los AVAs. Por favor, intente más tarde.</p>
                            </div>
                        </div>
                    `;
                }
            });
        });
    }
    
    updateIvaNoticeVisibility();


function updateIvaNoticeVisibility() {
    const mainNotice = document.getElementById('mainIvaNotice');
    const floatingNotice = document.getElementById('floatingIvaNotice');
    
    if (!mainNotice || !floatingNotice) return;
    
    if (isDetailView) {
        // En vista detalle: ocultar principal completamente y mostrar flotante
        mainNotice.classList.add('hidden-detail');
        floatingNotice.classList.add('show');
    } else {
        // En vista normal: mostrar principal y manejar flotante según scroll
        mainNotice.classList.remove('hidden-detail');
        
        // Reiniciar el comportamiento del flotante según responsive
        if (window.innerWidth <= 768) {
            floatingNotice.classList.add('show');
        } else {
            // En desktop, verificar si el aviso principal está visible
            const rect = mainNotice.getBoundingClientRect();
            if (rect.top < 0) {
                floatingNotice.classList.add('show');
            } else {
                floatingNotice.classList.remove('show');
            }
        }
    }
}
    function configurarEventos() {
        // Eventos para funciones de drag
        if (track) {
            track.addEventListener('mousedown', startDrag);
            track.addEventListener('touchstart', startDrag);
            track.addEventListener('mousemove', onDrag);
            track.addEventListener('touchmove', onDrag);
        }
        
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        
        // Evento para el botón regresar
        if (regresarBtn) {
            regresarBtn.addEventListener('click', handleRegresarClick);
        }
        
        // Evitar scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
    }
    
    function handleRegresarClick() {
        if (!originalContent) return;
        
        document.getElementById('mainIvaNotice').classList.remove('hidden');
        isDetailView = false;
        
        track.innerHTML = originalContent;
        
        // Reconfigurar todo
        currentIndex = 0;
        asignarEventoVerMas();
        
        // CORRECCIÓN: También configurar los botones de compra
        asignarEventoComprar();
        
        // Asegurarse de que el navegador repinte antes de actualizar el carrusel
        setTimeout(() => {
            track.style.transition = 'none';
            track.style.transform = 'none';
            updateCarousel(false);
            
            setupCardHoverEffects();
            
            // CORRECCIÓN: Actualizar los precios después de restaurar el contenido
            if (window.AcadeliaPagos && window.AcadeliaPagos.actualizarPrecios) {
                window.AcadeliaPagos.actualizarPrecios();
            }
        }, 50);
        
        regresarBtn.style.display = 'none';
    }

    // 3. Añade la función fetchAVAsFromAPI si no existe
async function fetchAVAsFromAPI(carreraId) {
    const response = await fetch(`/api/avas/carrera/${carreraId}`);
    if (!response.ok) throw new Error('Error al obtener los AVAs');
    return await response.json();
}

// 4. Añade la función generarTarjeta si no existe
function generarTarjeta({ imagen, alt, titulo, descripcion = "", dataId = "", producto, btnTexto = "Ver más", esVerMas = true, mostrarComprar = true }) {
    const descripcionCorta = descripcion.length > 120 ? descripcion.substring(0, 120) + "..." : descripcion;
    
    return `
      <div class="content-box" data-product="${producto}">
            <div class="box-content">
                <!-- Card Header -->
                <div class="card-header">
                    <div class="image-container">
                        <img src="${imagen}" alt="${alt}" loading="lazy">
                    </div>
                </div>
                
                <!-- Card Body -->
                <div class="card-body">
                    <h2>${titulo}</h2>
                    <h1 class="price"></h1>
                    <p>${descripcionCorta}</p>
                </div>
                
                <!-- Card Footer -->
                <div class="card-footer">
                    ${esVerMas 
                        ? `<button class="vermas-btn" data-alt="${titulo}" data-id="${dataId}">
                            ${btnTexto} <i class='bx bx-chevron-right'></i>
                           </button>`
                        : ""}
                    ${mostrarComprar 
                        ? `<button class="comprar-btn" data-alt="${titulo}" data-producto="${producto}" data-id="${dataId}">
                            Comprar <i class='bx bx-store'></i>
                           </button>`
                        : ""}
                </div>
            </div>
        </div>
    `;
}


    function startDrag(e) {
        if (isDetailView) return; // No permitir arrastrar en vista detalle
        
        isDragging = true;
        startX = e.pageX || e.touches?.[0]?.pageX;
        track.style.cursor = 'grabbing';
        track.style.userSelect = 'none';
    }

    function stopDrag() {
        isDragging = false;
        if (track) {
            track.style.cursor = '';
            track.style.userSelect = '';
        }
    }

    function onDrag(e) {
        if (!isDragging || isDetailView) return;
        e.preventDefault();
        
        const x = (e.pageX || e.touches?.[0]?.pageX) - startX;
        if (Math.abs(x) > 50) {
            moveSlide(x > 0 ? -1 : 1);
            stopDrag();
        }
    }

    
    // Inyectar estilos del skeleton
    const injectSkeletonStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .skeleton-box {
                background: var(--bg-color, #f0efe7);
                min-height: 400px;
                border-radius: 15px;
                padding: 2rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                transition: all 0.8s ease;
                animation: none !important;
            }

            .skeleton-box .box-content {
                display: flex;
                flex-direction: column;
                gap: 0rem;
                height: 100%;
                width: 100%;
                align-items: center;
            }

            .skeleton-box .image-container {
                flex: 0 0 220px;
                width: 100%;
                height: 200px;
                border-radius: 12px;
                overflow: hidden;
                background: none;
            }

            .skeleton-img {
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
                border-radius: 12px;
            }

            .skeleton-title {
                width: 80%;
                height: 28px;
                margin: 1rem auto;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
                border-radius: 6px;
            }

            .skeleton-description {
                width: 90%;
                height: 60px;
                margin: 1rem auto;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
                border-radius: 6px;
            }

            .skeleton-buttons {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                align-items: center;
                margin-top: 1rem;
                width: 100%;
            }

            .skeleton-btn {
                width: 150px;
                height: 40px;
                border-radius: 25px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
            }

            @keyframes shimmer {
                0% {
                    background-position: -1000px 0;
                }
                100% {
                    background-position: 1000px 0;
                }
            }

            [data-theme="dark"] .skeleton-box {
                background: var(--bg-color, #1A1A1A);
            }

            [data-theme="dark"] .skeleton-img,
            [data-theme="dark"] .skeleton-title,
            [data-theme="dark"] .skeleton-description,
            [data-theme="dark"] .skeleton-btn {
                background: linear-gradient(90deg, #2d2d2d 25%, #353535 50%, #2d2d2d 75%);
                background-size: 1000px 100%;
            }

            .no-results-message {
                width: 100%;
                text-align: center;
                padding: 20px;
                color: var(--text-color);
                font-style: italic;
                grid-column: 1 / -1;
            }
            
            /* Mejorar animación del hover */
            .content-box.hover-active {
                transform: translateY(-12px) !important;
                z-index: 10;
                box-shadow: var(--card-hover-shadow) !important;
            }
            
            /* Prevenir scroll horizontal */
            html, body {
                max-width: 100%;
                overflow-x: hidden;
            }
            
            /* Fix testimonials slider */
            .testimonials-container {
                max-width: 100%;
                overflow: hidden;
            }
            
            .testimonials-slider {
                width: 300%;
                transition: transform 0.5s ease;
            }
            
            .testimonial-card {
                width: 33.33%;
                box-sizing: border-box;
            }
        `;
        document.head.appendChild(style);
    };

    const searchStyles = document.createElement('style');
    searchStyles.textContent = `
        /* Ocultar botones de navegación por defecto para evitar flasheo */
        .carousel-button.prev, 
        .carousel-button.next {
            display: none;
        }
        
        .search-container {
            position: relative;
            margin-bottom: 20px;
        }
        
        .suggestions-box {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--bg-color);
            border: 1px solid var(--secondary-color);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        }

        .suggestion-item {
            padding: 10px 15px;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .suggestion-item:hover {
            background-color: var(--hover-color);
        }

        .suggestion-type {
            font-size: 0.8em;
            color: var(--text-color);
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--secondary-color);
            color: white;
        }
        
        .carousel-track {
            transition: transform 0.8s ease-in-out;
        }
        
        /* Asegurar que los slidecards se ajusten dentro de su contenedor */
        .testimonial-card {
            padding: 0 1rem;
            box-sizing: border-box;
        }
        
        /* Corrección adicional para el carrusel */
        .carousel-container {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
        }
    `;
    document.head.appendChild(searchStyles);
    
    async function inicializar() {
        try {
            if (!track) {
                console.error("Elemento del track no encontrado");
                return;
            }
            
            await getAllCarreras();
            
            if (prevBtn) prevBtn.addEventListener('click', () => moveSlide(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => moveSlide(1));
            
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener("input", function() {
                    const searchTerm = this.value;
                    
                    clearTimeout(searchTimeout);
                    
                    searchTimeout = setTimeout(async () => {
                        await showSuggestions(searchTerm);
                        filterItems(searchTerm);
                    }, 300);
                });
                
                document.addEventListener("click", function(e) {
                    if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
                        suggestionsBox.style.display = "none";
                    }
                });
                
                searchInput.addEventListener("keydown", function(e) {
                    if (e.key === "Escape") {
                        this.value = "";
                        suggestionsBox.style.display = "none";
                        filterItems("");
                    }
                });
            }

            configurarEventos();
            
            window.addEventListener('resize', () => {
                itemsToShow = getItemsToShow();
                updateCarousel(false);
            });
            
            // Observer para actualizar el carrusel cuando cambia el contenido
            const observer = new MutationObserver((mutations) => {
                if (track.children.length > 0 && !isLoading) {
                    asignarEventoVerMas();
                    updateCarousel(false);
                    
                    if (!originalContent) {
                        storeInitialContent();
                    }
                }
            });
            
            observer.observe(track, { childList: true });
            
            setTimeout(() => {
                // Primero aseguramos que las tarjetas son visibles
                addEntranceEffects();
                
                // Luego configuramos los hover effects
                setupCardHoverEffects();
                
                // Y finalmente las mejoras de interacción
                enhanceSearchInput();
                addSmoothScrolling();
                enhanceControls();
                setupConfettiEffect();
                
                // Verificamos que la sección de comparación existe antes de añadir los counters y testimonios
                if (comparisonSection) {
                    comparisonSection.style.opacity = '1';
                    comparisonSection.style.transform = 'translateY(0)';
                    addCounters();
                    addTestimonials();
                }
            }, 500);

        } catch (error) {
            console.error("Error inicialización:", error);
            if (track) {
                track.innerHTML = `
                    <div class="content-box">
                        <div class="box-content">
                            <p class="error-message">Error al inicializar: ${error.message}</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    function ocultarBotonesNavegacion() {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }

    injectSkeletonStyles();
    ocultarBotonesNavegacion();
    showSkeleton();
    inicializar();
});

document.addEventListener('DOMContentLoaded', function() {
    initCustomSelect();
});

function initCustomSelect() {
    const customSelect = document.querySelector('.custom-select');
    if (!customSelect) return;
    
    const selectSelected = customSelect.querySelector('.select-selected');
    const selectItems = customSelect.querySelector('.select-items');
    const hiddenSelect = document.getElementById('countrySelect');
    
    function closeAllSelect(elmnt) {
        const selectItems = document.getElementsByClassName('select-items');
        const selectSelected = document.getElementsByClassName('select-selected');
        let arrNo = [];
        
        for (let i = 0; i < selectSelected.length; i++) {
            if (elmnt == selectSelected[i]) {
                arrNo.push(i);
            } else {
                selectSelected[i].classList.remove('select-arrow-active');
            }
        }
        
        for (let i = 0; i < selectItems.length; i++) {
            if (arrNo.indexOf(i) != -1) {
                selectItems[i].classList.remove('select-hide');
            } else {
                selectItems[i].classList.add('select-hide');
            }
        }
    }
    
    // Toggle del dropdown al hacer clic en el select
    selectSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        this.classList.toggle('select-arrow-active');
        selectItems.classList.toggle('select-hide');
    });
    
    const selectItemElements = customSelect.querySelectorAll('.select-item');
    selectItemElements.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const value = this.getAttribute('data-value');
            const html = this.innerHTML;
            
            selectSelected.innerHTML = html;
            selectSelected.setAttribute('data-value', value);
            
            for (let i = 0; i < selectItemElements.length; i++) {
                selectItemElements[i].classList.remove('same-as-selected');
            }
            this.classList.add('same-as-selected');
            
            if (hiddenSelect) {
                for (let i = 0; i < hiddenSelect.options.length; i++) {
                    if (hiddenSelect.options[i].value === value) {
                        hiddenSelect.selectedIndex = i;
                        const event = new Event('change', { bubbles: true });
                        hiddenSelect.dispatchEvent(event);
                        break;
                    }
                }
            }
            
            selectItems.classList.add('select-hide');
            selectSelected.classList.remove('select-arrow-active');
        });
    });
    
    document.addEventListener('click', function() {
        closeAllSelect();
    });
}
// Add Back to Top button functionality to misavas.js
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Add back to top button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.id = 'backToTopBtn';
    backToTopBtn.className = 'back-to-top-btn';
    backToTopBtn.innerHTML = '<i class="bx bx-chevron-up"></i>';
    
    // Create wrapper for the button
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'back-to-top-wrapper';
    btnWrapper.appendChild(backToTopBtn);
    
    // Add to the DOM
    document.body.appendChild(btnWrapper);
    
    // Add the styles for back to top button
    const backToTopStyles = document.createElement('style');
    backToTopStyles.textContent = `
        .back-to-top-wrapper {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease-in-out;
        }
        
        .back-to-top-wrapper.visible {
            opacity: 1;
            visibility: visible;
        }
        
        .back-to-top-btn {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, var(--secondary-color), var(--third-color));
            color: #fff;
            border: none;
            border-radius: 50%;
            display: flex;

            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            position: relative;
            overflow: hidden;
            transition: background-color 0.3s ease;
        }
        
        .back-to-top-btn:hover {
            background-color: var(--primary-color-dark, #5a71a8);
        }
        
        .back-to-top-btn i {
            font-size: 1.8rem;
        }
        
        /* Ripple effect styles */
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
        
        @media (max-width: 768px) {
            .back-to-top-wrapper {
                bottom: 20px;
                right: 20px;
            }
            
            .back-to-top-btn {
                width: 45px;
                height: 45px;
            }
        }
    `;
    document.head.appendChild(backToTopStyles);
    
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
    
    // Initialize back to top button functionality
    function initBackToTop() {
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
        
        // Toggle button visibility on scroll
        window.addEventListener('scroll', () => {
            toggleBackToTop();
        });
        
        // Initial check
        toggleBackToTop();
    }
    
    // Function to toggle back-to-top button visibility
    function toggleBackToTop() {
        const scrollY = window.scrollY || window.pageYOffset;
        const showOffset = 300; // Show after scrolling down 300px
        
        if (scrollY > showOffset) {
            backToTopBtn?.parentElement.classList.add('visible');
        } else {
            backToTopBtn?.parentElement.classList.remove('visible');
        }
    }
    
    // Initialize the back to top button
    initBackToTop();
    
    // ... rest of your existing code ...
});