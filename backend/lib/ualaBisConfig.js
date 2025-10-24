// backend/config/ualaBisConfig.js - ✅ VERSIÓN CON RETRY Y MEJOR ERROR HANDLING
import UalaApiCheckout from 'ualabis-nodejs';
import dotenv from 'dotenv';

dotenv.config();

class UalaBisConfig {
  constructor() {
    this.isConfigured = false;
    this.isDev = process.env.NODE_ENV !== 'production';
    this.lastRequestTime = 0;
    this.minDelay = 1000; // Mínimo 1 segundo entre requests
    
    this.credentials = {
      userName: this.isDev ? process.env.UALA_STAGE_USERNAME : process.env.UALA_USERNAME,
      clientId: this.isDev ? process.env.UALA_STAGE_CLIENT_ID : process.env.UALA_CLIENT_ID,
      clientSecret: this.isDev ? process.env.UALA_STAGE_CLIENT_SECRET : process.env.UALA_CLIENT_SECRET,
      isDev: this.isDev
    };

    console.log(`🏗️ Inicializando Ualá Bis (${this.isDev ? 'DESARROLLO' : 'PRODUCCIÓN'})`);
    this.initializeSDK();
  }

  async initializeSDK() {
    try {
      this.validateCredentials();

      await UalaApiCheckout.setUp({
        userName: this.credentials.userName,
        clientId: this.credentials.clientId,
        clientSecret: this.credentials.clientSecret,
        isDev: this.credentials.isDev
      });

      this.isConfigured = true;
      console.log(`✅ SDK Ualá Bis configurado exitosamente (${this.isDev ? 'DEV' : 'PROD'})`);
      
    } catch (error) {
      console.error('❌ Error configurando SDK Ualá Bis:', error);
      this.isConfigured = false;
    }
  }

  validateCredentials() {
    const requiredFields = ['userName', 'clientId', 'clientSecret'];
    const missingFields = requiredFields.filter(field => !this.credentials[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`❌ Faltan credenciales de Ualá Bis: ${missingFields.join(', ')}`);
    }

    console.log(`📋 Credenciales validadas para usuario: ${this.credentials.userName}`);
  }

  async ensureConfigured() {
    if (!this.isConfigured) {
      console.log('🔄 Reintentando configuración del SDK...');
      await this.initializeSDK();
    }
    
    if (!this.isConfigured) {
      throw new Error('SDK de Ualá Bis no está configurado correctamente');
    }
  }

