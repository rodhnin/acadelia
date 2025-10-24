/**
 * index-matematico.js - Punto de entrada simplificado
 * 
 * Este archivo sirve como punto de entrada para la aplicación
 * y delega la configuración de variante a app.js
 */

// Importar app.js directamente - la detección e inicialización
// de variante se realizará en ensureVariantInitialization()
import './core/app-matematico.js';

// Registrar información de depuración
console.log('Punto de entrada inicializado - delegando configuración de variante a app.js');

// Los módulos específicos de la variante pueden ser cargados aquí si es necesario
// Por ejemplo, cargar estilos específicos o configuraciones adicionales

// La app.js se encargará del resto de la inicialización