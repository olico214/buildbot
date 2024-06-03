# Imagen base para la construcción
FROM node:21-alpine3.18 as builder

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar solo los archivos necesarios para la instalación de dependencias
COPY package*.json *-lock.yaml ./

# Instalar dependencias de desarrollo
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
  # Instalar Git
  && apk add --no-cache git \
  # Instalar Corepack y preparar PNPM
  && npm install -g corepack \
  && corepack enable && corepack prepare pnpm@latest --activate \
  # Instalar dependencias
  && pnpm install \
  # Eliminar paquetes innecesarios
  && apk del .build-deps

# Copiar el resto de los archivos del proyecto
COPY . .

# Si existe el directorio bot_sessions, cópialo a un directorio temporal
RUN if [ -d /app/bot_sessions ]; then \
  cp -r /app/bot_sessions /tmp/bot_sessions_backup; \
fi

# Etapa de construcción finalizada, iniciando etapa de despliegue
FROM node:21-alpine3.18 as deploy

# Establecer el directorio de trabajo
WORKDIR /app

# Argumento de puerto
ARG PORT
ENV PORT $PORT
EXPOSE $PORT

# Copiar solo los archivos necesarios para la ejecución
COPY --from=builder /app/package*.json /app/bot_sessions ./

# Instalar solo las dependencias de producción
RUN npm install --production --ignore-scripts \
  # Configurar usuario para ejecutar la aplicación
  && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
  # Limpiar caché de npm y archivos innecesarios
  && rm -rf $HOME/.npm $HOME/.node-gyp

# Copiar y reemplazar los archivos necesarios antes de iniciar la aplicación
COPY --from=builder /app/src/tmp-bot-dist/index.cjs node_modules/@builderbot/bot/dist/index.cjs
COPY --from=builder /app/src/tmp-provider-baileys-dist/index.cjs node_modules/@builderbot/provider-baileys/dist/index.cjs

# Restaurar bot_sessions si existía
RUN if [ -d /tmp/bot_sessions_backup ]; then \
  cp -r /tmp/bot_sessions_backup /app/bot_sessions && \
  rm -rf /tmp/bot_sessions_backup; \
fi

# Comando para iniciar la aplicación
CMD ["npm", "start"]
