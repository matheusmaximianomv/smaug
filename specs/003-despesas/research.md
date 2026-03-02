# Research: Gestão de Despesas

**Branch**: `003-despesas` | **Date**: 2026-03-01
**Purpose**: Resolver decisões técnicas para implementação do módulo de despesas. Todas as decisões de stack são herdadas de 002-receitas — apenas decisões específicas desta feature são documentadas aqui.

---

## Decision 1: Herança de Stack de 002-receitas

**Decision**: Reutilizar integralmente a stack definida em 002-receitas. Nenhuma nova dependência é necessária.

**Rationale**:

- TypeScript 5.x strict, Node.js 22 LTS, Express 5.x, Prisma, tsyringe, Zod, Pino, Vitest — todos já disponíveis e configurados.
- O módulo de despesas é uma extensão natural do módulo de receitas, seguindo os mesmos padrões arquiteturais.
- Adicionar dependências sem necessidade concreta viola o Princípio V (YAGNI).

**Inherited decisions from 002-receitas**:

| Concern            | Choice                                             | Notes                                                     |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------- |
| Database           | SQLite via Prisma                                  | Mesmo arquivo `dev.db`; migração via `prisma migrate dev` |
| User Auth          | Header `X-User-Id`                                 | Mesmo middleware `extractUser` existente                  |
| Request Validation | Zod middleware                                     | Mesmo `validateRequest(schema)` existente                 |
| Testing Strategy   | Unit (InMemory) + Integration (SQLite)             | Vitest workspace, supertest para HTTP                     |
| DB Naming          | snake_case + prefixo por tipo                      | `t_` tabelas, `i_` índices, `u_` unique constraints       |
| IDs                | `crypto.randomUUID()` gerado na aplicação          | Prisma recebe como `String @id`                           |
| Monetary values    | `Float` no SQLite; validação 2 decimais no domínio | Conversão centavos→reais apenas para cálculo de parcelas  |

---

## Decision 2: Case-Insensitive Uniqueness para Nomes de Categoria

**Decision**: Armazenar coluna `name_lower` (lowercase do nome) com constraint unique `(userId, nameLower)` no Prisma.

**Rationale**:

- SQLite não suporta collation `NOCASE` em constraints unique via Prisma.
- Armazenar `nameLower = name.toLowerCase()` permite constraint DB-level via `@@unique([userId, nameLower])`, garantindo unicidade sem depender de lógica de aplicação sozinha.
- A entidade `ExpenseCategory` mantém `name` (original) para exibição e `nameLower` para comparação/unicidade.

**Alternatives considered**:

- **Verificação apenas na camada de aplicação**: Sujeita a race conditions em escrita concorrente. Rejeitado por não garantir integridade referencial no banco.
- **SQLite `COLLATE NOCASE`**: Não suportado via Prisma `@@unique`. Rejeitado por limitação do ORM.

**Implementation notes**:

- Na criação: `nameLower = name.trim().toLowerCase()`.
- Na atualização: recalcular `nameLower` junto com `name`.
- O campo `nameLower` é interno; não é exposto na API (apenas `name` é retornado).

---

## Decision 3: Modelagem de Despesas Parceladas — Entidade Pai + Parcelas

**Decision**: `InstallmentExpense` (entidade pai) + `Installment` (parcelas individuais em tabela separada). Aritmética de centavos encapsulada em método estático da entidade.

**Rationale**:

- FR-026: parcelas individuais têm atributos próprios (número, valor, competência) — justificam entidade separada.
- FR-025: cálculo em centavos é lógica de domínio pura → pertence à entidade `InstallmentExpense`, não ao serviço.
- FR-027: atributos financeiros imutáveis após criação → `totalAmount`, `installmentCount` ficam no pai e não são alterados; parcelas herdam imutabilidade via `onDelete: Cascade` (sem `updatedAt`).
- FR-028: exclusão em cascata via `onDelete: Cascade` no Prisma.

**Alternatives considered**:

- **JSON array de parcelas em coluna**: Simples, mas dificulta queries por competência e viola normalização. Rejeitado.
- **Calcular parcelas no serviço de aplicação**: Mistura lógica de negócio com orquestração. Rejeitado — cálculo pertence ao domínio.

**Cents arithmetic algorithm** (FR-025):

