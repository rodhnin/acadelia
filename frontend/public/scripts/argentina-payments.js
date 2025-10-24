// argentina-payments.js - Sistema de Pagos Argentina VERSIÓN CORREGIDA
(function() {
    'use strict';
    
    console.log('🇦🇷 Sistema de Pagos Argentina (CORREGIDO) inicializando...');
    
    // 🦫 ACADEL DNA para mensajes
    const ACADEL_MESSAGES = {
        loading: "🦫 Procesando tu pago como un capibara experto... ¡paciencia!",
        success: "🦫 ¡Exitazo total! Tu compra está lista, como mi pelaje después del spa",
        error: "🦫 Ups, algo salió mal... incluso los capibaras tenemos días difíciles",
        cancel: "🦫 No pasa nada, a veces cambiar de opinión es de sabios",
        ualaProcessing: "🦫 Conectando con Ualá... más rápido que yo corriendo hacia el agua",
        transferSuccess: "🦫 Transferencia registrada. En 12 horas estarás estudiando como todo un académico",
        fileUploading: "🦫 Subiendo tu comprobante como un capibara organizado...",
        fileUploaded: "🦫 ¡Archivo subido! Más rápido que yo saltando al agua"
    };

    // ===== CONFIGURACIÓN =====
    const CONFIG = {
        endpoints: {
            createUala: '/api/payments-arg/uala/create-order',
            submitTransfer: '/api/payments-arg/bank-transfer/submit',
            getCarrerasPrices: '/api/payments-arg/carreras/precios',
            getCarreraPrice: '/api/payments-arg/carreras/:id/precios'
        },
        currentCountry: 'AR',
        currentCycle: 'month',
        selectedCarrera: null,
        prices: {},
        userId: null
    };

    // ===== ESTADO GLOBAL =====
    let isPaymentProcessing = false;
    let currentPaymentModal = null;
    let loadingModal = null;
    let previewModal = null;
    let notificationModal = null;
    let uploadedFile = null;

    // ===== DATOS BANCARIOS =====
    const BANK_DATA = {
        bank: "Banco de la Nación Argentina",
        cbu: "0110593930009310123456",
        alias: "ACADELIA.ARG",
        holder: "Acadelia Argentina S.A."
    };

    // ===== INICIALIZACIÓN =====
    async function initialize() {
        try {
            console.log('🦫 Inicializando sistema de pagos Argentina corregido...');
            await getCurrentUser();
            await loadPricesFromDatabase();
            setupEventListeners();
            updatePricesDisplay();
            setupArgentinaSelector();
            
            // ✅ NUEVO: Verificar suscripciones en procesamiento al cargar
            setTimeout(() => {
                checkProcessingSubscriptions();
            }, 2000); // Esperar 2 segundos después de cargar
            
            console.log('✅ Sistema de pagos Argentina corregido listo');
            document.dispatchEvent(new CustomEvent('ArgentinaPagos:ready'));
            
        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            showBeautifulNotification('error', ACADEL_MESSAGES.error);
        }
    }

    // ===== MOSTRAR NOTIFICACIÓN BONITA =====
    function showBeautifulNotification(type, message, title = null) {
        if (notificationModal) {
            closeBeautifulNotification();
        }
        
        notificationModal = document.createElement('div');
        notificationModal.className = 'beautiful-notification-overlay';
        
        let icon = '🦫';
        let defaultTitle = 'Capibara dice...';
        
        if (type === 'success') {
            icon = '✅';
            defaultTitle = '¡Perfecto!';
        } else if (type === 'error') {
            icon = '❌';
            defaultTitle = 'Oops...';
        } else if (type === 'info') {
            icon = 'ℹ️';
            defaultTitle = 'Información';
        }
        
        notificationModal.innerHTML = `
            <div class="beautiful-notification ${type}">
                <div class="notification-icon ${type}">${icon}</div>
                <h3 class="notification-title">${title || defaultTitle}</h3>
                <p class="notification-message">${message}</p>
                <button class="notification-btn ${type}">Entendido</button>
            </div>
        `;
        
        const btn = notificationModal.querySelector('.notification-btn');
        btn.addEventListener('click', closeBeautifulNotification);
        
        notificationModal.addEventListener('click', (e) => {
            if (e.target === notificationModal) {
                closeBeautifulNotification();
            }
        });
        
        const notificationContent = notificationModal.querySelector('.beautiful-notification');
        notificationContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.body.appendChild(notificationModal);
        setTimeout(() => notificationModal.classList.add('show'), 10);
    }

    function closeBeautifulNotification() {
        if (notificationModal) {
            notificationModal.classList.remove('show');
            setTimeout(() => {
                if (notificationModal.parentNode) {
                    notificationModal.parentNode.removeChild(notificationModal);
                }
                notificationModal = null;
            }, 300);
        }
    }

    // ===== OBTENER USUARIO ACTUAL =====
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/usuarios/authenticate', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Usuario no autenticado');
            
            const userData = await response.json();
            CONFIG.userId = userData.id_user;
            console.log('👤 Usuario identificado:', CONFIG.userId);
            
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            throw error;
        }
    }

    // ===== CARGAR PRECIOS DESDE BASE DE DATOS =====
    async function loadPricesFromDatabase() {
        try {
            const response = await fetch(CONFIG.endpoints.getCarrerasPrices, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Error cargando precios');
            
            const data = await response.json();
            
            if (data.success && data.carreras) {
                CONFIG.prices = {};
                data.carreras.forEach(carrera => {
                    CONFIG.prices[carrera.id] = {
                        id: carrera.id,
                        nombre: carrera.nombre,
                        monthly: carrera.prices.monthly,
                        yearly: carrera.prices.yearly,
                        yearlyDiscount: carrera.prices.yearlyDiscountPercent
                    };
                });
                
                console.log('💰 Precios cargados desde BD:', Object.keys(CONFIG.prices).length, 'carreras');
            }
            
        } catch (error) {
            console.error('Error cargando precios:', error);
            showBeautifulNotification('error', '🦫 No pude cargar los precios... mi cerebro de capibara necesita un respiro');
        }
    }

    // ===== CONFIGURAR ARGENTINA COMO PAÍS FIJO =====
    function setupArgentinaSelector() {
        const countrySelect = document.getElementById('countrySelect');
        const customSelect = document.querySelector('.custom-select');
        
        if (countrySelect) {
            countrySelect.value = 'AR';
            countrySelect.disabled = true;
        }
        
        if (customSelect) {
            const selectSelected = customSelect.querySelector('.select-selected');
            const selectItems = customSelect.querySelector('.select-items');
            
            if (selectSelected) {
                selectSelected.innerHTML = `
                    <img src="/images/flags/ar.png" alt="Argentina" class="flag-img">
                    <span>Argentina</span>
                `;
                selectSelected.style.opacity = '0.7';
                selectSelected.style.cursor = 'not-allowed';
            }
            
            if (selectItems) {
                selectItems.style.display = 'none';
            }
            
            customSelect.style.pointerEvents = 'none';
            customSelect.title = "Solo disponible en Argentina por ahora";
        }
    }

    // ===== CONFIGURAR EVENT LISTENERS =====
    function setupEventListeners() {
        const monthlyBtn = document.getElementById('monthlyBtn');
        const yearlyBtn = document.getElementById('yearlyBtn');
        
        if (monthlyBtn) {
            monthlyBtn.addEventListener('click', () => setCycle('month'));
        }
        
        if (yearlyBtn) {
            yearlyBtn.addEventListener('click', () => setCycle('year'));
        }
        
        document.addEventListener('click', handleComprarClick);
        
        const chooseAvaBtn = document.getElementById('chooseAvaBtn');
        if (chooseAvaBtn) {
            chooseAvaBtn.addEventListener('click', () => {
                const carouselContainer = document.querySelector('.carousel-container');
                if (carouselContainer) {
                    carouselContainer.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (notificationModal) {
                    closeBeautifulNotification();
                } else if (previewModal) {
                    closePreviewModal();
                } else if (currentPaymentModal) {
                    closePaymentModal();
                }
            }
        });
    }

    // ===== MANEJAR CLICK EN BOTÓN COMPRAR =====
    function handleComprarClick(e) {
        const comprarBtn = e.target.closest('.comprar-btn');
        if (!comprarBtn || isPaymentProcessing) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const carreraId = comprarBtn.getAttribute('data-id');
        const carreraNombre = comprarBtn.getAttribute('data-producto');
        
        if (!carreraId || !CONFIG.prices[carreraId]) {
            showBeautifulNotification('error', '🦫 No encontré los datos de esta carrera... mi memoria de capibara falló');
            return;
        }
        
        // ✅ VERIFICAR SI YA TIENE ESTA CARRERA EN PROCESAMIENTO
        checkCarreraProcessingStatus(carreraId, carreraNombre);
    }

async function checkCarreraProcessingStatus(carreraId, carreraNombre) {
    try {
        // ✅ CORREGIDO: Usar /api/compra en lugar de /api/user-data
        const response = await fetch(`/api/compra/carrera/status/${CONFIG.userId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Error verificando estado');
        
        const data = await response.json();
        
        // Verificar si la carrera específica está en procesamiento
        const isProcessing = data.data.processing.carreras.some(c => c.id_carrera == carreraId);
        
        if (isProcessing) {
            showCarreraAlreadyProcessingModal(carreraNombre);
            return;
        }
        
        // Si no está en procesamiento, proceder con la compra normal
        CONFIG.selectedCarrera = {
            id: carreraId,
            nombre: carreraNombre,
            precio: CONFIG.prices[carreraId][CONFIG.currentCycle === 'month' ? 'monthly' : 'yearly']
        };
        
        openPaymentModal();
        
    } catch (error) {
        console.error('Error verificando estado de procesamiento:', error);
        // En caso de error, proceder normalmente
        CONFIG.selectedCarrera = {
            id: carreraId,
            nombre: carreraNombre,
            precio: CONFIG.prices[carreraId][CONFIG.currentCycle === 'month' ? 'monthly' : 'yearly']
        };
        
        openPaymentModal();
    }
}

// ===== NUEVA FUNCIÓN: Modal cuando la carrera ya está en procesamiento =====
function showCarreraAlreadyProcessingModal(carreraNombre) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal-overlay';
    
    modal.innerHTML = `
        <div class="payment-modal already-processing-modal">
            <div class="payment-modal-header">
                <h3>⏳ Ya tienes esta carrera en proceso</h3>
                <button class="close-btn" type="button">×</button>
            </div>
            
            <div class="payment-modal-body">
                <div class="already-processing-content">
                    <div class="capybara-message">
                        <div class="capybara-avatar">🦫</div>
                        <div class="capybara-text">
                            <p><strong>¡Ey! Soy el Profesor Acadel</strong></p>
                            <p>Ya tienes un pago en revisión para <strong>${carreraNombre}</strong>. 
                            No puedes comprar la misma carrera dos veces. ¡Soy muy organizado para permitir eso!</p>
                        </div>
                    </div>
                    
                    <div class="suggestion-box">
                        <h4>💡 ¿Qué puedes hacer?</h4>
                        <ul>
                            <li>🕐 Esperar a que aprobemos tu transferencia (12-24 hrs)</li>
                            <li>📧 Revisar tu email por actualizaciones</li>
                            <li>💬 Contactar soporte si tienes dudas</li>
                            <li>🦫 Relajarte como un capibara mientras procesamos</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="payment-footer">
                <div class="footer-actions">
                    <button class="secondary-btn contact-support-btn-alt" type="button">
                        💬 Contactar Soporte
                    </button>
                    <button class="primary-btn close-modal-btn" type="button">
                        👍 Entendido
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // ✅ CORRECCIÓN CSP: Usar addEventListener en lugar de onclick
    const closeBtn = modal.querySelector('.close-btn');
    const closePrimaryBtn = modal.querySelector('.close-modal-btn');
    const contactSupportBtn = modal.querySelector('.contact-support-btn-alt');
    const modalContent = modal.querySelector('.payment-modal');
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    
    closeBtn?.addEventListener('click', closeModal);
    closePrimaryBtn?.addEventListener('click', closeModal);
    
    // ✅ NUEVO: Event listener para contactar soporte
    contactSupportBtn?.addEventListener('click', () => {
        window.location.href = '/contact';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    modalContent?.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

    // ===== CAMBIAR CICLO DE FACTURACIÓN =====
    function setCycle(cycle) {
        if (CONFIG.currentCycle === cycle) return;
        
        CONFIG.currentCycle = cycle;
        
        const monthlyBtn = document.getElementById('monthlyBtn');
        const yearlyBtn = document.getElementById('yearlyBtn');
        
        if (monthlyBtn && yearlyBtn) {
            monthlyBtn.classList.toggle('active', cycle === 'month');
            yearlyBtn.classList.toggle('active', cycle === 'year');
        }
        
        updatePricesDisplay();
        console.log('🔄 Ciclo cambiado a:', cycle);
    }

    // ===== ACTUALIZAR PRECIOS EN LA UI =====
    function updatePricesDisplay() {
        Object.values(CONFIG.prices).forEach(carrera => {
            const priceElement = document.querySelector(`[data-product="${carrera.nombre}"] .price`);
            if (priceElement) {
                const precio = CONFIG.currentCycle === 'month' ? carrera.monthly : carrera.yearly;
                priceElement.textContent = `$${precio} ARS`;
                
                if (CONFIG.currentCycle === 'year') {
                    priceElement.innerHTML = `$${precio} ARS <small style="display: block; font-size: 0.7em; color: #4caf50;">Ahorra ${carrera.yearlyDiscount}%</small>`;
                }
            }
        });
    }

    // ===== ABRIR MODAL DE SELECCIÓN DE PAGO - CORREGIDO =====
    function openPaymentModal() {
        if (!CONFIG.selectedCarrera) return;
        
        console.log('🇦🇷 Abriendo modal de selección de pago...');
        
        const modal = createPaymentModal();
        document.body.appendChild(modal);
        currentPaymentModal = modal;
        
        // CORRECCIÓN: Configurar eventos ANTES de mostrar el modal
        setupModalEventListeners(modal);
        
        setTimeout(() => {
            modal.classList.add('show');
            console.log('🇦🇷 Modal de pago mostrado');
        }, 10);
    }

    // ===== CREAR MODAL DE SELECCIÓN DE PAGO - ESTRUCTURA CORREGIDA =====
    function createPaymentModal() {
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay';
        
        const cycleName = CONFIG.currentCycle === 'month' ? 'Mensual' : 'Anual';
        
        modal.innerHTML = `
            <div class="payment-modal">
                <div class="payment-modal-header">
                    <h3>💳 Método de Pago</h3>
                    <button class="close-btn" type="button">×</button>
                </div>
                
                <div class="payment-modal-body">
                    <div class="payment-summary">
                        <h4>📋 Resumen del pedido:</h4>
                        <div class="summary-content">
                            <div class="summary-item">
                                <span class="item-name">${CONFIG.selectedCarrera.nombre}</span>
                                <span class="item-price">$${CONFIG.selectedCarrera.precio} ARS</span>
                            </div>
                            <div class="summary-cycle">Plan ${cycleName}</div>
                            <div class="summary-total">
                                <strong>Total: $${CONFIG.selectedCarrera.precio} ARS</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="payment-options">
                        <button class="payment-option uala-option" type="button">
                            <div class="option-icon">💳</div>
                            <div class="option-content">
                                <h4>Pagar con Ualá</h4>
                                <p>Pago online seguro con tarjeta</p>
                                <small>Procesamiento inmediato</small>
                            </div>
                            <div class="option-arrow">→</div>
                        </button>
                        
                        <button class="payment-option transfer-option" type="button">
                            <div class="option-icon">🏦</div>
                            <div class="option-content">
                                <h4>Transferencia Bancaria</h4>
                                <p>Pago manual con verificación</p>
                                <small>Procesamiento en 12 horas</small>
                            </div>
                            <div class="option-arrow">→</div>
                        </button>
                    </div>
                </div>
                
                <div class="payment-footer">
                    <small>🦫 Elige el método que más te convenga, ambos son seguros</small>
                </div>
            </div>
        `;
        
        return modal;
    }

    // ===== CONFIGURAR EVENT LISTENERS PARA MODALES - COMPLETAMENTE CORREGIDO =====
    function setupModalEventListeners(modal) {
        console.log('🇦🇷 Configurando event listeners del modal...');
        
        // Prevenir cierre al hacer click dentro del modal
        const paymentModalContent = modal.querySelector('.payment-modal');
        if (paymentModalContent) {
            paymentModalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Click fuera del modal para cerrar
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('🇦🇷 Click fuera del modal - cerrando...');
                closePaymentModal();
            }
        });

        // Botón cerrar
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🇦🇷 Click en botón cerrar');
                closePaymentModal();
            });
        } else {
            console.warn('🇦🇷 No se encontró el botón cerrar');
        }

        // Opción Ualá
        const ualaOption = modal.querySelector('.uala-option');
        if (ualaOption) {
            ualaOption.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🇦🇷 Click en opción Ualá');
                processUalaPayment();
            });
        } else {
            console.warn('🇦🇷 No se encontró la opción Ualá');
        }

        // Opción transferencia - SOLUCIÓN COMPLETA
        const transferOption = modal.querySelector('.transfer-option');
        if (transferOption) {
            transferOption.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🇦🇷 Click en transferencia bancaria - CORREGIDO');
                
                // Cerrar el modal actual y abrir el de transferencia
                console.log('🇦🇷 Cerrando modal actual...');
                closePaymentModal();
                
                // Tiempo más largo para asegurar que el modal se cierre completamente
                setTimeout(() => {
                    console.log('🇦🇷 Abriendo modal de transferencia...');
                    openTransferModal();
                }, 400); // Aumentamos el tiempo
            });
            console.log('🇦🇷 Event listener de transferencia configurado correctamente');
        } else {
            console.error('🇦🇷 ERROR: No se encontró la opción de transferencia');
        }
    }

