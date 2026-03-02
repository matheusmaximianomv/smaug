# Implementation Plan: Gestão de Despesas

**Branch**: `003-despesas` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-despesas/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar a API REST para gestão de despesas mensais (avulsas, parceladas e recorrentes), incluindo categorias de despesas gerenciáveis pelo usuário. O módulo expande a stack existente (002-receitas) com novos endpoints CRUD, cálculo automático de parcelas em centavos (FR-025), versionamento de despesas recorrentes (padrão idêntico ao FixedRevenueVersion), encerramento antecipado de parceladas e recorrentes, e consulta consolidada por competência mensal. Mesma stack tecnológica: Node.js 22 LTS, TypeScript strict, Prisma/SQLite, tsyringe, Zod, Vitest.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Express 5.x, Prisma (ORM), tsyringe (DI), zod (validação), pino (logging)
**Storage**: SQLite via Prisma (herdado de 002-receitas — mesmo arquivo `dev.db`)
**Testing**: Vitest (unit + integration separados via workspace)
**Target Platform**: Node.js 22 LTS, Linux server
**Project Type**: API REST (web-service)
**Performance Goals**: < 500ms por requisição (SC-001, SC-002, SC-005)
**Constraints**: Aritmética em centavos para divisão de parcelas; 1–72 parcelas; nomes de categoria case-insensitive (stored `nameLower`); meses passados bloqueados para criação/edição; exclusão de parcelada bloqueada se há parcelas passadas
**Scale/Scope**: Finanças pessoais — multi-tenant com isolamento por usuário

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                            | Status  | Justificativa                                                                                                                                      |
| ------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Clean Architecture                | ✅ PASS | Entities e use-cases puros no domínio; repositories via interface; controllers na presentation; sem dependências externas no domínio               |
| II. Clean Code                       | ✅ PASS | Nomenclatura em domínio financeiro claro; funções com responsabilidade única; aritmética de centavos em método isolado na entidade                 |
| III. Independência de Frameworks     | ✅ PASS | Express encapsulado em adapter; Prisma atrás de Repository interface; lógica de parcelas e recorrência sem dependências externas                   |
| IV. Baixo Acoplamento                | ✅ PASS | DI via tsyringe; módulos de despesas comunicam por interfaces; repositories injetados nos use-cases; sem chamadas diretas entre módulos de receita |
| V. Sustentabilidade e Escalabilidade | ✅ PASS | Incremental sobre base existente (002); YAGNI aplicado — sem orçamentos/metas/relatórios; Open/Closed via entities extensíveis                     |

## Project Structure

### Documentation (this feature)

