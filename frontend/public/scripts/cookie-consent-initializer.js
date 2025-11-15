document.addEventListener('DOMContentLoaded', function() {
    const bannerInitialized = document.body.getAttribute('data-cookie-init') === 'true';
    
    // Evitar inicialización múltiple
    if (bannerInitialized) {
      console.log('Banner de cookies ya inicializado, ignorando duplicado');
      return;
    }
    
    document.body.setAttribute('data-cookie-init', 'true');
    
    if (!document.getElementById('cookie-consent-banner')) {
      if (!document.querySelector('link[href="/css/cookie-consent.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '/css/cookie-consent.css';
        document.head.appendChild(cssLink);
      }
      
      const bannerHTML = `
        <div id="cookie-consent-banner">
          <div class="cookie-container">
            <div class="cookie-icon">
              <img src="/images/acadel-icon.webp" alt="Profesor Acadel" />
            </div>
            <div class="cookie-text">
              <h3>¡Acadel cuida tu privacidad!</h3>
              <p>Utilizamos cookies para mejorar tu experiencia de aprendizaje, personalizar contenido, y analizar nuestro tráfico. Puedes elegir qué cookies aceptas. Las cookies esenciales siempre están activas para el funcionamiento del sitio. <a href="/cookie_privacy">Más información</a></p>
              <div class="cookie-actions">
                <button id="accept-all-cookies" class="ingresar-btn cookie-btn-primary">
                  <i class='bx bx-check'></i>
                  Aceptar todas
                </button>
                <button id="reject-all-cookies" class="cookie-btn-secondary">
                  Solo esenciales
                </button>
                <button id="customize-cookies" class="cookie-customize-btn">
                  Personalizar
                </button>
              </div>
            </div>
            
            <div class="cookie-settings">
              <div class="cookie-settings-title">Configuración de cookies</div>
              
              <div class="cookie-setting-item">
                <div class="cookie-setting-info">
                  <div class="cookie-setting-label">
                    <i class='bx bx-shield'></i>
                    <strong>Cookies esenciales</strong>
                  </div>
                  <div class="cookie-setting-description">
                    Necesarias para el funcionamiento básico del sitio. No pueden ser desactivadas.
                  </div>
                </div>
                <label class="cookie-toggle">
                  <input type="checkbox" checked disabled>
                  <span class="cookie-toggle-slider"></span>
                </label>
              </div>
              
              <div class="cookie-setting-item">
                <div class="cookie-setting-info">
                  <div class="cookie-setting-label">
                    <i class='bx bx-cog'></i>
                    <strong>Cookies funcionales</strong>
                  </div>
                  <div class="cookie-setting-description">
                    Permiten funcionalidades mejoradas y personalización como guardar tema, preferencias de idioma y configuraciones de usuario.
                  </div>
                </div>
                <label class="cookie-toggle">
                  <input type="checkbox" id="functional-cookies-toggle">
                  <span class="cookie-toggle-slider"></span>
                </label>
              </div>
              
              <div class="cookie-setting-item">
                <div class="cookie-setting-info">
                  <div class="cookie-setting-label">
                    <i class='bx bx-bar-chart-alt-2'></i>
                    <strong>Cookies analíticas</strong>
                  </div>
                  <div class="cookie-setting-description">
                    Nos ayudan a entender cómo interactúas con el sitio para mejorar tu experiencia educativa.
                  </div>
                </div>
                <label class="cookie-toggle">
                  <input type="checkbox" id="analytics-cookies-toggle">
                  <span class="cookie-toggle-slider"></span>
                </label>
              </div>
              
              <div class="cookie-setting-item">
                <div class="cookie-setting-info">
                  <div class="cookie-setting-label">
                    <i class='bx bx-target-lock'></i>
                    <strong>Cookies de marketing</strong>
                  </div>
                  <div class="cookie-setting-description">
                    Utilizadas para mostrarte anuncios relevantes a tus intereses académicos.
                  </div>
                </div>
                <label class="cookie-toggle">
                  <input type="checkbox" id="marketing-cookies-toggle">
                  <span class="cookie-toggle-slider"></span>
                </label>
              </div>
              
              <div class="cookie-actions" style="justify-content: flex-end; margin-top: 1rem;">
                <button id="save-cookie-preferences" class="ingresar-btn cookie-btn-primary">
                  <i class='bx bx-save'></i>
                  Guardar preferencias
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', bannerHTML);
      
      // Evitar guardar múltiples veces
      let isProcessing = false;
      

      document.getElementById('customize-cookies')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Botón Personalizar clickeado');
        
        const settings = document.querySelector('.cookie-settings');
        if (!settings) {
          console.error('ERROR: Elemento .cookie-settings no encontrado');
          return;
        }
        
        const isVisible = settings.getAttribute('data-visible') === 'true';
        
        console.log('Estado actual:', isVisible ? 'visible' : 'oculto');
        
        // Invertir el estado
        if (isVisible) {
          settings.style.display = 'none';
          settings.classList.remove('active');
          settings.setAttribute('data-visible', 'false');
          console.log('Panel ocultado');
        } else {
          settings.style.display = 'block';
          settings.classList.add('active');
          settings.setAttribute('data-visible', 'true');
          console.log('Panel mostrado');
        }
      });
      
      document.getElementById('accept-all-cookies')?.addEventListener('click', function(e) {
        e.preventDefault(); // Evitar envío de formulario
        
        // Evitar múltiples clicks
        if (isProcessing) return;
        isProcessing = true;
        
        if (typeof window.acceptAllCookies === 'function') {
          window.acceptAllCookies();
        }
        
        setTimeout(() => {
          isProcessing = false;
        }, 2000);
      });
      
      document.getElementById('reject-all-cookies')?.addEventListener('click', function(e) {
        e.preventDefault(); // Evitar envío de formulario
        
        // Evitar múltiples clicks
        if (isProcessing) return;
        isProcessing = true;
        
        if (typeof window.rejectOptionalCookies === 'function') {
          window.rejectOptionalCookies();
        }
        
        setTimeout(() => {
          isProcessing = false;
        }, 2000);
      });
      
      document.getElementById('save-cookie-preferences')?.addEventListener('click', function(e) {
        e.preventDefault(); // Evitar envío de formulario
        
        // Evitar múltiples clicks
        if (isProcessing) return;
        isProcessing = true;
        
        if (typeof window.saveCustomCookiePreferences === 'function') {
          window.saveCustomCookiePreferences();
        }
        
        setTimeout(() => {
          isProcessing = false;
        }, 2000);
      });
      
      if (typeof initCookieConsent !== 'function') {
        const script = document.createElement('script');
        script.src = '/scripts/cookie-consent.js';
        document.body.appendChild(script);
      } else {
        // Si la función ya existe, inicializarla
        initCookieConsent();
      }
      
      console.log('Banner de cookies inicializado correctamente');
    }
  });