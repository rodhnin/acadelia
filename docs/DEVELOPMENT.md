# Guía de Desarrollo de Acadelia

## Tabla de Contenidos

1. [Configuración del Entorno de Desarrollo](#configuración-del-entorno-de-desarrollo)
2. [Estructura del Código](#estructura-del-código)
3. [Sistema RAG en Detalle](#sistema-rag-en-detalle)
4. [Crear un Nuevo Agente](#crear-un-nuevo-agente)
5. [Agregar una Nueva Herramienta](#agregar-una-nueva-herramienta)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Estándares de Código](#estándares-de-código)
9. [Git Workflow](#git-workflow)
10. [Deployment](#deployment)

---

## Configuración del Entorno de Desarrollo

### Requisitos

```bash
# Versiones requeridas
Node.js >= 22
PostgreSQL >= 14
Redis >= 7
ClamAV (latest)
FFmpeg (latest)
```

### Setup Inicial

```bash
# 1. Clonar el repositorio
git clone https://github.com/rodhnin/acadelia.git
cd acadelia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus claves

# 4. Configurar Supabase
# - Crear proyecto en https://supabase.com
# - Importar db/Acadelia-DB.sql en SQL Editor
# - Copiar URL y keys al .env

# 5. Iniciar servicios locales
sudo systemctl start redis-server
sudo systemctl start clamav-daemon

# 6. Iniciar en modo desarrollo
npm run dev
```

### Herramientas Recomendadas

**Editor**: VSCode con extensiones:

-   ESLint
-   Prettier
-   GitLens
-   Thunder Client (API testing)

**Configuración VSCode** (`.vscode/settings.json`):

```json
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "javascript.preferences.quoteStyle": "single",
    "files.eol": "\n"
}
```

---

## Estructura del Código

### Backend

```
backend/
├── controllers/
│   ├── {dominio}/         # Controladores por dominio académico
│   │   └── {materia}Controller.js
│   └── herramientas/
│       └── {herramienta}Controller.js
├── services/
│   ├── chat/              # Servicios de chat y RAG
│   │   ├── chatServices.js          # Orquestador central
│   │   ├── {materia}Service.js      # Servicio por agente
│   │   ├── ragService.js            # Lógica RAG compartida
│   │   └── memoryService.js         # Gestión de memoria
│   ├── marketing/         # Sistema de marketing autónomo
│   ├── transcription/     # Whisper, audio/video
│   ├── ocr/               # Mistral OCR, PDFs
│   └── payments/          # Paddle, Ualá Bis
├── middlewares/
│   ├── authMiddleware.js
│   ├── csrfMiddleware.js
│   ├── rateLimitMiddleware.js
│   └── ...
├── jobs/                  # BullMQ workers
├── lib/                   # Clientes de servicios externos
└── utils/                 # Utilidades compartidas
```

### Frontend

```
frontend/
├── public/
│   ├── css/
│   │   ├── chats/
│   │   │   ├── base/          # Reset, variables
│   │   │   ├── layout/        # Grid, flexbox
│   │   │   ├── components/    # Botones, cards, etc.
│   │   │   └── utils/         # Helpers, animations
│   │   └── chiguiremarketing/
│   └── scripts/
│       ├── chats/
│       │   ├── matematico/    # Lógica chat matemático
│       │   ├── teorico/       # Lógica chat teórico
│       │   ├── herramientas/  # PDF, Agente
│       │   └── shared/        # Código compartido
│       └── admin/
└── views/
    ├── auth/
    ├── dashboard/
    ├── content/
    └── admin/
```

---

## Sistema RAG en Detalle

### Arquitectura del RAG

```
┌─────────────────────────────────────────────────────┐
│                  USER QUERY                         │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│          1. ANÁLISIS DE INTENCIÓN                   │
│  - Detectar tipo de query (conceptual, cálculo, etc)│
│  - Determinar urgencia/prioridad                    │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│          2. CONSULTA CACHE (AcadelCache)            │
│  - Hash semántico del query                         │
│  - Categorización (fundamental, calc, updatable)    │
│  - TTL según categoría                              │
└────────────────────┬────────────────────────────────┘
                     │
                ┌────┴─────┐
                │  Cache   │
                │   Hit?   │
                └────┬─────┘
                     │
         ┌───────────┴──────────┐
         │                      │
    ┌────▼─────┐          ┌─────▼─────┐
    │  Return  │          │   Cache   │
    │  Cached  │          │    Miss   │
    └──────────┘          └─────┬─────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  3. HYBRID SEARCH          │
                  │  - BM25 (keyword search)   │
                  │  - Vector similarity       │
                  │  - Merge & rank results    │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  4. MEMORIA HÍBRIDA        │
                  │  - Short-term (últimos 10) │
                  │  - Long-term (resúmenes)   │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  5. TOOL EXECUTION         │
                  │  - WolframAlpha(matemático)│
                  │  - Brave Search (web)      │
                  │  - DALL-E (imágenes)       │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  6. PROMPT CONSTRUCTION    │
                  │  - System prompt (Acadel)  │
                  │  - Context chunks          │
                  │  - Memory                  │
                  │  - Tool results            │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  7. LLM CALL (GPT-4o)      │
                  │  - Stream response         │
                  │  - Token counting          │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  8. POST-PROCESSING        │
                  │  - LaTeX formatting        │
                  │  - Mermaid diagrams        │
                  │  - References extraction   │
                  └─────────────┬──────────────┘
                                │
                  ┌─────────────▼──────────────┐
                  │  9. PERSISTENCE            │
                  │  - Save to chat_history    │
                  │  - Update cache            │
                  │  - Update memory           │
                  └─────────────┬──────────────┘
                                │
                         ┌──────▼──────┐
                         │   RESPONSE  │
                         └─────────────┘
```

### Implementación del Hybrid Search

**Archivo**: `backend/lib/supabaseHybridSearch.js`

```javascript
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

export class SupabaseHybridSearch {
    constructor(embeddings, config) {
        this.embeddings = embeddings;
        this.supabase = config.client;
        this.tableName = config.tableName;
        this.similarityK = config.similarityK || 3;
        this.keywordK = config.keywordK || 2;
        this.similarityThreshold = config.similarityThreshold || 0.6;
    }

    async getRelevantDocuments(query) {
        // 1. Vector similarity search
        const vectorResults = await this.vectorSearch(query);

        // 2. Keyword search (BM25)
        const keywordResults = await this.keywordSearch(query);

        // 3. Merge y rankear resultados
        const merged = this.mergeAndRank(vectorResults, keywordResults);

        return merged;
    }

    async vectorSearch(query) {
        // Generar embedding del query
        const queryEmbedding = await this.embeddings.embedQuery(query);

        // Búsqueda de similitud coseno en Supabase
        const { data, error } = await this.supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_threshold: this.similarityThreshold,
            match_count: this.similarityK,
            table_name: this.tableName,
        });

        if (error) throw error;

        return data.map(doc => ({
            content: doc.content,
            metadata: doc.metadata,
            similarity: doc.similarity,
            source: "vector",
        }));
    }

    async keywordSearch(query) {
        // Full-text search en Supabase
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select("content, metadata")
            .textSearch("content", query, {
                type: "websearch",
                config: "spanish",
            })
            .limit(this.keywordK);

        if (error) throw error;

        return data.map(doc => ({
            content: doc.content,
            metadata: doc.metadata,
            source: "keyword",
        }));
    }

    mergeAndRank(vectorResults, keywordResults) {
        // Combinar resultados, eliminando duplicados
        const seen = new Set();
        const merged = [];

        // Vector results tienen prioridad (mayor peso)
        for (const doc of vectorResults) {
            const key = this.hashContent(doc.content);
            if (!seen.has(key)) {
                seen.add(key);
                merged.push({ ...doc, score: doc.similarity * 1.5 });
            }
        }

        // Keyword results
        for (const doc of keywordResults) {
            const key = this.hashContent(doc.content);
            if (!seen.has(key)) {
                seen.add(key);
                merged.push({ ...doc, score: 1.0 });
            }
        }

        // Ordenar por score descendente
        return merged.sort((a, b) => b.score - a.score);
    }

    hashContent(content) {
        // Simple hash para detectar duplicados
        return content.slice(0, 100);
    }
}
```

### Sistema de Cache (AcadelCache)

**Archivo**: `backend/utils/chat/AcadelCache.js`

```javascript
import { createHash } from "crypto";
import { redisClient } from "../../lib/redis.js";

export class AcadelCache {
    constructor() {
        this.prefix = "acadelia:cache:";
        this.metrics = {
            hits: 0,
            misses: 0,
        };
    }

    async get(query, agentType) {
        const key = this.generateKey(query, agentType);
        const cached = await redisClient.get(key);

        if (cached) {
            this.metrics.hits++;
            return JSON.parse(cached);
        }

        this.metrics.misses++;
        return null;
    }

    async set(query, response, agentType, category) {
        const key = this.generateKey(query, agentType);
        const ttl = this.getTTL(category);

        await redisClient.setex(
            key,
            ttl,
            JSON.stringify({
                response,
                cached_at: Date.now(),
                category,
            })
        );
    }

    generateKey(query, agentType) {
        // Hash semántico (normalizar query antes de hashear)
        const normalized = this.normalizeQuery(query);
        const hash = createHash("sha256").update(`${agentType}:${normalized}`).digest("hex");

        return `${this.prefix}${hash}`;
    }

    normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ") // Multiple spaces → single space
            .replace(/[^\w\sáéíóúñ]/g, ""); // Remove punctuation
    }

    categorizeQuery(query) {
        // Heurísticas para categorización
        const fundamentalKeywords = ["¿qué es", "define", "definición", "concepto de", "explica", "explicación de"];

        const calculationKeywords = ["resuelve", "calcula", "deriva", "integra", "encuentra", "determina"];

        const queryLower = query.toLowerCase();

        if (fundamentalKeywords.some(kw => queryLower.includes(kw))) {
            return "fundamental";
        }

        if (calculationKeywords.some(kw => queryLower.includes(kw))) {
            return "calculation";
        }

        return "updatable";
    }

    getTTL(category) {
        const ttls = {
            fundamental: 7 * 24 * 60 * 60, // 7 días
            calculation: 3 * 24 * 60 * 60, // 3 días
            updatable: 1 * 24 * 60 * 60, // 1 día
        };

        return ttls[category] || ttls.updatable;
    }

    async invalidate(pattern) {
        // Invalidar cache por patrón
        const keys = await redisClient.keys(`${this.prefix}${pattern}*`);
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
    }

    getMetrics() {
        const total = this.metrics.hits + this.metrics.misses;
        return {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate: total > 0 ? this.metrics.hits / total : 0,
        };
    }
}
```

---

## Crear un Nuevo Agente

### 1. Preparar Base de Conocimiento

```sql
-- En Supabase SQL Editor
-- Crear tabla de embeddings para el nuevo agente

CREATE TABLE emb_nombre_agente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índice para búsqueda vectorial
CREATE INDEX ON emb_nombre_agente
USING ivfflat (embedding vector_cosine_ops);

-- Insertar datos iniciales (embeddings)
-- Esto normalmente se hace con un script de Python:
-- 1. Leer documentos fuente
-- 2. Generar chunks
-- 3. Generar embeddings con OpenAI
-- 4. Insertar en Supabase
```

### 2. Crear Servicio del Agente

**Archivo**: `backend/services/chat/nombreAgenteService.js`

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseHybridSearch } from "../../lib/supabaseHybridSearch.js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { supabase } from "../../lib/supabase.js";
import { AcadelCache } from "../../utils/chat/AcadelCache.js";
import logger from "../../utils/logger.js";

const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
});

const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
});

const cache = new AcadelCache();

export const processQuery = async ({ chatId, message, userId }) => {
    try {
        // 1. Análisis de intención
        const intention = detectIntention(message);

        // 2. Categorización para cache
        const category = cache.categorizeQuery(message);

        // 3. Consultar cache
        const cached = await cache.get(message, "nombre-agente");
        if (cached) {
            logger.info("Cache hit", { agentType: "nombre-agente", category });
            return cached.response;
        }

        // 4. Hybrid Search
        const retriever = new SupabaseHybridSearch(embeddings, {
            client: supabase,
            tableName: "emb_nombre_agente",
            similarityK: 3,
            keywordK: 2,
            similarityThreshold: 0.6,
        });

        const relevantDocs = await retriever.getRelevantDocuments(message);

        // 5. Cargar memoria híbrida
        const memory = await loadMemory(chatId, userId);

        // 6. Construcción de prompt
        const prompt = buildPrompt({
            systemPrompt: AGENT_SYSTEM_PROMPT,
            context: relevantDocs,
            memory,
            userQuery: message,
        });

        // 7. Llamada al LLM
        const response = await llm.call(prompt);

        // 8. Post-procesamiento
        const formatted = formatResponse(response);

        // 9. Persistencia
        await saveToChatHistory(chatId, message, formatted);
        await cache.set(message, formatted, "nombre-agente", category);

        return formatted;
    } catch (error) {
        logger.error("Error in nombreAgenteService", { error, chatId });
        throw error;
    }
};

const AGENT_SYSTEM_PROMPT = `
Eres Acadel, un profesor experto en [MATERIA].

Características:
- Tono claro, paciente y exigente
- Priorizas comprensión sobre respuesta rápida
- Razonamiento paso a paso
- Incluyes referencias cuando es posible

Formato de respuesta:
- Usa LaTeX para fórmulas matemáticas: $$ formula $$
- Usa Mermaid para diagramas
- Estructura clara con headings
`;

const detectIntention = message => {
    // Implementar lógica de detección de intención
    // Puede usar un LLM ligero o heurísticas
    return "conceptual"; // o 'calculation', 'example', etc.
};

const loadMemory = async (chatId, userId) => {
    // Cargar últimos mensajes del chat
    const { data } = await supabase
        .from("chat_history")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(10);

    return data.reverse(); // Orden cronológico
};

const buildPrompt = ({ systemPrompt, context, memory, userQuery }) => {
    const contextStr = context
        .map(doc => `[Fuente: ${doc.metadata?.source || "Base de conocimiento"}]\n${doc.content}`)
        .join("\n\n---\n\n");

    const memoryStr = memory.map(msg => `${msg.role}: ${msg.content}`).join("\n");

    return [
        { role: "system", content: systemPrompt },
        { role: "system", content: `Contexto relevante:\n${contextStr}` },
        ...memory.map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
        })),
        { role: "user", content: userQuery },
    ];
};

