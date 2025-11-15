import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.SUPABASE_HOST,
  port: parseInt(process.env.SUPABASE_PORT),
  database: process.env.SUPABASE_DATABASE,
  user: process.env.SUPABASE_USER,
  password: process.env.SUPABASE_PASSWORD,
 
  max: 50,                     // 50 conexiones máximo (más para 50+ chats)
  min: 10,                     // 10 conexiones siempre disponibles
  idleTimeoutMillis: 30000,    // 30 segundos antes de cerrar conexión inactiva
 
  // ⏰ TIMEOUTS PARA SISTEMA DE CHATS CON MUCHOS USUARIOS
  connectionTimeoutMillis: 15000,  // 15 segundos para conectar (más rápido)
  statement_timeout: 20000,        // 20 segundos para queries
  query_timeout: 20000,           // 20 segundos timeout total
 
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
 
  application_name: 'acadelia',
 
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let connectionCount = 0;
let errorCount = 0;

const getPoolStats = () => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
  connections: connectionCount,
  errors: errorCount
});

pool.on('connect', () => {
  connectionCount++;
});

pool.on('error', (err) => {
  errorCount++;
  // Solo log errores críticos del pool
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
    console.error('❌ Pool connection error:', err.code);
  }
});

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

process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('✅ Pool closed');
  } catch (err) {
    console.error('❌ Error closing pool');
  }
  process.exit(0);
});

initializePool();

pool.getStats = getPoolStats;
export default pool;