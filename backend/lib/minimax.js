// Importa dotenv para cargar variables de entorno desde el archivo .env
import dotenv from 'dotenv';
import { ChatMinimax } from "@langchain/community/chat_models/minimax"; 
import { MinimaxEmbeddings } from "@langchain/community/embeddings/minimax";

// Carga las variables de entorno desde el archivo .env
dotenv.config();

// Obtén las claves desde las variables de entorno
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;

// Verifica si las variables de entorno están configuradas correctamente
if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) {
  console.error("Error: MINIMAX_API_KEY y MINIMAX_GROUP_ID deben estar definidos en el archivo .env");
  process.exit(1);
}

// Configura y exporta una instancia del modelo de lenguaje (LLM) basado en MiniMax
export const llm = new ChatMinimax({
  minimaxApiKey: MINIMAX_API_KEY, // Clave de API necesaria para la autenticación
  minimaxGroupId: MINIMAX_GROUP_ID, // ID del grupo para autenticar las solicitudes de MiniMax
  model: "abab6.5-chat", // Especifica el modelo de MiniMax que deseas usar
  temperature: 0.7, // Controla la aleatoriedad de las respuestas (0.7 es moderado)
});

// Configura y exporta una instancia para la generación de embeddings utilizando MiniMax
export const embeddings = new MinimaxEmbeddings({
  minimaxApiKey: MINIMAX_API_KEY, // Clave de API necesaria para la autenticación
});
