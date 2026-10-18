# syntax=docker/dockerfile:1

# Uma imagem só para os dois cenários de publicação (mesma máquina / máquinas diferentes): o destino
# do repasse /api (app/api/[...path]/route.ts) vem de API_ORIGIN, lido a cada requisição pelo
# `next start`. Nada de API_ORIGIN no build: a mesma imagem serve a qualquer API.

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:3001/login || exit 1

CMD ["node_modules/.bin/next", "start", "-p", "3001"]
