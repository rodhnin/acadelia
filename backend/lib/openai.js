// backend/lib/openai.js - Solución Simple
// Cargar dotenv al inicio (igual que en dbPool.js)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar dotenv desde la raíz del proyecto (2 niveles arriba: backend/lib -> raíz)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Importa las clases ChatOpenAI y OpenAIEmbeddings desde la biblioteca @langchain/openai
import { ChatOpenAI } from '@langchain/openai'; 
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';

// Clave de API de OpenAI utilizada para autenticar solicitudes hacia los modelos de OpenAI
// Esta clave permite acceder a los servicios de OpenAI como GPT y generación de embeddings
const openaiKey = process.env.OPENAI_API_KEY;

// Verificar que la API key esté configurada
if (!openaiKey) {
  console.error("Error: OPENAI_API_KEY debe estar definida en el archivo .env");
  process.exit(1);
}

// Configura y exporta una instancia del modelo de lenguaje (LLM) basado en GPT
export const llm = new ChatOpenAI({
    openAIApiKey: openaiKey, // Clave de API necesaria para la autenticación
    modelName: 'gpt-4o-mini-2024-07-18', // Especifica el modelo GPT-3.5-turbo para usar
    temperature: 0.7, // Controla la aleatoriedad de las respuestas (0.7 es moderado)
});

// Configura y exporta una instancia para la generación de embeddings utilizando OpenAI
export const embeddings = new OpenAIEmbeddings({
    openAIApiKey: openaiKey, // Clave de API necesaria para la autenticación
});

// Instancia para modelos con capacidades de visión
export const visionModel = new ChatOpenAI({
    openAIApiKey: openaiKey,
    modelName: 'gpt-4o-mini-2024-07-18', // Modelo con capacidades de visión
    temperature: 0.7,
});

// Cliente de OpenAI para llamadas directas a la API
export const openai = new OpenAI({
    apiKey: openaiKey,
});

export default {
    llm,
    embeddings,
    visionModel,
    openai
};