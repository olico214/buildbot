# Imagen base
FROM node:21-alpine3.18 as builder

# Directorio de trabajo
WORKDIR /app

# Habilitar Corepack y preparar PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

# Copiar archivos de configuración
COPY package*.json pnpm-lock.yaml ./

# Verificar si node_modules existe, si no, instalar dependencias
RUN apk add --no-cache --virtual .gyp python3 make g++ \
  && apk add --no-cache git \
  && if [ ! -d "node_modules" ]; then pnpm install; fi \
  && apk del .gyp

# Copiar los archivos del proyecto
COPY . .

# Instalar dependencias adicionales si es necesario
RUN if [ ! -d "node_modules" ]; then pnpm install axios mysql2 dotenv; fi

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

# Habilitar Corepack y preparar PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate 

# Limpiar caché de npm, instalar dependencias de producción y configurar usuario
RUN npm cache clean --force && pnpm install --production --ignore-scripts \
  && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
  && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

# Copiar y reemplazar los archivos necesarios antes de iniciar la aplicación
COPY src/tmp-bot-dist/index.cjs node_modules/@builderbot/bot/dist/index.cjs
COPY src/tmp-provider-baileys-dist/index.cjs node_modules/@builderbot/provider-baileys/dist/index.cjs

# Comando para iniciar la aplicación
CMD ["npm", "start"]
