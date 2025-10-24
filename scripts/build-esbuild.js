import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import crypto from 'crypto';
import UglifyJS from 'uglify-js';
import CleanCSS from 'clean-css';
import { minify as minifyHTML } from 'html-minifier-terser';

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const publicDir = path.join(frontendDir, 'public');
const viewsDir = path.join(frontendDir, 'views');
const distDir = path.join(publicDir, 'dist');
const distJsDir = path.join(distDir, 'js');
const distCssDir = path.join(distDir, 'css');
const htmlBackupDir = path.join(rootDir, '.html-originals');

// ✅ CONFIGURACIÓN MEJORADA PARA MÓDULOS + LOGGING + ARCHIVOS PROTEGIDOS
const CONFIG = {
  // Core settings
  minify_js: true,
  minify_css: true,
  minify_html: true,
  
  // Security configuración
  mangle_variables: true,
  remove_console: false, // Cambiar a true para remover logs
  remove_comments: true,
  generate_source_maps: false,
  
  // Técnicas de ofuscación
  string_obfuscation: true,
  anti_debug_basic: true,
  api_route_protection: true,
  
  // 🆕 NUEVA CONFIGURACIÓN PARA MÓDULOS
  modular_obfuscation: true,
  preserve_module_structure: false, // false = aplanar todo en /dist/js/
  deep_import_analysis: true,
  rename_module_files: true,
  
  // 🆕 Configuración específica para console logs
  remove_debug_logs: true, // Eliminar console específicos de debug
  obfuscate_log_messages: true, // Ofuscar mensajes de log
  
  // 🆕 NUEVO: Configuración de logging del build
  verbose_import_logging: false, // true = mostrar todos los imports, false = solo importantes
  show_dynamic_import_warnings: false, // true = mostrar warnings de imports dinámicos no encontrados
  show_search_successes: true, // true = mostrar cuándo la búsqueda inteligente funciona
  
  // 🆕 NUEVO: Configuración de archivos protegidos y assets
  copy_static_assets: true, // Copiar fonts, sounds, images automáticamente
  protect_critical_files: true, // Proteger archivos críticos de la ofuscación
  update_css_asset_paths: true, // Actualizar rutas en CSS para assets
  
  // 🆕 NUEVO: Lista de archivos que NO deben ofuscarse
  protected_files: [
    'csrf-utils.js',
    'cookie-helpers.js', 
    'console-protection.js',
    'csrf-token.js',
    // Agregar más archivos críticos aquí
  ],
  
  // 🆕 NUEVO: Directorios de assets a copiar
  static_assets: {
    fonts: 'css/fonts',
    sounds: 'scripts/sounds',
    images: 'images',
    icons: 'css/icons'
  },
  
  // API Security config
  apiSecurityConfig: {
    excludedRoutes: ['webhook', 'webhooks-arg', 'config', 'health', 'csrf-token'],
    generateMapOnBuild: true,
    keepExistingCodes: true,
    routePrefix: '/api/x/'
  }
};

// 🆕 CONFIGURACIÓN DE PROTECCIÓN MATEMÁTICA
const MATH_PROTECTION_CONFIG = {
  preserve_math_content: true,
  conservative_math_minification: true,
  ignore_math_files_in_string_obfuscation: true,
  math_file_patterns: ['fisica', 'matematico', 'agente', 'teorico'],
  latex_patterns: [
    /\\[a-zA-Z]+/g,
    /data-latex=/gi,
    /math-preview/gi,
    /math-btn/gi
  ]
};

// Build ID único
const BUILD_ID = crypto.randomBytes(8).toString('hex');
console.log(`🔑 Build ID: ${BUILD_ID}`);

// 🆕 NUEVO: Generar nombre ofuscado para el archivo de seguridad API
const API_SECURITY_FILENAME = generateSecurityFileName();

// 🆕 MAPEOS GLOBALES PARA MÓDULOS
const moduleMapping = {
  fileNames: new Map(),     // archivo original -> nombre ofuscado
  fullPaths: new Map(),     // ruta completa -> ruta ofuscada
  imports: new Map(),       // archivo -> lista de imports
  exports: new Map(),       // archivo -> lista de exports
  dependencies: new Map()   // archivo -> archivos que dependen de él
};

const fileMapping = { js: {}, css: {} };

// Crear directorios
[distDir, distJsDir, distCssDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 🆕 NUEVO: Función para generar nombre ofuscado para archivo de seguridad
function generateSecurityFileName() {
  const securitySeed = crypto.createHash('md5').update(BUILD_ID + 'security_file').digest('hex');
  const prefix = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // letra aleatoria
  const hash = securitySeed.substring(0, 8);
  const timestamp = Date.now().toString(36).substring(-4);
  return `${prefix}${hash}_${timestamp}.js`;
}

// ✅ GENERAR NOMBRES SEGUROS PARA MÓDULOS
function generateModularName(originalPath, index = 0) {
  const prefix = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  const hash = crypto.createHash('md5').update(originalPath + BUILD_ID + index).digest('hex').substring(0, 8);
  const timestamp = Date.now().toString(36).substring(-4);
  return `${prefix}${hash}_${timestamp}.js`;
}

// 🆕 ANALIZAR ESTRUCTURA MODULAR COMPLETA (MEJORADO PARA SHARED)
function analyzeModularStructure() {
  console.log('\n🔍 Analizando estructura modular...');
  
  // 🆕 MEJORADO: Encontrar archivos JS modulares en múltiples directorios
  const jsFiles = [
    ...glob.sync(path.join(publicDir, 'scripts/**/*.js')),
    // 🆕 AGREGAR: archivos compartidos en directorios superiores
    ...glob.sync(path.join(publicDir, '../shared/**/*.js')).filter(file => 
      fs.existsSync(file) && file.includes('shared')
    ),
    // 🆕 AGREGAR: otros directorios comunes
    ...glob.sync(path.join(publicDir, 'shared/**/*.js')),
  ];
  
  // Filtrar duplicados y normalizar rutas
  const uniqueFiles = [...new Set(jsFiles.map(file => path.normalize(file)))];
  
  const moduleFiles = uniqueFiles.filter(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // 🆕 MEJORADO: Detectar tanto imports estáticos como dinámicos
      return content.includes('import ') || 
             content.includes('export ') || 
             content.includes('from \'') || 
             content.includes('from "') ||
             content.includes('import(') ||  // 🆕 Imports dinámicos
             content.includes('await import('); // 🆕 Imports dinámicos con await
    } catch (e) {
      return false;
    }
  });
  
  console.log(`📦 Encontrados ${moduleFiles.length} archivos modulares de ${uniqueFiles.length} archivos JS`);
  console.log(`📂 Directorios analizados: scripts/, shared/, ../shared/`);
  
  // Analizar imports y exports de cada archivo
  moduleFiles.forEach(filePath => {
    analyzeModuleFile(filePath);
  });
  
  // Crear grafo de dependencias
  buildDependencyGraph();
  
  // Generar nombres ofuscados para todos los módulos
  generateObfuscatedNames(moduleFiles);
  
  // 🆕 AGREGAR: Estadísticas de resolución de imports
  console.log(`\n📊 Estadísticas de resolución de imports:`);
  let totalImports = 0;
  let staticImports = 0;
  let dynamicImports = 0;
  let foundBySearch = 0;
  
  moduleMapping.imports.forEach((imports, filePath) => {
    totalImports += imports.length;
    staticImports += imports.filter(imp => imp.type === 'static').length;
    dynamicImports += imports.filter(imp => imp.type === 'dynamic').length;
    foundBySearch += imports.filter(imp => imp.wasFoundBySearch).length;
  });
  
  console.log(`   📥 Total imports detectados: ${totalImports}`);
  console.log(`   📋 Imports estáticos: ${staticImports}`);
  console.log(`   ⚡ Imports dinámicos: ${dynamicImports}`);
  if (foundBySearch > 0) {
    console.log(`   🔍 Encontrados por búsqueda inteligente: ${foundBySearch}`);
  }
  
  console.log(`✅ Análisis completo: ${moduleMapping.fileNames.size} módulos mapeados`);
  
  return moduleFiles;
}

// 🆕 ANALIZAR ARCHIVO MODULAR INDIVIDUAL (MEJORADO PARA IMPORTS DINÁMICOS + ESTADÍSTICAS)
function analyzeModuleFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativeFilePath = path.relative(publicDir, filePath);
    
    // Extraer imports (estáticos y dinámicos)
    const imports = extractImports(content, filePath);
    moduleMapping.imports.set(filePath, imports);
    
    // Extraer exports  
    const exports = extractExports(content);
    moduleMapping.exports.set(filePath, exports);
    
    if (imports.length > 0 || exports.length > 0) {
      // 🆕 MEJORADO: Separar conteo por tipo de import y estado
      const staticImports = imports.filter(imp => imp.type === 'static').length;
      const dynamicImports = imports.filter(imp => imp.type === 'dynamic').length;
      const foundBySearch = imports.filter(imp => imp.wasFoundBySearch).length;
      
      let importInfo = '';
      if (staticImports > 0 && dynamicImports > 0) {
        importInfo = `${staticImports + dynamicImports} imports (${staticImports} estáticos, ${dynamicImports} dinámicos)`;
      } else if (staticImports > 0) {
        importInfo = `${staticImports} imports`;
      } else if (dynamicImports > 0) {
        importInfo = `${dynamicImports} imports dinámicos`;
      } else {
        importInfo = '0 imports';
      }
      
      // 🆕 NUEVO: Agregar info sobre búsqueda inteligente
      if (foundBySearch > 0) {
        importInfo += ` (${foundBySearch} encontrados por búsqueda)`;
      }
      
      console.log(`  📄 ${path.basename(filePath)}: ${importInfo}, ${exports.length} exports`);
    }
    
  } catch (error) {
    console.warn(`⚠️ Error analizando ${filePath}:`, error.message);
  }
}

// 🆕 VERIFICAR SI UN ARCHIVO ESTÁ PROTEGIDO DE LA OFUSCACIÓN
function isProtectedFile(filePath) {
  if (!CONFIG.protect_critical_files) return false;
  
  const fileName = path.basename(filePath);
  return CONFIG.protected_files.includes(fileName);
}

