const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 
    ? 'Error interno del servidor' 
    : err.message;

  const response = {
    status: 'error',
    message: message
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
    
    if (err.details) {
      response.details = err.details;
    }
  }

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

  res.status(statusCode).json(response);
};

export default errorHandler;