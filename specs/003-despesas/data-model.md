# Data Model: Gestão de Despesas

**Branch**: `003-despesas` | **Date**: 2026-03-01
**Source**: [spec.md](./spec.md) + [research.md](./research.md)

## Entities

### ExpenseCategory (Categoria de Despesa)

Classificação definida pelo usuário para organizar despesas. Nome único por usuário (case-insensitive).

| Field     | Type          | Constraints                   | Notes                                   |
| --------- | ------------- | ----------------------------- | --------------------------------------- |
| id        | String (UUID) | PK, gerado na aplicação       | `crypto.randomUUID()`                   |
| userId    | String (UUID) | FK → User.id, NOT NULL        | Proprietário                            |
| name      | String        | NOT NULL, 1–100 chars         | Nome original para exibição             |
| nameLower | String        | NOT NULL, lowercase de `name` | Para constraint unique case-insensitive |
| createdAt | DateTime      | NOT NULL, default now         | Timestamp de criação                    |
| updatedAt | DateTime      | NOT NULL, auto-update         | Timestamp de atualização                |

**Validation rules**:

- `name`: 1–100 caracteres, não vazio (FR-001)
- `(userId, nameLower)`: unique (FR-002) — `nameLower = name.trim().toLowerCase()`
- Pertence exclusivamente ao `userId` (FR-018)
- Não pode ser deletada se existirem `OneTimeExpense`, `InstallmentExpense` ou `RecurringExpenseVersion` vinculadas (FR-004)

**State transitions**: Nenhuma — CRUD direto.

**Relationships**:

- `User` (N:1) — cada categoria pertence a um usuário
- `OneTimeExpense` (1:N)
- `InstallmentExpense` (1:N)
- `RecurringExpenseVersion` (1:N)

---

### OneTimeExpense (Despesa Avulsa)

Saída financeira pontual vinculada a um único mês de competência e a uma categoria.

| Field           | Type          | Constraints                       | Notes                    |
| --------------- | ------------- | --------------------------------- | ------------------------ |
| id              | String (UUID) | PK, gerado na aplicação           | `crypto.randomUUID()`    |
| userId          | String (UUID) | FK → User.id, NOT NULL            | Proprietário             |
| categoryId      | String (UUID) | FK → ExpenseCategory.id, NOT NULL | Categoria obrigatória    |
| description     | String        | NOT NULL, 1–255 chars             | Descrição da despesa     |
| amount          | Float         | NOT NULL, > 0, max 2 decimals     | Valor monetário          |
| competenceMonth | Int           | NOT NULL, 1–12                    | Mês da competência       |
| competenceYear  | Int           | NOT NULL, >= 2000                 | Ano da competência       |
| createdAt       | DateTime      | NOT NULL, default now             | Timestamp de criação     |
| updatedAt       | DateTime      | NOT NULL, auto-update             | Timestamp de atualização |

**Validation rules**:

- `amount`: > 0, máximo 2 casas decimais (FR-013)
- `description`: 1–255 caracteres (FR-019)
- `competenceMonth`/`competenceYear`: mês válido (1–12), ano >= 2000 (FR-014)
- Competência deve ser mês atual ou futuro na criação e edição (FR-005, FR-006, FR-020)
- `categoryId` deve pertencer ao mesmo `userId` (FR-023)

**State transitions**: Nenhuma — CRUD direto (sujeito a elegibilidade temporal).

**Relationships**:

- `User` (N:1) — cada despesa avulsa pertence a um usuário
- `ExpenseCategory` (N:1) — cada despesa avulsa pertence a uma categoria

---

### InstallmentExpense (Despesa Parcelada)

Saída financeira única cujo valor total é distribuído em parcelas mensais consecutivas. Atributos financeiros imutáveis após criação.

| Field            | Type          | Constraints                       | Notes                                    |
| ---------------- | ------------- | --------------------------------- | ---------------------------------------- |
| id               | String (UUID) | PK, gerado na aplicação           | `crypto.randomUUID()`                    |
| userId           | String (UUID) | FK → User.id, NOT NULL            | Proprietário                             |
| categoryId       | String (UUID) | FK → ExpenseCategory.id, NOT NULL | Categoria (atualizável, propaga)         |
| description      | String        | NOT NULL, 1–255 chars             | Descrição (atualizável, propaga)         |
| totalAmount      | Float         | NOT NULL, > 0, max 2 decimals     | Valor total — imutável após criação      |
| installmentCount | Int           | NOT NULL, 1–72                    | Qtde de parcelas — imutável após criação |
| startMonth       | Int           | NOT NULL, 1–12                    | Mês inicial — imutável após criação      |
| startYear        | Int           | NOT NULL, >= 2000                 | Ano inicial — imutável após criação      |
| createdAt        | DateTime      | NOT NULL, default now             | Timestamp de criação                     |
| updatedAt        | DateTime      | NOT NULL, auto-update             | Timestamp de atualização                 |