const formatResponse = response => {
    // Post-procesamiento: LaTeX, Mermaid, etc.
    return {
        message: response.content,
        formatted: true,
    };
};

const saveToChatHistory = async (chatId, userMessage, assistantResponse) => {
    await supabase.from("chat_history").insert([
        {
            chat_id: chatId,
            role: "user",
            content: userMessage,
            created_at: new Date(),
        },
        {
            chat_id: chatId,
            role: "assistant",
            content: assistantResponse.message,
            metadata: { formatted: true },
            created_at: new Date(),
        },
    ]);
};
```

### 3. Crear Controller

**Archivo**: `backend/controllers/dominio/nombreAgenteController.js`

```javascript
import * as nombreAgenteService from "../../services/chat/nombreAgenteService.js";
import logger from "../../utils/logger.js";

export const queryNombreAgente = async (req, res) => {
    try {
        const { chatId, message } = req.body;
        const userId = req.user.id;

        // Validaciones
        if (!chatId || !message) {
            return res.status(400).json({
                error: "chatId y message son requeridos",
            });
        }

        // Procesar query
        const response = await nombreAgenteService.processQuery({
            chatId,
            message,
            userId,
        });

        res.json(response);
    } catch (error) {
        logger.error("Error in queryNombreAgente", { error, userId: req.user?.id });
        res.status(500).json({
            error: "Error procesando query",
        });
    }
};
```

### 4. Registrar Ruta

**Archivo**: `server.js`

```javascript
import * as nombreAgenteController from "./backend/controllers/dominio/nombreAgenteController.js";