// 🆕 COPIAR ARCHIVOS ESTÁTICOS (FONTS, SOUNDS, ETC.) - 🔧 MODIFICADO PARA SOUNDS
function copyStaticAssets() {
  if (!CONFIG.copy_static_assets) {
    console.log('ℹ️ Copia de assets estáticos deshabilitada');
    return;
  }
  
  console.log('\n📁 Copiando archivos estáticos...');
  
  let totalCopied = 0;
  
  Object.entries(CONFIG.static_assets).forEach(([assetType, relativePath]) => {
    const sourcePath = path.join(publicDir, relativePath);
    
    // 🔧 ARREGLO ESPECÍFICO PARA SOUNDS: Cambiar destino a /dist/js/sounds/
    let destPath;
    if (assetType === 'sounds') {
      destPath = path.join(distJsDir, 'sounds'); // 🔧 CAMBIO: de distDir a distJsDir + 'sounds'
    } else {
      destPath = path.join(distDir, relativePath);
    }
    
    if (fs.existsSync(sourcePath)) {
      try {
        // Crear directorio de destino
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copiar directorio completo
          const files = glob.sync(path.join(sourcePath, '**/*'), { nodir: true });
          
          files.forEach(file => {
            const relativeToDest = path.relative(sourcePath, file);
            const destFile = path.join(destPath, relativeToDest);
            
            fs.mkdirSync(path.dirname(destFile), { recursive: true });
            fs.copyFileSync(file, destFile);
            totalCopied++;
          });
          
          // 🔧 CAMBIO: Mostrar el destino correcto en el log
          const displayPath = assetType === 'sounds' ? '/dist/js/sounds/' : `/dist/${relativePath}/`;
          console.log(`  📁 ${assetType}: ${files.length} archivos copiados a ${displayPath}`);
        } else {
          // Copiar archivo individual
          fs.copyFileSync(sourcePath, destPath);
          totalCopied++;
          const displayPath = assetType === 'sounds' ? '/dist/js/sounds' : `/dist/${relativePath}`;
          console.log(`  📄 ${assetType}: archivo copiado a ${displayPath}`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error copiando ${assetType} desde ${relativePath}:`, error.message);
      }
    } else {
      console.log(`  ℹ️ ${assetType}: directorio ${relativePath} no encontrado, omitiendo...`);
    }
  });
  
  console.log(`✅ Assets estáticos copiados: ${totalCopied} archivos`);
}

// 🆕 ACTUALIZAR RUTAS DE ASSETS EN CSS - 🔧 MODIFICADO PARA SOUNDS
function updateCSSAssetPaths(content, fileName) {
  if (!CONFIG.update_css_asset_paths) return content;
  
  let updatedContent = content;
  let changes = 0;
  
  // Patrones para diferentes tipos de rutas en CSS
  const patterns = [
    // url('./fonts/...')
    {
      pattern: /url\(['"]?\.\.?\/fonts\/([^'")\s]+)['"]?\)/g,
      replacement: 'url("/dist/css/fonts/$1")',
      type: 'fonts'
    },
    // 🔧 CAMBIO: url('./sounds/...') → url("/dist/js/sounds/...")
    {
      pattern: /url\(['"]?\.\.?\/sounds\/([^'")\s]+)['"]?\)/g,
      replacement: 'url("/dist/js/sounds/$1")',
      type: 'sounds'
    },
    // url('./images/...')
    {
      pattern: /url\(['"]?\.\.?\/images\/([^'")\s]+)['"]?\)/g,
      replacement: 'url("/dist/images/$1")',
      type: 'images'
    },
    // src: url(fonts/...)
    {
      pattern: /src:\s*url\(['"]?fonts\/([^'")\s]+)['"]?\)/g,
      replacement: 'src: url("/dist/css/fonts/$1")',
      type: 'fonts-src'
    }
  ];
  
  patterns.forEach(({ pattern, replacement, type }) => {
    const matches = updatedContent.match(pattern);
    if (matches) {
      updatedContent = updatedContent.replace(pattern, replacement);
      changes += matches.length;
      console.log(`    🔗 ${changes} rutas ${type} actualizadas en ${fileName}`);
    }
  });
  
  return updatedContent;
}

// 🆕 Función para backup individual de HTML
function backupHtmlFile(filePath) {
  try {
    const relativePath = path.relative(frontendDir, filePath);
    const backupPath = path.join(htmlBackupDir, relativePath);
    const backupFileDir = path.dirname(backupPath);
    
    // Crear directorio si no existe
    if (!fs.existsSync(backupFileDir)) {
      fs.mkdirSync(backupFileDir, { recursive: true });
    }
    
    // Solo hacer backup si no existe ya
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`⚠️ Error haciendo backup de ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

function findFileInMultipleLocations(originalPath, currentFilePath) {
  const currentDir = path.dirname(currentFilePath);
  const fileName = path.basename(originalPath);
  
  // Lista de ubicaciones posibles para buscar el archivo
  const searchLocations = [
    // 1. Resolución normal
    path.resolve(currentDir, originalPath),
    
    // 2. Buscar en la misma variante
    path.resolve(currentDir, fileName),
    
    // 3. Buscar en directorios padre
    path.resolve(currentDir, '..', fileName),
    path.resolve(currentDir, '../..', fileName),
    path.resolve(currentDir, '../../..', fileName),
    
    // 4. Buscar en diferentes variantes (matematico, pdf, agente, etc.)
    path.join(publicDir, 'scripts/chats/matematico/core', fileName),
    path.join(publicDir, 'scripts/chats/pdf/core', fileName),
    path.join(publicDir, 'scripts/chats/agente/core', fileName),
    path.join(publicDir, 'scripts/chats/teorico/core', fileName),
    
    // 5. Buscar en API y utils comunes
    path.join(publicDir, 'scripts/chats/matematico/api', fileName),
    path.join(publicDir, 'scripts/chats/pdf/api', fileName),
    path.join(publicDir, 'scripts/chats/agente/api', fileName),
    path.join(publicDir, 'scripts/chats/teorico/api', fileName),
    
    // 6. Buscar en directorios compartidos
    path.join(publicDir, 'scripts/chats/shared', fileName),
    path.join(publicDir, 'scripts/shared', fileName),
    path.join(publicDir, 'shared', fileName),
    
    // 7. Buscar componentes
    path.join(publicDir, 'scripts/chats/matematico/components', fileName),
    path.join(publicDir, 'scripts/chats/pdf/components', fileName),
    path.join(publicDir, 'scripts/chats/agente/components', fileName),
    
    // 8. Buscar en utils específicos
    path.join(publicDir, 'scripts/chats/matematico/utils', fileName),
    path.join(publicDir, 'scripts/chats/pdf/utils', fileName),
    path.join(publicDir, 'scripts/chats/agente/utils', fileName),
  ];
  
  // Añadir .js si no tiene extensión
  const searchLocationsWithJs = [];
  searchLocations.forEach(location => {
    searchLocationsWithJs.push(location);
    if (!path.extname(location)) {
      searchLocationsWithJs.push(location + '.js');
    }
  });
  
  // Buscar el archivo en todas las ubicaciones
  for (const location of searchLocationsWithJs) {
    const normalizedLocation = path.normalize(location);
    if (fs.existsSync(normalizedLocation) && normalizedLocation.startsWith(publicDir)) {
      return normalizedLocation;
    }
  }
  
  return null;
}

// 🆕 EXTRAER IMPORTS DE UN ARCHIVO (MEJORADO PARA RUTAS COMPLEJAS + IMPORTS DINÁMICOS)
function extractImports(content, currentFilePath) {
  const imports = [];
  const currentDir = path.dirname(currentFilePath);
  
  // Patrones para diferentes tipos de imports (ESTÁTICOS Y DINÁMICOS)
  const patterns = [
    // === IMPORTS ESTÁTICOS ===
    // import { ... } from './file.js'
    /import\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/g,
    // import defaultExport from './file.js'
    /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
    // import * as name from './file.js'
    /import\s*\*\s*as\s*\w+\s*from\s*['"]([^'"]+)['"]/g,
    // import defaultExport, { named } from './file.js'
    /import\s+\w+\s*,\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/g,
    // import './file.js'
    /import\s*['"]([^'"]+)['"]/g,
    
    // === IMPORTS DINÁMICOS ===
    // import("./file.js")
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // await import("./file.js")
    /await\s+import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  
  patterns.forEach((pattern, patternIndex) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[match.length - 1]; // Último grupo capturado
      
      // 🆕 DETECTAR TIPO DE IMPORT
      const isDynamic = match[0].includes('import(') || match[0].includes('await import');
      const importType = isDynamic ? 'dynamic' : 'static';
      
      // 🆕 MEJORADO: Resolver ruta del import con búsqueda inteligente
      let resolvedPath;
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        resolvedPath = path.resolve(currentDir, importPath);
      } else if (importPath.startsWith('/')) {
        resolvedPath = path.join(publicDir, importPath.substring(1));
      } else {
        // Ruta externa o node_modules, no procesar
        continue;
      }
      
      // Añadir .js si no tiene extensión
      if (!path.extname(resolvedPath)) {
        resolvedPath += '.js';
      }
      
      // 🆕 CRÍTICO: Normalizar la ruta
      resolvedPath = path.normalize(resolvedPath);
      
      // 🆕 BÚSQUEDA INTELIGENTE: Si no existe, buscar en múltiples ubicaciones
      let finalResolvedPath = resolvedPath;
      let searchPerformed = false;
      
      if (!fs.existsSync(resolvedPath) || !resolvedPath.startsWith(publicDir)) {
        // Intentar búsqueda inteligente
        const foundPath = findFileInMultipleLocations(importPath, currentFilePath);
        if (foundPath) {
          finalResolvedPath = foundPath;
          searchPerformed = true;
        }
      }
      
      // Verificar que el archivo existe y está dentro del proyecto
      if (fs.existsSync(finalResolvedPath) && finalResolvedPath.startsWith(publicDir)) {
        imports.push({
          originalStatement: match[0],
          importPath: importPath,
          resolvedPath: finalResolvedPath,
          relativeTo: currentFilePath,
          // 🆕 AGREGAR: información adicional para debugging
          isRelativeUp: importPath.includes('../'),
          depth: (importPath.match(/\.\.\//g) || []).length,
          type: importType, // 🆕 NUEVO: static o dynamic
          patternIndex: patternIndex, // Para debugging
          wasFoundBySearch: searchPerformed // 🆕 NUEVO: si se encontró por búsqueda
        });
        
        const searchLabel = searchPerformed ? ' (encontrado por búsqueda)' : '';
        
        // 🆕 LOGGING INTELIGENTE: Solo mostrar si está configurado para verbose o si fue encontrado por búsqueda
        if (CONFIG.verbose_import_logging || (searchPerformed && CONFIG.show_search_successes)) {
          console.log(`    📥 Import ${importType} detectado: ${importPath} → ${path.relative(publicDir, finalResolvedPath)}${searchLabel}`);
        }
      } else {
        // 🆕 MEJORADO: Logging controlado por configuración
        if (importType === 'static') {
          // Siempre mostrar errores de imports estáticos (son críticos)
          console.warn(`    ⚠️ Import ${importType} no encontrado: ${importPath} (resuelto a ${resolvedPath})`);
        } else if (CONFIG.show_dynamic_import_warnings) {
          // Solo mostrar warnings de imports dinámicos si está configurado
          console.warn(`    ⚠️ Import ${importType} no encontrado: ${importPath} (resuelto a ${resolvedPath})`);
        } else {
          // Para imports dinámicos, logging mínimo
          if (CONFIG.verbose_import_logging) {
            console.log(`    ℹ️ Import ${importType} condicional no encontrado: ${importPath} (puede ser carga opcional)`);
          }
        }
      }
    }
  });
  
  return imports;
}

// 🆕 EXTRAER EXPORTS DE UN ARCHIVO
function extractExports(content) {
  const exports = [];
  
  // Patrones para exports
  const patterns = [
    /export\s*\{[^}]*\}/g,
    /export\s+default\s+/g,
    /export\s+const\s+\w+/g,
    /export\s+function\s+\w+/g,
    /export\s+class\s+\w+/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      exports.push({
        statement: match[0],
        type: match[0].includes('default') ? 'default' : 'named'
      });
    }
  });
  
  return exports;
}

// 🆕 CONSTRUIR GRAFO DE DEPENDENCIAS
function buildDependencyGraph() {
  console.log('\n🔗 Construyendo grafo de dependencias...');
  
  // Inicializar dependencias
  moduleMapping.imports.forEach((imports, filePath) => {
    moduleMapping.dependencies.set(filePath, new Set());
  });
  
  // Mapear dependencias
  moduleMapping.imports.forEach((imports, filePath) => {
    imports.forEach(importInfo => {
      const dependencyPath = importInfo.resolvedPath;
      
      if (moduleMapping.dependencies.has(dependencyPath)) {
        moduleMapping.dependencies.get(dependencyPath).add(filePath);
      }
    });
  });
  
  let totalDependencies = 0;
  moduleMapping.dependencies.forEach((dependents, filePath) => {
    if (dependents.size > 0) {
      console.log(`  📄 ${path.basename(filePath)} <- usado por ${dependents.size} archivos`);
      totalDependencies += dependents.size;
    }
  });
  
  console.log(`✅ Grafo construido: ${totalDependencies} dependencias mapeadas`);
}

// 🆕 GENERAR NOMBRES OFUSCADOS PARA MÓDULOS (MEJORADO PARA SHARED)
function generateObfuscatedNames(moduleFiles) {
  console.log('\n🎭 Generando nombres ofuscados para módulos...');
  
  let index = 0;
  moduleFiles.forEach(filePath => {
    // 🆕 MEJORADO: Manejar rutas relativas de diferentes directorios
    const fileName = path.basename(filePath);
    let relativeFilePath;
    
    if (filePath.includes('shared') && !filePath.startsWith(publicDir)) {
      // Archivo en directorio shared superior
      relativeFilePath = path.relative(path.join(publicDir, '..'), filePath);
    } else {
      // Archivo normal en publicDir
      relativeFilePath = path.relative(publicDir, filePath);
    }
    
    // Generar nombre ofuscado único
    let obfuscatedName;
    do {
      obfuscatedName = generateModularName(filePath, index++);
    } while (Array.from(moduleMapping.fileNames.values()).includes(obfuscatedName));
    
    // 🆕 MEJORADO: Mapear múltiples variantes de la ruta
    const pathVariants = [
      filePath,                    // Ruta absoluta
      fileName,                    // Solo nombre
      relativeFilePath,            // Ruta relativa desde public
      path.relative(publicDir, filePath), // Ruta relativa normalizada
    ];
    
    // Si es archivo shared, agregar más variantes
    if (fileName === 'acadel-emoji-integration.js' || filePath.includes('shared')) {
      pathVariants.push(
        `shared/${fileName}`,
        `../shared/${fileName}`,
        `../../shared/${fileName}`
      );
    }
    
    // Mapear todas las variantes
    pathVariants.forEach(variant => {
      if (variant && variant !== '') {
        moduleMapping.fileNames.set(variant, obfuscatedName);
      }
    });
    
    // Mapear rutas completas para HTML
    const originalPath = CONFIG.preserve_module_structure 
      ? `/scripts/${relativeFilePath.replace(/\\/g, '/')}`
      : `/scripts/${fileName}`;
    const newPath = `/dist/js/${obfuscatedName}`;
    
    moduleMapping.fullPaths.set(originalPath, newPath);
    
    // También agregar al mapeo global para compatibilidad
    fileMapping.js[fileName] = obfuscatedName;
    fileMapping.js[relativeFilePath] = obfuscatedName;
    fileMapping.js[originalPath] = obfuscatedName;
    
    // 🆕 MEJORADO: Log más informativo
    if (filePath.includes('shared')) {
      console.log(`  🎭 [SHARED] ${fileName} → ${obfuscatedName}`);
    } else {
      console.log(`  🎭 ${fileName} → ${obfuscatedName}`);
    }
  });
}

// 🆕 PROCESAR ARCHIVO MODULAR CON ACTUALIZACIÓN DE IMPORTS
function processModularFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const relativeFilePath = path.relative(publicDir, filePath);
    const obfuscatedName = moduleMapping.fileNames.get(filePath);
    
    if (!obfuscatedName) {
      console.warn(`⚠️ No se encontró nombre ofuscado para ${fileName}`);
      return false;
    }
    
    console.log(`🔄 Procesando módulo: ${fileName} → ${obfuscatedName}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Actualizar imports en este archivo
    content = updateImportsInFile(content, filePath);
    
    // 2. Ofuscar strings conservadoramente
    content = obfuscateStrings(content);
    
    // 🆕 3. Ofuscar mensajes de log específicos
    content = obfuscateDebugLogs(content);
    
    // 4. Minificar con configuración especial para módulos
    const uglifyOptions = {
      compress: {
        drop_console: CONFIG.remove_console,
        drop_debugger: true,
        pure_funcs: CONFIG.remove_debug_logs ? ['console.debug', 'console.log'] : ['console.debug'],
        passes: 2,
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        collapse_vars: true
      },
      mangle: CONFIG.mangle_variables ? {
        reserved: [
          // Preservar elementos críticos
          'window', 'document', 'console', 'MathJax', 'hljs', 
          'Paddle', 'google', 'acadelConfetti', 'updateAcadelProgress',
          'csrfUtils', 'csrfToken', 'CSRF', 'XSRF', 'fetch',
          // Preservar exports para que los imports funcionen
          'export', 'import', 'default'
        ],
        properties: false // No ofuscar propiedades para mantener API
      } : false,
      output: {
        beautify: false,
        comments: false
      }
    };
    
    let finalContent;
    const result = UglifyJS.minify(content, uglifyOptions);
    
    if (result.error) {
      console.warn(`⚠️ Minificación falló para ${fileName}, usando original:`, result.error.message);
      finalContent = content;
    } else {
      finalContent = result.code;
      const reduction = Math.round((1 - finalContent.length/content.length) * 100);
      console.log(`  📦 Minificado: ${content.length} → ${finalContent.length} chars (${reduction}% reducción)`);
    }
    
    // 5. Escribir archivo ofuscado
    const outputPath = path.join(distJsDir, obfuscatedName);
    fs.writeFileSync(outputPath, finalContent);
    
    // 🆕 MEJORADO: Log con información del directorio origen
    const isSharedFile = filePath.includes('shared');
    const sourceDir = isSharedFile ? 'shared' : 'scripts';
    console.log(`✅ [${sourceDir}] ${fileName} procesado exitosamente → ${obfuscatedName}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error procesando módulo ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// 🆕 ACTUALIZAR IMPORTS EN UN ARCHIVO (MEJORADO PARA RUTAS COMPLEJAS + IMPORTS DINÁMICOS)
function updateImportsInFile(content, filePath) {
  const imports = moduleMapping.imports.get(filePath) || [];
  
  console.log(`    🔍 Actualizando ${imports.length} imports en ${path.basename(filePath)}`);
  
  // Separar imports por tipo para mejor procesamiento
  const staticImports = imports.filter(imp => imp.type === 'static');
  const dynamicImports = imports.filter(imp => imp.type === 'dynamic');
  
  if (staticImports.length > 0) {
    console.log(`      📋 ${staticImports.length} imports estáticos`);
  }
  if (dynamicImports.length > 0) {
    console.log(`      ⚡ ${dynamicImports.length} imports dinámicos`);
  }
  
  imports.forEach(importInfo => {
    const { originalStatement, resolvedPath, importPath, type } = importInfo;
    const obfuscatedFileName = moduleMapping.fileNames.get(resolvedPath);
    
    if (obfuscatedFileName) {
      // 🆕 MEJORADO: Crear nueva declaración según el tipo de import
      // Todas las rutas ahora apuntan al mismo directorio dist/js/
      const newImportPath = `./${obfuscatedFileName}`;
      
      let newStatement;
      
      if (type === 'dynamic') {
        // 🆕 IMPORTS DINÁMICOS: import("path") → import("newPath")
        newStatement = originalStatement.replace(
          /(['"])([^'"]+)\1/, 
          `$1${newImportPath}$1`
        );
      } else {
        // IMPORTS ESTÁTICOS: from "path" → from "newPath"
        newStatement = originalStatement.replace(
          /(['"])([^'"]+)\1/, 
          `$1${newImportPath}$1`
        );
      }
      
      content = content.replace(originalStatement, newStatement);
      
      // 🆕 MEJORADO: Log más detallado para debugging
      const importTypeLabel = type === 'dynamic' ? 'dinámico' : 'estático';
      if (importPath.includes('../')) {
        console.log(`    🔗 Import ${importTypeLabel} complejo actualizado: ${importPath} → ${newImportPath}`);
      } else {
        console.log(`    🔗 Import ${importTypeLabel} actualizado: ${importPath} → ${newImportPath}`);
      }
    } else {
      console.warn(`    ⚠️ No se encontró archivo ofuscado para: ${importPath} (resuelto: ${path.relative(publicDir, resolvedPath)})`);
    }
  });
  
  return content;
}

// 🆕 OFUSCACIÓN ESPECÍFICA PARA DEBUG LOGS
function obfuscateDebugLogs(content) {
  if (!CONFIG.obfuscate_log_messages) return content;
  
  try {
    // Ofuscar mensajes específicos de debug que aparecen en consola
    const logPatterns = [
      // console.log con emoji y texto específico
      /(console\.log\(['"`])([🔍📦🎨📄🔄🆕✅⚠️❌].*?)(['"`]\))/g,
      // console.warn y console.error con mensajes específicos
      /(console\.(warn|error)\(['"`])([^'"`]*(?:OBSERVER|ERROR|Processing|Detected).*?)(['"`]\))/g,
      // Mensajes con patrones específicos
      /(console\.log\(['"`])([^'"`]*(?:mensajes únicos|detectados|problema temporal).*?)(['"`]\))/g
    ];
    
    logPatterns.forEach(pattern => {
      content = content.replace(pattern, (match, prefix, emoji, message, suffix) => {
        // Si el mensaje contiene información sensible, ofuscarlo
        if (message && (
          message.includes('detectados') || 
          message.includes('OBSERVER') || 
          message.includes('ERROR') ||
          message.includes('problema temporal')
        )) {
          // Generar hash del mensaje original para mantener funcionalidad de debug
          const hash = crypto.createHash('md5').update(message).digest('hex').substring(0, 8);
          const obfuscatedMsg = `DBG_${hash}`;
          return `${prefix}${obfuscatedMsg}${suffix}`;
        }
        return match;
      });
    });
    
    // También ofuscar strings específicos que aparecen en los logs
    const stringPatterns = [
      /(['"`])(.*?(?:mensajes únicos detectados|Imagen local con problema temporal).*?)\1/g,
      /(['"`])(.*?(?:OBSERVER|ERROR|Processing).*?)\1/g
    ];
    
    stringPatterns.forEach(pattern => {
      content = content.replace(pattern, (match, quote, message) => {
        if (message.length > 10) { // Solo ofuscar mensajes largos
          const hash = crypto.createHash('md5').update(message).digest('hex').substring(0, 8);
          return `${quote}M_${hash}${quote}`;
        }
        return match;
      });
    });
    
    return content;
    
  } catch (error) {
    console.warn('Error en ofuscación de logs:', error.message);
    return content;
  }
}

// 🆕 PROCESAR TODOS LOS MÓDULOS EN ORDEN CORRECTO
async function processAllModularFiles() {
  console.log('\n🚀 Procesando archivos modulares...');
  
  // 1. Analizar estructura modular
  const moduleFiles = analyzeModularStructure();
  
  if (moduleFiles.length === 0) {
    console.log('ℹ️ No se encontraron archivos modulares para procesar');
    return { jsProcessed: 0, jsTotal: 0 };
  }
  
  // 2. Procesar módulos en orden (independientes primero)
  const processOrder = determineProcessingOrder(moduleFiles);
  console.log(`\n📋 Orden de procesamiento: ${processOrder.length} archivos`);
  
  let processedCount = 0;
  
  for (let i = 0; i < processOrder.length; i++) {
    const filePath = processOrder[i];
    const fileName = path.basename(filePath);
    
    console.log(`\n[${i + 1}/${processOrder.length}] Procesando: ${fileName}`);
    
    if (processModularFile(filePath)) {
      processedCount++;
    }
  }
  
  // 3. Procesar archivos JS no modulares con método original
  const allJsFiles = [
    ...glob.sync(path.join(publicDir, 'scripts/**/*.js')),
    // 🆕 NO incluir archivos shared aquí ya que se procesan como modulares
  ];
  const nonModularFiles = allJsFiles.filter(file => !moduleFiles.includes(file));
  
  console.log(`\n📦 Procesando ${nonModularFiles.length} archivos JS no modulares...`);
  
  for (const file of nonModularFiles) {
    if (processJSFile(file)) {
      processedCount++;
    }
  }
  
  console.log(`\n✅ Procesamiento modular completo: ${processedCount}/${allJsFiles.length} archivos`);
  
  return { 
    jsProcessed: processedCount, 
    jsTotal: allJsFiles.length + moduleFiles.filter(f => f.includes('shared')).length,
    modularFiles: moduleFiles.length,
    nonModularFiles: nonModularFiles.length,
    sharedFiles: moduleFiles.filter(f => f.includes('shared')).length
  };
}

// 🆕 DETERMINAR ORDEN DE PROCESAMIENTO BASADO EN DEPENDENCIAS
function determineProcessingOrder(moduleFiles) {
  const ordered = [];
  const visited = new Set();
  const visiting = new Set();
  
  function visit(filePath) {
    if (visited.has(filePath)) return;
    if (visiting.has(filePath)) {
      console.warn(`⚠️ Dependencia circular detectada en ${path.basename(filePath)}`);
      return;
    }
    
    visiting.add(filePath);
    
    // Visitar dependencias primero
    const imports = moduleMapping.imports.get(filePath) || [];
    imports.forEach(importInfo => {
      if (moduleFiles.includes(importInfo.resolvedPath)) {
        visit(importInfo.resolvedPath);
      }
    });
    
    visiting.delete(filePath);
    visited.add(filePath);
    ordered.push(filePath);
  }
  
  // Procesar todos los archivos
  moduleFiles.forEach(filePath => {
    if (!visited.has(filePath)) {
      visit(filePath);
    }
  });
  
  return ordered;
}

// ✅ FUNCIÓN ORIGINAL processJSFile PARA ARCHIVOS NO MODULARES
function processJSFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const relativeFilePath = path.relative(publicDir, filePath);
    
    // Verificar si ya fue procesado como modular
    if (moduleMapping.fileNames.has(filePath)) {
      return true; // Ya procesado
    }
    
    const outputName = generateRandomName() + '.js';
    const outputPath = path.join(distJsDir, outputName);
    
    console.log(`📦 Processing (non-modular): ${fileName}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Aplicar ofuscación
    content = obfuscateStrings(content);
    content = obfuscateDebugLogs(content);
    
    // Minificar
    const uglifyOptions = {
      compress: {
        drop_console: CONFIG.remove_console,
        drop_debugger: true,
        pure_funcs: CONFIG.remove_debug_logs ? ['console.debug', 'console.log'] : ['console.debug'],
        passes: 1
      },
      mangle: CONFIG.mangle_variables ? {
        reserved: [
          'window', 'document', 'console', 'MathJax', 'hljs', 
          'Paddle', 'google', 'acadelConfetti', 'updateAcadelProgress',
          'csrfUtils', 'csrfToken', 'CSRF', 'XSRF', 'fetch'
        ]
      } : false,
      output: {
        beautify: false,
        comments: false
      }
    };
    
    const result = UglifyJS.minify(content, uglifyOptions);
    
    if (result.error) {
      console.warn(`⚠️ Minification failed for ${fileName}, usando original`);
      fs.writeFileSync(outputPath, content);
    } else {
      fs.writeFileSync(outputPath, result.code);
    }
    
    // Registrar mapeo
    fileMapping.js[fileName] = outputName;
    fileMapping.js[relativeFilePath] = outputName;
    
    console.log(`✅ ${fileName} → ${outputName}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// ✅ GENERAR NOMBRES ALEATORIOS PARA ARCHIVOS NO MODULARES
function generateRandomName() {
  const prefix = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  const randomData = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now().toString(36);
  return prefix + randomData + '_' + timestamp;
}

// 🔧 FUNCIÓN PROTEGER CONTENIDO MATEMÁTICO ANTES DE PROCESAMIENTO
function protectMathContent(content) {
  const protectedSections = [];
  let counter = 0;
  
  try {
    // 1. Proteger atributos data-latex COMPLETOS
    content = content.replace(/data-latex="([^"]*)"/g, (match, latexContent) => {
      const placeholder = `__MATH_ATTR_${counter++}__`;
      protectedSections.push({ placeholder, content: match, type: 'data-latex' });
      return placeholder;
    });
    
    // 2. Proteger contenido de spans math-preview COMPLETOS  
    content = content.replace(/<span([^>]*class="math-preview"[^>]*)>(.*?)<\/span>/g, (match, attributes, innerContent) => {
      const placeholder = `__MATH_SPAN_${counter++}__`;
      protectedSections.push({ placeholder, content: match, type: 'math-preview' });
      return placeholder;
    });
    
    // 3. Proteger botones math-btn COMPLETOS con su contenido
    content = content.replace(/<button([^>]*class="math-btn"[^>]*data-latex="[^"]*"[^>]*)>(.*?)<\/button>/gs, (match) => {
      const placeholder = `__MATH_BTN_${counter++}__`;
      protectedSections.push({ placeholder, content: match, type: 'math-button' });
      return placeholder;
    });
    
    // 4. Proteger cualquier LaTeX inline restante (\comando)
    content = content.replace(/\\[a-zA-Z]+(\{[^}]*\})*(\[[^\]]*\])*/g, (match) => {
      const placeholder = `__LATEX_CMD_${counter++}__`;
      protectedSections.push({ placeholder, content: match, type: 'latex-command' });
      return placeholder;
    });
    
    // Devolver contenido protegido y mapeo para restaurar
    return { content, protectedSections };
    
  } catch (error) {
    console.error('❌ Error protegiendo contenido matemático:', error.message);
    return { content, protectedSections: [] };
  }
}

// 🔧 FUNCIÓN RESTAURAR CONTENIDO MATEMÁTICO DESPUÉS DE PROCESAMIENTO
function restoreMathContent(content, protectedSections) {
  try {
    // Restaurar en orden inverso para evitar conflictos
    protectedSections.reverse().forEach(({ placeholder, content: originalContent, type }) => {
      if (content.includes(placeholder)) {
        content = content.replace(placeholder, originalContent);
      }
    });
    
    return content;
    
  } catch (error) {
    console.error('❌ Error restaurando contenido matemático:', error.message);
    return content;
  }
}

// 🔧 OFUSCACIÓN DE STRINGS MEJORADA PARA EVITAR CONTENIDO MATEMÁTICO
function obfuscateStrings(code) {
  if (!CONFIG.string_obfuscation) return code;
  
  try {
    // 🆕 VERIFICAR SI EL CÓDIGO CONTIENE CONTENIDO MATEMÁTICO
    const hasMathContent = (
      code.includes('data-latex') ||
      code.includes('math-preview') ||
      code.includes('math-btn') ||
      code.includes('\\begin{') ||
      code.includes('\\end{') ||
      code.includes('\\frac{') ||
      code.includes('\\int') ||
      code.includes('\\sum') ||
      code.includes('\\prod')
    );
    
    if (hasMathContent) {
      console.log('⚠️ Archivo contiene contenido matemático, ofuscación conservadora aplicada');
      // Solo ofuscar URLs API, no strings matemáticos
      return code.replace(/"(\/api\/[^"]+)"/g, (match, url) => {
        const criticalPaths = ['csrf', 'webhook', 'config', 'auth-status'];
        if (criticalPaths.some(cp => url.includes(cp))) {
          return match;
        }
        const hash = crypto.createHash('md5').update(url + BUILD_ID).digest('hex').substring(0, 6);
        return `"${url}?_t=${hash}"`;
      });
    }
    
    // Ofuscación normal para archivos sin contenido matemático
    if (code.includes('csrf') || code.includes('CSRF') || code.includes('XSRF')) {
      console.log('⚠️ Archivo contiene CSRF, ofuscación conservadora aplicada');
      return code;
    }
    
    return code.replace(/"(\/api\/[^"]+)"/g, (match, url) => {
      const criticalPaths = ['csrf', 'webhook', 'config', 'auth-status'];
      if (criticalPaths.some(cp => url.includes(cp))) {
        return match;
      }
      
      const hash = crypto.createHash('md5').update(url + BUILD_ID).digest('hex').substring(0, 6);
      return `"${url}?_t=${hash}"`;
    });
    
  } catch (error) {
    console.warn('String obfuscation failed, usando original...', error.message);
    return code;
  }
}

// ✅ CSS Y HTML PROCESSING (CON ACTUALIZACIÓN DE RUTAS DE ASSETS)
function processCSSFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const relativeFilePath = path.relative(publicDir, filePath);
    const outputName = generateRandomName() + '.css';
    const outputPath = path.join(distCssDir, outputName);
    
    console.log(`🎨 Processing CSS: ${fileName}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    content = resolveImports(content, filePath);
    content = cleanCSSBeforeMinify(content, fileName);
    
    // 🆕 NUEVO: Actualizar rutas de assets en CSS
    content = updateCSSAssetPaths(content, fileName);
    
    if (CONFIG.minify_css) {
      try {
        const minified = new CleanCSS({
          level: {
            1: {
              removeEmpty: true,
              removeWhitespace: true,
              removeComments: CONFIG.remove_comments ? 'all' : false,
              normalizeUrls: true,
              specialComments: 0,
              removeQuotes: false,
              removeDuplicates: true
            },
            2: {
              mergeAdjacentRules: true,
              mergeIntoShorthands: true,
              mergeMedia: true,
              mergeNonAdjacentRules: false,
              mergeSemantically: false,
              overrideProperties: true,
              removeEmpty: true,
              reduceNonAdjacentRules: false,
              removeDuplicateFontRules: true,
              removeDuplicateMediaBlocks: true,
              removeDuplicateRules: true,
              removeUnusedAtRules: false,
              restructureRules: false,
              skipProperties: []
            }
          },
          format: false,
          returnPromise: false,
          rebaseTo: false,
          inline: false,
          rebase: false
        }).minify(content);
        
        if (minified.errors.length > 0) {
          console.warn(`⚠️ CSS errors in ${fileName}:`, minified.errors);
          fs.writeFileSync(outputPath, content);
        } else {
          fs.writeFileSync(outputPath, minified.styles);
          console.log(`  📦 CSS minificado: ${content.length} → ${minified.styles.length} chars`);
        }
      } catch (minifyError) {
        console.error(`❌ Error minificando ${fileName}:`, minifyError.message);
        fs.writeFileSync(outputPath, content);
      }
    } else {
      fs.writeFileSync(outputPath, content);
    }
    
    fileMapping.css[fileName] = outputName;
    fileMapping.css[relativeFilePath] = outputName;
    
    console.log(`✅ ${fileName} → ${outputName}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing CSS ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// ✅ FUNCIONES AUXILIARES CSS (mantener originales)
function cleanCSSBeforeMinify(content, fileName) {
  try {
    content = content.replace(/\/\*(?:[^*]|\*(?!\/))*(?:\*\/|$)/g, '');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    content = content.replace(/^\uFEFF/, '');
    content = content.replace(/content:\s*["']([^"']*)<([^"']*)["']/g, (match, before, after) => {
      return `content: "${before}\\003C${after}"`;
    });
    
    return content;
  } catch (error) {
    console.warn(`⚠️ Error limpiando CSS ${fileName}:`, error.message);
    return content;
  }
}

function resolveImports(content, filePath) {
  const importRegex = /@import\s+['"]([^'"]+)['"];?/g;
  let resolved = content;
  const processedImports = new Set();
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    if (processedImports.has(importPath)) {
      console.warn(`Import circular detectado: ${importPath}`);
      continue;
    }
    
    let resolvedPath;
    if (importPath.startsWith('/')) {
      resolvedPath = path.join(publicDir, importPath.substring(1));
    } else {
      resolvedPath = path.resolve(path.dirname(filePath), importPath);
    }
    
    try {
      if (fs.existsSync(resolvedPath)) {
        const importedContent = fs.readFileSync(resolvedPath, 'utf8');
        const processedContent = resolveImports(importedContent, resolvedPath);
        
        resolved = resolved.replace(match[0], `/* === Imported from ${importPath} === */\n${processedContent}\n/* === End ${importPath} === */`);
        processedImports.add(importPath);
        
        console.log(`  ✅ Import resuelto: ${importPath}`);
      } else {
        console.warn(`  ⚠️ Import no encontrado: ${importPath}`);
      }
    } catch (error) {
      console.warn(`  ⚠️ Error resolviendo import ${importPath}:`, error.message);
    }
  }
  
  return resolved;
}

// ✅ ANTI-DEBUG Y API PROTECTION (mantener originales)
function addBasicAntiDebug() {
  if (!CONFIG.anti_debug_basic) return '';
  
  return `
(function() {
  'use strict';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }
  var originalConsole = console.debug;
  console.debug = function() {
    if (arguments.length > 0 && typeof arguments[0] === 'string') {
      if (arguments[0].includes('devtools') || arguments[0].includes('debug')) return;
    }
    originalConsole.apply(console, arguments);
  };
})();
`;
}

function generateAlgorithmicRouteDecoder() {
  if (!CONFIG.api_route_protection) return null;
  
  try {
    console.log('🔒 Generando sistema de ofuscación algorítmica...');
    
    const obfuscationSeed = crypto.createHash('md5').update(BUILD_ID + 'route_seed').digest('hex');
    const paramSeed = crypto.createHash('md5').update(BUILD_ID + 'param_seed').digest('hex');
    
    // Función hash idéntica al frontend
    function customHash(input, seed) {
      let hash = 0;
      const combined = input + seed;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).substring(0, 8);
    }
    
    // Generar mapas usando el mismo algoritmo
    const routeMap = {};
    const parameterMap = {};
    
    // 🔒 RUTAS PROTEGIDAS COMPLETAS (ORGANIZADAS POR CATEGORÍA) - UPDATED
    const routes = [
      // 🔒 RUTAS PRINCIPALES DE USUARIOS Y AUTENTICACIÓN
      '/usuarios',              // userRoutes - gestión de usuarios
      '/perfil',               // perfilRoutes - perfiles de usuario
      '/chats',                // chatRoutes - conversaciones del usuario
      
      // 🤖 RUTAS DE IA Y PROCESAMIENTO
      '/openai',               // openaiRoutes - consultas a IA
      '/ava',                  // embeddingAvaRoutes - embeddings de IA
      '/avas',                 // avaRoutes - avatares de IA
      '/documents',            // documentRoutes - procesamiento de documentos
      '/file',                 // fileRoutes - procesamiento de archivos
      
      // 🎥 RUTAS DE MEDIA Y TRANSCRIPCIÓN (SENSIBLES)
      '/media',                // youtubeAudioRoutes - procesamiento de YouTube
      '/video-transcription',  // videoTranscriptionRoutes - transcripción de video
      '/audio-transcription',  // audioTranscriptionRoutes - transcripción de audio
      
      // 🛠️ RUTAS DE HERRAMIENTAS Y FUNCIONALIDADES
      '/herramientas',         // herramientaRoutes - herramientas del usuario
      '/carrera',              // carreraRoutes - información de carreras
      '/marketing',            // marketingRoutes - funciones de marketing
      '/feedback',             // feedbackRoutes - feedback de usuarios
      
      // 💳 RUTAS DE PAGOS Y TRANSACCIONES
      '/paddle',               // paddleRoutes - integración con Paddle
      '/price',                // priceRoutes - gestión de precios
      '/payment',              // transactionRoutes - transacciones
      '/compra',               // useravaRoutes - compras de usuarios
      '/payments-arg',         // argentinaPaymentRoutes - pagos Argentina
      
      // 🔐 RUTAS DE SEGURIDAD Y ADMINISTRACIÓN
      '/security',             // securityRoutes - funciones de seguridad
      '/query',                // queryRoutes - consultas administrativas
      '/activitymente',        // activityMenteLogRoutes - logs de actividad
      '/access',               // accessStatusRoutes - estado de acceso
      '/cookie-consent',       // cookieConsentRoutes - consentimiento cookies
      
      // 🆕 CRÍTICO: Ruta admin principal para manejar sub-rutas multi-nivel
      '/admin',                // 🔥 NUEVA: Ruta admin principal (argentina, finance, queues, etc.)
      
      // 📋 RUTAS DE TÉRMINOS Y POLÍTICAS
      '/terminos'              // termsRoutes - términos y condiciones
    ];

    // 🔑 PARÁMETROS CRÍTICOS EXPANDIDOS (ORGANIZADOS POR CATEGORÍA) - UPDATED
    const params = [
      // 🔒 PARÁMETROS DE AUTENTICACIÓN Y USUARIOS
      'verifyPassword', 'refresh-token', 'token', 'login', 'register', 'logout', 'reset',
      'active', 'userId', 'id', 'chatId', 'sessionId', 'verificar', 'activar',
      'authenticate', 'login-status', 'auth-status',
      
      // 🏫 PARÁMETROS DE CARRERAS Y EDUCACIÓN
      'carrera', 'universidad', 'curso', 'materia', 'nivel',
      
      // 🤖 PARÁMETROS DE IA Y CONSULTAS
      'query-chat', 'query-patologia', 'query-anatomia', 'query-pdf', 'query-fisica', 
      'query-quimica', 'query-Agent', 'query-teorico', 'query-matematico',
      'multimodal-query', 'multimodal-Agent', 'multimodal-patologia', 'multimodal-pdf', 
      'multimodal-fisica', 'multimodal-anatomia', 'multimodal-teorico',
      
      // 🎥 PARÁMETROS DE MEDIA Y TRANSCRIPCIÓN
      'process-youtube', 'process-audio-file', 'process-recorded-audio', 'process-video-file',
      'extract-audio', 'transcribe', 'analyze-video', 'convert-media',
      
      // 📄 PARÁMETROS DE DOCUMENTOS Y ARCHIVOS
      'extract-content', 'extract-text', 'upload-file', 'process-pdf', 'analyze-document',
      'parse-content', 'generate-summary', 'extract-images',
      
      // 🛠️ PARÁMETROS DE HERRAMIENTAS Y OPERACIONES
      'create', 'delete', 'update', 'edit', 'modify', 'generate', 'process', 'analyze',
      'validate', 'verify', 'check', 'submit', 'save', 'load', 'export', 'import',
      'list', 'get', 'post', 'put', 'patch', 'search', 'filter', 'sort',
      
      // 💳 PARÁMETROS DE PAGOS Y TRANSACCIONES
      'purchase', 'payment', 'transaction', 'subscription', 'billing', 'invoice',
      'refund', 'charge', 'checkout', 'cancel-subscription', 'upgrade', 'downgrade',
      
      // 💰 PARÁMETROS FINANCIEROS Y REPORTES
      'subscriptions', 'transactions', 'tax', 'reports', 'expenses', 'revenue',
      'analytics', 'statistics', 'metrics', 'dashboard', 'summary',
      
      // 🔐 PARÁMETROS DE ADMINISTRACIÓN Y SEGURIDAD
      'run-security-cleanup', 'run-user-tasks', 'maintenance', 'admin-panel',
      'security-log', 'audit-trail', 'monitor', 'activity-log', 'error-log',
      'queue-status', 'queue-clear', 'queue-retry', 'system-status',
      
      // 🆕 CRÍTICO: Parámetros específicos para admin multi-nivel
      'argentina', 'finance', 'queues',                    // Sub-rutas de admin
      'stats', 'users', 'payments',                        // Endpoints comunes
      'actualizar-suscripciones-vencidas',                 // Endpoint específico Argentina
      'estadisticas-suscripciones',                        // Endpoint específico Argentina  
      'verificar-pgcron',                                  // Endpoint específico Argentina
      
      // 🎯 PARÁMETROS DE MARKETING Y FEEDBACK
      'feedback', 'rating', 'review', 'survey', 'comment', 'recommendation',
      'campaign', 'promotion', 'discount', 'coupon', 'referral',
      
      // 📊 PARÁMETROS DE EMBEDDINGS Y VECTORES
      'embedding', 'vector', 'similarity', 'semantic-search', 'ava-training',
      'model-update', 'index-rebuild', 'cache-clear', 'optimize',
      
      // 🌐 PARÁMETROS DE ACCESO Y PERMISOS
      'access-level', 'permission', 'role', 'scope', 'privilege', 'authorization',
      'grant-access', 'revoke-access', 'check-permission', 'validate-role'
    ];
    
    // Generar mapas usando algoritmo
    routes.forEach(route => {
      const routeName = route.substring(1); // Remover '/'
      const code = customHash(routeName, obfuscationSeed.substring(0, 16));
      routeMap[code] = route;
    });
    
    params.forEach(param => {
      const code = customHash(param, paramSeed.substring(0, 16));
      parameterMap[param] = code;
    });
    
    // Guardar mapas para el backend
    const utils = path.join(rootDir, 'backend', 'utils');
    if (!fs.existsSync(utils)) {
      fs.mkdirSync(utils, { recursive: true });
    }
    
    try {
      fs.writeFileSync(path.join(utils, 'routeMap.json'), JSON.stringify(routeMap, null, 2));
      fs.writeFileSync(path.join(utils, 'parameterMap.json'), JSON.stringify(parameterMap, null, 2));
      
      // 📊 ESTADÍSTICAS DETALLADAS POR CATEGORÍA
      console.log(`✅ Mapas algorítmicos generados exitosamente:`);
      console.log(`   📁 Total rutas protegidas: ${Object.keys(routeMap).length}`);
      console.log(`      🔒 Usuarios y auth: 3 rutas`);
      console.log(`      🤖 IA y procesamiento: 5 rutas`);
      console.log(`      🎥 Media y transcripción: 3 rutas`);
      console.log(`      🛠️ Herramientas: 4 rutas`);
      console.log(`      💳 Pagos: 4 rutas`);
      console.log(`      🔐 Seguridad y admin: 5 rutas`);
      console.log(`   🔑 Total parámetros protegidos: ${Object.keys(parameterMap).length}`);
      console.log(`      🔒 Auth y usuarios: 11 parámetros`);
      console.log(`      🤖 IA y consultas: 15 parámetros`);
      console.log(`      🎥 Media: 8 parámetros`);
      console.log(`      📄 Documentos: 7 parámetros`);
      console.log(`      🛠️ Operaciones: 18 parámetros`);
      console.log(`      💳 Pagos: 10 parámetros`);
      console.log(`      💰 Finanzas: 7 parámetros`);
      console.log(`      🔐 Admin: 10 parámetros`);
      console.log(`      🎯 Marketing: 7 parámetros`);
      console.log(`      📊 Embeddings: 6 parámetros`);
      console.log(`      🌐 Permisos: 8 parámetros`);
      console.log(`   🔒 Método: Algoritmo hash (sin mapas expuestos)`);
      console.log(`   📍 Ubicación: backend/utils/`);
      
      // 🔍 MOSTRAR ALGUNAS RUTAS OFUSCADAS (SOLO EN DESARROLLO)
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔍 Ejemplo de rutas ofuscadas:`);
        const sampleRoutes = Object.entries(routeMap).slice(0, 5);
        sampleRoutes.forEach(([code, route]) => {
          console.log(`   /api/x/${code} → /api${route}`);
        });
        console.log(`   ... y ${Object.keys(routeMap).length - 5} más`);
        
        console.log(`\n🔑 Ejemplo de parámetros ofuscados:`);
        const sampleParams = Object.entries(parameterMap).slice(0, 5);
        sampleParams.forEach(([param, hash]) => {
          console.log(`   ${param} → ${hash}`);
        });
        console.log(`   ... y ${Object.keys(parameterMap).length - 5} más`);
      }
      
    } catch (error) {
      console.warn('⚠️ Error guardando mapas algorítmicos:', error.message);
    }
    
    return { routeMap, parameterMap };
    
  } catch (error) {
    console.error('❌ Error generando sistema algorítmico:', error);
    return null;
  }
}

// 🆕 MODIFICADO: Función para crear script de protección API SIN LOGS
function createSecureApiObfuscationScript() {
  if (!CONFIG.api_route_protection) return '';
  
  const obfuscationSeed = crypto.createHash('md5').update(BUILD_ID + 'route_seed').digest('hex');
  const paramSeed = crypto.createHash('md5').update(BUILD_ID + 'param_seed').digest('hex');
  
  return `
/**
 * Sistema de ofuscación algorítmica
 * Build ID: ${BUILD_ID.substring(0, 4)}***
 */
(function() {
  'use strict';
  
  let isObfuscating = false;
  
  const routeSeed = '${obfuscationSeed.substring(0, 16)}';
  const paramSeed = '${paramSeed.substring(0, 16)}';
  
  function customHash(input, seed) {
    let hash = 0;
    const combined = input + seed;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }
  
  const knownRoutes = [
    'usuarios', 'perfil', 'chats', 'openai', 'ava', 'avas', 'documents', 'file',
    'media', 'video-transcription', 'audio-transcription', 'herramientas', 
    'carrera', 'marketing', 'feedback', 'paddle', 'price', 'payment', 'compra',
    'security', 'query', 'activitymente', 'admin', 'payments-arg', 'test-queues',
    'terminos', 'cookie-consent', 'access'
  ];
  
  const knownParams = [
    'verifyPassword', 'login', 'authenticate', 'login-status', 'register', 
    'logout', 'reset', 'active', 'create', 'delete', 'update', 'get', 'list',
    'query-Agent', 'query-patologia', 'query-anatomia', 'process-youtube',
    'extract-content', 'transcribe', 'check', 'submit', 'auth-status',
    'argentina', 'finance', 'queues', 'stats', 'users', 'payments',
    'actualizar-suscripciones-vencidas', 'estadisticas-suscripciones', 'verificar-pgcron'
  ];
  
  function obfuscateURL(originalURL) {
    try {
      if (typeof originalURL !== 'string' || !originalURL.includes('/api/')) {
        return originalURL;
      }
      
      if (originalURL.includes('/api/x/')) {
        return originalURL;
      }
      
      const url = new URL(originalURL, window.location.origin);
      const pathname = url.pathname;
      
      const apiMatch = pathname.match(/^\\/api\\/([^\\/]+)(\\/(.+))?/);
      if (!apiMatch) {
        return originalURL;
      }
      
      const routeName = apiMatch[1];
      const endpoint = apiMatch[3];
      
      if (!knownRoutes.includes(routeName)) {
        return originalURL;
      }
      
      const routeCode = customHash(routeName, routeSeed);
      let obfuscatedPath = '/api/x/' + routeCode;
      
      if (endpoint) {
        const endpointParts = endpoint.split('/');
        const obfuscatedParts = [];
        
        for (const part of endpointParts) {
          if (part && part.trim() !== '') {
            if (knownParams.includes(part)) {
              const paramCode = customHash(part, paramSeed);
              obfuscatedParts.push(paramCode);
            } else {
              obfuscatedParts.push(part);
            }
          }
        }
        
        if (obfuscatedParts.length > 0) {
          obfuscatedPath += '/' + obfuscatedParts.join('/');
        }
      }
      
      const obfuscatedURL = url.origin + obfuscatedPath + url.search + url.hash;
      return obfuscatedURL;
      
    } catch (error) {
      return originalURL;
    }
  }
  
  const originalFetch = window.fetch;
  
  window.fetch = function(url, options = {}) {
    if (isObfuscating) {
      return originalFetch.call(this, url, options);
    }
    
    try {
      isObfuscating = true;
      
      const obfuscatedURL = obfuscateURL(url);
      
      if (window.csrfUtils && window.csrfUtils.fetch) {
        return window.csrfUtils.fetch(obfuscatedURL, options);
      }
      
      return originalFetch.call(this, obfuscatedURL, options);
      
    } finally {
      isObfuscating = false;
    }
  };
  
  const originalXMLHttpRequest = window.XMLHttpRequest;
  const originalOpen = originalXMLHttpRequest.prototype.open;
  
  originalXMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    if (!isObfuscating && typeof url === 'string') {
      const obfuscatedURL = obfuscateURL(url);
      return originalOpen.call(this, method, obfuscatedURL, async, user, password);
    }
    return originalOpen.call(this, method, url, async, user, password);
  };
  
  if (window.axios) {
    window.axios.interceptors.request.use(function(config) {
      if (!isObfuscating && config.url) {
        config.url = obfuscateURL(config.url);
      }
      return config;
    });
  }
  
  if (window.location.hostname === 'localhost') {
    window.routeProtectionDebug = {
      testURL: function(url) {
        console.log('Original:', url);
        console.log('Protegida:', obfuscateURL(url));
      },
      
      testRoutes: function() {
        const tests = [
          'http://localhost:5000/api/usuarios/login',
          'http://localhost:5000/api/usuarios/verifyPassword',
          'http://localhost:5000/api/usuarios/auth-status',
          'http://localhost:5000/api/openai/query-Agent',
          'http://localhost:5000/api/admin/argentina/stats'
        ];
        tests.forEach(url => this.testURL(url));
      },
      
      testFetch: async function() {
        try {
          const response = await fetch('/api/usuarios/auth-status');
        } catch (error) {
          console.error('Error en fetch:', error);
        }
      }
    };
  }
  
})();
`;
}

// ✅ PROCESO PRINCIPAL MEJORADO CON MÓDULOS
async function processAllFiles() {
  console.log('🚀 Starting MODULAR build process with AGGRESSIVE minification...\n');
  
  // Limpiar directorios
  [distJsDir, distCssDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(dir, { recursive: true });
  });

  // Generar protección de rutas API
  if (CONFIG.api_route_protection) {
    generateAlgorithmicRouteDecoder();
    
    const apiSecurityScript = createSecureApiObfuscationScript();
    // 🆕 CAMBIO: Usar nombre ofuscado en lugar de "api-secure.js"
    fs.writeFileSync(path.join(distJsDir, API_SECURITY_FILENAME), apiSecurityScript);
    console.log(`✅ API Security script created: ${API_SECURITY_FILENAME} (ALGORITHMIC - SECURE)`);
  }
  
  // Crear script de protección básica
  if (CONFIG.anti_debug_basic) {
    const protectionScript = addBasicAntiDebug();
    fs.writeFileSync(path.join(distJsDir, 'protection.js'), protectionScript);
    console.log('✅ Protection script created');
  }
  
  // 🆕 PROCESAR ARCHIVOS MODULARES
  const jsResults = await processAllModularFiles();
  
  // 🆕 COPIAR ARCHIVOS ESTÁTICOS
  copyStaticAssets();
  
  // Procesar CSS
  const cssFiles = glob.sync(path.join(publicDir, 'css/**/*.css'));
  console.log(`🎨 Processing ${cssFiles.length} CSS files with AGGRESSIVE minification...`);
  
  let cssProcessed = 0;
  for (const file of cssFiles) {
    if (processCSSFile(file)) cssProcessed++;
  }
  
  console.log(`\n✅ JS: ${jsResults.jsProcessed}/${jsResults.jsTotal} archivos (${jsResults.modularFiles} modulares, ${jsResults.nonModularFiles} no modulares)`);
  console.log(`✅ CSS: ${cssProcessed}/${cssFiles.length} archivos`);
  
  return { 
    jsProcessed: jsResults.jsProcessed, 
    cssProcessed,
    modularFiles: jsResults.modularFiles
  };
}

// ✅ ACTUALIZAR HTML CON MAPEO MODULAR
function updateHTMLFiles() {
  const htmlFiles = [
    ...glob.sync(path.join(viewsDir, '**/*.html')),
    ...glob.sync(path.join(frontendDir, '*.html'))
  ];
  
  console.log(`\n📄 Updating ${htmlFiles.length} HTML files...`);
  
  let totalUpdates = 0;
  
  htmlFiles.forEach(filePath => {
  try {
    // 🆕 AGREGAR: Hacer backup ANTES de modificar
    const backupMade = backupHtmlFile(filePath);
    if (backupMade) {
      console.log(`💾 Backup: ${path.basename(filePath)}`);
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updates = 0;
      
      // Actualizar referencias JS (incluyendo modulares)
      const allJsMappings = { ...fileMapping.js };
      
      // Agregar mapeos modulares al mapeo general
      moduleMapping.fileNames.forEach((obfuscatedName, originalPath) => {
        const fileName = path.basename(originalPath);
        allJsMappings[fileName] = obfuscatedName;
        
        // También mapear rutas relativas
        const relativePath = path.relative(publicDir, originalPath);
        allJsMappings[relativePath] = obfuscatedName;
      });
      
      Object.entries(allJsMappings).forEach(([original, newName]) => {
        const fileName = path.basename(original);
        
        const patterns = [
          new RegExp(`src=["']/scripts/${fileName}["']`, 'g'),
          new RegExp(`src=["']scripts/${fileName}["']`, 'g'),
          new RegExp(`src=["']\\./scripts/${fileName}["']`, 'g'),
          // Para archivos modulares en subcarpetas
          new RegExp(`src=["']/scripts/[^"']*/${fileName}["']`, 'g'),
          new RegExp(`src=["']scripts/[^"']*/${fileName}["']`, 'g')
        ];
        
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            content = content.replace(pattern, `src="/dist/js/${newName}"`);
            updates++;
          }
        });
      });
      
      // Actualizar CSS
      Object.entries(fileMapping.css).forEach(([original, newName]) => {
        const fileName = path.basename(original);
        
        const patterns = [
          new RegExp(`href=["']/css/${fileName}["']`, 'g'),
          new RegExp(`href=["']css/${fileName}["']`, 'g'),
          new RegExp(`href=["']\\./css/${fileName}["']`, 'g')
        ];
        
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            content = content.replace(pattern, `href="/dist/css/${newName}"`);
            updates++;
          }
        });
      });
      
      // 🆕 CAMBIO: Usar nombre ofuscado en lugar de "api-secure.js"
      if (CONFIG.api_route_protection && !content.includes(API_SECURITY_FILENAME)) {
        content = content.replace('<head>', `<head>\n  <script src="/dist/js/${API_SECURITY_FILENAME}"></script>`);
        updates++;
      }
      
      if (CONFIG.anti_debug_basic && !content.includes('protection.js')) {
        content = content.replace(new RegExp(`<script src="/dist/js/${API_SECURITY_FILENAME}"></script>`), 
          `<script src="/dist/js/${API_SECURITY_FILENAME}"></script>\n  <script src="/dist/js/protection.js"></script>`);
        updates++;
      }
      
      if (updates > 0) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${path.basename(filePath)} (${updates} changes)`);
        totalUpdates += updates;
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  });
  
  console.log(`\n✅ Total HTML updates: ${totalUpdates}`);
}

// 🔧 NUEVA FUNCIÓN DE MINIFICACIÓN CONSERVADORA PARA ARCHIVOS MATEMÁTICOS
function conservativeMathMinify(content) {
  try {
    return content
      // Remover comentarios HTML (pero no los que están dentro de math)
      .replace(/<!--(?!\[if\s)(?!.*math)[\s\S]*?-->/g, '')
      // Colapsar espacios en blanco múltiples (conservadoramente)
      .replace(/\n\s+\n/g, '\n')
      // Remover espacios al inicio y final de líneas (conservadoramente)
      .replace(/^\s+|\s+$/gm, '')
      // NO remover espacios entre tags para preservar estructura matemática
      .trim();
  } catch (error) {
    console.warn('Error en minificación conservadora:', error.message);
    return content;
  }
}

// 🔧 REEMPLAZAR LA FUNCIÓN preprocessHTML EXISTENTE
function preprocessHTML(content, fileName) {
  try {
    console.log(`🔍 Pre-procesando HTML: ${fileName}`);
    
    // 🆕 PASO 1: Proteger contenido matemático ANTES de cualquier procesamiento
    const { content: protectedContent, protectedSections } = protectMathContent(content);
    
    // PASO 2: Procesar contenido no matemático (como antes)
    let processedContent = protectedContent;
    
    // Preservar secciones de servidor (EJS/ERB)
    const serverSections = [];
    let serverCounter = 0;
    
    processedContent = processedContent.replace(/<%[\s\S]*?%>/g, (match) => {
      const placeholder = `__SERVER_${serverCounter++}__`;
      serverSections.push({ placeholder, content: match });
      return placeholder;
    });
    
    // Limpiar espacios en blanco excesivos (pero conservadoramente)
    processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    processedContent = processedContent.replace(/^\uFEFF/, ''); // BOM
    
    // Restaurar secciones de servidor
    serverSections.forEach(({ placeholder, content: originalContent }) => {
      processedContent = processedContent.replace(placeholder, originalContent);
    });
    
    // 🆕 PASO 3: Restaurar contenido matemático DESPUÉS del procesamiento
    processedContent = restoreMathContent(processedContent, protectedSections);
    
    console.log(`  ✅ ${fileName} pre-procesado correctamente`);
    return processedContent;
    
  } catch (error) {
    console.warn(`⚠️ Error pre-procesando HTML ${fileName}:`, error.message);
    return content; // Devolver original si falla
  }
}

// 🔧 MEJORAR minifyHTMLFiles CON MEJOR MANEJO DE ERRORES MATEMÁTICOS
async function minifyHTMLFiles() {
  if (!CONFIG.minify_html) {
    console.log('\nℹ️ HTML minification disabled');
    return;
  }
  
  const htmlFiles = [
    ...glob.sync(path.join(viewsDir, '**/*.html')),
    ...glob.sync(path.join(frontendDir, '*.html'))
  ];
  
  console.log(`\n🗜️ Minifying ${htmlFiles.length} HTML files...`);
  
  let minifiedCount = 0;
  
  for (const filePath of htmlFiles) {
    try {
      const fileName = path.basename(filePath);
      const originalContent = fs.readFileSync(filePath, 'utf8');
      
      console.log(`  🔄 Procesando: ${fileName}`);
      
      // 🆕 DETECTAR SI ES ARCHIVO CON CONTENIDO MATEMÁTICO
      const hasMathContent = (
        originalContent.includes('data-latex') ||
        originalContent.includes('math-preview') ||
        originalContent.includes('math-btn') ||
        fileName.includes('fisica') ||
        fileName.includes('matematico') ||
        fileName.includes('agente')
      );
      
      if (hasMathContent) {
        console.log(`    🧮 Archivo matemático detectado: ${fileName}`);
      }
      
      let processedContent = preprocessHTML(originalContent, fileName);
      
      // 🆕 OPCIONES DE MINIFICACIÓN ESPECÍFICAS PARA ARCHIVOS MATEMÁTICOS
      const minifyOptions = {
        collapseWhitespace: true,
        removeEmptyAttributes: false, // 🔧 CAMBIO: Mantener atributos vacíos en archivos matemáticos
        removeRedundantAttributes: !hasMathContent, // 🔧 CAMBIO: No remover en archivos matemáticos
        removeComments: CONFIG.remove_comments,
        removeCommentsFromCDATA: false,
        minifyCSS: false,
        minifyJS: false,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        removeEmptyElements: false,
        removeOptionalTags: false,
        minifyURLs: false,
        sortAttributes: false,
        sortClassName: false,
        // 🆕 IGNORAR FRAGMENTOS MATEMÁTICOS ESPECÍFICOS
        ignoreCustomFragments: [
          /<%[\s\S]*?%>/,
          /<\?[\s\S]*?\?>/,
          /\\[a-zA-Z]+\{[^}]*\}/g, // LaTeX commands
          /\\[a-zA-Z]+/g, // Simple LaTeX commands
          /data-latex="[^"]*"/gi, // data-latex attributes
          /<span[^>]*class="math-preview"[^>]*>.*?<\/span>/gs, // Math preview spans
          /\\\w+/g, // Backslash commands
        ],
        caseSensitive: true, // 🔧 CAMBIO: Mantener sensibilidad para LaTeX
        keepClosingSlash: true,
        preserveLineBreaks: false,
        removeAttributeQuotes: false, // 🔧 CAMBIO: Mantener comillas en atributos
        removeTagWhitespace: false,
        html5: true,
        decodeEntities: false, // 🔧 CAMBIO: No decodificar entidades matemáticas
        processScripts: [],
        processConditionalComments: false
      };
      
      try {
        const minifiedContent = await minifyHTML(processedContent, minifyOptions);
        const reductionPercent = (1 - minifiedContent.length/originalContent.length) * 100;
        
        if (minifiedContent.length < originalContent.length && reductionPercent > 3) { // 🔧 CAMBIO: Umbral más bajo para archivos matemáticos
          fs.writeFileSync(filePath, minifiedContent);
          console.log(`    ✅ ${fileName}: ${originalContent.length} → ${minifiedContent.length} chars (${Math.round(reductionPercent)}% reducción)`);
          minifiedCount++;
        } else {
          console.log(`    ⚠️ ${fileName}: Reducción mínima, manteniendo original`);
        }
        
      } catch (minifyError) {
        console.error(`    ❌ Error minificando ${fileName}:`, minifyError.message);
        
        // 🆕 FALLBACK MEJORADO PARA ARCHIVOS MATEMÁTICOS
        if (hasMathContent) {
          console.log(`    🔧 Aplicando minificación conservadora para archivo matemático...`);
          try {
            const conservativeMinified = conservativeMathMinify(processedContent);
            if (conservativeMinified.length < originalContent.length) {
              fs.writeFileSync(filePath, conservativeMinified);
              console.log(`    ✅ ${fileName}: Minificación conservadora aplicada`);
              minifiedCount++;
            } else {
              console.log(`    ℹ️ ${fileName}: Manteniendo original`);
            }
          } catch (conservativeError) {
            console.log(`    ⚠️ ${fileName}: Manteniendo original completamente`);
          }
        } else {
          // Para archivos no matemáticos, usar minificación básica
          try {
            const basicMinified = basicHTMLMinify(processedContent);
            if (basicMinified.length < originalContent.length) {
              fs.writeFileSync(filePath, basicMinified);
              console.log(`    🔧 ${fileName}: Minificación básica aplicada`);
              minifiedCount++;
            }
          } catch (basicError) {
            console.log(`    ⚠️ ${fileName}: Manteniendo original completamente`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error procesando HTML ${path.basename(filePath)}:`, error.message);
    }
  }
  
  console.log(`\n✅ HTML files minified: ${minifiedCount}/${htmlFiles.length}`);
}

