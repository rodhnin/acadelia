import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const publicDir = path.join(frontendDir, 'public');
const distDir = path.join(publicDir, 'dist');
const htmlBackupDir = path.join(rootDir, '.html-originals'); // Donde tu build guarda backups

console.log('🔄 REVERT COMPLETO - Restaura TODO al estado original');
console.log('=' .repeat(60));

// ✅ FUNCIÓN PRINCIPAL PARA RESTAURAR HTML DESDE BACKUPS
function restoreHtmlFromBackups() {
  console.log('\n📥 Restaurando HTML desde backups originales...');
  
  if (!fs.existsSync(htmlBackupDir)) {
    console.log('❌ No se encontró directorio de backups HTML');
    console.log('💡 ¿Ejecutaste el build que hace backups automáticos?');
    return false;
  }
  
  // Encontrar todos los backups
  const backupFiles = [
    ...glob.sync(path.join(htmlBackupDir, 'views/**/*.html')),
    ...glob.sync(path.join(htmlBackupDir, '*.html'))
  ];
  
  if (backupFiles.length === 0) {
    console.log('❌ No se encontraron archivos de backup HTML');
    return false;
  }
  
  console.log(`📂 Encontrados ${backupFiles.length} archivos de backup`);
  
  let restoredCount = 0;
  
  backupFiles.forEach(backupFile => {
    try {
      // Determinar archivo de destino
      const relativePath = path.relative(htmlBackupDir, backupFile);
      const targetFile = path.join(frontendDir, relativePath);
      
      if (fs.existsSync(targetFile)) {
        // Leer contenido del backup (formato original)
        const originalContent = fs.readFileSync(backupFile, 'utf8');
        
        // Leer contenido actual (posiblemente modificado/minificado)
        const currentContent = fs.readFileSync(targetFile, 'utf8');
        
        // Solo restaurar si son diferentes
        if (originalContent !== currentContent) {
          fs.writeFileSync(targetFile, originalContent);
          restoredCount++;
          console.log(`  ✅ Restaurado: ${path.basename(targetFile)}`);
        } else {
          console.log(`  ℹ️ Sin cambios: ${path.basename(targetFile)}`);
        }
      } else {
        console.warn(`  ⚠️ Archivo objetivo no existe: ${targetFile}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error restaurando ${path.basename(backupFile)}: ${error.message}`);
    }
  });
  
  console.log(`\n✅ HTML restaurado: ${restoredCount}/${backupFiles.length} archivos`);
  return restoredCount > 0;
}

// ✅ FUNCIÓN PARA LIMPIAR DIRECTORIO DIST
function cleanupDistDirectory() {
  console.log('\n🧹 Limpiando directorio /dist/...');
  
  if (!fs.existsSync(distDir)) {
    console.log('✅ El directorio /dist/ no existe');
    return { success: true, deletedFiles: 0 };
  }
  
  try {
    const allFiles = glob.sync(path.join(distDir, '**/*'), { nodir: true });
    const deletedCount = allFiles.length;
    
    console.log(`📁 Eliminando ${deletedCount} archivos...`);
    
    // Eliminar todo el directorio
    fs.rmSync(distDir, { recursive: true, force: true });
    
    console.log(`✅ Directorio /dist/ eliminado (${deletedCount} archivos)`);
    return { success: true, deletedFiles: deletedCount };
    
  } catch (error) {
    console.error('❌ Error limpiando /dist/:', error);
    return { success: false, deletedFiles: 0 };
  }
}

// ✅ FUNCIÓN PARA LIMPIAR ARCHIVOS DE PROTECCIÓN API
function cleanupApiFiles() {
  console.log('\n🛡️ Limpiando archivos de protección API...');
  
  const apiFiles = [
    path.join(rootDir, 'backend', 'utils', 'routeMap.json'),
    path.join(rootDir, 'backend', 'utils', 'parameterMap.json'),
    ...glob.sync(path.join(rootDir, 'backend', 'utils', '*Map*.json')),
    ...glob.sync(path.join(rootDir, 'backend', 'utils', '*Security*.txt'))
  ];
  
  let deletedCount = 0;
  
  apiFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`  ✅ Eliminado: ${path.basename(filePath)}`);
      } catch (error) {
        console.warn(`  ⚠️ Error eliminando ${path.basename(filePath)}: ${error.message}`);
      }
    }
  });
  
  if (deletedCount === 0) {
    console.log('✅ No había archivos de protección API');
  } else {
    console.log(`✅ ${deletedCount} archivos de protección API eliminados`);
  }
  
  return { success: true, deletedFiles: deletedCount };
}

