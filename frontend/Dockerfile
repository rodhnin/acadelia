FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ⭐ CORRECCIÓN: Copiar TODA la estructura public tal como está
COPY public/ /usr/share/nginx/html/

# ⭐ CORRECCIÓN: Copiar views manteniendo la estructura
COPY views/ /usr/share/nginx/html/views/

# ⭐ CORRECCIÓN: Copiar index.html desde views a la raíz
COPY views/index.html /usr/share/nginx/html/index.html

# ⭐ CREAR DIRECTORIO para uploads proxy (opcional)
RUN mkdir -p /usr/share/nginx/html/uploads

# Crear directorio para logs
RUN mkdir -p /var/log/nginx

# ⭐ AGREGAR CURL para healthcheck
RUN apk add --no-cache curl

# Exponer puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]