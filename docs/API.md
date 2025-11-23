# Guía de API de Acadelia

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Endpoints de Usuarios](#endpoints-de-usuarios)
4. [Endpoints de Chat y RAG](#endpoints-de-chat-y-rag)
5. [Endpoints de Agentes Especializados](#endpoints-de-agentes-especializados)
6. [Endpoints de Herramientas](#endpoints-de-herramientas)
7. [Endpoints de Pagos](#endpoints-de-pagos)
8. [Endpoints de Administración](#endpoints-de-administración)
9. [Códigos de Error](#códigos-de-error)
10. [Rate Limiting](#rate-limiting)
11. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Introducción

La API de Acadelia es una API RESTful que proporciona acceso a todos los servicios de la plataforma.

**Base URL**:

```
Desarrollo: http://localhost:5000
Producción: https://acadelia.com
```

**Formato de Respuesta**: JSON

**Headers Requeridos**:

```
Content-Type: application/json
X-CSRF-Token: {csrf-token}  (para POST/PUT/DELETE)
```

---

## Autenticación

Acadelia usa **JWT (JSON Web Tokens)** para autenticación.

### Login

**Endpoint**: `POST /api/users/login`

**Request Body**:

```json
{
    "email": "usuario@example.com",
    "password": "password123"
}
```

**Response** (200 OK):

```json
{
    "message": "Login exitoso",
    "user": {
        "id": "uuid",
        "email": "usuario@example.com",
        "name": "Usuario",
        "plan": "free"
    }
}
```

**Cookies establecidas**:

-   `auth-token`: JWT token (httpOnly, 1 hora)
-   `refresh-token`: Refresh token (httpOnly, 7 días)

**Rate Limit**: 5 requests / 5 minutos por email/IP

**Errores**:

-   `400`: Datos faltantes
-   `401`: Credenciales inválidas
-   `429`: Demasiados intentos de login

---

### Registro

**Endpoint**: `POST /api/users/register`

**Request Body**:

```json
{
    "email": "nuevo@example.com",
    "password": "SecurePass123!",
    "name": "Nuevo Usuario",
    "carrera_id": "uuid"
}
```

**Response** (201 Created):

```json
{
    "message": "Usuario creado exitosamente",
    "userId": "uuid"
}
```

**Validaciones**:

-   Email: Formato válido
-   Password: Mínimo 8 caracteres, 1 mayúscula, 1 número
-   Name: 2-100 caracteres

---

### Logout

**Endpoint**: `POST /api/users/logout`

**Headers**: Requiere autenticación (JWT)

**Response** (200 OK):

```json
{
    "message": "Logout exitoso"
}
```

**Efecto**:

-   Invalida el JWT actual (blacklist)
-   Elimina refresh token de Redis
-   Borra cookies del cliente

---

### Refresh Token

**Endpoint**: `POST /api/users/refresh`

**Cookies requeridas**: `refresh-token`

**Response** (200 OK):

```json
{
    "message": "Token renovado"
}
```

**Cookies actualizadas**:

-   `auth-token`: Nuevo JWT (1 hora)

---

## Endpoints de Usuarios

### Obtener Perfil

**Endpoint**: `GET /api/users/profile`

**Headers**: Requiere autenticación

**Response** (200 OK):

```json
{
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "Usuario",
    "plan": "free",
    "created_at": "2024-01-15T10:30:00Z",
    "ava_access": [
        {
            "ava_id": "uuid",
            "ava_name": "Álgebra",
            "access_granted_at": "2024-01-15T10:30:00Z"
        }
    ],
    "usage_stats": {
        "messages_today": 5,
        "messages_this_hour": 2,
        "tokens_used_this_month": 15000
    }
}
```

---

### Actualizar Perfil

**Endpoint**: `PUT /api/users/update`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "name": "Nuevo Nombre",
    "preferences": {
        "theme": "dark",
        "notifications": true
    }
}
```

**Response** (200 OK):

```json
{
  "message": "Perfil actualizado",
  "user": {
    "id": "uuid",
    "name": "Nuevo Nombre",
    "preferences": { ... }
  }
}
```

---

### Cambiar Contraseña

**Endpoint**: `POST /api/users/change-password`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!"
}
```

**Response** (200 OK):

```json
{
    "message": "Contraseña actualizada exitosamente"
}
```

**Efecto**: Invalida todas las sesiones existentes

---

### Solicitar Eliminación de Cuenta

**Endpoint**: `POST /api/users/delete-account`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "reason": "No uso más el servicio",
    "password": "MyPassword123!"
}
```

**Response** (200 OK):

```json
{
    "message": "Solicitud de eliminación registrada",
    "deletion_date": "2024-02-14T10:30:00Z"
}
```

**Nota**: La cuenta se elimina después de 30 días (puede cancelarse en ese período)

---

## Endpoints de Chat y RAG

### Crear Chat

**Endpoint**: `POST /api/chat/create`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "ava_id": "uuid", // Para chats de agente
    "herramienta_id": "uuid", // Para chats de herramienta (PDF, Agente)
    "title": "Mi chat de Álgebra"
}
```

**Response** (201 Created):

```json
{
    "chatId": "uuid",
    "title": "Mi chat de Álgebra",
    "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Listar Chats

**Endpoint**: `GET /api/chat/list`

**Headers**: Requiere autenticación

**Query Params**:

-   `ava_id` (opcional): Filtrar por agente
-   `herramienta_id` (opcional): Filtrar por herramienta
-   `limit` (opcional): Número de chats (default: 20)
-   `offset` (opcional): Para paginación (default: 0)

**Response** (200 OK):

```json
{
    "chats": [
        {
            "id": "uuid",
            "title": "Límites y Continuidad",
            "ava_name": "Cálculo",
            "last_message": "2024-01-15T14:30:00Z",
            "message_count": 15
        }
        // ...
    ],
    "total": 25,
    "limit": 20,
    "offset": 0
}
```

---

### Obtener Historial de Chat

**Endpoint**: `GET /api/chat/:chatId/history`

**Headers**: Requiere autenticación

**Query Params**:

-   `limit` (opcional): Mensajes a retornar (default: 50)
-   `before` (opcional): Timestamp para paginación

**Response** (200 OK):

```json
{
    "chatId": "uuid",
    "messages": [
        {
            "id": "uuid",
            "role": "user",
            "content": "¿Qué es una derivada?",
            "timestamp": "2024-01-15T10:30:00Z"
        },
        {
            "id": "uuid",
            "role": "assistant",
            "content": "Una derivada es...",
            "timestamp": "2024-01-15T10:30:15Z",
            "metadata": {
                "tokens_used": 450,
                "model": "gpt-4o",
                "has_references": true
            }
        }
        // ...
    ],
    "hasMore": false
}
```

---

### Eliminar Chat

**Endpoint**: `DELETE /api/chat/:chatId`

**Headers**: Requiere autenticación + CSRF

**Response** (200 OK):

```json
{
    "message": "Chat eliminado exitosamente"
}
```

---

## Endpoints de Agentes Especializados

Todos los agentes especializados siguen la misma estructura de endpoint.

### Query a Agente

**Endpoint**: `POST /api/openai/query-{agente}`

Agentes disponibles:

-   **Ingeniería**: `algebra`, `calculo`, `fisica`, `quimica`, `estadistica`, etc.
-   **Medicina**: `patologia`, `semiologia`, `anatomia`, etc.
-   **Economía**: `microeconomia`, `macroeconomia`, `econometria`, etc.
-   **Psicología**: `dsm5`, `psicoanalisis`, `neuropsicologia`, etc.

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "chatId": "uuid",
    "message": "Explica el teorema fundamental del cálculo",
    "options": {
        "temperature": 0.7, // Opcional (0-1)
        "includeReferences": true // Opcional (default: true)
    }
}
```

**Response** (200 OK):

```json
{
    "message": "El teorema fundamental del cálculo establece...",
    "references": [
        {
            "content": "Fragmento relevante de la base de conocimiento...",
            "similarity": 0.89,
            "metadata": {
                "source": "Cálculo - Thomas, 12va ed.",
                "page": 245
            }
        }
    ],
    "metadata": {
        "tokens_used": 850,
        "model": "gpt-4o",
        "processing_time_ms": 2150,
        "cache_hit": false,
        "tools_used": ["wolfram"]
    },
    "usage": {
        "messages_remaining_today": 5,
        "messages_remaining_hour": 2
    }
}
```

**Rate Limit**:

-   Free: 3 mensajes/hora, 10 mensajes/día
-   Premium: Ilimitado

**Errores**:

-   `400`: Datos inválidos
-   `403`: Sin acceso al agente
-   `429`: Límite de mensajes alcanzado
-   `500`: Error procesando query

---

### Query Multimodal (con imagen)

**Endpoint**: `POST /api/openai/multimodal-{agente}`

**Headers**: Requiere autenticación + CSRF

**Content-Type**: `multipart/form-data`

**Form Data**:

```
chatId: uuid
message: "¿Qué muestra esta imagen?"
image: [archivo]
```

**Response**: Igual que query normal, pero incluye análisis de imagen

---

## Endpoints de Herramientas

### Chat con PDF

#### 1. Subir Documento

**Endpoint**: `POST /api/chat/document`

**Headers**: Requiere autenticación + CSRF

**Content-Type**: `multipart/form-data`

**Form Data**:

```
chatId: uuid
document: [archivo PDF]
ava_id: uuid  // Agente que procesará el documento
```

**Response** (200 OK):

```json
{
    "message": "Documento procesado exitosamente",
    "documentId": "uuid",
    "stats": {
        "pages": 25,
        "chunks_created": 87,
        "processing_time_ms": 15000
    }
}
```

**Límites**:

-   Tamaño máximo: 20MB
-   Formatos: PDF únicamente
-   Procesamiento: Asíncrono (puede tomar tiempo)

---

#### 2. Consultar sobre Documento

**Endpoint**: `POST /api/chat/pdf`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "chatId": "uuid",
    "message": "¿Qué dice el documento sobre fotosíntesis?",
    "documentId": "uuid" // Opcional, usa último documento si no se especifica
}
```

**Response** (200 OK):

```json
{
  "message": "Según el documento, la fotosíntesis es...",
  "references": [
    {
      "content": "Fragmento exacto del PDF...",
      "page": 12,
      "chunk_id": "uuid"
    }
  ],
  "metadata": { ... }
}
```

---

### Agente Audio/Video

#### 1. Procesar YouTube

**Endpoint**: `POST /api/chat/youtubeAudio`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "chatId": "uuid",
    "url": "https://www.youtube.com/watch?v=...",
    "ava_id": "uuid"
}
```

**Response** (202 Accepted):

```json
{
    "message": "Procesamiento iniciado",
    "jobId": "uuid",
    "estimatedTime": "5-10 minutos"
}
```

**Nota**: Procesamiento asíncrono. Usa polling o webhooks para obtener resultado.

---

#### 2. Procesar Audio Subido

**Endpoint**: `POST /api/chat/audioTranscription`

**Headers**: Requiere autenticación + CSRF

**Content-Type**: `multipart/form-data`

**Form Data**:

```
chatId: uuid
audio: [archivo]
ava_id: uuid
```

**Response** (202 Accepted):

```json
{
    "message": "Transcripción iniciada",
    "jobId": "uuid"
}
```

**Formatos soportados**: MP3, WAV, M4A
**Tamaño máximo**: 50MB

---

#### 3. Procesar Video Subido

**Endpoint**: `POST /api/chat/videoTranscription`

**Headers**: Requiere autenticación + CSRF

**Content-Type**: `multipart/form-data`

**Form Data**:

```
chatId: uuid
video: [archivo]
ava_id: uuid
```

**Response** (202 Accepted):

```json
{
    "message": "Transcripción iniciada",
    "jobId": "uuid"
}
```

**Formatos soportados**: MP4, AVI, MOV
**Tamaño máximo**: 100MB

---

#### 4. Verificar Estado de Job

**Endpoint**: `GET /api/chat/job/:jobId`

**Headers**: Requiere autenticación

**Response** (200 OK):

```json
{
    "jobId": "uuid",
    "status": "processing|completed|failed",
    "progress": 65,
    "result": {
        "transcription": "Texto transcrito...",
        "duration": 320,
        "words": 1580
    },
    "error": null
}
```

---

## Endpoints de Pagos

### Crear Checkout (Paddle)

**Endpoint**: `POST /api/payments/create-checkout`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "planId": "premium-monthly",
    "successUrl": "https://acadelia.com/success",
    "cancelUrl": "https://acadelia.com/cancel"
}
```

**Response** (200 OK):

```json
{
    "checkoutUrl": "https://checkout.paddle.com/...",
    "transactionId": "uuid"
}
```

---

### Webhook de Paddle

**Endpoint**: `POST /api/payments/paddle/webhook`

**Headers**: Incluye firma de Paddle

**Request Body**: Variado según evento (subscription.created, payment.succeeded, etc.)

**Response** (200 OK): Confirmación de recepción

**Nota**: Este endpoint es llamado por Paddle, no por el cliente

---

### Listar Suscripciones

**Endpoint**: `GET /api/payments/subscriptions`

**Headers**: Requiere autenticación

**Response** (200 OK):

```json
{
    "subscriptions": [
        {
            "id": "sub_123",
            "plan": "premium-monthly",
            "status": "active",
            "current_period_start": "2024-01-15T00:00:00Z",
            "current_period_end": "2024-02-15T00:00:00Z",
            "cancel_at_period_end": false
        }
    ]
}
```

---

### Cancelar Suscripción

**Endpoint**: `POST /api/payments/cancel-subscription`

**Headers**: Requiere autenticación + CSRF

**Request Body**:

```json
{
    "subscriptionId": "sub_123",
    "reason": "Opcional: razón de cancelación"
}
```

**Response** (200 OK):

```json
{
    "message": "Suscripción cancelada",
    "cancelsAt": "2024-02-15T00:00:00Z"
}
```

---

## Endpoints de Administración

**Nota**: Todos requieren rol de administrador

### Monitoreo de Colas

**Endpoint**: `GET /api/admin/queueMonitor`

**Headers**: Requiere autenticación + rol admin

**Response** (200 OK):

```json
{
    "queues": [
        {
            "name": "throttle-openai",
            "active": 3,
            "waiting": 15,
            "completed": 1250,
            "failed": 12
        },
        {
            "name": "throttle-pdf",
            "active": 1,
            "waiting": 4,
            "completed": 87,
            "failed": 2
        }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Logs de Seguridad

**Endpoint**: `GET /api/admin/security/logs`

**Headers**: Requiere autenticación + rol admin

**Query Params**:

-   `level` (opcional): `warn`, `error` (default: all)
-   `limit` (opcional): Número de logs (default: 100)
-   `since` (opcional): Timestamp desde cuando obtener logs

**Response** (200 OK):

```json
{
    "logs": [
        {
            "timestamp": "2024-01-15T10:25:00Z",
            "level": "warn",
            "event": "rate_limit_exceeded",
            "details": {
                "userId": "uuid",
                "endpoint": "/api/chat/query-algebra"
            }
        }
        // ...
    ],
    "total": 250
}
```

---

### Banear Usuario

**Endpoint**: `POST /api/admin/users/ban`

**Headers**: Requiere autenticación + CSRF + rol admin

**Request Body**:

```json
{
    "userId": "uuid",
    "reason": "Abuso del sistema",
    "duration": 86400 // Segundos (null = permanente)
}
```

**Response** (200 OK):

```json
{
    "message": "Usuario baneado",
    "unbansAt": "2024-01-16T10:30:00Z"
}
```

---

### Analytics

**Endpoint**: `GET /api/admin/analytics`

**Headers**: Requiere autenticación + rol admin

**Query Params**:

-   `metric`: `users`, `messages`, `tokens`, `revenue`
-   `period`: `day`, `week`, `month`
-   `from`: Fecha inicio (ISO 8601)
-   `to`: Fecha fin (ISO 8601)

**Response** (200 OK):

```json
{
    "metric": "messages",
    "period": "day",
    "data": [
        {
            "date": "2024-01-15",
            "value": 1250,
            "breakdown": {
                "algebra": 320,
                "calculo": 280,
                "fisica": 150,
                "otros": 500
            }
        }
        // ...
    ]
}
```

---

## Códigos de Error

### 400 Bad Request

```json
{
    "error": "Datos inválidos",
    "code": "INVALID_DATA",
    "details": {
        "field": "email",
        "message": "Email inválido"
    }
}
```

### 401 Unauthorized

```json
{
    "error": "No autenticado",
    "code": "NO_TOKEN"
}
```

### 403 Forbidden

```json
{
    "error": "Sin permisos para acceder a este recurso",
    "code": "ACCESS_DENIED"
}
```

### 404 Not Found

```json
{
    "error": "Recurso no encontrado",
    "code": "NOT_FOUND"
}
```

### 429 Too Many Requests

```json
{
    "error": "Demasiadas solicitudes",
    "code": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 3600
}
```

### 500 Internal Server Error

```json
{
    "error": "Error interno del servidor",
    "code": "INTERNAL_ERROR"
}
```

**Códigos específicos**:

-   `NO_TOKEN`: Token JWT no proporcionado
-   `INVALID_TOKEN`: Token JWT inválido o expirado
-   `TOKEN_BLACKLISTED`: Token ha sido invalidado
-   `SESSION_EXPIRED`: Sesión expirada
-   `CSRF_TOKEN_INVALID`: Token CSRF inválido
-   `CSRF_TOKEN_MISSING`: Token CSRF no proporcionado
-   `AVA_ACCESS_DENIED`: Sin acceso al agente
-   `MESSAGE_LIMIT_REACHED`: Límite de mensajes alcanzado
-   `RATE_LIMIT_EXCEEDED`: Rate limit excedido
-   `INFECTED_FILE`: Archivo infectado detectado
-   `FILE_TOO_LARGE`: Archivo excede tamaño máximo
-   `INVALID_FILE_TYPE`: Tipo de archivo no permitido

---

## Rate Limiting

### Headers de Rate Limit

Todas las respuestas incluyen headers de rate limiting:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705318800
```

### Límites por Endpoint

| Endpoint           | Free       | Premium     |
| ------------------ | ---------- | ----------- |
| Login              | 5 / 5 min  | 5 / 5 min   |
| Chat (por hora)    | 3          | Ilimitado   |
| Chat (por día)     | 10         | Ilimitado   |
| Upload PDF         | 5 / día    | 50 / día    |
| Upload Audio/Video | 3 / día    | 30 / día    |
| API General        | 100 / hora | 1000 / hora |

---

## Ejemplos de Uso

### JavaScript (Fetch)

```javascript
// Login
const login = async (email, password) => {
    const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include", // Importante para cookies
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return await response.json();
};

// Query a agente
const queryAgent = async (chatId, message, agentType) => {
    // Obtener CSRF token
    const csrfToken = document.cookie
        .split("; ")
        .find(row => row.startsWith("csrf-token="))
        ?.split("=")[1];

    const response = await fetch(`/api/openai/query-${agentType}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ chatId, message }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return await response.json();
};

// Upload PDF
const uploadPDF = async (chatId, file, avaId) => {
    const formData = new FormData();
    formData.append("chatId", chatId);
    formData.append("document", file);
    formData.append("ava_id", avaId);

    const csrfToken = getCsrfToken();

    const response = await fetch("/api/chat/document", {
        method: "POST",
        headers: {
            "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: formData,
    });

    return await response.json();
};
```

### Python (requests)

```python
import requests

class AcadeliaAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()

    def login(self, email, password):
        response = self.session.post(
            f'{self.base_url}/api/users/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        return response.json()

    def query_agent(self, chat_id, message, agent_type):
        csrf_token = self.session.cookies.get('csrf-token')

        response = self.session.post(
            f'{self.base_url}/api/openai/query-{agent_type}',
            json={'chatId': chat_id, 'message': message},
            headers={'X-CSRF-Token': csrf_token}
        )
        response.raise_for_status()
        return response.json()

# Uso
api = AcadeliaAPI('https://acadelia.com')
api.login('user@example.com', 'password')

result = api.query_agent(
    chat_id='uuid',
    message='¿Qué es una integral?',
    agent_type='calculo'
)

print(result['message'])
```

### cURL

```bash
# Login
curl -X POST https://acadelia.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  -c cookies.txt

# Query (usando cookies guardadas)
curl -X POST https://acadelia.com/api/openai/query-algebra \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: {token}" \
  -b cookies.txt \
  -d '{"chatId":"uuid","message":"Resuelve x^2 + 5x + 6"}'

# Upload PDF
curl -X POST https://acadelia.com/api/chat/document \
  -H "X-CSRF-Token: {token}" \
  -b cookies.txt \
  -F "chatId=uuid" \
  -F "ava_id=uuid" \
  -F "document=@documento.pdf"
```

---

## Mejores Prácticas

### 1. Manejo de Errores

Siempre manejar errores de la API:

```javascript
try {
    const result = await queryAgent(chatId, message, "algebra");
    // Procesar resultado
} catch (error) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
        // Mostrar mensaje al usuario sobre límite
        showRateLimitError(error.retryAfter);
    } else if (error.code === "MESSAGE_LIMIT_REACHED") {
        // Sugerir upgrade a Premium
        showUpgradePrompt();
    } else {
        // Error genérico
        showError(error.message);
    }
}
```

### 2. Reintentos con Backoff

Para errores temporales (500, 503):

```javascript
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;

            if (response.status >= 500 && i < maxRetries - 1) {
                // Esperar con exponential backoff
                await sleep(Math.pow(2, i) * 1000);
                continue;
            }

            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
        }
    }
};
```

### 3. Renovación Automática de Token

```javascript
const apiCall = async (url, options) => {
    let response = await fetch(url, options);

    if (response.status === 401) {
        // Intentar renovar token
        const refreshed = await fetch("/api/users/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (refreshed.ok) {
            // Reintentar request original
            response = await fetch(url, options);
        }
    }

    return response;
};
```

### 4. Cancelación de Requests

Para requests largos (transcripciones, OCR):

```javascript
const controller = new AbortController();

fetch("/api/chat/youtubeAudio", {
    signal: controller.signal,
    // ...
});

// Cancelar si el usuario navega a otra página
window.addEventListener("beforeunload", () => {
    controller.abort();
});
```

---

## Versionado de API

Actualmente, Acadelia está en **v1** (implícito, sin prefijo en rutas).

Futuras versiones usarán prefijo:

-   `v1`: `/api/v1/...`
-   `v2`: `/api/v2/...`

Versiones antiguas se mantendrán por al menos 12 meses después del lanzamiento de una nueva versión mayor.

---

## Changelog de API

### v1.0.0 (2024-01-15)

-   Lanzamiento inicial
-   40+ agentes especializados
-   Sistema RAG completo
-   Herramientas PDF y Audio/Video
-   Sistema de pagos (Paddle + Ualá Bis)
