/**
 * Servicio para manejar todas las comunicaciones con la API del backend
 */
export class ApiService {
    constructor() {
      this.baseUrl = '/api';
      this.endpoints = {
        // Suscripciones
        subscriptions: '/paddle',
        updateSubscription: '/paddle', // POST /:action (resume|cancel|delete)
        getInvoice: '/paddle/invoice', // GET /:transactionId
        getPortalUrl: '/paddle/portal', // GET /:transactionId
        
        // Transacciones
        transactions: '/payment/user/transactions', // GET /:userId
        
        // Usuarios
        users: '/usuarios/usuarios',
        user: '/usuarios/usuarios', // GET, PUT, DELETE /:id
        userSubscriptions: '/payment/user/subscriptions', // GET /:userId

        // Perfil de usuario
        profiles: '/perfil',
        profileWithUniversity: '/perfil/with-university', // GET /:id_usuario
        profileDetails: '/perfil/detail', // GET /:id_usuario
        
        // Países y universidades
        countries: '/paises',
        countryById: '/paises', // GET /:idPais
        universitiesByCountry: '/paises/:idPais/universidades',
        universityById: '/universidades', // GET /:idUniversidad
        usersByCountry: '/paises/:idPais/usuarios',
        usersByUniversity: '/universidades/:idUniversidad/usuarios',
        
        // Acceso
        premiumStatus: '/acceso/premium-status', // GET /:userId
        accessibleCareers: '/acceso/accessible-careers', // GET /:userId
        
        // Precios y productos
        courses: '/price',
        course: '/price', // GET /:id
        clearCache: '/price/clear-cache', // POST

        // Suscripciones
        adminSubscriptions: '/admin/finance/subscriptions',
        adminSubscription: '/admin/finance/subscription', // /:id
        adminSubscriptionStats: '/admin/finance/subscriptions/stats',
        
        // Transacciones
        adminTransactions: '/admin/finance/transactions',
        adminTransaction: '/admin/finance/transaction', // /:id
        adminTransactionsAnalytics: '/admin/finance/transactions/analytics',
        adminPaymentMethods: '/admin/finance/transactions/payment-methods',
        adminCurrencies: '/admin/finance/transactions/currencies',
        
        // Impuestos
        adminTaxSummary: '/admin/finance/taxes/summary',
        adminTaxesByCountry: '/admin/finance/taxes/by-country',
        adminTaxReports: '/admin/finance/taxes/reports',
        adminTaxHistory: '/admin/finance/taxes/historical',
        
        // Informes
        adminReportsGenerate: '/admin/finance/reports/generate',
        adminReportsList: '/admin/finance/reports/list',
        adminReport: '/admin/finance/reports', // /:id
        adminReportDownload: '/admin/finance/reports', // /:id/download
        
        // Egresos
        adminExpenses: '/admin/finance/expenses',
        adminExpense: '/admin/finance/expenses', // /:id
        adminExpenseCategories: '/admin/finance/expenses/categories',
        adminExpenseTotals: '/admin/finance/expenses/totals',
        adminExpensesByMonth: '/admin/finance/expenses/by-month',
        adminExpensesByCategory: '/admin/finance/expenses/by-category'
      };
      
      this.cache = {
        products: null,
        users: null,
        profiles: null,
        countries: null,
        universities: null,
        subscriptions: null,
        transactions: null,
        expenses: null,
        expenseCategories: null,
        taxSummary: null,
        reports: null
      };
      
      // Auth headers incluido desde csrf-utils.js
    }
    
    /**
     * Inicializa el servicio API
     */
    async init() {
      console.log('Inicializando servicio API');
      
      try {
        const response = await this.get('/price');
        console.log('Conexión a API establecida');
        return true;
      } catch (error) {
        console.error('Error al conectar con la API:', error);
        throw new Error('No se pudo establecer conexión con el servidor');
      }
    }
    
