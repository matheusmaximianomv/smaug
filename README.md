# Smaug Project Base

Base API scaffold for personal finance backend built with Node.js 22, TypeScript (strict), Clean Architecture, Prisma, Express, Pino, Vitest, and Docker.

## Tech Stack

- Runtime: Node.js 22 (ESM)
- Language: TypeScript 5.x (strict)
- HTTP: Express 4 (adapter in infrastructure)
- ORM: Prisma (PostgreSQL, SQLite, in-memory via repository)
- DI: tsyringe
- Env: dotenv + zod validation
- Logging: pino / pino-pretty (dev)
- Testing: Vitest (unit + integration), Supertest
- Container: Docker (node:22-alpine), docker-compose with PostgreSQL 16

## Project Structure

```
src/
  domain/           # entities, ports, use-cases (pure)
  application/      # ports, services, dtos
  infrastructure/   # database, logging, config, http
  presentation/     # controllers, middlewares, routes
  main.ts           # bootstrap
prisma/             # schema.prisma
tests/
  unit/
  integration/
```

## Setup (local, no Docker)

```bash
npm install
cp .env.example .env
# adjust DATABASE_PROVIDER (memory|sqlite|postgresql) and DATABASE_URL
npm run prisma:prepare   # sets datasource provider in schema
npm run prisma:generate  # generates Prisma client
npm run build
npm run dev              # or: npm start after build
```

## Docker

```bash
docker compose up --build
# then check health
curl http://localhost:3000/health
```

Env overrides: see `.env.docker` (postgres connection). Dockerfile runs `npm run migrate:deploy` before starting app.

## Testing

```bash
npm run test:unit
npm run test:integration
```

## Lint & Format

```bash
npm run lint
npm run format
```

## Dependency boundaries

Dependency-cruiser config enforces domain/application not importing infrastructure/presentation. Run:

```bash
npm run validate:deps
```

## Provider swap (Prisma)

Prisma requires generation per provider. Before using a provider, run:

```bash
DATABASE_PROVIDER=postgresql npm run prisma:generate   # for postgres
# or
DATABASE_PROVIDER=sqlite npm run prisma:generate       # for sqlite
```

Memory mode uses sqlite provider.

## Health check contract

`GET /health` returns status, timestamp, uptime, and database status; responds 503 if DB disconnected.

## Useful scripts

- `dev`: tsx watch main.ts
- `build`: tsc
- `start`: node dist/main.js
- `migrate:deploy`: prisma migrate deploy
- `validate:deps`: dependency-cruiser

## Notes

- Use Node 22+ (package.json engines).
- Husky + lint-staged run lint/format on commits.
- Placeholder Prisma model present; extend schema as business entities are added.
