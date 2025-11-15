![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-✓-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-✓-1572B6?logo=css3&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-RAG%20Vector%20DB-3ECF8E?logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-required-CB2D2E?logo=redis&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-transcoding-007808?logo=ffmpeg&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-LLM%20%2B%20Whisper-412991?logo=openai&logoColor=white)
![Mistral](https://img.shields.io/badge/Mistral-OCR-000000)
![LangChain](https://img.shields.io/badge/LangChain-orchestration-000000)
![Mermaid](https://img.shields.io/badge/Mermaid-diagrams-1F6FEB?logo=mermaid&logoColor=white)

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status](https://img.shields.io/badge/status-in%20development-blue)

# Acadelia — Plataforma de estudio con IA (RAG + agentes)

> **Estado:** Proyecto educativo/portafolio (MVP) — código grande, primeras versiones priorizaron que **funcione**. Documentación y refactors **en progreso**.

<p align="center">
  <img src="docs/media/acadelia.gif" alt="Acadelia demo" width="1020">
</p>

---

## 🚀 Resumen

**Acadelia** es una plataforma integral de estudio impulsada por IA. Combina **RAG 100% en Supabase** (embeddings OpenAI + **Supabase Hybrid Search**), **agentes por materia**, **4 estilos de chat** (PDF, Audio/Video, Matemáticos, Teóricos), un **panel admin**, **pagos**, y un **Agente de Marketing** autónomo. Seguridad con **JWT**, **CSRF**, **Helmet**, **rate limiting**, **ClamAV** y **ofuscación** de endpoints.

> Es un proyecto de **portafolio** ambicioso que muestra arquitectura real, muchas integraciones y decisiones de ingeniería. El código puede contener redundancias/errores de lógica; la documentación crecerá poco a poco.

<h3><strong>Demos (GIF) — Flujo de usuario</strong></h3>
<p align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <a href="docs/media/demo-01-landing-login.gif">
          <img src="docs/media/demo-01-landing-login.gif" alt="Paso 1 — Landing → Login" width="380">
        </a><br/>
        <sub><strong>Paso 1</strong> — <em>Landing → Login</em></sub>
      </td>
      <td align="center" width="50%">
        <a href="docs/media/demo-02-login-dashboard-avas.gif">
          <img src="docs/media/demo-02-login-dashboard-avas.gif" alt="Paso 2 — Login → Dashboard → Mis Avas" width="380">
        </a><br/>
        <sub><strong>Paso 2</strong> — <em>Login → Dashboard → Mis Avas</em></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <a href="docs/media/demo-03-select-ava-loading.gif">
          <img src="docs/media/demo-03-select-ava-loading.gif" alt="Paso 3 — Selección de Ava + pantalla de carga" width="380">
        </a><br/>
        <sub><strong>Paso 3</strong> — <em>Seleccionar Ava + pantalla de carga</em></sub>
      </td>
      <td align="center" width="50%">
        <a href="docs/media/demo-04-new-chat-response.gif">
          <img src="docs/media/demo-04-new-chat-response.gif" alt="Paso 4 — Nueva query → respuesta de la IA" width="380">
        </a><br/>
        <sub><strong>Paso 4</strong> — <em>Nueva query → respuesta de la IA</em></sub>
      </td>
    </tr>
  </table>
</p>

---

## ✨ Highlights

-   **RAG**: embeddings (OpenAI) + vector search (Supabase) + limpieza de contexto.
-   **Agentes IA por materia** con prompts/herramientas propias y memoria híbrida.
-   **4 chats especializados** con UX y _loading screens_ tematizados con **Acadel**.
-   **Multimodal**: PDF/imagen (**Mistral OCR**), YouTube→**MP3**→**Whisper**, audio, imágenes.
-   **Admin**: usuarios, pagos, contenidos, configuración, logs.
-   **Pagos**: **Paddle** y **Ualá Bis**.
-   **Seguridad**: JWT + refresh, CSRF, single-session, **ClamAV**, CORS estricto, ofuscación, rate limiting.

---

## 🧱 Arquitectura (alto nivel)

### 📂 Estructura del Proyecto

```
/ (monorepo)
├─ backend/                  # API Express, servicios IA, colas
│  ├─ controllers/           # 40+ controladores por agente/materia
│  │  ├─ ingenieria/        # Álgebra, Cálculo, Física, etc.
│  │  ├─ medicina/          # Patología, Semiología, Anatomía, etc.
│  │  ├─ economia/          # Micro, Macro, Econometría, etc.
│  │  ├─ psicologia/        # DSM-5, Psicoanálisis, Neuropsico, etc.
│  │  └─ herramientas/      # PDF IA, Agente General
│  ├─ services/             # Lógica de negocio
│  │  ├─ chat/              # RAG, embeddings, memoria híbrida
│  │  ├─ marketing/         # Sistema autónomo de marketing
│  │  ├─ transcription/     # Whisper, procesamiento de audio
│  │  ├─ ocr/               # Mistral OCR, procesamiento PDF
│  │  └─ payments/          # Paddle, Ualá Bis
│  ├─ middlewares/          # Seguridad, autenticación, rate limiting
│  ├─ jobs/                 # BullMQ (colas de procesamiento)
│  ├─ lib/                  # Clientes: OpenAI, Mistral, Supabase, Redis
│  ├─ utils/                # Utilidades compartidas
│  └─ server.js             # Punto de entrada principal (1036 líneas)
├─ frontend/                # HTML + CSS + JS vanilla
│  ├─ public/
│  │  ├─ css/               # Estilos modulares por tipo de chat
│  │  │  ├─ chats/          # base, layout, components, utils
│  │  │  └─ chiguiremarketing/  # Estilos del panel de marketing
│  │  └─ scripts/           # JavaScript por funcionalidad
│  │     ├─ chats/          # Lógica de chats (math, theory, tools)
│  │     ├─ chiguireinteligente/  # Panel financiero
│  │     ├─ chiguiremarketing/    # Panel de marketing
│  │     └─ chiguiremente/        # Analytics
│  └─ views/                # Templates HTML
│     ├─ auth/              # Login, registro
│     ├─ dashboard/         # Principal, mis avas, cuenta
│     ├─ content/           # Chats por materia y herramientas
│     └─ admin/             # Paneles administrativos
├─ db/                      # Esquemas de base de datos
│  └─ Acadelia-DB.sql       # Esquema completo para Supabase
├─ scripts/                 # Build, minificación, ofuscación
│  ├─ build-esbuild.js      # Build con esbuild + UglifyJS
│  └─ revert-build.js       # Rollback de build
├─ config/                  # Configuración de servicios
│  └─ google-drive-key.json # Clave de servicio para Google Drive
├─ uploads/                 # Archivos subidos por usuarios
├─ docs/                    # Documentación y medios
│  └─ media/                # Capturas, GIFs, videos
├─ .github/                 # CI/CD workflows
├─ Dockerfile               # Multi-stage build (development/production)
├─ docker-compose.production.yml  # Orquestación de servicios
└─ nginx.conf               # Configuración de Nginx (reverse proxy)
```

### 🏗️ Arquitectura de Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE PRESENTACIÓN                        │
│                    (Nginx + Frontend)                        │
│  - Servidor web estático (HTML/CSS/JS Vanilla)               │
│  - Reverse proxy hacia el backend                            │
│  - Cache optimizado para assets estáticos                    │
│  - Compresión gzip                                           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
┌────────────────────────▼────────────────────────────────────┐
│                   CAPA DE APLICACIÓN                         │
│                 (Node.js 22+ Express)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MIDDLEWARES DE SEGURIDAD (capas de protección)      │  │
│  │  1. Helmet (Headers HTTP seguros)                    │  │
│  │  2. CORS (configuración estricta)                    │  │
│  │  3. CSRF Protection (cookie-based tokens)            │  │
│  │  4. Rate Limiting (Redis distribuido)                │  │
│  │  5. JWT Authentication (+ Refresh Tokens)            │  │
│  │  6. Access Control (AVA/Herramientas)                │  │
│  │  7. ClamAV (Antivirus en tiempo real)                │  │
│  │  8. Request Monitoring & Logging                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SISTEMA DE ENRUTAMIENTO                             │  │
│  │  - /api/chat/*     → RAG, embeddings, agentes        │  │
│  │  - /api/users/*    → Autenticación, perfiles         │  │
│  │  - /api/payments/* → Paddle, Ualá Bis                │  │
│  │  - /api/admin/*    → Analytics, seguridad, colas     │  │
│  │  - /api/shared/*   → Recursos compartidos            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CONTROLADORES (40+ agentes especializados)          │  │
│  │  📐 Ingeniería: Álgebra, Cálculo, Física, etc.       │  │
│  │  🏥 Medicina: Patología, Semiología, Anatomía, etc.  │  │
│  │  💰 Economía: Micro, Macro, Econometría, etc.        │  │
│  │  🧠 Psicología: DSM-5, Psicoanálisis, etc.           │  │
│  │  🛠️  Herramientas: PDF IA, Agente Multimodal         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SERVICIOS DE IA Y PROCESAMIENTO                     │  │
│  │  - chatServices.js (orquestador central RAG)         │  │
│  │  - RAG Services (Hybrid Search: BM25 + Vector)       │  │
│  │  - Marketing Agent (sistema autónomo multi-agente)   │  │
│  │  - Transcription Services (Whisper STT)              │  │
│  │  - OCR Services (Mistral para PDFs)                  │  │
│  │  - File Processing (PDF, audio, video, imágenes)     │  │
│  │  - Image Storage & Analysis (GPT-4o Vision)          │  │
│  └──────────────────────────────────────────────────────┘  │
└──┬───────────┬──────────┬──────────┬─────────────────────────┘
   │           │          │          │
┌──▼─────┐ ┌──▼────┐ ┌──▼──────┐ ┌─▼──────────────────────────┐
│SUPABASE│ │ REDIS │ │ BullMQ  │ │   APIS EXTERNAS            │
│        │ │       │ │         │ │                            │
│- Postgr│ │- Cache│ │- Colas: │ │- OpenAI GPT-4o / Whisper   │
│  esQL  │ │- Sessi│ │  * openai│ │- Mistral OCR               │
│- Vector│ │  ons  │ │  * pdf  │ │- WolframAlpha              │
│  DB    │ │- Rate │ │  * audio│ │- Brave Search              │
│  (RAG) │ │  Limit│ │  * youtube│ │- DALL-E                    │
│- Storag│ │- Jobs │ │- Throttl│ │- Paddle (pagos)            │
│  e     │ │- Locks│ │  ing    │ │- Ualá Bis (pagos ARG)      │
│- Auth  │ │       │ │- Retry  │ │- YouTube (descarga)        │
└────────┘ └───────┘ └─────────┘ └────────────────────────────┘
```

### 🧩 Tecnologías clave

**Backend:**
-   **Runtime:** Node.js 22+ (ESM modules) con UV_THREADPOOL_SIZE=16
-   **Framework:** Express.js 4.18.2
-   **IA/LLM:** OpenAI GPT-4o, Whisper, DALL-E, text-embedding-ada-002
-   **OCR:** Mistral OCR
-   **Orquestación:** LangChain 0.3.12
-   **Base de Datos:** Supabase (PostgreSQL 14+ con extensión pgvector)
-   **Cache/Colas:** Redis 7 + BullMQ 5.49.1
-   **Procesamiento Multimedia:** FFmpeg, ytdl-core, yt-dlp
-   **Seguridad:** Helmet, JWT, bcrypt, ClamAV, express-rate-limit
-   **Logging:** Winston
-   **Pagos:** Paddle SDK, Ualá Bis
-   **Búsqueda:** Brave Search API
-   **Cálculo:** WolframAlpha API

**Frontend:**
-   **Core:** HTML5, CSS3, JavaScript Vanilla (sin frameworks)
-   **Servidor Web:** Nginx (reverse proxy + static files)
-   **Renderizado:** MathLive (LaTeX), Mermaid (diagramas)
-   **UI/UX:** Diseño modular temático (Acadel)

**Base de Datos:**
-   **40+ tablas de embeddings** (una por agente/materia)
-   **Sistema de chat:** `chat`, `chat_history`, `ava`, `herramienta`
-   **Usuarios:** `users`, `cookie_consent`, `account_deletion_requests`
-   **Marketing:** `marketing_trends`, `marketing_profiles`, `marketing_content`
-   **Pagos:** `egresos`, `categorias_egresos`, `analisis_impuestos`

**DevOps:**
-   **Containerización:** Docker multi-stage (development/production)
-   **Orquestación:** Docker Compose
-   **CI/CD:** GitHub Actions (Node 20 + LFS)
-   **Deployment:** Fly.io ready

> **Requisitos críticos** para ejecutar:
> - **Redis** (versión 7+, para colas y rate limiting)
> - **ClamAV** (`clamscan`, para escaneo de archivos)
> - **pdftocairo** (para renderizado de PDFs)
> - **FFmpeg/ffprobe** (para procesamiento multimedia)
> - **Node.js** (versión 22+)

---

## 🗨️ Estilos de chat (4)

1. **Documentalista (PDF)** — Subes apuntes/PDF → **Mistral OCR** + limpieza → embeddings en Supabase → chat contextual con Acadel.
2. **Agente Audio/Video** — Audio o YouTube → descarga/FFmpeg → **MP3** → **Whisper** → transcripción lista para chatear (la IA se vuelve _experta_ en ese contenido).
3. **Matemáticos** — Herramientas **WolframAlpha**, render **LaTeX/Mermaid**, validaciones; resolución **paso a paso** (Álgebra, Cálculo, Física, Estadística, etc.).
4. **Teóricos** — Explicación conceptual profunda con grounding vía RAG.

Cada chat tiene prompts, herramientas y pantallas de carga propias con la personalidad de **Acadel**.

### 📈 Diagramas de secuencia (Mermaid)

**Chat Estándar**

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuario
  participant FE as Frontend
  participant API as API (Express)
  participant RL as RateLimit/Redis
  participant DB as Supabase (RAG + memoria)
  participant Tools as Herramientas (Wolfram, etc.)
  participant LLM as OpenAI (LLM)

  U->>FE: Escribe una pregunta
  FE->>API: POST /api/chat/{math|theory} (JWT + CSRF)
  API->>RL: rateLimit(userId/IP)
  RL-->>API: OK (o bloquea si excede)
  API->>API: Sanitización + detección de intención + prioridad

  opt RAG (si la intención lo requiere)
    API->>DB: Hybrid Search (BM25 + vector) con alcance del usuario
    DB-->>API: Contexto relevante (chunks + metadatos)
  end

  alt Matemático (requiere cálculo)
    API->>Tools: WolframAlpha / motor de cálculo
    Tools-->>API: Resultado numérico/simbólico
  else Teórico (explicación profunda)
    API->>API: Ajuste de prompt (definiciones, ejemplos, estructura)
  end

  API->>LLM: Prompt (persona **Acadel**) + contexto + (resultado de Tools?)
  LLM-->>API: Respuesta estructurada (Markdown/LaTeX/Mermaid)
  API->>DB: Persistir memoria (historial) + vectorizar resumen (opcional)
  API-->>FE: Mensaje + referencias + UI metadata (render LaTeX/Mermaid)
  FE-->>U: Render final (tema, formato, loaders de Acadel)
```

**PDF → Chat**

```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as Frontend
  participant API as API (Express)
  participant OCR as Mistral OCR
  participant DB as Supabase
  participant LLM as OpenAI
  U->>FE: Subir PDF
  FE->>API: POST /api/chat/document
  API->>OCR: Procesar documento
  OCR-->>API: Texto limpio
  API->>DB: Embeddings + indexación
  FE->>API: Consulta sobre el documento
  API->>DB: Retrieve semántico
  API->>LLM: Prompt + contexto
  LLM-->>API: Respuesta
  API-->>FE: Mostrar respuesta con contexto
```

**YouTube → MP3 → Whisper → Chat**

```mermaid
sequenceDiagram
  participant U as Usuario
  participant FE as Frontend
  participant API as API
  participant YT as Descarga (ytdl)
  participant FF as FFmpeg
  participant STT as Whisper
  participant DB as Supabase
  participant LLM as OpenAI
  U->>FE: URL YouTube
  FE->>API: POST /api/chat/youtubeAudio
  API->>YT: Descargar
  YT-->>API: Video
  API->>FF: Convertir a MP3
  FF-->>API: Audio MP3
  API->>STT: Transcribir
  STT-->>API: Texto
  API->>DB: Guardar transcript/embeddings
  FE->>API: Chat con transcripción
  API->>DB: Retrieve (Hybrid)
  API->>LLM: Prompt + contexto
  LLM-->>API: Respuesta final
  API-->>FE: Mostrar respuesta
```

---

## 🧠 Agente de Marketing (autónomo)

El **Agente de Marketing** es un sistema multi-agente autónomo especializado en **branding, estrategia y generación de contenido** para Acadelia. A diferencia de los agentes académicos que responden a queries específicas, este agente funciona como un **equipo de marketing completo** que analiza tendencias, genera estrategias, crea contenido y aprende continuamente de su entorno.

### 🎯 ¿Qué lo hace diferente?

**Sistema Multi-Agente**:
- No es un solo agente, sino un **sistema orquestado** de 7 servicios especializados
- Cada servicio tiene un rol específico (extracción, análisis, creatividad, simulación)
- El **DirectorAgent** actúa como "gerente" que coordina qué agentes se activan según la tarea

**Memoria Persistente y Evolutiva**:
- Construye un **grafo de conocimiento** de ideas y tendencias en Supabase
- Relaciona conceptos automáticamente (ej: "IA en educación" ↔ "personalización del aprendizaje")
- Evita duplicación mediante clustering y deduplicación semántica
- Aprende de cada interacción y lo integra a su base de conocimiento

**Capacidades de Investigación**:
- Busca tendencias en tiempo real con **Brave Search API**
- Analiza competencia, audiencia y oportunidades de mercado
- Simula diferentes escenarios antes de recomendar estrategias

### 🧩 Componentes del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    DIRECTOR AGENT                           │
│  (Orquestador - Decide qué agentes activar)                 │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────────────┐ ┌─▼──────────────┐
│ STRATEGIST     │ │ ANALYST        │
│ (Estrategia)   │ │ (Análisis)     │
└────────────────┘ └────────────────┘
    │                 │
┌───▼────────────┐ ┌─▼──────────────┐
│ CREATIVE       │ │ PROFILE        │
│ (Contenido)    │ │ (Audiencia)    │
└────────────────┘ └────────────────┘
```

**1. DirectorAgent** (Orquestador):
- Analiza el input del usuario y determina qué servicios necesita activar
- Prioriza tareas (investigación → análisis → generación → validación)
- Coordina el flujo de información entre servicios
- Usa GPT-4o-mini para decisiones rápidas y económicas

**2. ExtractionService** (Investigación):
- **Detección de tendencias**: Busca en web con Brave Search
- **Extracción de oportunidades**: Identifica gaps en el mercado
- **Análisis de competencia**: Detecta qué están haciendo otros
- **Extracción de entidades**: Identifica temas, personas, empresas relevantes

**3. MatchingService** (Deduplicación):
- **Clustering de temas**: Agrupa ideas similares automáticamente
- **Similarity search**: Compara con memoria existente (embeddings)
- **Deduplicación**: Evita repetir ideas ya exploradas
- **Scoring**: Califica novedad y relevancia de cada idea

**4. MemoryService** (Persistencia):
- **Almacenamiento en Supabase**: Guarda ideas, tendencias, contenido
- **Grafo de conocimiento**: Relaciona conceptos entre sí
- **Embeddings**: Vectoriza todo para búsqueda semántica
- **Priorización**: Decide qué ideas merecen persistirse

**5. ContentService** (Generación):
- **Briefs de contenido**: Documentos estratégicos completos
- **Copies**: Textos para redes, emails, landing pages
- **Matrices de contenido**: Calendarios editoriales estructurados
- **Diagramas Mermaid**: Visualización de funnels, estrategias, flujos

**6. SimulationService** (Validación):
- **Simulación de audiencia**: ¿Cómo reaccionaría el público objetivo?
- **Análisis de competencia**: ¿Qué hacen otros en el nicho?
- **Evaluación de canales**: ¿Qué canal es mejor para cada objetivo?
- **Scoring de impacto**: Califica potencial de cada idea

**7. ExplainService** (Transparencia):
- **Explicación de decisiones**: Por qué se eligió X estrategia
- **Trade-offs identificados**: Ventajas vs desventajas de cada opción
- **Recomendaciones accionables**: Pasos concretos a seguir

### 🔄 Flujo Completo Explicado

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuario
    participant DA as DirectorAgent
    participant ES as ExtractionService
    participant MS as MatchingService
    participant MEM as MemoryService
    participant CS as ContentService
    participant SIM as SimulationService
    participant EX as ExplainService
    participant DB as Supabase (Memoria)
    participant WEB as Brave Search

    U->>DA: "Analiza tendencias de IA en educación para Q1 2025"

    Note over DA: Análisis de intención:<br/>Requiere: strategist, analyst, creative

    DA->>ES: Activar extracción de tendencias
    ES->>WEB: Buscar "AI education trends 2025"
    WEB-->>ES: Artículos, noticias, reportes
    ES->>ES: Detectar temas, entidades, oportunidades

    ES->>MS: Enviar ideas extraídas
    MS->>DB: Buscar en memoria (similarity search)
    DB-->>MS: Ideas existentes relacionadas
    MS->>MS: Clustering + deduplicación
    MS->>MS: Scoring de novedad

    MS->>MEM: Persistir ideas nuevas (score > 0.7)
    MEM->>DB: INSERT ideas + embeddings + relaciones

    MS->>CS: Enviar ideas validadas
    CS->>CS: Generar brief estratégico
    CS->>CS: Crear matriz de contenido
    CS->>CS: Diseñar copies para redes

    CS->>SIM: Validar estrategia propuesta
    SIM->>SIM: Simular audiencia (estudiantes, profesores)
    SIM->>SIM: Analizar competencia (Duolingo, Khan Academy)
    SIM->>SIM: Evaluar canales (TikTok vs LinkedIn)

    SIM->>EX: Enviar resultados de simulación
    EX->>EX: Explicar decisiones tomadas
    EX->>EX: Identificar trade-offs
    EX->>EX: Generar recomendaciones

    EX-->>DA: Respuesta completa estructurada
    DA-->>U: Estrategia + Brief + Contenido + Explicaciones
```

**Descripción paso a paso**:

1. **Usuario hace una petición** (ej: "Analiza tendencias de IA en educación")
2. **DirectorAgent analiza** qué servicios necesita (strategist, analyst, creative)
3. **ExtractionService busca** en Brave Search tendencias actuales
4. **Extrae insights**: Temas emergentes, oportunidades, competencia
5. **MatchingService compara** con memoria existente (evita repetir)
6. **Clustering**: Agrupa ideas similares
7. **Scoring**: Califica novedad y relevancia (0-1)
8. **MemoryService persiste** ideas con score > 0.7 en Supabase
9. **Grafo de conocimiento**: Relaciona con conceptos existentes
10. **ContentService genera**:
    - Brief estratégico completo
    - Matriz de contenido (calendario)
    - Copies para diferentes canales
    - Diagramas Mermaid de flujos
11. **SimulationService valida**:
    - Simula reacción de audiencia
    - Analiza qué hace competencia
    - Evalúa mejores canales
12. **ExplainService documenta**:
    - Por qué se tomaron decisiones
    - Trade-offs de cada opción
    - Pasos accionables
13. **Respuesta completa** al usuario con toda la información

### 💬 Ejemplos de Uso

**Ejemplo 1: Análisis de Competencia**
```
Usuario: "¿Qué estrategias usa Duolingo que podríamos adaptar?"

Agente:
1. Busca información sobre estrategias de Duolingo
2. Identifica: gamificación, streaks, notificaciones push
3. Compara con Acadelia (gaps y oportunidades)
4. Genera recomendaciones adaptadas:
   - "Rachas de estudio" con Acadel
   - Sistema de logros por materia
   - Notificaciones educativas personalizadas
5. Crea brief de implementación
6. Simula impacto en retención de usuarios
```

**Ejemplo 2: Generación de Contenido**
```
Usuario: "Necesito contenido para lanzamiento en redes sociales"

Agente:
1. Analiza tendencias actuales en educación
2. Identifica mejores momentos (inicio de semestre, exámenes)
3. Genera calendario de contenido (4 semanas):
   - Semana 1: Testimonios de estudiantes
   - Semana 2: Tips de estudio con IA
   - Semana 3: Comparación con métodos tradicionales
   - Semana 4: CTA lanzamiento
4. Crea copies específicos por red (Twitter, Instagram, LinkedIn)
5. Sugiere hashtags y mejores horarios
6. Genera diagramas del funnel
```

**Ejemplo 3: Investigación de Mercado**
```
Usuario: "Analiza oportunidades en el mercado latinoamericano"

Agente:
1. Busca datos sobre educación online en LATAM
2. Identifica países con mayor crecimiento
3. Detecta pain points de estudiantes latinos
4. Compara con competencia local
5. Genera matriz FODA
6. Propone estrategia de entrada por país
7. Crea brief de localización (idioma, precios, marketing)
```

### 📸 Capturas del Sistema

**Interfaz del Chat de Marketing**:

<p align="center">
  <img src="docs/media/marketing-chat-interface.png" alt="Interfaz del chat de marketing" width="800">
  <br/>
  <sub><em>Panel principal del agente de marketing mostrando análisis en tiempo real</em></sub>
</p>

**Generación de Estrategia en Acción**:

<p align="center">
  <img src="docs/media/marketing-strategy-generation.gif" alt="Generación de estrategia" width="800">
  <br/>
  <sub><em>GIF mostrando cómo el agente analiza, piensa y genera una estrategia completa</em></sub>
</p>

**Ejemplo de Brief Generado**:

<p align="center">
  <img src="docs/media/marketing-brief-example.png" alt="Ejemplo de brief generado" width="800">
  <br/>
  <sub><em>Brief de contenido completo con calendario, copies y diagramas Mermaid</em></sub>
</p>

**Análisis de Tendencias con Brave Search**:

<p align="center">
  <img src="docs/media/marketing-trend-analysis.gif" alt="Análisis de tendencias" width="800">
  <br/>
  <sub><em>Proceso de búsqueda web, extracción de insights y generación de recomendaciones</em></sub>
</p>

**Grafo de Conocimiento (Memoria)**:

<p align="center">
  <img src="docs/media/marketing-knowledge-graph.png" alt="Grafo de conocimiento" width="800">
  <br/>
  <sub><em>Visualización de cómo el agente relaciona conceptos en su memoria</em></sub>
</p>

### ⭐ Capacidades Avanzadas

**Calendar Builder (Constructor de Calendarios)**:
- Genera calendarios editoriales completos
- Define objetivos por semana/mes
- Asigna CTAs específicos
- Recomienda mejores canales por objetivo
- Incluye métricas de éxito

**Topic Clustering (Agrupación de Temas)**:
- Agrupa ideas por intención (awareness, consideration, decision)
- Organiza por etapa del funnel
- Detecta contenido faltante en el funnel
- Balancea contenido educativo vs promocional

**Trend Mining (Minería de Tendencias)**:
- Correlaciona tendencias externas con memoria interna
- Detecta tendencias emergentes antes de que sean mainstream
- Identifica cuándo una tendencia está saturada
- Recomienda momento óptimo para actuar

**Idea Graph (Grafo de Ideas)**:
- Relaciones persistentes entre conceptos
- Descubre conexiones no obvias
- Sugiere ideas basadas en relaciones del grafo
- Evoluciona con cada interacción

**Content Scoring (Evaluación de Contenido)**:
- Califica calidad (coherencia, profundidad)
- Evalúa potencial SEO (keywords, estructura)
- Analiza potencial social (viralidad, engagement)
- Recomienda mejoras específicas

### 🔧 Infraestructura

**Corre sobre**:
- **Redis**: Colas de procesamiento (BullMQ) para tareas asíncronas
- **Supabase**: Persistencia de memoria, embeddings, grafo de conocimiento
- **Brave Search**: Investigación de tendencias en tiempo real
- **OpenAI**: GPT-4o para generación, GPT-4o-mini para decisiones
- **DALL-E**: Generación de imágenes para contenido (opcional)

**Tablas en Supabase**:
```sql
marketing_trends      -- Tendencias detectadas (con embeddings)
marketing_profiles    -- Perfiles de audiencia analizados
marketing_content     -- Contenido generado y evaluado
marketing_memory      -- Memoria a largo plazo (grafo)
```

### 🎓 Casos de Uso Reales

1. **Planificación de lanzamiento**: Estrategia completa para lanzar nueva funcionalidad
2. **Análisis de competencia**: Identificar ventajas competitivas y gaps
3. **Generación de contenido**: Calendario editorial mensual para redes
4. **Investigación de mercado**: Análisis de oportunidades en nuevos segmentos
5. **Optimización de funnel**: Identificar cuellos de botella y optimizaciones
6. **Crisis management**: Estrategias de comunicación para situaciones complejas
7. **Partnership strategy**: Identificar y evaluar potenciales alianzas

### 🚀 Futuras Mejoras

- [ ] Integración con Google Analytics (análisis de métricas reales)
- [ ] A/B testing automatizado de contenido
- [ ] Generación de imágenes con DALL-E integrado
- [ ] Análisis de sentimiento en redes sociales
- [ ] Predicción de tendencias con ML
- [ ] Multi-idioma (español, inglés, portugués)

> **Nota**: Este agente representa el estado del arte en marketing autónomo, combinando investigación en tiempo real, memoria persistente y generación creativa en un solo sistema integrado.

---

## 📚 Catálogo de agentes (por áreas)

**Ingeniería**: Álgebra, Cálculo, Química, Computación, Eléctrica, Estadística, Física, Matemáticas Avanzadas, Seguridad de Redes, Resistencia de Materiales.
**Medicina**: Ciencias básicas, Ciencias aplicadas, Cirugía y Urgencias, Epidemiología, Especialidades I/II, Matemática médica, Medicina interna, **Patología**, **Semiología**.
**Economía**: Cálculo Económico, Desarrollo Económico, Econometría, Economía Internacional, Economía Laboral, Finanzas, Historia Económica, Macroeconomía, Microeconomía, Sector Público.
**Psicología**: DSM-5, Epistemología, Neuropsicología, Psicodiagnóstico, Psicoanálisis, Psicoestadística, Psicología Evolutiva, Psicología General, Psicología Social, Psicopatología.
**Herramientas**: Agente General (coordinador) y **PDF IA**.

> Agregar un agente nuevo = prompt base + herramientas + reglas de memoria + ruta API + entrada en UI.

---

## 🧑‍🏫 Acadel (la personalidad)

**Acadel** es el profesor/mascota de Acadelia: tono **claro, paciente y exigente**, prioriza comprensión antes que respuesta, fomenta el **razonamiento paso a paso** y muestra **trazabilidad** (cuando aplica). Sus pantallas de carga y errores están tematizadas con humor académico y el emoji **capibara**.

---

## ⚙️ Prerrequisitos

-   Node.js ≥ 18
-   PostgreSQL ≥ 14
-   **Redis ≥ 6 (obligatorio)**
-   **ClamAV** (`clamscan`)
-   **pdftocairo** (render PDF en chat)
-   FFmpeg / ffprobe

---

## 🔧 Configuración

### Archivos de configuración

```
/config
└── google-drive-key.json   # clave de servicio para Drive
```

> No subas claves reales. Provee `config/google-drive-key.example.json` con la forma del JSON.

### Base de datos (Supabase)

-   Importa `db/Acadelia-DB.sql` en tu proyecto **Supabase** para crear tablas/relaciones requeridas por la app.

### Variables de entorno (.env.example)

> Es **necesario** completar este archivo para que el sistema funcione. **No pegues claves reales en el repo** (usa placeholders), y **rota** cualquier clave que hayas expuesto.

```bash
# App
NODE_ENV=development
PORT=5000
APP_BASE_URL=http://localhost:5000
DOMAIN_URL=http://localhost:5000

# PostgreSQL / Supabase
DATABASE_URL=postgres://user:pass@localhost:5432/acadelia
SUPABASE_URL=https://<your>.supabase.co
SUPABASE_ANON_KEY=anon_key
SUPABASE_SERVICE_KEY=service_key
# (Opcional) conexión directa
SUPABASE_HOST=localhost
SUPABASE_PORT=5432
SUPABASE_USER=postgres
SUPABASE_PASSWORD=postgres
SUPABASE_DATABASE=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# LLM / OCR / Transcripción
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...
YOUTUBE_API_KEY=...
RAPIDAPI_KEY=...
RAPIDAPI_HOST=youtube-mp3-2025.p.rapidapi.com

# Búsqueda / Cálculo / Otros
BRAVE_SEARCH_API_KEY=...
WOLFRAM_APP_ID=...

# Pagos
PADDLE_SELLER_API_KEY=...
PADDLE_ENV=live
PADDLE_WEBHOOK_SECRET=...
# Ualá Bis (prod/stage)
UALA_USERNAME=...
UALA_CLIENT_ID=...
UALA_CLIENT_SECRET=...
UALA_STAGE_USERNAME=...
UALA_STAGE_CLIENT_ID=...
UALA_STAGE_CLIENT_SECRET=...

# Seguridad
JWT_SECRET=change-me
SESSION_SECRET=change-me
CSRF_SECRET=change-me
RATE_LIMIT_MAX=100
CSP_ENABLED=true
SECURITY_BYPASS=false

# Email (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=you@example.com
EMAIL_APP_PASSWORD=app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$EMAIL_USER
SMTP_PASS=$EMAIL_APP_PASSWORD
FEEDBACK_EMAIL=contact@example.com

# LangSmith (tracing opcional)
LANGSMITH_TRACING=false
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=Acadelia

# Modo mantenimiento y timers
MAINTENANCE_MODE=false
TERMS_VERSION=1.0
SECURITY_ARCHIVE_DAYS=90
SECURITY_DELETE_DAYS=365
LOGIN_DELETE_DAYS=30

# Hookdeck (webhooks)
HOOKDECK_WEBHOOK_URL=
HOOKDECK_SIGNING_SECRET=
```

---

## 🖼️ Capturas y demo

> Coloca las imágenes reales en `docs/media/` y reemplaza los nombres de archivo. Git LFS recomendado para `.mp4`.

<h3><strong>Logo &amp; Mascota</strong></h3>
<p align="center">
  <table>
    <tr>
      <td align="center">
        <a href="docs/media/Imagotipo.webp">
          <img src="docs/media/Imagotipo.webp" alt="Logo Acadelia" width="220">
        </a><br/>
        <sub><em>Logo</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/acadel.webp">
          <img src="docs/media/acadel.webp" alt="Acadel (mascota)" width="220">
        </a><br/>
        <sub><em>Acadel (mascota)</em></sub>
      </td>
    </tr>
  </table>
</p>

<h3><strong>Páginas</strong></h3>
<p align="center">
  <table>
    <tr>
      <td align="center">
        <a href="docs/media/landing.png">
          <img src="docs/media/landing.png" alt="Página principal" width="420">
        </a><br/>
        <sub><em>Página principal</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/sesion.png">
          <img src="docs/media/sesion.png" alt="Inicio de sesión" width="420">
        </a><br/>
        <sub><em>Inicio de sesión</em></sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <a href="docs/media/dashboard.png">
          <img src="docs/media/dashboard.png" alt="Dashboard de usuario" width="420">
        </a><br/>
        <sub><em>Dashboard de usuario</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/user-settings.png">
          <img src="docs/media/user-settings.png" alt="Configuración de usuario" width="420">
        </a><br/>
        <sub><em>Configuración de usuario</em></sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <a href="docs/media/store.png">
          <img src="docs/media/store.png" alt="Tienda" width="420">
        </a><br/>
        <sub><em>Tienda</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/mis-avas.png">
          <img src="docs/media/mis-avas.png" alt="Mis Avas" width="420">
        </a><br/>
        <sub><em>Mis Avas</em></sub>
      </td>
    </tr>
  </table>
</p>

<h3><strong>Pantallas de carga (4 chats)</strong></h3>
<p align="center">
  <table>
    <tr>
      <td align="center">
        <a href="docs/media/loading-pdf.png">
          <img src="docs/media/loading-pdf.png" alt="Loading PDF" width="420">
        </a><br/>
        <sub><em>Loading — PDF</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/loading-agente.png">
          <img src="docs/media/loading-agente.png" alt="Loading Agente" width="420">
        </a><br/>
        <sub><em>Loading — Agente Audio/Video</em></sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <a href="docs/media/loading-math.png">
          <img src="docs/media/loading-math.png" alt="Loading Matemático" width="420">
        </a><br/>
        <sub><em>Loading — Matemático</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/loading-theory.png">
          <img src="docs/media/loading-theory.png" alt="Loading Teórico" width="420">
        </a><br/>
        <sub><em>Loading — Teórico</em></sub>
      </td>
    </tr>
  </table>
</p>

<h3><strong>Chats</strong></h3>
<p align="center">
  <table>
      <tr>
      <td align="center">
        <a href="docs/media/chat-math.png">
          <img src="docs/media/chat-math.png" alt="Chat Matemático" width="420">
        </a><br/>
        <sub><em>Chat — Matemático</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/chat-theory.png">
          <img src="docs/media/chat-theory.png" alt="Chat Teórico" width="420">
        </a><br/>
        <sub><em>Chat — Teórico</em></sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <a href="docs/media/chat-pdf.png">
          <img src="docs/media/chat-pdf.png" alt="Chat PDF" width="420">
        </a><br/>
        <sub><em>Chat — PDF</em></sub>
      </td>
      <td align="center">
        <a href="docs/media/chat-agente.png">
          <img src="docs/media/chat-agente.png" alt="Chat Agente" width="420">
        </a><br/>
        <sub><em>Chat — Agente Audio/Video</em></sub>
      </td>
    </tr>
  </table>
</p>

<h3><strong>Demos (video)</strong></h3>
<p align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <a href="docs/media/acadelia.mp4">
          <img src="docs/media/acadelia0.gif" alt="Demo: Teórico + Matemático (MP4)" width="380">
        </a><br/>
        <sub><em>Teórico + Matemático</em> ·
          <a href="docs/media/acadelia.mp4">abrir MP4</a>
        </sub>
      </td>
      <td align="center" width="50%">
        <a href="docs/media/acadelia1.mp4">
          <img src="docs/media/acadelia1.gif" alt="Demo: Flujo PDF (MP4)" width="380">
        </a><br/>
        <sub><em>Flujo PDF</em> ·
          <a href="docs/media/acadelia1.mp4">abrir MP4</a>
        </sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <a href="docs/media/acadelia2.mp4">
          <img src="docs/media/acadelia2.gif" alt="Demo: Mermaid, código, búsqueda de imágenes (MP4)" width="380">
        </a><br/>
        <sub><em>Mermaid, examenes, búsqueda de imágenes</em> ·
          <a href="docs/media/acadelia2.mp4">abrir MP4</a>
        </sub>
      </td>
      <td align="center" width="50%">
        <a href="docs/media/acadelia3.mp4">
          <img src="docs/media/acadelia3.gif" alt="Demo: Tienda / pagos (MP4)" width="380">
        </a><br/>
        <sub><em>Tienda / pagos</em> ·
          <a href="docs/media/acadelia3.mp4">abrir MP4</a>
        </sub>
      </td>
    </tr>
  </table>
</p>

---

## 🔬 Sistema RAG (Retrieval-Augmented Generation)

El corazón de Acadelia es su sistema RAG avanzado que combina búsqueda semántica con conocimiento especializado por materia.

### 🎯 Características del RAG

-   **100% en Supabase**: No depende de bases de datos vectoriales externas (Pinecone, Weaviate, etc.)
-   **Hybrid Search**: Combina BM25 (búsqueda por keywords) + Vector Similarity (embeddings)
-   **OpenAI Embeddings**: `text-embedding-ada-002` (1536 dimensiones)
-   **40+ bases de conocimiento**: Una tabla de embeddings por cada agente/materia
-   **Limpieza de contexto**: Pre-procesamiento avanzado antes de enviar al LLM
-   **Memoria híbrida**: Combina memoria a corto plazo (última conversación) y largo plazo (resúmenes vectorizados)
-   **Cache inteligente (AcadelCache)**: Sistema de cache con categorización automática y TTL variable

### 🔄 Flujo Completo del Sistema RAG

```mermaid
flowchart TB
    A[Usuario hace pregunta] --> B{Análisis de intención}
    B --> C[Categorización de query]
    C --> D{Consulta cache}
    D -->|Cache hit| E[Retorna respuesta cached]
    D -->|Cache miss| F[Hybrid Search en Supabase]
    F --> G[Recupera chunks relevantes]
    G --> H[Carga memoria híbrida]
    H --> I{Requiere herramientas?}
    I -->|Sí - Matemático| J[WolframAlpha]
    I -->|Sí - Búsqueda| K[Brave Search]
    I -->|Sí - Imagen| L[DALL-E]
    I -->|No| M[Construcción de prompt]
    J --> M
    K --> M
    L --> M
    M --> N[GPT-4o genera respuesta]
    N --> O[Formateo LaTeX/Mermaid]
    O --> P[Guardado en chat_history]
    P --> Q[Actualización de cache]
    Q --> R[Respuesta al usuario]
```

### 📊 Hybrid Search Explained

El sistema usa una búsqueda híbrida que combina dos estrategias:

**1. BM25 (Keyword Search):**
-   Búsqueda tradicional por coincidencia de términos
-   Excelente para queries específicas con términos técnicos
-   Ejemplo: "ecuación diferencial de segundo orden"

**2. Vector Similarity:**
-   Búsqueda semántica basada en embeddings
-   Captura significado y contexto, no solo palabras exactas
-   Ejemplo: "cómo resolver problemas de movimiento" → encuentra contenido sobre cinemática

**Implementación en código:**
```javascript
// backend/services/chat/{materia}Service.js
const retriever = new SupabaseHybridSearch(embeddings, {
  client: supabase,
  tableName: 'emb_algebra',  // Tabla específica del agente
  similarityK: 3,            // Top 3 resultados por similitud
  keywordK: 2,               // Top 2 resultados por keywords
  similarityThreshold: 0.6   // Umbral mínimo de similitud
});
```

### 🧠 Memoria Híbrida

**Memoria a Corto Plazo:**
-   Últimos 10-20 mensajes de la conversación actual
-   Cargada en cada request para mantener contexto
-   Almacenada en `chat_history`

**Memoria a Largo Plazo:**
-   Resúmenes de conversaciones previas vectorizados
-   Búsqueda semántica de contexto relevante de sesiones anteriores
-   Consolidación periódica de conocimiento aprendido

### 💾 Cache Inteligente (AcadelCache)

Sistema de cache con categorización automática:

**Categorías y TTL:**
-   **Conceptos fundamentales**: 7 días (ej: "¿Qué es una integral?")
-   **Cálculos específicos**: 3 días (ej: "Derivada de x² + 3x")
-   **Información actualizable**: 1 día (ej: "Últimas investigaciones sobre...")

**Beneficios:**
-   Reducción de costos de API (menos llamadas a OpenAI)
-   Respuestas más rápidas para queries comunes
-   Consistencia en respuestas frecuentes

---

## 🚀 Instalación y Ejecución

### Requisitos Previos

**Software requerido:**
```bash
# Node.js
node --version  # Debe ser >= 22

# Redis
redis-server --version  # Debe ser >= 7

# FFmpeg
ffmpeg -version

# ClamAV
clamscan --version

# pdftocairo (parte de poppler-utils)
pdftocairo -v
```

**Instalación de dependencias del sistema:**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  redis-server \
  clamav clamav-daemon \
  ffmpeg \
  poppler-utils

# macOS
brew install redis clamav ffmpeg poppler

# Iniciar servicios
sudo systemctl start redis-server
sudo systemctl start clamav-daemon
```

### Configuración del Proyecto

**1. Clonar el repositorio:**
```bash
git clone https://github.com/rodhnin/acadelia.git
cd acadelia
```

**2. Instalar dependencias de Node.js:**
```bash
npm install
```

**3. Configurar variables de entorno:**
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus claves
nano .env
```

**Variables críticas que debes configurar:**
```bash
# Supabase (OBLIGATORIO)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_KEY=tu-service-key

# OpenAI (OBLIGATORIO)
OPENAI_API_KEY=sk-tu-api-key

# Redis (OBLIGATORIO)
REDIS_HOST=localhost
REDIS_PORT=6379

# Seguridad (CAMBIAR VALORES)
JWT_SECRET=tu-secret-muy-seguro-aleatorio
SESSION_SECRET=otro-secret-muy-seguro
CSRF_SECRET=csrf-secret-aleatorio
```

**4. Configurar Base de Datos:**
```bash
# Importar el esquema en Supabase
# Ve a tu dashboard de Supabase → SQL Editor
# Ejecuta el contenido de db/Acadelia-DB.sql
```

**5. Iniciar ClamAV:**
```bash
# Actualizar base de datos de virus
sudo freshclam

# Iniciar el daemon
sudo systemctl start clamav-daemon
```

### Modos de Ejecución

**Desarrollo (con hot reload):**
```bash
npm run dev
```

**Producción (código optimizado):**
```bash
# Build del frontend (minificación + ofuscación)
npm run build

# Iniciar servidor
npm start
```

**Docker (Recomendado para producción):**
```bash
# Con docker-compose
docker-compose -f docker-compose.production.yml up -d

# Ver logs
docker-compose logs -f backend

# Detener
docker-compose down
```

### Verificar que Todo Funciona

**1. Health Check del Backend:**
```bash
curl http://localhost:5000/api/config
```

Deberías ver:
```json
{
  "status": "operational",
  "environment": "development",
  "features": {
    "avaAccess": true,
    "herramientaAccess": true
  }
}
```

**2. Verificar Redis:**
```bash
redis-cli ping
# Debe responder: PONG
```

**3. Verificar ClamAV:**
```bash
sudo clamdscan --version
```

**4. Acceder a la aplicación:**
-   Frontend: `http://localhost:3000` (si usas Nginx)
-   Backend API: `http://localhost:5000`

### Solución de Problemas Comunes

**Error: "Cannot connect to Redis"**
```bash
# Verificar que Redis está corriendo
sudo systemctl status redis-server

# Si no está corriendo
sudo systemctl start redis-server
```

**Error: "ClamAV: No such file or directory"**
```bash
# Verificar instalación
which clamscan

# Reinstalar si es necesario
sudo apt-get install --reinstall clamav
```

**Error: "FFmpeg not found"**
```bash
# Verificar instalación
which ffmpeg

# Instalar si falta
sudo apt-get install ffmpeg
```

**Error: "Cannot connect to Supabase"**
-   Verifica que las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` sean correctas
-   Verifica que importaste el esquema SQL correctamente
-   Revisa los logs: `backend/logs/error.log`

---

## 🔌 Endpoints clave (extracto)

> Rutas representativas (pueden variar según prefijo/baseURL). Ver `server.js` y `/controllers`.

| Área     | Método | Ruta                           | Descripción                                |
| -------- | ------ | ------------------------------ | ------------------------------------------ |
| Chat/RAG | POST   | `/api/chat/document`           | Ingresa documento → OCR → embeddings       |
| Chat/RAG | POST   | `/api/chat/pdf`                | Chat contextual sobre documentos indexados |
| Chat/RAG | POST   | `/api/chat/youtubeAudio`       | Descarga YouTube → MP3 → transcribe        |
| Chat/RAG | POST   | `/api/chat/videoTranscription` | Transcribe video subido                    |
| Chat/RAG | POST   | `/api/chat/audioTranscription` | Transcribe audio subido                    |
| Chat/RAG | POST   | `/api/chat/openai`             | Chat general / fallback                    |
| Usuarios | GET    | `/api/users/profile`           | Perfil / estado de acceso                  |
| Usuarios | POST   | `/api/users/update`            | Actualiza perfil/ajustes                   |
| Pagos    | POST   | `/api/payments/paddle/webhook` | Webhook de Paddle                          |
| Pagos    | GET    | `/api/payments/subscriptions`  | Listado/estado de suscripciones            |
| Admin    | GET    | `/api/admin/queueMonitor`      | Monitor de colas (BullMQ)                  |
| Admin    | GET    | `/api/admin/security/logs`     | Logs de seguridad                          |
| Shared   | POST   | `/api/shared/contact`          | Contacto/feedback                          |

---

## 👥 Autores

-   **Líder / Full‑stack:** Rodney Dhavid Jimenez Chacin — [github.com/rodhnin](https://github.com/rodhnin)
-   **Backend / APIs / DB / integración FE:** Brandon Jesús Zambrano Alcina — [github.com/Zedkhn](https://github.com/Zedkhn)
-   **Frontend / UX / Testing:** Leandro Jesús Zambrano Alcina — [github.com/leandronix](https://github.com/leandronix)

---

## 🧭 Roadmap breve

-   Refactor de agentes/herramientas (contratos y tests)
-   Tests E2E (chats + RAG) y métricas
-   Observabilidad (LangSmith / OpenTelemetry)
-   Hardening (secrets manager, WAF/CDN, rotación)
-   UX/Accesibilidad y performance
-   Seeds y datos de ejemplo

---

## 🔖 Changelog

-   **v0.1.0 — MVP público de portafolio**  
    RAG + agentes + **4 chats** + **Agente de Marketing**; **sistema de tienda**, **usuarios**, **chats funcionales con agentes IA**, **análisis de imágenes**, **panel de administrador**, **5 carreras con ~10 chats cada una** (teórico + matemático), **marketing agent inteligente y funcional**, **panel de finanzas y administración**, **configuración de usuario**, **páginas de inicio y branding** — todo lo que una página **SaaS** necesita para demostración de arquitectura y capacidades.

---

## 🐛 ¿Encontraste un bug?

1. Abre un issue con la plantilla **Bug report**  
   **Issues → New issue → 🐛 Bug report**  
   Incluye **pasos para reproducir**, **capturas** y **logs** si es posible.

2. ¿Es un problema de **seguridad**?  
   **No** lo publiques como issue. Lee **[SECURITY.md](SECURITY.md)** y envía reporte privado.

3. ¿Quieres proponer una mejora?  
   Lee **[CONTRIBUTING.md](CONTRIBUTING.md)** y usa **Feature request**.

---

## 📝 Licencia

**MIT (Portafolio/Educativo)**  
Copyright © 2025  
**Rodney Dhavid Jimenez Chacin**,  
**Brandon Jesús Zambrano Alcina**,  
**Leandro Jesús Zambrano Alcina**

> Uso permitido únicamente con fines **educativos, demostrativos o de portafolio**.  
> No se autoriza la **venta, sublicencia o explotación comercial** de Acadelia o sus derivados.
