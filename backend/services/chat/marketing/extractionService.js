// extractionService.js
import { openai } from "../../../lib/openai.js";
import { validateProfileData, validateContentData, validateTrendData } from "../../../utils/marketing/validators.js";

export const extractionService = {
  async extractDataWithAI(text, type) {
    try {
      let systemPrompt = "";
      switch (type) {
        case 'profile':
          systemPrompt = `Extrae los datos de perfil de usuario del siguiente texto y devuélvelos SOLO como un objeto JSON válido.
          Campos comunes: edad (número), carrera (texto), nivel_academico (texto), hobbies (array de textos), 
          actitudes (objeto con valores numéricos entre 0-1), canales_preferidos (array de textos).
          Si no encuentras algún campo, omítelo. No inventes datos que no estén en el texto original.`;
          break;
        case 'content':
          systemPrompt = `Extrae los datos de contenido de marketing del siguiente texto y devuélvelos SOLO como un objeto JSON válido.
          Estructura requerida:
          {
            "type": "meme|post|email|campaign", (obligatorio)
            "channel": "Instagram|Email|WhatsApp|Facebook", (obligatorio)
            "payload": {
              // campos específicos del contenido
              "title": "título del contenido",
              "description": "descripción detallada",
              ... otros campos relevantes
            }
          }`;
          break;
        case 'trend':
          systemPrompt = `Extrae los datos de tendencia del siguiente texto y devuélvelos SOLO como un objeto JSON válido.
          Estructura requerida:
          {
            "theme": "texto que describe la tendencia", (obligatorio)
            "popularity": número entre 0 y 1 que indica la popularidad, (obligatorio, default 0.5)
            "metadata": { datos adicionales sobre la tendencia }
          }`;
          break;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      
      const extractedData = JSON.parse(completion.choices[0].message.content);
      
      let validationErrors = [];
      switch (type) {
        case 'profile':
          validationErrors = validateProfileData(extractedData);
          break;
        case 'content':
          validationErrors = validateContentData(extractedData);
          break;
        case 'trend':
          validationErrors = validateTrendData(extractedData);
          break;
      }
      
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: "Validación fallida",
          errors: validationErrors,
          partialData: extractedData
        };
      }
      
      return {
        success: true,
        data: extractedData
      };
    } catch (error) {
      console.error(`Error extrayendo datos con IA (tipo: ${type}):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};