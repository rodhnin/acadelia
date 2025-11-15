/**
 * pdf-button-controller.js - Controlador centralizado para los botones de PDF
 * Gestiona la alternancia entre los botones de subida y visualización de PDF
 */
import { isWelcomeState } from '../services/pdf-state.js';

// Referencias a los botones
let uploaderButton;
let panelTriggerButton;

/**
 * Inicializa el controlador de botones
 * @param {HTMLElement} uploader - Referencia al botón de subida
 * @param {HTMLElement} panelTrigger - Referencia al botón de panel
 */
export function initPDFButtonController(uploader, panelTrigger) {
  uploaderButton = uploader;
  panelTriggerButton = panelTrigger;
  
  ensureSamePosition();
}

/**
 * Asegura que ambos botones tengan exactamente la misma posición
 */
function ensureSamePosition() {
  if (!uploaderButton || !panelTriggerButton) return;
  
  const positionProps = {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    width: '48px',
    height: '48px',
    zIndex: '10'
  };
  
  Object.entries(positionProps).forEach(([prop, value]) => {
    uploaderButton.style[prop] = value;
    panelTriggerButton.style[prop] = value;
  });
}

/**
 * Actualiza la visibilidad de los botones de PDF según el estado actual
 * @param {boolean} hasPDF - Si el chat actual tiene un PDF asociado
 */
export function updatePDFButtonsVisibility(hasPDF) {
  console.log(`Actualizando visibilidad de botones PDF: hasPDF=${hasPDF}`);
  
  if (!uploaderButton || !panelTriggerButton) {
    uploaderButton = document.querySelector('.pdf-upload-button');
    panelTriggerButton = document.querySelector('.pdf-panel-trigger');
    
    if (!uploaderButton || !panelTriggerButton) {
      console.warn('No se pudieron encontrar los botones de PDF');
      return;
    }
  }
  
  const isWelcome = isWelcomeState();
  
  if (isWelcome) {
    // En la pantalla de bienvenida, mostrar solo el botón de subida
    console.log('En pantalla de bienvenida: mostrando botón de subida');
    uploaderButton.style.display = 'flex';
    panelTriggerButton.style.display = 'none';
    return;
  }
  
  console.log(`Chat existente con PDF=${hasPDF}: ${hasPDF ? 'mostrando botón de panel' : 'mostrando botón de subida'}`);
  
  // Forzar animación suave
  requestAnimationFrame(() => {
    // Primero ocultar ambos botones momentáneamente
    uploaderButton.style.opacity = '0';
    panelTriggerButton.style.opacity = '0';
    
    // Después de un breve momento, actualizar visibilidad y mostrar con animación
    setTimeout(() => {
      uploaderButton.style.display = hasPDF ? 'none' : 'flex';
      panelTriggerButton.style.display = hasPDF ? 'flex' : 'none';
      
      // Forzar reflow
      void uploaderButton.offsetHeight;
      void panelTriggerButton.offsetHeight;
      
      setTimeout(() => {
        uploaderButton.style.opacity = '';
        panelTriggerButton.style.opacity = '';
      }, 50);
    }, 100);
  });
}

export default {
  initPDFButtonController,
  updatePDFButtonsVisibility,
};