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
          <img src="docs/media/demo-01-landing-login.gif" alt="Paso 1 — Landing → Login" width="420">
        </a><br/>
        <sub><strong>Paso 1</strong> — <em>Landing → Login</em></sub>
      </td>
      <td align="center" width="50%">
        <a href="docs/media/demo-02-login-dashboard-avas.gif">
          <img src="docs/media/demo-02-login-dashboard-avas.gif" alt="Paso 2 — Login → Dashboard → Mis Avas" width="420">
        </a><br/>
        <sub><strong>Paso 2</strong> — <em>Login → Dashboard → Mis Avas</em></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <a href="docs/media/demo-03-select-ava-loading.gif">
          <img src="docs/media/demo-03-select-ava-loading.gif" alt="Paso 3 — Selección de Ava + pantalla de carga" width="420">
        </a><br/>
        <sub><strong>Paso 3</strong> — <em>Seleccionar Ava + pantalla de carga</em></sub>
      </td>
      <td align="center" width="50%">
        <a href="docs/media/demo-04-new-chat-response.gif">
          <img src="docs/media/demo-04-new-chat-response.gif" alt="Paso 4 — Nueva query → respuesta de la IA" width="420">
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

```
/ (monorepo sugerido)
├─ backend/           # API Express, servicios IA, colas
│  ├─ controllers/
│  ├─ services/       # RAG, OCR, transcripción, marketing, agentes
│  ├─ middlewares/
│  ├─ jobs/           # BullMQ (Redis)
│  ├─ lib/            # OpenAI, Mistral, Supabase, Redis, FFmpeg, etc.
│  └─ server.js       # Entrypoint
├─ frontend/          # HTML + CSS + JS vanilla (branding Acadel)
│  ├─ public/
│  └─ views/
├─ db/                # Esquemas/dumps
│  └─ **Acadelia-DB.sql**  # Esquema base para **Supabase**
├─ scripts/           # build/minify/ofuscación
├─ config/            # claves de servicio
│  └─ google-drive-key.json
└─ docs/              # capturas y documentación
```

### 🧩 Tecnologías clave

-   **Node.js (ESM) + Express**
-   **Supabase** (Postgres + Storage + **Vector DB** para RAG)
-   **OpenAI** (LLM + **Whisper** STT)
-   **Mistral** (OCR)
-   **Redis + BullMQ** (colas/rate-limit distribuido)
-   **FFmpeg/ffprobe + ytdl-core** (ingestión de video/audio)
-   **Helmet · express-rate-limit · ClamAV · Winston** (seguridad/logs)

> **Requisitos críticos** para ejecutar: **Redis**, **ClamAV (`clamscan`)**, **pdftocairo**, **FFmpeg/ffprobe**.

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

Subsistema enfocado en **branding, estrategia y contenido** de Acadelia. Un **DirectorAgent** orquesta subagentes y servicios para extraer, evaluar, recordar y producir piezas accionables.

### 🧩 Componentes

-   **DirectorAgent** (orquestador): decide qué subagente actúa y cómo prioriza.
-   **ExtractionService**: detecta temas, entidades y oportunidades (desde texto y/o web).
-   **MatchingService**: _clustering_ y **deduplicación**; evita repetir ideas.
-   **MemoryService**: elige qué persiste en **Supabase** (memoria a largo plazo) y lo relaciona en un **grafo de ideas**.
-   **ContentService**: genera **briefs**, copies largos/cortos, matrices y **Mermaid**.
-   **SimulationService**: simula audiencia/competencia/canales para evaluar impacto.
-   **ExplainService**: explica razones y trade-offs de las decisiones.

### 🔁 Flujo del DirectorAgent

```mermaid
flowchart LR
    A[Input del usuario / evento] --> B(DirectorAgent)
    B --> C[ExtractionService]
    B --> D[MatchingService]
    D --> E[MemoryService]
    C --> F[ContentService]
    F --> G[ExplainService]
    G --> H[SimulationService]
    H --> I[Salida: estrategia, briefs, ideas persistidas]
```

### ⭐ Habilidades

-   **Calendar builder** (objetivos, CTA y canales)
-   **Topic clustering** (por intención / etapa del funnel)
-   **Trend mining** (tendencias externas ↔ memoria interna)
-   **Idea graph** (relaciones temáticas persistentes)
-   **Content scoring** (calidad, coherencia, potencial SEO/social)

> Corre sobre **Redis** (colas), **Supabase** (persistencia), y herramientas externas (Brave Search, DALL·E, Whisper). La memoria se retroalimenta en tiempo real.

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
        <video
          src="docs/media/acadelia.mp4"
          width="420"
          controls
          preload="none"
          poster="docs/media/chat-theory.png">
        </video><br/>
        <sub><em>Teórico + Matemático</em> ·
          <a href="docs/media/acadelia.mp4">abrir MP4</a>
        </sub>
      </td>
      <td align="center" width="50%">
        <video
          src="docs/media/acadelia1.mp4"
          width="420"
          controls
          preload="none"
          poster="docs/media/chat-pdf.png">
        </video><br/>
        <sub><em>Flujo PDF</em> ·
          <a href="docs/media/acadelia1.mp4">abrir MP4</a>
        </sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <video
          src="docs/media/acadelia2.mp4"
          width="420"
          controls
          preload="none"
          poster="docs/media/chat-agente.png">
        </video><br/>
        <sub><em>Mermaid, código, búsqueda de imágenes</em> ·
          <a href="docs/media/acadelia2.mp4">abrir MP4</a>
        </sub>
      </td>
      <td align="center" width="50%">
        <video
          src="docs/media/acadelia3.mp4"
          width="420"
          controls
          preload="none"
          poster="docs/media/store.png">
        </video><br/>
        <sub><em>Tienda / pagos</em> ·
          <a href="docs/media/acadelia3.mp4">abrir MP4</a>
        </sub>
      </td>
    </tr>
  </table>
</p>

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
