const errorHandler = (err, req, res, next) => {
  // Registrar el error en consola solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', err.stack);
  }

  // Determinar si es un error conocido (con statusCode) o desconocido
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 
    ? 'Error interno del servidor' 
    : err.message;

  // Crear objeto de respuesta base
  const response = {
    status: 'error',
    message: message
  };

  // Agregar detalles adicionales en entorno de desarrollo
  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
    
    if (err.details) {
      response.details = err.details;
    }
  }

  // Manejar tipos específicos de errores
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ...response,
      message: 'Error de validación',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      ...response,
      message: 'No autorizado'
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      ...response,
      message: 'Recurso no encontrado'
    });
  }

  // Respuesta genérica
  res.status(statusCode).json(response);
};

export default errorHandler;