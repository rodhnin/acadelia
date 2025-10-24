// services/payment/paddleService.js
import pool from "../../lib/dbPool.js";
import { Environment, Paddle } from '@paddle/paddle-node-sdk';

// 🔧 CONFIGURACIÓN PARA LIVE con formato nuevo
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PADDLE_ENV = process.env.PADDLE_ENV || 'live';
const USE_PADDLE_PRODUCTION = PADDLE_ENV === 'live';

// 🔧 VERIFICACIÓN DE FORMATO DE API KEY
const API_KEY = process.env.PADDLE_SELLER_API_KEY;
const IS_NEW_FORMAT = API_KEY && API_KEY.startsWith('pdl_live_apikey_');

if (!IS_NEW_FORMAT) {
  console.error('❌ ERROR: API key debe tener formato nuevo (pdl_live_apikey_...)');
  console.error('   API Key actual:', API_KEY?.substring(0, 20) + '...');
  console.error('   Crea una nueva API key en Paddle Dashboard con formato nuevo');
  process.exit(1);
}

// Configuración
const paddleConfig = {
  // 🔧 NUEVO FORMATO: NO necesita vendor ID
  apiKey: API_KEY,
  environment: PADDLE_ENV,
  webhookSecret: process.env.PADDLE_WEBHOOK_SECRET
};

// 🔧 URL base basada en PADDLE_ENV
const PADDLE_API_BASE = USE_PADDLE_PRODUCTION
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

console.log('🔧 Paddle Configuration (LIVE - New Format):', {
  NODE_ENV: process.env.NODE_ENV,
  PADDLE_ENV: PADDLE_ENV,
  USE_PADDLE_PRODUCTION: USE_PADDLE_PRODUCTION,
  API_BASE: PADDLE_API_BASE,
  API_KEY_EXISTS: !!paddleConfig.apiKey,
  API_KEY_FORMAT: 'NEW_FORMAT',
  API_KEY_PREFIX: paddleConfig.apiKey?.substring(0, 25) + '...' || 'NO API KEY'
});

// 🔧 Inicialización del cliente Paddle (formato nuevo, sin vendor ID)
let paddle;
try {
  paddle = new Paddle(paddleConfig.apiKey, {
    // 🔧 NUEVO FORMATO: NO necesita vendor ID
    environment: USE_PADDLE_PRODUCTION ? Environment.production : Environment.sandbox,
    logLevel: IS_PRODUCTION ? 'error' : 'verbose'
  });
  
  console.log('✅ Paddle client initialized successfully (NEW FORMAT)');
} catch (error) {
  console.error('[Paddle Initialization Error]', {
    message: error.message,
    stack: error.stack,
    config: {
      hasApiKey: !!paddleConfig.apiKey,
      environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox',
      format: 'NEW_FORMAT'
    }
  });
  throw error;
}