**Validation rules**:

- `totalAmount`: > 0, máximo 2 casas decimais (FR-013, FR-024)
- `description`: 1–255 caracteres (FR-019, FR-024)
- `installmentCount`: inteiro, 1–72 (FR-024)
- `startMonth`/`startYear`: mês atual ou futuro na criação (FR-020, FR-024)
- `categoryId` deve pertencer ao mesmo `userId` (FR-023)
- `totalAmount`, `installmentCount`, `startMonth`, `startYear` imutáveis após criação (FR-027)
- Atualização de `description`/`categoryId` propaga para todas as `Installment` filhas (FR-027)
- Exclusão bloqueada se qualquer `Installment` filha tem competência em mês passado (FR-028)
- Encerramento antecipado: remove `Installment` filhas com competência futura (FR-030)
- Encerramento rejeitado se não há `Installment` com competência futura (FR-030)

**State transitions**:

- `ACTIVE` → possui parcelas em meses futuros
- `COMPLETED` → todas as parcelas estão no passado ou mês atual (encerramento antecipado impossível)
- `EARLY_TERMINATED` → após FR-030 (encerramento antecipado)

**Relationships**:

- `User` (N:1)
- `ExpenseCategory` (N:1)
- `Installment` (1:N, cascade delete)

---

### Installment (Parcela)

Fração individual de uma despesa parcelada. Valores imutáveis após criação.

| Field                | Type          | Constraints                          | Notes                            |
| -------------------- | ------------- | ------------------------------------ | -------------------------------- |
| id                   | String (UUID) | PK, gerado na aplicação              | `crypto.randomUUID()`            |
| installmentExpenseId | String (UUID) | FK → InstallmentExpense.id, NOT NULL | Despesa parcelada pai            |
| installmentNumber    | Int           | NOT NULL, >= 1                       | Número da parcela (ex: 1, 2, 3)  |
| amount               | Float         | NOT NULL, > 0                        | Valor calculado — imutável       |
| competenceMonth      | Int           | NOT NULL, 1–12                       | Mês da competência desta parcela |
| competenceYear       | Int           | NOT NULL, >= 2000                    | Ano da competência desta parcela |
| createdAt            | DateTime      | NOT NULL, default now                | Timestamp de criação             |

**Validation rules**:

- `amount`: calculado via aritmética em centavos (FR-025). Resto da divisão inteira soma na primeira parcela.
- `installmentNumber`: sequencial de 1 a `installmentCount`
- `competenceMonth`/`competenceYear`: derivados de `startMonth`/`startYear` + offset (installmentNumber - 1)
- Todos os atributos são imutáveis após criação (FR-027)

**Cents arithmetic** (FR-025):

```
totalCents = Math.round(totalAmount * 100)
baseCents  = Math.floor(totalCents / installmentCount)
remainder  = totalCents % installmentCount

installment[0].amount = (baseCents + remainder) / 100
installment[i].amount = baseCents / 100            (i > 0)
```

**Relationships**:

- `InstallmentExpense` (N:1, onDelete: Cascade)

---

### RecurringExpense (Despesa Recorrente)

Saída financeira que se repete mensalmente com vigência definida. Atributos financeiros e descritivos versionados.

| Field      | Type          | Constraints             | Notes                     |
| ---------- | ------------- | ----------------------- | ------------------------- |
| id         | String (UUID) | PK, gerado na aplicação | `crypto.randomUUID()`     |
| userId     | String (UUID) | FK → User.id, NOT NULL  | Proprietário              |
| startMonth | Int           | NOT NULL, 1–12          | Mês de início da vigência |
| startYear  | Int           | NOT NULL, >= 2000       | Ano de início da vigência |
| endMonth   | Int           | NULL, 1–12              | Mês de término (opcional) |
| endYear    | Int           | NULL, >= 2000           | Ano de término (opcional) |
| createdAt  | DateTime      | NOT NULL, default now   | Timestamp de criação      |
| updatedAt  | DateTime      | NOT NULL, auto-update   | Timestamp de atualização  |

**Validation rules**:

