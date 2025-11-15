// Importa la función createClient desde la biblioteca @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';

// URL de la instancia de Supabase que se usará para conectarse a la base de datos
const supabaseUrl = process.env.SUPABASE_URL || `https://${process.env.SUPABASE_HOST?.split('.')[0]}.supabase.co`;

// Clave anónima (anon key) utilizada para la autenticación con la API de Supabase
// Esta clave permite operaciones de lectura/escritura según los permisos configurados en Supabase
const supabaseAnon = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error("Error: SUPABASE_URL y SUPABASE_ANON_KEY deben estar definidas en el archivo .env");
  process.exit(1);
}

// Crea una instancia de cliente de Supabase usando la URL y la clave anónima
// Este cliente se usará para interactuar con la base de datos Supabase
export const supabase = createClient(supabaseUrl, supabaseAnon);