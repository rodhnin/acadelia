// signatureVerifier.js
import { createHmac } from 'node:crypto';
import { logSecurityEvent } from '../../utils/securityLogger.js';

const TIMESTAMP_TOLERANCE = 300;

const verifyWebhookSignature = (signatureHeader, rawBody, secretKey) => {
  try {
    // 1. Extraer timestamp y firma del header
    const [tsPart, h1Part] = signatureHeader.split(';');
    if (!tsPart || !h1Part) {
      logSecurityEvent('SIGNATURE_INVALID', 'Header de firma inválido', {
        header: signatureHeader
      }, 'high');
      throw new Error("Header de firma inválido");
    }

    const timestamp = tsPart.split('=')[1];
    const receivedSignature = h1Part.split('=')[1];

    if (!timestamp || !receivedSignature) {
      logSecurityEvent('SIGNATURE_INVALID', 'Formato de firma inválido', {
        header: signatureHeader
      }, 'high');
      throw new Error("Formato de firma inválido");
    }

    // 2. Verificar la tolerancia de tiempo
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - parseInt(timestamp));

    if (timeDifference > TIMESTAMP_TOLERANCE) {
      logSecurityEvent('SIGNATURE_TIMESTAMP', 'Timestamp fuera de tolerancia', {
        timestamp: timestamp,
        currentTime: currentTime,
        difference: timeDifference
      }, 'high');
      throw new Error("Timestamp fuera de tolerancia");
    }

    // 3. Construir el payload firmado utilizando el rawBody exactamente como lo recibimos
    const signedPayload = `${timestamp}:${rawBody}`;

    // 4. Generar el hash HMAC-SHA256 usando el secreto completo
    const generatedSignature = createHmac('sha256', secretKey)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Para debugging
    console.log("🔍 Debug información:", {
      evento: 'Verificación de firma',
      timestamp: timestamp,
      payload_length: signedPayload.length,
      received_sig: receivedSignature,
      generated_sig: generatedSignature,
      payload_start: signedPayload.substring(0, 50) + "..."
    });

    // 5. Comparar firmas
    if (receivedSignature !== generatedSignature) {
      logSecurityEvent('SIGNATURE_MISMATCH', 'Firma inválida', {
        timestamp: timestamp,
        received_sig_part: receivedSignature.substring(0, 10) + "...",
        generated_sig_part: generatedSignature.substring(0, 10) + "..."
      }, 'high');
      throw new Error("Firma inválida");
    }

    logSecurityEvent('SIGNATURE_VALID', 'Firma validada correctamente', {
      timestamp: timestamp
    }, 'info');
    
    return true;

  } catch (error) {
    console.error("Error en la verificación:", error.message);
    throw error;
  }
};

export const verifySignature = (eventType, signatureHeader, rawBody, secretKey) => {
  if (!signatureHeader || !secretKey || !rawBody) {
    logSecurityEvent('SIGNATURE_PARAMS_MISSING', 'Faltan parámetros esenciales para verificación', {
      eventType: eventType,
      hasSignature: !!signatureHeader,
      hasSecret: !!secretKey,
      hasBody: !!rawBody
    }, 'high');
    throw new Error("Faltan parámetros esenciales");
  }

  return verifyWebhookSignature(signatureHeader, rawBody, secretKey);
};

export default verifySignature;