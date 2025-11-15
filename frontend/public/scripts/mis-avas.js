// Agregamos estilos necesarios al inicio del documento
const style = document.createElement('style');
style.textContent = `
    #avaGrid {
        transition: opacity 150ms ease-out;
    }

    /* Ocultar botones de navegación por defecto para evitar flasheo */
    .carousel-button.prev, 
    .carousel-button.next {
        display: none;
    }
    
    .suggestions-box {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-color);
        border: 1px solid var(--border-color);
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
        color: var(--text-muted);
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--bg-secondary);
    }
    
    /* Estilo para mensajes de error o no resultados */
    .error-message, .no-results-message {
        width: 100%;
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
        font-style: italic;
    }
`;
document.head.appendChild(style);

const fixedHeightStyle = document.createElement('style');
fixedHeightStyle.textContent = `
    /* Establecer altura fija para el contenedor de controles para evitar saltos */
    .controls-container {
        width: 100%;
        max-width: 1100px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }


    .regresar-btn.visible {
        opacity: 1;
        display: flex;
        pointer-events: auto; /* Permitir interacción cuando visible */
    }


`;
document.head.appendChild(fixedHeightStyle);

// Añadimos los estilos para los efectos hover
const hoverStyles = document.createElement('style');
hoverStyles.textContent = `
    /* Mejorar animación del hover */
    .ava-card.hover-active {
        transform: translateY(-12px) !important;
        z-index: 10;
        box-shadow: var(--card-hover-shadow, 0 10px 25px rgba(0, 0, 0, 0.2)) !important;
        transition: transform 0.3s ease, box-shadow 0.3s ease !important;
    }
    
    .ava-card {
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
`;
document.head.appendChild(hoverStyles);

