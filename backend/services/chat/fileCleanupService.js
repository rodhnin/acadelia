import fs from 'fs';
import path from 'path';
import schedule from 'node-schedule';
import pool from '../../lib/dbPool.js';

class FileCleanupService {
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.chatImagesDir = path.join(this.uploadsDir, 'chat_images');
    this.chatDocumentsDir = path.join(this.uploadsDir, 'chat_documents');
    this.maxAgeInDays = 60; // Días máximos para mantener archivos de chats inactivos
    this.initialized = false;
  }

  startScheduledCleanup() {
    // Evitar inicialización duplicada
    if (this.initialized) {
      console.log('🧹 FileCleanupService ya está inicializado');
      return;
    }
    
    this.scheduledJob = schedule.scheduleJob('0 3 * * 0', async () => {
      console.log('🧹 Iniciando limpieza automática programada de archivos (imágenes y documentos)...');
      
      try {
        const orphanedImagesResult = await this.cleanupOrphanedImages();
        const oldImagesResult = await this.cleanupOldImages();
        
        const orphanedDocsResult = await this.cleanupOrphanedDocuments();
        const oldDocsResult = await this.cleanupOldDocuments();
        const dbOrphanedDocsResult = await this.cleanupOrphanedDocumentsFromDB();
        
        console.log('🎉 Limpieza automática de archivos completada', {
          images: {
            orphanedDirectories: orphanedImagesResult.deletedCount,
            oldImages: oldImagesResult.deletedCount
          },
          documents: {
            orphanedDirectories: orphanedDocsResult.deletedCount,
            oldDocuments: oldDocsResult.deletedCount,
            orphanedDBRecords: dbOrphanedDocsResult.deletedCount
          },
          totalErrors: [
            ...(orphanedImagesResult.errors || []), 
            ...(oldImagesResult.errors || []),
            ...(orphanedDocsResult.errors || []),
            ...(oldDocsResult.errors || []),
            ...(dbOrphanedDocsResult.errors || [])
          ].length
        });
      } catch (error) {
        console.error('❌ Error en la limpieza automática programada de archivos:', error);
      }
    });
    
    this.initialized = true;
    console.log('✅ Servicio de limpieza automática de archivos programado (domingos 3:00 AM) - Imágenes y Documentos');
  }


  async cleanupOrphanedImages() {
    let result = {
      success: false,
      deletedCount: 0,
      errors: []
    };
    
    try {
      const chatsResult = await pool.query(`
        SELECT id_chat FROM chat WHERE is_deleted = false
      `);
      
      const activeChatIds = new Set(chatsResult.rows.map(row => row.id_chat));
      console.log(`🖼️ Encontrados ${activeChatIds.size} chats activos para verificar imágenes`);
      
      if (fs.existsSync(this.chatImagesDir)) {
        const dirs = fs.readdirSync(this.chatImagesDir);
        console.log(`🖼️ Encontrados ${dirs.length} directorios de imágenes para revisar`);
        
        for (const dir of dirs) {
          const chatDir = path.join(this.chatImagesDir, dir);
          
          // Si el directorio corresponde a un chat eliminado, removerlo
          if (!activeChatIds.has(dir) && fs.statSync(chatDir).isDirectory()) {
            try {
              this.deleteFolderRecursive(chatDir);
              result.deletedCount++;
              console.log(`🗑️ Eliminado directorio de imágenes huérfano para chat ${dir}`);
            } catch (err) {
              result.errors.push({
                chatId: dir, 
                operation: 'deleteOrphanedImageDir',
                error: err.message
              });
              console.error(`❌ Error al eliminar directorio de imágenes para chat ${dir}:`, err);
            }
          }
        }
      }
      
      result.success = true;
      return result;
    } catch (error) {
      console.error('❌ Error en cleanupOrphanedImages:', error);
      result.errors.push({
        operation: 'cleanupOrphanedImages',
        error: error.message
      });
      return result;
    }
  }

  async cleanupOldImages() {
    let result = {
      success: false,
      deletedCount: 0,
      errors: []
    };
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxAgeInDays);
      console.log(`🖼️ Limpiando imágenes anteriores a ${cutoffDate.toISOString()}`);
      
      const chatsResult = await pool.query(`
        SELECT id_chat, last_message_date 
        FROM chat 
        WHERE is_deleted = false
      `);
      
      if (fs.existsSync(this.chatImagesDir)) {
        const dirs = fs.readdirSync(this.chatImagesDir);
        
        for (const dir of dirs) {
          const chatDir = path.join(this.chatImagesDir, dir);
          
          // Ignorar si no es directorio
          if (!fs.statSync(chatDir).isDirectory()) continue;
          
          const chatInfo = chatsResult.rows.find(row => row.id_chat === dir);
          
          // Si el chat existe y está activo pero no se ha usado en mucho tiempo
          if (chatInfo && new Date(chatInfo.last_message_date) < cutoffDate) {
            try {
              this.deleteFolderRecursive(chatDir);
              result.deletedCount++;
              console.log(`🗑️ Eliminadas imágenes antiguas para chat inactivo ${dir} (última actividad: ${chatInfo.last_message_date})`);
            } catch (err) {
              result.errors.push({
                chatId: dir,
                operation: 'deleteOldImages',
                error: err.message
              });
              console.error(`❌ Error al eliminar imágenes antiguas para chat ${dir}:`, err);
            }
          }
        }
      }
      
      result.success = true;
      return result;
    } catch (error) {
      console.error('❌ Error en cleanupOldImages:', error);
      result.errors.push({
        operation: 'cleanupOldImages',
        error: error.message
      });
      return result;
    }
  }


  async cleanupOrphanedDocuments() {
    let result = {
      success: false,
      deletedCount: 0,
      errors: []
    };
    
    try {
      const chatsResult = await pool.query(`
        SELECT id_chat FROM chat WHERE is_deleted = false
      `);
      
      const activeChatIds = new Set(chatsResult.rows.map(row => row.id_chat));
      console.log(`📄 Encontrados ${activeChatIds.size} chats activos para verificar documentos`);
      
      if (fs.existsSync(this.chatDocumentsDir)) {
        const dirs = fs.readdirSync(this.chatDocumentsDir);
        console.log(`📄 Encontrados ${dirs.length} directorios de documentos para revisar`);
        
        for (const dir of dirs) {
          const chatDir = path.join(this.chatDocumentsDir, dir);
          
          // Si el directorio corresponde a un chat eliminado, removerlo
          if (!activeChatIds.has(dir) && fs.statSync(chatDir).isDirectory()) {
            try {
              this.deleteFolderRecursive(chatDir);
              result.deletedCount++;
              console.log(`🗑️ Eliminado directorio de documentos huérfano para chat ${dir}`);
            } catch (err) {
              result.errors.push({
                chatId: dir, 
                operation: 'deleteOrphanedDocumentDir',
                error: err.message
              });
              console.error(`❌ Error al eliminar directorio de documentos para chat ${dir}:`, err);
            }
          }
        }
      }
      
      result.success = true;
      return result;
    } catch (error) {
      console.error('❌ Error en cleanupOrphanedDocuments:', error);
      result.errors.push({
        operation: 'cleanupOrphanedDocuments',
        error: error.message
      });
      return result;
    }
  }

  async cleanupOldDocuments() {
    let result = {
      success: false,
      deletedCount: 0,
      errors: []
    };
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxAgeInDays);
      console.log(`📄 Limpiando documentos anteriores a ${cutoffDate.toISOString()}`);
      
      const chatsResult = await pool.query(`
        SELECT id_chat, last_message_date 
        FROM chat 
        WHERE is_deleted = false
      `);
      
      if (fs.existsSync(this.chatDocumentsDir)) {
        const dirs = fs.readdirSync(this.chatDocumentsDir);
        
        for (const dir of dirs) {
          const chatDir = path.join(this.chatDocumentsDir, dir);
          
          // Ignorar si no es directorio
          if (!fs.statSync(chatDir).isDirectory()) continue;
          
          const chatInfo = chatsResult.rows.find(row => row.id_chat === dir);
          
          // Si el chat existe y está activo pero no se ha usado en mucho tiempo
          if (chatInfo && new Date(chatInfo.last_message_date) < cutoffDate) {
            try {
              this.deleteFolderRecursive(chatDir);
              result.deletedCount++;
              console.log(`🗑️ Eliminados documentos antiguos para chat inactivo ${dir} (última actividad: ${chatInfo.last_message_date})`);
            } catch (err) {
              result.errors.push({
                chatId: dir,
                operation: 'deleteOldDocuments',
                error: err.message
              });
              console.error(`❌ Error al eliminar documentos antiguos para chat ${dir}:`, err);
            }
          }
        }
      }
      
      result.success = true;
      return result;
    } catch (error) {
      console.error('❌ Error en cleanupOldDocuments:', error);
      result.errors.push({
        operation: 'cleanupOldDocuments',
        error: error.message
      });
      return result;
    }
  }

  async cleanupOrphanedDocumentsFromDB() {
    let result = {
      success: false,
      deletedCount: 0,
      errors: []
    };
    
    try {
      console.log(`📄 Limpiando registros huérfanos de documentos en base de datos...`);
      
      const deleteQuery = `
        DELETE FROM file_attachments 
        WHERE chat_id NOT IN (
          SELECT id_chat FROM chat WHERE is_deleted = false
        )
      `;
      
      const deleteResult = await pool.query(deleteQuery);
      result.deletedCount = deleteResult.rowCount || 0;
      
      console.log(`🗑️ Eliminados ${result.deletedCount} registros huérfanos de documentos de la BD`);
      
      // También limpiar registros donde el archivo físico ya no existe
      const orphanedFilesQuery = `
        SELECT file_id, file_path FROM file_attachments
      `;
      
      const orphanedResult = await pool.query(orphanedFilesQuery);
      let physicalOrphansDeleted = 0;
      
      for (const row of orphanedResult.rows) {
        const fullPath = path.join(process.cwd(), row.file_path.replace(/^\//, ''));
        
        if (!fs.existsSync(fullPath)) {
          try {
            await pool.query('DELETE FROM file_attachments WHERE file_id = $1', [row.file_id]);
            physicalOrphansDeleted++;
            console.log(`🗑️ Eliminado registro BD para archivo físico faltante: ${row.file_path}`);
          } catch (err) {
            result.errors.push({
              fileId: row.file_id,
              filePath: row.file_path,
              operation: 'deletePhysicalOrphan',
              error: err.message
            });
          }
        }
      }
      
      result.deletedCount += physicalOrphansDeleted;
      console.log(`🗑️ Eliminados ${physicalOrphansDeleted} registros BD de archivos físicos faltantes`);
      
      result.success = true;
      return result;
    } catch (error) {
      console.error('❌ Error en cleanupOrphanedDocumentsFromDB:', error);
      result.errors.push({
        operation: 'cleanupOrphanedDocumentsFromDB',
        error: error.message
      });
      return result;
    }
  }


  deleteFolderRecursive(dir) {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const curPath = path.join(dir, file);
        
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      
      fs.rmdirSync(dir);
    }
  }
}

export const fileCleanupService = new FileCleanupService();

// NO iniciar automáticamente aquí - la inicialización debe hacerse solo en server.js
console.log('🎉 FileCleanupService automático (Imágenes + Documentos) cargado y listo');