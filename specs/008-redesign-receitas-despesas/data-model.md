# Data Model: Redesign de Receitas e Despesas

**Nenhuma tabela nova, nenhuma migration.** O schema Prisma é o mesmo. A feature acrescenta ao domínio
uma **situação de competência** e **predicados de regra** reaproveitados pelos use cases e pelos DTOs,
e ao web um **view-model** de extrato e as funções de **prévia**.

## Domínio (server)

### `CompetenceStatus`

`server/src/domain/value-objects/monthly-competence.value-object.ts`

```ts
export type CompetenceStatus = "PAST" | "CURRENT" | "FUTURE";
```

| Membro                                        | Regra                                                          |
| --------------------------------------------- | -------------------------------------------------------------- |
| `MonthlyCompetence.current(ref = new Date())` | Competência do mês de `ref` em UTC — o "agora" do servidor     |
| `competence.statusAt(ref = new Date())`       | Compara com `current(ref)`; mesma regra de `isPastMonth` (UTC) |

### Predicados de entidade

| Entidade             | Membro                                            | Usado por                                                |
| -------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `Installment`        | `statusAt(ref)`                                   | `status` de cada parcela no DTO                          |
| `InstallmentExpense` | `getEndCompetence()`                              | `endYear`/`endMonth` (início + quantidade − 1)           |
| `InstallmentExpense` | `static hasPastInstallments(installments, ref)`   | `DeleteInstallmentExpenseUseCase` e `canDelete` (negado) |
| `InstallmentExpense` | `static hasFutureInstallments(installments, ref)` | `TerminateInstallmentExpenseUseCase` e `canTerminate`    |
| `RecurringExpense`   | `isExpiredAt(ref)`                                | `TerminateRecurringExpenseUseCase` e `isExpired`         |
| `FixedRevenue`       | `isExpiredAt(ref)`                                | `TerminateFixedRevenueUseCase` e `isExpired`             |

O port `InstallmentExpenseRepository` perdeu `hasPastInstallments(expenseId, month, year)`: a regra
deixou o repositório Prisma e passou a ser calculada sobre as parcelas já carregadas.

### Mapeamento de situação de parcela

| `CompetenceStatus` | `InstallmentStatus` |
| ------------------ | ------------------- |
| `PAST`             | `PAID`              |
| `CURRENT`          | `CURRENT`           |
| `FUTURE`           | `PENDING`           |

## Transporte (server → web)

Os formatos completos estão em [contracts/api-endpoints.md](./contracts/api-endpoints.md).

- `ReferenceCompetenceDto` `{year, month}` — mês corrente do servidor.
- `ExpenseTotalsDto` `{oneTime, installment, recurring, total}` e `RevenueTotalsDto`
  `{oneTimeTotal, fixedTotal, total}` — extraídos dos tipos inline que já existiam, sem mudar campos.
- `ExpenseYearSummaryResponseDto` / `RevenueYearSummaryResponseDto` — `{year, reference, months[12]}`.

## Web

### Tipos de feature

- `features/despesas/types`: `ExpenseMonth`, `ExpenseYearSummary`, `InstallmentStatus`, campos novos de
  parcelamento (`status`, `endYear`, `endMonth`, `canDelete`, `canTerminate`) e de recorrente
  (`isExpired`, `reference`, `previousAmount`).
- `features/receitas/types`: `RevenueMonth`, `RevenueYearSummary`, campos novos de fixa.
- `features/{despesas,receitas}/types/schemas.ts`: schemas zod discriminados por tipo (detalhes do
  assistente), de nova versão e de encerramento, com as mensagens pt-BR.

### Identidade por tipo — `shared/lib/entry-types.ts`

`ENTRY_KIND: Record<EntryKind, EntryKindStyle>` é a fonte única de rótulo, cor, classes e ícone:

| `EntryKind`  | Cor       | Ícone (lucide)                | Selo                                            |
| ------------ | --------- | ----------------------------- | ----------------------------------------------- |
| `avulsa`     | `#3b5bdb` | `Circle`                      | `bg-tipo-avulsa-light text-tipo-avulsa`         |
| `parcelada`  | `#c2660a` | `ChartNoAxesColumnDecreasing` | `bg-tipo-parcelada-light text-tipo-parcelada`   |
| `recorrente` | `#6841c7` | `Repeat`                      | `bg-tipo-recorrente-light text-tipo-recorrente` |
| `fixa`       | `#2d7a4a` | `Minus`                       | `bg-tipo-fixa-light text-tipo-fixa`             |

As classes são literais completos porque o Tailwind só gera o que encontra escrito por inteiro; os
tokens `tipo.*` estão em `tailwind.config.ts`. `versionTint(kind, index, total)` mistura a cor do tipo
ao branco de 35% a 100%, de modo que a versão mais recente é sempre a mais forte.

### Prévia — `shared/lib/preview.ts`

| Função              | Saída                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| `splitInstallments` | Valores em centavos: piso da divisão, resto na 1ª — espelho de `calculateInstallments` |
| `affectedMonths`    | Até 12 meses com valor, mais `+N meses` ou `continua…`                                 |
| `seriesSpan`        | Início e fim da linha do tempo (sem término: corrente + 8, no máximo 36 meses)         |
| `seriesTimeline`    | Células `normal`/`new`/`cut`, valor só na mudança, marca de referência                 |

### Outras libs

- `shared/lib/competence.ts`: `CompetenceStatus`, `diffMonths`, `formatCompetenceShort` ("Abr/26"),
  `formatCompetenceLong` ("Abril 2026"), `monthRange`.
- `shared/lib/money.ts`: `parseMoneyInput`, `isValidMoneyInput`, `toMoneyInput`,
  `formatCompactCurrency` ("3.420"); substitui `parseAmount.ts`.
- `shared/lib/ledger.ts`: montagem do view-model do extrato comum às duas naturezas.

### Estado no navegador

| Chave                           | Armazenamento    | Conteúdo                | Escopo                     |
| ------------------------------- | ---------------- | ----------------------- | -------------------------- |
| `smaug:competencia-lancamentos` | `sessionStorage` | `{year, month}` em JSON | Receitas e Despesas juntas |
