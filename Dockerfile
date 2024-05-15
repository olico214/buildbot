# Imagen base
FROM node:21-alpine3.18 as builder

# Directorio de trabajo
WORKDIR /app

# Habilitar Corepack y preparar PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

# Copiar los archivos del proyecto
COPY . .

# Copiar los archivos de configuración
COPY package*.json *-lock.yaml ./

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

# Copiar archivos del constructor
COPY --from=builder /app ./
COPY --from=builder /app/*.json /app/*-lock.yaml ./

# Habilitar Corepack y preparar PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate 

# Limpiar caché de npm, instalar dependencias de producción y configurar usuario
RUN npm cache clean --force && pnpm install --production --ignore-scripts \
  && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
  && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

# Si existe el directorio *_sessions, no lo borres.
RUN mkdir -p /app/sessions && \
  cp -r /app/sessions/* /app/sessions_backup/ || true

# Copiar y reemplazar los archivos necesarios antes de iniciar la aplicación
COPY --from=builder /app/src/tmp-bot-dist/index.cjs node_modules/@builderbot/bot/dist/index.cjs
COPY --from=builder /app/src/tmp-provider-baileys-dist/index.cjs node_modules/@builderbot/provider-baileys/dist/index.cjs

# Restaurar *_sessions si existía.
RUN if [ -d /app/sessions_backup ]; then \
  cp -r /app/sessions_backup/* /app/sessions/ && \
  rm -rf /app/sessions_backup; \
  fi

# Comando para iniciar la aplicación
CMD ["npm", "start"]
