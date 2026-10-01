# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
# Sem o openssl o Prisma não detecta a versão da libssl e escolhe a engine errada.
RUN apk add --no-cache openssl

# A imagem é sempre PostgreSQL: o client e as migrations saem de prisma/postgresql/.
ENV DATABASE_PROVIDER=postgresql \
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smaug?schema=public

COPY package*.json ./
RUN npm ci

COPY scripts ./scripts
COPY prisma ./prisma
RUN npm run prisma:generate

COPY tsconfig*.json tsup.config.ts ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_PROVIDER=postgresql

COPY package*.json ./
# `prepare` roda o husky, que é devDependency e não existe com --omit=dev.
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

RUN apk add --no-cache curl openssl

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost:3000/health || exit 1

CMD ["sh", "-c", "npm run migrate:deploy && node dist/main.js"]