```
totalCents = Math.round(totalAmount * 100)
installmentCents = Math.floor(totalCents / installmentCount)
remainder = totalCents % installmentCount

installment[0].amount = (installmentCents + remainder) / 100
installment[i].amount = installmentCents / 100  (i > 0)
```

---

## Decision 4: Modelagem de Despesas Recorrentes — Versionamento sem Modalidade

**Decision**: `RecurringExpense` (metadados de vigência) + `RecurringExpenseVersion` (atributos versionados: `description`, `amount`, `categoryId`). Sem campo `modality` — todas as despesas recorrentes são sempre versionáveis.

**Rationale**:

- O spec (Assumptions) define que "despesas recorrentes são sempre modificáveis" — não há distinção ALTERABLE/UNALTERABLE como em FixedRevenue.
- Simplifica o modelo: sem lógica condicional baseada em modalidade.
- `categoryId` pertence à versão (não ao pai) porque categoria é um dos atributos versionados (FR-009).
- Padrão de versionamento idêntico ao `FixedRevenueVersion` de 002-receitas: `effectiveMonth`/`effectiveYear` indica o mês de início da versão.

**Relationship**: `RecurringExpenseVersion.categoryId` → `ExpenseCategory`. Isso significa que ao verificar se uma categoria pode ser deletada, a query inclui `RecurringExpenseVersion`.

**Alternatives considered**:

- **`categoryId` no pai `RecurringExpense`**: Simplificaria queries, mas perderia rastreabilidade histórica da categoria. Rejeitado por violar FR-009 e FR-021.

---

## Decision 5: Verificação de Integridade Referencial de Categoria (FR-004)

**Decision**: Verificar existência de despesas vinculadas em 3 tabelas antes de deletar uma categoria: `OneTimeExpense`, `InstallmentExpense`, `RecurringExpenseVersion`.

**Rationale**:

- `OneTimeExpense.categoryId` → categoria direta.
- `InstallmentExpense.categoryId` → categoria atual (propagada a todas as parcelas).
- `RecurringExpenseVersion.categoryId` → categoria histórica de versões.
- A verificação ocorre no use-case `delete-expense-category`, consultando o repository.

**Implementation notes**:

- `IExpenseCategoryRepository` expõe método `hasLinkedExpenses(categoryId: string): Promise<boolean>`.
- O Prisma repository implementa queries paralelas com `Promise.all` para performance.

---

## Decision 6: Consulta Consolidada de Despesas por Competência (FR-012, FR-029)

**Decision**: Três sub-queries independentes (one-time, installments, recurring) consolidadas pelo serviço de aplicação `ExpenseQueryService`. Retorno tipado com discriminante `type`.

**Query patterns**:

1. **OneTimeExpense**: `WHERE userId = ? AND competenceMonth = ? AND competenceYear = ?`
2. **Installments**: JOIN com `InstallmentExpense WHERE userId = ?` + `WHERE competenceMonth = ? AND competenceYear = ?` — retorna dados da parcela + pai (description, category).
3. **RecurringExpense ativa**: `WHERE userId = ? AND (startYear < year OR (startYear = year AND startMonth <= month)) AND (endYear IS NULL OR endYear > year OR (endYear = year AND endMonth >= month))` — para cada ativa, buscar versão vigente: `WHERE (effectiveYear < year OR (effectiveYear = year AND effectiveMonth <= month))` ORDER BY effectiveYear DESC, effectiveMonth DESC LIMIT 1.

**Response discriminant**:

```json
{ "type": "ONE_TIME" | "INSTALLMENT" | "RECURRING" }
```

---

## Summary of Decisions

| Concern             | Choice                                                                        | Notes                                  |
| ------------------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| Stack               | Herdada de 002-receitas                                                       | Sem novas dependências                 |
| Category uniqueness | `nameLower` column + `@@unique`                                               | DB-level enforcement                   |
| Installment model   | `InstallmentExpense` + `Installment`                                          | Cents arithmetic na entidade           |
| Recurring model     | `RecurringExpense` + `RecurringExpenseVersion`                                | Sem `modality`; `categoryId` na versão |
| Category FK check   | 3 tabelas (`OneTimeExpense`, `InstallmentExpense`, `RecurringExpenseVersion`) | `hasLinkedExpenses()` no repo          |
| Consolidated query  | 3 sub-queries no `ExpenseQueryService`                                        | Discriminant `type` na resposta        |