// ...

app.post(
    "/api/openai/query-nombre-agente",
    authenticateUser,
    csrfProtection,
    chatRateLimiter,
    verifyAvaAccess,
    nombreAgenteController.queryNombreAgente
);
```

### 5. Agregar Agente a Base de Datos

```sql
-- Insertar el nuevo agente en la tabla ava
INSERT INTO ava (id, nombre, descripcion, tipo, carrera_id)
VALUES (
  gen_random_uuid(),
  'Nombre del Agente',
  'Descripción del agente',
  'matematico',  -- o 'teorico'
  '{carrera-uuid}'
);
```

### 6. Frontend (Opcional)

Crear vista para el nuevo agente en:

-   `frontend/views/content/{carrera}/{agente}.html`
-   `frontend/public/scripts/chats/{tipo}/main.js`
-   `frontend/public/css/chats/{tipo}/styles.css`

---

## Agregar una Nueva Herramienta

Las herramientas son capacidades adicionales que los agentes pueden usar (ej: WolframAlpha, Brave Search).

### Ejemplo: Agregar Herramienta de Traducción

**1. Crear cliente de API**

**Archivo**: `backend/lib/translationAPI.js`

```javascript
import axios from "axios";

export class TranslationAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = "https://api.translation-service.com";
    }

    async translate(text, targetLang) {
        try {
            const response = await axios.post(
                `${this.baseURL}/translate`,
                {
                    text,
                    target_lang: targetLang,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );

            return response.data.translation;
        } catch (error) {
            logger.error("Translation API error", { error });
            throw new Error("Error en traducción");
        }
    }
}

