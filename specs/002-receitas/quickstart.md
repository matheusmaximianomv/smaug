# Quickstart: Gestão de Receitas Mensais

**Branch**: `002-receitas` | **Date**: 2026-02-23

## Prerequisites

- Node.js 22 LTS
- npm (latest)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_PROVIDER=sqlite
#   DATABASE_URL=file:./dev.db
#   NODE_ENV=development
#   PORT=3000
#   LOG_LEVEL=debug

# 3. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# 4. Start development server
npm run dev
```

## Quick Test

```bash
# Health check
curl http://localhost:3000/health

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João", "email": "joao@example.com"}'
# → Save the returned "id" as USER_ID

# Create a one-time revenue
curl -X POST http://localhost:3000/revenues/one-time \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"description": "Freelance", "amount": 1500.00, "competenceYear": 2026, "competenceMonth": 3}'

# Create a fixed revenue (alterable)
curl -X POST http://localhost:3000/revenues/fixed \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"description": "Salário", "amount": 5000.00, "modality": "ALTERABLE", "startYear": 2026, "startMonth": 1, "endYear": 2026, "endMonth": 12}'

# Consolidated query for a month
curl "http://localhost:3000/revenues?competenceYear=2026&competenceMonth=3" \
  -H "X-User-Id: <USER_ID>"
```

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

## Key Environment Variables

| Variable            | Values                              | Default | Description                |
| ------------------- | ----------------------------------- | ------- | -------------------------- |
| `DATABASE_PROVIDER` | `sqlite`, `postgresql`, `memory`    | —       | Database provider          |
| `DATABASE_URL`      | connection string                   | —       | `file:./dev.db` for SQLite |
| `NODE_ENV`          | `development`, `production`, `test` | —       | Environment                |
| `PORT`              | 1–65535                             | `3000`  | HTTP server port           |
| `LOG_LEVEL`         | `debug`, `info`, `warn`, `error`    | `info`  | Pino log level             |