document.addEventListener('DOMContentLoaded', async function() {
    // Elementos DOM
    const avaGrid = document.getElementById('avaGrid');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const regresarBtn = document.getElementById('regresarBtn');
    const searchInput = document.getElementById('searchInput');
    const suggestionsBox = document.createElement('div');
    suggestionsBox.className = 'suggestions-box';
    searchInput?.parentNode.appendChild(suggestionsBox);
    
    // Variables del sistema
    let currentIndex = 0;
    let itemsToShow = getItemsToShow();
    let maxIndex = 0;
    let isDragging = false;
    let startX;
    let userId = null;
    let carrerasCache = null;
    let avasCache = null;
    let herramientasCache = null; // Cache para herramientas
    let originalContent = null;
    let currentView = 'carreras'; // 'carreras' | 'avas' | 'herramientas'
    let isDetailView = false;
    let isLoading = true;


    function updateCarousel(smooth = true) {
        if (!avaGrid?.children.length) return;
        
        const visibleCards = Array.from(avaGrid.children).filter(card => 
            card.style.display !== 'none' && card.classList.contains('ava-card')
        );
        
        if (visibleCards.length <= itemsToShow) {
            avaGrid.style.transition = 'none';
            avaGrid.style.transform = 'none';
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            return;
        }
        
        // Asegurarse de que el componente exista antes de modificarlo
        if (!avaGrid.parentNode) return;
        
        const cardWidth = visibleCards[0].offsetWidth + 24;
        maxIndex = Math.max(0, visibleCards.length - itemsToShow);
        currentIndex = Math.min(currentIndex, maxIndex);
        
        avaGrid.style.transition = smooth ? 'transform 0.3s ease-out' : 'none';
        avaGrid.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        updateNavigation();
    }

    function moveSlide(direction) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex <= maxIndex) {
            currentIndex = newIndex;
            updateCarousel(true);
        }
    }

    function updateNavigation() {
        if (!avaGrid || !prevBtn || !nextBtn) return;
        
        const visibleCards = Array.from(avaGrid.children).filter(card => 
            card.style.display !== 'none' && card.classList.contains('ava-card')
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

    function ocultarBotonesNavegacion() {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }

    async function obtenerUsuarioId() {
        try {
            const response = await fetch('/api/usuarios/authenticate');
            if (!response.ok) throw new Error('Error de autenticación');
            return (await response.json()).id_user;
        } catch (error) {
            console.error("Autenticación fallida:", error);
            return null;
        }
    }

    async function obtenerCarrerasActivas() {
        try {
            const response = await fetch(`/api/compra/carrera/active/${userId}`);
            if (!response.ok) throw new Error('Error obteniendo carreras');
            return await response.json();
        } catch (error) {
            console.error("Error carreras:", error);
            return [];
        }
    }

    async function obtenerAVAs() {
        try {
            if (avasCache) return avasCache;

            const response = await fetch(`/api/compra/users/avas/${userId}`);
            if (!response.ok) throw new Error('Error obteniendo AVAs');
            const avas = await response.json();
            avasCache = avas;
            return avas;
        } catch (error) {
            console.error("Error AVAs:", error);
            return [];
        }
    }
    
    async function obtenerHerramientas() {
        try {
            if (herramientasCache) return herramientasCache;
            
            const response = await fetch('/api/herramientas');
            if (!response.ok) throw new Error('Error obteniendo herramientas');
            const herramientas = await response.json();
            herramientasCache = herramientas;
            return herramientas;
        } catch (error) {
            console.error("Error herramientas:", error);
            return [];
        }
    }

    function generarCarreraCard(carrera) {
        return `
            <div class="ava-card" data-type="carrera" data-id="${carrera.id_carrera}">
                <!-- Card Header -->
                <div class="card-header">
                    <div class="ava-image-container">
                        <img src="${carrera.imagen || './images/default_carrera.webp'}" alt="${carrera.nombre}" loading="lazy">
                    </div>
                </div>
                
                <!-- Card Body -->
                <div class="card-body">
                    <h3>${carrera.nombre}</h3>
                    <p>${carrera.descripcion || 'Descripción no disponible'}</p>
                </div>
                
                <!-- Card Footer -->
                <div class="card-footer">
                    <button class="action-btn ver-mas-btn">
                        Ver Avas <i class='bx bx-chevron-right'></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    function generarAvaCard(ava) {
        return `
            <div class="ava-card" data-type="ava" data-id="${ava.id_ava}">
                <!-- Card Header -->
                <div class="card-header">
                    <div class="ava-image-container">
                        <img src="${ava.imagen || './images/default_ava.webp'}" alt="${ava.nom_ava}" loading="lazy">
                    </div>
                </div>
                
                <!-- Card Body -->
                <div class="card-body">
                    <h3>${ava.nom_ava}</h3>
                    <p>${ava.descripcion || 'Descripción no disponible'}</p>
                </div>
                
                <!-- Card Footer -->
                <div class="card-footer">
                    <a href="${ava.slug ? `/${ava.slug.toLowerCase()}` : '#'}" class="action-btn chat-btn">
                        Chat <i class='bx bx-chat'></i>
                    </a>
                </div>
            </div>
        `;
    }
    
    function generarHerramientasCard() {
        return `
            <div class="ava-card" data-type="herramientas-box">
                <!-- Card Header -->
                <div class="card-header">
                    <div class="ava-image-container">
                        <img src="./images/default_tool.webp" alt="Herramientas" loading="lazy">
                    </div>
                </div>
                
                <!-- Card Body -->
                <div class="card-body">
                    <h3>Herramientas</h3>
                    <p>Accede a todas las herramientas disponibles para mejorar tu aprendizaje</p>
                </div>
                
                <!-- Card Footer -->
                <div class="card-footer">
                    <button class="action-btn ver-herramientas-btn">
                        Ver Herramientas <i class='bx bx-chevron-right'></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    function generarHerramientaCard(herramienta) {
        return `
            <div class="ava-card" data-type="herramienta" data-id="${herramienta.id}">
                <!-- Card Header -->
                <div class="card-header">
                    <div class="ava-image-container">
                        <img src="${herramienta.imagen || './images/default_tool.webp'}" alt="${herramienta.nombre}" loading="lazy">
                    </div>
                </div>
                
                <!-- Card Body -->
                <div class="card-body">
                    <h3>${herramienta.nombre}</h3>
                    <p>${herramienta.descripcion || 'Descripción no disponible'}</p>
                </div>
                
                <!-- Card Footer -->
                <div class="card-footer">
                    <a href="${herramienta.slug ? `/${herramienta.slug.toLowerCase()}` : '#'}" class="action-btn chat-btn">
                        Chat <i class='bx bx-chat'></i>
                    </a>
                </div>
            </div>
        `;
    }

    function getItemsToShow() {
        const width = window.innerWidth;
        if (width <= 576) return 1;
        if (width <= 768) return 2;
        if (width <= 1200) return 3;
        if (width <= 1500) return 4;


        return 5;
    }

    function showSkeleton() {
        const itemsToShow = getItemsToShow();
        const skeletonHTML = Array(itemsToShow).fill().map(() => `
            <div class="ava-card skeleton-card" data-type="skeleton">
                <div class="ava-image-container skeleton">
                    <div class="skeleton-img"></div>
                </div>
                <div class="ava-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-description"></div>
                    <div class="skeleton-buttons">
                        <div class="skeleton-btn action-btn"></div>
                    </div>
                </div>
            </div>
        `).join('');

        avaGrid.innerHTML = skeletonHTML;
        
        ocultarBotonesNavegacion();
    }

    // Inyectar estilos del skeleton
    const injectSkeletonStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .skeleton-card {
                animation: none !important;
                background: var(--bg-color);
            }

            .skeleton {
                background: none;
            }

            .skeleton-img {
                width: 100%;
                height: 200px;
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

            [data-theme="dark"] .skeleton-card {
                background: var(--bg-color, #1A1A1A);
            }

            [data-theme="dark"] .skeleton-img,
            [data-theme="dark"] .skeleton-title,
            [data-theme="dark"] .skeleton-description,
            [data-theme="dark"] .skeleton-btn {
                background: linear-gradient(90deg, #2d2d2d 25%, #353535 50%, #2d2d2d 75%);
                background-size: 1000px 100%;
            }

            /* Responsive styles */
            @media screen and (max-width: 1024px) {
                .skeleton-card {
                    flex: 0 0 calc(33.333% - 16px);
                }
            }

            @media screen and (max-width: 768px) {
                .skeleton-card {
                    flex: 0 0 calc(50% - 12px);
                }
            }

            @media screen and (max-width: 480px) {
                .skeleton-card {
                    flex: 0 0 100%;
                }
            }
        `;
        document.head.appendChild(style);
    };

    // Hover effects para las tarjetas - NUEVA FUNCIÓN AÑADIDA
    const setupCardHoverEffects = () => {
        if (!avaGrid) return;
        
        const avaCards = avaGrid.querySelectorAll('.ava-card');
        if (avaCards.length === 0) return;
        
        avaCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                card.classList.add('hover-active');
                avaCards.forEach(otherCard => {
                    if (otherCard !== card) {
                        otherCard.style.opacity = '0.7';
                    }
                });
            });
            
            card.addEventListener('mouseleave', function() {
                card.classList.remove('hover-active');
                avaCards.forEach(otherCard => {
                    otherCard.style.opacity = '1';
                });
            });
        });
    };

    async function showSuggestions(searchTerm) {
        suggestionsBox.innerHTML = "";
        if (!searchTerm) {
            suggestionsBox.style.display = "none";
            return;
        }
    
        const [carreras, avas, herramientas] = await Promise.all([
            carrerasCache || obtenerCarrerasActivas(),
            obtenerAVAs(),
            obtenerHerramientas()
        ]);
        
        const searchTermLower = searchTerm.toLowerCase();
        
        const filteredCarreras = carreras.filter(carrera => 
            carrera.nombre.toLowerCase().includes(searchTermLower)
        );
        
        const filteredAVAs = avas.filter(ava => 
            ava.nom_ava.toLowerCase().includes(searchTermLower)
        );
        
        const filteredHerramientas = herramientas.filter(herramienta => 
            herramienta.nombre?.toLowerCase().includes(searchTermLower)
        );
    
        const filteredItems = [...filteredCarreras, ...filteredAVAs, ...filteredHerramientas];
    
        filteredItems.forEach(item => {
            const div = document.createElement("div");
            div.classList.add("suggestion-item");
            const isAVA = 'nom_ava' in item;
            const isHerramienta = 'id' in item && !('id_carrera' in item) && !('id_ava' in item);
            
            div.innerHTML = `
                <span>${isAVA ? item.nom_ava : (isHerramienta ? item.nombre : item.nombre)}</span>
                <span class="suggestion-type">${isAVA ? 'AVA' : (isHerramienta ? 'Herramienta' : 'Carrera')}</span>
            `;
    
            div.addEventListener("click", async function() {
                if (isAVA) {
                    const carreraPadre = carreras.find(c => c.id_carrera === item.id_carrera);
                    if (carreraPadre) {
                        await mostrarAVAs(carreraPadre.id_carrera);
                        filterItems(item.nom_ava);
                    }
                } else if (isHerramienta) {
                    await mostrarHerramientas();
                    filterItems(item.nombre);
                } else {
                    await mostrarCarreras();
                    filterItems(item.nombre);
                }
                
                searchInput.value = isAVA ? item.nom_ava : (isHerramienta ? item.nombre : item.nombre);
                suggestionsBox.style.display = "none";
            });
            
            suggestionsBox.appendChild(div);
        });
    
        suggestionsBox.style.display = filteredItems.length > 0 ? "block" : "none";
    }
    
    function filterItems(searchTerm) {
        if (!avaGrid) return;
    
        const cards = avaGrid.querySelectorAll('.ava-card');
        searchTerm = searchTerm.toLowerCase();
        let anyVisible = false;
    
        cards.forEach(card => {
            const title = card.querySelector('h3')?.textContent?.toLowerCase() || '';
            const description = card.querySelector('p')?.textContent?.toLowerCase() || '';
            
            const matchesTitle = title.includes(searchTerm);
            const matchesDescription = description.includes(searchTerm);
            const matches = matchesTitle || matchesDescription || !searchTerm;
            
            card.style.display = matches ? 'flex' : 'none';
            
            if (matches) {
                anyVisible = true;
            }
        });
        
        const noResultsMsg = avaGrid.querySelector('.no-results-message');
        if (!anyVisible && searchTerm) {
            if (!noResultsMsg) {
                const msg = document.createElement('p');
                msg.className = 'no-results-message';
                msg.textContent = 'No se encontraron resultados para tu búsqueda';
                avaGrid.appendChild(msg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    
        currentIndex = 0;
        updateCarousel(false);
        setupCardHoverEffects(); // Aplicar hover effects después de filtrar
    }

    async function mostrarCarreras() {
        try {
            isDetailView = false;
            currentView = 'carreras';
            
            showSkeleton();
            
            const carreras = carrerasCache || await obtenerCarrerasActivas();
            
            const carrerasHTML = carreras.map(generarCarreraCard).join('');
            
            const herramientasHTML = generarHerramientasCard();
            
            const contenidoCompleto = herramientasHTML + carrerasHTML;
            
            if (!originalContent) {
                originalContent = contenidoCompleto;
            }
            
            avaGrid.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 150));
            
            avaGrid.innerHTML = contenidoCompleto;
            
            // Reiniciar el carrusel
            currentIndex = 0;
            configurarEventos();
            
            requestAnimationFrame(() => {
                avaGrid.style.opacity = '1';
                avaGrid.style.transition = 'none';
                avaGrid.style.transform = 'none';
                updateCarousel(false);
                setupCardHoverEffects(); // Aplicar hover effects
            });
            
            if (regresarBtn) regresarBtn.classList.remove('visible');
            
            isLoading = false;
            
        } catch (error) {
            console.error("Error mostrando carreras:", error);
            avaGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
            isLoading = false;
        }
    }

    async function obtenerAVAsPorCarrera(carreraId) {
        try {
            if (avasCache) {
                return avasCache.filter(ava => ava.id_carrera == carreraId);
            }

            const response = await fetch(`/api/compra/users/avas/${userId}`);
            if (!response.ok) throw new Error('Error obteniendo AVAs');
            const avas = await response.json();
            avasCache = avas;
            return avas.filter(ava => ava.id_carrera == carreraId);
        } catch (error) {
            console.error("Error AVAs:", error);
            return [];
        }
    }

    async function mostrarAVAs(carreraId) {
        try {
            isDetailView = true;
            currentView = 'avas';
            
            showSkeleton();
            
            const avas = await obtenerAVAsPorCarrera(carreraId);
            
            const nuevoContenido = avas.map(generarAvaCard).join('');
            
            avaGrid.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 150));
            
            avaGrid.innerHTML = nuevoContenido;
            
            mostrarBotonRegreso();
            
            // Reiniciar el carrusel
            currentIndex = 0;
            configurarEventos();
            
            requestAnimationFrame(() => {
                avaGrid.style.opacity = '1';
                avaGrid.style.transition = 'none';
                avaGrid.style.transform = 'none';
                updateCarousel(false);
                setupCardHoverEffects(); // Aplicar hover effects
            });
            
        } catch (error) {
            console.error("Error mostrando AVAs:", error);
            avaGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
            mostrarBotonRegreso();
        }
    }
    
    // Nueva función para mostrar la lista de herramientas
    async function mostrarHerramientas() {
        try {
            isDetailView = true;
            currentView = 'herramientas';
            
            showSkeleton();
            
            const herramientas = herramientasCache || await obtenerHerramientas();
            
            const herramientasContent = herramientas.map(generarHerramientaCard).join('');
            
            avaGrid.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 150));
            
            avaGrid.innerHTML = herramientasContent;
            
            mostrarBotonRegreso();
            
            // Reiniciar el carrusel
            currentIndex = 0;
            configurarEventos();
            
            requestAnimationFrame(() => {
                avaGrid.style.opacity = '1';
                avaGrid.style.transition = 'none';
                avaGrid.style.transform = 'none';
                updateCarousel(false);
                setupCardHoverEffects(); // Aplicar hover effects
            });
            
        } catch (error) {
            console.error("Error mostrando herramientas:", error);
            avaGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
            mostrarBotonRegreso();
        }
    }

    function mostrarBotonRegreso() {
        if (!regresarBtn) {
            console.error("No se encontró el botón de regreso");
            return;
        }
        
        regresarBtn.innerHTML = `<i class='bx bx-left-arrow-alt'></i> Volver`;
        regresarBtn.classList.add('visible');
    }
    
    // Modificaciones en la función handleRegresarClick
    function handleRegresarClick(e) {
        e.preventDefault();
        
        if (!originalContent) return;
        
        isDetailView = false;
        
        regresarBtn.classList.remove('visible');
        
        if (searchInput) {
            searchInput.value = '';
            if (suggestionsBox) suggestionsBox.style.display = 'none';
        }
        
        mostrarCarreras();
    }

    function configurarEventos() {
        // Botones Ver Más para carreras
        document.querySelectorAll('.ver-mas-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const card = e.target.closest('.ava-card');
                const carreraId = card.dataset.id;
                await mostrarAVAs(carreraId);
            });
        });
        
        // Botón Ver Herramientas
        document.querySelectorAll('.ver-herramientas-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                await mostrarHerramientas();
            });
        });

        // Eventos táctiles para arrastre - solo activos cuando no estamos en vista detalle
        avaGrid.addEventListener('mousedown', startDrag);
        avaGrid.addEventListener('touchstart', startDrag);
        avaGrid.addEventListener('mousemove', onDrag);
        avaGrid.addEventListener('touchmove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }

    function startDrag(e) {
        if (isDetailView) return; // No permitir arrastrar en vista detalle
        
        isDragging = true;
        startX = e.pageX || e.touches?.[0]?.pageX;
        avaGrid.style.cursor = 'grabbing';
        avaGrid.style.userSelect = 'none';
    }

    function stopDrag() {
        isDragging = false;
        if (avaGrid) {
            avaGrid.style.cursor = '';
            avaGrid.style.userSelect = '';
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

    async function inicializar() {
        try {
            // Verificamos que los elementos existan
            if (!avaGrid) {
                console.error("Elemento avaGrid no encontrado");
                return;
            }
            
            userId = await obtenerUsuarioId();
            if (!userId) throw new Error('Debes iniciar sesión');
            
            // Precargar herramientas
            obtenerHerramientas();
            
            await mostrarCarreras();
            
            // Eventos de navegación
            if (prevBtn) prevBtn.addEventListener('click', () => moveSlide(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => moveSlide(1));
            
            if (regresarBtn) {
                regresarBtn.addEventListener('click', handleRegresarClick);
            }

            // Redimensionamiento
            window.addEventListener('resize', () => {
                itemsToShow = getItemsToShow();
                updateCarousel(false);
            });

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && avaGrid.children.length > 0 && !isLoading) {
                        updateCarousel(false);
                        setupCardHoverEffects(); // Aplicar hover effects cuando cambia el contenido
                        break;
                    }
                }
            });
            
            observer.observe(avaGrid, { childList: true });

        } catch (error) {
            console.error("Error inicialización:", error);
            if (avaGrid) {
                avaGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
            }
        }
    }

    // Inicialización
    injectSkeletonStyles();
    ocultarBotonesNavegacion();
    showSkeleton();
    inicializar();
});