```text
specs/003-despesas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts                              # (existing)
│   │   ├── one-time-revenue.entity.ts                  # (existing)
│   │   ├── fixed-revenue.entity.ts                     # (existing)
│   │   ├── fixed-revenue-version.entity.ts             # (existing)
│   │   ├── expense-category.entity.ts                  # NEW
│   │   ├── one-time-expense.entity.ts                  # NEW
│   │   ├── installment-expense.entity.ts               # NEW
│   │   ├── installment.entity.ts                       # NEW
│   │   ├── recurring-expense.entity.ts                 # NEW
│   │   └── recurring-expense-version.entity.ts         # NEW
│   ├── errors/
│   │   └── domain.error.ts                             # (existing — extend with new codes)
│   ├── ports/
│   │   ├── repository.interface.ts                     # (existing)
│   │   ├── user.repository.ts                          # (existing)
│   │   ├── one-time-revenue.repository.ts              # (existing)
│   │   ├── fixed-revenue.repository.ts                 # (existing)
│   │   ├── expense-category.repository.ts              # NEW
│   │   ├── one-time-expense.repository.ts              # NEW
│   │   ├── installment-expense.repository.ts           # NEW
│   │   └── recurring-expense.repository.ts             # NEW
│   ├── use-cases/
│   │   ├── user/                                       # (existing)
│   │   ├── one-time-revenue/                           # (existing)
│   │   ├── fixed-revenue/                              # (existing)
│   │   ├── expense-category/
│   │   │   ├── create-expense-category.use-case.ts     # NEW
│   │   │   ├── get-expense-category.use-case.ts        # NEW
│   │   │   ├── list-expense-categories.use-case.ts     # NEW
│   │   │   ├── update-expense-category.use-case.ts     # NEW
│   │   │   └── delete-expense-category.use-case.ts     # NEW
│   │   ├── one-time-expense/
│   │   │   ├── create-one-time-expense.use-case.ts     # NEW
│   │   │   ├── list-one-time-expenses.use-case.ts      # NEW
│   │   │   ├── update-one-time-expense.use-case.ts     # NEW
│   │   │   └── delete-one-time-expense.use-case.ts     # NEW
│   │   ├── installment-expense/
│   │   │   ├── create-installment-expense.use-case.ts  # NEW
│   │   │   ├── get-installment-expense.use-case.ts     # NEW
│   │   │   ├── update-installment-expense.use-case.ts  # NEW (description/category only)
│   │   │   ├── terminate-installment-expense.use-case.ts # NEW
│   │   │   └── delete-installment-expense.use-case.ts  # NEW
│   │   └── recurring-expense/
│   │       ├── create-recurring-expense.use-case.ts    # NEW
│   │       ├── get-recurring-expense.use-case.ts       # NEW
│   │       ├── list-recurring-expenses.use-case.ts     # NEW
│   │       ├── update-recurring-expense.use-case.ts    # NEW (versioned)
│   │       ├── terminate-recurring-expense.use-case.ts # NEW
│   │       └── delete-recurring-expense.use-case.ts    # NEW
│   └── value-objects/
│       └── monthly-competence.value-object.ts          # (existing — reused)
├── application/
│   ├── dtos/
│   │   ├── user.dto.ts                                 # (existing)
│   │   ├── one-time-revenue.dto.ts                     # (existing)
│   │   ├── fixed-revenue.dto.ts                        # (existing)
│   │   ├── revenue-query.dto.ts                        # (existing)
│   │   ├── expense-category.dto.ts                     # NEW
│   │   ├── one-time-expense.dto.ts                     # NEW
│   │   ├── installment-expense.dto.ts                  # NEW
│   │   ├── recurring-expense.dto.ts                    # NEW
│   │   └── expense-query.dto.ts                        # NEW
│   ├── ports/
│   │   └── logger.interface.ts                         # (existing)
│   └── services/
│       ├── user.service.ts                             # (existing)
│       ├── one-time-revenue.service.ts                 # (existing)
│       ├── fixed-revenue.service.ts                    # (existing)
│       ├── revenue-query.service.ts                    # (existing)
│       ├── expense-category.service.ts                 # NEW
│       ├── one-time-expense.service.ts                 # NEW
│       ├── installment-expense.service.ts              # NEW
│       ├── recurring-expense.service.ts                # NEW
│       └── expense-query.service.ts                    # NEW
├── infrastructure/
│   ├── config/
│   │   ├── container.ts                                # (existing — extend with new registrations)
│   │   └── env.ts                                      # (existing)
│   ├── database/
│   │   ├── config.ts                                   # (existing)
│   │   ├── database.provider.ts                        # (existing)
│   │   └── repositories/
│   │       ├── in-memory.repository.ts                 # (existing)
│   │       ├── prisma-user.repository.ts               # (existing)
│   │       ├── prisma-one-time-revenue.repository.ts   # (existing)
│   │       ├── prisma-fixed-revenue.repository.ts      # (existing)
│   │       ├── prisma-expense-category.repository.ts   # NEW
│   │       ├── prisma-one-time-expense.repository.ts   # NEW
│   │       ├── prisma-installment-expense.repository.ts # NEW
│   │       └── prisma-recurring-expense.repository.ts  # NEW
│   ├── http/
│   │   └── server.ts                                   # (existing)
│   └── logging/
│       └── logger.ts                                   # (existing)
├── presentation/
│   ├── controllers/
│   │   ├── health.controller.ts                        # (existing)
│   │   ├── user.controller.ts                          # (existing)
│   │   ├── one-time-revenue.controller.ts              # (existing)
│   │   ├── fixed-revenue.controller.ts                 # (existing)
│   │   ├── revenue-query.controller.ts                 # (existing)
│   │   ├── expense-category.controller.ts              # NEW
│   │   ├── one-time-expense.controller.ts              # NEW
│   │   ├── installment-expense.controller.ts           # NEW
│   │   ├── recurring-expense.controller.ts             # NEW
│   │   └── expense-query.controller.ts                 # NEW
│   ├── middlewares/
│   │   ├── error-handler.middleware.ts                 # (existing)
│   │   ├── request-logger.middleware.ts                # (existing)
│   │   └── validate-request.middleware.ts              # (existing)
│   └── routes/
│       ├── index.ts                                    # (existing — extend)
│       ├── user.routes.ts                              # (existing)
│       ├── one-time-revenue.routes.ts                  # (existing)
│       ├── fixed-revenue.routes.ts                     # (existing)
│       ├── revenue-query.routes.ts                     # (existing)
│       ├── expense-category.routes.ts                  # NEW
│       ├── one-time-expense.routes.ts                  # NEW
│       ├── installment-expense.routes.ts               # NEW
│       ├── recurring-expense.routes.ts                 # NEW
│       └── expense-query.routes.ts                     # NEW
└── main.ts                                             # (existing)

prisma/
└── schema.prisma                                       # (existing — extend with 6 new models)

tests/
├── helpers/
│   └── setup.ts                                        # (existing)
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.test.ts                     # (existing)
│   │   │   ├── one-time-revenue.entity.test.ts         # (existing)
│   │   │   ├── fixed-revenue.entity.test.ts            # (existing)
│   │   │   ├── monthly-competence.test.ts              # (existing)
│   │   │   ├── expense-category.entity.test.ts         # NEW
│   │   │   ├── one-time-expense.entity.test.ts         # NEW
│   │   │   ├── installment-expense.entity.test.ts      # NEW (cents arithmetic)
│   │   │   └── recurring-expense.entity.test.ts        # NEW
│   │   └── use-cases/
│   │       ├── user/                                   # (existing)
│   │       ├── one-time-revenue/                       # (existing)
│   │       ├── fixed-revenue/                          # (existing)
│   │       ├── expense-category/                       # NEW
│   │       ├── one-time-expense/                       # NEW
│   │       ├── installment-expense/                    # NEW
│   │       └── recurring-expense/                      # NEW
│   └── infrastructure/
│       └── config/
│           └── env.test.ts                             # (existing)
└── integration/
    └── presentation/
        ├── health.test.ts                              # (existing)
        ├── user.test.ts                                # (existing)
        ├── one-time-revenue.test.ts                    # (existing)
        ├── fixed-revenue.test.ts                       # (existing)
        ├── expense-category.test.ts                    # NEW
        ├── one-time-expense.test.ts                    # NEW
        ├── installment-expense.test.ts                 # NEW
        ├── recurring-expense.test.ts                   # NEW
        └── expense-query.test.ts                       # NEW
```

**Structure Decision**: Extensão da Clean Architecture de 4 camadas existente (001/002). Novos módulos de despesas (category, one-time, installment, recurring) seguem exatamente o padrão estabelecido em 002-receitas. Prisma repositories específicos por entidade para suportar queries complexas (filtro por competência, vigência, parcelas).

## Complexity Tracking

> No constitution violations detected. No justifications needed.