function basicHTMLMinify(content) {
  try {
    return content
      .replace(/<!--(?!\[if\s)[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/gm, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/>\s+</g, '><')
      .trim();
  } catch (error) {
    console.warn('Error en minificación básica:', error.message);
    return content;
  }
}

// ✅ GUARDAR MAPEO EXTENDIDO CON INFORMACIÓN MODULAR + ASSETS
function saveMapping() {
  const mapping = {
    buildId: BUILD_ID,
    timestamp: Date.now(),
    files: fileMapping,
    apiProtection: CONFIG.api_route_protection,
    // 🆕 INFORMACIÓN MODULAR + ASSETS
    modularInfo: {
      enabled: CONFIG.modular_obfuscation,
      totalModules: moduleMapping.fileNames.size,
      preserveStructure: CONFIG.preserve_module_structure,
      protectedFiles: CONFIG.protected_files.length,
      staticAssets: CONFIG.copy_static_assets,
      cssAssetPaths: CONFIG.update_css_asset_paths,
      modules: {}
    },
    // 🆕 NUEVO: Incluir nombre del archivo de seguridad ofuscado
    securityFile: {
      originalName: 'api-secure.js',
      obfuscatedName: API_SECURITY_FILENAME,
      timestamp: Date.now()
    }
  };
  
  // Añadir información de módulos al mapeo
  moduleMapping.fileNames.forEach((obfuscatedName, originalPath) => {
    const fileName = path.basename(originalPath);
    mapping.modularInfo.modules[fileName] = {
      obfuscatedName: obfuscatedName,
      originalPath: originalPath,
      isModular: true,
      isProtected: CONFIG.protected_files.includes(fileName)
    };
  });
  
  fs.writeFileSync(
    path.join(distDir, 'mapping.json'),
    JSON.stringify(mapping, null, 2)
  );
  
  // Guardar mapeo de módulos por separado para debugging
  const moduleInfo = {
    buildId: BUILD_ID,
    protectedFiles: CONFIG.protected_files,
    staticAssets: CONFIG.static_assets,
    securityFileName: API_SECURITY_FILENAME, // 🆕 NUEVO: Incluir nombre ofuscado
    moduleMapping: {
      fileNames: Object.fromEntries(moduleMapping.fileNames),
      imports: Object.fromEntries(moduleMapping.imports),
      exports: Object.fromEntries(moduleMapping.exports),
      dependencies: Object.fromEntries(
        Array.from(moduleMapping.dependencies.entries()).map(([key, value]) => [
          key, Array.from(value)
        ])
      )
    }
  };
  
  fs.writeFileSync(
    path.join(distDir, 'module-mapping.json'),
    JSON.stringify(moduleInfo, null, 2)
  );
  
  console.log('✅ Mapping saved (including modular info + assets + obfuscated security file)');
}

// ✅ FUNCIÓN PRINCIPAL MEJORADA
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 BUILD MODULAR CON OFUSCACIÓN COMPLETA INICIANDO...');
    console.log(`🔑 Build ID: ${BUILD_ID}`);
    console.log(`🗜️ Minificación: JS ✅ CSS ✅ HTML ✅`);
    console.log(`🎭 Ofuscación modular: ${CONFIG.modular_obfuscation ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🤫 Ofuscación de logs: ${CONFIG.obfuscate_log_messages ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🧹 Limpiar debug logs: ${CONFIG.remove_debug_logs ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🧮 Protección matemática: ${MATH_PROTECTION_CONFIG.preserve_math_content ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔒 Archivo de seguridad: ${API_SECURITY_FILENAME} (OFUSCADO)\n`);
    
    // Procesar archivos
    const results = await processAllFiles();
    
    // Actualizar HTML con referencias
    updateHTMLFiles();
    
    // Minificar HTML
    await minifyHTMLFiles();
    
    // Guardar mapeo
    saveMapping();
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n🎉 BUILD MODULAR COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📦 JS files: ${results.jsProcessed} (${results.modularFiles} modulares)`);
    console.log(`🎨 CSS files: ${results.cssProcessed} (minified in one line)`);
    console.log(`📄 HTML files: minified + compressed`);
    console.log(`📁 Static assets: fonts, sounds, images copiados automáticamente`);
    console.log(`🛡️  API Protection: ${CONFIG.api_route_protection ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔒 Security file: ${API_SECURITY_FILENAME} (STEALTH MODE)`);
    console.log(`🗜️ Comments removed: ${CONFIG.remove_comments ? 'YES' : 'NO'}`);
    console.log(`🤫 Debug logs ofuscados: ${CONFIG.obfuscate_log_messages ? 'YES' : 'NO'}`);
    console.log(`🧮 Contenido matemático: PROTEGIDO`);
    console.log(`🔑 Build ID: ${BUILD_ID}`);
    
    console.log('\n💡 ¡NUEVA! Ofuscación modular + Assets automáticos + Protección matemática:');
    console.log('💡 • Módulos ES6: Imports/exports actualizados automáticamente');
    console.log('💡 • Imports dinámicos: import("path") actualizado automáticamente');
    console.log('💡 • Búsqueda inteligente: Archivos encontrados automáticamente');
    console.log('💡 • Archivos shared: Detectados y ofuscados correctamente');
    console.log('💡 • Archivos protegidos: csrf-utils.js y otros críticos preservados');
    console.log('💡 • Assets estáticos: Fonts, sounds, images copiados a /dist/');
    console.log('💡 • Rutas CSS actualizadas: url() apuntan a assets correctos');
    console.log('💡 • Logs de debug: Mensajes ofuscados (🔍, 📦, etc.)');
    console.log('💡 • Dependencias: Grafo mapeado y procesado en orden');
    console.log('💡 • Estructura: Todo aplanado en /dist/js/ con nombres únicos');
    console.log('💡 • 🧮 NUEVO: Contenido matemático (LaTeX) protegido automáticamente');
    console.log('💡 • 🧮 NUEVO: Fallback conservador para archivos con fórmulas');
    console.log('💡 • 🧮 NUEVO: data-latex y math-preview preservados intactos');
    console.log(`💡 • 🔒 NUEVO: Archivo de seguridad ofuscado como ${API_SECURITY_FILENAME}`);
    console.log('💡 • 🔇 NUEVO: Logs de consola removidos del script de seguridad');
    
    console.log('\n💡 Configuración de logging:');
    console.log(`💡 • Verbose import logging: ${CONFIG.verbose_import_logging ? 'ENABLED' : 'DISABLED'}`);
    console.log(`💡 • Dynamic import warnings: ${CONFIG.show_dynamic_import_warnings ? 'ENABLED' : 'DISABLED'}`);
    console.log(`💡 • Search success logging: ${CONFIG.show_search_successes ? 'ENABLED' : 'DISABLED'}`);
    
    console.log('\n💡 Para revertir:');
    console.log('💡 node revert-build.js');
    
    console.log('\n🔒 Seguridad mejorada:');
    console.log(`🔒 • Archivo api-secure.js renombrado a: ${API_SECURITY_FILENAME}`);
    console.log('🔒 • Todos los console.log removidos del script de seguridad');
    console.log('🔒 • Solo funcionalidad de debug disponible en localhost');
    console.log('🔒 • Protección algorítmica sin mapas expuestos');
    
  } catch (error) {
    console.error('❌ BUILD FAILED:', error);
    process.exit(1);
  }
}

// Ejecutar
main();