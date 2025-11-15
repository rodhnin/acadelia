import fs from 'fs';
import path from 'path';
import schedule from 'node-schedule';
import pool from '../../lib/dbPool.js';
import { imageStorageService } from './imageStorageService.js';

/**
 * Servicio para programar tareas de limpieza automática de imágenes
 * Este servicio se encarga de eliminar imágenes antiguas, huérfanas y
 * controlar el uso de espacio en disco
 */
class ImageCleanupScheduler {
  constructor() {
    // Configuración de rutas
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.chatImagesDir = path.join(this.uploadsDir, 'chat_images');
    
    // Límites y umbrales
    this.maxDiskUsageGB = 50; // 50GB máximo de espacio para imágenes
    this.maxImageAgeInDays = 90; // 90 días de vida máxima para imágenes sin acceso
    this.maxUserStorageMB = 200; // 200MB por usuario
    
    // Estado del planificador
    this.isRunning = false;
    this.jobs = [];
  }

  /**
   * Inicia el planificador de tareas
   */
  start() {
    if (this.isRunning) return;
    
    console.log('Iniciando planificador de limpieza de imágenes...');
    
    this.jobs.push(
      schedule.scheduleJob('0 2 * * 0', async () => {
        console.log('Ejecutando limpieza de imágenes antiguas...');
        await this.cleanOldImages();
      })
    );
    
    this.jobs.push(
      schedule.scheduleJob('0 3 * * 3', async () => {
        console.log('Ejecutando limpieza de imágenes huérfanas...');
        await this.cleanOrphanedImages();
      })
    );
    
    this.jobs.push(
      schedule.scheduleJob('0 4 * * *', async () => {
        console.log('Verificando límites de espacio en disco...');
        await this.enforceStorageLimits();
      })
    );
    
    this.jobs.push(
      schedule.scheduleJob('0 5 * * 1', async () => {
        console.log('Verificando límites de almacenamiento por usuario...');
        await this.enforceUserQuotas();
      })
    );
    
    this.isRunning = true;
    console.log('Planificador de limpieza de imágenes iniciado');
  }

  /**
   * Detiene el planificador de tareas
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('Deteniendo planificador de limpieza de imágenes...');
    
    this.jobs.forEach(job => {
      job.cancel();
    });
    
    this.jobs = [];
    this.isRunning = false;
    
    console.log('Planificador de limpieza de imágenes detenido');
  }

  /**
   * Limpia imágenes antiguas que no han sido accedidas en mucho tiempo
   */
  async cleanOldImages() {
    const stats = {
      processed: 0,
      deleted: 0,
      errors: 0,
      spaceFreed: 0
    };
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxImageAgeInDays);
      
      const result = await pool.query(`
        SELECT ch.id, ch.id_chat, ch.message, ch.timestamp
        FROM chat_history ch
        WHERE ch.is_multimodal = true
          AND ch.timestamp < $1
        ORDER BY ch.timestamp ASC
        LIMIT 1000
      `, [cutoffDate]);
      
      console.log(`Se encontraron ${result.rowCount} mensajes antiguos con imágenes para evaluar`);
      
