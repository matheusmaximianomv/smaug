# Quickstart: Gestão de Despesas

**Branch**: `003-despesas` | **Date**: 2026-03-01

## Prerequisites

- Node.js 22 LTS
- npm (latest)
- Projeto 002-receitas já implementado (usuários e banco configurados)

## Setup

```bash
# 1. Install dependencies (nenhuma nova dependência)
npm install

# 2. Configure environment (já configurado em 002-receitas)
# Verificar .env:
#   DATABASE_PROVIDER=sqlite
#   DATABASE_URL=file:./dev.db
#   NODE_ENV=development
#   PORT=3000
#   LOG_LEVEL=debug

# 3. Run new migration (adds expense tables)
npx prisma migrate dev --name add_expense_models

# 4. Start development server
npm run dev
```

## Quick Test

```bash
# Prerequisite: create a user (from 002-receitas)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "João", "email": "joao@example.com"}'
# → Save the returned "id" as USER_ID

# --- CATEGORIES ---

# Create a category
curl -X POST http://localhost:3000/expenses/categories \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"name": "Alimentação"}'
# → Save the returned "id" as CATEGORY_ID

# List categories
curl http://localhost:3000/expenses/categories \
  -H "X-User-Id: <USER_ID>"

# --- ONE-TIME EXPENSE ---

# Create a one-time expense
curl -X POST http://localhost:3000/expenses/one-time \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"description": "Jantar restaurante", "amount": 150.00, "competenceYear": 2026, "competenceMonth": 3, "categoryId": "<CATEGORY_ID>"}'

# --- INSTALLMENT EXPENSE ---

# Create an installment expense (3x R$1000)
curl -X POST http://localhost:3000/expenses/installment \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"description": "Notebook", "totalAmount": 1000.00, "installmentCount": 3, "startYear": 2026, "startMonth": 3, "categoryId": "<CATEGORY_ID>"}'
# Installments: 2026-03 = R$333.34, 2026-04 = R$333.33, 2026-05 = R$333.33

# --- RECURRING EXPENSE ---

# Create a recurring expense (open-ended)
curl -X POST http://localhost:3000/expenses/recurring \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"description": "Aluguel", "amount": 2000.00, "categoryId": "<CATEGORY_ID>", "startYear": 2026, "startMonth": 3}'
# → Save the returned "id" as RECURRING_ID

# Update recurring expense (creates new version from month 6)
curl -X PATCH http://localhost:3000/expenses/recurring/<RECURRING_ID> \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <USER_ID>" \
  -d '{"amount": 2200.00, "effectiveYear": 2026, "effectiveMonth": 6}'

# --- CONSOLIDATED QUERY ---

# Query all expenses for March 2026
curl "http://localhost:3000/expenses?competenceYear=2026&competenceMonth=3" \
  -H "X-User-Id: <USER_ID>"
# Returns: oneTimeExpenses + installments + recurringExpenses + total
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

## Key Behaviors

| Behavior                         | Rule                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Category deletion                | Blocked if any expense (one-time, installment, or recurring version) is linked |
| Category name uniqueness         | Case-insensitive per user                                                      |
| One-time expense edit/delete     | Blocked if competence month is in the past                                     |
| Installment calculation          | Cents arithmetic: remainder added to first installment                         |
| Installment max count            | 72 installments (6 years)                                                      |
| Installment deletion             | Blocked if any installment is in a past month                                  |
| Installment early termination    | Removes future installments; blocked if none exist                             |
| Installment financial attrs      | Immutable after creation (totalAmount, installmentCount)                       |
| Installment desc/category update | Propagates to ALL installments (including past months)                         |
| Recurring expense                | Always versionable (no modality distinction)                                   |
| Recurring expense update         | Creates new version; effective date must be current or future                  |
| Recurring expense termination    | Sets end date; blocked if already expired                                      |

## Key Environment Variables

| Variable            | Values                              | Default | Description                |
| ------------------- | ----------------------------------- | ------- | -------------------------- |
| `DATABASE_PROVIDER` | `sqlite`, `postgresql`, `memory`    | —       | Database provider          |
| `DATABASE_URL`      | connection string                   | —       | `file:./dev.db` for SQLite |
| `NODE_ENV`          | `development`, `production`, `test` | —       | Environment                |
| `PORT`              | 1–65535                             | `3000`  | HTTP server port           |
| `LOG_LEVEL`         | `debug`, `info`, `warn`, `error`    | `info`  | Pino log level             |
