// Mejora del sistema de Cache con logging controlado
const Cache = {
  data: new Map(),
  debugMode: false, // Control para logs de debugging
  
  // Default expiration time of 5 minutes
  defaultExpiration: 5 * 60 * 1000,
  
  set(key, value, expirationMs = this.defaultExpiration) {
    if (this.debugMode) {
      console.log(`Cache set for key: ${key}`);
    }
    this.data.set(key, {
      value,
      expires: Date.now() + expirationMs,
      accessCount: 0 // Contador de accesos
    });
  },
  
  get(key) {
    const item = this.data.get(key);
    if (!item) {
      if (this.debugMode) {
        console.log(`Cache miss for key: ${key}`);
      }
      return null;
    }
    
    if (Date.now() > item.expires) {
      if (this.debugMode) {
        console.log(`Cache expired for key: ${key}`);
      }
      this.data.delete(key);
      return null;
    }
    
    item.accessCount++;
    
    if (this.debugMode && item.accessCount > 1) {
      console.log(`Multiple cache access (${item.accessCount}) for key: ${key}`);
    }
    
    return item.value;
  },
  
  clear() {
    if (this.debugMode) {
      console.log('Cache cleared');
    }
    this.data.clear();
  },

  // Método para obtener estadísticas del caché
  getStats() {
    const stats = {
      totalItems: this.data.size,
      items: {}
    };

    this.data.forEach((value, key) => {
      stats.items[key] = {
        accessCount: value.accessCount,
        expiresIn: Math.round((value.expires - Date.now()) / 1000) + ' seconds'
      };
    });

    return stats;
  }
};

