// Este código debe reemplazar gran parte de tu paddle.js actual
// Crear namespace global para el sistema de pagos
window.AcadeliaPagos = (function() {
  // Variables privadas del módulo
  const CONFIG = {
    // 🔧 CAMBIO CRÍTICO: Usar el token de cliente LIVE
    clientToken: "live_2c2ec7a4c4d6c0db774fcc527a5",
    prices: {},
    currentUserId: null,
    cacheKey: 'paddle_prices_cache'
  };

  // Estado del sistema
  const STATE = {
    currentBillingCycle: "month",
    currentCountry: "ES",
    paddleInitialized: false
  };

  // Cache para precios
  const LocalCache = {
    set(key, data, expirationMinutes = 30) {
      try {
        const item = {
          data,
          timestamp: new Date().getTime(),
          expiration: expirationMinutes * 60 * 1000
        };
        localStorage.setItem(key, JSON.stringify(item));
      } catch (error) {
        console.warn('Error guardando en caché local:', error);
      }
    },
    get(key) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (!item) return null;
        
        const now = new Date().getTime();
        if (now - item.timestamp > item.expiration) {
          this.clear(key);
          return null;
        }
        return item.data;
      } catch (error) {
        console.warn('Error leyendo caché local:', error);
        return null;
      }
    },
    clear(key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Error limpiando caché local:', error);
      }
    }
  };

  // Mapeo de países a monedas
  const COUNTRY_CURRENCY_MAP = {
    'ES': '€',    // España - Euro
    'US': 'US$',  // Estados Unidos - Dólar estadounidense
    'AR': 'ARS$', // Argentina - Peso argentino
    'BO': 'Bs',   // Bolivia - Boliviano
    'CL': 'CLP$', // Chile - Peso chileno
    'CO': 'COP$', // Colombia - Peso colombiano
    'CR': '₡',    // Costa Rica - Colón costarricense
    'EC': 'US$',  // Ecuador - Dólar estadounidense
    'SV': 'US$',  // El Salvador - Dólar estadounidense
    'GT': 'Q',    // Guatemala - Quetzal
    'HN': 'L',    // Honduras - Lempira
    'MX': 'MX$',  // México - Peso mexicano
    'PA': 'B/',   // Panamá - Balboa
    'PY': '₲',    // Paraguay - Guaraní
    'PE': 'S/',   // Perú - Sol
    'PR': 'US$',  // Puerto Rico - Dólar estadounidense
    'UY': 'UYU$', // Uruguay - Peso uruguayo
    'default': '€' // Moneda predeterminada - Euro
  };

  // Métodos privados (no expuestos)
  async function fetchCurrentUser() {
    try {
      const response = await fetch('/api/usuarios/authenticate', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn('No se pudo obtener el usuario');
        return null;
      }
      
      const userData = await response.json();
      return userData.id_user;
    } catch (error) {
      console.error('Error en Fetch User:', error);
      return null;
    }
  }

  // Cargar precios desde la API
  async function loadPrices() {
    try {
      const cachedPrices = LocalCache.get(CONFIG.cacheKey);
      if (cachedPrices && Object.keys(cachedPrices).length > 0) {
        CONFIG.prices = cachedPrices;
        console.log('Precios cargados desde caché local');
        return;
      }

      const response = await fetch('/api/price');
      if (!response.ok) throw new Error('Error en la respuesta de la API');
      
      const carreras = await response.json();
      
      CONFIG.prices = carreras.reduce((acc, carrera) => {
        const nombre = carrera.nombre.toLowerCase();
        acc[nombre] = {
          month: carrera.month,
          year: carrera.year,
          id_carrera: carrera.id_carrera
        };
        return acc;
      }, {});
      
      LocalCache.set(CONFIG.cacheKey, CONFIG.prices);
      console.log('Precios cargados desde API');
    } catch (error) {
      console.error('Error cargando precios:', error);
      
      const previousCache = LocalCache.get(CONFIG.cacheKey);
      if (previousCache) {
        CONFIG.prices = previousCache;
        console.warn('Usando última versión de precios en caché');
      }
      
      throw error;
    }
  }

  // Inicializar Paddle
  async function initializePaddle() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (typeof Paddle === 'undefined') {
          console.warn(`Intento ${attempt}: Paddle no está disponible, esperando...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }

        // 🔧 CAMBIO CRÍTICO: Usar entorno de producción
        Paddle.Environment.set("production");
        Paddle.Initialize({
          token: CONFIG.clientToken,
          eventCallback: (event) => {
            console.log("Paddle event (LIVE):", event);
            if (event.name === "checkout.completed") {
              console.log("Compra completada en LIVE, esperando procesamiento...");
              setTimeout(() => {
                console.log("Recargando página...");
                window.location.reload(true);
              }, 3000);
            }
          }
        });

        STATE.paddleInitialized = true;
        console.log('✅ Paddle inicializado correctamente en LIVE');
        
        // Notificar que Paddle está listo - Importante para coordinación entre archivos
        document.dispatchEvent(new CustomEvent('AcadeliaPaddle:ready'));
        
        return true;
      } catch (error) {
        console.error(`Error en intento ${attempt} de inicializar Paddle (LIVE):`, error);
        if (attempt === MAX_RETRIES) {
          console.error('Inicializar Paddle LIVE - Máximo de intentos alcanzado');
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // Función para procesar una compra
  function processCheckout(producto, dataId) {
    if (!STATE.paddleInitialized) {
      console.log("⚠️ Paddle aún no está inicializado, esperando...");
      
      let attempts = 0;
      const maxAttempts = 5;
      const interval = setInterval(() => {
        attempts++;
        if (STATE.paddleInitialized) {
          clearInterval(interval);
          processCheckoutInternal(producto, dataId);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error("Error: Paddle no pudo inicializarse después de varios intentos");
          alert("Lo sentimos, el sistema de pagos no está disponible en este momento. Por favor, intenta de nuevo más tarde.");
        }
      }, 800);
      
      return;
    }
    
    processCheckoutInternal(producto, dataId);
  }
  
  // Implementación interna del checkout
  function processCheckoutInternal(producto, dataId) {
    console.log(`Procesando checkout para: ${producto} (LIVE)`);
    
    try {
      // Convertir a minúsculas y quitar espacios extra
      const productoNormalizado = producto.toLowerCase().trim();
      
      // Si no encontramos el producto en los precios, intentar con nombre alternativo
      if (!CONFIG.prices[productoNormalizado]) {
        // Intentar con versiones alternativas
        const alternativas = [
          productoNormalizado,
          productoNormalizado.replace(/\s+/g, ''),
          "avas " + productoNormalizado,
          productoNormalizado.replace(/^avas\s+/i, '')
        ];
        
        for (const alt of alternativas) {
          if (CONFIG.prices[alt]) {
            console.log(`Producto encontrado con nombre alternativo: ${alt}`);
            producto = alt;
            break;
          }
        }
      }
      
      // Verificar que tenemos la información necesaria
      if (!CONFIG.prices[productoNormalizado]) {
        console.error(`Error: Producto "${productoNormalizado}" no encontrado en la lista de precios`);
        return;
      }
      
      const checkoutConfig = {
        items: [{
          priceId: CONFIG.prices[productoNormalizado][STATE.currentBillingCycle],
          quantity: 1
        }],
        settings: {
          theme: "light",
          displayMode: "overlay",
          variant: "Multi-page"
        }
      };

      if (CONFIG.currentUserId) {
        checkoutConfig.customData = {
          id_user: CONFIG.currentUserId.toString(),
          id_carrera: CONFIG.prices[productoNormalizado].id_carrera.toString()
        };
      }

      console.log('🔥 Abriendo checkout en LIVE con configuración:', checkoutConfig);
      Paddle.Checkout.open(checkoutConfig);
    } catch (error) {
      console.error('Error al abrir checkout (LIVE):', error);
      alert("Ha ocurrido un error al iniciar el proceso de pago. Por favor intenta de nuevo.");
    }
  }

  // Funciones para actualizar precios
  async function updatePrices(isUserChange = false) {
    if (!STATE.paddleInitialized || Object.keys(CONFIG.prices).length === 0) {
      console.log("Paddle no inicializado o precios no cargados");
      return;
    }

    const currency = COUNTRY_CURRENCY_MAP[STATE.currentCountry] || COUNTRY_CURRENCY_MAP['default'];

    if (isUserChange) {
      Object.keys(CONFIG.prices).forEach(product => {
        const formattedName = "AVAs " + product.split(' ').pop().charAt(0).toUpperCase() + product.split(' ').pop().slice(1);
        const priceElement = document.querySelector(`[data-product="${formattedName}"] .price`);
        
        if (priceElement) {
          priceElement.textContent = `${currency} -`;
          priceElement.classList.add('loading-price');
        }
      });
    }

    try {
      const request = {
        items: Object.keys(CONFIG.prices).map(product => ({
          quantity: 1,
          priceId: CONFIG.prices[product][STATE.currentBillingCycle]
        })),
        address: { countryCode: STATE.currentCountry }
      };

      const result = await Promise.race([
        Paddle.PricePreview(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Price preview timeout')), 3000)
        )
      ]);

      if (result?.data?.details?.lineItems) {
        result.data.details.lineItems.forEach(item => {
          const productName = Object.keys(CONFIG.prices).find(
            product => CONFIG.prices[product][STATE.currentBillingCycle] === item.price.id
          );
          
          if (productName) {
            const formattedName = "AVAs " + productName.split(' ').pop().charAt(0).toUpperCase() + productName.split(' ').pop().slice(1);
            const priceElement = document.querySelector(`[data-product="${formattedName}"] .price`);
            
            if (priceElement) {
              priceElement.textContent = item.formattedTotals.subtotal;
              if (isUserChange) priceElement.classList.remove('loading-price');
              priceElement.style.fontSize = item.formattedTotals.subtotal.length > 7 ? "1.3rem" : "";
            }
          }
        });
      }
    } catch (error) {
      if (isUserChange) {
        Object.keys(CONFIG.prices).forEach(product => {
          const formattedName = "AVAs " + product.split(' ').pop().charAt(0).toUpperCase() + product.split(' ').pop().slice(1);
          const priceElement = document.querySelector(`[data-product="${formattedName}"] .price`);
          
          if (priceElement) {
            priceElement.classList.remove('loading-price');
          }
        });
      }
      console.error('Error actualizando precios (LIVE):', error);
    }
  }

  // Inicialización principal
  async function initialize() {
    try {
      console.log('🔥 Inicializando sistema de pagos LIVE...');
      
      // Obtener ID de usuario primero
      CONFIG.currentUserId = await fetchCurrentUser();
      console.log('Usuario identificado:', CONFIG.currentUserId);
      
      // Cargar precios
      try {
        await loadPrices();
        console.log('Precios cargados correctamente');
      } catch (e) {
        console.warn('Error en carga inicial de precios:', e);
      }
      
      // Inicializar Paddle cuando esté disponible
      if (typeof Paddle !== 'undefined') {
        await initializePaddle();
        // Actualizar precios inmediatamente después de inicializar Paddle
        setTimeout(() => updatePrices(), 300);
      } else {
        // Verificar periódicamente si Paddle ya está disponible
        const paddleCheck = setInterval(() => {
          if (typeof Paddle !== 'undefined') {
            clearInterval(paddleCheck);
            initializePaddle().then(() => {
              // Actualizar precios después de inicializar Paddle
              setTimeout(() => updatePrices(), 300);
            });
          }
        }, 300);
        
        // Terminar el intervalo después de 10 segundos si no se carga
        setTimeout(() => {
          clearInterval(paddleCheck);
          if (!STATE.paddleInitialized) {
            console.warn('Paddle no se pudo cargar después de 10 segundos de espera');
          }
        }, 10000);
      }
      
      // Configurar escuchas para los eventos de UI
      setupEventListeners();
      
      // Actualizar precios iniciales aunque Paddle no esté listo
      // Para mostrar al menos los marcadores de precio
      updateInitialPrices();
      
      // Notificar que AcadeliaPagos está listo
      document.dispatchEvent(new CustomEvent('AcadeliaPagos:ready'));
      
      return true;
    } catch (error) {
      console.error('Error crítico inicializando sistema de pagos LIVE:', error);
      return false;
    }
  }
  
  // Añade también esta nueva función para mostrar precios iniciales
  function updateInitialPrices() {
    if (Object.keys(CONFIG.prices).length === 0) {
      console.log("No hay precios disponibles para mostrar");
      return;
    }
    
    const currency = COUNTRY_CURRENCY_MAP[STATE.currentCountry] || COUNTRY_CURRENCY_MAP['default'];
    
    // Actualizar cada elemento de precio con un valor inicial
    Object.keys(CONFIG.prices).forEach(product => {
      try {
        // Convertir el nombre del producto a formato "AVAs Medicina"
        const formattedName = "AVAs " + product.split(' ').pop().charAt(0).toUpperCase() + product.split(' ').pop().slice(1);
        const priceElement = document.querySelector(`[data-product="${formattedName}"] .price`);
        
        if (priceElement) {
          // Mostrar marcador de precio con moneda
          priceElement.textContent = `${currency} ...`;
          console.log(`Mostrando precio inicial para: ${formattedName}`);
        }
      } catch (e) {
        console.warn("Error al mostrar precio para", product, e);
      }
    });
    
    // Programar actualización completa más tarde
    setTimeout(() => {
      if (STATE.paddleInitialized) {
        updatePrices();
      }
    }, 1500);
  }

  // Configurar escuchas de eventos
  function setupEventListeners() {
    // Escuchar cambios en país
    const countrySelect = document.getElementById('countrySelect');
    if (countrySelect) {
      countrySelect.addEventListener("change", (e) => {
        STATE.currentCountry = e.target.value;
        updatePrices(true);
      });
    }
    
    // Escuchar cambios en ciclo de facturación
    const monthlyBtn = document.getElementById('monthlyBtn');
    const yearlyBtn = document.getElementById('yearlyBtn');
    
    if (monthlyBtn) {
      monthlyBtn.addEventListener("click", () => {
        if (STATE.currentBillingCycle !== "month") {
          STATE.currentBillingCycle = "month";
          monthlyBtn.classList.add("active");
          if (yearlyBtn) yearlyBtn.classList.remove("active");
          updatePrices(true);
        }
      });
    }
    
    if (yearlyBtn) {
      yearlyBtn.addEventListener("click", () => {
        if (STATE.currentBillingCycle !== "year") {
          STATE.currentBillingCycle = "year";
          yearlyBtn.classList.add("active");
          if (monthlyBtn) monthlyBtn.classList.remove("active");
          updatePrices(true);
        }
      });
    }
  }

  // Función para depurar el estado actual del sistema
function debugSystemState() {
    console.group('🔍 Estado del sistema de pagos LIVE');
    console.log('Estado de inicialización:', STATE.paddleInitialized ? '✅ Inicializado' : '❌ No inicializado');
    console.log('Paddle disponible:', typeof Paddle !== 'undefined' ? '✅ Disponible' : '❌ No disponible');
    console.log('Ciclo de facturación actual:', STATE.currentBillingCycle);
    console.log('País actual:', STATE.currentCountry);
    console.log('Usuario ID:', CONFIG.currentUserId);
    console.log('Total de precios cargados:', Object.keys(CONFIG.prices).length);
    console.log('Precios disponibles:', CONFIG.prices);
    console.log('🔥 TOKEN LIVE:', CONFIG.clientToken);
    
    // Verificar elementos de precio en la página
    const priceElements = document.querySelectorAll('.price');
    console.log('Elementos de precio en la página:', priceElements.length);
    
    // Verificar coincidencia entre productos cargados y elementos en la página
    if (priceElements.length > 0 && Object.keys(CONFIG.prices).length > 0) {
      Object.keys(CONFIG.prices).forEach(product => {
        const formattedName = "AVAs " + product.split(' ').pop().charAt(0).toUpperCase() + product.split(' ').pop().slice(1);
        const priceElement = document.querySelector(`[data-product="${formattedName}"] .price`);
        console.log(`Producto "${formattedName}":`, priceElement ? '✅ Elemento encontrado' : '❌ Elemento no encontrado');
      });
    }
    console.groupEnd();
    
    return {
      initialized: STATE.paddleInitialized,
      paddleAvailable: typeof Paddle !== 'undefined',
      billingCycle: STATE.currentBillingCycle,
      country: STATE.currentCountry,
      userId: CONFIG.currentUserId,
      pricesLoaded: Object.keys(CONFIG.prices).length,
      priceElementsFound: priceElements.length,
      environment: 'LIVE'
    };
  }
  
  // Función para forzar la actualización de precios
  function forceUpdatePrices() {
    console.log('🔄 Forzando actualización de precios (LIVE)...');
    
    // Intentar primero con Paddle si está disponible
    if (STATE.paddleInitialized && Object.keys(CONFIG.prices).length > 0) {
      updatePrices(true);
      return true;
    }
    
    // Si Paddle no está disponible, usar actualización inicial
    if (Object.keys(CONFIG.prices).length > 0) {
      updateInitialPrices();
      return true;
    }
    
    // Si no hay precios, intentar cargarlos primero
    loadPrices().then(() => {
      updateInitialPrices();
      return true;
    }).catch(e => {
      console.error('Error al cargar precios para actualización forzada:', e);
      return false;
    });
  }

  // API pública
  return {
    inicializar: initialize,
    procesarCompra: processCheckout,
    actualizarPrecios: updatePrices,
    getBillingCycle: () => STATE.currentBillingCycle,
    getCountry: () => STATE.currentCountry,
    isReady: () => STATE.paddleInitialized,
    
    // Cambiar configuración
    setBillingCycle: (cycle) => {
      if (cycle === 'month' || cycle === 'year') {
        STATE.currentBillingCycle = cycle;
        updatePrices(true);
      }
    },
    setCountry: (country) => {
      if (country && country.length === 2) {
        STATE.currentCountry = country;
        updatePrices(true);
      }
    },
    
    // Funciones de depuración
    debug: {
      state: debugSystemState,
      forceUpdatePrices: forceUpdatePrices,
      getConfig: () => ({ ...CONFIG }),
      getPrices: () => ({ ...CONFIG.prices }),
      environment: 'LIVE'
    }
  };
})();

// Iniciar el sistema cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", function() {
  // Iniciar sistema de pagos
  window.AcadeliaPagos.inicializar().then(() => {
    console.log('🔥 Sistema de pagos LIVE inicializado correctamente');
  });
});