  // ✅ NUEVA FUNCIÓN: Rate limiting para evitar spam
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: esperando ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // ✅ NUEVA FUNCIÓN: Retry logic
  async executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento ${attempt}/${maxRetries}`);
        
        // Enforcar rate limiting
        await this.enforceRateLimit();
        
        // Ejecutar operación
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ Éxito en intento ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        console.log(`❌ Intento ${attempt} falló:`, error.message);
        
        // Si es el último intento, no esperar
        if (attempt === maxRetries) {
          break;
        }
        
        // Calcular delay exponencial: 2^attempt segundos
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    throw lastError;
  }

  // ✅ NUEVA FUNCIÓN: Mejor análisis de errores
  analyzeError(error) {
    const errorInfo = {
      type: error.type || 'unknown',
      statusCode: error.statusCode || 'unknown',
      message: error.message || 'Error desconocido',
      isRetryable: false,
      userMessage: 'Error al procesar el pago'
    };

    // Determinar si el error es reintentable y el mensaje para el usuario
    if (error.statusCode === 500) {
      errorInfo.isRetryable = true;
      errorInfo.userMessage = 'Error temporal en Ualá Bis. Reintentando...';
    } else if (error.statusCode === 429) {
      errorInfo.isRetryable = true;
      errorInfo.userMessage = 'Demasiadas peticiones. Esperando...';
    } else if (error.statusCode === 503) {
      errorInfo.isRetryable = true;
      errorInfo.userMessage = 'Servicio temporalmente no disponible';
    } else if (error.message?.includes('timeout')) {
      errorInfo.isRetryable = true;
      errorInfo.userMessage = 'Conexión lenta. Reintentando...';
    } else if (error.message?.includes('network')) {
      errorInfo.isRetryable = true;
      errorInfo.userMessage = 'Problema de conectividad. Reintentando...';
    } else if (error.statusCode === 400) {
      errorInfo.isRetryable = false;
      errorInfo.userMessage = 'Error en los datos enviados';
    } else if (error.statusCode === 401) {
      errorInfo.isRetryable = false;
      errorInfo.userMessage = 'Error de autenticación con Ualá Bis';
    }

    return errorInfo;
  }

  async createOrder(orderData) {
    try {
      await this.ensureConfigured();

      console.log('📤 Creando orden con SDK oficial:', {
        amount: orderData.amount,
        description: orderData.description,
        ambiente: this.isDev ? 'desarrollo' : 'producción'
      });

      // ✅ Ejecutar con retry automático
      const order = await this.executeWithRetry(async () => {
        return await UalaApiCheckout.createOrder({
          amount: orderData.amount,
          description: orderData.description,
          callbackSuccess: orderData.callback_success,
          callbackFail: orderData.callback_fail,
          notificationUrl: orderData.notification_url,
          externalReference: orderData.external_reference
        });
      });

      console.log('🔍 ESTRUCTURA ORIGINAL DEL SDK:');
      console.log(JSON.stringify(order, null, 2));

      // Extraer URL de checkout
      const checkoutUrl = order.links?.checkoutLink;
      
      if (!checkoutUrl) {
        console.error('❌ No se encontró checkoutLink en order.links');
        throw new Error('No se pudo obtener URL de checkout de Ualá Bis');
      }

      console.log(`✅ URL de checkout extraída: ${checkoutUrl}`);

      // Crear estructura compatible
      const finalOrder = {
        uuid: order.uuid,
        status: order.status,
        amount: order.amount,
        orderNumber: order.orderNumber,
        currency: order.currency,
        links: {
          checkout_link: checkoutUrl
        }
      };

      console.log('✅ RESPUESTA FINAL PARA EL SERVICE:');
      console.log(JSON.stringify(finalOrder, null, 2));

      return finalOrder;

    } catch (error) {
      // ✅ Análisis detallado del error
      const errorInfo = this.analyzeError(error);
      
      console.error('❌ Error detallado creando orden:');
      console.error('Tipo:', errorInfo.type);
      console.error('Código:', errorInfo.statusCode);
      console.error('Mensaje:', errorInfo.message);
      console.error('Es reintentable:', errorInfo.isRetryable);
      console.error('Mensaje usuario:', errorInfo.userMessage);
      
      // Lanzar error con información mejorada
      const enhancedError = new Error(errorInfo.userMessage);
      enhancedError.originalError = error;
      enhancedError.statusCode = errorInfo.statusCode;
      enhancedError.isRetryable = errorInfo.isRetryable;
      
      throw enhancedError;
    }
  }

  async getOrder(uuid) {
    try {
      await this.ensureConfigured();
      
      console.log(`🔍 Obteniendo orden: ${uuid}`);
      
      // ✅ También con retry para consultas
      const order = await this.executeWithRetry(async () => {
        return await UalaApiCheckout.getOrder(uuid);
      }, 2); // Menos reintentos para consultas
      
      console.log(`✅ Orden obtenida: ${uuid} - Estado: ${order.status}`);
      return order;

    } catch (error) {
      const errorInfo = this.analyzeError(error);
      console.error(`❌ Error obteniendo orden ${uuid}:`, errorInfo);
      throw error;
    }
  }

  async getOrders(params = {}) {
    try {
      await this.ensureConfigured();
      
      console.log('📋 Obteniendo órdenes con parámetros:', params);
      const orders = await UalaApiCheckout.getOrders(params);
      
      console.log(`✅ ${orders.length || 0} órdenes obtenidas`);
      return orders;

    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error);
      throw error;
    }
  }

  getCallbackUrls(paymentId) {
    const baseUrl = process.env.DOMAIN_URL;
    return {
      success: `${baseUrl}/api/payments-arg/uala/callback/success?payment_id=${paymentId}`,
      fail: `${baseUrl}/api/payments-arg/uala/callback/fail?payment_id=${paymentId}`
    };
  }

  getWebhookUrl() {
    return process.env.HOOKDECK_WEBHOOK_URL;
  }

  getSDKStatus() {
    return {
      isConfigured: this.isConfigured,
      environment: this.isDev ? 'development' : 'production',
      userName: this.credentials.userName,
      clientId: this.credentials.clientId?.substring(0, 8) + '***',
      lastRequestTime: this.lastRequestTime,
      minDelay: this.minDelay
    };
  }
}

export const ualaBisConfig = new UalaBisConfig();