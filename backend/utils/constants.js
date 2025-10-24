const constants = {
    // Configuración de la aplicación
    APP: {
      NAME: 'TuApp',
      VERSION: '1.0.0',
      PORT: process.env.PORT || 3000,
      ENV: process.env.NODE_ENV || 'development'
    },
  
    // Estados HTTP comunes
    HTTP: {
      OK: 200,
      CREATED: 201,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      SERVER_ERROR: 500
    },
  
    // Mensajes de error comunes
    ERRORS: {
      AUTH: {
        INVALID_TOKEN: 'Token inválido o expirado',
        NO_TOKEN: 'No se proporcionó token de autenticación',
        INVALID_CREDENTIALS: 'Credenciales inválidas'
      },
      VALIDATION: {
        REQUIRED_FIELD: 'Este campo es requerido',
        INVALID_EMAIL: 'Email inválido',
        INVALID_PASSWORD: 'La contraseña debe tener al menos 8 caracteres'
      }
    },
  
    // Roles de usuario
    ROLES: {
      ADMIN: 'admin',
      USER: 'user',
      PREMIUM: 'premium'
    },
  
    // Límites y configuraciones
    LIMITS: {
      MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
      MAX_REQUESTS_PER_MINUTE: 100,
      SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 horas
    }
  };
  
  module.exports = constants;