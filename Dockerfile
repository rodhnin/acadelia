# Multi-stage build con Node 22 - OPTIMIZADO BASADO EN TU DOCKERFILE
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache \
    python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev \
    poppler-utils ffmpeg yt-dlp qpdf \
    clamav clamav-daemon freshclam

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa de desarrollo
FROM node:22-alpine AS development
WORKDIR /usr/src/app

RUN apk add --no-cache \
    python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev \
    poppler-utils ffmpeg yt-dlp qpdf \
    clamav clamav-daemon freshclam

COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p uploads logs reports tmp
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ⚡ ETAPA DE PRODUCCIÓN OPTIMIZADA (BASADA EN TU VERSIÓN)
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# ⚡ Instalar herramientas (con yt-dlp del sistema)
RUN apk add --no-cache \
    python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev \
    poppler-utils ffmpeg yt-dlp qpdf \
    clamav clamav-daemon freshclam \
    curl wget bash tini && \
    # Crear usuario nodejs con ID específico
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    # Crear directorios ClamAV
    mkdir -p /var/log/clamav /run/clamav && \
    chown -R clamav:clamav /var/log/clamav /run/clamav

# ⚡ Configurar ClamAV
RUN echo 'LocalSocket /run/clamav/clamd.sock' > /etc/clamav/clamd.conf && \
    echo 'User clamav' >> /etc/clamav/clamd.conf && \
    echo 'DatabaseDirectory /usr/src/app/uploads/clamav_db' >> /etc/clamav/clamd.conf && \
    echo 'LogFile /var/log/clamav/clamd.log' >> /etc/clamav/clamd.conf && \
    echo 'ScanPDF true' >> /etc/clamav/clamd.conf && \
    echo 'LocalSocketMode 666' >> /etc/clamav/clamd.conf && \
    echo 'DatabaseOwner clamav' > /etc/clamav/freshclam.conf && \
    echo 'DatabaseDirectory /usr/src/app/uploads/clamav_db' >> /etc/clamav/freshclam.conf && \
    echo 'UpdateLogFile /var/log/clamav/freshclam.log' >> /etc/clamav/freshclam.conf && \
    echo 'DatabaseMirror database.clamav.net' >> /etc/clamav/freshclam.conf && \
    chown clamav:clamav /etc/clamav/clamd.conf /etc/clamav/freshclam.conf

# ⚡ Instalar aplicación
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /usr/src/app .

# 🎯 ARREGLO YOUTUBE: Crear directorio bin y enlace simbólico
RUN mkdir -p backend/bin && \
    # Crear enlace simbólico al yt-dlp del sistema
    ln -sf /usr/bin/yt-dlp /usr/src/app/backend/bin/yt-dlp && \
    # Asegurar que sea ejecutable
    chmod +x /usr/bin/yt-dlp

# ⚡ Crear SOLO directorios locales (no uploads, se monta como volumen)
RUN mkdir -p logs reports tmp tmp/document_processing tmp/image_security tmp/audio_processing tmp/video_processing tmp/pdf_processing tmp/youtube_processing && \
    # ⭐ ESTABLECER PERMISOS SOLO A DIRECTORIOS LOCALES
    chown -R nodejs:nodejs logs reports tmp && \
    chmod -R 755 tmp && \
    # 🎯 ASEGURAR QUE NODEJS PUEDA USAR YT-DLP
    chmod 755 backend/bin && \
    chown nodejs:nodejs backend/bin