      for (const row of result.rows) {
        try {
          stats.processed++;
          const message = JSON.parse(row.message);
          
          if (message.images && Array.isArray(message.images)) {
            const imagesToRemove = [];
            
            for (const img of message.images) {
              if (img.path) {
                const imagePath = path.join(process.cwd(), img.path.replace(/^\//, ''));
                
                if (fs.existsSync(imagePath)) {
                  const stats = fs.statSync(imagePath);
                  const lastAccessTime = new Date(stats.atime);
                  
                  // Si la imagen no ha sido accedida en mucho tiempo, marcarla para eliminar
                  if (lastAccessTime < cutoffDate) {
                    imagesToRemove.push({
                      path: img.path,
                      fullPath: imagePath,
                      size: stats.size
                    });
                  }
                }
              }
            }
            
            // Si hay imágenes para eliminar, actualizar mensaje y eliminar archivos
            if (imagesToRemove.length > 0) {
              const remainingImages = message.images.filter(img => 
                !imagesToRemove.some(remove => remove.path === img.path)
              );
              
              const updatedMessage = {
                ...message,
                images: remainingImages,
                imageCount: remainingImages.length,
                hasImage: remainingImages.length > 0,
                note: message.note 
                  ? `${message.note}. Algunas imágenes fueron eliminadas automáticamente por antigüedad.`
                  : "Algunas imágenes fueron eliminadas automáticamente por antigüedad."
              };
              
              await pool.query(`
                UPDATE chat_history
                SET message = $1
                WHERE id = $2
              `, [JSON.stringify(updatedMessage), row.id]);
              
              for (const img of imagesToRemove) {
                try {
                  if (fs.existsSync(img.fullPath)) {
                    fs.unlinkSync(img.fullPath);
                    stats.deleted++;
                    stats.spaceFreed += img.size;
                  }
                } catch (error) {
                  console.error(`Error al eliminar imagen antigua ${img.fullPath}:`, error);
                  stats.errors++;
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error al procesar mensaje ${row.id}:`, error);
          stats.errors++;
        }
      }
      
      console.log(`Limpieza de imágenes antiguas completada: ${stats.deleted} imágenes eliminadas, ${(stats.spaceFreed / (1024 * 1024)).toFixed(2)}MB liberados`);
      return stats;
    } catch (error) {
      console.error('Error en cleanOldImages:', error);
      return { ...stats, error: error.message };
    }
  }

  /**
   * Limpia imágenes huérfanas (sin referencia en la base de datos)
   */
  async cleanOrphanedImages() {
    const stats = {
      chatsScanned: 0,
      orphanedFilesDeleted: 0,
      orphanedDirsDeleted: 0,
      errors: 0,
      spaceFreed: 0
    };
    
    try {
      const chatsResult = await pool.query(`
        SELECT id_chat FROM chat WHERE is_deleted = false
      `);
      
      const activeChatIds = new Set(chatsResult.rows.map(row => row.id_chat));
      
      if (fs.existsSync(this.chatImagesDir)) {
        const chatDirs = fs.readdirSync(this.chatImagesDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const chatId of chatDirs) {
          stats.chatsScanned++;
          const chatDir = path.join(this.chatImagesDir, chatId);
          
          // Si el chat no está activo, eliminar todo el directorio
          if (!activeChatIds.has(chatId)) {
            try {
              const dirSize = this.getDirSize(chatDir);
              imageStorageService.deleteFolderRecursive(chatDir);
              stats.orphanedDirsDeleted++;
              stats.spaceFreed += dirSize;
            } catch (error) {
              console.error(`Error al eliminar directorio huérfano ${chatDir}:`, error);
              stats.errors++;
            }
            continue;
          }
          
          await this.cleanOrphanedImagesInChat(chatId, stats);
        }
      }
      
      console.log(`Limpieza de imágenes huérfanas completada: ${stats.orphanedDirsDeleted} directorios y ${stats.orphanedFilesDeleted} archivos eliminados, ${(stats.spaceFreed / (1024 * 1024)).toFixed(2)}MB liberados`);
      return stats;
    } catch (error) {
      console.error('Error en cleanOrphanedImages:', error);
      return { ...stats, error: error.message };
    }
  }

  /**
   * Limpia imágenes huérfanas dentro de un chat específico
   * @param {string} chatId - ID del chat
   * @param {Object} stats - Objeto de estadísticas a actualizar
   */
  async cleanOrphanedImagesInChat(chatId, stats) {
    try {
      const result = await pool.query(`
        SELECT message FROM chat_history
        WHERE id_chat = $1 AND is_multimodal = true
      `, [chatId]);
      
      const referencedPaths = new Set();
      
      for (const row of result.rows) {
        try {
          const message = JSON.parse(row.message);
          
          if (message.images && Array.isArray(message.images)) {
            for (const img of message.images) {
              if (img.path) {
                const normalizedPath = img.path.replace(/^\//, '');
                referencedPaths.add(normalizedPath.toLowerCase());
                // También añadir variantes sin /uploads/ al principio
                if (normalizedPath.startsWith('uploads/')) {
                  referencedPaths.add(normalizedPath.replace(/^uploads\//, '').toLowerCase());
                } else {
                  referencedPaths.add(`uploads/${normalizedPath}`.toLowerCase());
                }
                referencedPaths.add(path.basename(normalizedPath).toLowerCase());
              }
            }
          }
        } catch (error) {
          console.error(`Error al procesar mensaje en chat ${chatId}:`, error);
        }
      }
      
      const chatDir = path.join(this.chatImagesDir, chatId);
      
      if (fs.existsSync(chatDir)) {
        const files = fs.readdirSync(chatDir)
          .filter(file => fs.statSync(path.join(chatDir, file)).isFile())
          .map(file => ({ 
            name: file, 
            path: path.join(chatDir, file) 
          }));
        
        for (const file of files) {
          const isReferenced = 
            referencedPaths.has(file.name.toLowerCase()) || 
            referencedPaths.has(`uploads/chat_images/${chatId}/${file.name}`.toLowerCase()) ||
            referencedPaths.has(`chat_images/${chatId}/${file.name}`.toLowerCase());
          
          if (!isReferenced) {
            try {
              const fileSize = fs.statSync(file.path).size;
              fs.unlinkSync(file.path);
              stats.orphanedFilesDeleted++;
              stats.spaceFreed += fileSize;
            } catch (error) {
              console.error(`Error al eliminar archivo huérfano ${file.path}:`, error);
              stats.errors++;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error en cleanOrphanedImagesInChat para ${chatId}:`, error);
      stats.errors++;
    }
  }

  /**
   * Verifica y hace cumplir los límites globales de almacenamiento
   */
  async enforceStorageLimits() {
    const stats = {
      currentUsageGB: 0,
      imagesDeleted: 0,
      spaceFreed: 0
    };
    
    try {
      stats.currentUsageGB = this.getDirSize(this.chatImagesDir) / (1024 * 1024 * 1024);
      
      console.log(`Uso actual de almacenamiento: ${stats.currentUsageGB.toFixed(2)}GB de ${this.maxDiskUsageGB}GB`);
      
      // Si no excede el límite, no hacer nada
      if (stats.currentUsageGB <= this.maxDiskUsageGB) {
        return stats;
      }
      
      const excessGB = stats.currentUsageGB - this.maxDiskUsageGB;
      const excessBytes = excessGB * 1024 * 1024 * 1024;
      
      console.log(`Se necesita liberar ${excessGB.toFixed(2)}GB de espacio`);
      
      const result = await pool.query(`
        SELECT ch.id, ch.id_chat, ch.message, ch.timestamp
        FROM chat_history ch
        WHERE ch.is_multimodal = true
        ORDER BY ch.timestamp ASC
        LIMIT 5000
      `);
      
      let freedSpace = 0;
      
      for (const row of result.rows) {
        if (freedSpace >= excessBytes) break;
        
        try {
          const message = JSON.parse(row.message);
          
          if (message.images && Array.isArray(message.images) && message.images.length > 0) {
            const updatedMessage = {
              ...message,
              images: [],
              imageCount: 0,
              hasImage: false,
              note: "Imágenes eliminadas automáticamente debido a restricciones de almacenamiento global"
            };
            
            for (const img of message.images) {
              if (img.path) {
                const imagePath = path.join(process.cwd(), img.path.replace(/^\//, ''));
                
                if (fs.existsSync(imagePath)) {
                  const fileSize = fs.statSync(imagePath).size;
                  fs.unlinkSync(imagePath);
                  
                  stats.imagesDeleted++;
                  stats.spaceFreed += fileSize;
                  freedSpace += fileSize;
                }
              }
            }
            
            await pool.query(`
              UPDATE chat_history
              SET message = $1
              WHERE id = $2
            `, [JSON.stringify(updatedMessage), row.id]);
          }
        } catch (error) {
          console.error(`Error al procesar mensaje ${row.id}:`, error);
        }
        
        if (freedSpace >= excessBytes) break;
      }
      
      console.log(`Limpieza por límite de almacenamiento completada: ${stats.imagesDeleted} imágenes eliminadas, ${(stats.spaceFreed / (1024 * 1024)).toFixed(2)}MB liberados`);
      return stats;
    } catch (error) {
      console.error('Error en enforceStorageLimits:', error);
      return { ...stats, error: error.message };
    }
  }

  /**
   * Verifica y hace cumplir las cuotas de almacenamiento por usuario
   */
  async enforceUserQuotas() {
    const stats = {
      usersChecked: 0,
      usersOverQuota: 0,
      imagesDeleted: 0,
      spaceFreed: 0
    };
    
    try {
      const usageResult = await pool.query(`
        SELECT ch.id_user, u.correo, COUNT(ch.id) as message_count
        FROM chat_history ch
        JOIN usuario u ON ch.id_user = u.id_user
        WHERE ch.is_multimodal = true AND ch.message LIKE '%"images":%'
        GROUP BY ch.id_user, u.correo
        ORDER BY message_count DESC
      `);
      
      for (const user of usageResult.rows) {
        stats.usersChecked++;
        
        const userStorage = await this.calculateUserImageStorage(user.id_user);
        
        if (userStorage.usageMB > this.maxUserStorageMB) {
          stats.usersOverQuota++;
          
          console.log(`Usuario ${user.correo} (ID: ${user.id_user}) excede cuota: ${userStorage.usageMB.toFixed(2)}MB > ${this.maxUserStorageMB}MB`);
          
          const cleanupResult = await this.cleanupUserOldestImages(user.id_user, userStorage.usageMB - this.maxUserStorageMB);
          
          stats.imagesDeleted += cleanupResult.imagesDeleted;
          stats.spaceFreed += cleanupResult.spaceFreed;
        }
      }
      
      console.log(`Verificación de cuotas de usuario completada: ${stats.usersOverQuota} usuarios sobre cuota, ${stats.imagesDeleted} imágenes eliminadas`);
      return stats;
    } catch (error) {
      console.error('Error en enforceUserQuotas:', error);
      return { ...stats, error: error.message };
    }
  }

  /**
   * Calcula el uso de almacenamiento de imágenes para un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} - Estadísticas de uso
   */
  async calculateUserImageStorage(userId) {
    const stats = {
      chats: 0,
      files: 0,
      usageMB: 0
    };
    
    try {
      const chatsResult = await pool.query(`
        SELECT id_chat FROM chat
        WHERE id_user = $1 AND is_deleted = false
      `, [userId]);
      
      stats.chats = chatsResult.rowCount;
      
      for (const row of chatsResult.rows) {
        const chatDir = path.join(this.chatImagesDir, row.id_chat);
        
        if (fs.existsSync(chatDir)) {
          const files = fs.readdirSync(chatDir)
            .filter(file => fs.statSync(path.join(chatDir, file)).isFile());
          
          for (const file of files) {
            const filePath = path.join(chatDir, file);
            const fileSize = fs.statSync(filePath).size;
            
            stats.files++;
            stats.usageMB += fileSize / (1024 * 1024);
          }
        }
      }
      
      return stats;
    } catch (error) {
      console.error(`Error al calcular almacenamiento para usuario ${userId}:`, error);
      return { chats: 0, files: 0, usageMB: 0 };
    }
  }

  /**
   * Limpia las imágenes más antiguas de un usuario que excede su cuota
   * @param {number} userId - ID del usuario
   * @param {number} excessMB - Exceso en MB
   * @returns {Promise<Object>} - Estadísticas de limpieza
   */
  async cleanupUserOldestImages(userId, excessMB) {
    const stats = {
      messagesProcessed: 0,
      imagesDeleted: 0,
      spaceFreed: 0
    };
    
    try {
      const excessBytes = excessMB * 1024 * 1024;
      let freedSpace = 0;
      
      const result = await pool.query(`
        SELECT ch.id, ch.id_chat, ch.message, ch.timestamp
        FROM chat_history ch
        WHERE ch.id_user = $1 AND ch.is_multimodal = true AND ch.message LIKE '%"images":%'
        ORDER BY ch.timestamp ASC
        LIMIT 1000
      `, [userId]);
      
      for (const row of result.rows) {
        if (freedSpace >= excessBytes) break;
        
        stats.messagesProcessed++;
        
        try {
          const message = JSON.parse(row.message);
          
          if (message.images && Array.isArray(message.images) && message.images.length > 0) {
            const updatedMessage = {
              ...message,
              images: [],
              imageCount: 0,
              hasImage: false,
              note: "Imágenes eliminadas automáticamente debido a exceso de cuota de almacenamiento"
            };
            
            for (const img of message.images) {
              if (img.path) {
                const imagePath = path.join(process.cwd(), img.path.replace(/^\//, ''));
                
                if (fs.existsSync(imagePath)) {
                  const fileSize = fs.statSync(imagePath).size;
                  fs.unlinkSync(imagePath);
                  
                  stats.imagesDeleted++;
                  stats.spaceFreed += fileSize;
                  freedSpace += fileSize;
                }
              }
            }
            
            await pool.query(`
              UPDATE chat_history
              SET message = $1
              WHERE id = $2
            `, [JSON.stringify(updatedMessage), row.id]);
          }
        } catch (error) {
          console.error(`Error al procesar mensaje ${row.id}:`, error);
        }
        
        if (freedSpace >= excessBytes) break;
      }
      
      return stats;
    } catch (error) {
      console.error(`Error en cleanupUserOldestImages para usuario ${userId}:`, error);
      return { ...stats, error: error.message };
    }
  }

  /**
   * Calcula el tamaño total de un directorio
   * @param {string} dir - Directorio a calcular
   * @returns {number} - Tamaño en bytes
   */
  getDirSize(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    let size = 0;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of files) {
      const itemPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        size += this.getDirSize(itemPath);
      } else if (item.isFile()) {
        try {
          const stats = fs.statSync(itemPath);
          size += stats.size;
        } catch (error) {
          console.error(`Error al obtener tamaño de archivo ${itemPath}:`, error);
        }
      }
    }
    
    return size;
  }
}

export const imageCleanupScheduler = new ImageCleanupScheduler();

if (process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    imageCleanupScheduler.start();
  }, 10000); // Retardo de 10 segundos para permitir que la aplicación se inicie completamente
}