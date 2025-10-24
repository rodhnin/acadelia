// backend/lib/dbPool.js - CONFIGURACIÓN PERFECTA PARA SUPABASE Y CONEXIONES LENTAS
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;

// Configurar la ruta del archivo .env desde este archivo hasta la raíz
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar dotenv desde la raíz del proyecto (2 niveles arriba: backend/lib -> raíz)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 🚀 CONFIGURACIÓN ÓPTIMA PARA MÚLTIPLES QUERIES Y CONEXIONES LENTAS - OPTIMIZADA PARA 50+ CHATS
const pool = new Pool({
  host: process.env.SUPABASE_HOST,
  port: parseInt(process.env.SUPABASE_PORT),
  database: process.env.SUPABASE_DATABASE,
  user: process.env.SUPABASE_USER,
  password: process.env.SUPABASE_PASSWORD,
 
  // 🔧 POOL OPTIMIZADO PARA MÚLTIPLES CHATS Y USUARIOS ACTIVOS
  max: 50,                     // 50 conexiones máximo (más para 50+ chats)
  min: 10,                     // 10 conexiones siempre disponibles
  idleTimeoutMillis: 30000,    // 30 segundos antes de cerrar conexión inactiva
 
  // ⏰ TIMEOUTS PARA SISTEMA DE CHATS CON MUCHOS USUARIOS
  connectionTimeoutMillis: 15000,  // 15 segundos para conectar (más rápido)
  statement_timeout: 20000,        // 20 segundos para queries
  query_timeout: 20000,           // 20 segundos timeout total
 
  // 🔄 CONFIGURACIÓN DE CONEXIÓN ROBUSTA
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
 
  // 🏷️ IDENTIFICACIÓN LIMPIA
  application_name: 'acadelia',
 
  // 🔒 SSL PARA SUPABASE
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 📊 ESTADÍSTICAS BÁSICAS (SIN LOGS)
let connectionCount = 0;
let errorCount = 0;

// 🎯 FUNCIÓN DE ESTADÍSTICAS PARA DEBUG MANUAL
const getPoolStats = () => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
  connections: connectionCount,
  errors: errorCount
});

// 🔧 EVENTO DE CONEXIÓN EXITOSA (SOLO CUENTA)
pool.on('connect', () => {
  connectionCount++;
});

// 🔧 EVENTO DE ERROR (SOLO CUENTA)
pool.on('error', (err) => {
  errorCount++;
  // Solo log errores críticos del pool
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
    console.error('❌ Pool connection error:', err.code);
  }
});

// 🚀 INICIALIZACIÓN SILENCIOSA CON VERIFICACIÓN
const initializePool = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ PostgreSQL pool ready');
  } catch (err) {
    console.error('❌ Pool initialization failed:', err.message);
  }
};

// 🎯 CIERRE LIMPIO
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('✅ Pool closed');
  } catch (err) {
    console.error('❌ Error closing pool');
  }
  process.exit(0);
});

// 🔄 INICIALIZAR
initializePool();

// 📊 EXPORTAR POOL CON ESTADÍSTICAS
pool.getStats = getPoolStats;
export default pool;