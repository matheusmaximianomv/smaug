# Data Model: Gestão de Receitas Mensais

**Branch**: `002-receitas` | **Date**: 2026-02-23
**Source**: [spec.md](./spec.md) + [research.md](./research.md)

## Entities

### User

Usuário simplificado para isolamento de dados (sem autenticação JWT nesta fase).

| Field     | Type          | Constraints                     | Notes                 |
| --------- | ------------- | ------------------------------- | --------------------- |
| id        | String (UUID) | PK, gerado na aplicação         | `crypto.randomUUID()` |
| name      | String        | NOT NULL, 1–255 chars           | Nome do usuário       |
| email     | String        | NOT NULL, UNIQUE, formato email | Identificador único   |
| createdAt | DateTime      | NOT NULL, default now           | Timestamp de criação  |

**Validation rules**:

- `name`: 1–255 caracteres, não vazio
- `email`: formato de email válido, único no sistema

**State transitions**: Nenhuma — entidade estática nesta fase.

---

### OneTimeRevenue (Receita Avulsa)

Entrada financeira pontual vinculada a um único mês de competência.

| Field           | Type          | Constraints                   | Notes                    |
| --------------- | ------------- | ----------------------------- | ------------------------ |
| id              | String (UUID) | PK, gerado na aplicação       | `crypto.randomUUID()`    |
| userId          | String (UUID) | FK → User.id, NOT NULL        | Proprietário             |
| description     | String        | NOT NULL, 1–255 chars         | Descrição da receita     |
| amount          | Float         | NOT NULL, > 0, max 2 decimals | Valor monetário          |
| competenceMonth | Int           | NOT NULL, 1–12                | Mês da competência       |
| competenceYear  | Int           | NOT NULL, >= 2000             | Ano da competência       |
| createdAt       | DateTime      | NOT NULL, default now         | Timestamp de criação     |
| updatedAt       | DateTime      | NOT NULL, auto-update         | Timestamp de atualização |

**Validation rules**:

- `amount`: estritamente positivo (> 0), máximo 2 casas decimais (FR-010)
- `description`: 1–255 caracteres (FR-018)
- `competenceMonth`/`competenceYear`: mês válido (1–12), ano >= 2000 (FR-011)
- Competência deve ser mês atual ou futuro na criação (FR-019) e na edição (FR-002)
- Pertence exclusivamente ao `userId` (FR-017)

**State transitions**: Nenhuma — CRUD direto.

**Relationships**:

- `User` (N:1) — cada receita avulsa pertence a um usuário

---

### FixedRevenue (Receita Fixa)

Entrada financeira recorrente com vigência mensal. Metadados imutáveis após criação.

| Field      | Type          | Constraints                            | Notes                                  |
| ---------- | ------------- | -------------------------------------- | -------------------------------------- |
| id         | String (UUID) | PK, gerado na aplicação                | `crypto.randomUUID()`                  |
| userId     | String (UUID) | FK → User.id, NOT NULL                 | Proprietário                           |
| modality   | String (enum) | NOT NULL, `ALTERABLE` ou `UNALTERABLE` | Definida na criação, imutável (FR-004) |
| startMonth | Int           | NOT NULL, 1–12                         | Mês de início da vigência              |
| startYear  | Int           | NOT NULL, >= 2000                      | Ano de início da vigência              |
| endMonth   | Int           | NULL, 1–12                             | Mês de término (opcional)              |
| endYear    | Int           | NULL, >= 2000                          | Ano de término (opcional)              |
| createdAt  | DateTime      | NOT NULL, default now                  | Timestamp de criação                   |
| updatedAt  | DateTime      | NOT NULL, auto-update                  | Timestamp de atualização               |

**Validation rules**:

- `modality`: apenas `ALTERABLE` ou `UNALTERABLE`, imutável após criação (FR-004)
- `startMonth`/`startYear`: mês válido, deve ser mês atual ou futuro na criação (FR-019)
- `endMonth`/`endYear`: quando informado, não pode ser anterior ao início (FR-012)
- Periodicidade estritamente mensal (FR-014)
- Pertence exclusivamente ao `userId` (FR-017)

**State transitions**:

- `ACTIVE` → receita dentro do período de vigência (start ≤ current ≤ end ou sem end)
- `TERMINATED` → encerrada antecipadamente via definição de endMonth/endYear (FR-008)
- `EXPIRED` → data de término já passou

**Relationships**:

- `User` (N:1) — cada receita fixa pertence a um usuário
- `FixedRevenueVersion` (1:N) — cada receita fixa possui uma ou mais versões

---

### FixedRevenueVersion (Versão de Receita Fixa)