async function checkProcessingSubscriptions() {
    try {
        if (!CONFIG.userId) return;
        
        // ✅ CORREGIDO: Usar /api/compra en lugar de /api/user-data
        const response = await fetch(`/api/compra/carrera/processing/${CONFIG.userId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.count > 0) {
            showProcessingSubscriptionsModal(data.data);
        }
        
    } catch (error) {
        console.error('Error verificando suscripciones en procesamiento:', error);
    }
}

    // ===== NUEVA FUNCIÓN: Modal para mostrar suscripciones en procesamiento =====
    function showProcessingSubscriptionsModal(processingSubscriptions) {
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay processing-info-modal';
        
        const subscriptionsList = processingSubscriptions.map(sub => `
            <div class="processing-item">
                <div class="processing-item-header">
                    <h4>📚 ${sub.nombre}</h4>
                    <span class="processing-status">🔄 En procesamiento</span>
                </div>
                <div class="processing-item-details">
                    <p><strong>💰 Monto:</strong> $${sub.amount} ARS</p>
                    <p><strong>📅 Enviado:</strong> ${new Date(sub.payment_date).toLocaleDateString('es-AR')}</p>
                    <p><strong>💳 Método:</strong> ${sub.payment_method === 'bank_transfer' ? 'Transferencia Bancaria' : 'Tarjeta'}</p>
                </div>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="payment-modal processing-modal">
                <div class="payment-modal-header">
                    <h3>⏳ Tienes pagos en revisión</h3>
                    <button class="close-btn" type="button">×</button>
                </div>
                
                <div class="payment-modal-body">
                    <div class="processing-info">
                        <div class="capybara-message">
                            <div class="capybara-avatar">🦫</div>
                            <div class="capybara-text">
                                <p><strong>¡Hola! Soy el Profesor Acadel</strong></p>
                                <p>Veo que tienes ${processingSubscriptions.length} suscripción${processingSubscriptions.length > 1 ? 'es' : ''} en procesamiento. 
                                Mientras revisamos tu pago, estas carreras no aparecerán disponibles para compra.</p>
                            </div>
                        </div>
                        
                        <div class="processing-list">
                            ${subscriptionsList}
                        </div>
                        
                        <div class="processing-timeline">
                            <h4>📋 ¿Qué sigue?</h4>
                            <div class="timeline-steps">
                                <div class="timeline-step completed">
                                    <div class="step-icon">✅</div>
                                    <div class="step-content">
                                        <h5>Transferencia enviada</h5>
                                        <p>Ya recibimos tu comprobante</p>
                                    </div>
                                </div>
                                <div class="timeline-step current">
                                    <div class="step-icon">🔍</div>
                                    <div class="step-content">
                                        <h5>Revisión en proceso</h5>
                                        <p>Verificando los datos (12-24 hrs)</p>
                                    </div>
                                </div>
                                <div class="timeline-step pending">
                                    <div class="step-icon">🎉</div>
                                    <div class="step-content">
                                        <h5>Activación automática</h5>
                                        <p>Te avisaremos por email</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="payment-footer">
                    <p>💡 <strong>Tip:</strong> Recibirás un email cuando tu suscripción sea aprobada</p>
                    <div class="footer-actions">
                        <button class="secondary-btn contact-support-btn" type="button">
                            💬 Contactar Soporte
                        </button>
                        <button class="primary-btn close-processing-modal" type="button">
                            👍 Entendido
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // ✅ CORRECCIÓN CSP: Usar addEventListener en lugar de onclick
        const closeBtn = modal.querySelector('.close-btn');
        const closePrimaryBtn = modal.querySelector('.close-processing-modal');
        const contactSupportBtn = modal.querySelector('.contact-support-btn');
        const modalContent = modal.querySelector('.payment-modal');
        
        function closeModal() {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
        
        closeBtn?.addEventListener('click', closeModal);
        closePrimaryBtn?.addEventListener('click', closeModal);
        
        // ✅ NUEVO: Event listener para contactar soporte
        contactSupportBtn?.addEventListener('click', () => {
            window.location.href = '/contact';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        modalContent?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // ===== PROCESAR PAGO CON UALÁ =====
    async function processUalaPayment() {
        if (isPaymentProcessing || !CONFIG.selectedCarrera) return;
        
        isPaymentProcessing = true;
        closePaymentModal();
        showLoadingModal('uala');
        
        try {
            const requestData = {
                carreraId: parseInt(CONFIG.selectedCarrera.id),
                billingCycle: CONFIG.currentCycle
            };
            
            console.log('🔄 Enviando a Ualá:', requestData);
            
            const response = await fetch(CONFIG.endpoints.createUala, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            console.log('📥 Respuesta Ualá:', data);
            
            if (data.success && data.paymentUrl) {
                updateLoadingModal('redirect');
                
                setTimeout(() => {
                    window.open(data.paymentUrl, '_blank');
                }, 1500);
                
            } else {
                handleUalaError(data);
            }
            
        } catch (error) {
            console.error('❌ Error en pago Ualá:', error);
            handleUalaError({ error: 'Error de conexión' });
        }
    }

    // ===== MANEJAR ERRORES DE UALÁ =====
    function handleUalaError(errorData) {
        closeLoadingModal();
        isPaymentProcessing = false;
        
        const errorMsg = errorData.details?.message || errorData.error || ACADEL_MESSAGES.error;
        showBeautifulNotification('error', `🦫 ${errorMsg}`, 'Error en el pago');
        
        setTimeout(() => {
            showAlternativeOptionsModal(errorData);
        }, 2000);
    }

    // ===== MOSTRAR MODAL DE OPCIONES ALTERNATIVAS =====
    function showAlternativeOptionsModal(errorData) {
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay';
        
        modal.innerHTML = `
            <div class="payment-modal alternative-modal">
                <div class="payment-modal-header">
                    <h3>🦫 Opciones Alternativas</h3>
                    <button class="close-btn" type="button">×</button>
                </div>
                
                <div class="payment-modal-body">
                    <div class="alternative-content">
                        <p>El pago con tarjeta no está disponible en este momento.</p>
                        <p><strong>¿Qué prefieres hacer?</strong></p>
                    </div>
                    
                    <div class="payment-options">
                        <button class="payment-option transfer-option-alt" type="button">
                            <div class="option-icon">🏦</div>
                            <div class="option-content">
                                <h4>Transferencia Bancaria</h4>
                                <p>Opción más confiable</p>
                            </div>
                        </button>
                        
                        <button class="payment-option retry-option" type="button">
                            <div class="option-icon">🔄</div>
                            <div class="option-content">
                                <h4>Intentar de Nuevo</h4>
                                <p>Reintentar pago con tarjeta</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const paymentModalContent = modal.querySelector('.payment-modal');
        const closeBtn = modal.querySelector('.close-btn');
        const transferBtn = modal.querySelector('.transfer-option-alt');
        const retryBtn = modal.querySelector('.retry-option');
        
        if (paymentModalContent) {
            paymentModalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
            });
        }
        
        if (transferBtn) {
            transferBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
                setTimeout(() => openTransferModal(), 100);
            });
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
                retryUalaPayment();
            });
        }
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // ===== REINTENTAR PAGO UALÁ =====
    function retryUalaPayment() {
        setTimeout(() => processUalaPayment(), 500);
    }

    // ===== ABRIR MODAL DE TRANSFERENCIA - COMPLETAMENTE DEBUGEADO =====
    function openTransferModal() {
        console.log('🇦🇷 Abriendo modal de transferencia (DEBUGGING COMPLETO)...');
        
        if (!CONFIG.selectedCarrera) {
            console.error('🇦🇷 No hay carrera seleccionada');
            return;
        }
        
        console.log('🇦🇷 Carrera seleccionada:', CONFIG.selectedCarrera);
        
        const modal = createTransferModal();
        console.log('🇦🇷 Modal creado, agregando al DOM...');
        
        document.body.appendChild(modal);
        currentPaymentModal = modal;
        
        console.log('🇦🇷 Modal agregado al DOM, configurando eventos...');
        
        // Configurar eventos
        setupTransferModalEvents(modal);
        
        console.log('🇦🇷 Eventos configurados, configurando elementos internos...');
        
        // Configurar fecha actual y file input - con más tiempo
        setTimeout(() => {
            const transferDateInput = modal.querySelector('#transferDate');
            if (transferDateInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                transferDateInput.value = now.toISOString().slice(0, 16);
                console.log('🇦🇷 Fecha configurada:', transferDateInput.value);
            }
            
            const fileInput = modal.querySelector('.file-input-custom');
            if (fileInput) {
                console.log('🇦🇷 Configurando file input...');
                
                // DEBUG: Verificar estructura del HTML
                const formGroup = fileInput.closest('.form-group');
                if (formGroup) {
                    console.log('🇦🇷 Estructura del form-group:', formGroup.innerHTML.substring(0, 200) + '...');
                    console.log('🇦🇷 Elementos en form-group:', {
                        fileInput: !!formGroup.querySelector('.file-input-custom'),
                        label: !!formGroup.querySelector('.file-input-label'),
                        loading: !!formGroup.querySelector('.file-loading'),
                        preview: !!formGroup.querySelector('.file-preview')
                    });
                }
                
                setupFileInput(fileInput);
            } else {
                console.error('🇦🇷 No se encontró el file input');
                console.log('🇦🇷 HTML del modal:', modal.innerHTML.substring(0, 500) + '...');
            }
        }, 300); // Aumentamos el tiempo
        
        // Mostrar modal - con más tiempo para asegurar que todo está listo
        setTimeout(() => {
            console.log('🇦🇷 Mostrando modal de transferencia...');
            modal.classList.add('show');
            console.log('🇦🇷 Modal de transferencia mostrado correctamente');
            
            // Verificación final
            setTimeout(() => {
                const fileInputCheck = modal.querySelector('.file-input-custom');
                console.log('🇦🇷 Verificación final - file input existe:', !!fileInputCheck);
            }, 100);
        }, 100);
    }

    // ===== CREAR MODAL DE TRANSFERENCIA - CON OVERLAY INTERNO =====
    function createTransferModal() {
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay';
        
        modal.innerHTML = `
            <div class="payment-modal transfer-modal">
                <div class="payment-modal-header">
                    <h3>🏦 Transferencia Bancaria</h3>
                    <button class="close-btn" type="button">×</button>
                </div>
                
                <div class="payment-modal-body">
                    <div class="bank-instructions">
                        <h4>📋 Datos para la transferencia:</h4>
                        <div class="bank-details">
                            <p><strong>Banco:</strong> ${BANK_DATA.bank}</p>
                            <p><strong>CBU:</strong> ${BANK_DATA.cbu}</p>
                            <p><strong>Alias:</strong> ${BANK_DATA.alias}</p>
                            <p><strong>Titular:</strong> ${BANK_DATA.holder}</p>
                            <p><strong>Monto:</strong> $${CONFIG.selectedCarrera.precio} ARS</p>
                        </div>
                    </div>

                    <form id="transferForm" class="transfer-form">
                        <div class="form-group">
                            <label for="accountHolder">👤 Titular de la cuenta que transfiere *</label>
                            <input type="text" id="accountHolder" name="accountHolder" required 
                                   placeholder="Nombre completo del titular">
                        </div>

                        <div class="form-group">
                            <label for="amount">💰 Monto transferido (ARS) *</label>
                            <input type="number" id="amount" name="amount" step="0.01" required 
                                   value="${CONFIG.selectedCarrera.precio}" readonly>
                        </div>

                        <div class="form-group">
                            <label for="transferDate">📅 Fecha y hora de transferencia *</label>
                            <input type="datetime-local" id="transferDate" name="transferDate" required>
                        </div>

                        <div class="form-group">
                            <label for="reference">🧾 Número de comprobante *</label>
                            <input type="text" id="reference" name="referenceNumber" required 
                                   placeholder="Ej: 123456789">
                        </div>

                        <div class="form-group">
                            <label for="transferProof">📎 Comprobante de transferencia *</label>
                            <div class="file-input-container">
                                <input type="file" id="transferProof" name="transferProof" 
                                       accept=".jpg,.jpeg,.png,.pdf" required class="file-input-custom">
                                <label for="transferProof" class="file-input-label">
                                    <i class="bx bx-cloud-upload file-input-icon"></i>
                                    <div class="file-input-text">
                                        <strong>Haz click o arrastra tu comprobante aquí</strong>
                                        <br><small>Máximo 5MB • JPG, PNG, PDF</small>
                                    </div>
                                </label>
                            </div>
                            
                            <div class="file-loading">
                                <div class="file-loading-spinner"></div>
                                <span class="file-loading-text">🦫 Subiendo como un capibara organizado...</span>
                            </div>
                            
                            <div class="file-preview">
                                <div class="file-preview-content">
                                    <i class="bx bx-check-circle file-preview-icon"></i>
                                    <div class="file-preview-info">
                                        <div class="file-preview-name"></div>
                                        <div class="file-preview-size"></div>
                                    </div>
                                    <div class="file-preview-actions">
                                        <button type="button" class="file-preview-btn file-preview-view">
                                            👁️ Ver
                                        </button>
                                        <button type="button" class="file-preview-btn file-preview-remove">
                                            🗑️ Quitar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="submit-btn">
                            🚀 Enviar Transferencia
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        return modal;
    }

    // ===== CONFIGURAR EVENTOS DEL MODAL DE TRANSFERENCIA =====
    function setupTransferModalEvents(modal) {
        // Prevenir cierre al hacer click dentro del modal
        const paymentModalContent = modal.querySelector('.payment-modal');
        if (paymentModalContent) {
            paymentModalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Click fuera del modal para cerrar
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePaymentModal();
            }
        });

        // Botón cerrar
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePaymentModal();
            });
        }

        // Formulario de transferencia
        const transferForm = modal.querySelector('#transferForm');
        if (transferForm) {
            transferForm.addEventListener('submit', handleTransferSubmit);
        }
    }

    // ===== CONFIGURAR INPUT DE ARCHIVO - COMPLETAMENTE CORREGIDO =====
    function setupFileInput(fileInput) {
        console.log('🇦🇷 Iniciando setupFileInput CORREGIDO...', fileInput);
        
        // Buscar elementos por el contenedor padre
        const container = fileInput.closest('.form-group');
        if (!container) {
            console.error('🇦🇷 No se encontró el contenedor del file input');
            return;
        }
        
        console.log('🇦🇷 Contenedor encontrado:', container);
        
        const label = container.querySelector('.file-input-label');
        const loading = container.querySelector('.file-loading');
        const preview = container.querySelector('.file-preview');
        
        console.log('🇦🇷 Elementos encontrados:', { label, loading, preview });
        
        if (!label || !loading || !preview) {
            console.error('🇦🇷 No se encontraron todos los elementos necesarios para el file input');
            return;
        }
        
        // Crear overlay de loading DENTRO del label para evitar reposicionamiento
        let loadingOverlay = label.querySelector('.file-loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'file-loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="file-loading-content">
                    <div class="file-loading-spinner"></div>
                    <span>🦫 Subiendo...</span>
                </div>
            `;
            label.appendChild(loadingOverlay);
        }
        
        console.log('🇦🇷 Configurando eventos de drag and drop...');
        
        // Mejorar drag and drop con animaciones y contador de eventos
        let dragCounter = 0;
        
        label.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (dragCounter === 1) {
                label.classList.add('dragover');
            }
        });
        
        label.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                label.classList.remove('dragover');
            }
        });
        
        label.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        label.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            label.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                console.log('🇦🇷 Archivo dropeado:', files[0].name);
                handleFileSelect(files[0], fileInput, label, loading, preview, loadingOverlay);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('🇦🇷 Archivo seleccionado:', file.name);
                handleFileSelect(file, fileInput, label, loading, preview, loadingOverlay);
            }
        });
        
        // Preview actions
        preview.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-preview-view')) {
                console.log('🇦🇷 Ver archivo:', uploadedFile?.name);
                showFilePreview(uploadedFile);
            } else if (e.target.classList.contains('file-preview-remove')) {
                console.log('🇦🇷 Remover archivo');
                removeFile(fileInput, label, preview, loadingOverlay);
            }
        });
        
        console.log('🇦🇷 setupFileInput completado exitosamente');
    }

    // ===== MANEJAR SELECCIÓN DE ARCHIVO - VERSIÓN CORREGIDA =====
    function handleFileSelect(file, fileInput, label, loading, preview, loadingOverlay) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        
        if (file.size > maxSize) {
            showBeautifulNotification('error', '🦫 El archivo es muy grande. Máximo 5MB como mi apetito de capibara.', 'Archivo muy grande');
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            showBeautifulNotification('error', '🦫 Formato no válido. Solo JPG, PNG o PDF como mis documentos ordenados.', 'Formato no válido');
            return;
        }
        
        console.log('🇦🇷 Procesando archivo:', file.name);
        
        // CAMBIO PRINCIPAL: No ocultar el label, solo añadir clase y mostrar overlay
        label.classList.add('uploading');
        loadingOverlay.classList.add('show');
        
        // Simular carga del archivo
        setTimeout(() => {
            uploadedFile = file;
            
            // Actualizar preview
            const fileName = preview.querySelector('.file-preview-name');
            const fileSize = preview.querySelector('.file-preview-size');
            
            if (fileName) fileName.textContent = file.name;
            if (fileSize) fileSize.textContent = formatFileSize(file.size);
            
            // Quitar loading y mostrar preview
            label.classList.remove('uploading');
            label.classList.add('has-file');
            loadingOverlay.classList.remove('show');
            preview.classList.add('show');
            
            // Actualizar texto del label MANTENIENDO LA ESTRUCTURA
            const labelText = label.querySelector('.file-input-text');
            if (labelText) {
                labelText.innerHTML = `
                    <strong>✅ Archivo cargado exitosamente</strong>
                    <br><small>Haz click para cambiar archivo</small>
                `;
            }
            
            showBeautifulNotification('success', ACADEL_MESSAGES.fileUploaded, '¡Perfecto!');
            console.log('🇦🇷 Archivo procesado exitosamente');
            
        }, 1500);
    }

    // ===== MOSTRAR PREVIEW DEL ARCHIVO =====
    function showFilePreview(file) {
        if (!file) return;
        
        previewModal = document.createElement('div');
        previewModal.className = 'preview-modal-overlay';
        
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        previewModal.innerHTML = `
            <div class="preview-modal-content">
                <div class="preview-modal-header">
                    <h4>📎 ${file.name}</h4>
                    <button class="preview-modal-close" type="button">×</button>
                </div>
                <div class="preview-modal-body">
                    ${isImage ? `<img src="${URL.createObjectURL(file)}" alt="Preview" class="preview-image">` : ''}
                    ${isPDF ? `<iframe src="${URL.createObjectURL(file)}" class="preview-pdf"></iframe>` : ''}
                    ${!isImage && !isPDF ? `<div class="preview-unsupported">Vista previa no disponible para este tipo de archivo</div>` : ''}
                </div>
            </div>
        `;
        
        const closeBtn = previewModal.querySelector('.preview-modal-close');
        const modalContent = previewModal.querySelector('.preview-modal-content');
        
        closeBtn.addEventListener('click', closePreviewModal);
        
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                closePreviewModal();
            }
        });
        
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.body.appendChild(previewModal);
        setTimeout(() => previewModal.classList.add('show'), 10);
    }

    // ===== CERRAR MODAL DE PREVIEW =====
    function closePreviewModal() {
        if (previewModal) {
            previewModal.classList.remove('show');
            setTimeout(() => {
                if (previewModal.parentNode) {
                    previewModal.parentNode.removeChild(previewModal);
                }
                previewModal = null;
            }, 300);
        }
    }

    // ===== REMOVER ARCHIVO - VERSIÓN CORREGIDA =====
    function removeFile(fileInput, label, preview, loadingOverlay) {
        console.log('🇦🇷 Removiendo archivo...');
        uploadedFile = null;
        fileInput.value = '';
        
        // Remover clases y resetear estado
        preview.classList.remove('show');
        label.classList.remove('has-file', 'uploading');
        loadingOverlay.classList.remove('show');
        
        // Restaurar texto original
        const labelText = label.querySelector('.file-input-text');
        if (labelText) {
            labelText.innerHTML = `
                <strong>Haz click o arrastra tu comprobante aquí</strong>
                <br><small>Máximo 5MB • JPG, PNG, PDF</small>
            `;
        }
        console.log('🇦🇷 Archivo removido exitosamente');
    }

    // ===== FORMATEAR TAMAÑO DE ARCHIVO =====
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== MANEJAR ENVÍO DE TRANSFERENCIA =====
    async function handleTransferSubmit(e) {
        e.preventDefault();
        
        if (isPaymentProcessing) return;
        
        if (!uploadedFile) {
            showBeautifulNotification('error', '🦫 ¡Ey! Falta subir el comprobante. Soy muy organizado para olvidar eso.', 'Falta comprobante');
            return;
        }
        
        isPaymentProcessing = true;
        
        const submitBtn = e.target.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '🔄 Enviando...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(e.target);
            formData.append('carreraId', CONFIG.selectedCarrera.id);
            formData.append('billingCycle', CONFIG.currentCycle);
            
            console.log('📤 Enviando transferencia...');
            
            const response = await fetch(CONFIG.endpoints.submitTransfer, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            const data = await response.json();
            console.log('📥 Respuesta transferencia:', data);
            
            if (data.success) {
                closePaymentModal();
                showBeautifulNotification('success', ACADEL_MESSAGES.transferSuccess, '¡Transferencia enviada!');
                
                CONFIG.selectedCarrera = null;
                uploadedFile = null;
                
                if (window.refreshCarreras) {
                    setTimeout(() => window.refreshCarreras(), 2000);
                }
                
            } else {
                throw new Error(data.error || 'Error en transferencia');
            }
            
        } catch (error) {
            console.error('❌ Error en transferencia:', error);
            showBeautifulNotification('error', `🦫 Error: ${error.message}`, 'Error en transferencia');
            
        } finally {
            isPaymentProcessing = false;
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // ===== MOSTRAR MODAL DE CARGA =====
    function showLoadingModal(type = 'uala') {
        if (loadingModal) return;
        
        loadingModal = document.createElement('div');
        loadingModal.className = 'payment-modal-overlay loading-modal';
        
        loadingModal.innerHTML = `
            <div class="payment-modal loading-content">
                <div class="loading-animation">
                    <div class="spinner"></div>
                    <div class="capybara-emoji">🦫</div>
                </div>
                
                <h3 id="loadingTitle">${ACADEL_MESSAGES.ualaProcessing}</h3>
                <p id="loadingDescription">No cierres esta ventana...</p>
                
                <button class="cancel-btn cancel-btn-persistent" type="button">
                    😢 Me arrepentí
                </button>
            </div>
        `;
        
        const cancelBtn = loadingModal.querySelector('.cancel-btn');
        const loadingContent = loadingModal.querySelector('.payment-modal');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cancelPayment();
            });
        }
        
        if (loadingContent) {
            loadingContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        document.body.appendChild(loadingModal);
        setTimeout(() => loadingModal.classList.add('show'), 10);
    }

    // ===== ACTUALIZAR MODAL DE CARGA =====
    function updateLoadingModal(status) {
        if (!loadingModal) return;
        
        const title = loadingModal.querySelector('#loadingTitle');
        const description = loadingModal.querySelector('#loadingDescription');
        
        if (status === 'redirect') {
            if (title) title.textContent = '🚀 Abriendo ventana de pago...';
            if (description) description.textContent = 'Te redirigimos a Ualá en un momento. Si cambias de opinión, el botón está abajo.';
        }
    }

    // ===== CANCELAR PAGO =====
    async function cancelPayment() {
        if (!loadingModal) return;
        
        try {
            showBeautifulNotification('info', ACADEL_MESSAGES.cancel, 'Pago cancelado');
            closeLoadingModal();
            isPaymentProcessing = false;
            CONFIG.selectedCarrera = null;
            
        } catch (error) {
            console.error('Error cancelando pago:', error);
        }
    }

    // ===== CERRAR MODAL DE CARGA =====
    function closeLoadingModal() {
        if (loadingModal) {
            loadingModal.classList.remove('show');
            setTimeout(() => {
                if (loadingModal.parentNode) {
                    loadingModal.parentNode.removeChild(loadingModal);
                }
                loadingModal = null;
            }, 300);
        }
    }

    // ===== CERRAR MODAL DE PAGO =====
    function closePaymentModal() {
        console.log('🇦🇷 Cerrando modal de pago...');
        if (currentPaymentModal) {
            currentPaymentModal.classList.remove('show');
            setTimeout(() => {
                if (currentPaymentModal && currentPaymentModal.parentNode) {
                    currentPaymentModal.parentNode.removeChild(currentPaymentModal);
                }
                currentPaymentModal = null;
                uploadedFile = null;
                console.log('🇦🇷 Modal de pago cerrado');
            }, 300);
        }
    }

    // ===== API PÚBLICA =====
    window.ArgentinaPagos = {
        initialize,
        processUalaPayment,
        openTransferModal,
        retryUalaPayment,
        closePaymentModal,
        cancelPayment,
        setCycle,
        updatePricesDisplay,
        isReady: () => CONFIG.userId !== null,
        getCurrentCycle: () => CONFIG.currentCycle,
        getPrices: () => CONFIG.prices,
        debug: {
            getConfig: () => CONFIG,
            getState: () => ({
                processing: isPaymentProcessing,
                selectedCarrera: CONFIG.selectedCarrera,
                userId: CONFIG.userId,
                uploadedFile: uploadedFile ? uploadedFile.name : null
            })
        }
    };

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();