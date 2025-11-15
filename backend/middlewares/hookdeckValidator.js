import crypto from 'crypto';

class HookdeckValidator {
  constructor() {
    this.signingSecret = process.env.HOOKDECK_SIGNING_SECRET;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  validateSignature(req) {
    try {
      const signature = req.headers['x-hookdeck-signature'];
      const eventId = req.headers['x-hookdeck-eventid'];
      const requestId = req.headers['x-hookdeck-requestid'];
      
      // 🆕 NUEVO: Logging detallado para debugging
      console.log('🔍 Headers de validación (REALES):', {
        signature: signature ? 'PRESENTE' : 'AUSENTE',
        eventId: eventId ? 'PRESENTE' : 'AUSENTE', 
        requestId: requestId ? 'PRESENTE' : 'AUSENTE',
        signingSecret: this.signingSecret ? 'CONFIGURADO' : 'NO CONFIGURADO',
        verified: req.headers['x-hookdeck-verified'],
        environment: this.isDevelopment ? 'development' : 'production'
      });

      if (!signature || !eventId) {
        console.error('❌ Faltan headers mínimos requeridos');
        console.error('Headers hookdeck disponibles:', 
          Object.keys(req.headers).filter(h => h.includes('hookdeck'))
        );
        return false;
      }

      const hookdeckVerified = req.headers['x-hookdeck-verified'];
      if (hookdeckVerified === 'true') {
        console.log('✅ Hookdeck ya verificó el webhook');
        return true;
      }

      if (!this.signingSecret) {
        console.error('❌ HOOKDECK_SIGNING_SECRET no configurado en variables de entorno');
        return false;
      }

      // En su lugar, usar el requestId o eventId como parte de la validación

      const rawBody = JSON.stringify(req.body);
      const payload = `${eventId}.${rawBody}`;
      
      console.log('🔍 Payload para verificación (sin timestamp):', {
        eventId,
        bodyLength: rawBody.length,
        payloadLength: payload.length
      });
      
      const expectedSignature = crypto
        .createHmac('sha256', this.signingSecret)
        .update(payload)
        .digest('base64');

      // 🆕 NUEVO: Logging de firmas para debugging
      console.log('🔍 Comparación de firmas:', {
        received: signature.substring(0, 20) + '...',
        expected: expectedSignature.substring(0, 20) + '...',
        match: signature === expectedSignature
      });

      const isValid = signature === expectedSignature;
      
      if (!isValid) {
        console.error('❌ Firma inválida');
        
        console.log('🔄 Intentando métodos alternativos de validación...');
        
        // Método 1: Payload con requestId
        const altPayload1 = `${eventId}.${requestId}.${rawBody}`;
        const altSignature1 = crypto
          .createHmac('sha256', this.signingSecret)
          .update(altPayload1)
          .digest('base64');
        
        if (signature === altSignature1) {
          console.log('✅ Firma válida con método alternativo 1 (eventId + requestId + body)');
          return true;
        }
        
        // Método 2: Solo el body
        const altPayload2 = rawBody;
        const altSignature2 = crypto
          .createHmac('sha256', this.signingSecret)
          .update(altPayload2)
          .digest('base64');
        
        if (signature === altSignature2) {
          console.log('✅ Firma válida con método alternativo 2 (solo body)');
          return true;
        }
        
        console.error('❌ Ningún método de validación funcionó');
      } else {
        console.log('✅ Firma válida con método estándar');
      }
      
      return isValid;
      
    } catch (error) {
      console.error('❌ Error validando firma:', error);
      return false;
    }
  }

  getEventInfo(req) {
    return {
      eventId: req.headers['x-hookdeck-eventid'] || 'unknown', // SIN GUIÓN
      attemptNumber: req.headers['x-hookdeck-attempt-count'] || '1',
      requestId: req.headers['x-hookdeck-requestid'],
      sourceId: req.headers['x-hookdeck-source-name'],
      webhookId: req.headers['x-hookdeck-connection-name'],
      verified: req.headers['x-hookdeck-verified'] === 'true'
    };
  }

  // Método para saltarse validación completamente
  skipValidation() {
    return process.env.HOOKDECK_SKIP_VALIDATION === 'true';
  }
}

export default new HookdeckValidator();