/**
 * pdf-api.js - Servicio para comunicación con las APIs relacionadas con PDFs
 * Mejorado con notificaciones de Acadel y soporte para monitoreo de progreso
 */
import { getState } from '../core/state-pdf.js';

// API base URL (usando la misma base que tus otras APIs)
const BASE_URL = '';

// Función para obtener el token CSRF de forma coherente 
function getCsrfToken() {
  // 1. Primero intentar obtener de la cookie
  const csrfCookie = document.cookie.split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='));
      
  if (csrfCookie) {
      return decodeURIComponent(csrfCookie.split('=')[1]);
  }
  
  // 2. Intentar obtener de la variable global
  if (window.CSRF_TOKEN) {
      return window.CSRF_TOKEN;
  }
  
  // 3. Como último recurso, intentar la meta tag
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
      const metaValue = metaTag.getAttribute('content');
      // No devolver el valor si es la cadena de plantilla sin procesar
      if (metaValue && !metaValue.includes('<%=')) {
          return metaValue;
      }
  }
  
  return null;
}

/**
 * Sube un PDF al servidor con soporte para monitoreo de progreso y cancelación
 * @param {File} pdfFile - Archivo PDF a subir
 * @param {Function} progressCallback - Función de callback para progreso (opcional)
 * @param {AbortSignal} signal - Señal para cancelar la petición (opcional)
 * @returns {Promise<Object>} - Respuesta del servidor
 */