export const translationAPI = new TranslationAPI(process.env.TRANSLATION_API_KEY);
```

**2. Integrar en servicio de agente**

```javascript
import { translationAPI } from "../../lib/translationAPI.js";

// En processQuery, antes de llamar al LLM:

if (needsTranslation(message)) {
    const translated = await translationAPI.translate(message, "es");
    message = translated;
}

// O como herramienta que el LLM puede llamar:
const tools = [
    {
        name: "translate",
        description: "Traduce texto a otro idioma",
        parameters: {
            type: "object",
            properties: {
                text: { type: "string", description: "Texto a traducir" },
                targetLang: { type: "string", description: "Idioma destino (ej: es, en)" },
            },
            required: ["text", "targetLang"],
        },
        function: async ({ text, targetLang }) => {
            return await translationAPI.translate(text, targetLang);
        },
    },
];
```

---

## Testing

### Unit Tests (Backend)

**Instalar herramientas**:

```bash
npm install --save-dev jest supertest
```

**Configurar Jest** (`jest.config.js`):

```javascript
export default {
    testEnvironment: "node",
    coverageDirectory: "coverage",
    testMatch: ["**/__tests__/**/*.test.js"],
    collectCoverageFrom: ["backend/**/*.js", "!backend/node_modules/**"],
};
```

**Ejemplo de test**:

**Archivo**: `backend/__tests__/services/algebraService.test.js`

```javascript
import { processQuery } from "../../services/chat/algebraService.js";
import { AcadelCache } from "../../utils/chat/AcadelCache.js";

