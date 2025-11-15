# Documentación de Base de Datos - Acadelia

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Extensiones de PostgreSQL](#extensiones-de-postgresql)
3. [Esquema de Tablas](#esquema-de-tablas)
4. [Diagrama ER](#diagrama-er)
5. [Índices y Optimizaciones](#índices-y-optimizaciones)

---

## Visión General

Acadelia utiliza **Supabase** (PostgreSQL 14+) como base de datos principal con la extensión **pgvector** para búsquedas vectoriales (RAG).

**Estadísticas**:
- **82 tablas** en total
- **40+ tablas de embeddings** (una por agente/materia)
- **Vector dimension**: 1536 (OpenAI text-embedding-ada-002)
- **Schemas**: public, auth, storage, realtime, vault

---

## Extensiones de PostgreSQL

```sql
-- Extensiones habilitadas en Supabase
CREATE EXTENSION IF NOT EXISTS vector;              -- Búsqueda vectorial (RAG)
CREATE EXTENSION IF NOT EXISTS pg_cron;             -- Jobs programados
CREATE EXTENSION IF NOT EXISTS pgcrypto;            -- Funciones criptográficas
CREATE EXTENSION IF NOT EXISTS pgjwt;               -- JSON Web Tokens
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- Estadísticas de queries
CREATE EXTENSION IF NOT EXISTS supabase_vault;      -- Gestión de secretos
CREATE EXTENSION IF NOT EXISTS pgsodium;            -- Criptografía moderna
CREATE EXTENSION IF NOT EXISTS pg_graphql;          -- Soporte GraphQL
```

---

## Esquema de Tablas

### 📊 Categorización de Tablas

#### 1. **Sistema de Usuarios y Autenticación** (10 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `usuario` | Usuarios de la plataforma | id, email, password_hash, plan, created_at |
| `perfil` | Perfiles extendidos de usuario | user_id, nombre, apellido, avatar_url |
| `rol` | Roles del sistema | id, nombre (admin, user, premium) |
| `cookie_consent` | Consentimientos de cookies | user_id, analytics, marketing, accepted_at |
| `account_deletion_requests` | Solicitudes de eliminación de cuenta | user_id, reason, requested_at, scheduled_deletion |
| `deleted_accounts` | Registro de cuentas eliminadas | email, deleted_at, reason |
| `deletion_log` | Log de eliminaciones | user_id, action, timestamp |
| `activity_log` | Log de actividad de usuarios | user_id, action, ip_address, timestamp |
| `login_attempts` | Intentos de login | email, ip_address, success, timestamp |
| `terms_acceptances` | Aceptación de términos | user_id, version, accepted_at |

**Relaciones Clave**:
```sql
usuario (1) ──< (N) perfil
usuario (1) ──< (N) cookie_consent
usuario (1) ──< (N) activity_log
```

---

#### 2. **Sistema de Chat y Conversaciones** (4 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `chat` | Chats creados por usuarios | id, user_id, ava_id, herramienta_id, title, created_at |
| `chat_history` | Historial de mensajes | id, chat_id, role (user/assistant), content, metadata, created_at |
| `ava` | Agentes virtuales académicos | id, nombre, descripcion, tipo (matematico/teorico), carrera_id |
| `herramienta` | Herramientas (PDF, Agente) | id, nombre, descripcion, tipo |

**Relaciones Clave**:
```sql
chat (N) ──> (1) usuario
chat (N) ──> (1) ava
chat (N) ──> (1) herramienta
chat (1) ──< (N) chat_history
ava (N) ──> (1) carrera
```

**Ejemplo de registro en chat_history**:
```json
{
  "id": "uuid",
  "chat_id": "uuid",
  "role": "assistant",
  "content": "La derivada de x² es 2x",
  "metadata": {
    "tokens_used": 450,
    "model": "gpt-4o",
    "references": [...],
    "tools_used": ["wolfram"]
  }
}
```

---

#### 3. **Sistema RAG - Tablas de Embeddings** (40+ tablas)

Todas las tablas de embeddings siguen la misma estructura:

```sql
CREATE TABLE public.emb_{materia} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,           -- Contenido textual
  embedding VECTOR(1536),           -- Vector embedding (OpenAI)
  metadata JSONB,                   -- Metadata adicional
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX ON emb_{materia} USING ivfflat (embedding vector_cosine_ops);
```

**Tablas de Embeddings por Área**:

**Ingeniería** (11 tablas):
- `emb_algebra`
- `emb_calculo`
- `emb_fisica`
- `emb_quimica`
- `emb_estadistica`
- `emb_electricidad`
- `emb_matematicaavz` (matemáticas avanzadas)
- `emb_computacion`
- `emb_redes` (redes y seguridad)
- `emb_resismateriales` (resistencia de materiales)

**Medicina** (10 tablas):
- `emb_patologia`
- `emb_semiologia`
- `emb_cienciasbasicas`
- `emb_cienciasaplicadas`
- `emb_medicinainterna`
- `emb_cirugia` (cirugía y urgencias)
- `emb_especialidmed1`
- `emb_especialidmed2`
- `emb_epidemiologia`
- `emb_medicinamat` (matemática médica)

**Economía** (10 tablas):
- `emb_microeconomia`
- `emb_macroeconomia`
- `emb_econometria`
- `emb_economia_internacional`
- `emb_economialaboral`
- `emb_finanzas`
- `emb_sectorpublico`
- `emb_historiaeconomica`
- `emb_desarrolloeconomico`
- `emb_calculoeconomico`

**Psicología** (10 tablas):
- `emb_dsm5`
- `emb_psicoanalisis`
- `emb_neuropsicologia`
- `emb_psicologiaev` (psicología evolutiva)
- `emb_psicologiageneral`
- `emb_psicologiasocial`
- `emb_psicopatologia`
- `emb_psicdiagnostico`
- `emb_psicoestadistica`
- `emb_epistemologia`

**Herramientas** (2 tablas relacionadas):
- `agentetube` (procesa YouTube/audio/video)
- `pdfs` (procesa documentos PDF)

---

#### 4. **Sistema de Marketing** (5 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `marketing_trends` | Tendencias detectadas | id, trend_name, embedding, metadata, score |
| `marketing_profiles` | Perfiles de audiencia | id, profile_name, demographics, interests |
| `marketing_contents` | Contenido generado | id, content_type, content, channel, performance |
| `marketing_memory` | Memoria del agente | id, concept, embedding, relationships, created_at |
| `marketing_interactions` | Interacciones rastreadas | id, user_query, response, insights |

**Relaciones**:
```sql
marketing_trends (N) ──> (N) marketing_memory  -- Grafo de conocimiento
marketing_contents (N) ──> (1) marketing_profiles
```

---

#### 5. **Sistema de Pagos** (7 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `suscripciones` | Suscripciones activas | user_id, plan, status, paddle_subscription_id |
| `historial_transacciones` | Historial de transacciones | user_id, amount, currency, status, payment_method |
| `payments_arg` | Pagos Argentina (Ualá Bis) | user_id, amount, qr_code, status |
| `subscriptions_arg` | Suscripciones Argentina | user_id, plan, uala_subscription_id |
| `webhook_events_arg` | Webhooks Ualá Bis | event_type, payload, processed |
| `egresos` | Gastos del negocio | monto, categoria_id, descripcion, fecha |
| `categorias_egresos` | Categorías de gastos | nombre, descripcion |

**Relaciones**:
```sql
usuario (1) ──< (N) suscripciones
usuario (1) ──< (N) historial_transacciones
egresos (N) ──> (1) categorias_egresos
```

---

#### 6. **Sistema de Archivos** (3 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `pdfs` | PDFs subidos por usuarios | id, user_id, chat_id, file_name, file_path, ocr_text |
| `file_attachments` | Archivos adjuntos en chats | id, chat_id, file_type, file_url, metadata |
| `agentetube` | Audio/Video procesados | id, chat_id, source_url, transcription, duration |

---

#### 7. **Sistema Administrativo** (8 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `config` | Configuración global | key, value, description |
| `system_config` | Configuración del sistema | setting_name, setting_value, updated_at |
| `security_events` | Eventos de seguridad | event_type, user_id, ip_address, details, severity |
| `scheduled_tasks` | Tareas programadas | task_name, schedule, last_run, next_run |
| `informes` | Informes generados | tipo, contenido, generated_at |
| `feedback` | Feedback de usuarios | user_id, rating, comment, created_at |
| `analisis_impuestos` | Análisis de impuestos | periodo, ingresos, gastos, impuestos_calculados |
| `password_reset_tokens` | Tokens de reset de password | user_id, token, expires_at |

---

#### 8. **Sistema de Referencia** (4 tablas)

| Tabla | Descripción | Campos Principales |
|-------|-------------|-------------------|
| `carrera` | Carreras académicas | id, nombre (Ingeniería, Medicina, etc.) |
| `universidad` | Universidades | id, nombre, pais_id |
| `pais` | Países | id, nombre, codigo |
| `anatomia` | Referencias de anatomía | id, estructura, descripcion |

**Relaciones**:
```sql
universidad (N) ──> (1) pais
ava (N) ──> (1) carrera
```

---

## Diagrama ER (Entidad-Relación)

### Diagrama Simplificado

```
┌─────────────┐         ┌──────────┐         ┌─────────────┐
│   usuario   │────<────│   chat   │────>────│     ava     │
│             │         │          │         │             │
│ - id        │         │ - id     │         │ - id        │
│ - email     │         │ - user_id│         │ - nombre    │
│ - plan      │         │ - ava_id │         │ - tipo      │
└─────┬───────┘         └────┬─────┘         └──────┬──────┘
      │                      │                       │
      │                      │                       │
      ▼                      ▼                       ▼
┌─────────────┐      ┌──────────────┐       ┌─────────────┐
│suscripciones│      │chat_history  │       │  carrera    │
│             │      │              │       │             │
│ - user_id   │      │ - chat_id    │       │ - id        │
│ - plan      │      │ - role       │       │ - nombre    │
│ - status    │      │ - content    │       │             │
└─────────────┘      └──────────────┘       └─────────────┘

┌──────────────────────────────────────────────────────────┐
│            SISTEMA RAG (Vector Database)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ emb_algebra  │  │ emb_calculo  │  │ emb_fisica   │  │
│  │              │  │              │  │              │  │
│  │ - id         │  │ - id         │  │ - id         │  │
│  │ - content    │  │ - content    │  │ - content    │  │
│  │ - embedding  │  │ - embedding  │  │ - embedding  │  │
│  │   VECTOR     │  │   VECTOR     │  │   VECTOR     │  │
│  │   (1536)     │  │   (1536)     │  │   (1536)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ... (40+ tablas más de embeddings)                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              SISTEMA DE MARKETING                        │
│                                                          │
│  ┌──────────────────┐         ┌───────────────────┐     │
│  │marketing_trends  │────<────│ marketing_memory  │     │
│  │                  │         │                   │     │
│  │ - trend_name     │         │ - concept         │     │
│  │ - embedding      │         │ - embedding       │     │
│  │ - score          │         │ - relationships   │     │
│  └──────────────────┘         └───────────────────┘     │
│           │                            │                 │
│           ▼                            ▼                 │
│  ┌──────────────────┐         ┌───────────────────┐     │
│  │marketing_content │         │marketing_profiles │     │
│  └──────────────────┘         └───────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## Índices y Optimizaciones

### Índices Vectoriales (IVFFlat)

Todas las tablas de embeddings tienen índices para búsqueda vectorial:

```sql
-- Índice para búsqueda por similitud de coseno
CREATE INDEX idx_emb_algebra_embedding
ON emb_algebra
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Configuración de parámetros
SET ivfflat.probes = 10;  -- Número de listas a buscar
```

**Explicación**:
- **IVFFlat**: Inverted File with Flat compression
- **Lists**: 100 particiones (ajustable según tamaño de datos)
- **Probes**: Cuántas particiones buscar (trade-off: speed vs accuracy)

### Índices de Texto Completo

Para búsqueda full-text (BM25):

```sql
-- Índice GIN para búsqueda de texto
CREATE INDEX idx_emb_algebra_content_gin
ON emb_algebra
USING gin(to_tsvector('spanish', content));

-- Búsqueda híbrida
SELECT
  content,
  embedding <=> query_embedding AS similarity,
  ts_rank(to_tsvector('spanish', content), query) AS rank
FROM emb_algebra
WHERE to_tsvector('spanish', content) @@ query
  AND embedding <=> query_embedding < 0.4
ORDER BY (similarity * 0.7 + rank * 0.3)
LIMIT 5;
```

### Índices de Relaciones

```sql
-- Índices para joins comunes
CREATE INDEX idx_chat_user_id ON chat(user_id);
CREATE INDEX idx_chat_ava_id ON chat(ava_id);
CREATE INDEX idx_chat_history_chat_id ON chat_history(chat_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);

-- Índices compuestos para queries complejas
CREATE INDEX idx_chat_user_ava ON chat(user_id, ava_id);
CREATE INDEX idx_suscripciones_user_status ON suscripciones(user_id, status);
```

### Particionamiento (Futuro)

Para escalar con grandes volúmenes de datos:

```sql
-- Particionar chat_history por fecha
CREATE TABLE chat_history (
  id UUID,
  chat_id UUID,
  created_at TIMESTAMP,
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE chat_history_2024_01 PARTITION OF chat_history
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE chat_history_2024_02 PARTITION OF chat_history
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

---

## Triggers y Funciones

### Trigger para Updated_at Automático

```sql
-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas relevantes
CREATE TRIGGER update_emb_algebra_updated_at
    BEFORE UPDATE ON emb_algebra
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Función de Búsqueda Híbrida

```sql
-- Función para búsqueda híbrida personalizada
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  table_name TEXT,
  similarity_k INT DEFAULT 3,
  keyword_k INT DEFAULT 2
)
RETURNS TABLE (
  content TEXT,
  metadata JSONB,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    WITH vector_results AS (
      SELECT
        content,
        metadata,
        (embedding <=> $1) AS distance,
        1.0 - (embedding <=> $1) AS similarity
      FROM %I
      ORDER BY distance
      LIMIT $2
    ),
    keyword_results AS (
      SELECT
        content,
        metadata,
        ts_rank(to_tsvector(''spanish'', content), plainto_tsquery(''spanish'', $3)) AS rank
      FROM %I
      WHERE to_tsvector(''spanish'', content) @@ plainto_tsquery(''spanish'', $3)
      ORDER BY rank DESC
      LIMIT $4
    ),
    combined AS (
      SELECT content, metadata, similarity * 1.5 AS score FROM vector_results
      UNION ALL
      SELECT content, metadata, rank * 1.0 AS score FROM keyword_results
    )
    SELECT DISTINCT ON (content) content, metadata, MAX(score) AS score
    FROM combined
    GROUP BY content, metadata
    ORDER BY score DESC
  ', table_name, table_name)
  USING query_embedding, similarity_k, query_text, keyword_k;
END;
$$ LANGUAGE plpgsql;
```

---

## Políticas RLS (Row Level Security)

Ejemplos de políticas de seguridad a nivel de fila:

```sql
-- Habilitar RLS
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propios chats
CREATE POLICY user_own_chats ON chat
  FOR ALL
  USING (auth.uid() = user_id);

-- Política: admins ven todo
CREATE POLICY admin_all_chats ON chat
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuario
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Backups y Mantenimiento

### Estrategia de Backup

```sql
-- Backup completo (ejecutar vía pg_dump)
pg_dump -h localhost -U postgres -d acadelia -F c -f backup.dump

-- Backup solo de datos (sin schema)
pg_dump -h localhost -U postgres -d acadelia -a -F c -f data.dump

-- Backup de tabla específica
pg_dump -h localhost -U postgres -d acadelia -t emb_algebra -F c -f emb_algebra.dump
```

### Vacuum y Analyze

```sql
-- Vacuum regular (recuperar espacio)
VACUUM ANALYZE;

-- Vacuum full (compactar tablas)
VACUUM FULL chat_history;

-- Reindex tablas de embeddings
REINDEX TABLE emb_algebra;
```

---

## Queries Útiles

### Estadísticas de Uso

```sql
-- Chats por usuario
SELECT
  u.email,
  COUNT(c.id) as total_chats,
  COUNT(DISTINCT c.ava_id) as unique_avas
FROM usuario u
LEFT JOIN chat c ON c.user_id = u.id
GROUP BY u.email
ORDER BY total_chats DESC;

-- Mensajes por agente
SELECT
  a.nombre,
  COUNT(ch.id) as total_messages
FROM ava a
JOIN chat c ON c.ava_id = a.id
JOIN chat_history ch ON ch.chat_id = c.id
GROUP BY a.nombre
ORDER BY total_messages DESC;

-- Embeddings count por tabla
SELECT
  'emb_algebra' as table_name,
  COUNT(*) as total_embeddings
FROM emb_algebra
UNION ALL
SELECT 'emb_calculo', COUNT(*) FROM emb_calculo
UNION ALL
SELECT 'emb_fisica', COUNT(*) FROM emb_fisica;
```

### Búsqueda Vectorial

```sql
-- Buscar chunks similares
SELECT
  content,
  metadata,
  (embedding <=> '[0.1, 0.2, ...]'::vector) AS distance
FROM emb_algebra
ORDER BY distance
LIMIT 5;

-- Buscar con threshold
SELECT content
FROM emb_algebra
WHERE (embedding <=> '[0.1, 0.2, ...]'::vector) < 0.6
ORDER BY distance
LIMIT 10;
```

---

## Migraciones

### Agregar Nueva Tabla de Embeddings

```sql
-- Template para nueva materia
CREATE TABLE public.emb_nueva_materia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emb_nueva_materia_embedding
ON emb_nueva_materia
USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_emb_nueva_materia_content
ON emb_nueva_materia
USING gin(to_tsvector('spanish', content));

CREATE TRIGGER update_emb_nueva_materia_updated_at
  BEFORE UPDATE ON emb_nueva_materia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Métricas y Monitoreo

### Tamaño de Tablas

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

### Queries Lentas

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Recursos

- [Supabase Vector Docs](https://supabase.com/docs/guides/ai/vector-columns)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