export const PaddleService = {
  async testConnection() {
    try {
      console.log('🧪 Testing Paddle connection (NEW FORMAT)...');
      const response = await paddle.transactions.list({ limit: 1 });
      console.log('[Paddle Connection Test]', {
        success: true,
        dataReceived: !!response,
        environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox',
        format: 'NEW_FORMAT'
      });
      return true;
    } catch (error) {
      console.error('[Paddle Connection Test Failed]', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox',
        format: 'NEW_FORMAT'
      });
      
      // 🔧 DIAGNÓSTICO ESPECÍFICO DE PERMISOS
      if (error.response?.status === 403) {
        console.error('❌ ERROR DE PERMISOS:');
        console.error('   Tu API key no tiene los permisos necesarios');
        console.error('   Ve a Paddle Dashboard > API Keys y verifica que tenga:');
        console.error('   - Transactions (Read/Write)');
        console.error('   - Subscriptions (Read/Write)');
        console.error('   - Customers (Read/Write)');
        console.error('   - Customer portal sessions (Read/Write)');
      }
      
      return false;
    }
  },

  async verifyTransactionOwner(userId, transactionId) {
    try {
      const result = await pool.query(
        'SELECT 1 FROM historial_transacciones WHERE id_user = $1 AND transaction_id = $2',
        [userId, transactionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('[Verify Transaction Error]', {
        message: error.message,
        userId,
        transactionId
      });
      throw error;
    }
  },

  async updateSubscriptionStatus(subscriptionId, newStatus) {
    try {
      console.log('[DEBUG] Actualizando suscripción (NEW FORMAT):', { 
        subscriptionId, 
        newStatus
      });

      const currentSub = await pool.query(
        'SELECT * FROM suscripciones WHERE subscription_id = $1',
        [subscriptionId]
      );
      
      if (currentSub.rows.length === 0) {
        throw new Error('Suscripción no encontrada en base de datos local');
      }

      const validStates = ['active', 'canceled'];
      if (!validStates.includes(newStatus)) {
        throw new Error(`Estado ${newStatus} no válido. Estados permitidos: ${validStates.join(', ')}`);
      }

      let paddleResponse;
      try {
        switch(newStatus) {
          case 'active':
            paddleResponse = await paddle.subscriptions.update(subscriptionId, {
              scheduled_change: null
            });
            await pool.query(
              'UPDATE suscripciones SET status = $1, updated_at = NOW() WHERE subscription_id = $2',
              ['active', subscriptionId]
            );
            break;
            
          case 'canceled':
            paddleResponse = await paddle.subscriptions.cancel(subscriptionId, { 
              effective_from: 'next_billing_period' 
            });
            await pool.query(
              'UPDATE suscripciones SET status = $1, updated_at = NOW() WHERE subscription_id = $2',
              ['paused', subscriptionId]
            );
            break;
        }

        console.log('[Paddle Response - NEW FORMAT]', JSON.stringify(paddleResponse, null, 2));
        
        const updatedSub = await pool.query(
          'SELECT * FROM suscripciones WHERE subscription_id = $1',
          [subscriptionId]
        );
        
        return updatedSub.rows[0];
      } catch (paddleError) {
        console.error('[Paddle API Error - NEW FORMAT]', {
          status: paddleError.response?.status,
          statusText: paddleError.response?.statusText,
          data: paddleError.response?.data,
          headers: paddleError.response?.headers
        });

        // 🔧 DIAGNÓSTICO ESPECÍFICO DE PERMISOS
        if (paddleError.response?.status === 403) {
          console.error('❌ ERROR DE PERMISOS PARA SUSCRIPCIONES:');
          console.error('   Tu API key necesita el permiso "Subscriptions (Write)"');
          console.error('   Ve a Paddle Dashboard > API Keys y verifica los permisos');
        }

        throw new Error(
          `Error en API de Paddle (NEW FORMAT): ${paddleError.response?.data?.error?.message || paddleError.message}`
        );
      }
    } catch (error) {
      console.error('[Paddle Service Error - NEW FORMAT]', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  async createPortalSession(transactionId, userId) {
    try {
      console.log('[DEBUG] Creando sesión de portal (NEW FORMAT):', { 
        transactionId, 
        userId: userId || 'ADMIN',
        environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox',
        apiBase: PADDLE_API_BASE
      });
    
      let transactionQuery = 'SELECT * FROM historial_transacciones WHERE transaction_id = $1';
      let queryParams = [transactionId];
      
      if (userId) {
        transactionQuery += ' AND id_user = $2';
        queryParams.push(userId);
      }
    
      const transactionResult = await pool.query(transactionQuery, queryParams);
    
      if (transactionResult.rowCount === 0) {
        throw new Error("Transacción no encontrada o no tienes acceso");
      }
    
      const transaction = transactionResult.rows[0];
    
      let subscriptionQuery = 'SELECT customer_id FROM suscripciones WHERE price_id = $1 AND product_id = $2';
      let subscriptionParams = [transaction.price_id, transaction.product_id];
      
      if (userId) {
        subscriptionQuery += ' AND id_user = $3';
        subscriptionParams.push(userId);
      }
      
      subscriptionQuery += ' LIMIT 1';
      
      const subscriptionResult = await pool.query(subscriptionQuery, subscriptionParams);
    
      if (subscriptionResult.rowCount === 0) {
        throw new Error("No se pudo encontrar una suscripción relacionada con esta transacción");
      }
    
      const { customer_id } = subscriptionResult.rows[0];
      
      if (!customer_id) {
        throw new Error("No se pudo encontrar el ID de cliente de Paddle");
      }
  
      const url = `${PADDLE_API_BASE}/customers/${customer_id}/portal-sessions`;
      
      console.log('[Paddle API Call - NEW FORMAT]', {
        url,
        method: 'POST',
        customerId: customer_id,
        environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
      });
  
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PADDLE_SELLER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Paddle API Error - NEW FORMAT]', {
          ...errorData,
          url,
          status: response.status,
          statusText: response.statusText,
          environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
        });
        
        // 🔧 DIAGNÓSTICO ESPECÍFICO DE PERMISOS
        if (response.status === 403) {
          console.error('❌ ERROR DE PERMISOS PARA PORTAL:');
          console.error('   Tu API key necesita el permiso "Customer portal sessions (Write)"');
          console.error('   También verifica que el Customer Portal esté habilitado en:');
          console.error('   Paddle Dashboard > Checkout > Customer Portal');
          
          throw new Error(
            `Acceso denegado al portal de Paddle. Verifica: 1) Permiso "Customer portal sessions (Write)" en tu API key, 2) Customer Portal habilitado en Paddle Dashboard`
          );
        }
        
        throw new Error(errorData.error?.message || 'Error al crear sesión de portal');
      }
  
      const data = await response.json();
      
      if (!data.data?.urls?.general?.overview) {
        throw new Error('URL del portal no encontrada en la respuesta');
      }
  
      const originalUrl = data.data.urls.general.overview;
      
      const cplMatch = originalUrl.match(/\/([^?\/]+)\?/);
      const tokenMatch = originalUrl.match(/[?&]token=([^&]+)/);
      
      if (!cplMatch || !cplMatch[1] || !tokenMatch || !tokenMatch[1]) {
        throw new Error('No se pudo extraer el ID de sesión o token de autenticación');
      }
      
      const cplId = cplMatch[1];
      const token = tokenMatch[1];
      
      const environment = USE_PADDLE_PRODUCTION ? 'customer-portal' : 'sandbox-customer-portal';
      
      const paymentsUrl = `https://${environment}.paddle.com/${cplId}?action=payments&token=${token}`;
      const directPaymentUrl = `https://${environment}.paddle.com/payments/${transactionId}/${cplId}?token=${token}`;
      
      console.log('[Portal URLs - NEW FORMAT]', {
        originalUrl,
        cplId,
        token: token.substring(0, 20) + '...',
        paymentsUrl,
        directPaymentUrl,
        environment
      });
  
      return {
        success: true,
        data: {
          portalUrl: paymentsUrl,
          directPaymentUrl,
          sessionId: data.data.id
        }
      };
    } catch (error) {
      console.error('[Create Portal Session Error - NEW FORMAT]', {
        message: error.message,
        transactionId,
        userId,
        stack: error.stack,
        environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
      });
      throw error;
    }
  },

  async verifySubscriptionOwner(userId, subscriptionId) {
    try {
      const result = await pool.query(
        'SELECT 1 FROM suscripciones WHERE id_user = $1 AND subscription_id = $2',
        [userId, subscriptionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('[Verify Subscription Error]', {
        message: error.message,
        userId,
        subscriptionId
      });
      throw error;
    }
  },

  async deleteSubscription(subscriptionId) {
    try {
      const result = await pool.query(
        'DELETE FROM suscripciones WHERE subscription_id = $1 RETURNING *',
        [subscriptionId]
      );

      if (result.rowCount === 0) {
        throw new Error('Suscripción no encontrada');
      }

      return { message: 'Suscripción eliminada correctamente' };
    } catch (error) {
      console.error('[Delete Subscription Error]', {
        message: error.message,
        subscriptionId
      });
      throw error;
    }
  },

  async getInvoiceUrl(transactionId, userId, maxRetries = 3, initialDelay = 2000) {
    let retryCount = 0;
    let lastError = null;
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (retryCount <= maxRetries) {
      try {
        console.log('[DEBUG] Obteniendo factura (NEW FORMAT):', { 
          transactionId, 
          userId: userId || 'ADMIN',
          environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox',
          apiBase: PADDLE_API_BASE,
          intento: retryCount + 1
        });

        let transactionQuery = 'SELECT 1 FROM historial_transacciones WHERE transaction_id = $1';
        let queryParams = [transactionId];
        
        if (userId) {
          transactionQuery += ' AND id_user = $2';
          queryParams.push(userId);
        }

        const transaction = await pool.query(transactionQuery, queryParams);

        if (transaction.rowCount === 0) {
          throw new Error("Transacción no encontrada o no tienes acceso");
        }

        const paddleUrl = `${PADDLE_API_BASE}/transactions/${transactionId}/invoice`;
        
        console.log('[Paddle API Call - NEW FORMAT]', {
          url: paddleUrl,
          environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox',
          apiKey: process.env.PADDLE_SELLER_API_KEY ? 'Present' : 'Missing',
          intento: retryCount + 1
        });

        const response = await fetch(`${paddleUrl}?disposition=inline`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.PADDLE_SELLER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[Paddle API Response - NEW FORMAT]', {
          status: response.status,
          statusText: response.statusText,
          intento: retryCount + 1,
          environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Paddle API Error - NEW FORMAT]', {
            ...errorData,
            intento: retryCount + 1,
            environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
          });
          
          // 🔧 DIAGNÓSTICO ESPECÍFICO DE PERMISOS
          if (response.status === 403) {
            console.error('❌ ERROR DE PERMISOS PARA FACTURAS:');
            console.error('   Tu API key necesita el permiso "Transactions (Read)"');
            console.error('   Ve a Paddle Dashboard > API Keys y verifica los permisos');
            
            throw new Error(
              `Acceso denegado a facturas. Verifica que tu API key tenga el permiso "Transactions (Read)"`
            );
          }
          
          if (response.status === 404) {
            lastError = new Error(errorData.error?.message || 'Error al obtener la factura de Paddle');
            const delay = initialDelay * Math.pow(2, retryCount);
            console.log(`⏳ Factura no disponible aún (NEW FORMAT), reintentando en ${delay}ms (intento ${retryCount + 1}/${maxRetries + 1})`);
            await wait(delay);
            retryCount++;
            continue;
          } else {
            throw new Error(errorData.error?.message || 'Error al obtener la factura de Paddle');
          }
        }

        const data = await response.json();
        console.log('[Paddle Invoice Response - NEW FORMAT]', JSON.stringify(data, null, 2));

        if (!data.data?.url) {
          throw new Error('URL de factura no encontrada en la respuesta');
        }

        return {
          success: true,
          data: {
            url: data.data.url
          }
        };
      } catch (error) {
        lastError = error;
        if (retryCount < maxRetries) {
          const delay = initialDelay * Math.pow(2, retryCount);
          console.log(`🔄 Error al obtener factura (NEW FORMAT), reintentando en ${delay}ms (intento ${retryCount + 1}/${maxRetries + 1})`);
          console.error('[Get Invoice Error - Reintentando - NEW FORMAT]', {
            message: error.message,
            transactionId,
            userId,
            intento: retryCount + 1,
            environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
          });
          await wait(delay);
          retryCount++;
        } else {
          console.error('[Get Invoice Error - Máximo de reintentos alcanzado - NEW FORMAT]', {
            message: error.message,
            transactionId,
            userId,
            stack: error.stack,
            environment: USE_PADDLE_PRODUCTION ? 'production' : 'sandbox'
          });
          throw error;
        }
      }
    }
    
    throw lastError;
  }
};