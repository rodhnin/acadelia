// contentService.js - CORREGIDO CON SISTEMA DE NOTIFICACIONES
import pool from "../../../lib/dbPool.js";
import { supabase } from "../../../lib/supabaseService.js";
import { embeddings, openai } from '../../../lib/openai.js';
import { 
  getPromptTemplate, 
  cleanAIResponseWithStructure,
  validateSpecificStructure 
} from "../../../utils/marketing/promptTemplates.js";
import { sanitizeAIGeneratedContent } from '../../../utils/jsonSanitizer.js';
import { CONTENT_GENERATION_ENHANCED } from '../../../utils/marketing/AcadeliaDNA.js';
import { notificationTracker } from '../../../utils/marketing/notificationTracker.js';

export const contentService = {
  async createContent(contentData) {
    const { type, channel, payload } = contentData;
    const client = await pool.connect();
    
    try {
      const embeddingString = JSON.stringify({
        type,
        channel,
        ...payload
      });
      
      const embeddingVector = await embeddings.embedQuery(embeddingString);
      const formattedVector = `[${embeddingVector.join(',')}]`;
      
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO marketing_contents (type, channel, payload, embedding) 
         VALUES ($1, $2, $3, $4::vector(1536)) 
         RETURNING id, type, channel, payload, created_at`,
        [type, channel, payload, formattedVector]
      );
      
      await client.query('COMMIT');
      
      if (result.rows[0]) {
        try {
          const notification = notificationTracker.trackContent(result.rows[0]);
          console.log('📱 Contenido registrado para notificación:', notification.title);
        } catch (notificationError) {
          console.warn('⚠️ Error registrando notificación de contenido:', notificationError.message);
          // No fallar la operación por un error de notificación
        }
      }
      
      return { success: true, content: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error creando contenido:", error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  },

  async generateContent(contentParams) {
    const { type, channel, target, theme } = contentParams;
    
    try {
      console.log(`🚀 Generando contenido tipo: ${type}, canal: ${channel}, tema: ${theme}`);
      
      const customPrompt = getPromptTemplate(type, {
        type,
        channel,
        target,
        theme
      });
      
      console.log(`📝 Usando plantilla específica para tipo: ${type}`);
      
      const systemMessage = `${CONTENT_GENERATION_ENHANCED}

CRÍTICO: Debes generar contenido con estructura específica para ${type}. 

Reglas ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido
2. USA la estructura específica requerida para ${type}
3. INCLUYE el campo "theme" como descripción principal
4. INCLUYE un objeto "${type}" con toda la información específica
5. INCLUYE "targetAudience" con información de la audiencia
6. PRESERVA las plantillas {{target.carrera}} exactamente como están
7. NO agregues campos con underscores o metadatos adicionales
8. Asegúrate de que toda la información esté dentro de la estructura correcta`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { 
            role: "system", 
            content: systemMessage
          },
          { 
            role: "user", 
            content: customPrompt 
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      console.log("🤖 Respuesta de IA recibida, procesando...");
      const rawAIResponse = completion.choices[0].message.content;
      
      let aiResponseObj;
      try {
        aiResponseObj = JSON.parse(rawAIResponse);
        console.log("✅ JSON parseado correctamente");
      } catch (parseError) {
        console.warn("⚠️ Error parseando respuesta de IA, usando sanitizador...");
        
        // Si falla el parseo, usar el sanitizador
        const sanitizationResult = sanitizeAIGeneratedContent(rawAIResponse, {
          preserveTemplates: true,
          maxStringLength: 25000, // Aumentado para estructuras complejas
          validateStructure: true,
          preservePropertyNames: true
        });
        
        if (!sanitizationResult.success) {
          throw new Error(`Error procesando respuesta de IA: ${sanitizationResult.error}`);
        }
        
        aiResponseObj = sanitizationResult.data;
        console.log("✅ JSON sanitizado y parseado");
      }
      
      console.log("🔍 Validando estructura específica...");
      const structureValidation = validateSpecificStructure(aiResponseObj, type);
      
      if (!structureValidation.isValid) {
        console.warn("⚠️ Estructura no válida:", structureValidation.errors);
        console.log("🔧 Intentando limpiar y adaptar estructura...");
        
        aiResponseObj = cleanAIResponseWithStructure(aiResponseObj, type);
        
        if (!aiResponseObj) {
          throw new Error("No se pudo adaptar la estructura de la respuesta");
        }
      } else {
        console.log("✅ Estructura específica válida");
      }
      
      if (!aiResponseObj.theme) {
        console.warn("⚠️ Campo theme faltante, agregando...");
        aiResponseObj.theme = `${theme} con Capibara Profesor para estudiantes de ${target?.carrera || 'universidad'}`;
      }
      
      if (!aiResponseObj[type]) {
        console.warn(`⚠️ Campo ${type} faltante, creando estructura básica...`);
        aiResponseObj[type] = {
          target: { carrera: target?.carrera || "{{target.carrera}}" },
          titulo: `Contenido ${type} sobre ${theme}`,
          hashtags: ["#CapibaraProfesor", "#Acadelia"]
        };
      }
      
      const responseText = JSON.stringify(aiResponseObj);
      const templatesFound = (responseText.match(/\{\{[^}]+\}\}/g) || []).length;
      
      if (templatesFound > 0) {
        console.log(`✅ ${templatesFound} plantillas preservadas correctamente`);
      } else {
        console.warn("⚠️ No se encontraron plantillas, puede ser que se hayan perdido");
      }
      
      console.log("🧹 Aplicando sanitización final...");
      const finalSanitization = sanitizeAIGeneratedContent(aiResponseObj, {
        preserveTemplates: true,
        maxStringLength: 25000,
        validateStructure: false, // Ya está validado
        preservePropertyNames: true
      });
      
      let finalPayload;
      if (finalSanitization.success) {
        finalPayload = finalSanitization.data;
        
        if (finalSanitization.warnings.length > 0) {
          console.warn("⚠️ Advertencias en sanitización final:", finalSanitization.warnings);
        }
      } else {
        console.warn("⚠️ Error en sanitización final, usando respuesta validada");
        finalPayload = aiResponseObj;
      }
      
      Object.keys(finalPayload).forEach(key => {
        if (key.startsWith('_') && key !== '_id') {
          console.log(`🗑️ Removiendo campo no deseado: ${key}`);
          delete finalPayload[key];
        }
      });
      
      console.log("✅ Payload final preparado:", Object.keys(finalPayload));
      console.log("📊 Estructura validada:", {
        theme: finalPayload.theme ? '✓' : '✗',
        specificType: finalPayload[type] ? '✓' : '✗',
        targetAudience: finalPayload.targetAudience ? '✓' : '✗',
        templatesPreserved: templatesFound > 0 ? '✓' : '✗'
      });
      
      if (finalPayload[type]) {
        const typeSpecific = finalPayload[type];
        console.log(`📝 Contenido ${type}:`, {
          titulo: typeSpecific.titulo || typeSpecific.name || typeSpecific.subject ? '✓' : '✗',
          target: typeSpecific.target ? '✓' : '✗',
          hashtags: typeSpecific.hashtags ? '✓' : '✗'
        });
      }
      
      const result = await this.createContent({
        type,
        channel,
        payload: finalPayload
      });
      
      if (result.success) {
        console.log("🎉 Contenido con estructura específica generado y guardado exitosamente");
      }
      
      return result;
      
    } catch (error) {
      console.error("❌ Error generando contenido con estructura específica:", error);
      
      console.log("🆘 Generando contenido de respaldo con estructura específica...");
      
      const fallbackPayload = this.createFallbackContent(type, channel, target, theme);
      
      console.log("🆘 Usando contenido de respaldo con estructura válida");
      
      return await this.createContent({
        type,
        channel,
        payload: fallbackPayload
      });
    }
  },

  createFallbackContent(type, channel, target, theme) {
    const baseStructure = {
      theme: `${theme || 'Contenido educativo'} con Capibara Profesor para estudiantes`,
      targetAudience: {
        carrera: target?.carrera || "{{target.carrera}}",
        edad: "18-25",
        intereses: ["educación", theme?.toLowerCase() || "aprendizaje"]
      }
    };
    
    switch (type) {
      case 'video':
        return {
          ...baseStructure,
          video: {
            target: { carrera: target?.carrera || "{{target.carrera}}" },
            titulo: `Aprende ${theme || 'conceptos importantes'} con Capibara Profesor`,
            duracion: "60 segundos",
            hashtags: ["#CapibaraProfesor", "#AprendeConDiversión", `#Estudiantes${target?.carrera || 'Universidad'}`],
            contenido: {
              introduccion: {
                texto: `¡Hola estudiantes de {{target.carrera}}! Soy Capibara Profesor y hoy aprenderemos sobre ${theme || 'un tema importante'}`,
                estilo: "dinámico y amigable"
              },
              desarrollo: {
                secciones: [
                  {
                    tipo: "explicacion",
                    visual: "Capibara Profesor explicando con pizarra educativa",
                    contenido: `Explicación clara y sencilla sobre ${theme || 'el concepto'}`
                  }
                ]
              },
              conclusion: {
                texto: "¡Espero que hayas aprendido algo nuevo! Sigue a Capibara Profesor para más contenido educativo",
                estilo: "motivacional y amigable",
                call_to_action: "¡Dale like y compártelo con tus compañeros!"
              }
            },
            plataforma: channel || "TikTok",
            elementos_visuales: {
              musica: "Fondo musical alegre y educativo",
              animaciones: "Gráficos animados explicativos",
              texto_en_pantalla: "Palabras clave y conceptos importantes"
            }
          }
        };
        
      case 'meme':
        return {
          ...baseStructure,
          meme: {
            target: { carrera: target?.carrera || "{{target.carrera}}" },
            titulo: `Meme educativo sobre ${theme || 'estudios'}`,
            descripcion: "Capibara Profesor en situación cómica relacionada con estudios",
            caption: `Cuando estudias ${theme || 'para el examen'} y finalmente lo entiendes`,
            subcaption: "Capibara Profesor aprueba este sentimiento",
            target_emotion: "alivio humorístico",
            educational_value: `Hace el aprendizaje de ${theme || 'conceptos'} más divertido y memorable`,
            hashtags: ["#MemesEducativos", "#CapibaraProfesor", `#Estudiantes${target?.carrera || 'Universidad'}`],
            elementos_visuales: {
              escena: "Capibara Profesor con expresión de satisfacción tras entender algo",
              texto_meme: "Esa sensación cuando por fin entiendes el tema",
              estilo_visual: "meme clásico con texto superpuesto"
            }
          }
        };
        
      case 'email':
        return {
          ...baseStructure,
          email: {
            target: { carrera: target?.carrera || "{{target.carrera}}" },
            subject: `📚 ${theme || 'Consejos de estudio'} que todo estudiante de {{target.carrera}} debe conocer`,
            preview_text: "Capibara Profesor te comparte tips importantes",
            contenido: {
              saludo: {
                texto: "¡Hola, estudiante de {{target.carrera}}!",
                tono: "amigable y profesional"
              },
              introduccion: {
                texto: `Como estudiante de {{target.carrera}}, seguro te interesa aprender sobre ${theme || 'mejorar tus estudios'}`,
                hook: "Tengo algo especial que compartir contigo"
              },
              desarrollo: {
                secciones: [
                  {
                    titulo: "Consejo principal",
                    contenido: `Información valiosa sobre ${theme || 'técnicas de estudio'}`,
                    beneficio: `Esto te ayudará específicamente en tu carrera de {{target.carrera}}`
                  }
                ]
              },
              conclusion: {
                texto: "¡Espero que estos consejos te sean útiles en tus estudios!",
                cta: "Sígueme para más tips educativos"
              },
              despedida: {
                texto: "Con cariño educativo,",
                firma: "Capibara Profesor - Tu asistente académico"
              }
            },
            hashtags: ["#NewsletterAcadelia", "#CapibaraProfesor", `#Estudiantes${target?.carrera || 'Universidad'}`],
            elementos_visuales: {
              header: "Logo de Acadelia con Capibara Profesor",
              imagenes: "Ilustraciones educativas relacionadas con el tema",
              footer: "Enlaces a redes sociales y contacto"
            }
          }
        };
        
      default:
        return {
          ...baseStructure,
          [type]: {
            target: { carrera: target?.carrera || "{{target.carrera}}" },
            titulo: `Contenido ${type} sobre ${theme || 'educación'} con Capibara Profesor`,
            contenido: `Contenido educativo generado para estudiantes de {{target.carrera}} sobre ${theme || 'aprendizaje'}`,
            cta: "¡Aprende más con Capibara Profesor!",
            hashtags: ["#CapibaraProfesor", "#Acadelia", `#Estudiantes${target?.carrera || 'Universidad'}`]
          }
        };
    }
  },
  
  // Resto de métodos sin cambios en funcionalidad, pero sin registros de notificación duplicados...
  async getContents(filters = {}) {
    try {
      let query = `SELECT id, type, channel, payload, created_at FROM marketing_contents`;
      const params = [];
      const conditions = [];
      
      if (filters.type) {
        params.push(filters.type);
        conditions.push(`type = $${params.length}`);
      }
      
      if (filters.channel) {
        params.push(filters.channel);
        conditions.push(`channel = $${params.length}`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY created_at DESC`;
      
      if (filters.limit) {
        params.push(parseInt(filters.limit));
        query += ` LIMIT $${params.length}`;
      }
      
      const result = await pool.query(query, params);
      return { success: true, contents: result.rows };
    } catch (error) {
      console.error("Error obteniendo contenidos:", error);
      return { success: false, error: error.message };
    }
  },
  
  async getContentById(contentId) {
    try {
      const result = await pool.query(
        `SELECT id, type, channel, payload, created_at 
         FROM marketing_contents 
         WHERE id = $1`,
        [contentId]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: "Contenido no encontrado" };
      }
      
      return { success: true, content: result.rows[0] };
    } catch (error) {
      console.error("Error obteniendo contenido:", error);
      return { success: false, error: error.message };
    }
  },
  
  async findSimilarContents(contentParams, limit = 5) {
    try {
      const embeddingString = JSON.stringify(contentParams);
      const embeddingVector = await embeddings.embedQuery(embeddingString);
      
      const { data, error } = await supabase.rpc('match_marketing_contents', {
        query_embedding: embeddingVector,
        match_count: limit
      });
      
      if (error) throw error;
      
      return { success: true, contents: data };
    } catch (error) {
      console.error("Error buscando contenidos similares:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteContent(contentId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Verificando existencia de contenido:', contentId);
      
      const checkResult = await client.query(
        'SELECT id, type, channel FROM marketing_contents WHERE id = $1',
        [contentId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.log('❌ Contenido no encontrado:', contentId);
        return {
          success: false,
          error: 'Contenido no encontrado'
        };
      }
      
      const content = checkResult.rows[0];
      console.log('✅ Contenido encontrado:', content.type, '-', content.channel);
      
      try {
        await client.query(
          'DELETE FROM marketing_interactions WHERE content_id = $1',
          [contentId]
        );
        console.log('🧹 Interacciones relacionadas eliminadas');
      } catch (interactionError) {
        console.warn('⚠️ Error eliminando interacciones relacionadas:', interactionError.message);
      }
      
      const deleteResult = await client.query(
        'DELETE FROM marketing_contents WHERE id = $1 RETURNING id, type, channel',
        [contentId]
      );
      
      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'No se pudo eliminar el contenido'
        };
      }
      
      await client.query('COMMIT');
      
      console.log('✅ Contenido eliminado exitosamente:', deleteResult.rows[0]);
      
      return {
        success: true,
        message: 'Contenido eliminado correctamente',
        deletedContent: deleteResult.rows[0]
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error eliminando contenido:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  },

  async deleteAllContents() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Contando contenidos antes de eliminar...');
      
      const countResult = await client.query('SELECT COUNT(*) FROM marketing_contents');
      const totalContents = parseInt(countResult.rows[0].count);
      
      console.log(`📊 Total de contenidos a eliminar: ${totalContents}`);
      
      if (totalContents === 0) {
        await client.query('ROLLBACK');
        return {
          success: true,
          message: 'No hay contenidos para eliminar',
          deletedCount: 0
        };
      }
      
      try {
        const interactionsDeleteResult = await client.query(
          'DELETE FROM marketing_interactions WHERE content_id IN (SELECT id FROM marketing_contents)'
        );
        
        console.log(`🧹 ${interactionsDeleteResult.rowCount} interacciones eliminadas`);
      } catch (interactionError) {
        console.warn('⚠️ Error eliminando interacciones relacionadas:', interactionError.message);
      }
      
      const deleteResult = await client.query('DELETE FROM marketing_contents');
      const deletedCount = deleteResult.rowCount;
      
      console.log(`🗑️ ${deletedCount} contenidos eliminados`);
      
      // Reiniciar secuencia si existe
      try {
        await client.query('ALTER SEQUENCE IF EXISTS marketing_contents_id_seq RESTART WITH 1');
        console.log('🔄 Secuencia reiniciada');
      } catch (sequenceError) {
        console.log('ℹ️ No hay secuencia para reiniciar o error reiniciando:', sequenceError.message);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Eliminación masiva completada: ${deletedCount} contenidos eliminados`);
      
      return {
        success: true,
        message: 'Todos los contenidos eliminados correctamente',
        deletedCount: deletedCount
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error eliminando todos los contenidos:', error);
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      client.release();
    }
  }
};