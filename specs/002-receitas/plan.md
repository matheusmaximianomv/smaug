# Implementation Plan: Gestão de Receitas Mensais

**Branch**: `002-receitas` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-receitas/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar a API REST para gestão de receitas mensais (avulsas e fixas), incluindo registro simplificado de usuário (sem JWT), endpoints CRUD completos, validação de regras de domínio, persistência com SQLite via Prisma, e cobertura com testes unitários e de integração. Conforme solicitado pelo usuário: sem despesas neste momento, autenticação simplificada (sem JWT), SQLite como banco de dados.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Express 5.x, Prisma (ORM), tsyringe (DI), zod (validação), pino (logging)
**Storage**: SQLite via Prisma (conforme solicitação do usuário)
**Testing**: Vitest (unit + integration separados via workspace)
**Target Platform**: Node.js 22 LTS, Linux server
**Project Type**: API REST (web-service)
**Performance Goals**: < 500ms por requisição (SC-001, SC-005)
**Constraints**: Valores monetários com máximo 2 casas decimais; meses passados bloqueados para criação/edição
**Scale/Scope**: Finanças pessoais — multi-tenant com isolamento por usuário

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                            | Status  | Justificativa                                                                                                                 |
| ------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| I. Clean Architecture                | ✅ PASS | Domain entities e use cases puros; repositories via interface na camada infrastructure; controllers na presentation           |
| II. Clean Code                       | ✅ PASS | Nomenclatura em domínio financeiro claro; funções com responsabilidade única; sem duplicação                                  |
| III. Independência de Frameworks     | ✅ PASS | Express encapsulado em adapter; Prisma atrás de Repository interface; lógica de negócio sem dependências externas             |
| IV. Baixo Acoplamento                | ✅ PASS | DI via tsyringe; módulos comunicam por interfaces; repositories injetados nos use cases                                       |
| V. Sustentabilidade e Escalabilidade | ✅ PASS | Incremental sobre base existente (001); YAGNI aplicado — sem JWT/despesas neste momento; Open/Closed via entities extensíveis |

## Project Structure

### Documentation (this feature)

```text
specs/002-receitas/
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
│   │   ├── user.entity.ts
│   │   ├── one-time-revenue.entity.ts
│   │   ├── fixed-revenue.entity.ts
│   │   └── fixed-revenue-version.entity.ts
│   ├── ports/
│   │   ├── repository.interface.ts          # (existing)
│   │   ├── user.repository.ts
│   │   ├── one-time-revenue.repository.ts
│   │   └── fixed-revenue.repository.ts
│   ├── use-cases/
│   │   ├── user/
│   │   │   ├── create-user.use-case.ts
│   │   │   └── get-user.use-case.ts
│   │   ├── one-time-revenue/
│   │   │   ├── create-one-time-revenue.use-case.ts
│   │   │   ├── update-one-time-revenue.use-case.ts
│   │   │   ├── delete-one-time-revenue.use-case.ts
│   │   │   └── list-one-time-revenues.use-case.ts
│   │   └── fixed-revenue/
│   │       ├── create-fixed-revenue.use-case.ts
│   │       ├── get-fixed-revenue.use-case.ts
│   │       ├── update-fixed-revenue.use-case.ts
│   │       ├── terminate-fixed-revenue.use-case.ts
│   │       ├── delete-fixed-revenue.use-case.ts
│   │       └── list-fixed-revenues.use-case.ts
│   └── value-objects/
│       └── monthly-competence.value-object.ts
├── application/
│   ├── dtos/
│   │   ├── user.dto.ts
│   │   ├── one-time-revenue.dto.ts
│   │   ├── fixed-revenue.dto.ts
│   │   └── revenue-query.dto.ts
│   ├── ports/
│   │   └── logger.interface.ts              # (existing)
│   └── services/
│       ├── user.service.ts
│       ├── one-time-revenue.service.ts
│       ├── fixed-revenue.service.ts
│       └── revenue-query.service.ts
├── infrastructure/
│   ├── config/
│   │   ├── container.ts                     # (existing — extend with new registrations)
│   │   └── env.ts                           # (existing)
│   ├── database/
│   │   ├── config.ts                        # (existing)
│   │   ├── database.provider.ts             # (existing)
│   │   └── repositories/
│   │       ├── in-memory.repository.ts      # (existing)
│   │       ├── prisma-user.repository.ts
│   │       ├── prisma-one-time-revenue.repository.ts
│   │       └── prisma-fixed-revenue.repository.ts
│   ├── http/
│   │   └── server.ts                        # (existing)
│   └── logging/
│       └── logger.ts                        # (existing)
├── presentation/
│   ├── controllers/
│   │   ├── health.controller.ts             # (existing)
│   │   ├── user.controller.ts
│   │   ├── one-time-revenue.controller.ts
│   │   ├── fixed-revenue.controller.ts
│   │   └── revenue-query.controller.ts
│   ├── middlewares/
│   │   ├── error-handler.middleware.ts       # (existing)
│   │   ├── request-logger.middleware.ts      # (existing)
│   │   └── validate-request.middleware.ts
│   └── routes/
│       ├── index.ts                         # (existing — extend)
│       ├── user.routes.ts
│       ├── one-time-revenue.routes.ts
│       ├── fixed-revenue.routes.ts
│       └── revenue-query.routes.ts
└── main.ts                                  # (existing)

prisma/
└── schema.prisma                            # (existing — extend with models)

tests/
├── helpers/
│   └── setup.ts                             # (existing)
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.test.ts
│   │   │   ├── one-time-revenue.entity.test.ts
│   │   │   ├── fixed-revenue.entity.test.ts
│   │   │   └── monthly-competence.test.ts
│   │   └── use-cases/
│   │       ├── user/
│   │       ├── one-time-revenue/
│   │       └── fixed-revenue/
│   └── infrastructure/
│       └── config/
│           └── env.test.ts                  # (existing)
└── integration/
    └── presentation/
        ├── health.test.ts                   # (existing)
        ├── user.test.ts
        ├── one-time-revenue.test.ts
        └── fixed-revenue.test.ts
```

**Structure Decision**: Clean Architecture com 4 camadas (domain, application, infrastructure, presentation) existente do 001-project-base. Novos módulos (user, one-time-revenue, fixed-revenue) seguem o mesmo padrão. Prisma repositories específicos por entidade substituem o genérico PrismaRepository para suportar queries complexas (filtro por competência, vigência, etc.).

## Complexity Tracking

> No constitution violations detected. No justifications needed.