# ⚡ SCRIPT OPTIMIZADO - ARREGLANDO EL PROBLEMA DE NODE_OPTIONS
RUN echo '#!/bin/bash' > /start.sh && \
    echo 'echo "🚀 [$(date +%H:%M:%S)] Startup RÁPIDO con Node.js primero"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# 🎯 CRÍTICO: ARREGLAR PERMISOS DEL VOLUMEN UPLOADS' >> /start.sh && \
    echo 'echo "🔧 [$(date +%H:%M:%S)] Configurando permisos del volumen uploads..."' >> /start.sh && \
    echo 'if [ -d "/usr/src/app/uploads" ]; then' >> /start.sh && \
    echo '    # Crear subdirectorios necesarios si no existen' >> /start.sh && \
    echo '    mkdir -p /usr/src/app/uploads/carreras /usr/src/app/uploads/audio /usr/src/app/uploads/audio_compressed /usr/src/app/uploads/audio_playbook /usr/src/app/uploads/audio_segments /usr/src/app/uploads/chat_documents /usr/src/app/uploads/chat_images /usr/src/app/uploads/temp /usr/src/app/uploads/youtube /usr/src/app/uploads/clamav_db' >> /start.sh && \
    echo '    # Cambiar permisos del volumen uploads para nodejs' >> /start.sh && \
    echo '    chown -R nodejs:nodejs /usr/src/app/uploads || echo "⚠️ Error cambiando owner, continuando..."' >> /start.sh && \
    echo '    chmod -R 755 /usr/src/app/uploads || echo "⚠️ Error cambiando permisos, continuando..."' >> /start.sh && \
    echo '    # Permisos especiales para ClamAV' >> /start.sh && \
    echo '    if [ -d "/usr/src/app/uploads/clamav_db" ]; then' >> /start.sh && \
    echo '        chown -R clamav:clamav /usr/src/app/uploads/clamav_db || echo "⚠️ Error ClamAV permisos"' >> /start.sh && \
    echo '    fi' >> /start.sh && \
    echo '    echo "✅ [$(date +%H:%M:%S)] Permisos uploads configurados"' >> /start.sh && \
    echo 'else' >> /start.sh && \
    echo '    echo "❌ [$(date +%H:%M:%S)] ERROR: Directorio uploads no existe"' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# 🚀 INICIAR NODE.JS CON CONFIGURACIÓN CORRECTA' >> /start.sh && \
    echo 'echo "🚀 [$(date +%H:%M:%S)] Iniciando servidor Node.js INMEDIATAMENTE..."' >> /start.sh && \
    echo 'cd /usr/src/app' >> /start.sh && \
    echo '# ⚡ CONFIGURAR VARIABLES DE ENTORNO PARA PERFORMANCE' >> /start.sh && \
    echo 'export NODE_OPTIONS="--max-old-space-size=6144"' >> /start.sh && \
    echo 'export UV_THREADPOOL_SIZE=16' >> /start.sh && \
    echo 'exec su -s /bin/sh nodejs -c "node server.js" &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'echo "✅ [$(date +%H:%M:%S)] Servidor Node.js iniciado (PID: $NODE_PID)"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# 🎬 VERIFICAR YT-DLP EN BACKGROUND (NO BLOQUEA)' >> /start.sh && \
    echo '(' >> /start.sh && \
    echo '  sleep 2 # Dar tiempo a Node.js para arrancar' >> /start.sh && \
    echo '  echo "🎬 [$(date +%H:%M:%S)] [Background] Verificando yt-dlp..."' >> /start.sh && \
    echo '  if yt-dlp --version >/dev/null 2>&1; then' >> /start.sh && \
    echo '    echo "✅ [$(date +%H:%M:%S)] [Background] yt-dlp disponible: $(yt-dlp --version)"' >> /start.sh && \
    echo '  else' >> /start.sh && \
    echo '    echo "❌ [$(date +%H:%M:%S)] [Background] yt-dlp no disponible"' >> /start.sh && \
    echo '  fi' >> /start.sh && \
    echo ') &' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# 🦠 CLAMAV EN BACKGROUND (NO BLOQUEA)' >> /start.sh && \
    echo '(' >> /start.sh && \
    echo '  sleep 3 # Iniciar después de Node.js' >> /start.sh && \
    echo '  echo "🦠 [$(date +%H:%M:%S)] [Background] ClamAV iniciando..."' >> /start.sh && \
    echo '  if [ ! -f /usr/src/app/uploads/clamav_db/main.cvd ] && [ ! -f /usr/src/app/uploads/clamav_db/main.cld ]; then' >> /start.sh && \
    echo '    echo "📥 [$(date +%H:%M:%S)] [Background] Descargando bases ClamAV..."' >> /start.sh && \
    echo '    freshclam >/dev/null 2>&1 || echo "⚠️ [Background] Error ClamAV"' >> /start.sh && \
    echo '  else' >> /start.sh && \
    echo '    echo "✅ [$(date +%H:%M:%S)] [Background] Bases ClamAV existen"' >> /start.sh && \
    echo '  fi' >> /start.sh && \
    echo '  clamd >/dev/null 2>&1 &' >> /start.sh && \
    echo '  sleep 2' >> /start.sh && \
    echo '  chmod 666 /run/clamav/clamd.sock 2>/dev/null || true' >> /start.sh && \
    echo '  echo "✅ [$(date +%H:%M:%S)] [Background] ClamAV listo"' >> /start.sh && \
    echo ') &' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# ⚡ ESPERAR SOLO A NODE.JS (HEALTH CHECK PASA RÁPIDO)' >> /start.sh && \
    echo 'wait $NODE_PID' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 5000

# ⚡ Usar tini con subreaper para manejar zombies
ENTRYPOINT ["/sbin/tini", "-s", "--"]
CMD ["/start.sh"]