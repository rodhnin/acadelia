import express from 'express';
import dotenv from 'dotenv';
import { handleSubscription } from '../../services/pagos/subscriptionHandler.js';
import { handleTransaction } from '../../services/pagos/transactionHandler.js';
import { verifySignature } from '../../controllers/pagos/signatureVerifier.js';

dotenv.config();

const router = express.Router();

router.post('/', express.text({ type: 'application/json' }), async (req, res) => {
  const signatureHeader = req.headers['paddle-signature'];
  const secretKey = process.env.PADDLE_WEBHOOK_SECRET || '';
  const rawBody = req.body; // Ya viene como string por express.text()

  try {
    console.log("📥 Payload recibido:", rawBody);
    console.log("🔑 Headers recibidos:", req.headers);

    const eventData = JSON.parse(rawBody);

    // Verificamos la firma
    verifySignature(eventData.event_type, signatureHeader, rawBody, secretKey);
    
    console.log("✅ Webhook verificado correctamente:", eventData.event_type);

    // Manejamos diferentes tipos de eventos
    if (eventData.event_type.startsWith('subscription.')) {
      await handleSubscription(eventData);
    } else if (eventData.event_type.startsWith('transaction.')) {
      // Este manejador ahora incluye el envío de correo de confirmación
      await handleTransaction(eventData);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("⚠️ Error procesando webhook:", error.message);
    
    // Responder con error, pero con código 200 para que Paddle no reintente
    // (según recomendaciones de Paddle para webhooks)
    return res.status(200).json({ 
      success: false, 
      error: error.message,
      note: "Error procesado, no reintentar" 
    });
  }
});

export default router;