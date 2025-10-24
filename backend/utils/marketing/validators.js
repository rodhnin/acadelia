// validators.js
export const validateMarketingParams = (params) => {
  const errors = [];
  
  if (!params.userId) {
    errors.push("El parámetro userId es requerido");
  }
  
  if (!params.query) {
    errors.push("El parámetro query es requerido");
  } else if (typeof params.query !== 'string') {
    errors.push("El parámetro query debe ser una cadena de texto");
  }
  
  if (params.chatHistory && !Array.isArray(params.chatHistory)) {
    errors.push("El parámetro chatHistory debe ser un array");
  }
  
  return errors;
};

export const validateProfileData = (profileData) => {
  const errors = [];
  
  if (!profileData || typeof profileData !== 'object') {
    errors.push("Los datos del perfil son inválidos");
    return errors;
  }
  
  if (!profileData.metadata || typeof profileData.metadata !== 'object') {
    errors.push("El campo metadata es requerido y debe ser un objeto");
  } else {
    // Validar campos específicos en metadata
    if (profileData.metadata.edad && typeof profileData.metadata.edad !== 'number') {
      errors.push("El campo edad debe ser un número");
    }
    
    if (profileData.metadata.carrera && typeof profileData.metadata.carrera !== 'string') {
      errors.push("El campo carrera debe ser un texto");
    }
  }
  
  return errors;
};

export const validateContentData = (contentData) => {
  const errors = [];
  
  if (!contentData || typeof contentData !== 'object') {
    errors.push("Los datos del contenido son inválidos");
    return errors;
  }
  
  if (!contentData.type) {
    errors.push("El campo type es requerido");
  }
  
  if (!contentData.channel) {
    errors.push("El campo channel es requerido");
  }
  
  if (!contentData.payload || typeof contentData.payload !== 'object') {
    errors.push("El campo payload es requerido y debe ser un objeto");
  }
  
  return errors;
};

export const validateTrendData = (trendData) => {
  const errors = [];
  
  if (!trendData || typeof trendData !== 'object') {
    errors.push("Los datos de la tendencia son inválidos");
    return errors;
  }
  
  if (!trendData.theme) {
    errors.push("El campo theme es requerido");
  }
  
  if (trendData.popularity === undefined || trendData.popularity === null) {
    errors.push("El campo popularity es requerido");
  } else if (typeof trendData.popularity !== 'number' || trendData.popularity < 0 || trendData.popularity > 1) {
    errors.push("El campo popularity debe ser un número entre 0 y 1");
  }
  
  if (trendData.metadata && typeof trendData.metadata !== 'object') {
    errors.push("El campo metadata debe ser un objeto");
  }
  
  return errors;
};