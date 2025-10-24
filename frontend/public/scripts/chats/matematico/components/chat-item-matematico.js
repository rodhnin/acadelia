/**
 * chat-item.js - Componente para representar un ítem de chat en el sidebar
 */

import { validateUUID } from '../../shared/validators.js';
import { switchChat } from '../core/chat-controller-matematico.js';
import { 
  createElement, 
  sanitizeText, 
  addEvent 
} from '../../shared/dom-helpers.js';

/**
 * Crea un elemento de ítem de chat para el sidebar
 * @param {Object} chatData - Datos del chat
 * @returns {HTMLElement} Elemento del chat o null si los datos son inválidos
 */
export function createChatItem(chatData) {
  // Validación de datos de entrada
  if (!chatData || !chatData.id || !validateUUID(chatData.id)) {
    console.error('Error al crear elemento de chat - datos inválidos:', chatData);
    return null; // Manejar silenciosamente - es error técnico
  }

  // Asegurar que el título tenga un valor válido
  const title = chatData.title || 'Chat sin título';
  
  // Usar displayTitle (título truncado) si está disponible
  const displayTitle = chatData.displayTitle || title;
  
  // Sanitizar los títulos para prevenir XSS
  const safeTitle = sanitizeText(title);
  const safeDisplayTitle = sanitizeText(displayTitle);
  
  // Crear el icono
  const icon = createElement('i', { className: 'bx bx-message-square-dots' });
  
  // Crear el contenedor del título
  const chatTitleDiv = createElement('div', { 
    className: 'chat-title',
    title: safeTitle
  }, [icon, ` ${safeDisplayTitle}`]);
  
  // Crear elemento contenedor principal
  const chatItem = createElement('div', {
    className: 'sidebar-item chat-item-container',
    dataset: { chatId: chatData.id }
  }, chatTitleDiv);
  
  // Añadir evento de clic usando addEvent para facilitar la limpieza
  addEvent(chatItem, 'click', () => {
    // El ID ya fue validado, no es necesario volver a validar
    switchChat(chatData.id);
  });
  
  return chatItem;
}

// Exportación única
export default {
  createChatItem
};