- `startMonth`/`startYear`: mês atual ou futuro na criação (FR-007, FR-020)
- `endMonth`/`endYear`: quando informado, não pode ser anterior ao início (FR-015)
- Periodicidade estritamente mensal (FR-017)
- Pertence exclusivamente ao `userId` (FR-018)
- Encerramento antecipado: define nova `endMonth`/`endYear` (FR-010). Rejeitado se já expirou.
- Alteração de atributos: cria nova `RecurringExpenseVersion` com `effectiveMonth`/`effectiveYear` (FR-009)
- Alteração apenas para mês atual ou futuro (FR-009)

**State transitions**:

- `ACTIVE` → start ≤ current ≤ end (ou sem end)
- `TERMINATED` → encerrada antecipadamente (endDate definido no futuro)
- `EXPIRED` → endDate já passou

**Relationships**:

- `User` (N:1)
- `RecurringExpenseVersion` (1:N, cascade delete)

---

### RecurringExpenseVersion (Versão de Despesa Recorrente)

Registro histórico de cada versão de uma despesa recorrente. Contém os atributos versionados: descrição, valor e categoria.

| Field              | Type          | Constraints                        | Notes                                  |
| ------------------ | ------------- | ---------------------------------- | -------------------------------------- |
| id                 | String (UUID) | PK, gerado na aplicação            | `crypto.randomUUID()`                  |
| recurringExpenseId | String (UUID) | FK → RecurringExpense.id, NOT NULL | Despesa recorrente pai                 |
| categoryId         | String (UUID) | FK → ExpenseCategory.id, NOT NULL  | Categoria vigente nesta versão         |
| description        | String        | NOT NULL, 1–255 chars              | Descrição vigente nesta versão         |
| amount             | Float         | NOT NULL, > 0, max 2 decimals      | Valor vigente nesta versão             |
| effectiveMonth     | Int           | NOT NULL, 1–12                     | Mês de início de vigência desta versão |
| effectiveYear      | Int           | NOT NULL, >= 2000                  | Ano de início de vigência desta versão |
| createdAt          | DateTime      | NOT NULL, default now              | Timestamp de criação da versão         |

**Validation rules**:

- `amount`: > 0, máximo 2 casas decimais (FR-013)
- `description`: 1–255 caracteres (FR-019)
- `effectiveMonth`/`effectiveYear`: mês atual ou futuro (FR-009)
- `effectiveMonth`/`effectiveYear`: deve estar dentro da vigência da RecurringExpense pai
- `categoryId` deve pertencer ao mesmo `userId` da RecurringExpense pai (FR-023)
- Versão inicial criada automaticamente com `effectiveMonth`/`effectiveYear` = `startMonth`/`startYear` da RecurringExpense

**Relationships**:

- `RecurringExpense` (N:1, onDelete: Cascade)
- `ExpenseCategory` (N:1)

---

## Prisma Schema (additions to existing schema)

