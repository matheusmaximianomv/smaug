# Implementation Plan: Project Base

**Branch**: `001-project-base` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-project-base/spec.md`

## Summary

Estabelecer a fundação do projeto Smaug: estrutura de diretórios
conforme Clean Architecture (domain, application, infrastructure,
presentation), camada de persistência intercambiável via Repository
pattern com migrações gerenciadas por ORM/toolkit, infraestrutura
de testes unitários e de integração, logging estruturado (JSON),
validação de configuração via schema, e containerização com Docker.
Sem frontend. TypeScript strict + Node.js 22 LTS + npm.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) sobre Node.js 22 LTS
**Primary Dependencies**: Express 4.x (HTTP, encapsulado em adapter), Prisma (ORM/migrações), zod (validação de env config), pino (logging estruturado JSON), dotenv (carregamento de .env), tsyringe (DI container)
**Storage**: PostgreSQL (produção) + SQLite (desenvolvimento local) + in-memory (testes), abstraídos via Repository pattern
**Testing**: Vitest (separação de suites unit/integration via workspaces)
**Target Platform**: Linux server (Docker container node:22-alpine)
**Project Type**: web-service (API REST)
**Performance Goals**: Build < 30s, testes unitários < 10s, testes integração < 30s, Docker health check < 60s
**Constraints**: Sem frontend, sem autenticação nesta feature, zero dependências circulares entre camadas
**Scale/Scope**: Projeto base — scaffolding para features futuras de finanças pessoais

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                            | Status  | Evidência                                                                                                                                                             |
| ------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Clean Architecture                | ✅ PASS | Estrutura de 4 camadas (domain, application, infrastructure, presentation). Regra de dependência: domain não importa de infrastructure/presentation (FR-001, FR-002). |
| II. Clean Code                       | ✅ PASS | ESLint + Prettier configurados (FR-011). Nomes descritivos e responsabilidade única são práticas enforced pelo linting.                                               |
| III. Independência de Frameworks     | ✅ PASS | ORM, HTTP framework e logger encapsulados em adapters na camada infrastructure. Domain usa apenas tipos nativos TypeScript (FR-003, FR-013, FR-015).                  |
| IV. Baixo Acoplamento                | ✅ PASS | DI container para resolução de dependências (FR-013). Módulos comunicam via interfaces/ports. Repository pattern para persistência (FR-003, FR-004).                  |
| V. Sustentabilidade e Escalabilidade | ✅ PASS | YAGNI aplicado — apenas scaffolding base sem features de negócio. Estrutura suporta crescimento (FR-001). Open/Closed via interfaces.                                 |

**Gate Result**: ✅ ALL PASS — Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-base/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── health.md        # Health check endpoint contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── entities/            # Entidades de negócio (futuras)
│   ├── ports/               # Interfaces (Repository, etc.)
│   └── use-cases/           # Casos de uso (futuros)
├── application/
│   ├── ports/               # Interfaces (Logger, etc.)
│   ├── services/            # Orquestração de use cases
│   └── dtos/                # Data Transfer Objects
├── infrastructure/
│   ├── database/
│   │   ├── migrations/      # Migrações de schema (ORM/toolkit)
│   │   ├── repositories/    # Implementações concretas dos repos
│   │   └── config.ts        # Configuração de conexão DB
│   ├── logging/
│   │   └── logger.ts        # Adapter de logging (pino/winston)
│   ├── config/
│   │   ├── env.ts           # Schema de validação + carregamento
│   │   └── container.ts     # DI container setup
│   └── http/
│       └── server.ts        # Setup do servidor HTTP
├── presentation/
│   ├── controllers/         # Controllers (handlers de rota)
│   ├── middlewares/          # Middlewares (logging, error handler)
│   └── routes/              # Definição de rotas
└── main.ts                  # Entry point — bootstrap da aplicação

tests/
├── unit/                    # Testes unitários (domain, application)
├── integration/             # Testes de integração (infrastructure)
└── helpers/                 # Utilitários de teste compartilhados
```

**Structure Decision**: Single project (sem frontend). Quatro camadas
alinhadas com Clean Architecture: `domain` (innermost, puro), `application`
(orquestração), `infrastructure` (adapters concretos), `presentation`
(HTTP layer). Testes separados em `unit/` e `integration/` na raiz.

## Complexity Tracking

> Nenhuma violação de constituição detectada. Tabela não aplicável.