export async function uploadPDF(pdfFile, progressCallback = null, signal = null) {
  // Validaciones con notificaciones Acadel
  const userId = getState('userId');
  const chatId = getState('currentChatId');

  if (!userId) {
    acadelError("Necesito identificarte", "Acadel no puede procesar el PDF sin saber quién eres");
    throw new Error('Se requiere userId para subir un PDF');
  }
  
  if (!chatId) {
    acadelError("Necesitamos un chat activo", "Acadel no puede subir archivos sin un chat donde almacenarlos");
    throw new Error('Se requiere un chatId para subir un PDF. Debe crear un chat primero.');
  }

  // Mostrar notificación de inicio
  acadelInfo("📄 Subiendo tu documento", "Acadel está preparando el PDF para analizar todo su contenido");

  try {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('userId', userId);
    formData.append('chatId', chatId);

    // Estado para asegurar que se muestren todos los estados intermedios en orden
    const progressState = {
      currentProgress: 0,
      targetProgress: 0,
      startTime: Date.now(),
      milestones: [
        {value: 0, minDuration: 500},
        {value: 10, minDuration: 500},
        {value: 25, minDuration: 500},
        {value: 50, minDuration: 500},
        {value: 75, minDuration: 500},
        {value: 90, minDuration: 500},
        {value: 100, minDuration: 500}
      ],
      currentMilestoneIndex: 0,
      milestoneStartTime: Date.now(),
      backendCompleted: false,
      
      updateFromBackend(progress) {
        if (progress > this.targetProgress) {
          this.targetProgress = progress;
          if (progress >= 100) {
            this.backendCompleted = true;
          }
        }
      },
      
      canAdvanceToNextMilestone() {
        if (this.currentMilestoneIndex >= this.milestones.length - 1) {
          return false;
        }
        
        const currentMilestone = this.milestones[this.currentMilestoneIndex];
        const nextMilestone = this.milestones[this.currentMilestoneIndex + 1];
        
        const backendAllowsAdvance = this.targetProgress >= nextMilestone.value;
        const timeInCurrentMilestone = Date.now() - this.milestoneStartTime;
        const timeAllowsAdvance = timeInCurrentMilestone >= currentMilestone.minDuration;
        const forceAdvanceCondition = this.backendCompleted && 
                                    timeAllowsAdvance && 
                                    nextMilestone.value <= 100;
        
        return (backendAllowsAdvance && timeAllowsAdvance) || forceAdvanceCondition;
      },
      
      tryAdvanceToNextMilestone() {
        if (this.canAdvanceToNextMilestone()) {
          this.currentMilestoneIndex++;
          const newMilestone = this.milestones[this.currentMilestoneIndex];
          this.currentProgress = newMilestone.value;
          this.milestoneStartTime = Date.now();
          
          return {
            progress: newMilestone.value,
            text: getProcessingMessage(newMilestone.value)
          };
        }
        
        const timeInCurrentMilestone = Date.now() - this.milestoneStartTime;
        const currentMilestone = this.milestones[this.currentMilestoneIndex];
        const nextMilestone = this.milestones[this.currentMilestoneIndex + 1];
        
        if (nextMilestone && timeInCurrentMilestone > 500) {
          const maxProgress = nextMilestone.value - 1;
          if (this.currentProgress < maxProgress) {
            this.currentProgress = Math.min(this.currentProgress + 1, maxProgress);
            this.milestoneStartTime = Date.now();
            
            return {
              progress: this.currentProgress,
              text: getProcessingMessage(this.currentProgress)
            };
          }
        }
        
        return null;
      }
    };

    return new Promise((resolve, reject) => {
      let statusCheckInterval;
      let statusCheckTimeout;
      let statusCheckComplete = false;
      let progressUpdateInterval;
      
      const clearAllTimers = () => {
        if (statusCheckInterval) clearInterval(statusCheckInterval);
        if (statusCheckTimeout) clearTimeout(statusCheckTimeout);
        if (progressUpdateInterval) clearInterval(progressUpdateInterval);
      };
      
      const reportProgress = () => {
        const update = progressState.tryAdvanceToNextMilestone();
        if (update && progressCallback) {
          progressCallback(update.progress, update.text);
        }
      };
      
      progressUpdateInterval = setInterval(() => {
        if (!statusCheckComplete) {
          reportProgress();
        } else {
          clearInterval(progressUpdateInterval);
        }
      }, 200);
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && progressCallback) {
          const uploadProgress = Math.min(30, Math.round((event.loaded / event.total) * 30));
          progressState.updateFromBackend(uploadProgress);
        }
      });
      
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            progressState.updateFromBackend(30);
            
            statusCheckInterval = setInterval(async () => {
              try {
                if (signal && signal.aborted) {
                  clearAllTimers();
                  reject(new Error('Procesamiento cancelado por el usuario'));
                  return;
                }
                
                if (progressState.backendCompleted) {
                  const allMilestonesShown = progressState.currentMilestoneIndex === progressState.milestones.length - 1;
                  
                  if (allMilestonesShown && progressState.currentProgress === 100) {
                    setTimeout(() => {
                      clearAllTimers();
                      statusCheckComplete = true;
                      
                      // Notificación de éxito de Acadel
                      acadelConfetti("🎉 ¡PDF analizado completamente!", "Acadel ha estudiado cada página y está listo para responder tus preguntas");
                      
                      resolve(response);
                    }, 1000);
                  }
                  return;
                }
                
                const status = await getProcessingStatus(chatId);
                
                if (status && status.success) {
                  progressState.updateFromBackend(status.progress);
                  
                  if (!status.isProcessing && status.progress >= 100) {
                    progressState.backendCompleted = true;
                  }
                }
              } catch (error) {
                // Error silencioso para no molestar al usuario
                console.warn('Error consultando estado de procesamiento:', error);
              }
            }, 1000);
            
            statusCheckTimeout = setTimeout(() => {
              progressState.backendCompleted = true;
              progressState.updateFromBackend(100);
              
              setTimeout(() => {
                clearInterval(statusCheckInterval);
                statusCheckComplete = true;
                
                // Timeout pero exitoso
                acadelExito("📄 PDF procesado", "Acadel tardó un poco más de lo esperado, pero ya tiene tu documento listo");
                
                resolve(response);
              }, 1500);
              
            }, 90000);
            
          } catch (error) {
            clearAllTimers();
            acadelError("Hubo un problema procesando", "Acadel no pudo interpretar la respuesta del servidor. Intenta de nuevo");
            reject(new Error('Error al procesar la respuesta del servidor'));
          }
        } else {
          clearAllTimers();
          
          // Manejar errores específicos del servidor
          let errorMessage = "Acadel no pudo procesar tu PDF. Quizás está demasiado complejo o muy grande";
          
          if (xhr.status === 413) {
            errorMessage = "Tu PDF es demasiado grande para Acadel. Intenta con un archivo más pequeño";
          } else if (xhr.status === 415) {
            errorMessage = "Acadel solo puede leer archivos PDF válidos. Verifica que tu archivo no esté dañado";
          } else if (xhr.status >= 500) {
            errorMessage = "Acadel está teniendo dificultades técnicas. Intenta de nuevo en unos momentos";
          }
          
          acadelError("No se pudo subir el PDF", errorMessage);
          
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || `Error ${xhr.status}: ${xhr.statusText}`));
          } catch (e) {
            reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        clearAllTimers();
        acadelError("Problema de conexión", "Acadel no puede conectarse al servidor. Verifica tu conexión a internet");
        reject(new Error('Error de red al subir el archivo'));
      });
      
      xhr.addEventListener('abort', () => {
        clearAllTimers();
        acadelInfo("Subida cancelada", "Acadel ha cancelado la subida del PDF como solicitaste");
        const abortError = new Error('Subida cancelada por el usuario');
        abortError.name = 'AbortError';
        reject(abortError);
      });
      
      xhr.open('POST', `${BASE_URL}/api/file/upload`, true);

      const csrfToken = getCsrfToken();
      if (csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      }
      
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          try {
            cancelPDFUpload(chatId).catch(() => {
              // Error silencioso
            });
          } catch (error) {
            // Error silencioso
          }
        });
        
        if (signal.aborted) {
          xhr.abort();
          const abortError = new Error('Subida cancelada por el usuario');
          abortError.name = 'AbortError';
          reject(abortError);
          return;
        }
      }
      
      xhr.send(formData);
    });
  } catch (error) {
    acadelError("Error inesperado", "Acadel tuvo un problema preparando tu PDF. Intenta de nuevo");
    throw error;
  }
}