Registro de cada versão de uma receita fixa alterável. Para inalteráveis, exatamente 1 versão.

| Field          | Type          | Constraints                    | Notes                                  |
| -------------- | ------------- | ------------------------------ | -------------------------------------- |
| id             | String (UUID) | PK, gerado na aplicação        | `crypto.randomUUID()`                  |
| fixedRevenueId | String (UUID) | FK → FixedRevenue.id, NOT NULL | Receita fixa pai                       |
| description    | String        | NOT NULL, 1–255 chars          | Descrição vigente nesta versão         |
| amount         | Float         | NOT NULL, > 0, max 2 decimals  | Valor vigente nesta versão             |
| effectiveMonth | Int           | NOT NULL, 1–12                 | Mês de início de vigência desta versão |
| effectiveYear  | Int           | NOT NULL, >= 2000              | Ano de início de vigência desta versão |
| createdAt      | DateTime      | NOT NULL, default now          | Timestamp de criação da versão         |

**Validation rules**:

- `amount`: estritamente positivo (> 0), máximo 2 casas decimais (FR-010)
- `description`: 1–255 caracteres (FR-018)
- `effectiveMonth`/`effectiveYear`: deve ser mês atual ou futuro (FR-006 clarificação)
- `effectiveMonth`/`effectiveYear`: deve estar dentro da vigência da FixedRevenue pai
- Para `UNALTERABLE`: máximo 1 versão permitida (FR-007)
- Para `ALTERABLE`: múltiplas versões permitidas, `effectiveFrom` deve ser ≥ última versão existente
- Se já existir uma versão com o mesmo `effectiveMonth`/`effectiveYear`, a operação DEVE ser rejeitada (conflito de versão)

**Relationships**:

- `FixedRevenue` (N:1) — cada versão pertence a uma receita fixa

---

## Prisma Schema (preview)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id              String           @id @map("id")
  name            String           @map("name")
  email           String           @unique @map("email")
  createdAt       DateTime         @default(now()) @map("created_at")
  oneTimeRevenues OneTimeRevenue[]
  fixedRevenues   FixedRevenue[]

  @@map("t_users")
}

model OneTimeRevenue {
  id              String   @id @map("id")
  userId          String   @map("user_id")
  description     String   @map("description")
  amount          Float    @map("amount")
  competenceMonth Int      @map("competence_month")
  competenceYear  Int      @map("competence_year")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  user            User     @relation(fields: [userId], references: [id])

  @@index([userId, competenceYear, competenceMonth], map: "i_one_time_revenues_user_competence")
  @@map("t_one_time_revenues")
}

model FixedRevenue {
  id         String                @id @map("id")
  userId     String                @map("user_id")
  modality   String                @map("modality")
  startMonth Int                   @map("start_month")
  startYear  Int                   @map("start_year")
  endMonth   Int?                  @map("end_month")
  endYear    Int?                  @map("end_year")
  createdAt  DateTime              @default(now()) @map("created_at")
  updatedAt  DateTime              @updatedAt @map("updated_at")
  user       User                  @relation(fields: [userId], references: [id])
  versions   FixedRevenueVersion[]

  @@index([userId, startYear, startMonth], map: "i_fixed_revenues_user_start")
  @@map("t_fixed_revenues")
}

model FixedRevenueVersion {
  id             String       @id @map("id")
  fixedRevenueId String       @map("fixed_revenue_id")
  description    String       @map("description")
  amount         Float        @map("amount")
  effectiveMonth Int          @map("effective_month")
  effectiveYear  Int          @map("effective_year")
  createdAt      DateTime     @default(now()) @map("created_at")
  fixedRevenue   FixedRevenue @relation(fields: [fixedRevenueId], references: [id], onDelete: Cascade)

  @@index([fixedRevenueId, effectiveYear, effectiveMonth], map: "i_fixed_revenue_versions_revenue_effective")
  @@map("t_fixed_revenue_versions")
}
```

## Query Patterns

### Consulta consolidada por competência mensal (FR-009)

Para um dado `userId`, `month`, `year`:

1. **Receitas avulsas**: `WHERE userId = ? AND competenceMonth = ? AND competenceYear = ?`
2. **Receitas fixas ativas**: `WHERE userId = ? AND (startYear < year OR (startYear = year AND startMonth <= month)) AND (endYear IS NULL OR endYear > year OR (endYear = year AND endMonth >= month))`
3. **Versão vigente por fixa**: Para cada FixedRevenue, buscar a FixedRevenueVersion com `(effectiveYear < year OR (effectiveYear = year AND effectiveMonth <= month))` ordenado DESC, LIMIT 1.
