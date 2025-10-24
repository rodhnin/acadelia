import express from 'express';
import {
    createChat, 
    getChats, 
    getChatMessages, 
    deleteChat,
    editChatTitle,
    updateChatMessage,     // Nueva función para actualizar un mensaje
    replaceInteraction,
    cancelChatMessage,
    cancelPendingRequest, // Nueva función para actualizar interacción
    saveMarkdownImage      
} from '../../controllers/chat/chatController.js';
import errorHandler from '../../middlewares/errorHandler.js'; // Añadir esta línea
import { authenticateUser } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Esto protege el acceso a chats y datos de usuarios

// Verificar límites y obtener estadísticas
router.post('/chats', authenticateUser, createChat); // Ruta para crear un chat

// Obtener mensajes de un chat específico (ESTO DEBE IR PRIMERO)
router.get('/chats/:chatId/messages', authenticateUser, getChatMessages);

// Agregar esta ruta ANTES de la ruta existente de AVAs
// Obtener todos los chats de un usuario filtrados por herramientaId
router.get('/chats/:userId/tool/:herramientaId', authenticateUser, getChats);

// Mantener la ruta original para AVAs
router.get('/chats/:userId/:avaId', authenticateUser, getChats);

// Eliminar un chat y su historial
router.delete('/chats/:chatId', authenticateUser, deleteChat);

router.put('/chats/:chatId/cancel', authenticateUser, cancelChatMessage);

// Editar el título de un chat
router.put('/chats/:chatId/title', authenticateUser, editChatTitle);

// NUEVAS RUTAS PARA ACTUALIZACIÓN DE MENSAJES
// Actualizar un mensaje individual
router.put('/:chatId/messages', authenticateUser, updateChatMessage);

// Actualizar una interacción completa (usuario + respuesta IA)
router.put('/:chatId/interaction', authenticateUser, replaceInteraction);

router.post('/chats/:chatId/cancel-request', authenticateUser, cancelPendingRequest);

router.post('/save-markdown-image', authenticateUser, saveMarkdownImage);

router.use(errorHandler);

export default router;