```prisma
model User {
  id                    String                @id @map("id")
  name                  String                @map("name")
  email                 String                @unique @map("email")
  createdAt             DateTime              @default(now()) @map("created_at")
  oneTimeRevenues       OneTimeRevenue[]
  fixedRevenues         FixedRevenue[]
  expenseCategories     ExpenseCategory[]       // NEW
  oneTimeExpenses       OneTimeExpense[]         // NEW
  installmentExpenses   InstallmentExpense[]     // NEW
  recurringExpenses     RecurringExpense[]        // NEW

  @@map("t_users")
}

model ExpenseCategory {
  id                       String                    @id @map("id")
  userId                   String                    @map("user_id")
  name                     String                    @map("name")
  nameLower                String                    @map("name_lower")
  createdAt                DateTime                  @default(now()) @map("created_at")
  updatedAt                DateTime                  @updatedAt @map("updated_at")
  user                     User                      @relation(fields: [userId], references: [id])
  oneTimeExpenses          OneTimeExpense[]
  installmentExpenses      InstallmentExpense[]
  recurringExpenseVersions RecurringExpenseVersion[]

  @@unique([userId, nameLower], map: "u_expense_categories_user_name_lower")
  @@index([userId], map: "i_expense_categories_user")
  @@map("t_expense_categories")
}

model OneTimeExpense {
  id               String          @id @map("id")
  userId           String          @map("user_id")
  categoryId       String          @map("category_id")
  description      String          @map("description")
  amount           Float           @map("amount")
  competenceMonth  Int             @map("competence_month")
  competenceYear   Int             @map("competence_year")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
  user             User            @relation(fields: [userId], references: [id])
  category         ExpenseCategory @relation(fields: [categoryId], references: [id])

  @@index([userId, competenceYear, competenceMonth], map: "i_one_time_expenses_user_competence")
  @@map("t_one_time_expenses")
}

model InstallmentExpense {
  id                String          @id @map("id")
  userId            String          @map("user_id")
  categoryId        String          @map("category_id")
  description       String          @map("description")
  totalAmount       Float           @map("total_amount")
  installmentCount  Int             @map("installment_count")
  startMonth        Int             @map("start_month")
  startYear         Int             @map("start_year")
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")
  user              User            @relation(fields: [userId], references: [id])
  category          ExpenseCategory @relation(fields: [categoryId], references: [id])
  installments      Installment[]

  @@index([userId], map: "i_installment_expenses_user")
  @@map("t_installment_expenses")
}

model Installment {
  id                    String             @id @map("id")
  installmentExpenseId  String             @map("installment_expense_id")
  installmentNumber     Int                @map("installment_number")
  amount                Float              @map("amount")
  competenceMonth       Int                @map("competence_month")
  competenceYear        Int                @map("competence_year")
  createdAt             DateTime           @default(now()) @map("created_at")
  installmentExpense    InstallmentExpense @relation(fields: [installmentExpenseId], references: [id], onDelete: Cascade)

  @@index([installmentExpenseId], map: "i_installments_expense")
  @@index([competenceYear, competenceMonth], map: "i_installments_competence")
  @@map("t_installments")
}

model RecurringExpense {
  id         String                    @id @map("id")
  userId     String                    @map("user_id")
  startMonth Int                       @map("start_month")
  startYear  Int                       @map("start_year")
  endMonth   Int?                      @map("end_month")
  endYear    Int?                      @map("end_year")
  createdAt  DateTime                  @default(now()) @map("created_at")
  updatedAt  DateTime                  @updatedAt @map("updated_at")
  user       User                      @relation(fields: [userId], references: [id])
  versions   RecurringExpenseVersion[]

  @@index([userId, startYear, startMonth], map: "i_recurring_expenses_user_start")
  @@map("t_recurring_expenses")
}

model RecurringExpenseVersion {
  id                  String           @id @map("id")
  recurringExpenseId  String           @map("recurring_expense_id")
  categoryId          String           @map("category_id")
  description         String           @map("description")
  amount              Float            @map("amount")
  effectiveMonth      Int              @map("effective_month")
  effectiveYear       Int              @map("effective_year")
  createdAt           DateTime         @default(now()) @map("created_at")
  recurringExpense    RecurringExpense  @relation(fields: [recurringExpenseId], references: [id], onDelete: Cascade)
  category            ExpenseCategory  @relation(fields: [categoryId], references: [id])

  @@index([recurringExpenseId, effectiveYear, effectiveMonth], map: "i_recurring_expense_versions_expense_effective")
  @@map("t_recurring_expense_versions")
}
```

---

## Query Patterns

### Consulta consolidada por competência mensal (FR-012, FR-029)

Para um dado `userId`, `month`, `year`:

1. **OneTimeExpense**: `WHERE userId = ? AND competenceMonth = ? AND competenceYear = ?`

2. **Installments** (com dados do pai): JOIN `InstallmentExpense WHERE userId = ?` + `WHERE competenceMonth = ? AND competenceYear = ?` — retorna `installmentNumber`, `installmentCount` (do pai), `amount`, `description` (do pai), `categoryId` (do pai).

3. **RecurringExpense ativas**: `WHERE userId = ? AND (startYear < year OR (startYear = year AND startMonth <= month)) AND (endYear IS NULL OR endYear > year OR (endYear = year AND endMonth >= month))`
   - Para cada ativa, versão vigente: `WHERE recurringExpenseId = ? AND (effectiveYear < year OR (effectiveYear = year AND effectiveMonth <= month))` ORDER BY `effectiveYear DESC, effectiveMonth DESC` LIMIT 1.

### Verificação de elegibilidade temporal

Uma competência `(month, year)` é elegível quando `year > currentYear OR (year = currentYear AND month >= currentMonth)`.

### Verificação de parcelas passadas (FR-028, FR-030)

"Passado" para parcela: `competenceYear < currentYear OR (competenceYear = currentYear AND competenceMonth < currentMonth)`.
"Futuro" para parcela: `competenceYear > currentYear OR (competenceYear = currentYear AND competenceMonth > currentMonth)`.