/**
 * Genera mensajes descriptivos basados en el progreso
 */
export function getProcessingMessage(progress) {
  if (progress === 100) {
    return "¡Listo para estudiar!";
  } else if (progress < 10) {
    return "Acadel está preparando el análisis...";
  } else if (progress < 25) {
    return "Leyendo cada palabra del documento...";
  } else if (progress < 50) {
    return "Analizando página por página...";
  } else if (progress < 75) {
    return "Conectando conceptos e ideas...";
  } else if (progress < 90) {
    return "Organizando todo el conocimiento...";
  }
  return "Ultimando detalles...";
}

/**
 * Cancela un procesamiento de PDF en curso
 */
export async function cancelPDFUpload(chatId = null) {
  try {
    const userId = getState('userId');
    const currentChatId = chatId || getState('currentChatId');
    
    if (!userId || !currentChatId) {
      throw new Error('Se requieren userId y chatId para cancelar procesamiento');
    }
    
    const response = await fetch(`${BASE_URL}/api/file/cancel/${currentChatId}?userId=${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
      throw new Error(errorData.error || 'Error al cancelar procesamiento');
    }
    
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene el estado actual del procesamiento de un PDF
 */
export async function getProcessingStatus(chatId = null) {
  try {
    const userId = getState('userId');
    const currentChatId = chatId || getState('currentChatId');
    
    if (!userId || !currentChatId) {
      return { 
        success: false, 
        isProcessing: false,
        progress: 0,
        status: getProcessingMessage(0)
      };
    }
    
    const timestamp = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/file/status/${currentChatId}?userId=${userId}&_t=${timestamp}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return { 
        success: false, 
        isProcessing: false,
        progress: 0,
        status: 'Verificando estado...'
      };
    }
    
    try {
      const data = await response.json();
      const progress = parseInt(data.progress || 0);
      
      return {
        success: true,
        isProcessing: data.isProcessing !== undefined ? data.isProcessing : true,
        progress: progress,
        status: getProcessingMessage(progress),
        detail: data.detail || '',
        timestamp: Date.now()
      };
    } catch (parseError) {
      return { 
        success: false, 
        isProcessing: false,
        progress: 0,
        status: 'Error verificando estado'
      };
    }
  } catch (error) {
    return { 
      success: false, 
      isProcessing: false,
      progress: 0,
      status: 'Sin conexión'
    };
  }
}

/**
 * Verifica si un chat tiene un PDF asociado
 */
export async function hasPDF(chatId = null) {
  try {
    const userId = getState('userId');
    const currentChatId = chatId || getState('currentChatId');

    if (!userId || !currentChatId) {
      return { success: false, hasPDF: false };
    }

    const endpoint = `${BASE_URL}/api/file/list/${currentChatId}?userId=${userId}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { success: false, hasPDF: false };
    }

    const data = await response.json();
    return {
      success: data.success,
      hasPDF: data.success && data.count > 0,
      pdfInfo: data.success ? data.pdfs[0] : null,
      allPdfs: data.success ? data.pdfs : []
    };
  } catch (error) {
    return { success: false, hasPDF: false, error: error.message };
  }
}

/**
 * Obtiene el texto extraído del PDF
 */
