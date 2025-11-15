import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

export const sendContactEmail = async (req, res) => {
    try {
        const { fullName, reason, email, message } = req.body;

        if (!fullName || !email || !message || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son obligatorios'
            });
        }

        // Email para el admin
        const adminMailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.FEEDBACK_EMAIL || 'acadelia.system@gmail.com',
            subject: `📧 Nuevo contacto - ${reason}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #656d4a;">📧 Nuevo mensaje de contacto</h2>
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Nombre:</strong> ${fullName}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Razón:</strong> ${reason}</p>
                        <hr style="border: 1px solid #ddd; margin: 15px 0;">
                        <p><strong>Mensaje:</strong></p>
                        <p style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #656d4a;">
                            ${message.replace(/\n/g, '<br>')}
                        </p>
                    </div>
                    <p style="color: #666; font-size: 12px;">
                        Enviado desde Acadelia Contact Form - ${new Date().toLocaleString()}
                    </p>
                </div>
            `
        };

        // Email de confirmación para el usuario
        const userMailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '✅ Hemos recibido tu mensaje - Acadelia',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #656d4a;">¡Gracias por contactarnos!</h2>
                    <p>Hola <strong>${fullName}</strong>,</p>
                    <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo pronto.</p>
                    
                    <div style="background: #f0efe7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #656d4a; margin-top: 0;">Resumen de tu consulta:</h3>
                        <p><strong>Tema:</strong> ${reason}</p>
                        <p><strong>Mensaje:</strong> ${message}</p>
                    </div>
                    
                    <p>Tiempo estimado de respuesta: <strong>24-48 horas</strong></p>
                    
                    <hr style="border: 1px solid #ddd; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Este es un mensaje automático. No respondas a este email.
                    </p>
                </div>
            `
        };

        await Promise.all([
            transporter.sendMail(adminMailOptions),
            transporter.sendMail(userMailOptions)
        ]);

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente'
        });

    } catch (error) {
        console.error('Error enviando email de contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};