// cleanup-sessions.js
import { redisService } from '../backend/lib/redis.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanupCorruptedSessions() {
    try {
        console.log('🧹 Iniciando limpieza de versiones corruptas...');
        
        let cleanedCount = 0;
        let checkedCount = 0;
        const pattern = 'session_version:*';
        
        // Esperar a que Redis se conecte
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (redisService.client && redisService.client.keys) {
            const keys = await redisService.client.keys(pattern);
            console.log(`📋 Encontradas ${keys.length} versiones de sesión para revisar`);
            
            for (const key of keys) {
                const value = await redisService.client.get(key);
                const parsed = parseInt(value);
                checkedCount++;
                
                console.log(`🔍 Revisando: ${key} = "${value}" -> ${parsed}`);
                
                if (isNaN(parsed) || parsed < 1) {
                    console.log(`🗑️ Limpiando versión corrupta: ${key}`);
                    await redisService.client.del(key);
                    cleanedCount++;
                } else {
                    console.log(`✅ Versión válida: ${key} = ${parsed}`);
                }
            }
        }
        
        console.log(`✅ Limpieza completada: ${cleanedCount}/${checkedCount} versiones limpiadas`);
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error en limpieza:', error);
        process.exit(1);
    }
}

cleanupCorruptedSessions();