export async function getPDFText(options = {}) {
  try {
    const userId = getState('userId');
    const chatId = getState('currentChatId');
    const { 
      maxPages = 0,
      pdfId = null,
      specificPage = null
    } = options;

    if (!userId || !chatId) {
      acadelError("Sin acceso al documento", "Acadel necesita que estés en un chat con PDF para extraer texto");
      throw new Error('Se requiere userId y chatId para obtener el texto del PDF');
    }

    let endpoint = `${BASE_URL}/api/file/extract-text/${chatId}?userId=${userId}`;
    
    if (maxPages > 0) endpoint += `&maxPages=${maxPages}`;
    if (maxPages === 0) endpoint += `&allPages=true`;
    if (pdfId) endpoint += `&pdfId=${pdfId}`;
    if (specificPage !== null) endpoint += `&specificPage=${specificPage}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      acadelError("No se pudo extraer el texto", "Acadel no puede leer el contenido de tu PDF en este momento");
      throw new Error(errorData.error || 'Error al obtener el texto del PDF');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene una vista previa del PDF como imagen
 */
export async function getPDFPreview(options = {}) {
  try {
    const userId = getState('userId');
    const chatId = getState('currentChatId');
    const { 
      page = 1, 
      pdfId = null,
      width = 800,
      height = null,
      imgIndex = null,
      raw = true
    } = options;

    if (!userId || !chatId) {
      throw new Error('Se requiere userId y chatId para obtener la vista previa');
    }

    let endpoint = `${BASE_URL}/api/file/preview/${chatId}?userId=${userId}&page=${page}`;
    
    if (pdfId) endpoint += `&pdfId=${pdfId}`;
    if (width) endpoint += `&width=${width}`;
    if (height) endpoint += `&height=${height}`;
    if (imgIndex !== null) endpoint += `&imgIndex=${imgIndex}`;
    if (raw !== null) endpoint += `&raw=${raw}`;

    if (raw) {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al obtener la vista previa del PDF');
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } else {
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener la vista previa del PDF');
      }

      const data = await response.json();
      return data;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene el texto de una región seleccionada del PDF
 */
export async function getTextFromRegion(regionData) {
  try {
    const userId = getState('userId');
    const chatId = getState('currentChatId');
    const { 
      page, 
      x1, y1, x2, y2,
      scale = 1,
      pdfId = null
    } = regionData;

    if (!userId || !chatId) {
      throw new Error('Se requiere userId y chatId para obtener texto de región');
    }

    if (!page || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
      acadelWarning("Selección incompleta", "Acadel necesita que selecciones una región específica del PDF");
      throw new Error('Se requieren coordenadas completas para obtener texto de región');
    }

    let endpoint = `${BASE_URL}/api/file/extract-text-selection/${chatId}?userId=${userId}&page=${page}`;
    endpoint += `&x1=${x1}&y1=${y1}&x2=${x2}&y2=${y2}&scale=${scale}`;
    
    if (pdfId) endpoint += `&pdfId=${pdfId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      acadelError("No se pudo extraer la selección", "Acadel no puede leer esa parte específica del PDF");
      throw new Error(errorData.error || 'Error al obtener texto de la región');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Elimina un PDF del chat
 */
export async function deletePDF(pdfId = null) {
  try {
    const userId = getState('userId');
    const chatId = getState('currentChatId');

    if (!userId || !chatId) {
      acadelError("Sin acceso al documento", "Acadel no puede eliminar el PDF sin identificar el chat");
      throw new Error('Se requiere userId y chatId para eliminar un PDF');
    }

    let endpoint = `${BASE_URL}/api/file/delete/${chatId}?userId=${userId}`;
    if (pdfId) endpoint += `&pdfId=${pdfId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      acadelError("No se pudo eliminar", "Acadel tuvo problemas eliminando tu PDF. Intenta de nuevo");
      throw new Error(errorData.error || 'Error al eliminar el PDF');
    }

    // Notificación de éxito
    acadelExito("🗑️ PDF eliminado", "Acadel ha limpiado el documento de este chat");

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Envía una consulta al chat relacionada con el contenido del PDF
 */
export async function sendPDFQuery(message, options = {}) {
  try {
    const userId = getState('userId');
    const herramientaId = getState('herramientaId');
    const chatId = getState('currentChatId');

    if (!userId || !chatId) {
      acadelError("Sin contexto activo", "Acadel necesita un chat activo para responder sobre el PDF");
      throw new Error('Se requiere userId y chatId para enviar una consulta');
    }

    const payload = {
      userId,
      herramientaId,
      chatId,
      query: message,
      ...options
    };

    const response = await fetch(`${BASE_URL}/api/openai/query-pdf`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      acadelError("Error procesando consulta", "Acadel no pudo analizar tu pregunta sobre el PDF");
      throw new Error(errorData.error || 'Error al enviar consulta sobre PDF');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene la URL para descargar el PDF original
 */
export function getPDFDownloadUrl(options = {}) {
  const userId = getState('userId');
  const chatId = getState('currentChatId');
  const { pdfId = null } = options;

  if (!userId || !chatId) {
    return null;
  }

  let url = `${BASE_URL}/api/file/serve/${chatId}?userId=${userId}`;
  if (pdfId) url += `&pdfId=${pdfId}`;

  return url;
}

export default {
  uploadPDF,
  cancelPDFUpload,
  getProcessingStatus,
  hasPDF,
  getPDFText,
  getPDFPreview,
  getTextFromRegion,
  deletePDF,
  sendPDFQuery,
  getPDFDownloadUrl,
  getProcessingMessage
};