import nodemailer from 'nodemailer';
import path from 'path';
import pool from '../../lib/dbPool.js';

class ArgentinaEmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER || 'drolinq@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS || 'gdusgkaujddzimxd'
      }
    });
    
    // URL base para Argentina
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    
    // Colores de la marca Acadelia
    this.brandColors = {
      primary: '#656d4a',     // Verde oscuro (pizarra)
      secondary: '#e0a458',   // Naranja/marrón (color del oso)
      light: '#f9f9f9',       // Casi blanco
      dark: '#333333',        // Texto oscuro
      border: '#e0e0e0',      // Bordes claros
      marron: '#582f0e'       // Marrón oscuro
    };
    
    // URLs de imágenes en Imgur
    this.imageUrls = {
      logo: "https://i.imgur.com/Qzt8dZs.png",     // Logo de Acadelia
      mascota: "https://i.imgur.com/1zF4b3h.png",   // Mascota de Acadelia
      profesorFeliz: "https://i.imgur.com/leLwp5s.png", // Profesor Acadel feliz
      profesorTriste: "https://i.imgur.com/xwLSkfQ.png", // Profesor Acadel triste
      profesorCapibara: "https://i.imgur.com/0ml5iJ1.png" // Profesor Acadel capibara
    };
  }

  /**
   * Verifica la conexión con el servidor de correo
   * @returns {Promise<boolean>} - Resultado de la verificación
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Error al verificar conexión de email:', error);
      return false;
    }
  }

  /**
   * Plantilla para nueva suscripción activa en Argentina
   * @param {Object} subscriptionData - Datos de la suscripción
   * @param {Object} userData - Datos del usuario
   * @returns {string} - HTML de la plantilla
   */
  getNewSubscriptionTemplate(subscriptionData, userData) {
    const logoUrl = this.imageUrls.logo;
    const profesorFelizUrl = this.imageUrls.profesorFeliz;
    
    const startDate = new Date(subscriptionData.start_date);
    const endDate = new Date(subscriptionData.end_date);
    const dateOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    const formattedStartDate = startDate.toLocaleDateString('es-AR', dateOptions);
    const formattedEndDate = endDate.toLocaleDateString('es-AR', dateOptions);
    
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(subscriptionData.amount);
    
    const userName = userData.nombres && userData.nombres !== 'Sin nombre' 
      ? userData.nombres 
      : userData.correo.split('@')[0];

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Suscripción Activa! - Acadelia Argentina</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Parkinsans:wght@600..800&display=swap" rel="stylesheet">
        <style>
          @media only screen and (max-width: 600px) {
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .main-table {
              width: 100% !important;
              margin: 0 !important;
            }
            .content-wrapper {
              padding: 0 !important;
            }
            .logo-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px 0 !important;
              text-align: center !important;
            }
            .message-column {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 20px 10px !important;
              box-sizing: border-box !important;
            }
            .message-heading {
              text-align: center !important;
              font-size: 22px !important;
              width: 100% !important;
              padding: 0 10px !important;
              margin: 0 auto 15px !important;
              box-sizing: border-box !important;
            }
            .info-column {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 20px 15px !important;
              box-sizing: border-box !important;
            }
            .info-heading {
              text-align: center !important;
              margin: 0 auto 15px !important;
              display: block !important;
            }
            .info-text {
              text-align: center !important;
            }
            .info-list {
              display: inline-block !important;
              text-align: left !important;
              max-width: 90% !important;
            }
            .professor-column {
              display: block !important;
              width: 100% !important;
              padding: 10px 0 20px !important;
              text-align: center !important;
            }
            .info-container {
              padding: 15px !important;
              box-sizing: border-box !important;
            }
            .action-button {
              margin: 0 auto !important;
            }
            .subscription-details-table {
              width: 100% !important;
            }
            .detail-cell {
              padding: 8px 5px !important;
              font-size: 12px !important;
            }
            .detail-value {
              font-size: 12px !important;
            }
            .speech-bubble:before {
              display: none !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
        <div style="width: 100%; max-width: 100%; text-align: center;">
          <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
            <!-- Header con logo y mensaje de éxito -->
            <tr>
              <td class="content-wrapper" style="padding: 0;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <!-- Columna del logo -->
                    <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                      <div style="text-align: center;">
                        <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                        <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">¡SUSCRIPCIÓN ACTIVA!</div>
                      </div>
                    </td>
                    
                    <!-- Columna del mensaje -->
                    <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                      <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #008847; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">¡Hola, ${userName}!</h1>
                      
                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                        ¡Excelentes noticias! Tu pago ha sido aprobado y tu suscripción a <strong>${subscriptionData.carrera_nombre}</strong> ya está activa. ¡Comenzá a disfrutar de todos los beneficios!
                      </p>
                      
                      <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                        Tu suscripción está activa hasta: ${formattedEndDate}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Mensaje del Profesor Acadel FELIZ -->
            <tr>
              <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr class="professor-row">
                    <!-- Imagen del Profesor Acadel feliz -->
                    <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                      <div style="position: relative; text-align: center;">
                        <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                        <div style="position: relative; z-index: 1; text-align: center;">
                          <img src="${profesorFelizUrl}" alt="Profesor Acadel Feliz" style="width: 130px; height: auto; margin: 0 auto -5px;">
                        </div>
                      </div>
                    </td>
                    
                    <!-- Mensaje en un globo -->
                    <td style="padding: 20px; vertical-align: middle; text-align: left;">
                      <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Triángulo para el globo de diálogo -->
                        <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                        
                        <p style="font-family: 'Parkinsans', sans-serif; color: #008847; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Fantástico! Ya sos parte de Acadelia</p>
                        <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                          ¡Qué alegría tenerte con nosotros! Tu pago fue aprobado exitosamente y ya podés acceder a todos los recursos educativos de tu carrera. ¡Preparate para una experiencia de aprendizaje increíble!
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Detalles de la suscripción -->
            <tr>
              <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" class="subscription-details-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                  <tr style="background-color: #008847;">
                    <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles de tu Suscripción</th>
                  </tr>
                  <tr style="background-color: #f0efe7;">
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Carrera</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${subscriptionData.carrera_nombre}</td>
                  </tr>
                  <tr>
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Tipo de Plan</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${subscriptionData.billing_cycle === 'month' ? 'Mensual' : 'Anual'}</td>
                  </tr>
                  <tr style="background-color: #f0efe7;">
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Monto Pagado</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #008847;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Método de Pago</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${subscriptionData.payment_method === 'bank_transfer' ? 'Transferencia Bancaria' : 'Ualá Bis'}</td>
                  </tr>
                  <tr style="background-color: #f0efe7;">
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Inicio de Suscripción</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedStartDate}</td>
                  </tr>
                  <tr>
                    <td class="detail-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Vencimiento</td>
                    <td class="detail-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${formattedEndDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Botón de acción -->
            <tr>
              <td style="padding: 0 30px 20px; text-align: center; background-color: #f5f5f5;">
                <a href="${this.baseUrl}/dashboard" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                  Acceder a mi Dashboard
                </a>
              </td>
            </tr>
            
            <!-- Información importante -->
            <tr>
              <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                      <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Qué podés hacer ahora?</h2>
                      
                      <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                        <li style="margin-bottom: 10px; text-align: left;">Acceder a todos los recursos de tu carrera</li>
                        <li style="margin-bottom: 10px; text-align: left;">Utilizar el asistente virtual académico especializado</li>
                        <li style="margin-bottom: 10px; text-align: left;">Gestionar tu suscripción desde tu dashboard</li>
                        <li style="text-align: left;">Contactar soporte si necesitás ayuda</li>
                      </ul>
                      
                      <!-- Botón de contacto -->
                      <div style="text-align: center; margin-top: 20px;">
                        <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #a4ac86; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(164, 172, 134, 0.2);">
                          Contactar Soporte
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
                <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia Argentina. Todos los derechos reservados</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plantilla para transacción en revisión
   * @param {Object} paymentData - Datos del pago
   * @param {Object} userData - Datos del usuario
   * @returns {string} - HTML de la plantilla
   */
  getPaymentUnderReviewTemplate(paymentData, userData) {
    const logoUrl = this.imageUrls.logo;
    const profesorCapibaraUrl = this.imageUrls.profesorCapibara;
    
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(paymentData.amount);
    
    const userName = userData.nombres && userData.nombres !== 'Sin nombre' 
      ? userData.nombres 
      : userData.correo.split('@')[0];

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago en Revisión - Acadelia Argentina</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Parkinsans:wght@600..800&display=swap" rel="stylesheet">
        <style>
          @media only screen and (max-width: 600px) {
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .main-table {
              width: 100% !important;
              margin: 0 !important;
            }
            .content-wrapper {
              padding: 0 !important;
            }
            .logo-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px 0 !important;
              text-align: center !important;
            }
            .message-column {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 20px 10px !important;
              box-sizing: border-box !important;
            }
            .message-heading {
              text-align: center !important;
              font-size: 22px !important;
              width: 100% !important;
              padding: 0 10px !important;
              margin: 0 auto 15px !important;
              box-sizing: border-box !important;
            }
            .professor-row td {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 10px 15px !important;
              box-sizing: border-box !important;
            }
            .speech-bubble {
              margin: 15px auto 0 !important;
              max-width: 90% !important;
            }
            .speech-bubble:before {
              display: none !important;
            }
            .info-container {
              padding: 15px !important;
              box-sizing: border-box !important;
            }
            .action-button {
              margin: 0 auto !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
        <div style="width: 100%; max-width: 100%; text-align: center;">
          <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
            <!-- Header con logo y mensaje -->
            <tr>
              <td class="content-wrapper" style="padding: 0;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <!-- Columna del logo -->
                    <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                      <div style="text-align: center;">
                        <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                        <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">PAGO EN REVISIÓN</div>
                      </div>
                    </td>
                    
                    <!-- Columna del mensaje -->
                    <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                      <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #e0a458; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">¡Hola, ${userName}!</h1>
                      
                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                        Recibimos tu transferencia por <strong>${formattedAmount}</strong> para <strong>${paymentData.carrera_nombre}</strong>. Nuestro equipo la está revisando.
                      </p>
                      
                      <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                        Tiempo de revisión: 12-24 horas hábiles
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Mensaje del Profesor Acadel -->
            <tr>
              <td style="padding: 30px 30px 20px; background-color: #f5f5f5; text-align: center;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr class="professor-row">
                    <!-- Profesor Acadel en círculo -->
                    <td style="width: 170px; padding: 20px; vertical-align: middle; text-align: center;">
                      <div style="position: relative; text-align: center;">
                        <!-- Círculo de fondo para la imagen -->
                        <div style="width: 140px; height: 140px; border-radius: 50%; background-color: #f0efe7; border: 3px solid #a4ac86; display: inline-block; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                          <!-- Imagen del profesor centrada en el círculo -->
                          <img src="${profesorCapibaraUrl}" alt="Profesor Acadel" style="width: 130px; height: 130px; object-fit: contain; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" />
                        </div>
                        <p style="font-family: 'Parkinsans', sans-serif; font-size: 14px; color: #656d4a; margin: 10px 0 0; font-style: italic; text-align: center;">Profesor Acadel</p>
                      </div>
                    </td>
                    
                    <!-- Globo de mensaje -->
                    <td style="padding: 20px; vertical-align: middle; text-align: left;">
                      <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Triángulo para el globo de diálogo -->
                        <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                        
                        <p style="font-family: 'Parkinsans', sans-serif; color: #e0a458; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Tu transferencia está en buenas manos!</p>
                        <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                          ¡Gracias por confiar en nosotros! Ya recibimos tu comprobante de transferencia y nuestro equipo especializado lo está verificando. En un máximo de 24 horas hábiles te avisaremos por email si fue aprobada. ¡Estate atento a tu casilla!
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Información importante -->
            <tr>
              <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                      <h2 style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Qué pasa ahora?</h2>
                      
                      <ul style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                        <li style="margin-bottom: 10px; text-align: left;">Nuestro equipo verificará los datos de tu transferencia</li>
                        <li style="margin-bottom: 10px; text-align: left;">Te notificaremos por email cuando sea aprobada</li>
                        <li style="margin-bottom: 10px; text-align: left;">Una vez aprobada, tu suscripción se activará automáticamente</li>
                        <li style="text-align: left;">Si hay algún problema, te contactaremos para solucionarlo</li>
                      </ul>
                      
                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center; font-style: italic;">
                        ¿Tenés alguna consulta? No dudes en contactarnos.
                      </p>
                      
                      <!-- Botón de contacto -->
                      <div style="text-align: center; margin-top: 20px;">
                        <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #a4ac86; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(164, 172, 134, 0.2);">
                          Contactar Soporte
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
                <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia Argentina. Todos los derechos reservados</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plantilla para suscripción expirada
   * @param {Object} subscriptionData - Datos de la suscripción expirada
   * @param {Object} userData - Datos del usuario
   * @returns {string} - HTML de la plantilla
   */
  getSubscriptionExpiredTemplate(subscriptionData, userData) {
    const logoUrl = this.imageUrls.logo;
    const profesorTristeUrl = this.imageUrls.profesorTriste;
    
    const userName = userData.nombres && userData.nombres !== 'Sin nombre' 
      ? userData.nombres 
      : userData.correo.split('@')[0];

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Suscripción Expirada - Acadelia Argentina</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Parkinsans:wght@600..800&display=swap" rel="stylesheet">
        <style>
          @media only screen and (max-width: 600px) {
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .main-table {
              width: 100% !important;
              margin: 0 !important;
            }
            .content-wrapper {
              padding: 0 !important;
            }
            .logo-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px 0 !important;
              text-align: center !important;
            }
            .message-column {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 20px 10px !important;
              box-sizing: border-box !important;
            }
            .message-heading {
              text-align: center !important;
              font-size: 22px !important;
              width: 100% !important;
              padding: 0 10px !important;
              margin: 0 auto 15px !important;
              box-sizing: border-box !important;
            }
            .professor-column {
              display: block !important;
              width: 100% !important;
              padding: 10px 0 20px !important;
              text-align: center !important;
            }
            .speech-bubble:before {
              display: none !important;
            }
            .info-container {
              padding: 15px !important;
              box-sizing: border-box !important;
            }
            .action-button {
              margin: 0 auto !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
        <div style="width: 100%; max-width: 100%; text-align: center;">
          <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
            <!-- Header con logo y mensaje -->
            <tr>
              <td class="content-wrapper" style="padding: 0;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <!-- Columna del logo -->
                    <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                      <div style="text-align: center;">
                        <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                        <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">SUSCRIPCIÓN EXPIRADA</div>
                      </div>
                    </td>
                    
                    <!-- Columna del mensaje -->
                    <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                      <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #d13438; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">¡Hola, ${userName}!</h1>
                      
                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                        Tu suscripción a <strong>${subscriptionData.carrera_nombre}</strong> ha expirado. Para continuar disfrutando de todos los beneficios, necesitás renovarla.
                      </p>
                      
                      <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                        ¡No te quedes sin tu asistente académico favorito!
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Mensaje del Profesor Acadel TRISTE -->
            <tr>
              <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr class="professor-row">
                    <!-- Imagen del Profesor Acadel triste -->
                    <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                      <div style="position: relative; text-align: center;">
                        <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                        <div style="position: relative; z-index: 1; text-align: center;">
                          <img src="${profesorTristeUrl}" alt="Profesor Acadel Triste" style="width: 130px; height: auto; margin: 0 auto -5px;">
                        </div>
                      </div>
                    </td>
                    
                    <!-- Mensaje en un globo -->
                    <td style="padding: 20px; vertical-align: middle; text-align: left;">
                      <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Triángulo para el globo de diálogo -->
                        <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                        
                        <p style="font-family: 'Parkinsans', sans-serif; color: #d13438; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Te extraño mucho!</p>
                        <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                          ¡Uy! Se venció tu suscripción y ya no puedo ayudarte con tus estudios. Fue genial acompañarte en tu aprendizaje. ¡Renová tu suscripción para que podamos seguir estudiando juntos! Te prometo que tengo muchas cosas nuevas para enseñarte.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Botón de renovación -->
            <tr>
              <td style="padding: 20px 30px; text-align: center; background-color: #f5f5f5;">
                <a href="${this.baseUrl}/tienda-argentina" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                  Renovar mi Suscripción
                </a>
              </td>
            </tr>
            
            <!-- Información importante -->
            <tr>
              <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                      <h2 style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Qué perdiste al expirar?</h2>
                      
                      <ul style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                        <li style="margin-bottom: 10px; text-align: left;">Acceso al asistente virtual académico especializado</li>
                        <li style="margin-bottom: 10px; text-align: left;">Recursos exclusivos de tu carrera</li>
                        <li style="margin-bottom: 10px; text-align: left;">Soporte personalizado para tus estudios</li>
                        <li style="text-align: left;">Herramientas avanzadas de aprendizaje</li>
                      </ul>
                      
                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center; font-style: italic;">
                        ¿Tenés dudas sobre la renovación? Estamos acá para ayudarte.
                      </p>
                      
                      <!-- Botón de contacto -->
                      <div style="text-align: center; margin-top: 20px;">
                        <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #a4ac86; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(164, 172, 134, 0.2);">
                          Contactar Soporte
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
                <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia Argentina. Todos los derechos reservados</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plantilla para transferencia rechazada
   * @param {Object} paymentData - Datos del pago rechazado
   * @param {Object} userData - Datos del usuario
   * @returns {string} - HTML de la plantilla
   */
  getTransferRejectedTemplate(paymentData, userData) {
    const logoUrl = this.imageUrls.logo;
    const profesorTristeUrl = this.imageUrls.profesorTriste;
    
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(paymentData.amount);
    
    const adminNotes = paymentData.admin_notes || '';
    let rejectionReason = 'No se especificó una razón';
    
    const reasonMatch = adminNotes.match(/Razón:\s*(.+?)(?:\s*$|,|\||;)/);
    if (reasonMatch) {
      rejectionReason = reasonMatch[1].trim();
    }
    
    const userName = userData.nombres && userData.nombres !== 'Sin nombre' 
      ? userData.nombres 
      : userData.correo.split('@')[0];

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transferencia Rechazada - Acadelia Argentina</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Parkinsans:wght@600..800&display=swap" rel="stylesheet">
        <style>
          @media only screen and (max-width: 600px) {
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .main-table {
              width: 100% !important;
              margin: 0 !important;
            }
            .content-wrapper {
              padding: 0 !important;
            }
            .logo-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px 0 !important;
              text-align: center !important;
            }
            .message-column {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 20px 10px !important;
              box-sizing: border-box !important;
            }
            .message-heading {
              text-align: center !important;
              font-size: 22px !important;
              width: 100% !important;
              padding: 0 10px !important;
              margin: 0 auto 15px !important;
              box-sizing: border-box !important;
            }
            .professor-column {
              display: block !important;
              width: 100% !important;
              padding: 10px 0 20px !important;
              text-align: center !important;
            }
            .speech-bubble:before {
              display: none !important;
            }
            .info-container {
              padding: 15px !important;
              box-sizing: border-box !important;
            }
            .action-button {
              margin: 0 auto !important;
            }
            .rejection-details-table {
              width: 100% !important;
            }
            .detail-cell {
              padding: 8px 5px !important;
              font-size: 12px !important;
            }
            .detail-value {
              font-size: 12px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
        <div style="width: 100%; max-width: 100%; text-align: center;">
          <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
            <!-- Header con logo y mensaje -->
            <tr>
              <td class="content-wrapper" style="padding: 0;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <!-- Columna del logo -->
                    <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                      <div style="text-align: center;">
                        <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                        <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">TRANSFERENCIA RECHAZADA</div>
                      </div>
                    </td>
                    
                    <!-- Columna del mensaje -->
                    <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                      <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #d13438; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">${userName}, hay un problema</h1>
                      
                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                        Lamentamos informarte que tu transferencia por <strong>${formattedAmount}</strong> para <strong>${paymentData.carrera_nombre}</strong> no pudo ser aprobada.
                      </p>
                      
                      <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                        No te preocupes, podés intentar nuevamente.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Mensaje del Profesor Acadel TRISTE -->
            <tr>
              <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr class="professor-row">
                    <!-- Imagen del Profesor Acadel triste -->
                    <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                      <div style="position: relative; text-align: center;">
                        <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                        <div style="position: relative; z-index: 1; text-align: center;">
                          <img src="${profesorTristeUrl}" alt="Profesor Acadel Triste" style="width: 130px; height: auto; margin: 0 auto -5px;">
                        </div>
                      </div>
                    </td>
                    
                    <!-- Mensaje en un globo -->
                    <td style="padding: 20px; vertical-align: middle; text-align: left;">
                      <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Triángulo para el globo de diálogo -->
                        <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                        
                        <p style="font-family: 'Parkinsans', sans-serif; color: #d13438; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Ups! Hubo un inconveniente</p>
                        <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                          Nuestro equipo no pudo aprobar tu transferencia esta vez. ¡Pero no te desanimes! Revisá los detalles del rechazo y podés intentar nuevamente. Estoy acá esperándote para cuando tengamos todo listo.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Detalles del rechazo -->
            <tr>
              <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" class="rejection-details-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                  <tr style="background-color: #d13438;">
                    <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles del Rechazo</th>
                  </tr>
                  <tr style="background-color: #f0efe7;">
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Carrera</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${paymentData.carrera_nombre}</td>
                  </tr>
                  <tr>
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Monto</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedAmount}</td>
                  </tr>
                  <tr style="background-color: #f0efe7;">
                    <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Estado</td>
                    <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #d13438;">Rechazado</td>
                  </tr>
                  <tr>
                    <td class="detail-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Motivo del Rechazo</td>
                    <td class="detail-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #d13438;">${rejectionReason}</td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Botón de acción -->
            <tr>
              <td style="padding: 0 30px 20px; text-align: center; background-color: #f5f5f5;">
                <a href="${this.baseUrl}/tienda-argentina" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                  Intentar Nuevamente
                </a>
              </td>
            </tr>
            
            <!-- Información importante -->
            <tr>
              <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                      <h2 style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Qué podés hacer ahora?</h2>
                      
                      <ul style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                        <li style="margin-bottom: 10px; text-align: left;">Verificá que los datos de la transferencia sean correctos</li>
                        <li style="margin-bottom: 10px; text-align: left;">Asegurate de que el comprobante sea legible y completo</li>
                        <li style="margin-bottom: 10px; text-align: left;">Revisá que el monto coincida exactamente</li>
                        <li style="text-align: left;">Contactanos si necesitás ayuda para resolverlo</li>
                      </ul>
                      
                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center; font-style: italic;">
                        ¿Tenés dudas sobre el motivo del rechazo? Escribinos.
                      </p>
                      
                      <!-- Botón de contacto -->
                      <div style="text-align: center; margin-top: 20px;">
                        <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #a4ac86; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(164, 172, 134, 0.2);">
                          Contactar Soporte
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
                <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia Argentina. Todos los derechos reservados</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plantilla para pago Ualá rechazado
   * @param {Object} paymentData - Datos del pago fallido
   * @param {Object} userData - Datos del usuario
   * @returns {string} - HTML de la plantilla
   */
  getUalaPaymentFailedTemplate(paymentData, userData) {
    const logoUrl = this.imageUrls.logo;
    const profesorTristeUrl = this.imageUrls.profesorTriste;
    
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(paymentData.amount);
    
    const userName = userData.nombres && userData.nombres !== 'Sin nombre' 
      ? userData.nombres 
      : userData.correo.split('@')[0];

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago Rechazado - Acadelia Argentina</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Parkinsans:wght@600..800&display=swap" rel="stylesheet">
        <style>
          @media only screen and (max-width: 600px) {
            body {
              padding: 0 !important;
              margin: 0 !important;
            }
            .main-table {
              width: 100% !important;
              margin: 0 !important;
            }
            .content-wrapper {
              padding: 0 !important;
            }
            .logo-column {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px 0 !important;
              text-align: center !important;
            }
            .message-column {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              padding: 20px 10px !important;
              box-sizing: border-box !important;
            }
            .message-heading {
              text-align: center !important;
              font-size: 22px !important;
              width: 100% !important;
              padding: 0 10px !important;
              margin: 0 auto 15px !important;
              box-sizing: border-box !important;
            }
            .professor-column {
              display: block !important;
              width: 100% !important;
              padding: 10px 0 20px !important;
              text-align: center !important;
            }
            .speech-bubble:before {
              display: none !important;
            }
            .info-container {
              padding: 15px !important;
              box-sizing: border-box !important;
            }
            .action-button {
              margin: 0 auto !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
        <div style="width: 100%; max-width: 100%; text-align: center;">
          <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
            <!-- Header con logo y mensaje -->
            <tr>
              <td class="content-wrapper" style="padding: 0;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <!-- Columna del logo -->
                    <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                      <div style="text-align: center;">
                        <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                        <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">PAGO RECHAZADO</div>
                      </div>
                    </td>
                    
                    <!-- Columna del mensaje -->
                    <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                      <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #d13438; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">${userName}, tu pago no pudo procesarse</h1>
                      
                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                        Tu tarjeta rechazó el pago de <strong>${formattedAmount}</strong> para <strong>${paymentData.carrera_nombre}</strong>. Esto puede deberse a varios motivos.
                      </p>
                      
                      <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                        Podés intentar con otro método de pago.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Mensaje del Profesor Acadel TRISTE -->
            <tr>
              <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr class="professor-row">
                    <!-- Imagen del Profesor Acadel triste -->
                    <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                      <div style="position: relative; text-align: center;">
                        <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                        <div style="position: relative; z-index: 1; text-align: center;">
                          <img src="${profesorTristeUrl}" alt="Profesor Acadel Triste" style="width: 130px; height: auto; margin: 0 auto -5px;">
                        </div>
                      </div>
                    </td>
                    
                    <!-- Mensaje en un globo -->
                    <td style="padding: 20px; vertical-align: middle; text-align: left;">
                      <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Triángulo para el globo de diálogo -->
                        <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                        
                        <p style="font-family: 'Parkinsans', sans-serif; color: #d13438; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Ay! La tarjeta no funcionó</p>
                        <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                          ¡Qué frustración! Tu tarjeta rechazó el pago y no pudimos procesar tu suscripción. Esto puede pasar por fondos insuficientes, límites de compra o algún problema temporal. ¡No te desanimes! Probá con otra tarjeta o con transferencia bancaria.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Posibles causas -->
            <tr>
              <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #fff8dc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto; border: 1px solid #f0e68c;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="font-family: 'Parkinsans', sans-serif; color: #b8860b; font-size: 16px; margin: 0 0 10px; text-align: center;">💡 Posibles causas del rechazo</h3>
                      <ul style="color: #666; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px; text-align: left;">
                        <li style="margin-bottom: 8px;">Fondos insuficientes en la cuenta</li>
                        <li style="margin-bottom: 8px;">Límite de compra diario o mensual alcanzado</li>
                        <li style="margin-bottom: 8px;">Tarjeta vencida o bloqueada</li>
                        <li style="margin-bottom: 8px;">Problema temporal con Ualá o tu banco</li>
                        <li>Datos de la tarjeta incorrectos</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Botones de acción -->
            <tr>
              <td style="padding: 0 30px 20px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 0 auto;">
                  <tr>
                    <td style="padding: 10px; width: 50%; text-align: center;">
                      <a href="${this.baseUrl}/tienda-argentina" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto; text-align: center; box-sizing: border-box;">
                        Intentar de Nuevo
                      </a>
                    </td>
                    <td style="padding: 10px; width: 50%; text-align: center;">
                      <a href="${this.baseUrl}/tienda-argentina?method=transfer" class="action-button" style="display: inline-block; background-color: #e0a458; color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(224, 164, 88, 0.2); margin: 0 auto; text-align: center; box-sizing: border-box;">
                        Pagar por Transferencia
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Información importante -->
            <tr>
              <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
                <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                      <h2 style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Qué podés hacer?</h2>
                      
                      <ul style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                        <li style="margin-bottom: 10px; text-align: left;">Verificá que tengas fondos suficientes</li>
                        <li style="margin-bottom: 10px; text-align: left;">Contactá a Ualá para verificar límites o bloqueos</li>
                        <li style="margin-bottom: 10px; text-align: left;">Probá con otra tarjeta de débito o crédito</li>
                        <li style="text-align: left;">Usá transferencia bancaria como alternativa</li>
                      </ul>
                      
                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center; font-style: italic;">
                        ¿Necesitás ayuda? Estamos acá para vos.
                      </p>
                      
                      <!-- Botón de contacto -->
                      <div style="text-align: center; margin-top: 20px;">
                        <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #a4ac86; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(164, 172, 134, 0.2);">
                          Contactar Soporte
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
                <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia Argentina. Todos los derechos reservados</p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envía correo de nueva suscripción activa
   * @param {string} email - Correo del destinatario
   * @param {Object} subscriptionData - Datos de la suscripción
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendNewSubscriptionEmail(email, subscriptionData, userData) {
    try {
      const htmlTemplate = this.getNewSubscriptionTemplate(subscriptionData, userData);
      
      const mailOptions = {
        from: `"Acadelia Argentina" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `¡Tu suscripción a ${subscriptionData.carrera_nombre} está activa!`,
        html: htmlTemplate
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`NUEVA SUSCRIPCIÓN ACTIVA PARA: ${email}`);
        console.log(`CARRERA: ${subscriptionData.carrera_nombre}`);
        console.log(`MONTO: ARS $${subscriptionData.amount}`);
        console.log('==========================================');
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de nueva suscripción activa enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de nueva suscripción:", error);
      throw error;
    }
  }

  /**
   * Envía correo de pago en revisión
   * @param {string} email - Correo del destinatario
   * @param {Object} paymentData - Datos del pago
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendPaymentUnderReviewEmail(email, paymentData, userData) {
    try {
      const htmlTemplate = this.getPaymentUnderReviewTemplate(paymentData, userData);
      
      const mailOptions = {
        from: `"Acadelia Argentina" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Tu transferencia está en revisión - ${paymentData.carrera_nombre}`,
        html: htmlTemplate
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`PAGO EN REVISIÓN PARA: ${email}`);
        console.log(`CARRERA: ${paymentData.carrera_nombre}`);
        console.log(`MONTO: ARS $${paymentData.amount}`);
        console.log('==========================================');
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de pago en revisión enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de pago en revisión:", error);
      throw error;
    }
  }

  /**
   * Envía correo de suscripción expirada
   * @param {string} email - Correo del destinatario
   * @param {Object} subscriptionData - Datos de la suscripción expirada
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendSubscriptionExpiredEmail(email, subscriptionData, userData) {
    try {
      const htmlTemplate = this.getSubscriptionExpiredTemplate(subscriptionData, userData);
      
      const mailOptions = {
        from: `"Acadelia Argentina" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Tu suscripción a ${subscriptionData.carrera_nombre} ha expirado`,
        html: htmlTemplate
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`SUSCRIPCIÓN EXPIRADA PARA: ${email}`);
        console.log(`CARRERA: ${subscriptionData.carrera_nombre}`);
        console.log('==========================================');
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de suscripción expirada enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de suscripción expirada:", error);
      throw error;
    }
  }

  /**
   * Envía correo de transferencia rechazada
   * @param {string} email - Correo del destinatario
   * @param {Object} paymentData - Datos del pago rechazado
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendTransferRejectedEmail(email, paymentData, userData) {
    try {
      const htmlTemplate = this.getTransferRejectedTemplate(paymentData, userData);
      
      const mailOptions = {
        from: `"Acadelia Argentina" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Tu transferencia para ${paymentData.carrera_nombre} fue rechazada`,
        html: htmlTemplate
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`TRANSFERENCIA RECHAZADA PARA: ${email}`);
        console.log(`CARRERA: ${paymentData.carrera_nombre}`);
        console.log(`MONTO: ARS $${paymentData.amount}`);
        console.log('==========================================');
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de transferencia rechazada enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de transferencia rechazada:", error);
      throw error;
    }
  }

  /**
   * Envía correo de pago Ualá fallido
   * @param {string} email - Correo del destinatario
   * @param {Object} paymentData - Datos del pago fallido
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendUalaPaymentFailedEmail(email, paymentData, userData) {
    try {
      const htmlTemplate = this.getUalaPaymentFailedTemplate(paymentData, userData);
      
      const mailOptions = {
        from: `"Acadelia Argentina" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Tu pago con Ualá fue rechazado - ${paymentData.carrera_nombre}`,
        html: htmlTemplate
      };
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`PAGO UALÁ FALLIDO PARA: ${email}`);
        console.log(`CARRERA: ${paymentData.carrera_nombre}`);
        console.log(`MONTO: ARS $${paymentData.amount}`);
        console.log('==========================================');
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de pago Ualá fallido enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de pago Ualá fallido:", error);
      throw error;
    }
  }

  /**
   * Método genérico para enviar emails de Argentina
   * @param {string} to - Destinatario
   * @param {string} subject - Asunto
   * @param {string} htmlContent - Contenido HTML
   * @param {object} options - Opciones adicionales
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendEmail(to, subject, htmlContent, options = {}) {
    try {
      const mailOptions = {
        from: `"Acadelia Argentina" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
        ...options
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de Argentina enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de Argentina:', error);
      throw error;
    }
  }

  // ====================================================================
  // ====================================================================

  /**
   * Obtiene datos completos de usuario desde la BD
   * @param {number} userId - ID del usuario
   * @returns {Object} - Datos del usuario
   */
  async getUserData(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          u.id_user,
          u.correo,
          u.email_verified,
          COALESCE(pf.nombre, 'Sin nombre') as nombres,
          COALESCE(pf.apellido, 'Sin apellido') as apellidos
         FROM usuario u
         LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
         WHERE u.id_user = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Usuario ${userId} no encontrado`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error obteniendo datos de usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos completos de pago desde la BD
   * @param {number} paymentId - ID del pago
   * @returns {Object} - Datos del pago con carrera
   */
  async getPaymentData(paymentId) {
    try {
      const result = await pool.query(
        `SELECT 
          p.*,
          c.nombre as carrera_nombre
         FROM payments_arg p
         LEFT JOIN carrera c ON p.carrera_id = c.id_carrera
         WHERE p.id = $1`,
        [paymentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Pago ${paymentId} no encontrado`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error obteniendo datos de pago:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos completos de suscripción desde la BD
   * @param {number} subscriptionId - ID de la suscripción
   * @returns {Object} - Datos de la suscripción con carrera y pago
   */
  async getSubscriptionData(subscriptionId) {
    try {
      const result = await pool.query(
        `SELECT 
          s.*,
          c.nombre as carrera_nombre,
          p.amount,
          p.payment_method,
          p.billing_cycle
         FROM subscriptions_arg s
         LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
         LEFT JOIN payments_arg p ON s.payment_id = p.id
         WHERE s.id = $1`,
        [subscriptionId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error obteniendo datos de suscripción:', error);
      throw error;
    }
  }

  // ====================================================================
  // ====================================================================

  /**
   * 🎉 Envía email de nueva suscripción activa (cuando se aprueba transferencia)
   * @param {number} subscriptionId - ID de la suscripción creada
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendNewSubscriptionFromId(subscriptionId) {
    try {
      console.log(`📧 Enviando email de nueva suscripción activa para suscripción ${subscriptionId}`);

      const subscriptionData = await this.getSubscriptionData(subscriptionId);
      const userData = await this.getUserData(subscriptionData.user_id);

      const result = await this.sendNewSubscriptionEmail(
        userData.correo,
        subscriptionData,
        userData
      );

      console.log(`✅ Email de nueva suscripción enviado a ${userData.correo}`);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email de nueva suscripción:', error);
      throw error;
    }
  }

  /**
   * ⏳ Envía email de pago en revisión (cuando se envía transferencia)
   * @param {number} paymentId - ID del pago en revisión
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendPaymentUnderReviewFromId(paymentId) {
    try {
      console.log(`📧 Enviando email de pago en revisión para pago ${paymentId}`);

      const paymentData = await this.getPaymentData(paymentId);
      const userData = await this.getUserData(paymentData.user_id);

      const result = await this.sendPaymentUnderReviewEmail(
        userData.correo,
        paymentData,
        userData
      );

      console.log(`✅ Email de pago en revisión enviado a ${userData.correo}`);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email de pago en revisión:', error);
      throw error;
    }
  }

  /**
   * ⌛ Envía email de suscripción expirada (desde job automático)
   * @param {number} subscriptionId - ID de la suscripción expirada
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendSubscriptionExpiredFromId(subscriptionId) {
    try {
      console.log(`📧 Enviando email de suscripción expirada para suscripción ${subscriptionId}`);

      const subscriptionData = await this.getSubscriptionData(subscriptionId);
      const userData = await this.getUserData(subscriptionData.user_id);

      const result = await this.sendSubscriptionExpiredEmail(
        userData.correo,
        subscriptionData,
        userData
      );

      console.log(`✅ Email de suscripción expirada enviado a ${userData.correo}`);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email de suscripción expirada:', error);
      throw error;
    }
  }

  /**
   * ❌ Envía email de transferencia rechazada (cuando admin rechaza)
   * @param {number} paymentId - ID del pago rechazado
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendTransferRejectedFromId(paymentId) {
    try {
      console.log(`📧 Enviando email de transferencia rechazada para pago ${paymentId}`);

      const paymentData = await this.getPaymentData(paymentId);
      const userData = await this.getUserData(paymentData.user_id);

      if (paymentData.payment_status !== 'rechazado') {
        throw new Error(`El pago ${paymentId} no está en estado rechazado (estado actual: ${paymentData.payment_status})`);
      }

      const result = await this.sendTransferRejectedEmail(
        userData.correo,
        paymentData,
        userData
      );

      console.log(`✅ Email de transferencia rechazada enviado a ${userData.correo}`);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email de transferencia rechazada:', error);
      throw error;
    }
  }

  /**
   * 💳 Envía email de pago Ualá fallido (cuando falla pago con tarjeta)
   * @param {number} paymentId - ID del pago fallido
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendUalaPaymentFailedFromId(paymentId) {
    try {
      console.log(`📧 Enviando email de pago Ualá fallido para pago ${paymentId}`);

      const paymentData = await this.getPaymentData(paymentId);
      const userData = await this.getUserData(paymentData.user_id);

      if (paymentData.payment_method !== 'uala_bis') {
        throw new Error(`El pago ${paymentId} no es de Ualá Bis (método actual: ${paymentData.payment_method})`);
      }

      if (!['fallido', 'expirado'].includes(paymentData.payment_status)) {
        throw new Error(`El pago ${paymentId} no está en estado fallido/expirado (estado actual: ${paymentData.payment_status})`);
      }

      const result = await this.sendUalaPaymentFailedEmail(
        userData.correo,
        paymentData,
        userData
      );

      console.log(`✅ Email de pago Ualá fallido enviado a ${userData.correo}`);
      return result;

    } catch (error) {
      console.error('❌ Error enviando email de pago Ualá fallido:', error);
      throw error;
    }
  }

  // ====================================================================
  // ====================================================================

  /**
   * 📬 Envía emails masivos a usuarios con suscripciones expiradas
   * Esta función se llama desde el job automático de actualización
   * @param {Array} expiredSubscriptionIds - Array de IDs de suscripciones expiradas
   * @returns {Promise<Object>} - Resumen de envíos
   */
  async sendExpiredSubscriptionEmails(expiredSubscriptionIds) {
    if (!Array.isArray(expiredSubscriptionIds) || expiredSubscriptionIds.length === 0) {
      console.log('ℹ️ No hay suscripciones expiradas para notificar');
      return { sent: 0, failed: 0, details: [] };
    }

    console.log(`📬 Procesando ${expiredSubscriptionIds.length} emails de suscripciones expiradas...`);

    const results = {
      sent: 0,
      failed: 0,
      details: []
    };

    for (const subscriptionId of expiredSubscriptionIds) {
      try {
        await this.sendSubscriptionExpiredFromId(subscriptionId);
        results.sent++;
        results.details.push({
          subscriptionId,
          status: 'sent',
          error: null
        });

        // Pequeña pausa entre emails para no saturar
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error enviando email para suscripción ${subscriptionId}:`, error.message);
        results.failed++;
        results.details.push({
          subscriptionId,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log(`📊 Resumen de envío: ${results.sent} enviados, ${results.failed} fallidos`);
    return results;
  }

  // ====================================================================
  // ====================================================================

  /**
   * Obtiene suscripciones que vencen pronto para notificación preventiva
   * @param {number} daysAhead - Días de anticipación (default: 3)
   * @returns {Array} - Lista de suscripciones próximas a vencer
   */
  async getUpcomingExpirations(daysAhead = 3) {
    try {
      const result = await pool.query(
        `SELECT 
          s.id as subscription_id,
          s.user_id,
          s.end_date,
          c.nombre as carrera_nombre,
          u.correo
         FROM subscriptions_arg s
         LEFT JOIN carrera c ON s.carrera_id = c.id_carrera
         LEFT JOIN usuario u ON s.user_id = u.id_user
         WHERE s.status = 'activo'
         AND s.end_date <= NOW() + INTERVAL '${daysAhead} days'
         AND s.end_date > NOW()
         ORDER BY s.end_date ASC`,
        []
      );

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo suscripciones próximas a vencer:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de emails enviados (si se implementa tabla de logs)
   * @param {number} days - Días atrás para contar (default: 30)
   * @returns {Object} - Estadísticas de envío
   */
  async getEmailStats(days = 30) {
    // Esta función podría implementarse si decides agregar una tabla de logs de emails
    return {
      message: 'Estadísticas de email no implementadas aún',
      suggestion: 'Considera agregar una tabla email_logs_arg para tracking'
    };
  }
}

// Exportamos una instancia única del servicio de emails de Argentina
export const argentinaEmailService = new ArgentinaEmailService();