# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Ensure Prisma generation has required envs during build
ENV DATABASE_PROVIDER=postgresql \
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smaug?schema=public

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

RUN apk add --no-cache curl

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost:3000/health || exit 1

CMD ["sh", "-c", "npm run migrate:deploy && node dist/main.js"]