    /**
     * Realiza una petición GET a la API
     * @param {string} endpoint - Endpoint relativo
     * @param {object} params - Parámetros query string (opcional)
     * @returns {Promise<any>} Respuesta de la API
     */
    async get(endpoint, params = {}) {
      try {
        const url = new URL(this.baseUrl + endpoint, window.location.origin);
        
        if (Object.keys(params).length > 0) {
          Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
              url.searchParams.append(key, params[key]);
            }
          });
        }
        
        // Realizar petición usando el método fetch mejorado de csrf-utils
        const response = await window.csrfUtils.fetch(url.toString(), {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error en GET ${endpoint}:`, error);
        throw error;
      }
    }
    
    /**
     * Realiza una petición POST a la API
     * @param {string} endpoint - Endpoint relativo
     * @param {object} data - Datos a enviar
     * @returns {Promise<any>} Respuesta de la API
     */
    async post(endpoint, data = {}) {
      try {
        const url = this.baseUrl + endpoint;
        
        // Realizar petición usando el método fetch mejorado de csrf-utils
        const response = await window.csrfUtils.fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error en POST ${endpoint}:`, error);
        throw error;
      }
    }
    
    /**
     * Realiza una petición PUT a la API
     * @param {string} endpoint - Endpoint relativo
     * @param {object} data - Datos a enviar
     * @returns {Promise<any>} Respuesta de la API
     */
    async put(endpoint, data = {}) {
      try {
        const url = this.baseUrl + endpoint;
        
        const response = await window.csrfUtils.fetch(url, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error en PUT ${endpoint}:`, error);
        throw error;
      }
    }
    
    /**
     * Realiza una petición DELETE a la API
     * @param {string} endpoint - Endpoint relativo
     * @returns {Promise<any>} Respuesta de la API
     */
    async delete(endpoint) {
      try {
        const url = this.baseUrl + endpoint;
        
        const response = await window.csrfUtils.fetch(url, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error en DELETE ${endpoint}:`, error);
        throw error;
      }
    }
    
    // ==================== MÉTODOS PARA USUARIOS ====================
    
    /**
     * Obtiene todos los usuarios
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getUsers(filters = {}) {
      try {
        // Si tenemos datos en caché y no hay filtros, usarlos
        if (this.cache.users && Object.keys(filters).length === 0) {
          return this.cache.users;
        }
        
        const response = await this.get(this.endpoints.users, filters);
        
        let users = [];
        if (Array.isArray(response)) {
          users = response;
        } else if (response.success && Array.isArray(response.data)) {
          users = response.data;
        } else {
          console.warn('Formato de respuesta de usuarios inesperado:', response);
        }
        
        this.cache.users = users;
        
        return users;
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene un usuario por ID
     * @param {string|number} userId - ID del usuario
     * @returns {Promise<Object>} Datos del usuario
     */
    async getUserById(userId) {
      return this.get(`${this.endpoints.user}/${userId}`);
    }
    
    /**
     * Actualiza un usuario
     * @param {string|number} userId - ID del usuario
     * @param {Object} userData - Datos a actualizar
     * @returns {Promise<Object>} Usuario actualizado
     */
    async updateUser(userId, userData) {
      // Invalidar caché de usuarios
      this.cache.users = null;
      
      return this.put(`${this.endpoints.user}/${userId}`, userData);
    }
    
    // ==================== MÉTODOS PARA PERFILES ====================
    
    /**
     * Obtiene el perfil de un usuario
     * @param {string|number} userId - ID del usuario
     * @returns {Promise<Object>} Perfil del usuario
     */
    async getUserProfile(userId) {
      try {
        return await this.get(`${this.endpoints.profiles}/${userId}`);
      } catch (error) {
        console.error('Error al obtener perfil de usuario:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene el perfil con información de universidad de un usuario
     * @param {string|number} userId - ID del usuario
     * @returns {Promise<Object>} Perfil con universidad
     */
    async getUserProfileWithUniversity(userId) {
      try {
        return await this.get(`${this.endpoints.profileWithUniversity}/${userId}`);
      } catch (error) {
        console.error('Error al obtener perfil con universidad:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene detalles completos del perfil de un usuario
     * @param {string|number} userId - ID del usuario
     * @returns {Promise<Object>} Detalles completos del perfil
     */
    async getUserProfileDetails(userId) {
      try {
        return await this.get(`${this.endpoints.profileDetails}/${userId}`);
      } catch (error) {
        console.error('Error al obtener detalles del perfil:', error);
        throw error;
      }
    }
    
    /**
     * Actualiza el perfil de un usuario
     * @param {string|number} profileId - ID del perfil
     * @param {Object} profileData - Datos a actualizar
     * @returns {Promise<Object>} Perfil actualizado
     */
    async updateProfile(profileId, profileData) {
      try {
        return await this.put(`${this.endpoints.profiles}/${profileId}`, profileData);
      } catch (error) {
        console.error('Error al actualizar perfil:', error);
        throw error;
      }
    }
    
    // ==================== MÉTODOS PARA PAÍSES Y UNIVERSIDADES ====================
    
    /**
     * Obtiene todos los países
     * @returns {Promise<Array>} Lista de países
     */
    async getCountries() {
      try {
        // Si tenemos datos en caché, usarlos
        if (this.cache.countries) {
          return this.cache.countries;
        }
        
        const response = await this.get(this.endpoints.countries);
        
        let countries = [];
        if (Array.isArray(response)) {
          countries = response;
        } else if (response.success && Array.isArray(response.data)) {
          countries = response.data;
        } else {
          console.warn('Formato de respuesta de países inesperado:', response);
        }
        
        this.cache.countries = countries;
        
        return countries;
      } catch (error) {
        console.error('Error al obtener países:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene un país por ID
     * @param {string|number} countryId - ID del país
     * @returns {Promise<Object>} Datos del país
     */
    async getCountryById(countryId) {
      try {
        return await this.get(`${this.endpoints.countryById}/${countryId}`);
      } catch (error) {
        console.error('Error al obtener país:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene universidades por país
     * @param {string|number} countryId - ID del país
     * @returns {Promise<Array>} Lista de universidades
     */
    async getUniversitiesByCountry(countryId) {
      try {
        const endpoint = this.endpoints.universitiesByCountry.replace(':idPais', countryId);
        const response = await this.get(endpoint);
        
        let universities = [];
        if (Array.isArray(response)) {
          universities = response;
        } else if (response.success && Array.isArray(response.data)) {
          universities = response.data;
        } else {
          console.warn('Formato de respuesta de universidades inesperado:', response);
        }
        
        return universities;
      } catch (error) {
        console.error('Error al obtener universidades por país:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene una universidad por ID
     * @param {string|number} universityId - ID de la universidad
     * @returns {Promise<Object>} Datos de la universidad
     */
    async getUniversityById(universityId) {
      try {
        return await this.get(`${this.endpoints.universityById}/${universityId}`);
      } catch (error) {
        console.error('Error al obtener universidad:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene usuarios por país
     * @param {string|number} countryId - ID del país
     * @param {Object} params - Parámetros de paginación
     * @returns {Promise<Object>} Usuarios del país con paginación
     */
    async getUsersByCountry(countryId, params = {}) {
      try {
        const endpoint = this.endpoints.usersByCountry.replace(':idPais', countryId);
        return await this.get(endpoint, params);
      } catch (error) {
        console.error('Error al obtener usuarios por país:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene usuarios por universidad
     * @param {string|number} universityId - ID de la universidad
     * @param {Object} params - Parámetros de paginación
     * @returns {Promise<Object>} Usuarios de la universidad con paginación
     */
    async getUsersByUniversity(universityId, params = {}) {
      try {
        const endpoint = this.endpoints.usersByUniversity.replace(':idUniversidad', universityId);
        return await this.get(endpoint, params);
      } catch (error) {
        console.error('Error al obtener usuarios por universidad:', error);
        throw error;
      }
    }

        // ==================== MÉTODOS PARA SUSCRIPCIONES ====================
    
    /**
     * Obtiene todas las suscripciones de un usuario
     * @param {string|number} userId - ID del usuario
     * @returns {Promise<Array>} Lista de suscripciones
     */
    async getUserSubscriptions(userId) {
      try {
        const response = await this.get(`${this.endpoints.userSubscriptions}/${userId}`);
        
        let subscriptions = [];
        if (Array.isArray(response)) {
          subscriptions = response;
        } else if (response.success && Array.isArray(response.data)) {
          subscriptions = response.data;
        } else {
          console.warn('Formato de respuesta de suscripciones inesperado:', response);
        }
        
        return subscriptions;
      } catch (error) {
        console.error('Error al obtener suscripciones de usuario:', error);
        throw error;
      }
    }

    /**
     * Obtiene todas las transacciones con filtros opcionales
     * @param {Object} filters - Filtros para la consulta
     * @param {Object} pagination - Opciones de paginación
     * @returns {Promise<Object>} Lista de transacciones y metadatos de paginación
     */
    async getAdminTransactions(filters = {}, pagination = {}) {
      try {
        const params = { ...filters, ...pagination };
        const response = await this.get(this.endpoints.adminTransactions, params);
        
        // Si la respuesta incluye datos y no hay filtro a nivel backend,
        if (response && response.success && Array.isArray(response.data)) {
          response.data = response.data.filter(
            trans => trans.event_type !== 'transaction.payment_failed'
          );
          
          if (response.pagination && typeof response.pagination.totalItems === 'number') {
            const filteredItemsCount = response.data.length;
            response.pagination.totalItems = filteredItemsCount;
            response.pagination.totalPages = Math.ceil(filteredItemsCount / pagination.limit || 10);
          }
        }
        
        return response;
      } catch (error) {
        console.error('Error al obtener transacciones (admin):', error);
        throw error;
      }
    }
    
    /**
     * Actualiza el estado de una suscripción
     * @param {string} subscriptionId - ID de la suscripción
     * @param {string} action - Acción a realizar (resume|cancel|delete)
     * @returns {Promise<Object>} Resultado de la operación
     */
    async updateSubscription(subscriptionId, action) {
      try {
        const result = await this.post(`${this.endpoints.updateSubscription}/${action}`, {
          subscriptionId
        });
        
        // Invalidar caché de suscripciones
        this.cache.subscriptions = null;
        
        return result;
      } catch (error) {
        console.error(`Error al ${action} suscripción:`, error);
        throw error;
      }
    }

        // ==================== MÉTODOS PARA TRANSACCIONES ====================
    
    /**
     * Obtiene todas las transacciones de un usuario
     * @param {string|number} userId - ID del usuario
     * @returns {Promise<Array>} Lista de transacciones
     */
    async getUserTransactions(userId) {
      try {
        const response = await this.get(`${this.endpoints.transactions}/${userId}`);
        
        let transactions = [];
        if (Array.isArray(response)) {
          transactions = response;
        } else if (response.success && Array.isArray(response.data)) {
          transactions = response.data;
        } else {
          console.warn('Formato de respuesta de transacciones inesperado:', response);
        }
        
        return transactions;
      } catch (error) {
        console.error('Error al obtener transacciones de usuario:', error);
        throw error;
      }
    }
    
/**
 * Obtiene la URL de una factura
 * @param {string} transactionId - ID de la transacción
 * @returns {Promise<Object>} Datos de la factura
 */
async getInvoiceUrl(transactionId) {
  try {
    console.log(`Solicitando factura para transacción ${transactionId}`);
    
    // NUEVO: Primero intentar obtener la transacción completa para verificar invoice_url
    try {
      const transactionDetails = await this.get(`/transaction/${transactionId}`);
      
      if (transactionDetails && transactionDetails.success && 
          transactionDetails.data && transactionDetails.data.invoice_url) {
        
        console.log(`URL de factura encontrada en base de datos: ${transactionDetails.data.invoice_url}`);
        
        return {
          success: true,
          data: {
            url: transactionDetails.data.invoice_url,
            source: 'google_drive'
          }
        };
      } else {
        console.log('No se encontró URL de factura en base de datos, intentando con Paddle...');
      }
    } catch (dbError) {
      console.warn(`Error al verificar factura en base de datos: ${dbError.message}. Intentando con endpoints de Paddle...`);
    }
    
    // Si no hay URL en la base de datos, proceder con el flujo normal de Paddle
    try {
      const adminEndpoint = `/admin/finance/transaction/${transactionId}/invoice`;
      console.log(`Probando con endpoint administrativo: ${adminEndpoint}`);
      
      const adminResponse = await this.get(adminEndpoint);
      console.log('Respuesta recibida del endpoint administrativo:', adminResponse.success ? 'exitosa' : 'fallida');
      
      return adminResponse;
    } catch (adminError) {
      console.warn(`Error con endpoint administrativo: ${adminError.message}. Intentando con endpoint secundario...`);
      
      // Si el endpoint administrativo falla, intentar con el endpoint de transacción
      try {
        const transactionEndpoint = `/transaction/${transactionId}/invoice`;
        console.log(`Probando con endpoint de transacción: ${transactionEndpoint}`);
        
        const transactionResponse = await this.get(transactionEndpoint);
        console.log('Respuesta recibida del endpoint de transacción:', transactionResponse.success ? 'exitosa' : 'fallida');
        
        return transactionResponse;
      } catch (transactionError) {
        console.warn(`Error con endpoint de transacción: ${transactionError.message}. Intentando con endpoint original...`);
        
        // Si también falla, intentar con el endpoint original de Paddle
        const paddleEndpoint = `/paddle/invoice/${transactionId}`;
        console.log(`Probando con endpoint original: ${paddleEndpoint}`);
        
        const response = await this.get(paddleEndpoint);
        console.log('Respuesta recibida del endpoint original:', response.success ? 'exitosa' : 'fallida');
        
        return response;
      }
    }
  } catch (error) {
    console.error(`Error al obtener factura para transacción ${transactionId}:`, error);
    throw error;
  }
}
    
    /**
     * Obtiene la URL del portal de cliente para una transacción
     * @param {string} transactionId - ID de la transacción
     * @returns {Promise<Object>} Datos del portal
     */
    async getPortalUrl(transactionId) {
      return this.get(`${this.endpoints.getPortalUrl}/${transactionId}`);
    }


        // ==================== MÉTODOS PARA CURSOS ====================
    
    /**
     * Obtiene todos los cursos/productos
     * @returns {Promise<Array>} Lista de cursos
     */
    async getCourses() {
      try {
        // Si tenemos datos en caché, usarlos
        if (this.cache.products) {
          return this.cache.products;
        }
        
        const response = await this.get(this.endpoints.courses);
        
        let courses = [];
        if (Array.isArray(response)) {
          courses = response;
        } else if (response.success && Array.isArray(response.data)) {
          courses = response.data;
        } else {
          console.warn('Formato de respuesta de cursos inesperado:', response);
        }
        
        this.cache.products = courses;
        
        return courses;
      } catch (error) {
        console.error('Error al obtener cursos:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene un curso por ID
     * @param {string|number} courseId - ID del curso
     * @returns {Promise<Object>} Datos del curso
     */
    async getCourseById(courseId) {
      return this.get(`${this.endpoints.course}/${courseId}`);
    }
    
    
    // ==================== MÉTODOS ESPECÍFICOS ====================
    
    /**
     * Obtiene todas las suscripciones activas
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Array>} Lista de suscripciones
     */
    async getSubscriptions(filters = {}) {
      try {
        // Si tenemos datos en caché y no hay filtros, usarlos
        if (this.cache.subscriptions && Object.keys(filters).length === 0) {
          return this.cache.subscriptions;
        }
        let allSubscriptions = [];
        const users = await this.getUsers();
        
        for (const user of users) {
          const userSubscriptions = await this.get(`${this.endpoints.userSubscriptions}/${user.id_user}`);
          
          if (userSubscriptions && userSubscriptions.success && userSubscriptions.data) {
            const enhancedSubscriptions = userSubscriptions.data.map(sub => ({
              ...sub,
              user: {
                id: user.id_user,
                email: user.correo,
                name: user.nombre || 'Usuario ' + user.id_user
              }
            }));
            
            allSubscriptions = [...allSubscriptions, ...enhancedSubscriptions];
          }
        }
        
        this.cache.subscriptions = allSubscriptions;
        
        if (Object.keys(filters).length > 0) {
          return this.filterSubscriptions(allSubscriptions, filters);
        }
        
        return allSubscriptions;
      } catch (error) {
        console.error('Error al obtener suscripciones:', error);
        throw error;
      }
    }
    
    /**
     * Filtra suscripciones según criterios
     * @param {Array} subscriptions - Lista de suscripciones
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Suscripciones filtradas
     */
    filterSubscriptions(subscriptions, filters) {
      return subscriptions.filter(sub => {
        let matchesFilter = true;
        
        // Filtro por estado
        if (filters.status && sub.status !== filters.status) {
          matchesFilter = false;
        }
        
        // Filtro por producto
        if (filters.product_id && sub.product_id !== filters.product_id) {
          matchesFilter = false;
        }
        
        // Filtro por búsqueda (en ID, usuario o producto)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const searchMatches = 
            (sub.subscription_id && sub.subscription_id.toLowerCase().includes(searchTerm)) ||
            (sub.user && sub.user.email && sub.user.email.toLowerCase().includes(searchTerm)) ||
            (sub.product_name && sub.product_name.toLowerCase().includes(searchTerm));
          
          if (!searchMatches) {
            matchesFilter = false;
          }
        }
        
        return matchesFilter;
      });
    }
    
    /**
     * Este método procesa las transacciones obtenidas del backend
     * Actúa como un filtro secundario de seguridad por si el backend no filtra
     */
    async getTransactions(filters = {}) {
      try {
        // Si tenemos datos en caché y no hay filtros, usarlos
        if (this.cache.transactions && Object.keys(filters).length === 0) {
          return this.cache.transactions;
        }
        
        let allTransactions = [];
        const users = await this.getUsers();
        
        for (const user of users) {
          const userTransactions = await this.get(`${this.endpoints.transactions}/${user.id_user}`);
          
          if (userTransactions && userTransactions.success && userTransactions.data) {
            // NUEVO: Filtrar transacciones fallidas
            const validTransactions = userTransactions.data.filter(
              trans => trans.event_type !== 'transaction.payment_failed'
            );
            
            const enhancedTransactions = validTransactions.map(trans => ({
              ...trans,
              user: {
                id: user.id_user,
                email: user.correo,
                name: user.nombre || 'Usuario ' + user.id_user
              }
            }));
            
            allTransactions = [...allTransactions, ...enhancedTransactions];
          }
        }
        
        this.cache.transactions = allTransactions;
        
        if (Object.keys(filters).length > 0) {
          return this.filterTransactions(allTransactions, filters);
        }
        
        return allTransactions;
      } catch (error) {
        console.error('Error al obtener transacciones:', error);
        throw error;
      }
    }
    
    /**
     * Filtra transacciones según criterios
     * @param {Array} transactions - Lista de transacciones
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Transacciones filtradas
     */
    filterTransactions(transactions, filters) {
      return transactions.filter(trans => {
        let matchesFilter = true;
        
        // Filtro por producto
        if (filters.product_id && trans.product_id !== filters.product_id) {
          matchesFilter = false;
        }
        
        // Filtro por país (España vs resto)
        if (filters.country === 'ES' && trans.country_code !== 'ES') {
          matchesFilter = false;
        } else if (filters.country === 'non-ES' && trans.country_code === 'ES') {
          matchesFilter = false;
        }
        
        // Filtro por fechas
        if (filters.startDate && filters.endDate) {
          const transDate = new Date(trans.updated_at);
          const startDate = new Date(filters.startDate);
          const endDate = new Date(filters.endDate);
          
          if (transDate < startDate || transDate > endDate) {
            matchesFilter = false;
          }
        }
        
        // Filtro por búsqueda (en ID, usuario o producto)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const searchMatches = 
            (trans.transaction_id && trans.transaction_id.toLowerCase().includes(searchTerm)) ||
            (trans.user && trans.user.email && trans.user.email.toLowerCase().includes(searchTerm)) ||
            (trans.product_name && trans.product_name.toLowerCase().includes(searchTerm));
          
          if (!searchMatches) {
            matchesFilter = false;
          }
        }
        
        return matchesFilter;
      });
    }
    
    
    /**
     * Enriquece datos de usuarios con sus perfiles
     * @param {Array} users - Lista de usuarios básicos
     * @returns {Promise<Array>} Usuarios con datos de perfil
     */
    async enrichUsersWithProfiles(users) {

      return users.map(user => {
        // Simulación de datos de perfil
        const profile = {
          nombre: `Usuario ${user.id_user}`,
          apellido: 'Apellido',
          id_universidad: Math.floor(Math.random() * 5) + 1,
          fecha_registro: new Date(Date.now() - Math.random() * 31536000000).toISOString() // Hasta 1 año atrás
        };
        
        return {
          ...user,
          ...profile
        };
      });
    }
    
    /**
     * Filtra usuarios según criterios
     * @param {Array} users - Lista de usuarios
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Usuarios filtrados
     */
    filterUsers(users, filters) {
      return users.filter(user => {
        let matchesFilter = true;
        
        // Filtro por estado
        if (filters.status) {
          // Simulación: usuarios con ID par son 'activos'
          const isActive = user.id_user % 2 === 0;
          if ((filters.status === 'active' && !isActive) ||
              (filters.status === 'inactive' && isActive)) {
            matchesFilter = false;
          }
        }
        
        // Filtro por suscripción
        if (filters.subscription) {
          // Simulación: usuarios con ID divisible por 3 tienen suscripción
          const hasSub = user.id_user % 3 === 0;
          if ((filters.subscription === 'with' && !hasSub) ||
              (filters.subscription === 'without' && hasSub)) {
            matchesFilter = false;
          }
        }
        
        // Filtro por búsqueda (ID, correo o nombre)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const searchMatches = 
            (user.id_user && user.id_user.toString().includes(searchTerm)) ||
            (user.correo && user.correo.toLowerCase().includes(searchTerm)) ||
            (user.nombre && user.nombre.toLowerCase().includes(searchTerm));
          
          if (!searchMatches) {
            matchesFilter = false;
          }
        }
        
        return matchesFilter;
      });
    }
    
    /**
     * Obtiene productos/cursos
     * @returns {Promise<Array>} Lista de productos
     */
    async getProducts() {
      try {
        // Si tenemos datos en caché, usarlos
        if (this.cache.products) {
          return this.cache.products;
        }
        
        const courses = await this.get(this.endpoints.courses);
        
        this.cache.products = courses;
        
        return courses;
      } catch (error) {
        console.error('Error al obtener productos:', error);
        throw error;
      }
    }
    
    /**
     * Obtiene detalles de un producto específico
     * @param {string|number} productId - ID del producto
     * @returns {Promise<Object>} Detalles del producto
     */
    async getProductDetails(productId) {
      return this.get(`${this.endpoints.course}/${productId}`);
    }
    
   /**
     * Limpia la caché de datos
     * @param {string} type - Tipo de caché a limpiar (o undefined para limpiar todo)
     */
   clearCache(type) {
    if (type) {
      this.cache[type] = null;
    } else {
      Object.keys(this.cache).forEach(key => {
        this.cache[key] = null;
      });
    }
    console.log(`Caché ${type || 'completa'} limpiada`);
  }
    
 // ==================== MÉTODOS DE SUSCRIPCIONES ====================

/**
 * Obtiene todas las suscripciones con filtros opcionales
 * @param {Object} filters - Filtros para la consulta
 * @param {Object} pagination - Opciones de paginación
 * @returns {Promise<Object>} Lista de suscripciones y metadatos de paginación
 */
async getAdminSubscriptions(filters = {}, pagination = {}) {
  try {
    const params = { ...filters, ...pagination };
    return await this.get(this.endpoints.adminSubscriptions, params);
  } catch (error) {
    console.error('Error al obtener suscripciones (admin):', error);
    throw error;
  }
}

/**
 * Obtiene una suscripción específica por su ID
 * @param {string} subscriptionId - ID de la suscripción
 * @returns {Promise<Object>} Detalles de la suscripción
 */
async getAdminSubscription(subscriptionId) {
  try {
    return await this.get(`${this.endpoints.adminSubscription}/${subscriptionId}`);
  } catch (error) {
    console.error(`Error al obtener suscripción ${subscriptionId} (admin):`, error);
    throw error;
  }
}

/**
 * Actualiza el estado de una suscripción
 * @param {string} subscriptionId - ID de la suscripción
 * @param {string} status - Nuevo estado
 * @returns {Promise<Object>} Resultado de la operación
 */
async updateSubscriptionStatus(subscriptionId, status) {
  try {
    return await this.put(`${this.endpoints.adminSubscription}/${subscriptionId}/status`, { status });
  } catch (error) {
    console.error(`Error al actualizar estado de suscripción ${subscriptionId}:`, error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de suscripciones
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Estadísticas de suscripciones
 */
async getSubscriptionStats(filters = {}) {
  try {
    console.log('Solicitando estadísticas con filtros:', filters);
    
    // Asegurarse de que los filtros no tengan valores undefined
    const cleanFilters = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        cleanFilters[key] = value;
      }
    }
    
    // Ahora enviar solo los filtros con valores válidos
    const response = await this.get(this.endpoints.adminSubscriptionStats, cleanFilters);
    
    console.log('Respuesta de estadísticas recibida:', 
      response?.success ? 'éxito' : 'error', 
      response?.data ? `con ${Object.keys(response.data).length} propiedades` : 'sin datos'
    );
    
    return response;
  } catch (error) {
    console.error('Error al obtener estadísticas de suscripciones:', error);
    throw error;
  }
}

/**
 * Obtiene una transacción específica por su ID
 * @param {string} transactionId - ID de la transacción
 * @returns {Promise<Object>} Detalles de la transacción
 */
async getAdminTransaction(transactionId) {
  try {
    return await this.get(`${this.endpoints.adminTransaction}/${transactionId}`);
  } catch (error) {
    console.error(`Error al obtener transacción ${transactionId} (admin):`, error);
    throw error;
  }
}

/**
 * Obtiene análisis de transacciones
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Análisis de transacciones
 */
async getTransactionsAnalytics(filters = {}) {
  try {
    return await this.get(this.endpoints.adminTransactionsAnalytics, filters);
  } catch (error) {
    console.error('Error al obtener análisis de transacciones:', error);
    throw error;
  }
}

/**
 * Obtiene todos los métodos de pago
 * @returns {Promise<Array>} Lista de métodos de pago
 */
async getPaymentMethods() {
  try {
    return await this.get(this.endpoints.adminPaymentMethods);
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    throw error;
  }
}

/**
 * Obtiene todas las divisas utilizadas
 * @returns {Promise<Array>} Lista de divisas
 */
async getCurrencies() {
  try {
    return await this.get(this.endpoints.adminCurrencies);
  } catch (error) {
    console.error('Error al obtener divisas:', error);
    throw error;
  }
}

/**
 * Obtiene totales de transacciones (para comparación con egresos)
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Totales de transacciones
 */
async getTransactionsTotals(filters = {}) {
  try {
    // Se puede usar el mismo endpoint de analytics con un parámetro adicional
    return await this.get(this.endpoints.adminTransactionsAnalytics, {
      ...filters,
      summary_only: true
    });
  } catch (error) {
    console.error('Error al obtener totales de transacciones:', error);
    throw error;
  }
}

/**
 * Obtiene resumen de impuestos
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Resumen de impuestos
 */
async getTaxSummary(filters = {}) {
  try {
    return await this.get(this.endpoints.adminTaxSummary, filters);
  } catch (error) {
    console.error('Error al obtener resumen de impuestos:', error);
    throw error;
  }
}

/**
 * Obtiene impuestos por país
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Impuestos por país
 */
async getTaxesByCountry(filters = {}) {
  try {
    return await this.get(this.endpoints.adminTaxesByCountry, filters);
  } catch (error) {
    console.error('Error al obtener impuestos por país:', error);
    throw error;
  }
}

/**
 * Genera un informe de impuestos
 * @param {Object} params - Parámetros para el informe
 * @returns {Promise<Object>} Informe generado
 */
async generateTaxReport(params) {
  try {
    return await this.post(this.endpoints.adminTaxReports, params);
  } catch (error) {
    console.error('Error al generar informe de impuestos:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de análisis de impuestos
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Array>} Historial de análisis
 */
async getTaxHistory(filters = {}) {
  try {
    return await this.get(this.endpoints.adminTaxHistory, filters);
  } catch (error) {
    console.error('Error al obtener historial de impuestos:', error);
    throw error;
  }
}

/**
 * Genera un informe personalizado
 * @param {Object} params - Parámetros para el informe
 * @returns {Promise<Object>} Informe generado
 */
async generateReport(params) {
  try {
    return await this.post(this.endpoints.adminReportsGenerate, params);
  } catch (error) {
    console.error('Error al generar informe:', error);
    throw error;
  }
}

/**
 * Obtiene lista de informes generados
 * @param {Object} filters - Filtros para la consulta
 * @param {Object} pagination - Opciones de paginación
 * @returns {Promise<Object>} Lista de informes y metadatos de paginación
 */
async getReportsList(filters = {}, pagination = {}) {
  try {
    const params = { ...filters, ...pagination };
    return await this.get(this.endpoints.adminReportsList, params);
  } catch (error) {
    console.error('Error al obtener lista de informes:', error);
    throw error;
  }
}

/**
 * Obtiene un informe específico por su ID
 * @param {number} reportId - ID del informe
 * @returns {Promise<Object>} Detalles del informe
 */
async getReport(reportId) {
  try {
    return await this.get(`${this.endpoints.adminReport}/${reportId}`);
  } catch (error) {
    console.error(`Error al obtener informe ${reportId}:`, error);
    throw error;
  }
}

/**
 * Descarga un informe generado
 * @param {number} reportId - ID del informe
 * @returns {Promise<Object>} URL de descarga o datos del archivo
 */
async downloadReport(reportId) {
  try {
    const url = `${this.endpoints.adminReportDownload}/${reportId}/download`;
    
    const response = await window.csrfUtils.fetch(url, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    // Si el servidor responde con un blob, iniciamos la descarga
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/') || contentType.includes('text/'))) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.trim() || `informe_${reportId}.xlsx`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      
      // Limpieza
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }, 100);
      
      return { success: true, message: 'Descarga iniciada' };
    }
    
    // Si no es un blob, asumimos que es JSON con una URL
    return await response.json();
  } catch (error) {
    console.error(`Error al descargar informe ${reportId}:`, error);
    throw error;
  }
}

/**
 * Obtiene todos los egresos con filtros opcionales
 * @param {Object} filters - Filtros para la consulta
 * @param {Object} pagination - Opciones de paginación
 * @returns {Promise<Object>} Lista de egresos y metadatos de paginación
 */
async getExpenses(filters = {}, pagination = {}) {
  try {
    // Si está en caché y no hay filtros, usar caché
    if (this.cache.expenses && Object.keys(filters).length === 0 && Object.keys(pagination).length === 0) {
      return this.cache.expenses;
    }
    
    const params = { ...filters, ...pagination };
    const response = await this.get(this.endpoints.adminExpenses, params);
    
    if (Object.keys(filters).length === 0 && Object.keys(pagination).length === 0) {
      this.cache.expenses = response;
    }
    
    return response;
  } catch (error) {
    console.error('Error al obtener egresos:', error);
    throw error;
  }
}

/**
 * Crea un nuevo egreso
 * @param {Object} expenseData - Datos del egreso
 * @returns {Promise<Object>} Egreso creado
 */
async createExpense(expenseData) {
  try {
    const response = await this.post(this.endpoints.adminExpenses, expenseData);
    
    // Invalidar caché
    this.clearCache('expenses');
    
    return response;
  } catch (error) {
    console.error('Error al crear egreso:', error);
    throw error;
  }
}

/**
 * Obtiene un egreso específico por su ID
 * @param {number} expenseId - ID del egreso
 * @returns {Promise<Object>} Detalles del egreso
 */
async getExpense(expenseId) {
  try {
    return await this.get(`${this.endpoints.adminExpense}/${expenseId}`);
  } catch (error) {
    console.error(`Error al obtener egreso ${expenseId}:`, error);
    throw error;
  }
}

/**
 * Actualiza un egreso existente
 * @param {number} expenseId - ID del egreso
 * @param {Object} expenseData - Nuevos datos del egreso
 * @returns {Promise<Object>} Egreso actualizado
 */
async updateExpense(expenseId, expenseData) {
  try {
    const response = await this.put(`${this.endpoints.adminExpense}/${expenseId}`, expenseData);
    
    // Invalidar caché
    this.clearCache('expenses');
    
    return response;
  } catch (error) {
    console.error(`Error al actualizar egreso ${expenseId}:`, error);
    throw error;
  }
}

/**
 * Elimina un egreso
 * @param {number} expenseId - ID del egreso
 * @returns {Promise<Object>} Resultado de la operación
 */
async deleteExpense(expenseId) {
  try {
    const response = await this.delete(`${this.endpoints.adminExpense}/${expenseId}`);
    
    // Invalidar caché
    this.clearCache('expenses');
    
    return response;
  } catch (error) {
    console.error(`Error al eliminar egreso ${expenseId}:`, error);
    throw error;
  }
}

/**
 * Obtiene todas las categorías de egresos
 * @returns {Promise<Array>} Lista de categorías
 */
async getExpenseCategories() {
  try {
    // Si está en caché, usar caché
    if (this.cache.expenseCategories) {
      return this.cache.expenseCategories;
    }
    
    const response = await this.get(this.endpoints.adminExpenseCategories);
    
    this.cache.expenseCategories = response;
    
    return response;
  } catch (error) {
    console.error('Error al obtener categorías de egresos:', error);
    throw error;
  }
}

/**
 * Crea una nueva categoría de egresos
 * @param {Object} categoryData - Datos de la categoría
 * @returns {Promise<Object>} Categoría creada
 */
async createExpenseCategory(categoryData) {
  try {
    const response = await this.post(this.endpoints.adminExpenseCategories, categoryData);
    
    // Invalidar caché
    this.clearCache('expenseCategories');
    
    return response;
  } catch (error) {
    console.error('Error al crear categoría de egresos:', error);
    throw error;
  }
}

/**
 * Sube una factura para un egreso
 * @param {number} expenseId - ID del egreso
 * @param {FormData} formData - FormData con el archivo de factura
 * @returns {Promise<Object>} Resultado de la operación
 */
async uploadExpenseInvoice(expenseId, formData) {
  try {
    const url = `${this.baseUrl}/admin/finance/expenses/${expenseId}/invoice`;
    
    const response = await window.csrfUtils.fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // No incluir Content-Type, deja que el navegador lo establezca con el boundary correcto
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error al subir factura para egreso ${expenseId}:`, error);
    throw error;
  }
}

/**
 * Obtiene totales de egresos
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Totales de egresos
 */
async getExpensesTotals(filters = {}) {
  try {
    return await this.get(this.endpoints.adminExpenseTotals, filters);
  } catch (error) {
    console.error('Error al obtener totales de egresos:', error);
    throw error;
  }
}

/**
 * Obtiene egresos agrupados por mes
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Array>} Egresos por mes
 */
async getExpensesByMonth(filters = {}) {
  try {
    return await this.get(this.endpoints.adminExpensesByMonth, filters);
  } catch (error) {
    console.error('Error al obtener egresos por mes:', error);
    throw error;
  }
}

/**
 * Obtiene egresos agrupados por categoría
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Array>} Egresos por categoría
 */
async getExpensesByCategory(filters = {}) {
  try {
    return await this.get(this.endpoints.adminExpensesByCategory, filters);
  } catch (error) {
    console.error('Error al obtener egresos por categoría:', error);
    throw error;
  }
}
/**
 * Crea un nuevo egreso con factura
 * @param {FormData} formData - FormData con datos del egreso y archivo de factura
 * @returns {Promise<Object>} Egreso creado con URL de factura
 */
async createExpenseWithInvoice(formData) {
  try {
    const url = `${this.baseUrl}/admin/finance/expenses/with-invoice`;
    
    const response = await window.csrfUtils.fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // No incluir Content-Type, el navegador lo establece automáticamente para FormData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Invalidar caché
    this.clearCache('expenses');
    
    return result;
  } catch (error) {
    console.error('Error al crear egreso con factura:', error);
    throw error;
  }
}

// ==================== MÉTODOS PARA INFORMES INTEGRALES AUTOMÁTICOS ====================

/**
 * Obtiene la configuración actual de informes automáticos
 * @returns {Promise<Object>} Configuración actual
 */
async getAutomaticReportsConfig() {
  try {
    return await this.get('/admin/finance/reports/automatic-config');
  } catch (error) {
    console.error('Error al obtener configuración de informes automáticos:', error);
    throw error;
  }
}

/**
 * Configura la generación automática de informes integrales
 * @param {Object} config - Configuración de informes automáticos
 * @param {boolean} config.enabled - Si está habilitado
 * @param {string} config.cronExpression - Expresión cron para programación
 * @param {Array<string>} config.recipients - Destinatarios de correo
 * @param {string} config.title - Título base para los informes
 * @returns {Promise<Object>} Resultado de la operación
 */
async configureAutomaticReports(config) {
  try {
    return await this.post('/admin/finance/reports/automatic-config', config);
  } catch (error) {
    console.error('Error al configurar informes automáticos:', error);
    throw error;
  }
}

/**
 * Genera un informe integral manualmente
 * @param {Object} params - Parámetros del informe
 * @param {string} params.date_from - Fecha de inicio
 * @param {string} params.date_to - Fecha de fin
 * @param {string} params.title - Título del informe
 * @param {Array<string>} params.recipients - Destinatarios de correo (opcional)
 * @returns {Promise<Object>} Informe generado
 */
async generateIntegralReport(params) {
  try {
    return await this.post('/admin/finance/reports/integral', {
      ...params,
      logoUrl: '/images/Imagotipo.png'  // Siempre incluir logoUrl
    });
  } catch (error) {
    console.error('Error al generar informe integral:', error);
    throw error;
  }
}

/**
 * Obtiene los informes integrales guardados en la base de datos
 * @returns {Promise<Object>} Lista de informes
 */
async getSavedIntegralReports() {
  try {
    return await this.get('/admin/finance/reports/list', { type: 'integral' });
  } catch (error) {
    console.error('Error al obtener informes integrales guardados:', error);
    throw error;
  }
}

/**
 * Elimina un informe específico por su ID
 * @param {number|string} reportId - ID del informe a eliminar
 * @returns {Promise<Object>} - Resultado de la operación
 */
async deleteReport(reportId) {
  try {
    console.log(`Intentando eliminar informe con ID: ${reportId}`);
    
    const url = `${this.baseUrl}/admin/finance/reports/${reportId}`;
    
    // Realizar petición DELETE
    const response = await window.csrfUtils.fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error HTTP ${response.status} al eliminar informe:`, errorData);
      throw new Error(errorData.message || `Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Informe eliminado correctamente:', result);
    return result;
  } catch (error) {
    console.error(`Error al eliminar informe ${reportId}:`, error);
    throw error;
  }
}
}  