jest.mock("../../utils/chat/AcadelCache.js");

describe("algebraService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("debe retornar respuesta cached si existe", async () => {
        const mockCached = { message: "Respuesta en cache" };
        AcadelCache.prototype.get.mockResolvedValue(mockCached);

        const result = await processQuery({
            chatId: "test-chat-id",
            message: "¿Qué es un vector?",
            userId: "test-user-id",
        });

        expect(result).toEqual(mockCached);
        expect(AcadelCache.prototype.get).toHaveBeenCalledWith("¿Qué es un vector?", "algebra");
    });

    test("debe procesar query si no hay cache", async () => {
        AcadelCache.prototype.get.mockResolvedValue(null);

        // Mock otras dependencias...

        const result = await processQuery({
            chatId: "test-chat-id",
            message: "¿Qué es un vector?",
            userId: "test-user-id",
        });

        expect(result).toHaveProperty("message");
    });
});
```

**Ejecutar tests**:

```bash
npm test
npm test -- --coverage
```

### Integration Tests

**Archivo**: `backend/__tests__/integration/chat.test.js`

```javascript
import request from "supertest";
import app from "../../server.js";

describe("Chat API Integration", () => {
    let authToken;
    let chatId;

    beforeAll(async () => {
        // Login y obtener token
        const loginRes = await request(app).post("/api/users/login").send({
            email: "test@example.com",
            password: "TestPass123!",
        });

        authToken = loginRes.headers["set-cookie"].find(cookie => cookie.startsWith("auth-token"));
    });

    test("debe crear un chat", async () => {
        const res = await request(app).post("/api/chat/create").set("Cookie", authToken).send({
            ava_id: "test-ava-id",
            title: "Test Chat",
        });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("chatId");
        chatId = res.body.chatId;
    });

    test("debe enviar mensaje al chat", async () => {
        const res = await request(app).post("/api/openai/query-algebra").set("Cookie", authToken).send({
            chatId,
            message: "¿Qué es un vector?",
        });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("message");
    });
});
```

---

## Debugging

### Winston Logger

```javascript
import logger from "./utils/logger.js";