// ✅ FUNCIÓN PARA VERIFICAR ESTADO FINAL
function verifyFinalState() {
  console.log('\n🔍 Verificando estado final...');
  
  const checks = {
    distExists: fs.existsSync(distDir),
    apiFilesExist: fs.existsSync(path.join(rootDir, 'backend', 'utils', 'routeMap.json')),
    htmlRefsRemaining: 0
  };
  
  // Verificar referencias a /dist/ en HTML
  const htmlFiles = [
    ...glob.sync(path.join(frontendDir, 'views/**/*.html')),
    ...glob.sync(path.join(frontendDir, '*.html'))
  ];
  
  htmlFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const distRefs = (content.match(/\/dist\//g) || []).length;
      checks.htmlRefsRemaining += distRefs;
      
      if (distRefs > 0) {
        console.log(`  ⚠️ ${path.basename(filePath)}: ${distRefs} referencias a /dist/`);
      }
    } catch (error) {
      console.warn(`⚠️ Error verificando ${filePath}: ${error.message}`);
    }
  });
  
  const isClean = !checks.distExists && !checks.apiFilesExist && checks.htmlRefsRemaining === 0;
  
  console.log(`📊 Estado final:`);
  console.log(`   📁 Directorio /dist/: ${checks.distExists ? '❌ Existe' : '✅ No existe'}`);
  console.log(`   🛡️ Archivos API: ${checks.apiFilesExist ? '❌ Existen' : '✅ No existen'}`);
  console.log(`   🔗 Referencias /dist/: ${checks.htmlRefsRemaining} ${checks.htmlRefsRemaining === 0 ? '✅' : '❌'}`);
  console.log(`   🎯 Estado general: ${isClean ? '✅ LIMPIO' : '⚠️ REQUIERE REVISIÓN'}`);
  
  return { isClean, ...checks };
}

// ✅ FUNCIÓN PRINCIPAL
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Iniciando REVERT COMPLETO...');
    
    // 1. Restaurar HTML desde backups (formato original)
    const htmlRestored = restoreHtmlFromBackups();
    
    // 2. Limpiar directorio /dist/
    const distCleaned = cleanupDistDirectory();
    
    // 3. Limpiar archivos de protección API
    const apiCleaned = cleanupApiFiles();
    
    // 4. Verificar estado final
    const verification = verifyFinalState();
    
    // 5. Resumen final
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n🎉 REVERT COMPLETO FINALIZADO');
    console.log('=' .repeat(60));
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`📄 HTML restaurado: ${htmlRestored ? '✅' : '❌'}`);
    console.log(`🧹 Dist limpiado: ${distCleaned.success ? '✅' : '❌'} (${distCleaned.deletedFiles} archivos)`);
    console.log(`🛡️ API limpiada: ${apiCleaned.success ? '✅' : '❌'} (${apiCleaned.deletedFiles} archivos)`);
    console.log(`🔍 Estado final: ${verification.isClean ? '✅ PERFECTO' : '⚠️ REVISAR'}`);
    
    if (verification.isClean) {
      console.log('\n💚 ¡ÉXITO TOTAL!');
      console.log('💚 Tu HTML está exactamente como antes del build');
      console.log('💚 Formato original restaurado (espacios, saltos de línea, comentarios)');
      console.log('💚 Todas las referencias revertidas');
      console.log('💚 Todos los archivos de build eliminados');
    } else {
      console.log('\n⚠️ COMPLETADO CON OBSERVACIONES:');
      if (verification.distExists) console.log('   - Directorio /dist/ aún presente');
      if (verification.apiFilesExist) console.log('   - Archivos de protección API aún presentes');
      if (verification.htmlRefsRemaining > 0) console.log(`   - ${verification.htmlRefsRemaining} referencias a /dist/ restantes`);
    }
    
    console.log('\n🔄 Para volver a aplicar el build: node build-esbuild.js');
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error);
    process.exit(1);
  }
}

// Ejecutar
main();