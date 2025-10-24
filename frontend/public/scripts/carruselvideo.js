document.addEventListener("DOMContentLoaded", function () {
    const track = document.getElementById("track");
    const slides = Array.from(track.children);
    const prevButton = document.getElementById("prevBtn");
    const nextButton = document.getElementById("nextBtn");

    let currentIndex = 0;

    // Función para calcular el número de diapositivas visibles según el ancho de la pantalla
    function getVisibleSlides() {
        if (window.innerWidth <= 480) {
            return 1; // Una diapositiva visible en pantallas muy pequeñas
        } else if (window.innerWidth <= 768) {
            return 2; // Dos diapositivas visibles en pantallas medianas
        } else {
            return 3; // Tres diapositivas visibles en pantallas grandes
        }
    }

    // Función para obtener el movimiento en píxeles según el tamaño de la pantalla
    function getMovePixels() {
        if (window.innerWidth <= 480) {
            return 350; // 350px en modo celular
        } else if (window.innerWidth <= 768) {
            return 680; //50px en modo tableta
        } else {
            return 1250; // 1250px en pantallas grandes
        }
    }

    // Función para mover el carrusel
    function moveCarousel(index) {
        const movePixels = getMovePixels(); // Obtener los píxeles de movimiento
        track.style.transform = `translateX(-${index * movePixels}px)`;
    }

    // Función para comprobar la visibilidad de los botones
    function checkButtonVisibility() {
        if (window.innerWidth <= 768) {
            prevButton.style.display = 'flex'; // Mostrar en pantallas pequeñas
            nextButton.style.display = 'flex'; // Mostrar en pantallas pequeñas
        } else {
            prevButton.style.display = 'none'; // Ocultar en pantallas grandes
            nextButton.style.display = 'none'; // Ocultar en pantallas grandes
        }
    }

    // Llamar a la función para comprobar los botones al cargar la página
    checkButtonVisibility();

    // Llamar a la función para calcular el número de diapositivas visibles
    let visibleSlides = getVisibleSlides();

    // Evento para el botón "Siguiente"
    nextButton.addEventListener("click", function () {
        const maxIndex = slides.length - 1; // Límite máximo de movimiento (última diapositiva)
        if (currentIndex < maxIndex) {
            currentIndex++;
            moveCarousel(currentIndex);
        }
    });

    // Evento para el botón "Anterior"
    prevButton.addEventListener("click", function () {
        if (currentIndex > 0) {
            currentIndex--;
            moveCarousel(currentIndex);
        }
    });

    // Ajuste en caso de redimensionamiento
    window.addEventListener("resize", function () {
        checkButtonVisibility();
        visibleSlides = getVisibleSlides(); // Actualizar el número de diapositivas visibles
        const maxIndex = slides.length - 1; // Recalcular el límite máximo

        // Ajustar el índice actual si excede el nuevo límite
        if (currentIndex > maxIndex) {
            currentIndex = maxIndex;
        }

        moveCarousel(currentIndex); // Ajustar el desplazamiento del carrusel al tamaño de la pantalla
    });
});