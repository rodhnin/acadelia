/**
 * auth.js - Funciones para autenticación de usuario
 */

import { API_ROUTES } from '../core/config-teorico.js';
import { setUserId } from '../core/state-teorico.js';

// Almacenamiento temporal de datos de usuario y perfil (para uso interno del módulo)
let _userProfile = null;

/**
 * Verifica la autenticación del usuario.
 * @returns {Promise<Object>} Datos del usuario.
 */
export async function checkAuthentication() {
  try {
    const response = await fetch(API_ROUTES.authentication, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const userData = await response.json();
    
    if (userData && userData.id_user) {
      setUserId(userData.id_user);
      
      try {
        _userProfile = await fetchUserProfile(userData.id_user);
      } catch (profileError) {
        // Error no crítico, continuar sin el perfil
      }
    }
    
    return userData;
  } catch (error) {
    acadelError(
        "¡Ups! Problema de acceso 🔐", 
        "Acadel no puede verificar tu identidad. Por favor, inicia sesión nuevamente"
      );
    throw new Error('Error de autenticación');
  }
}

/**
 * Obtiene los datos del perfil del usuario.
 * @param {string|number} userId - ID del usuario.
 * @returns {Promise<Object>} Datos del perfil del usuario.
 */
export async function fetchUserProfile(userId) {
  if (!userId) {
    throw new Error('Se requiere ID de usuario para obtener el perfil');
  }
  
  try {
    const profileUrl = API_ROUTES.userProfile(userId);
    
    const response = await fetch(profileUrl, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // Detectar si la respuesta usa el nuevo formato con estructura success/data
    // o si es el formato antiguo con datos directos
    return responseData.hasOwnProperty('success') && responseData.hasOwnProperty('data') 
      ? responseData.data 
      : responseData;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene el perfil del usuario almacenado previamente o intenta obtenerlo.
 * @param {string|number} userId - ID del usuario (opcional si ya hay perfil almacenado).
 * @returns {Promise<Object|null>} Perfil del usuario o null si no se pudo obtener.
 */
export async function getUserProfile(userId = null) {
  if (_userProfile) {
    return _userProfile;
  }
  
  if (userId) {
    try {
      _userProfile = await fetchUserProfile(userId);
      return _userProfile;
    } catch (error) {
      return null;
    }
  }
  
  return null;
}

// Exportación unificada
export default {
  checkAuthentication,
  fetchUserProfile,
  getUserProfile
};