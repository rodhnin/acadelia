// utils/securityDiagnostic.js
import pool from '../lib/dbPool.js';
import { logSecurityEvent } from './securityLogger.js';

/**
 * Ejecuta una serie de diagnósticos para verificar el sistema de logging de seguridad
 */
export const runSecurityDiagnostics = async () => {
  console.log('🔍 Iniciando diagnóstico del sistema de seguridad...');
  
  // 1. Verificar existencia de la tabla
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'security_events'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabla security_events existe');
    } else {
      console.error('❌ ERROR: Tabla security_events NO existe');
      console.log('Ejecuta el script SQL para crearla:');
      console.log(`
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}'::jsonb,
          severity VARCHAR(20) NOT NULL DEFAULT 'info',
          user_id INTEGER NULL REFERENCES usuario(id_user),
          ip_address VARCHAR(45) NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          archived BOOLEAN DEFAULT FALSE
        );
      `);
      return;
    }
  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
    return;
  }
  
  // 2. Verificar permisos de inserción 
  try {
    const testEvent = {
      event_type: 'DIAGNOSTIC_TEST',
      message: 'Test de diagnóstico',
      data: JSON.stringify({ test: true, timestamp: Date.now() }),
      severity: 'info',
      user_id: null,
      ip_address: '127.0.0.1'
    };
    
    const insertResult = await pool.query(`
      INSERT INTO security_events(event_type, message, data, severity, user_id, ip_address) 
      VALUES($1, $2, $3::jsonb, $4, $5, $6) 
      RETURNING id
    `, [
      testEvent.event_type,
      testEvent.message,
      testEvent.data,
      testEvent.severity,
      testEvent.user_id,
      testEvent.ip_address
    ]);
    
    if (insertResult.rows[0].id) {
      console.log(`✅ Inserción prueba exitosa - ID: ${insertResult.rows[0].id}`);
    } else {
      console.error('❌ ERROR: Inserción de prueba falló sin error explícito');
    }
  } catch (error) {
    console.error('❌ ERROR: No se puede insertar en security_events:', error);
    return;
  }
  
  // 3. Verificar función logSecurityEvent
  try {
    await logSecurityEvent(
      'DIAGNOSTIC_TEST',
      'Prueba de función logSecurityEvent',
      { test: true, source: 'diagnostic' },
      'info',
      null,
      '127.0.0.1'
    );
    
    console.log('✅ Llamada a logSecurityEvent completada');
    
    // Verificar si realmente se guardó
    const checkResult = await pool.query(`
      SELECT COUNT(*) 
      FROM security_events 
      WHERE event_type = 'DIAGNOSTIC_TEST' 
      AND message = 'Prueba de función logSecurityEvent'
    `);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      console.log('✅ Verificado: el evento de prueba se guardó correctamente');
    } else {
      console.error('❌ ERROR: El evento de prueba NO se guardó en la base de datos');
      console.log('Esto sugiere un problema en el servicio de seguridad');
    }
  } catch (error) {
    console.error('❌ ERROR en logSecurityEvent:', error);
  }
  
  // 4. Verificar contenido actual de la tabla
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM security_events');
    console.log(`ℹ️ Total de eventos guardados: ${countResult.rows[0].count}`);
    
    const recentResult = await pool.query(`
      SELECT event_type, created_at
      FROM security_events
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (recentResult.rows.length > 0) {
      console.log('ℹ️ Últimos 5 eventos:');
      recentResult.rows.forEach(row => {
        console.log(`  - ${row.event_type} (${row.created_at})`);
      });
    } else {
      console.log('ℹ️ No hay eventos registrados (excepto las pruebas recientes)');
    }
  } catch (error) {
    console.error('❌ Error consultando eventos:', error);
  }
  
  console.log('🔍 Diagnóstico completo');
};

// Exportar una versión simplificada para uso directo
export const testSecurityEvent = async () => {
  try {
    console.log('🔍 Probando registro de evento de seguridad...');
    
    // Crear evento de prueba
    await logSecurityEvent(
      'MANUAL_TEST',
      'Prueba manual de evento de seguridad',
      { source: 'manual_test', timestamp: new Date().toISOString() },
      'info',
      null,
      '127.0.0.1'
    );
    
    // Verificar si se guardó
    const result = await pool.query(`
      SELECT COUNT(*) 
      FROM security_events 
      WHERE event_type = 'MANUAL_TEST' 
      AND created_at > NOW() - INTERVAL '1 minute'
    `);
    
    if (parseInt(result.rows[0].count) > 0) {
      console.log('✅ Evento de prueba registrado correctamente');
      return true;
    } else {
      console.error('❌ El evento de prueba NO se guardó');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en prueba de seguridad:', error);
    return false;
  }
};

export default {
  runSecurityDiagnostics,
  testSecurityEvent
};