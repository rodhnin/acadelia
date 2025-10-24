/**
 * Módulo para gestionar la pantalla de carga
 */

const loader = {
    /**
     * Elemento contenedor del loader
     * @type {HTMLElement}
     */
    loaderElement: null,

    /**
     * Inicializa el loader
     */
    init() {
        // Crear el elemento del loader si no existe
        if (!this.loaderElement) {
            this.createLoaderElement();
        }
    },

    /**
     * Crea el elemento HTML del loader
     */
    createLoaderElement() {
        // Crear contenedor principal
        this.loaderElement = document.createElement('div');
        this.loaderElement.className = 'security-loader';
        this.loaderElement.innerHTML = `
            <div class="loader-content">
                <div class="loader-image">
                    <img src="/images/Laptop_claro.gif" alt="Cargando...">
                </div>
                <div class="progress-container">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">Inicializando dashboard de seguridad...</div>
                </div>
            </div>
        `;

        // Agregar estilos CSS inline (se puede mover a CSS)
        const style = document.createElement('style');
        style.textContent = `
            .security-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: var(--bg-color);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                transition: opacity 0.5s;
            }
            
            .loader-content {
                text-align: center;
            }
            
            .loader-image {
                margin-bottom: 2rem;
            }
            
            .loader-image img {
                width: 180px;
                height: 180px;
                border-radius: 50%;
                object-fit: cover;
            }
            
            .progress-container {
                width: 300px;
                margin: 0 auto;
            }
            
            .progress {
                height: 8px;
                margin-bottom: 0.5rem;
                background-color: var(--border-color);
            }
            
            .progress-bar {
                background-color: var(--primary-color);
                transition: width 0.3s ease;
            }
            
            .progress-text {
                font-size: 0.9rem;
                color: var(--text-color);
            }
            
            body.dark-mode .security-loader {
                background-color: var(--dark-bg);
            }
            
            body.dark-mode .progress-text {
                color: var(--dark-text);
            }
        `;

        // Agregar el loader y los estilos al body
        document.head.appendChild(style);
        document.body.appendChild(this.loaderElement);
    },

    /**
     * Muestra el loader
     */
    show() {
        if (!this.loaderElement) {
            this.init();
        }
        this.loaderElement.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir scroll
    },

    /**
     * Oculta el loader con una animación de fadeout
     */
    hide() {
        if (this.loaderElement) {
            this.loaderElement.style.opacity = '0';
            setTimeout(() => {
                this.loaderElement.style.display = 'none';
                document.body.style.overflow = ''; // Restablecer scroll
            }, 500);
        }
    },

    /**
     * Actualiza el progreso de carga
     * @param {number} percent - Porcentaje de carga (0-100)
     * @param {string} [text] - Texto opcional para mostrar
     */
    updateProgress(percent, text) {
        if (this.loaderElement) {
            const progressBar = this.loaderElement.querySelector('.progress-bar');
            const progressText = this.loaderElement.querySelector('.progress-text');
            
            if (progressBar) {
                progressBar.style.width = `${percent}%`;
            }
            
            if (progressText && text) {
                progressText.textContent = text;
            }
        }
    }
};

export default loader;