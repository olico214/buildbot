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
    && apk del .gyp

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

# Instalar dependencias en la etapa de despliegue
RUN npm install --production --ignore-scripts \
    && addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs \
    && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

# Instalar mysql2 antes que Axios
RUN npm install --save mysql2

# Instalar Axios
RUN npm install axios

# Copiar y reemplazar los archivos necesarios antes de iniciar la aplicación
COPY --from=builder /app/src/tmp-bot-dist/index.cjs node_modules/@builderbot/bot/dist/index.cjs
COPY --from=builder /app/src/tmp-provider-baileys-dist/index.cjs node_modules/@builderbot/provider-baileys/dist/index.cjs

# Comando para iniciar la aplicación
CMD ["npm", "start"]
