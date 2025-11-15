import nodemailer from 'nodemailer';
import path from 'path';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER || 'drolinq@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS || 'gdusgkaujddzimxd'
      }
    });

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
      mascota: "https://i.imgur.com/1zF4b3h.png"   // Mascota de Acadelia
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
   * Plantilla para código de verificación de inicio de sesión
   * @param {string} code - Código de verificación
   * @returns {string} - HTML de la plantilla
   */
  getVerificationCodeTemplate(code) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificación - Acadelia</title>
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
          .code-column {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            padding: 20px 0 !important;
          }
          .code-heading {
            text-align: center !important;
            font-size: 22px !important;
            width: 100% !important;
            padding: 0 10px !important;
            margin: 0 auto 15px !important;
            box-sizing: border-box !important;
          }
          .code-table {
            margin: 0 auto !important;
            width: auto !important;
            display: inline-block !important;
          }
          .code-cell {
            padding-right: 4px !important;
          }
          .digit-card {
            width: 42px !important;
          }
          .digit-text {
            font-size: 32px !important;
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
          .mascot-column {
            display: block !important;
            width: 100% !important;
            padding: 10px 0 20px !important;
            text-align: center !important;
          }
          .expire-text {
            text-align: center !important;
            width: 100% !important;
            margin: 10px 0 0 0 !important;
            padding: 0 !important;
          }
          .info-container {
            padding: 15px !important;
            box-sizing: border-box !important;
          }
          .action-button {
            margin: 0 auto !important;
          }
          .copy-code-text {
            font-size: 16px !important;
            padding: 8px 12px !important;
          }
        }
        
        @media only screen and (max-width: 375px) {
          .code-table {
            max-width: 280px !important;
          }
          .digit-card {
            width: 38px !important;
          }
          .digit-text {
            font-size: 28px !important;
          }
          .code-cell {
            padding-right: 2px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y código de verificación juntos -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">VERIFICA TU ACCESO</div>
                    </div>
                  </td>
                  
                  <!-- Columna del código de verificación -->
                  <td class="code-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: center;">
                    <h1 class="code-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: center;">Tu código de verificación</h1>
                    
                    <table cellspacing="0" cellpadding="0" border="0" class="code-table" align="center" style="margin: 0 auto 15px; width: auto; display: inline-block;">
                      <tr>
                        ${code.split('').map(digit => `
                          <td class="code-cell" style="padding-right: 6px;">
                            <table cellspacing="0" cellpadding="0" border="0" class="digit-card" style="width: 50px; border-radius: 12px; box-shadow: 0 6px 15px rgba(0,0,0,0.1); overflow: hidden;">
                              <tr>
                                <td style="height: 4px; background-color: #e0a458;" colspan="1"></td>
                              </tr>
                              <tr>
                                <td style="background-color: white; height: 70px; text-align: center;">
                                  <span class="digit-text" style="font-size: 38px; font-weight: 800; color: #582f0e; text-shadow: 0 1px 2px rgba(0,0,0,0.08);">${digit}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        `).join('')}
                      </tr>
                    </table>
                    
                    <!-- CÓDIGO PARA COPIAR (NUEVO) -->
                    <div style="background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin: 15px auto; max-width: 300px;">
                      <p style="color: #666; font-size: 13px; margin: 0 0 5px; text-align: center;">Para copiar fácilmente:</p>
                      <div class="copy-code-text" style="font-family: 'Courier New', monospace; font-size: 20px; font-weight: 700; color: #582f0e; background-color: white; border: 1px solid #ddd; border-radius: 4px; padding: 10px 15px; text-align: center; letter-spacing: 3px; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all;">${code}</div>
                    </div>
                    
                    <p class="expire-text" style="color: #666; font-size: 15px; line-height: 1.5; margin: 10px 0 0 0; text-align: center; width: 100%;">Este código expirará en 10 minutos</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sección de información importante -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #f9f9f9; border-radius: 12px; margin: 20px auto 0;">
                <tr>
                  <!-- Lado izquierdo: Información importante con mascota -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 60%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <p class="info-text" style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 10px; text-align: left;">Hemos detectado un nuevo intento de inicio de sesión en tu cuenta de Acadelia.</p>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 8px; text-align: left;">Si fuiste tú, utiliza el código mostrado para completar tu acceso.</li>
                      <li style="text-align: left;">Si no has sido tú, te recomendamos cambiar tu contraseña inmediatamente.</li>
                    </ul>
                  </td>
                  
                  <!-- Lado derecho: Imagen de la mascota (oso) -->
                  <td class="mascot-column" style="padding: 25px; vertical-align: bottom; text-align: center; position: relative;">
                    <div style="position: relative; margin: 10px auto 0; text-align: center; width: 100%; max-width: 150px;">
                      <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${mascotaUrl}" alt="Mascota Acadelia" style="width: 150px; height: auto; margin: 0 auto -5px;">
                      </div>
                      <p style="font-family: 'Parkinsans', sans-serif; font-size: 14px; color: #656d4a; margin: 5px 0 0; font-style: italic; text-align: center; width: 100%;">¡Tu seguridad es nuestra prioridad!</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botón de acción -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
            <a href="${this.baseUrl}/login" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                Ir a Acadelia
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo con código de verificación para inicio de sesión
   * @param {string} email - Correo del destinatario
   * @param {string} code - Código de verificación
   * @param {object} options - Opciones adicionales (no utilizado, mantenido por compatibilidad)
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendVerificationCode(email, code, options = {}) {
    try {
      const htmlTemplate = this.getVerificationCodeTemplate(code);

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Código de verificación para inicio de sesión",
        html: htmlTemplate
      };

      // En desarrollo mostramos el código en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CÓDIGO DE VERIFICACIÓN: ${code}`);
        console.log(`CORREO DESTINO: ${email}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de verificación enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de verificación:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de recuperación de contraseña
   * @param {string} resetToken - Token de recuperación
   * @param {string} resetUrl - URL completa para resetear la contraseña
   * @returns {string} - HTML de la plantilla
   */
  getPasswordResetTemplate(resetToken, resetUrl) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Contraseña - Acadelia</title>
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
            padding: 20px 15px !important;
            text-align: center !important;
          }
          .message-column {
            display: block !important;
            width: 100% !important;
            padding: 20px 12px !important;
            box-sizing: border-box !important;
          }
          /* Para todos los párrafos dentro de message-column */
          .message-column p {
            text-align: center !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 14px !important;
          }
          /* Específicamente para el párrafo de mensaje principal */
          .message-column .message-text {
            text-align: center !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .message-heading {
            text-align: center !important;
            font-size: 22px !important;
            width: 100% !important;
            padding: 0 5px !important;
            margin: 0 auto 15px !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
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
            width: auto !important;
            /* Restauramos el borde inferior */
            border-bottom: 2px solid #e0a458 !important;
            padding-bottom: 8px !important;
          }
          .info-text {
            text-align: center !important;
            font-size: 14px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          .info-list {
            display: inline-block !important;
            text-align: left !important;
            max-width: 90% !important;
            padding-left: 10px !important;
            margin: 10px 0 !important;
          }
          .info-list li {
            font-size: 14px !important;
            margin-bottom: 5px !important;
            word-wrap: break-word !important;
          }
          .mascot-column {
            display: block !important;
            width: 100% !important;
            padding: 10px 15px 20px !important;
            text-align: center !important;
          }
          .expire-text {
            text-align: center !important;
            width: 100% !important;
            margin: 10px 0 0 0 !important;
            padding: 0 !important;
            font-size: 13px !important;
          }
          .info-container {
            padding: 15px !important;
            box-sizing: border-box !important;
          }
          .reset-button {
            padding: 12px 25px !important;
            font-size: 15px !important;
            width: 80% !important;
            display: block !important;
            text-align: center !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }
          .instruction-text {
            font-size: 15px !important;
            padding: 0 20px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          .mascot-mobile {
            display: block !important;
            margin: 10px auto !important;
            text-align: center !important;
            max-width: 100px !important;
          }
          .mascot-desktop {
            display: none !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y mensaje de recuperación -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">RECUPERA TU CUENTA</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje de recuperación -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: center; word-wrap: break-word; overflow-wrap: break-word; width: 100%; box-sizing: border-box;">Restablece tu contraseña</h1>
                    
                    <p class="message-text" style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; width: 100%; box-sizing: border-box;">
                      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para establecer una nueva contraseña.
                    </p>
                    
                    <p class="expire-text" style="color: #666; font-size: 15px; line-height: 1.5; margin: 10px 0 0 0; text-align: center; width: 100%; word-wrap: break-word; overflow-wrap: break-word;">Este enlace expirará en 30 minutos</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Espacio adicional -->
          <tr>
            <td style="padding: 40px 20px 20px; text-align: center;">
              <!-- Espacio vacío para separación -->
            </td>
          </tr>
          
          <!-- Mensaje de instrucción -->
          <tr>
            <td style="padding: 0 30px 20px; text-align: center;">
              <p class="instruction-text" style="color: #582f0e; font-size: 16px; line-height: 1.5; margin: 0; text-align: center; font-weight: 500; word-wrap: break-word; overflow-wrap: break-word; width: 100%; box-sizing: border-box;">
                Haz clic en el botón para restablecer tu contraseña:
              </p>
            </td>
          </tr>
          
          <!-- Botón de recuperación -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${resetUrl}" class="reset-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                Restablecer Contraseña
              </a>
            </td>
          </tr>
          
          <!-- Sección de información importante -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #f9f9f9; border-radius: 12px; margin: 20px auto 0;">
                <tr>
                  <!-- Lado izquierdo: Información importante con mascota -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 60%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <p class="info-text" style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 10px; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">Si no solicitaste el cambio de contraseña, ignora este correo y tu contraseña permanecerá sin cambios.</p>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 8px; text-align: left;">Nunca compartas tu contraseña con nadie.</li>
                      <li style="text-align: left;">Si tienes problemas, contacta a nuestro equipo de soporte.</li>
                    </ul>
                  </td>
                  
                  <!-- Lado derecho: Imagen de la mascota (oso) - Versión escritorio -->
                  <td class="mascot-column mascot-desktop" style="padding: 25px; vertical-align: bottom; text-align: center; position: relative;">
                    <div style="position: relative; margin: 10px auto 0; text-align: center; width: 100%; max-width: 150px;">
                      <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${mascotaUrl}" alt="Mascota Acadelia" style="width: 150px; height: auto; margin: 0 auto -5px;">
                      </div>
                      <p style="font-family: 'Parkinsans', sans-serif; font-size: 14px; color: #656d4a; margin: 5px 0 0; font-style: italic; text-align: center; width: 100%;">¡Tu seguridad es nuestra prioridad!</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Fila adicional para mascota en móvil -->
                <tr class="mascot-mobile" style="display: none;">
                  <td style="padding: 0 25px 25px; text-align: center;" colspan="2">
                    <div style="position: relative; margin: 10px auto 0; text-align: center; max-width: 100px;">
                      <div style="width: 80px; height: 80px; border-radius: 40px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${mascotaUrl}" alt="Mascota Acadelia" style="width: 100px; height: auto; margin: 0 auto -5px;">
                      </div>
                      <p style="font-family: 'Parkinsans', sans-serif; font-size: 13px; color: #656d4a; margin: 5px 0 0; font-style: italic; text-align: center; width: 100%;">¡Tu seguridad es nuestra prioridad!</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Método para enviar correo de recuperación de contraseña
   * @param {string} email - Correo del destinatario
   * @param {string} resetToken - Token de recuperación
   * @param {string} resetUrl - URL completa para resetear la contraseña
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    try {
      // Si resetUrl no viene definida, la construimos usando la baseUrl
      if (!resetUrl) {
        resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}&id=${userId}`;
      }

      const htmlTemplate = this.getPasswordResetTemplate(resetToken, resetUrl);

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Recuperación de contraseña - Acadelia",
        html: htmlTemplate
      };

      // En desarrollo mostramos el token y URL en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`ENLACE DE RECUPERACIÓN: ${resetUrl}`);
        console.log(`TOKEN: ${resetToken}`);
        console.log(`CORREO DESTINO: ${email}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de recuperación enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de recuperación:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de envío de informe financiero
   * @param {string} reportTitle - Título del informe
   * @param {string} period - Período del informe
   * @param {string} recipientName - Nombre del destinatario (opcional)
   * @param {Object} financialData - Datos financieros para mostrar
   * @returns {string} - HTML de la plantilla
   */
  getFinancialReportTemplate(reportTitle, period, recipientName = '', financialData = null) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;
    const profesorUrl = "https://i.imgur.com/7DH7j9o.png";

    const greeting = recipientName ? `Estimado/a ${recipientName}` : 'Estimado/a usuario/a';

    const data = financialData || {
      period: period,
      totalRevenue: "€XX,XXX.XX",
      totalExpenses: "€X,XXX.XX",
      netIncome: "€XX,XXX.XX",
      activeSubscriptions: "XXX",
      netIncomeColor: "#008847"
    };

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Informe Financiero - Acadelia</title>
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
          .report-column {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            padding: 20px 0 !important;
          }
          .report-heading {
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
          .profesor-column {
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
          .financial-metrics-table {
            width: 100% !important;
          }
          .metric-cell {
            padding: 8px 5px !important;
            font-size: 12px !important;
          }
          .metric-value {
            font-size: 12px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y título del informe -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">INFORME FINANCIERO</div>
                    </div>
                  </td>
                  
                  <!-- Columna del título del informe -->
                  <td class="report-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="report-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">${reportTitle}</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      Adjunto encontrará el informe financiero correspondiente al período <strong>${period}</strong>. Este documento contiene información detallada sobre el rendimiento económico y operativo de Acadelia.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">Información confidencial - Solo para uso interno</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sección de resumen financiero -->
          <tr>
            <td style="padding: 15px 30px 5px; text-align: center;">
              <h2 style="font-family: 'Parkinsans', sans-serif; font-size: 18px; color: #582f0e; margin: 10px 0; text-align: center; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Resumen Financiero</h2>
            </td>
          </tr>
          
          <!-- Métricas financieras en formato de tabla -->
          <tr>
          <td style="padding: 10px 30px 20px; text-align: center;">
            <table cellspacing="0" cellpadding="0" border="0" class="financial-metrics-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
              <tr style="background-color: #656d4a;">
                <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Principales Indicadores</th>
              </tr>
              <tr style="background-color: #f0efe7;">
                <td class="metric-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Período Analizado</td>
                <td class="metric-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${data.period}</td>
              </tr>
              <tr>
                <td class="metric-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Ingresos Totales</td>
                <td class="metric-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #008847;">${data.totalRevenue}</td>
              </tr>
              <tr style="background-color: #f0efe7;">
                <td class="metric-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Gastos Totales</td>
                <td class="metric-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #d13438;">${data.totalExpenses}</td>
              </tr>
              <tr>
                <td class="metric-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Beneficio Neto</td>
                <td class="metric-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: ${data.netIncomeColor};">${data.netIncome}</td>
              </tr>
              <tr style="background-color: #f0efe7;">
                <td class="metric-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Suscripciones Activas</td>
                <td class="metric-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${data.activeSubscriptions}</td>
              </tr>
            </table>
            
            <!-- Nota explicativa -->
            <p style="font-size: 13px; color: #666; margin: 15px 0 0; text-align: center; font-style: italic;">
              Los valores exactos y análisis detallados están disponibles en el informe adjunto.
            </p>
          </td>
        </tr>
          
          <!-- Sección de información importante -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #f9f9f9; border-radius: 12px; margin: 20px auto 0;">
                <tr>
                  <!-- Lado izquierdo: Información importante con profesor Acadel -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 60%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <p class="info-text" style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 10px; text-align: left;">${greeting}, le informamos que el informe integral adjunto ha sido generado automáticamente por nuestro sistema de análisis financiero.</p>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 8px; text-align: left;">Este informe contiene métricas clave del rendimiento económico del periodo.</li>
                      <li style="margin-bottom: 8px; text-align: left;">Para visualizar gráficos interactivos y análisis detallados, acceda a la plataforma.</li>
                      <li style="text-align: left;">La información contenida en este documento es confidencial.</li>
                    </ul>
                  </td>
                  
                  <!-- Lado derecho: Imagen del profesor Acadel (versión financiera) -->
                  <td class="profesor-column" style="padding: 25px; vertical-align: bottom; text-align: center; position: relative;">
                  <div style="position: relative; margin: 10px auto 0; text-align: center; width: 100%; max-width: 150px;">
                    <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                    <div style="position: relative; z-index: 1; text-align: center;">
                      <img src="${profesorUrl}" alt="Profesor Acadel Financiero" style="width: 150px; height: auto; margin: 0 auto -5px;">
                    </div>
                    <p style="font-family: 'Parkinsans', sans-serif; font-size: 14px; color: #656d4a; margin: 5px 0 0; font-style: italic; text-align: center; width: 100%;">¡El éxito financiero está en los detalles!</p>
                  </div>
                </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botón de acción -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${this.baseUrl}/administracion" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                Ver todos los informes
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo con un informe financiero adjunto
   * @param {Array|string} recipients - Correo(s) del destinatario(s)
   * @param {string} filePath - Ruta del archivo adjunto
   * @param {string} reportTitle - Título del informe
   * @param {string} period - Período del informe
   * @param {Object} options - Opciones adicionales
   * @param {Object} reportData - Datos financieros del informe (opcional)
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendFinancialReport(recipients, filePath, reportTitle, period, options = {}, reportData = null) {
    try {
      const recipientsList = Array.isArray(recipients) ? recipients : [recipients];

      const financialData = {
        period: period,
        totalRevenue: reportData?.executiveSummary?.totalRevenue !== undefined ?
          `€${reportData.executiveSummary.totalRevenue.toFixed(2)}` :
          "€XX,XXX.XX",

        totalExpenses: reportData?.executiveSummary?.totalExpenses !== undefined ?
          (reportData.executiveSummary.totalExpenses === 0 ?
            "€0.00" :
            `€${reportData.executiveSummary.totalExpenses.toFixed(2)}`) :
          "€X,XXX.XX",

        netIncome: reportData?.executiveSummary?.netIncome !== undefined ?
          `€${reportData.executiveSummary.netIncome.toFixed(2)}` :
          "€XX,XXX.XX",

        activeSubscriptions: reportData?.subscriptionSummary?.active || "XXX",

        // Color para el beneficio neto (verde si es positivo, rojo si es negativo)
        netIncomeColor: (reportData?.executiveSummary?.netIncome || 0) >= 0 ? "#008847" : "#d13438"
      };

      const htmlTemplate = this.getFinancialReportTemplate(
        reportTitle,
        period,
        options.recipientName,
        financialData // Pasar los datos financieros a la plantilla
      );

      const attachments = [];

      if (filePath) {
        attachments.push({
          filename: options.fileName || path.basename(filePath),
          path: filePath
        });
      }

      const mailOptions = {
        from: `"Acadelia Finanzas" <${process.env.EMAIL_USER}>`,
        to: recipientsList.join(', '),
        subject: `${reportTitle} - ${period}`,
        html: htmlTemplate,
        attachments
      };

      // En desarrollo mostramos información en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`INFORME ENVIADO A: ${recipientsList.join(', ')}`);
        console.log(`TÍTULO: ${reportTitle}`);
        console.log(`PERÍODO: ${period}`);
        console.log(`ARCHIVO: ${filePath}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo con informe financiero enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando informe financiero:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de bienvenida y verificación
   * @param {string} userName - Nombre o correo del usuario 
   * @param {string} verificationLink - Enlace de verificación completo
   * @returns {string} - HTML de la plantilla
   */
  getWelcomeVerificationTemplate(userName, verificationLink) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;
    const profesorCapibara = "https://i.imgur.com/0ml5iJ1.png"; // Imagen del profesor Acadel capibara

    const userDisplay = userName.includes('@') ? userName.split('@')[0] : userName;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Bienvenido a Acadelia! - Verificación de cuenta</title>
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
            padding: 20px 15px !important;
            text-align: center !important;
          }
          .message-column {
            display: block !important;
            width: 100% !important;
            padding: 20px 12px !important;
            box-sizing: border-box !important;
          }
          .message-column p {
            text-align: center !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 14px !important;
          }
          .message-column .message-text {
            text-align: center !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .message-heading {
            text-align: center !important;
            font-size: 22px !important;
            width: 100% !important;
            padding: 0 5px !important;
            margin: 0 auto 15px !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
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
            width: auto !important;
            border-bottom: 2px solid #e0a458 !important;
            padding-bottom: 8px !important;
          }
          .info-text {
            text-align: center !important;
            font-size: 14px !important;
          }
          .info-list {
            display: inline-block !important;
            text-align: left !important;
            max-width: 90% !important;
            padding-left: 10px !important;
            margin: 10px 0 !important;
          }
          .info-list li {
            font-size: 14px !important;
            margin-bottom: 5px !important;
          }
          .expire-text {
            text-align: center !important;
            width: 100% !important;
            margin: 10px 0 0 0 !important;
            padding: 0 !important;
            font-size: 13px !important;
          }
          .info-container {
            padding: 15px !important;
            box-sizing: border-box !important;
          }
          .verify-button {
            padding: 12px 25px !important;
            font-size: 15px !important;
            width: 80% !important;
            display: block !important;
            text-align: center !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
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
          .professor-image-container {
            margin: 10px auto 0 !important;
          }
          .professor-image-circle {
            width: 120px !important;
            height: 120px !important;
            margin: 0 auto !important;
          }
          .professor-image {
            width: 110px !important;
            height: 110px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y mensaje de bienvenida -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">¡BIENVENIDO!</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje de bienvenida -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">Hola, ${userDisplay}!</h1>
                    
                    <p class="message-text" style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; width: 100%; box-sizing: border-box;">
                      ¡Estamos emocionados de que te hayas unido a la comunidad educativa de Acadelia! Para comenzar tu viaje de aprendizaje, por favor verifica tu dirección de correo electrónico haciendo clic en el botón de abajo.
                    </p>
                    
                    <p class="expire-text" style="color: #666; font-size: 15px; line-height: 1.5; margin: 10px 0 0 0; text-align: left; width: 100%;">Este enlace expirará en 24 horas</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- NUEVA SECCIÓN: Profesor Acadel con círculo y mensaje -->
          <tr>
            <td style="padding: 30px 30px 20px; background-color: #f5f5f5; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr class="professor-row">
                  <!-- Profesor Acadel en círculo -->
                  <td style="width: 170px; padding: 20px; vertical-align: middle; text-align: center;">
                    <div class="professor-image-container" style="position: relative; text-align: center;">
                      <!-- Círculo de fondo para la imagen -->
                      <div class="professor-image-circle" style="width: 140px; height: 140px; border-radius: 50%; background-color: #f0efe7; border: 3px solid #a4ac86; display: inline-block; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <!-- Imagen del profesor centrada en el círculo -->
                        <img class="professor-image" src="${profesorCapibara}" alt="Profesor Acadel" style="width: 130px; height: 130px; object-fit: contain; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" />
                      </div>
                      <p style="font-family: 'Parkinsans', sans-serif; font-size: 14px; color: #656d4a; margin: 10px 0 0; font-style: italic; text-align: center;">Profesor Acadel</p>
                    </div>
                  </td>
                  
                  <!-- Globo de mensaje -->
                  <td style="padding: 20px; vertical-align: middle; text-align: left;">
                    <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Triángulo para el globo de diálogo -->
                      <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #582f0e; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Hola estudiante!</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Soy el Profesor Acadel y estoy emocionado de guiarte en tu viaje de aprendizaje. 
                        Tengo preparados muchos recursos educativos increíbles para ti. 
                        ¡Solo verifica tu correo para comenzar esta aventura del conocimiento!
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botón de verificación -->
          <tr>
            <td style="padding: 10px 30px 30px; text-align: center; background-color: #f5f5f5;">
              <a href="${verificationLink}" class="verify-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                Verificar mi cuenta
              </a>
            </td>
          </tr>
          
          <!-- Sección de información adicional -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Qué puedes hacer en Acadelia?</h2>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Acceder a asistentes virtuales académicos personalizados</li>
                      <li style="margin-bottom: 10px; text-align: left;">Recibir apoyo en tus materias y proyectos educativos</li>
                      <li style="margin-bottom: 10px; text-align: left;">Potenciar tu aprendizaje con recursos interactivos</li>
                      <li style="text-align: left;">Formar parte de una comunidad educativa innovadora</li>
                    </ul>
                    
                    <p class="info-text" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0 0; text-align: left; font-style: italic;">
                      Si no solicitaste esta cuenta, puedes ignorar este correo. No se creará ninguna cuenta sin verificación.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de bienvenida con enlace de verificación
   * @param {string} email - Correo del destinatario
   * @param {string} verificationToken - Token de verificación
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendWelcomeVerificationEmail(email, verificationToken) {
    try {
      const verificationLink = `${this.baseUrl}/verify-email?token=${verificationToken}`;

      const htmlTemplate = this.getWelcomeVerificationTemplate(email, verificationLink);

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "¡Bienvenido a Acadelia! - Verifica tu cuenta",
        html: htmlTemplate
      };

      // En desarrollo mostramos el token y URL en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`ENLACE DE VERIFICACIÓN: ${verificationLink}`);
        console.log(`TOKEN: ${verificationToken}`);
        console.log(`CORREO DESTINO: ${email}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de bienvenida enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de bienvenida:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de confirmación de compra
   * @param {Object} transactionData - Datos de la transacción
   * @returns {string} - HTML de la plantilla
   */
  getTransactionConfirmationTemplate(transactionData) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;

    const transaction = transactionData.data;
    const primaryItem = transaction.items?.[0];
    const lineItem = transaction.details?.line_items?.[0];

    // Información del producto
    const productName = lineItem?.product?.name || 'Producto Acadelia';
    const productDescription = lineItem?.product?.description || primaryItem?.price?.description || 'Asistente Virtual Académico';
    const subscriptionType = primaryItem?.price?.description || 'Suscripción';

    // Información monetaria
    const currencyCode = transaction.currency_code;
    const totalAmount = parseFloat(transaction.details?.totals?.grand_total) / 100;
    const subtotalAmount = parseFloat(transaction.details?.totals?.subtotal) / 100;
    const taxAmount = parseFloat(transaction.details?.totals?.tax) / 100;

    const currencySymbol = getCurrencySymbol(currencyCode);

    // Formato de moneda según el código de divisa
    const formatter = new Intl.NumberFormat(getCurrencyLocale(currencyCode), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    });

    const formattedTotal = formatter.format(totalAmount);
    const formattedSubtotal = formatter.format(subtotalAmount);
    const formattedTax = formatter.format(taxAmount);

    // Información del período de facturación
    const startDate = transaction.billing_period?.starts_at
      ? new Date(transaction.billing_period.starts_at)
      : new Date();

    const endDate = transaction.billing_period?.ends_at
      ? new Date(transaction.billing_period.ends_at)
      : new Date(startDate.getTime());

    if (!transaction.billing_period?.ends_at) {
      // Si no hay fecha de finalización, calcular basado en el intervalo
      const interval = primaryItem?.price?.billing_cycle?.interval || 'month';
      const frequency = primaryItem?.price?.billing_cycle?.frequency || 1;

      if (interval === 'year') {
        endDate.setFullYear(endDate.getFullYear() + frequency);
      } else if (interval === 'month') {
        endDate.setMonth(endDate.getMonth() + frequency);
      } else if (interval === 'week') {
        endDate.setDate(endDate.getDate() + (frequency * 7));
      } else if (interval === 'day') {
        endDate.setDate(endDate.getDate() + frequency);
      }
    }

    // Formateo de fechas en español
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formattedStartDate = startDate.toLocaleDateString('es-ES', dateOptions);
    const formattedEndDate = endDate.toLocaleDateString('es-ES', dateOptions);

    // Información del método de pago
    const paymentMethod = transaction.payments?.[0]?.method_details?.card;
    const paymentType = paymentMethod?.type || 'tarjeta';
    const paymentLast4 = paymentMethod?.last4 || '****';

    // Información de facturación
    const invoiceId = transaction.invoice_id;
    const invoiceNumber = transaction.invoice_number;

    // URL de la factura (usar directamente la que proporciona Paddle)
    let invoiceUrl = '';

    if (transaction.invoice_url) {
      // 1. Si está disponible directamente en los datos de la transacción
      invoiceUrl = transaction.invoice_url;
    } else if (transaction._invoice_url) {
      // 2. A veces Paddle lo proporciona en un formato diferente
      invoiceUrl = transaction._invoice_url;
    }

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Compra - Acadelia</title>
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
          .purchase-details-table {
            width: 100% !important;
          }
          .detail-cell {
            padding: 8px 5px !important;
            font-size: 12px !important;
          }
          .detail-value {
            font-size: 12px !important;
          }
          .contact-button {
            margin-top: 15px !important;
            padding: 8px 15px !important;
            font-size: 13px !important;
          }
          .speech-bubble:before {
            display: none !important;
          }
          .button-row td {
            display: block !important;
            width: 100% !important;
            margin-bottom: 10px !important;
          }
          .invoice-button {
            width: 80% !important;
            margin: 10px auto !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y mensaje de confirmación -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">¡COMPRA CONFIRMADA!</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje de confirmación -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">¡Gracias por tu compra!</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      Tu compra ha sido procesada exitosamente. A continuación encontrarás los detalles de tu adquisición y cómo acceder a tus servicios.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                      Estamos emocionados de acompañarte en tu viaje académico
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Mensaje del Profesor Acadel -->
          <tr>
            <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr class="professor-row">
                  <!-- Mascota Acadelia -->
                  <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                    <div style="position: relative; text-align: center;">
                      <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${mascotaUrl}" alt="Mascota Acadelia" style="width: 130px; height: auto; margin: 0 auto -5px;">
                      </div>
                    </div>
                  </td>
                  
                  <!-- Mensaje en un globo -->
                  <td style="padding: 20px; vertical-align: middle; text-align: left;">
                    <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Triángulo para el globo de diálogo -->
                      <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #582f0e; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Excelente elección académica!</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Ya tienes acceso a tu asistente virtual académico. Estoy aquí para apoyarte con tus estudios 
                        en todo momento. ¡Tu éxito académico es nuestra prioridad! Recuerda que puedes gestionar tu suscripción
                        y acceder a tus datos de pago desde tu cuenta.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Detalles de la compra -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="purchase-details-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                <tr style="background-color: #008847;">
                  <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles de tu compra</th>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Producto</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${productName}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Tipo de suscripción</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${subscriptionType}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Subtotal (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedSubtotal}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Impuestos (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedTax}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Total pagado (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #008847;">${formattedTotal}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Método de pago</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${paymentType.toUpperCase()} ****${paymentLast4}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Período de suscripción</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">Del ${formattedStartDate} al ${formattedEndDate}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Factura</td>
                  <td class="detail-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${invoiceNumber || 'Disponible en Portal'}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botones de acción - SOLO 2 BOTONES -->
          <tr>
            <td style="padding: 0 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="button-row" style="width: 100%; margin: 0 auto;">
                <tr>
                  <td style="padding: 10px; width: 50%; text-align: center;">
                    <a href="${this.baseUrl}/estatus" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto; width: 80%; text-align: center; box-sizing: border-box;">
                      Gestionar Suscripción
                    </a>
                  </td>
                  <td style="padding: 10px; width: 50%; text-align: center;">
                    <a href="${invoiceUrl}" class="invoice-button" style="display: inline-block; background-color: #e0a458; color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(224, 164, 88, 0.2); margin: 0 auto; width: 80%; text-align: center; box-sizing: border-box;">
                      Ver Factura
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sección de información importante -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Ya puedes acceder a tu Asistente Virtual Académico desde tu cuenta de Acadelia.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Dentro de la sección "Gestionar Suscripción" encontrarás el botón "Datos de Pago" donde podrás gestionar tu información fiscal y verificar tu factura.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Tu suscripción se renovará automáticamente al final del período. Puedes cancelar la renovación automática en cualquier momento desde "Gestionar Suscripción".</li>
                      <li style="text-align: left;">Para cualquier consulta o asistencia, no dudes en contactarnos.</li>
                    </ul>
                    
                    <!-- Botón de contacto más pequeño -->
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de confirmación de compra
   * @param {string} email - Correo del destinatario
   * @param {Object} transactionData - Datos completos de la transacción de Paddle
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendPurchaseConfirmationEmail(email, transactionData) {
    try {
      const htmlTemplate = this.getTransactionConfirmationTemplate(transactionData);

      const productName = transactionData.data?.details?.line_items?.[0]?.product?.name || 'Asistente Virtual Académico';

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `¡Compra confirmada! Tu ${productName} ya está disponible`,
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CONFIRMACIÓN DE COMPRA PARA: ${email}`);
        console.log(`PRODUCTO: ${productName}`);
        console.log(`TRANSACCIÓN ID: ${transactionData.data.id}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de confirmación de compra enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de confirmación de compra:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de cancelación de suscripción
   * @param {Object} subscriptionData - Datos de la suscripción cancelada
   * @returns {string} - HTML de la plantilla
   */
  getCancelSubscriptionTemplate(subscriptionData) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;
    // URL del profesor Acadel triste
    const profesorTristeUrl = "https://i.imgur.com/xwLSkfQ.png"; // Profesor Acadel triste

    const subscription = subscriptionData.data;
    const item = subscription.items?.[0];

    // Información del producto
    const productName = item?.product?.name || 'Producto Acadelia';
    const productDescription = item?.product?.description || 'Asistente Virtual Académico';

    // Fecha de finalización efectiva (cuando terminará realmente el servicio)
    const endDate = subscription.current_billing_period?.ends_at
      ? new Date(subscription.current_billing_period.ends_at)
      : new Date();

    // Formateo de fechas en español
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formattedEndDate = endDate.toLocaleDateString('es-ES', dateOptions);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cancelación de Suscripción - Acadelia</title>
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
          .speech-bubble:before {
            display: none !important;
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
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">¡TE EXTRAÑAREMOS!</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">Tu suscripción se ha cancelado</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      Hemos procesado tu solicitud de cancelación para tu suscripción de ${productName}. Tu acceso permanecerá activo hasta el final del período de facturación actual.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                      Tu acceso estará disponible hasta: ${formattedEndDate}
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
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #582f0e; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Vaya! Te vamos a extrañar mucho</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Ha sido un honor acompañarte en tu viaje académico. Espero que hayas disfrutado de nuestro servicio
                        y que hayamos podido ser de ayuda en tus estudios. Las puertas de Acadelia siempre estarán abiertas
                        para cuando quieras retomar tu aprendizaje con nosotros.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Información y opciones para reactivar -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Tu acceso a ${productName} permanecerá activo hasta el ${formattedEndDate}.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Durante este período, puedes seguir utilizando todos los servicios con normalidad.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento antes de la fecha de finalización.</li>
                      <li style="text-align: left;">Tu cuenta permanecerá activa, solo se cancelará el acceso al asistente virtual una vez finalizado el período actual.</li>
                    </ul>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0; text-align: center; font-style: italic;">
                      ¿Cambiaste de opinión? No hay problema.
                    </p>
                    
                    <!-- Botón para reactivar -->
                    <div style="text-align: center; margin-top: 20px;">
                      <a href="${this.baseUrl}/estatus" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                        Reactivar Suscripción
                      </a>
                    </div>
                    
                    <!-- Botón de feedback -->
                    <div style="text-align: center; margin-top: 20px;">
                      <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Nos gustaría saber por qué has decidido cancelar:</p>
                      <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #e0a458; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(224, 164, 88, 0.2);">
                        Enviar Feedback
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de cancelación de suscripción
   * @param {string} email - Correo del destinatario
   * @param {Object} subscriptionData - Datos de la suscripción cancelada
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendCancelSubscriptionEmail(email, subscriptionData) {
    try {
      const htmlTemplate = this.getCancelSubscriptionTemplate(subscriptionData);

      const productName = subscriptionData.data?.items?.[0]?.product?.name || 'Asistente Virtual Académico';

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Tu suscripción a ${productName} ha sido cancelada`,
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CORREO DE CANCELACIÓN PARA: ${email}`);
        console.log(`PRODUCTO: ${productName}`);
        console.log(`SUSCRIPCIÓN ID: ${subscriptionData.data.id}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de cancelación de suscripción enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de cancelación de suscripción:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de fallo en el pago de suscripción
   * @param {Object} paymentData - Datos del pago fallido
   * @returns {string} - HTML de la plantilla
   */
  getFailedPaymentTemplate(paymentData) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const profesorTristeUrl = "https://i.imgur.com/xwLSkfQ.png"; // Profesor Acadel triste

    const transaction = paymentData.data;
    const primaryItem = transaction.items?.[0];
    const lineItem = transaction.details?.line_items?.[0];

    // Información del producto
    const productName = lineItem?.product?.name || 'Producto Acadelia';
    const productDescription = lineItem?.product?.description || primaryItem?.price?.description || 'Asistente Virtual Académico';
    const subscriptionType = primaryItem?.price?.description || 'Suscripción';

    // Información monetaria
    const currencyCode = transaction.currency_code;
    const currencySymbol = getCurrencySymbol(currencyCode);
    const totalAmount = parseFloat(transaction.details?.totals?.grand_total) / 100;

    // Formato de moneda según el código de divisa
    const formatter = new Intl.NumberFormat(getCurrencyLocale(currencyCode), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    });

    const formattedTotal = formatter.format(totalAmount);

    // Información del método de pago
    const paymentMethod = transaction.payments?.[0]?.method_details?.card;
    const paymentType = paymentMethod?.type || 'tarjeta';
    const paymentLast4 = paymentMethod?.last4 || '****';

    // Información de fecha del intento fallido
    const paymentAttemptDate = transaction.payments?.[0]?.created_at ?
      new Date(transaction.payments[0].created_at) : new Date();

    // Formateo de fechas en español
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    const formattedPaymentDate = paymentAttemptDate.toLocaleDateString('es-ES', dateOptions);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Problema con tu Pago - Acadelia</title>
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
          .payment-details-table {
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
          .button-row td {
            display: block !important;
            width: 100% !important;
            margin-bottom: 10px !important;
          }
          .manage-button {
            width: 80% !important;
            margin: 10px auto !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y mensaje de alerta -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">¡ALERTA DE PAGO!</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje de alerta -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #d13438; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">Problema con tu método de pago</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      Hemos detectado un problema al procesar el pago de tu suscripción a ${productName}. Tu tarjeta ha sido rechazada y no pudimos completar el cobro.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                      Es importante que actualices tu método de pago para mantener activo tu servicio.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Mensaje del Profesor Acadel TRISTE/PREOCUPADO -->
          <tr>
            <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr class="professor-row">
                  <!-- Imagen del Profesor Acadel triste -->
                  <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                    <div style="position: relative; text-align: center;">
                      <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${profesorTristeUrl}" alt="Profesor Acadel Preocupado" style="width: 130px; height: auto; margin: 0 auto -5px;">
                      </div>
                    </div>
                  </td>
                  
                  <!-- Mensaje en un globo -->
                  <td style="padding: 20px; vertical-align: middle; text-align: left;">
                    <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Triángulo para el globo de diálogo -->
                      <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #d13438; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Oh no! Tenemos un problema con tu pago</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        ¡Estoy preocupado! No pudimos procesar el pago de tu suscripción. 
                        Esto suele suceder cuando una tarjeta está vencida o con fondos insuficientes.
                        Te recomiendo actualizar tu método de pago lo antes posible 
                        para que no pierdas acceso a tu asistente académico.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Detalles del pago fallido -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="payment-details-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                <tr style="background-color: #d13438;">
                  <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles del Intento de Pago Fallido</th>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Producto</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${productName}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Tipo de suscripción</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${subscriptionType}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Monto a cobrar (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #d13438;">${formattedTotal}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Método de pago rechazado</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #d13438;">${paymentType.toUpperCase()} ****${paymentLast4}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Fecha del intento</td>
                  <td class="detail-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${formattedPaymentDate}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botones de acción -->
          <tr>
            <td style="padding: 0 30px 20px; text-align: center; background-color: #f5f5f5;">
              <a href="${this.baseUrl}/estatus" class="manage-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 35px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                Gestionar Suscripción
              </a>
            </td>
          </tr>
          
          <!-- Sección de información importante -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Si tu pago proviene de una suscripción anteriormente activa, puedes actualizar tu método de pago dentro de la sección <strong>"Gestionar Suscripción"</strong> en el botón <strong>"Datos de Pago"</strong>.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Si no actualizas tu método de pago, tu suscripción se suspenderá temporalmente hasta que regularices tu situación.</li>
                      <li style="text-align: left;">Para cualquier consulta, no dudes en contactar con nuestro equipo de soporte.</li>
                    </ul>
                    
                    <!-- Botón de contacto más pequeño -->
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de notificación de fallo en el pago
   * @param {string} email - Correo del destinatario
   * @param {Object} paymentData - Datos del pago fallido
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendFailedPaymentEmail(email, paymentData) {
    try {
      const htmlTemplate = this.getFailedPaymentTemplate(paymentData);

      const productName = paymentData.data?.details?.line_items?.[0]?.product?.name || 'Asistente Virtual Académico';

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `⚠️ Problema con tu pago - Acción requerida para ${productName}`,
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`ALERTA DE PAGO FALLIDO PARA: ${email}`);
        console.log(`PRODUCTO: ${productName}`);
        console.log(`TRANSACCIÓN ID: ${paymentData.data.id}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de alerta de pago fallido enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de alerta de pago fallido:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de renovación exitosa de suscripción
   * @param {Object} transactionData - Datos de la transacción de renovación
   * @returns {string} - HTML de la plantilla
   */
  getRenewalConfirmationTemplate(transactionData) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const profesorFelizUrl = "https://i.imgur.com/leLwp5s.png"; // Profesor Acadel feliz/satisfecho

    const transaction = transactionData.data;
    const primaryItem = transaction.items?.[0];
    const lineItem = transaction.details?.line_items?.[0];

    // Información del producto
    const productName = lineItem?.product?.name || 'Producto Acadelia';
    const productDescription = lineItem?.product?.description || primaryItem?.price?.description || 'Asistente Virtual Académico';
    const subscriptionType = primaryItem?.price?.description || 'Suscripción';

    // Información monetaria
    const currencyCode = transaction.currency_code;
    const currencySymbol = getCurrencySymbol(currencyCode);
    const totalAmount = parseFloat(transaction.details?.totals?.grand_total) / 100;
    const subtotalAmount = parseFloat(transaction.details?.totals?.subtotal) / 100;
    const taxAmount = parseFloat(transaction.details?.totals?.tax) / 100;

    // Formato de moneda según el código de divisa
    const formatter = new Intl.NumberFormat(getCurrencyLocale(currencyCode), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    });

    const formattedTotal = formatter.format(totalAmount);
    const formattedSubtotal = formatter.format(subtotalAmount);
    const formattedTax = formatter.format(taxAmount);

    // Información del método de pago
    const paymentMethod = transaction.payments?.[0]?.method_details?.card;
    const paymentType = paymentMethod?.type || 'tarjeta';
    const paymentLast4 = paymentMethod?.last4 || '****';

    // Información de fechas de facturación
    const billingPeriod = transaction.billing_period || {};
    const startDate = billingPeriod.starts_at ? new Date(billingPeriod.starts_at) : new Date();
    const endDate = billingPeriod.ends_at ? new Date(billingPeriod.ends_at) : new Date(startDate);

    if (!billingPeriod.ends_at && primaryItem?.price?.billing_cycle) {
      const interval = primaryItem.price.billing_cycle.interval;
      const frequency = primaryItem.price.billing_cycle.frequency || 1;

      if (interval === 'year') {
        endDate.setFullYear(endDate.getFullYear() + frequency);
      } else if (interval === 'month') {
        endDate.setMonth(endDate.getMonth() + frequency);
      } else if (interval === 'week') {
        endDate.setDate(endDate.getDate() + (frequency * 7));
      } else if (interval === 'day') {
        endDate.setDate(endDate.getDate() + frequency);
      }
    }

    // Formateo de fechas en español
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formattedStartDate = startDate.toLocaleDateString('es-ES', dateOptions);
    const formattedEndDate = endDate.toLocaleDateString('es-ES', dateOptions);

    // Información de facturación
    const invoiceId = transaction.invoice_id;
    const invoiceNumber = transaction.invoice_number;

    // URL de la factura (usar directamente la que proporciona Paddle)
    let invoiceUrl = transaction.invoice_url || '';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Renovación Exitosa - Acadelia</title>
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
          .renewal-details-table {
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
          .button-row td {
            display: block !important;
            width: 100% !important;
            margin-bottom: 10px !important;
          }
          .invoice-button {
            width: 80% !important;
            margin: 10px auto !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f5f5f5; color: #333333; width: 100%; text-align: center;">
      <div style="width: 100%; max-width: 100%; text-align: center;">
        <table cellspacing="0" cellpadding="0" border="0" class="main-table" style="width: 100%; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header con logo y mensaje de renovación -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">¡RENOVACIÓN EXITOSA!</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje de renovación -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">¡Tu suscripción ha sido renovada!</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      Nos complace confirmar que tu suscripción a ${productName} se ha renovado automáticamente con éxito. A continuación encontrarás los detalles de tu renovación.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                      ¡Sigue disfrutando de todos los beneficios de tu asistente académico!
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
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #008847; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Excelente! Tu suscripción sigue activa</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        ¡Me alegra mucho que sigas con nosotros! Hemos renovado automáticamente tu suscripción para 
                        que puedas continuar con tus estudios sin interrupciones. Te prometo que seguiremos 
                        trabajando para ofrecerte la mejor experiencia educativa posible. ¡Sigamos aprendiendo juntos!
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Detalles de la renovación -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="renewal-details-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                <tr style="background-color: #008847;">
                  <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles de tu Renovación</th>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Producto</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${productName}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Tipo de suscripción</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${subscriptionType}</td>
                </tr>
                <!-- INICIO: Desglose del pago agregado -->
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Subtotal (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedSubtotal}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Impuestos (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedTax}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Total pagado (${currencyCode})</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #008847;">${formattedTotal}</td>
                </tr>
                <!-- FIN: Desglose del pago agregado -->
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Método de pago</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${paymentType.toUpperCase()} ****${paymentLast4}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Periodo renovado</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">Del ${formattedStartDate} al ${formattedEndDate}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Factura</td>
                  <td class="detail-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${invoiceNumber || 'Disponible en Portal'}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botones de acción - DOS BOTONES -->
          <tr>
            <td style="padding: 0 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="button-row" style="width: 100%; margin: 0 auto;">
                <tr>
                  <td style="padding: 10px; width: 50%; text-align: center;">
                    <a href="${this.baseUrl}/estatus" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto; width: 80%; text-align: center; box-sizing: border-box;">
                      Gestionar Suscripción
                    </a>
                  </td>
                  <td style="padding: 10px; width: 50%; text-align: center;">
                    <a href="${invoiceUrl}" class="invoice-button" style="display: inline-block; background-color: #e0a458; color: white; text-decoration: none; padding: 12px 25px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(224, 164, 88, 0.2); margin: 0 auto; width: 80%; text-align: center; box-sizing: border-box;">
                      Ver Factura
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sección de información importante -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Información importante</h2>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Este es un correo de confirmación de la renovación automática de tu suscripción.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Dentro de la sección "Gestionar Suscripción" encontrarás el botón "Datos de Pago" donde podrás consultar tu información fiscal y verificar tu factura.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Tu suscripción se renovará automáticamente al final del período. Puedes cancelar la renovación automática en cualquier momento desde "Gestionar Suscripción".</li>
                      <li style="text-align: left;">Para cualquier consulta o asistencia, no dudes en contactarnos.</li>
                    </ul>
                    
                    <!-- Botón de contacto más pequeño -->
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de confirmación de renovación automática
   * @param {string} email - Correo del destinatario
   * @param {Object} transactionData - Datos de la transacción de renovación
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendRenewalConfirmationEmail(email, transactionData) {
    try {
      const htmlTemplate = this.getRenewalConfirmationTemplate(transactionData);

      const productName = transactionData.data?.details?.line_items?.[0]?.product?.name || 'Asistente Virtual Académico';

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ Renovación exitosa de tu suscripción a ${productName}`,
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CORREO DE RENOVACIÓN PARA: ${email}`);
        console.log(`PRODUCTO: ${productName}`);
        console.log(`TRANSACCIÓN ID: ${transactionData.data.id}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de confirmación de renovación enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de confirmación de renovación:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de confirmación de cancelación completa de suscripción
   * @param {Object} subscriptionData - Datos de la suscripción cancelada
   * @returns {string} - HTML de la plantilla
   */
  getCancelConfirmationTemplate(subscriptionData) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    // URL del profesor Acadel muy triste (usar la imagen del profesor triste)
    const profesorMuyTristeUrl = "https://i.imgur.com/xwLSkfQ.png"; // Profesor Acadel triste

    const subscription = subscriptionData.data;
    const item = subscription.items?.[0];

    // Información del producto
    const productName = item?.product?.name || 'Producto Acadelia';
    const productDescription = item?.product?.description || 'Asistente Virtual Académico';

    const cancellationDate = new Date();

    // Formateo de fecha en español
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    const formattedCancellationDate = cancellationDate.toLocaleDateString('es-ES', dateOptions);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cancelación Confirmada - Acadelia</title>
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
          .speech-bubble:before {
            display: none !important;
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
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">CANCELACIÓN CONFIRMADA</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">Tu suscripción ha sido cancelada</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      Confirmamos que tu suscripción a ${productName} ha sido completamente cancelada. Ya no tendrás acceso a este servicio ni se te realizarán más cobros.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                      Fecha de cancelación: ${formattedCancellationDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Mensaje del Profesor Acadel MUY TRISTE -->
          <tr>
            <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr class="professor-row">
                  <!-- Imagen del Profesor Acadel muy triste -->
                  <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                    <div style="position: relative; text-align: center;">
                      <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${profesorMuyTristeUrl}" alt="Profesor Acadel Muy Triste" style="width: 130px; height: auto; margin: 0 auto -5px;">
                      </div>
                    </div>
                  </td>
                  
                  <!-- Mensaje en un globo -->
                  <td style="padding: 20px; vertical-align: middle; text-align: left;">
                    <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Triángulo para el globo de diálogo -->
                      <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #d13438; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Hasta pronto! Te extrañaremos</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Tu suscripción ha sido cancelada y ya no tendrás acceso a nuestros servicios académicos.
                        Esperamos haberte sido de ayuda durante el tiempo que estuvimos juntos. Si cambias de opinión,
                        siempre serás bienvenido/a de vuelta. ¡Deseamos mucho éxito en tu camino educativo!
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Detalles de la cancelación -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                <tr style="background-color: #d13438;">
                  <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles de la cancelación</th>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Servicio cancelado</td>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Estado</td>
                  <td style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #d13438;">Cancelado</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Fecha y hora</td>
                  <td style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${formattedCancellationDate}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sección de opciones para reactivar -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">¿Cambiaste de opinión?</h2>
                    
                    <p class="info-text" style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px; text-align: center;">
                      Si deseas volver a disfrutar de los beneficios de Acadelia, puedes reactivar tu suscripción en cualquier momento.
                    </p>
                    
                    <!-- Botón para reactivar -->
                    <div style="text-align: center; margin-top: 20px;">
                      <a href="${this.baseUrl}/tienda" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                        Reactivar mi suscripción
                      </a>
                    </div>
                    
                    <!-- Separador -->
                    <div style="height: 1px; background-color: #e0e0e0; margin: 25px 0;"></div>
                    
                    <!-- Botón de feedback -->
                    <p style="color: #666; font-size: 14px; margin-bottom: 10px; text-align: center;">Nos ayudaría mucho conocer los motivos de tu cancelación:</p>
                    <div style="text-align: center; margin-top: 15px;">
                      <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #e0a458; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(224, 164, 88, 0.2);">
                        Enviar Feedback
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de confirmación de cancelación completa
   * @param {string} email - Correo del destinatario
   * @param {Object} subscriptionData - Datos de la suscripción cancelada
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendCancelConfirmationEmail(email, subscriptionData) {
    try {
      const htmlTemplate = this.getCancelConfirmationTemplate(subscriptionData);

      const productName = subscriptionData.data?.items?.[0]?.product?.name || 'Asistente Virtual Académico';

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Cancelación confirmada - ${productName}`,
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CORREO DE CONFIRMACIÓN DE CANCELACIÓN PARA: ${email}`);
        console.log(`PRODUCTO: ${productName}`);
        console.log(`SUSCRIPCIÓN ID: ${subscriptionData.data.id}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de confirmación de cancelación enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de confirmación de cancelación:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de actualización de términos y condiciones
   * @param {string} userName - Nombre o correo del usuario 
   * @param {string} newTermsVersion - Nueva versión de los términos
   * @param {string} acceptUrl - URL para aceptar los términos
   * @param {number} daysToAccept - Días para aceptar antes de que sea automático
   * @returns {string} - HTML de la plantilla
   */
  getTermsUpdateTemplate(userName, newTermsVersion, acceptUrl, daysToAccept = 30) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;
    const profesorCapibara = "https://i.imgur.com/0ml5iJ1.png";

    const userDisplay = userName.includes('@') ? userName.split('@')[0] : userName;

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + daysToAccept);

    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const formattedDeadline = deadlineDate.toLocaleDateString('es-ES', dateOptions);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Actualización de Términos y Condiciones - Acadelia</title>
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
            padding: 20px 15px !important;
            text-align: center !important;
          }
          .message-column {
            display: block !important;
            width: 100% !important;
            padding: 20px 12px !important;
            box-sizing: border-box !important;
          }
          .message-column p {
            text-align: center !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 14px !important;
          }
          .message-heading {
            text-align: center !important;
            font-size: 22px !important;
            width: 100% !important;
            padding: 0 5px !important;
            margin: 0 auto 15px !important;
            box-sizing: border-box !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
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
            width: auto !important;
            border-bottom: 2px solid #e0a458 !important;
            padding-bottom: 8px !important;
          }
          .info-text {
            text-align: center !important;
            font-size: 14px !important;
          }
          .info-list {
            display: inline-block !important;
            text-align: left !important;
            max-width: 90% !important;
            padding-left: 10px !important;
            margin: 10px 0 !important;
          }
          .info-list li {
            font-size: 14px !important;
            margin-bottom: 5px !important;
          }
          .buttons-container td {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            margin-bottom: 15px !important;
          }
          .accept-button, .decline-button, .read-button {
            width: 80% !important;
            margin: 0 auto 10px !important;
            padding: 12px 15px !important;
            font-size: 14px !important;
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
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">TÉRMINOS ACTUALIZADOS</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #582f0e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">Hola, ${userDisplay}</h1>
                    
                    <p class="message-text" style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; width: 100%; box-sizing: border-box;">
                      Hemos actualizado nuestros Términos y Condiciones a la versión <strong>${newTermsVersion}</strong>. Para continuar utilizando Acadelia, es necesario que aceptes los nuevos términos.
                    </p>
                    
                    <p style="color: #d13438; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left; width: 100%;">
                      Fecha límite para aceptar: ${formattedDeadline}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Profesor Acadel con mensaje -->
          <tr>
            <td style="padding: 30px 30px 20px; background-color: #f5f5f5; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr class="professor-row">
                  <!-- Profesor Acadel en círculo -->
                  <td style="width: 170px; padding: 20px; vertical-align: middle; text-align: center;">
                    <div class="professor-image-container" style="position: relative; text-align: center;">
                      <!-- Círculo de fondo para la imagen -->
                      <div class="professor-image-circle" style="width: 140px; height: 140px; border-radius: 50%; background-color: #f0efe7; border: 3px solid #a4ac86; display: inline-block; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <!-- Imagen del profesor centrada en el círculo -->
                        <img class="professor-image" src="${profesorCapibara}" alt="Profesor Acadel" style="width: 130px; height: 130px; object-fit: contain; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" />
                      </div>
                      <p style="font-family: 'Parkinsans', sans-serif; font-size: 14px; color: #656d4a; margin: 10px 0 0; font-style: italic; text-align: center;">Profesor Acadel</p>
                    </div>
                  </td>
                  
                  <!-- Globo de mensaje -->
                  <td style="padding: 20px; vertical-align: middle; text-align: left;">
                    <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Triángulo para el globo de diálogo -->
                      <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #582f0e; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Importante actualización!</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Hemos realizado mejoras en nuestros términos y condiciones para brindarte un mejor servicio. 
                        Es importante que los revises y aceptes para continuar usando todos los beneficios de 
                        Acadelia. Si no tomas acción, se aceptarán automáticamente después del período de notificación.
                        Si prefieres no aceptar, puedes gestionar el cierre de tu cuenta desde tu perfil.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Información de la actualización -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                <tr style="background-color: #a06433;">
                  <th colspan="2" style="padding: 12px; color: white; font-size: 16px; text-align: center; font-weight: 600;">Información sobre los cambios</th>
                </tr>
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                      Hemos actualizado nuestros términos y condiciones. Los principales cambios incluyen:
                    </p>
                    
                    <ul style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px; padding-left: 20px;">
                      <li style="margin-bottom: 8px;">Mayor claridad en nuestra política de privacidad y uso de datos</li>
                      <li style="margin-bottom: 8px;">Actualización de las condiciones de uso de nuestra IA educativa</li>
                      <li style="margin-bottom: 8px;">Nuevas disposiciones sobre derechos de propiedad intelectual</li>
                      <li>Cambios en la política de cancelación y reembolsos</li>
                    </ul>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 500; margin: 15px 0 0;">
                      Te recomendamos leer detenidamente la versión completa de los nuevos términos.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Botones de acción -->
          <tr>
            <td style="padding: 10px 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="buttons-container" style="width: 100%; margin: 0 auto;">
                <tr>
                  <td style="padding: 10px; width: 33%; text-align: center;">
                    <a href="${acceptUrl}" class="accept-button" style="display: inline-block; background-color: #008847; color: white; text-decoration: none; padding: 15px 25px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(0, 136, 71, 0.2); margin: 0 auto; text-align: center; box-sizing: border-box;">
                      Aceptar términos
                    </a>
                  </td>
                  <td style="padding: 10px; width: 33%; text-align: center;">
                    <a href="${this.baseUrl}/terminos_condiciones" class="read-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 15px 25px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(160, 100, 51, 0.2); margin: 0 auto; text-align: center; box-sizing: border-box;">
                      Leer términos
                    </a>
                  </td>
                  <td style="padding: 10px; width: 33%; text-align: center;">
                    <a href="${this.baseUrl}/delete-account" class="decline-button" style="display: inline-block; background-color: #d13438; color: white; text-decoration: none; padding: 15px 25px; border-radius: 30px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(209, 52, 56, 0.2); margin: 0 auto; text-align: center; box-sizing: border-box;">
                      Gestionar cuenta
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                <strong>Nota importante:</strong> Si no aceptas los nuevos términos antes del <strong>${formattedDeadline}</strong>, se considerarán aceptados automáticamente. Si no deseas aceptar los nuevos términos, puedes gestionar el cierre de tu cuenta desde el botón "Gestionar cuenta".
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #a06433; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo de notificación de actualización de términos y condiciones
   * @param {string} email - Correo del destinatario
   * @param {string} newTermsVersion - Nueva versión de los términos
   * @param {string} acceptToken - Token único para aceptación (opcional)
   * @param {number} daysToAccept - Días para aceptación automática
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendTermsUpdateEmail(email, newTermsVersion, acceptToken = null, daysToAccept = 30) {
    try {
      let acceptUrl = `${this.baseUrl}/terminos/aceptar`;
      if (acceptToken) {
        acceptUrl += `?token=${acceptToken}&version=${newTermsVersion}`;
      }

      const htmlTemplate = this.getTermsUpdateTemplate(email, newTermsVersion, acceptUrl, daysToAccept);

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Importante: Actualización de Términos y Condiciones v${newTermsVersion}`,
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CORREO DE ACTUALIZACIÓN DE TÉRMINOS PARA: ${email}`);
        console.log(`VERSIÓN: ${newTermsVersion}`);
        console.log(`URL DE ACEPTACIÓN: ${acceptUrl}`);
        console.log(`DÍAS PARA ACEPTAR: ${daysToAccept}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de actualización de términos enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de actualización de términos:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de verificación de eliminación de cuenta
   * @param {string} code - Código de verificación para confirmar la eliminación
   * @returns {string} - HTML de la plantilla
   */
  getAccountDeletionTemplate(code) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const profesorTristeUrl = "https://i.imgur.com/xwLSkfQ.png"; // Profesor Acadel triste

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificación de Eliminación de Cuenta - Acadelia</title>
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
          .code-column {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            padding: 20px 0 !important;
          }
          .code-heading {
            text-align: center !important;
            font-size: 22px !important;
            width: 100% !important;
            padding: 0 10px !important;
            margin: 0 auto 15px !important;
            box-sizing: border-box !important;
          }
          .code-table {
            margin: 0 auto !important;
            width: auto !important;
            display: inline-block !important;
          }
          .code-cell {
            padding-right: 4px !important;
          }
          .digit-card {
            width: 42px !important;
          }
          .digit-text {
            font-size: 32px !important;
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
          .expire-text {
            text-align: center !important;
            width: 100% !important;
            margin: 10px 0 0 0 !important;
            padding: 0 !important;
          }
          .info-container {
            padding: 15px !important;
            box-sizing: border-box !important;
          }
          .action-button {
            margin: 0 auto !important;
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
          <!-- Header con logo y código de verificación juntos -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">CONFIRMACIÓN REQUERIDA</div>
                    </div>
                  </td>
                  
                  <!-- Columna del código de verificación -->
                  <td class="code-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: center;">
                    <h1 class="code-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #e53e3e; margin: 0 0 15px; letter-spacing: -0.5px; text-align: center;">Código para eliminar tu cuenta</h1>
                    
                    <table cellspacing="0" cellpadding="0" border="0" class="code-table" align="center" style="margin: 0 auto 15px; width: auto; display: inline-block;">
                      <tr>
                        ${code.split('').map(digit => `
                          <td class="code-cell" style="padding-right: 6px;">
                            <table cellspacing="0" cellpadding="0" border="0" class="digit-card" style="width: 50px; border-radius: 12px; box-shadow: 0 6px 15px rgba(0,0,0,0.1); overflow: hidden;">
                              <tr>
                                <td style="height: 4px; background-color: #e53e3e;" colspan="1"></td>
                              </tr>
                              <tr>
                                <td style="background-color: white; height: 70px; text-align: center;">
                                  <span class="digit-text" style="font-size: 38px; font-weight: 800; color: #e53e3e; text-shadow: 0 1px 2px rgba(0,0,0,0.08);">${digit}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        `).join('')}
                      </tr>
                    </table>
                    
                    <p class="expire-text" style="color: #666; font-size: 15px; line-height: 1.5; margin: 10px 0 0 0; text-align: center; width: 100%;">Este código expirará en 1 hora</p>
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
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #e53e3e; font-size: 18px; margin: 0 0 8px; font-weight: 600;">Estamos muy tristes de verte partir...</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Has solicitado eliminar tu cuenta de Acadelia. Esta acción es permanente e irreversible.
                        Todos tus datos, conversaciones y progreso se perderán. Si estás completamente seguro,
                        usa el código de verificación proporcionado para confirmar tu decisión.
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
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #e53e3e; margin: 0 0 15px; border-bottom: 2px solid #e53e3e; padding-bottom: 8px; display: inline-block;">Advertencia importante</h2>
                    
                    <p class="info-text" style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px; text-align: left;">
                      La eliminación de tu cuenta implica:
                    </p>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Pérdida permanente de todos tus datos personales</li>
                      <li style="margin-bottom: 10px; text-align: left;">Eliminación de todo tu historial de conversaciones</li>
                      <li style="margin-bottom: 10px; text-align: left;">Pérdida de acceso a los AVAs que hayas adquirido</li>
                      <li style="text-align: left;">Imposibilidad de recuperar la información en el futuro</li>
                    </ul>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0; text-align: center; font-style: italic;">
                      ¿Cambiaste de opinión? No hay problema.
                    </p>
                    
                    <!-- Botón para cancelar -->
                    <div style="text-align: center; margin-top: 20px;">
                      <a href="${this.baseUrl}/cuenta" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                        Conservar mi cuenta
                      </a>
                    </div>
                    
                    <!-- Contacto de soporte -->
                    <div style="text-align: center; margin-top: 20px;">
                      <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Si tienes alguna duda, no dudes en contactarnos:</p>
                      <a href="${this.baseUrl}/contact" class="contact-button" style="display: inline-block; background-color: #e0a458; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(224, 164, 88, 0.2);">
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Envía un correo con código de verificación para eliminar cuenta
   * @param {string} email - Correo del destinatario
   * @param {string} code - Código de verificación
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendAccountDeletionCode(email, code) {
    try {
      const htmlTemplate = this.getAccountDeletionTemplate(code);

      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verificación para eliminar tu cuenta de Acadelia",
        html: htmlTemplate
      };

      // En desarrollo mostramos el código en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CÓDIGO PARA ELIMINAR CUENTA: ${code}`);
        console.log(`CORREO DESTINO: ${email}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de verificación para eliminar cuenta enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de verificación para eliminar cuenta:", error);
      throw error;
    }
  }

  /**
   * Plantilla para correo de confirmación de cambio de contraseña
   * @param {Object} userData - Datos del usuario
   * @param {Object} options - Opciones adicionales como información del dispositivo
   * @returns {string} - HTML de la plantilla
   */
  getPasswordChangeTemplate(userData, options = {}) {
    // URLs directas de Imgur
    const logoUrl = this.imageUrls.logo;
    const mascotaUrl = this.imageUrls.mascota;

    // Información del dispositivo y ubicación
    const deviceInfo = options.deviceInfo || {};
    const ipAddress = deviceInfo.ipAddress || 'No disponible';
    const userAgent = deviceInfo.userAgent || 'No disponible';
    const browserName = this.getBrowserName(userAgent);
    const deviceType = this.getDeviceType(userAgent);

    const now = new Date();
    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const formattedDate = now.toLocaleDateString('es-ES', dateOptions);

    const showSecurityWarning = options.showSecurityWarning !== false;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contraseña Actualizada - Acadelia</title>
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
          .mascot-column {
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
          .detail-table {
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
          <!-- Header con logo y mensaje -->
          <tr>
            <td class="content-wrapper" style="padding: 0;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <!-- Columna del logo -->
                  <td class="logo-column" style="background-color: #656d4a; width: 250px; padding: 30px; text-align: center; vertical-align: middle;">
                    <div style="text-align: center;">
                      <img src="${logoUrl}" alt="Acadelia" style="max-width: 180px; height: auto; margin: 0 auto 20px;">
                      <div style="font-family: 'Parkinsans', sans-serif; font-size: 20px; font-weight: 800; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.2); text-align: center;">CONTRASEÑA ACTUALIZADA</div>
                    </div>
                  </td>
                  
                  <!-- Columna del mensaje -->
                  <td class="message-column" style="padding: 25px 30px; background-color: white; vertical-align: middle; text-align: left;">
                    <h1 class="message-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 24px; color: #008847; margin: 0 0 15px; letter-spacing: -0.5px; text-align: left;">¡Tu contraseña ha sido actualizada con éxito!</h1>
                    
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
                      La contraseña de tu cuenta de Acadelia ha sido cambiada correctamente. Esta modificación se realizó en la fecha y hora indicadas a continuación.
                    </p>
                    
                    <p style="color: #582f0e; font-size: 15px; font-weight: 600; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                      Cambio realizado el: ${formattedDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Mensaje de la mascota de Acadelia -->
          <tr>
            <td style="padding: 10px 30px 20px; background-color: #f5f5f5; text-align: center;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr class="professor-row">
                  <!-- Mascota Acadelia -->
                  <td style="width: 150px; padding: 20px; vertical-align: middle; text-align: center;">
                    <div style="position: relative; text-align: center;">
                      <div style="width: 120px; height: 120px; border-radius: 60px; background-color: #a4ac86; opacity: 0.2; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);"></div>
                      <div style="position: relative; z-index: 1; text-align: center;">
                        <img src="${mascotaUrl}" alt="Mascota Acadelia" style="width: 130px; height: auto; margin: 0 auto -5px;">
                      </div>
                    </div>
                  </td>
                  
                  <!-- Mensaje en un globo -->
                  <td style="padding: 20px; vertical-align: middle; text-align: left;">
                    <div class="speech-bubble" style="background-color: #f0efe7; border-radius: 12px; padding: 18px; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                      <!-- Triángulo para el globo de diálogo -->
                      <div style="width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-right: 18px solid #f0efe7; position: absolute; left: -18px; top: 50%; transform: translateY(-50%);"></div>
                      
                      <p style="font-family: 'Parkinsans', sans-serif; color: #008847; font-size: 18px; margin: 0 0 8px; font-weight: 600;">¡Tu contraseña ha sido actualizada correctamente!</p>
                      <p style="color: #656d4a; font-size: 14px; line-height: 1.6; margin: 0;">
                        Has actualizado con éxito la contraseña de tu cuenta de Acadelia. Tu seguridad es muy importante para nosotros, 
                        por eso te enviamos esta confirmación. Si has sido tú quien realizó este cambio, no necesitas hacer nada más.
                        ${showSecurityWarning ? ' Si no has sido tú quien solicitó este cambio, por favor comunícate con nuestro equipo de soporte de inmediato.' : ''}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Detalles del cambio de contraseña -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" class="detail-table" style="width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto;">
                <tr style="background-color: #008847;">
                  <th colspan="2" style="padding: 12px; color: white; font-size: 14px; text-align: center; font-weight: 600;">Detalles del Cambio</th>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Acción</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">Cambio de Contraseña</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Fecha y Hora</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${formattedDate}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Dispositivo</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${deviceType}</td>
                </tr>
                <tr>
                  <td class="detail-cell" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: left; font-weight: 500; color: #444;">Navegador</td>
                  <td class="detail-value" style="padding: 10px 15px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #582f0e;">${browserName}</td>
                </tr>
                <tr style="background-color: #f0efe7;">
                  <td class="detail-cell" style="padding: 10px 15px; text-align: left; font-weight: 500; color: #444;">Dirección IP</td>
                  <td class="detail-value" style="padding: 10px 15px; text-align: right; font-weight: 600; color: #582f0e;">${ipAddress}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${showSecurityWarning ? `
          <!-- Advertencia de seguridad -->
          <tr>
            <td style="padding: 10px 30px 20px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #ffebeb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 0 auto; border: 1px solid #ffcccc;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="font-weight: 600; color: #d13438; font-size: 16px; margin: 0 0 10px;">¿No realizaste este cambio?</p>
                    <p style="font-size: 14px; color: #666; margin: 0 0 15px; line-height: 1.5;">
                      Si no has sido tú quien cambió la contraseña, es posible que alguien esté intentando acceder a tu cuenta.
                      Te recomendamos contactar inmediatamente con nuestro equipo de soporte.
                    </p>
                    <a href="${this.baseUrl}/contact" style="display: inline-block; background-color: #d13438; color: white; text-decoration: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; letter-spacing: 0.5px; box-shadow: 0 4px 10px rgba(209, 52, 56, 0.2);">
                      Contactar Soporte
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Recomendaciones de seguridad -->
          <tr>
            <td class="info-container" style="padding: 0 30px 30px; text-align: center; background-color: #f5f5f5;">
              <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: white; border-radius: 12px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <tr>
                  <!-- Información importante -->
                  <td class="info-column" style="padding: 25px; vertical-align: top; width: 100%; text-align: left;">
                    <h2 class="info-heading" style="font-family: 'Parkinsans', sans-serif; font-size: 20px; color: #582f0e; margin: 0 0 15px; border-bottom: 2px solid #e0a458; padding-bottom: 8px; display: inline-block;">Recomendaciones de seguridad</h2>
                    
                    <ul class="info-list" style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0; padding-left: 20px; text-align: left;">
                      <li style="margin-bottom: 10px; text-align: left;">Utiliza contraseñas únicas y fuertes para cada servicio que utilices.</li>
                      <li style="margin-bottom: 10px; text-align: left;">No compartas tu contraseña con nadie ni la envíes por correo electrónico.</li>
                      <li style="margin-bottom: 10px; text-align: left;">Cambia tu contraseña regularmente, especialmente si sospechas que pudo haber sido comprometida.</li>
                      <li style="text-align: left;">Verifica regularmente la actividad de tu cuenta para detectar inicios de sesión no reconocidos.</li>
                    </ul>
                    
                    <!-- Botón de acceso -->
                    <div style="text-align: center; margin-top: 20px;">
                      <a href="${this.baseUrl}/login" class="action-button" style="display: inline-block; background-color: #a06433; color: white; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 6px 15px rgba(88, 47, 14, 0.2); margin: 0 auto;">
                        Acceder a Acadelia
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
              <p style="margin: 0 0 5px; font-size: 13px; text-align: center;">© ${new Date().getFullYear()} Acadelia</p>
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
   * Método para detectar el nombre del navegador a partir del user agent
   * @param {string} userAgent - String del user agent
   * @returns {string} - Nombre del navegador
   */
  getBrowserName(userAgent) {
    if (!userAgent) return 'Desconocido';

    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Microsoft Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';

    return 'Otro';
  }

  /**
   * Método para detectar el tipo de dispositivo a partir del user agent
   * @param {string} userAgent - String del user agent
   * @returns {string} - Tipo de dispositivo
   */
  getDeviceType(userAgent) {
    if (!userAgent) return 'Desconocido';

    if (userAgent.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i)) {
      if (userAgent.match(/tablet|ipad/i)) return 'Tablet';
      if (userAgent.match(/mobile|iphone|android/i)) return 'Móvil';
      return 'Dispositivo móvil';
    }

    return 'Ordenador';
  }

  /**
   * Envía un correo de confirmación de cambio de contraseña
   * @param {string} email - Correo del destinatario
   * @param {Object} userData - Datos del usuario
   * @param {Object} options - Opciones como información del dispositivo
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendPasswordChangeConfirmation(email, userData = {}, options = {}) {
    try {
      const deviceInfo = {
        ipAddress: options.ipAddress || 'No disponible',
        userAgent: options.userAgent || 'No disponible'
      };

      const emailOptions = {
        deviceInfo,
        showSecurityWarning: options.showSecurityWarning !== false
      };

      const htmlTemplate = this.getPasswordChangeTemplate(userData, emailOptions);

      const mailOptions = {
        from: `"Acadelia Seguridad" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Confirmación: Tu contraseña ha sido actualizada",
        html: htmlTemplate
      };

      // En desarrollo mostramos detalles en consola
      if (process.env.NODE_ENV !== 'production') {
        console.log('==========================================');
        console.log(`CORREO DE CONFIRMACIÓN DE CAMBIO DE CONTRASEÑA PARA: ${email}`);
        console.log(`DISPOSITIVO: ${this.getDeviceType(deviceInfo.userAgent)}`);
        console.log(`NAVEGADOR: ${this.getBrowserName(deviceInfo.userAgent)}`);
        console.log(`IP: ${deviceInfo.ipAddress}`);
        console.log('==========================================');
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de confirmación de cambio de contraseña enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error("Error enviando email de confirmación de cambio de contraseña:", error);
      throw error;
    }
  }

  /**
   * Método genérico para enviar emails
   * @param {string} to - Destinatario
   * @param {string} subject - Asunto
   * @param {string} htmlContent - Contenido HTML
   * @param {object} options - Opciones adicionales (cc, bcc, attachments)
   * @returns {Promise<boolean>} - Resultado del envío
   */
  async sendEmail(to, subject, htmlContent, options = {}) {
    try {
      const mailOptions = {
        from: `"Acadelia" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
        ...options
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error al enviar correo:', error);
      throw error;
    }
  }
}

/**
 * Función auxiliar para determinar la configuración regional basada en el código de moneda
 * @param {string} currencyCode - Código de la moneda
 * @returns {string} - Configuración regional apropiada
 */
function getCurrencyLocale(currencyCode) {
  const currencyLocales = {
    'EUR': 'es-ES',
    'USD': 'en-US',
    'MXN': 'es-MX',
    'COP': 'es-CO',
    'ARS': 'es-AR',
    'CLP': 'es-CL',
    'PEN': 'es-PE',
    'VES': 'es-VE',
    'BOB': 'es-BO',
    'PYG': 'es-PY',
    'UYU': 'es-UY',
    'GTQ': 'es-GT',
    'HNL': 'es-HN',
    'NIO': 'es-NI',
    'CRC': 'es-CR',
    'PAB': 'es-PA',
    'DOP': 'es-DO',
    'SVC': 'es-SV'
  };

  return currencyLocales[currencyCode] || 'es-ES';
}

/**
 * Función auxiliar para obtener el símbolo de moneda
 * @param {string} currencyCode - Código de la moneda
 * @returns {string} - Símbolo de la moneda
 */
function getCurrencySymbol(currencyCode) {
  const currencySymbols = {
    'EUR': '€',
    'USD': '$',
    'MXN': '$',
    'COP': '$',
    'ARS': '$',
    'CLP': '$',
    'PEN': 'S/',
    'VES': 'Bs.',
    'BOB': 'Bs.',
    'PYG': '₲',
    'UYU': '$U',
    'GTQ': 'Q',
    'HNL': 'L',
    'NIO': 'C$',
    'CRC': '₡',
    'PAB': 'B/',
    'DOP': 'RD$',
    'SVC': '₡'
  };

  return currencySymbols[currencyCode] || currencyCode;
}

// Exportamos una instancia única
export const emailService = new EmailService();