document.addEventListener('DOMContentLoaded', async function() {
  // Referencias a elementos del DOM
  const track = document.getElementById('track');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const regresarBtn = document.getElementById('regresarBtn');

  // Variables para la vista
  let initialContent = '';
  let isDetailView = false;
  let currentUserId = null;

  // ======================================================
  if (typeof window.handleCompra !== 'function') {
    window.handleCompra = function(producto, dataId) {
      console.log('Función handleCompra invocada con:', producto, dataId);
      
      if (window.AcadeliaPagos && typeof window.AcadeliaPagos.procesarCompra === 'function') {
        window.AcadeliaPagos.procesarCompra(producto, dataId);
      } else {
        console.error('Sistema de pagos no disponible. Intentando reconectar...');
        
        // Intento de recuperación: esperar a que el sistema de pagos esté disponible
        let attempts = 0;
        const maxAttempts = 5;
        const checkInterval = setInterval(() => {
          attempts++;
          
          if (window.AcadeliaPagos && typeof window.AcadeliaPagos.procesarCompra === 'function') {
            clearInterval(checkInterval);
            window.AcadeliaPagos.procesarCompra(producto, dataId);
            console.log('Sistema de pagos reconectado correctamente');
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.error('No se pudo conectar con el sistema de pagos');
            alert('Lo sentimos, el sistema de pagos no está disponible en este momento. Por favor, intenta de nuevo más tarde.');
          }
        }, 800); // Intentar cada 800ms
      }
    };
  }

  // ======================================================
  // Funciones mejoradas para obtener datos con caché
  
  async function getUserId() {
    const cachedUserId = Cache.get('userId');
    if (cachedUserId) return cachedUserId;

    try {
      const userResponse = await fetch('/api/usuarios/authenticate');
      if (!userResponse.ok) throw new Error('Error de autenticación');
      const userData = await userResponse.json();
      Cache.set('userId', userData.id_user, 30 * 60 * 1000); // Cache por 30 minutos
      return userData.id_user;
    } catch (error) {
      console.error('Error al obtener ID de usuario:', error);
      throw error;
    }
  }

  async function fetchAVAsFromAPI(carreraId) {
    const response = await fetch(`/api/avas/carrera/${carreraId}`);
    if (!response.ok) throw new Error('Error al obtener los AVAs');
    return await response.json();
  }

  // ======================================================
  // Funciones para generar tarjetas dinámicas
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

  async function fetchCarreras() {
    try {
      const userId = await getUserId();
      currentUserId = userId;
      
      const cacheKey = `carreras_${userId}`;
      let carreras = Cache.get(cacheKey);
      
      if (!carreras) {
        carreras = await fetchCarrerasFromAPI(userId);
        Cache.set(cacheKey, carreras);
      }

      if (!carreras) {
        track.innerHTML = `
            <div class="box-content" style="text-align: center;">
              <p>¡Felicitaciones! Has comprado todo.</p>
              <img src="../images/felicidades.png" alt="Felicitaciones, has comprado todo" />
            </div>
        `;
        regresarBtn.style.display = 'none';
        return;
      }

      let html = "";
      carreras.forEach(carrera => {
        html += generarTarjeta({
          imagen: carrera.imagen || "./images/default_carrera.jpg",
          alt: carrera.nombre,
          titulo: carrera.nombre,
          descripcion: carrera.descripcion || "",
          dataId: carrera.id_carrera,
          producto: carrera.nombre,
          btnTexto: "Ver más",
          esVerMas: true,
          mostrarComprar: true
        });
      });

      track.innerHTML = html;
      asignarEventoComprar(); // Añadimos esta llamada para asignar eventos a los botones de compra
      storeInitialContent();
      regresarBtn.style.display = 'none';
    } catch (error) {
      console.error('Error en fetchCarreras:', error);
      // Solo mostrar este mensaje si el error no es 404
      if (error.message !== '404') {
        track.innerHTML = `
          <div class="content-box">
            <div class="box-content">
              <p>Error al cargar las carreras. Por favor, intente más tarde.</p>
            </div>
          </div>
        `;
      }
    }
  }

  // NUEVA FUNCIÓN: Asignar eventos a los botones de compra
  function asignarEventoComprar() {
    // Usamos delegación de eventos en lugar de asignar individualmente
    document.addEventListener('click', function(e) {
      const comprarBtn = e.target.closest('.comprar-btn');
      if (comprarBtn) {
        e.preventDefault();
        const producto = comprarBtn.getAttribute('data-producto');
        const dataId = comprarBtn.getAttribute('data-id');
        
        if (typeof window.handleCompra === 'function') {
          window.handleCompra(producto, dataId);
        } else {
          console.error('Función handleCompra no disponible');
        }
      }
    });
  }

  async function fetchCarrerasFromAPI(userId) {
    try {
      const response = await fetch(`/api/compra/carrera/available/${userId}`);
      
      // Si la respuesta es 404, se retorna null
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Error al obtener las carreras');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en fetchCarrerasFromAPI:', error);
      throw error;  // Re-lanzamos el error para que sea manejado en la función principal
    }
  }

  // Guarda el contenido inicial
  function storeInitialContent() {
    const clone = track.cloneNode(true);
    initialContent = clone.innerHTML;
    // Precarga imágenes
    const images = track.getElementsByTagName('img');
    Array.from(images).forEach(img => {
      const preloadImage = new Image();
      preloadImage.src = img.src;
    });
  }

  // Evento del botón "Regresar"
  regresarBtn.addEventListener('click', function() {
    isDetailView = false;
    track.innerHTML = initialContent;
    asignarEventoComprar(); // También necesitamos reasignar eventos de compra
    regresarBtn.style.display = 'none';
  });

  async function refreshCarreras() {
    if (currentUserId) {
      Cache.data.delete(`carreras_${currentUserId}`);
    }
    await fetchCarreras();
  }

  // Hacer las funciones disponibles globalmente
  window.fetchCarreras = fetchCarreras;
  window.refreshCarreras = refreshCarreras;

  fetchCarreras();
  
  prevBtn.style.display = 'none';
  nextBtn.style.display = 'none';
});