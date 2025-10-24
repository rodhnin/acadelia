// backend/services/chat/feedbackService.js
import pool from '../../lib/dbPool.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class FeedbackService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }

  /**
   * ✅ NUEVA FUNCIÓN: Filtra contenido sensible del mensaje
   * @param {string} content - Contenido original del mensaje
   * @returns {string} Contenido filtrado
   */
  filterSensitiveContent(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    let filteredContent = content;

    // Patrones de contenido sensible a filtrar
    const sensitivePatterns = [
      // Rutas del servidor
      /\/uploads\/[^\s\])\}]+/gi,
      /\/api\/[^\s\])\}]+/gi,
      /\/backend\/[^\s\])\}]+/gi,
      /\/public\/[^\s\])\}]+/gi,
      /\/static\/[^\s\])\}]+/gi,
      /\/assets\/[^\s\])\}]+/gi,
      
      // URLs completas del servidor
      /https?:\/\/[^\/\s]+\/uploads\/[^\s\])\}]+/gi,
      /https?:\/\/[^\/\s]+\/api\/[^\s\])\}]+/gi,
      /https?:\/\/[^\/\s]+\/backend\/[^\s\])\}]+/gi,
      
      // IDs de archivos específicos
      /file_[a-zA-Z0-9\-_]+/gi,
      /attachment_[a-zA-Z0-9\-_]+/gi,
      
      // Paths del sistema
      /C:\\[^\s\])\}]+/gi,
      /\/var\/[^\s\])\}]+/gi,
      /\/tmp\/[^\s\])\}]+/gi,
      /\/home\/[^\s\])\}]+/gi,
      
      // Tokens y claves (patrones comunes)
      /[A-Za-z0-9]{20,}/g, // Tokens largos
      /sk-[A-Za-z0-9]+/gi, // Claves API OpenAI
      /[a-f0-9]{32,}/gi, // Hashes MD5/SHA
      
      // IPs locales
      /192\.168\.\d{1,3}\.\d{1,3}/g,
      /10\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
      /172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}/g,
      /127\.0\.0\.1/g,
      /localhost:[0-9]+/gi,
      
      // Información de base de datos
      /postgresql:\/\/[^\s\])\}]+/gi,
      /mysql:\/\/[^\s\])\}]+/gi,
      /mongodb:\/\/[^\s\])\}]+/gi,
      
      // Variables de entorno sensibles
      /process\.env\.[A-Z_]+/gi,
      /\$\{[A-Z_]+\}/gi,
      
      // Errores del sistema que pueden exponer rutas
      /Error: ENOENT: no such file or directory[^\n]*/gi,
      /at [A-Z]:\\[^\n]*/gi,
      /at \/[^\n]*/gi,
    ];

    // Aplicar filtros
    sensitivePatterns.forEach(pattern => {
      filteredContent = filteredContent.replace(pattern, '[CONTENIDO_FILTRADO]');
    });

    // Filtrar contenido en formato JSON/markdown que pueda contener URLs
    try {
      // Si es un JSON string, parsearlo y filtrar
      if (filteredContent.trim().startsWith('{') && filteredContent.trim().endsWith('}')) {
        const parsed = JSON.parse(filteredContent);
        const cleanedJson = this.filterJsonContent(parsed);
        filteredContent = JSON.stringify(cleanedJson, null, 2);
      }
    } catch (e) {
      // No es JSON válido, continuar con el filtrado normal
    }

    // Filtrar imágenes base64 muy largas (mantener solo una muestra)
    filteredContent = filteredContent.replace(
      /data:image\/[^;]+;base64,[A-Za-z0-9+\/=]{100,}/g,
      'data:image/[TIPO];base64,[IMAGEN_BASE64_FILTRADA]'
    );

    return filteredContent;
  }

  /**
   * ✅ NUEVA FUNCIÓN: Filtra contenido sensible en objetos JSON
   * @param {any} obj - Objeto a filtrar
   * @returns {any} Objeto filtrado
   */
  filterJsonContent(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.filterJsonContent(item));
    }

    const filtered = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Filtrar URLs y rutas en valores string
        if (key.toLowerCase().includes('url') || 
            key.toLowerCase().includes('path') ||
            key.toLowerCase().includes('src') ||
            value.includes('/uploads/') ||
            value.includes('/api/') ||
            value.startsWith('http')) {
          filtered[key] = '[URL_FILTRADA]';
        } else {
          filtered[key] = this.filterSensitiveContent(value);
        }
      } else if (typeof value === 'object') {
        filtered[key] = this.filterJsonContent(value);
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  }

