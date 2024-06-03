# Imagen base
FROM node:21-alpine3.18 as builder

# Directorio de trabajo
WORKDIR /app

# Copiar los archivos del proyecto
COPY . .

# Si existe el directorio bot_sessions, cópialo a un directorio temporal
RUN if [ -d /app/bot_sessions ]; then \
  cp -r /app/bot_sessions /tmp/bot_sessions_backup; \
fi

# Copiar los archivos de configuración y los archivos del proyecto
COPY package*.json *-lock.yaml ./

# Habilitar Corepack y preparar PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar dependencias
RUN apk add --no-cache --virtual .gyp \
  python3 \
  make \
  g++ \
  && apk add --no-cache git \
  && pnpm install \
  && apk del .gyp \
  && pnpm install axios mysql2 dotenv

# Etapa de despliegue
FROM node:21-alpine3.18 as deploy

# Directorio de trabajo
WORKDIR /app

# Argumento de puerto
ARG PORT
ENV PORT $PORT
EXPOSE $PORT

# Copiar archivos del constructor y archivos de configuración
COPY --from=builder /app ./

# Habilitar Corepack y preparar PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate 

# Limpiar caché de npm, instalar dependencias de producción y configurar usuario
RUN pnpm install --production --ignore-scripts \
  && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
  && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

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