logger.debug("Debug info", { variable: value });
logger.info("Info message", { userId: "123" });
logger.warn("Warning", { issue: "something" });
logger.error("Error occurred", { error: error.message });
```

### Debug con VSCode

**Configuración** (`.vscode/launch.json`):

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Backend",
            "skipFiles": ["<node_internals>/**"],
            "program": "${workspaceFolder}/server.js",
            "envFile": "${workspaceFolder}/.env"
        }
    ]
}
```

### Redis CLI

```bash
# Conectar
redis-cli

# Ver todas las keys
KEYS *

# Ver valor de una key
GET acadelia:cache:abc123

# Ver TTL
TTL acadelia:cache:abc123

# Monitorear comandos en tiempo real
MONITOR
```

### Supabase Logs

```bash
# En dashboard de Supabase
# Logs → Database → Query logs
# Logs → API → API logs
```

---

## Estándares de Código

### ESLint

**Configuración** (`.eslintrc.json`):

```json
{
    "env": {
        "es2021": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "indent": ["error", 2],
        "quotes": ["error", "single"],
        "semi": ["error", "always"],
        "no-unused-vars": ["warn"],
        "no-console": ["warn"]
    }
}
```

### Prettier

**Configuración** (`.prettierrc`):

```json
{
    "singleQuote": true,
    "trailingComma": "es5",
    "tabWidth": 2,
    "semi": true,
    "printWidth": 100
}
```

### Naming Conventions

-   **Variables**: camelCase (`userId`, `chatHistory`)
-   **Constantes**: UPPER_SNAKE_CASE (`API_KEY`, `MAX_RETRIES`)
-   **Funciones**: camelCase (`processQuery`, `loadMemory`)
-   **Clases**: PascalCase (`AcadelCache`, `SupabaseHybridSearch`)
-   **Archivos**: camelCase (`algebraService.js`, `authMiddleware.js`)

---

## Git Workflow

### Branches

```
main                  # Producción (protegido)
  └─ develop          # Desarrollo (protegido)
       ├─ feature/nueva-funcionalidad
       ├─ fix/corregir-bug
       └─ refactor/mejorar-codigo
```

### Commits

Usar **Conventional Commits**:

```
feat: agregar agente de Biología
fix: corregir error en cache de RAG
docs: actualizar README con nuevos endpoints
refactor: simplificar lógica de hybrid search
test: agregar tests para algebraService
chore: actualizar dependencias
```

### Pull Requests

**Template**:

```markdown
## Descripción

[Breve descripción de los cambios]

## Tipo de cambio

-   [ ] Bug fix
-   [ ] Nueva funcionalidad
-   [ ] Refactoring
-   [ ] Documentación

## Checklist

-   [ ] Tests agregados/actualizados
-   [ ] Documentación actualizada
-   [ ] No hay warnings de ESLint
-   [ ] Código testeado localmente
```

---

## Deployment

### Build para Producción

```bash
# 1. Build del frontend (minificación + ofuscación)
npm run build

# 2. Verificar que todo funciona
npm start

# 3. Revertir si hay problemas
npm run revert
```

### Docker

```bash
# Build
docker build -t acadelia:latest .

# Run
docker-compose -f docker-compose.production.yml up -d

# Logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Fly.io (Producción)

```bash
# Login
fly auth login

# Deploy
fly deploy

# Logs
fly logs

# SSH
fly ssh console
```

---

## Recursos Adicionales

-   [LangChain Docs](https://js.langchain.com/docs/)
-   [Supabase Docs](https://supabase.com/docs)
-   [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
-   [BullMQ Guide](https://docs.bullmq.io/)
-   [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de contribución.
