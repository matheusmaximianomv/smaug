# Tasks: Project Base

**Input**: Design documents from `/specs/001-project-base/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/health.md, quickstart.md

**Tests**: A spec define testes de exemplo como parte da User Story 3 (Infraestrutura de Testes). Testes são gerados apenas nessa fase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Layers: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do projeto Node.js/TypeScript e configuração de tooling

- [x] T001 Initialize npm project with package.json — set name "smaug", engines.node ">=22", type "module" in package.json
- [x] T002 Install TypeScript and configure tsconfig.json — strict mode, ES2022 target, NodeNext module, outDir "dist/", rootDir "src/", declaration true, experimentalDecorators true, emitDecoratorMetadata true (required for tsyringe DI) in tsconfig.json
- [x] T003 [P] Configure ESLint flat config with TypeScript support in eslint.config.js
- [x] T004 [P] Configure Prettier with project defaults in .prettierrc
- [x] T005 [P] Create .gitignore — node_modules, dist, .env, prisma/\*.db in .gitignore
- [x] T006 [P] Create .env.example with all required environment variables (DATABASE_PROVIDER, DATABASE_URL, NODE_ENV, PORT, LOG_LEVEL) in .env.example
- [x] T007 [P] Create .env for local development (copy from .env.example with sqlite defaults) in .env

**Checkpoint**: Projeto npm inicializado, TypeScript configurado, tooling pronto.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura core que DEVE estar completa antes de qualquer user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create Clean Architecture directory structure — create all directories per plan.md: src/domain/entities/, src/domain/ports/, src/domain/use-cases/, src/application/services/, src/application/dtos/, src/infrastructure/database/migrations/, src/infrastructure/database/repositories/, src/infrastructure/logging/, src/infrastructure/config/, src/infrastructure/http/, src/presentation/controllers/, src/presentation/middlewares/, src/presentation/routes/, tests/unit/, tests/integration/, tests/helpers/
- [x] T009 Install core runtime dependencies — express, @types/express, dotenv, zod, pino, pino-pretty, tsyringe, reflect-metadata, prisma, @prisma/client in package.json
- [x] T010 Install dev dependencies — typescript, vitest, @types/node, eslint, prettier, tsx (for dev mode), dependency-cruiser (static analysis SC-006) in package.json
- [x] T011 Implement environment config validation schema with zod + dotenv loading in src/infrastructure/config/env.ts — validate DATABASE_PROVIDER (enum postgresql|sqlite), DATABASE_URL (string), NODE_ENV (enum development|production|test), PORT (number, default 3000), LOG_LEVEL (enum debug|info|warn|error, default info). Fail-fast with descriptive message on validation error (FR-019).
- [x] T012 [P] Define Repository port interface (generic CRUD) in src/domain/ports/repository.interface.ts — Repository<T, ID = string> with findById, findAll, create, update, delete methods as per data-model.md
- [x] T013 [P] Define Logger port interface in src/application/ports/logger.interface.ts — Logger with info, warn, error, debug methods accepting message + optional context as per data-model.md
- [x] T014 Implement PinoLogger adapter (implements Logger interface) in src/infrastructure/logging/logger.ts — structured JSON output, log level from env config, pino-pretty in development
- [x] T015 Configure DI container with tsyringe — register Logger binding in src/infrastructure/config/container.ts
- [x] T016 Implement global error handler middleware in src/presentation/middlewares/error-handler.middleware.ts — catch unhandled errors, log via Logger, return JSON error response without exposing sensitive details
- [x] T017 [P] Implement request logging middleware in src/presentation/middlewares/request-logger.middleware.ts — log timestamp, method, path, statusCode, responseTime for every request (FR-016, SC-007)
- [x] T017B Install and configure husky + lint-staged for automated pre-commit linting — npx husky init, configure .husky/pre-commit to run lint-staged, configure lint-staged in package.json to run ESLint + Prettier on staged files (Constitution: linting DEVE ser executado automaticamente)

**Checkpoint**: Foundation ready — ports definidos, config validada, logging funcional, DI configurado. User story implementation can begin.

---

## Phase 3: User Story 1 — Estrutura de Pastas Clean Architecture (Priority: P1) 🎯 MVP

**Goal**: Projeto compila, servidor HTTP inicia, health check básico responde, camadas separadas sem dependências cruzadas.

**Independent Test**: `npm run build` completa sem erros + `curl localhost:3000/health` retorna `{"status":"ok",...}`

### Implementation for User Story 1

- [x] T018 [US1] Implement Express HTTP server setup in src/infrastructure/http/server.ts — create and configure Express app, attach error handler and request logger middlewares, export start function
- [x] T019 [US1] Implement health check controller (basic, without DB status) in src/presentation/controllers/health.controller.ts — return { status: "ok", timestamp: ISO string, uptime: process.uptime() } as per contracts/health.md
- [x] T020 [US1] Implement route registration — register GET /health route mapping to health controller in src/presentation/routes/index.ts
- [x] T021 [US1] Implement application bootstrap in src/main.ts — load env config, initialize DI container, create HTTP server, register routes, start listening on configured PORT. Entry point that wires all layers together.
- [x] T022 [US1] Add npm scripts to package.json — "build": tsc, "start": node dist/main.js, "dev": tsx watch src/main.ts, "lint": eslint ., "format": prettier --write .
- [x] T023 [US1] Verify build compiles without errors — run npm run build and confirm dist/ output is generated with zero errors
- [x] T024 [US1] Verify dependency rule — configure dependency-cruiser (.dependency-cruiser.cjs) with rules: domain → no imports from infrastructure/presentation, application → no imports from infrastructure/presentation. Run `npx depcruise src --config` and confirm zero violations (SC-006). Add npm script "validate:deps": depcruise src --config.

**Checkpoint**: Projeto compila, servidor inicia, GET /health responde 200 OK. Camadas Clean Architecture sem dependências cruzadas. MVP funcional.

---

## Phase 4: User Story 2 — Camada de Persistência Intercambiável (Priority: P2)

**Goal**: Repository pattern funcional com implementações in-memory e Prisma. Troca de provider via variável de ambiente sem alterar código de domínio.

**Independent Test**: Criar implementação in-memory, executar operações CRUD básicas. Alterar DATABASE_PROVIDER em .env, confirmar que o sistema utiliza o provider correspondente.

### Implementation for User Story 2

- [x] T025 [US2] Create base Prisma schema (datasource + generator, sem models de negócio) in prisma/schema.prisma — datasource provider from env DATABASE_PROVIDER, url from env DATABASE_URL as per data-model.md. CAVEAT: `prisma generate` DEVE ser re-executado ao trocar provider (postgresql↔sqlite) pois o client é gerado em build-time.
- [x] T026 [US2] Implement InMemoryRepository<T> (implements Repository<T>) in src/infrastructure/database/repositories/in-memory.repository.ts — Map-based storage, full CRUD operations, useful for tests and development
- [x] T027 [US2] Implement database connection manager in src/infrastructure/database/config.ts — initialize/disconnect Prisma client, handle connection errors gracefully (sanitize error messages — NÃO expor connection strings ou detalhes sensíveis), export connection status check function
- [x] T028 [US2] Implement database provider factory in src/infrastructure/database/database.provider.ts — read DATABASE_PROVIDER from env config, return appropriate repository implementation. Fail with descriptive error if provider not supported (edge case from spec).
- [x] T029 [US2] Register database providers and repository bindings in DI container in src/infrastructure/config/container.ts — add Prisma client and repository factory registrations
- [x] T030 [US2] Enhance health check controller with database status in src/presentation/controllers/health.controller.ts — add database.status ("connected"|"disconnected") and database.provider fields. Return 503 if DB disconnected. Sanitize DB error messages antes de incluir na resposta (NÃO expor connection strings). As per contracts/health.md
- [x] T031 [US2] Verify provider swap — start app with DATABASE_PROVIDER=sqlite, confirm health check shows provider "sqlite". Change to in-memory config, confirm it works without code changes (SC-005).

**Checkpoint**: Persistência intercambiável funcional. Health check reporta status do banco. In-memory repo operacional para testes.

---

## Phase 5: User Story 3 — Infraestrutura de Testes (Priority: P3)

**Goal**: Vitest configurado com suites separadas para testes unitários e de integração. Testes de exemplo passam.

**Independent Test**: `npm run test:unit` e `npm run test:integration` executam e passam com sucesso.

### Implementation for User Story 3

- [x] T032 [US3] Configure Vitest for unit tests in vitest.config.ts — include tests/unit/**, exclude tests/integration/**, enable TypeScript, configure coverage
- [x] T033 [US3] Configure Vitest workspace for integration test isolation in vitest.workspace.ts — separate project for integration tests (tests/integration/\*\*), different setup/teardown, isolated from unit tests
- [x] T034 [US3] [P] Create shared test helpers in tests/helpers/setup.ts — utility functions for creating test DI container, mock logger, in-memory repository instances
- [x] T035 [US3] Create example unit test — test env config validation (valid + invalid input) in tests/unit/infrastructure/config/env.test.ts
- [x] T036 [US3] [P] Create example unit test — test InMemoryRepository CRUD operations in tests/unit/infrastructure/database/in-memory-repository.test.ts
- [x] T037 [US3] Create example integration test — test health check endpoint (200 OK + response body) in tests/integration/presentation/health.test.ts
- [x] T038 [US3] Add npm test scripts to package.json — "test": vitest run, "test:unit": vitest run --project unit, "test:integration": vitest run --project integration, "test:watch": vitest watch
- [x] T039 [US3] Verify all tests pass — run npm run test:unit (< 10s, SC-002) and npm run test:integration (< 30s, SC-003), confirm both suites execute in isolation

**Checkpoint**: Infraestrutura de testes operacional. Testes unitários e de integração executam de forma independente. Novos testes são detectados automaticamente pelo Vitest.

---

## Phase 6: User Story 4 — Containerização com Docker (Priority: P4)

**Goal**: Docker configurado com Dockerfile multi-stage e docker-compose orquestrando app + PostgreSQL. Health check via Docker probe.

**Independent Test**: `docker compose up --build` sobe todos os serviços e `curl localhost:3000/health` retorna status ok com database connected.

### Implementation for User Story 4

- [x] T040 [US4] Create multi-stage Dockerfile in Dockerfile — base node:22-alpine, build stage (npm ci + npm run build), production stage (copy dist + node_modules --production + prisma generate), EXPOSE PORT, HEALTHCHECK via curl /health
- [x] T041 [US4] [P] Create .dockerignore in .dockerignore — node_modules, dist, .env, .git, tests, specs, .specify
- [x] T042 [US4] Create docker-compose.yml in docker-compose.yml — services: app (build from Dockerfile, env from .env, depends_on postgres, healthcheck) + postgres (image postgres:16-alpine, volume for data, healthcheck). Configure network for inter-service communication.
- [x] T043 [US4] Create docker-compose .env overrides for PostgreSQL — ensure DATABASE_PROVIDER=postgresql and DATABASE_URL points to postgres container in .env.docker (or document in .env.example)
- [x] T044 [US4] Add Prisma migrate command to Docker entrypoint or docker-compose command — ensure migrations run on startup before app starts
- [x] T045 [US4] Verify Docker setup — run docker compose up --build, confirm app + postgres start, health check responds with status "ok" and database "connected" within 60s (SC-004)

**Checkpoint**: Ambiente Docker completamente funcional. App + PostgreSQL sobem via docker compose. Health check confirma conectividade.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentação, validação final e limpeza

- [x] T046 [P] Create README.md with project overview, tech stack, setup instructions (reference quickstart.md) in README.md
- [x] T047 [P] Validate quickstart.md steps end-to-end — follow every step from quickstart.md on a clean environment, document any corrections needed
- [x] T048 Run ESLint + Prettier on entire codebase — fix all linting/formatting issues
- [x] T049 Verify all Success Criteria pass — SC-001 (build < 30s), SC-002 (unit tests < 10s), SC-003 (integration tests < 30s), SC-004 (Docker health < 60s), SC-005 (provider swap without code change), SC-006 (no circular dependencies), SC-007 (structured log on health check)
- [x] T050 Final commit with conventional message — feat: setup project base with Clean Architecture, Prisma, Docker, and testing infrastructure

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2)
- **US2 (Phase 4)**: Depends on US1 (Phase 3) — needs server + health controller to enhance
- **US3 (Phase 5)**: Depends on US2 (Phase 4) — needs InMemoryRepository for test examples
- **US4 (Phase 6)**: Depends on US2 (Phase 4) — needs full app with DB for Docker setup
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **US2 (P2)**: Depends on US1 — enhances health check controller created in US1
- **US3 (P3)**: Depends on US2 — uses InMemoryRepository and health endpoint for example tests
- **US4 (P4)**: Depends on US2 — needs database layer for Docker PostgreSQL integration

### Within Each User Story

- Ports/interfaces before adapters/implementations
- Infrastructure before presentation
- Core implementation before integration/verification
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T003, T004, T005, T006, T007 can all run in parallel
- Phase 2: T012 + T013 can run in parallel; T016 + T017 can run in parallel
- Phase 5: T034 + T036 can run in parallel
- Phase 6: T041 can run in parallel with T040

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch port interfaces in parallel:
Task: "Define Repository port interface in src/domain/ports/repository.interface.ts"
Task: "Define Logger port interface in src/application/ports/logger.interface.ts"

# After ports are defined, launch middlewares in parallel:
Task: "Implement global error handler middleware in src/presentation/middlewares/error-handler.middleware.ts"
Task: "Implement request logging middleware in src/presentation/middlewares/request-logger.middleware.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm run build` + `curl localhost:3000/health`
5. MVP funcional: servidor TypeScript com Clean Architecture respondendo health check

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Build + health check funcional (MVP!)
3. Add US2 → Persistência intercambiável + health check com DB status
4. Add US3 → Testes unitários e integração passando
5. Add US4 → Docker funcionando com PostgreSQL
6. Polish → README, validação SC-001 a SC-007

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Total tasks: 51 (7 setup, 11 foundational, 7 US1, 7 US2, 8 US3, 6 US4, 5 polish)