/**
   * ✅ NUEVA FUNCIÓN MEJORADA: Limpia HTML y convierte a texto plano
   * @param {string} htmlContent - Contenido HTML a limpiar
   * @returns {string} Texto plano limpio
   */
  cleanHtmlToPlainText(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return htmlContent;
    }

    let cleanText = htmlContent;

    try {
      // 🧹 REMOVER ELEMENTOS HTML ESPECÍFICOS
      const htmlCleanupPatterns = [
        // Elementos MathJax completos
        /<mjx-container[^>]*>.*?<\/mjx-container>/gs,
        /<mjx-assistive-mml[^>]*>.*?<\/mjx-assistive-mml>/gs,
        
        // Elementos de imágenes de Markdown
        /<div class="markdown-image-container"[^>]*>.*?<\/div>/gs,
        /<div class="markdown-image-wrapper"[^>]*>.*?<\/div>/gs,
        /<div class="image-placeholder"[^>]*>.*?<\/div>/gs,
        /<div class="image-overlay"[^>]*>.*?<\/div>/gs,
        /<div class="markdown-image-caption"[^>]*>.*?<\/div>/gs,
        
        // Imágenes que ya están filtradas
        /<img[^>]*src="\[CONTENIDO_FILTRADO\]"[^>]*>/g,
        
        // Scripts y estilos
        /<script[^>]*>.*?<\/script>/gs,
        /<style[^>]*>.*?<\/style>/gs,
        
        // Elementos de espaciado de listas
        /<div class="list-spacer"[^>]*><\/div>/g,
      ];

      htmlCleanupPatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, '');
      });

      // 🔄 CONVERTIR ELEMENTOS MATEMÁTICOS A LATEX SIMPLE
      cleanText = this.convertMathJaxToLatex(cleanText);

      // 🔄 CONVERTIR LISTAS HTML A TEXTO PLANO
      cleanText = this.convertHtmlListsToText(cleanText);

      // 🔄 CONVERTIR PÁRRAFOS A TEXTO CON SALTOS DE LÍNEA
      cleanText = cleanText.replace(/<p[^>]*>(.*?)<\/p>/gs, '$1\n\n');

      // 🔄 CONVERTIR IMÁGENES A TEXTO DESCRIPTIVO
      cleanText = cleanText.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '[$1]');
      cleanText = cleanText.replace(/<img[^>]*>/g, '[Imagen]');

      // 🧹 REMOVER TODAS LAS ETIQUETAS HTML RESTANTES
      cleanText = cleanText.replace(/<[^>]*>/g, '');

      // 🧹 DECODIFICAR ENTIDADES HTML
      const htmlEntities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&nbsp;': ' ',
        '&ndash;': '–',
        '&mdash;': '—',
        '&hellip;': '...',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™'
      };

      Object.entries(htmlEntities).forEach(([entity, char]) => {
        cleanText = cleanText.replace(new RegExp(entity, 'g'), char);
      });

      // 🧹 LIMPIEZA FINAL
      cleanText = cleanText
        // Limpiar espacios múltiples
        .replace(/[ \t]+/g, ' ')
        // Limpiar saltos de línea múltiples (máximo 2)
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        // Limpiar espacios al inicio/final de líneas
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        // Trim general
        .trim();

      return cleanText;

    } catch (error) {
      console.warn('⚠️ [FEEDBACK SERVICE] Error limpiando HTML:', error);
      // Fallback: limpieza básica
      return htmlContent
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Convierte MathJax HTML a LaTeX simple
   * @param {string} content - Contenido con MathJax
   * @returns {string} Contenido con LaTeX simple
   */
  convertMathJaxToLatex(content) {
    try {
      // Extraer contenido de span.math-inline que contenga MathJax
      content = content.replace(
        /<span class="math-inline"[^>]*>.*?<mjx-container[^>]*>.*?<mjx-math[^>]*>(.*?)<\/mjx-math>.*?<\/mjx-container>.*?<\/span>/gs,
        (match) => {
          // Buscar texto matemático limpio en el match
          const textMatch = match.match(/>\s*(sin|cos|tan|log|ln|pi|theta|alpha|beta|gamma|delta|sigma|mu|x|y|z|\d|\+|\-|\*|\/|\(|\)|,|\s)+\s*</);
          if (textMatch) {
            let mathText = textMatch[0].replace(/^>\s*/, '').replace(/\s*<$/, '');
            
            // Conversiones básicas
            mathText = mathText
              .replace(/⁡/g, '') // Eliminar operador de función invisible
              .replace(/π/g, '\\pi')
              .replace(/θ/g, '\\theta')
              .replace(/α/g, '\\alpha')
              .replace(/β/g, '\\beta')
              .replace(/−/g, '-')
              .trim();
            
            return ` $${mathText}$ `;
          }
          return ' [Fórmula matemática] ';
        }
      );

      return content;
    } catch (error) {
      console.warn('⚠️ [FEEDBACK SERVICE] Error convirtiendo MathJax:', error);
      return content;
    }
  }

  /**
   * ✅ NUEVA FUNCIÓN: Convierte listas HTML a texto plano
   * @param {string} content - Contenido con listas HTML
   * @returns {string} Contenido con listas en texto plano
   */
  convertHtmlListsToText(content) {
    try {
      // Convertir listas no ordenadas
      content = content.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, listContent) => {
        const items = listContent.match(/<li[^>]*>(.*?)<\/li>/gs);
        if (items) {
          const textItems = items.map(item => {
            const text = item.replace(/<[^>]*>/g, '').trim();
            return text ? `• ${text}` : '';
          }).filter(Boolean);
          return textItems.join('\n') + '\n';
        }
        return '';
      });

      // Convertir listas ordenadas
      content = content.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, listContent) => {
        const items = listContent.match(/<li[^>]*>(.*?)<\/li>/gs);
        if (items) {
          const textItems = items.map((item, index) => {
            const text = item.replace(/<[^>]*>/g, '').trim();
            return text ? `${index + 1}. ${text}` : '';
          }).filter(Boolean);
          return textItems.join('\n') + '\n';
        }
        return '';
      });

      return content;
    } catch (error) {
      console.warn('⚠️ [FEEDBACK SERVICE] Error convirtiendo listas:', error);
      return content;
    }
  }

  /**
   * ✅ FUNCIÓN MEJORADA: Obtiene el contenido original de un mensaje específico
   */
  async getMessageOriginalContent(chatId, userId, messageId) {
    try {
      console.log(`🔍 [FEEDBACK SERVICE] Verificando acceso - Chat: ${chatId}, Usuario: ${userId}, Mensaje: ${messageId}`);
      
      // Verificar que el chat existe y pertenece al usuario
      const chatCheck = await pool.query(
        `SELECT id_chat FROM chat WHERE id_chat = $1 AND id_user = $2 AND is_deleted = false`,
        [chatId, userId]
      );
      
      if (chatCheck.rowCount === 0) {
        console.warn(`❌ [FEEDBACK SERVICE] Acceso denegado - Chat ${chatId} no encontrado o no pertenece al usuario ${userId}`);
        return {
          success: false,
          error: 'Chat no encontrado o acceso no autorizado'
        };
      }

      console.log(`✅ [FEEDBACK SERVICE] Acceso verificado - Obteniendo mensaje ${messageId}`);

      // Obtener el mensaje específico
      const messageQuery = `
        SELECT 
          ch.id,
          ch.role,
          ch.message,
          ch.timestamp,
          ch.is_multimodal
        FROM chat_history ch
        INNER JOIN chat c ON ch.id_chat = c.id_chat
        WHERE ch.id = $1 
        AND ch.id_chat = $2 
        AND c.id_user = $3
        AND (ch.status IS NULL OR ch.status != 'cancelled')
      `;

      const result = await pool.query(messageQuery, [messageId, chatId, userId]);

      if (result.rowCount === 0) {
        console.warn(`❌ [FEEDBACK SERVICE] Mensaje ${messageId} no encontrado en chat ${chatId}`);
        return {
          success: false,
          error: 'Mensaje no encontrado'
        };
      }

      const message = result.rows[0];
      let originalContent = message.message;
      
      console.log(`📝 [FEEDBACK SERVICE] Mensaje encontrado - Rol: ${message.role}, Multimodal: ${message.is_multimodal}, Longitud: ${originalContent?.length || 0}`);
      
      // Si es un mensaje multimodal, intentar extraer solo el texto
      if (message.is_multimodal) {
        console.log(`🔄 [FEEDBACK SERVICE] Procesando mensaje multimodal`);
        try {
          // Puede estar doblemente stringificado
          let parsed = originalContent;
          
          // Intentar parsear múltiples niveles de stringify
          while (typeof parsed === 'string' && 
                 (parsed.startsWith('"{') || parsed.startsWith('{'))) {
            try {
              parsed = JSON.parse(parsed);
            } catch (e) {
              break;
            }
          }
          
          // Extraer solo el texto del mensaje multimodal
          if (typeof parsed === 'object' && parsed.text) {
            originalContent = parsed.text;
            console.log(`✅ [FEEDBACK SERVICE] Texto extraído de objeto multimodal`);
          } else if (typeof parsed === 'object' && parsed.content) {
            originalContent = parsed.content;
            console.log(`✅ [FEEDBACK SERVICE] Contenido extraído de objeto multimodal`);
          }
        } catch (e) {
          console.warn('⚠️ [FEEDBACK SERVICE] Error parseando mensaje multimodal para copia:', e);
          // Usar el contenido original si no se puede parsear
        }
      }

      // 🔄 NUEVA LIMPIEZA: Convertir HTML a texto plano ANTES del filtrado
      console.log(`🧹 [FEEDBACK SERVICE] Limpiando HTML y convirtiendo a texto plano`);
      const cleanPlainText = this.cleanHtmlToPlainText(originalContent);

      // Aplicar filtrado de contenido sensible AL TEXTO LIMPIO
      console.log(`🔒 [FEEDBACK SERVICE] Aplicando filtros de seguridad`);
      const filteredContent = this.filterSensitiveContent(cleanPlainText);
      
      const filteringApplied = cleanPlainText !== filteredContent;
      if (filteringApplied) {
        const filteredCount = (filteredContent.match(/\[CONTENIDO_FILTRADO\]/g) || []).length;
        console.log(`🔒 [FEEDBACK SERVICE] Filtrado aplicado - ${filteredCount} elementos sensibles removidos`);
      } else {
        console.log(`✅ [FEEDBACK SERVICE] No se encontró contenido sensible`);
      }

      console.log(`✅ [FEEDBACK SERVICE] Contenido procesado exitosamente - Original: ${originalContent?.length || 0} caracteres, Limpio: ${cleanPlainText?.length || 0} caracteres, Filtrado: ${filteredContent?.length || 0} caracteres`);

      return {
        success: true,
        data: {
          id: message.id,
          role: message.role,
          originalContent: cleanPlainText, // Devolver el texto limpio como "original"
          filteredContent: filteredContent,
          timestamp: message.timestamp,
          isMultimodal: message.is_multimodal,
          filteringApplied: filteringApplied
        }
      };

    } catch (error) {
      console.error('❌ [FEEDBACK SERVICE] Error obteniendo contenido original del mensaje:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Guarda el feedback en la base de datos
   * @param {Object} feedbackData - Datos del feedback
   * @returns {Promise<Object>} Resultado del guardado
   */
  async saveFeedback(feedbackData) {
    const { type, feedback, id_chat, id_message, messageContent, id_user } = feedbackData;
    
    const query = `
      INSERT INTO feedback (
        type, 
        feedback_text, 
        id_chat, 
        id_message, 
        message_content, 
        id_user, 
        email_sent
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const values = [
      type,
      feedback || '',
      id_chat,
      id_message,
      messageContent || '',
      id_user || null,
      false
    ];
    
    try {
      const { rows } = await pool.query(query, values);
      console.log('Feedback guardado en BD con ID:', rows[0].id);
      return rows[0];
    } catch (error) {
      console.error('Error guardando feedback en BD:', error);
      throw error;
    }
  }

 /**
 * Envía un correo con el feedback y actualiza el estado en la BD
 * @param {number} feedbackId - ID del feedback en la BD
 * @returns {Promise<Object>} Resultado del envío
 */
async sendFeedbackEmail(feedbackId) {
  // Obtener el feedback de la base de datos con información del usuario y mensaje
  const query = `
    SELECT 
      f.*, 
      u.correo as user_email,
      ch.message as original_message,
      c.title as chat_title
    FROM 
      feedback f
    LEFT JOIN 
      usuario u ON f.id_user = u.id_user
    LEFT JOIN 
      chat_history ch ON f.id_message = ch.id
    LEFT JOIN 
      chat c ON f.id_chat = c.id_chat
    WHERE 
      f.id = $1
  `;
  
  try {
    const { rows } = await pool.query(query, [feedbackId]);
    
    if (rows.length === 0) {
      console.warn(`Feedback con ID ${feedbackId} no encontrado en base de datos`);
      return { success: false, error: 'Feedback no encontrado' };
    }
    
    const feedback = rows[0];
    
    // Preparar texto del correo (en formato texto plano estructurado)
    const emailText = `
FEEDBACK DE USUARIO EN ACADELIA
==============================

Tipo: ${feedback.type === 'positive' ? 'Positivo 👍' : 'Negativo 👎'}
Comentario: ${feedback.feedback_text || 'No proporcionado'}
Chat: ${feedback.chat_title || 'Sin título'} (ID: ${feedback.id_chat || 'No disponible'})
Mensaje ID: ${feedback.id_message || 'No disponible'}
Usuario: ${feedback.user_email || 'Anónimo'}
Fecha: ${new Date(feedback.created_at).toLocaleString()}

CONTENIDO DEL MENSAJE EVALUADO:
-------------------------------
${feedback.message_content || feedback.original_message || 'No disponible'}

==============================
Este es un mensaje automático del sistema de Acadelia.
    `;
    
    // Configurar opciones del correo
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.FEEDBACK_EMAIL || process.env.EMAIL_USER,
      subject: `Acadelia - Nuevo feedback ${feedback.type === 'positive' ? 'positivo' : 'negativo'}`,
      text: emailText
    };
    
    // Intentar enviar el correo pero manejar errores
    try {
      // Intentar enviar correo
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email de feedback enviado:', info.messageId);
      
      // Si el correo se envió correctamente, actualizar el estado en BD
      await pool.query(
        'UPDATE feedback SET email_sent = true WHERE id = $1',
        [feedbackId]
      );
      
      return { 
        success: true, 
        messageId: info.messageId,
        feedbackId: feedbackId
      };
    } catch (emailError) {
      // Manejar específicamente errores de envío de correo
      console.error('Error enviando email de feedback:', emailError);
      
      // No actualizar estado en BD para que pueda reintentarse después
      // Devolver información sobre el error pero sin lanzar excepción
      return { 
        success: false, 
        error: emailError.message,
        errorCode: emailError.code || 'UNKNOWN',
        feedbackSaved: true,  // El feedback ya está guardado en BD
        feedbackId: feedbackId
      };
    }
  } catch (dbError) {
    // Si hay un error consultando la base de datos, registrarlo pero no detener el proceso
    console.error('Error al obtener datos de feedback de la BD:', dbError);
    return {
      success: false,
      error: dbError.message,
      stage: 'database_query'
    };
  }
}
 
  /**
   * Procesa todos los feedbacks pendientes de enviar por correo
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processPendingFeedbacks() {
    const query = `
      SELECT id FROM feedback 
      WHERE email_sent = false
      ORDER BY created_at ASC
      LIMIT 50
    `;
    
    try {
      const { rows } = await pool.query(query);
      console.log(`Se encontraron ${rows.length} feedbacks pendientes de enviar`);
      
      const results = {
        total: rows.length,
        successful: 0,
        failed: 0
      };
      
      for (const row of rows) {
        try {
          await this.sendFeedbackEmail(row.id);
          results.successful++;
        } catch (error) {
          console.error(`Error enviando feedback ID ${row.id}:`, error);
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error procesando feedbacks pendientes:', error);
      throw error;
    }
  }
}

export default new FeedbackService();