# Tasks: Gestão de Receitas Mensais

**Input**: Design documents from `/specs/002-receitas/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — user explicitly requested unit tests and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, environment configuration, and project scaffolding

- [x] T001 Update Prisma schema with User, OneTimeRevenue, FixedRevenue, and FixedRevenueVersion models using snake*case naming conventions (t* prefix for tables, i\_ prefix for indexes) in prisma/schema.prisma
- [x] T002 Update environment configuration to default DATABASE_PROVIDER to sqlite and DATABASE_URL to file:./dev.db in .env.example and src/infrastructure/config/env.ts
- [x] T003 Run Prisma migration to create SQLite database schema via `npx prisma migrate dev --name add-revenue-models`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain objects, shared middleware, and DI registrations that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create MonthlyCompetence value object with validation (month 1–12, year >= 2000, isPastMonth, isFutureOrCurrent) in src/domain/value-objects/monthly-competence.value-object.ts
- [x] T005 [P] Create User entity with validation (name 1–255 chars, email format) in src/domain/entities/user.entity.ts
- [x] T006 [P] Create UserRepository port interface (findById, findByEmail, create) in src/domain/ports/user.repository.ts
- [x] T007 [P] Create User DTOs (CreateUserDto, UserResponseDto) with zod schemas in src/application/dtos/user.dto.ts
- [x] T008 Create CreateUser use case in src/domain/use-cases/user/create-user.use-case.ts
- [x] T009 [P] Create GetUser use case in src/domain/use-cases/user/get-user.use-case.ts
- [x] T010 Create UserService orchestrating use cases in src/application/services/user.service.ts
- [x] T011 Create PrismaUserRepository implementing UserRepository port in src/infrastructure/database/repositories/prisma-user.repository.ts
- [x] T012 Create validate-request middleware (generic zod schema validator) in src/presentation/middlewares/validate-request.middleware.ts
- [x] T013 [P] Create extract-user middleware (reads X-User-Id header, validates user exists, injects userId into req) in src/presentation/middlewares/extract-user.middleware.ts
- [x] T014 Create UserController (create, getById) in src/presentation/controllers/user.controller.ts
- [x] T015 Create user routes (POST /users, GET /users/:id) in src/presentation/routes/user.routes.ts
- [x] T016 Register UserRepository, UserService, and related dependencies in DI container in src/infrastructure/config/container.ts
- [x] T017 Mount user routes and extract-user middleware in src/presentation/routes/index.ts
- [x] T018 [P] Write unit tests for MonthlyCompetence value object in tests/unit/domain/value-objects/monthly-competence.test.ts
- [x] T019 [P] Write unit tests for User entity in tests/unit/domain/entities/user.entity.test.ts
- [x] T020 [P] Write unit tests for CreateUser and GetUser use cases in tests/unit/domain/use-cases/user/
- [x] T021 Write integration tests for POST /users and GET /users/:id in tests/integration/presentation/user.test.ts

**Checkpoint**: User registration functional; X-User-Id middleware active; all user story work can now begin

---

## Phase 3: User Story 1 - Cadastro e gestão de receitas avulsas (Priority: P1) 🎯 MVP

**Goal**: CRUD completo de receitas avulsas vinculadas a competência mensal, com validação de regras de domínio (valor positivo, 2 casas decimais, mês atual/futuro, isolamento por usuário).

**Independent Test**: Criar, consultar, alterar e remover receitas avulsas para um mês específico, verificando persistência e validações.

**FRs**: FR-001, FR-002, FR-010, FR-011, FR-013, FR-015, FR-017, FR-018, FR-019

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US1] Write unit tests for OneTimeRevenue entity (creation, validation rules: amount > 0, max 2 decimals, description 1–255, competence validation) in tests/unit/domain/entities/one-time-revenue.entity.test.ts
- [x] T023 [P] [US1] Write unit tests for Create/Update/Delete/List OneTimeRevenue use cases with mocked repository in tests/unit/domain/use-cases/one-time-revenue/
- [x] T024 [P] [US1] Write integration tests for POST/GET/PUT/DELETE /revenues/one-time endpoints in tests/integration/presentation/one-time-revenue.test.ts

### Implementation for User Story 1

- [x] T025 [P] [US1] Create OneTimeRevenue entity with domain validation (amount > 0, max 2 decimals, description 1–255, competence must be current/future month) in src/domain/entities/one-time-revenue.entity.ts
- [x] T026 [P] [US1] Create OneTimeRevenueRepository port interface (findById, findByUserAndCompetence, findAllByUser, create, update, delete) in src/domain/ports/one-time-revenue.repository.ts
- [x] T027 [P] [US1] Create OneTimeRevenue DTOs (CreateOneTimeRevenueDto, UpdateOneTimeRevenueDto, OneTimeRevenueResponseDto) with zod schemas in src/application/dtos/one-time-revenue.dto.ts
- [x] T028 [US1] Create CreateOneTimeRevenue use case (validates competence is current/future, delegates to entity validation, persists) in src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case.ts
- [x] T029 [P] [US1] Create UpdateOneTimeRevenue use case (validates ownership, checks competence eligibility, applies partial update) in src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case.ts
- [x] T030 [P] [US1] Create DeleteOneTimeRevenue use case (validates ownership, checks competence eligibility) in src/domain/use-cases/one-time-revenue/delete-one-time-revenue.use-case.ts
- [x] T031 [P] [US1] Create ListOneTimeRevenues use case (filter by user, optional competence filter) in src/domain/use-cases/one-time-revenue/list-one-time-revenues.use-case.ts
- [x] T032 [US1] Create OneTimeRevenueService orchestrating use cases in src/application/services/one-time-revenue.service.ts
- [x] T033 [US1] Create PrismaOneTimeRevenueRepository implementing port in src/infrastructure/database/repositories/prisma-one-time-revenue.repository.ts
- [x] T034 [US1] Create OneTimeRevenueController (create, list, update, delete) in src/presentation/controllers/one-time-revenue.controller.ts
- [x] T035 [US1] Create one-time revenue routes (POST, GET, PUT /:id, DELETE /:id under /revenues/one-time) in src/presentation/routes/one-time-revenue.routes.ts
- [x] T036 [US1] Register OneTimeRevenueRepository, OneTimeRevenueService in DI container in src/infrastructure/config/container.ts
- [x] T037 [US1] Mount one-time revenue routes (protected by extract-user middleware) in src/presentation/routes/index.ts

**Checkpoint**: User Story 1 fully functional — CRUD de receitas avulsas com todas as validações. MVP testável independentemente.

---

## Phase 4: User Story 2 - Cadastro de receitas fixas com vigência (Priority: P2)

**Goal**: Criação de receitas fixas (alteráveis e inalteráveis) com vigência mensal, criação automática de versão inicial, validação de datas de vigência, exclusão permanente.

**Independent Test**: Criar receitas fixas com diferentes combinações de vigência e modalidade, verificar reconhecimento de meses cobertos.

**FRs**: FR-003, FR-004, FR-005, FR-012, FR-014, FR-019, FR-020

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T038 [P] [US2] Write unit tests for FixedRevenue entity (creation, modality immutability, vigência validation, start date current/future) in tests/unit/domain/entities/fixed-revenue.entity.test.ts
- [x] T039 [P] [US2] Write unit tests for FixedRevenueVersion entity (creation, validation rules) in tests/unit/domain/entities/fixed-revenue-version.entity.test.ts
- [x] T040 [P] [US2] Write unit tests for Create/Delete/List FixedRevenue use cases with mocked repository in tests/unit/domain/use-cases/fixed-revenue/
- [x] T041 [P] [US2] Write integration tests for POST/GET/DELETE /revenues/fixed endpoints in tests/integration/presentation/fixed-revenue.test.ts

### Implementation for User Story 2

- [x] T042 [P] [US2] Create FixedRevenue entity with domain validation (modality enum, start/end date validation, vigência logic, isActiveForMonth) in src/domain/entities/fixed-revenue.entity.ts
- [x] T043 [P] [US2] Create FixedRevenueVersion entity with validation (amount, description, effective date within vigência) in src/domain/entities/fixed-revenue-version.entity.ts
- [x] T044 [P] [US2] Create FixedRevenueRepository port interface (findById, findByUser, findActiveForCompetence, create, update, delete — includes version operations) in src/domain/ports/fixed-revenue.repository.ts
- [x] T045 [P] [US2] Create FixedRevenue DTOs (CreateFixedRevenueDto, FixedRevenueResponseDto) with zod schemas in src/application/dtos/fixed-revenue.dto.ts
- [x] T046 [US2] Create CreateFixedRevenue use case (validates start date current/future, end >= start, creates revenue + initial version atomically) in src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case.ts
- [x] T047 [P] [US2] Create DeleteFixedRevenue use case (validates ownership, cascades to versions) in src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case.ts
- [x] T048 [P] [US2] Create GetFixedRevenue use case (find by id, validate ownership, include all versions) in src/domain/use-cases/fixed-revenue/get-fixed-revenue.use-case.ts
- [x] T049 [P] [US2] Create ListFixedRevenues use case (filter by user, optional competence filter with vigência check, resolve current version per month) in src/domain/use-cases/fixed-revenue/list-fixed-revenues.use-case.ts
- [x] T050 [US2] Create FixedRevenueService orchestrating use cases in src/application/services/fixed-revenue.service.ts
- [x] T051 [US2] Create PrismaFixedRevenueRepository implementing port (includes version queries, atomic create with version) in src/infrastructure/database/repositories/prisma-fixed-revenue.repository.ts
- [x] T052 [US2] Create FixedRevenueController (create, list, getById, delete) in src/presentation/controllers/fixed-revenue.controller.ts
- [x] T053 [US2] Create fixed revenue routes (POST, GET, GET /:id, DELETE /:id under /revenues/fixed) in src/presentation/routes/fixed-revenue.routes.ts
- [x] T054 [US2] Register FixedRevenueRepository, FixedRevenueService in DI container in src/infrastructure/config/container.ts
- [x] T055 [US2] Mount fixed revenue routes (protected by extract-user middleware) in src/presentation/routes/index.ts

**Checkpoint**: User Stories 1 AND 2 functional — receitas avulsas e fixas com vigência criáveis/consultáveis/excluíveis.

---

## Phase 5: User Story 3 - Alteração de receitas fixas alteráveis com preservação histórica (Priority: P3)

**Goal**: Permitir alteração de valor/descrição de receitas fixas alteráveis a partir de um mês específico (atual/futuro), criando nova versão e preservando histórico dos meses anteriores.

**Independent Test**: Criar receita fixa alterável, aplicar alteração a partir de mês futuro, verificar que meses anteriores mantêm valores originais e meses futuros refletem alteração.

**FRs**: FR-006, FR-016

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T056 [P] [US3] Write unit tests for UpdateFixedRevenue use case (version creation, effective date validation, preservação histórica, rejeição se UNALTERABLE) in tests/unit/domain/use-cases/fixed-revenue/update-fixed-revenue.test.ts
- [x] T057 [P] [US3] Write integration tests for PATCH /revenues/fixed/:id endpoint (alteration with history, rejection for unalterable, past month rejection) in tests/integration/presentation/fixed-revenue-update.test.ts

### Implementation for User Story 3

- [x] T058 [US3] Create UpdateFixedRevenue use case (validates ALTERABLE modality, effective date current/future and within vigência, creates new FixedRevenueVersion) in src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case.ts
- [x] T059 [US3] Add UpdateFixedRevenueDto with zod schema (description, amount, effectiveYear, effectiveMonth) in src/application/dtos/fixed-revenue.dto.ts
- [x] T060 [US3] Add update method to FixedRevenueService in src/application/services/fixed-revenue.service.ts
- [x] T061 [US3] Add addVersion and findVersionsForRevenue methods to PrismaFixedRevenueRepository in src/infrastructure/database/repositories/prisma-fixed-revenue.repository.ts
- [x] T062 [US3] Add update handler to FixedRevenueController in src/presentation/controllers/fixed-revenue.controller.ts
- [x] T063 [US3] Add PATCH /:id route to fixed revenue routes in src/presentation/routes/fixed-revenue.routes.ts

**Checkpoint**: Receitas fixas alteráveis podem ser modificadas com preservação histórica completa.

---

## Phase 6: User Story 4 - Gestão de receitas fixas inalteráveis (Priority: P4)

**Goal**: Encerramento antecipado de receitas fixas (ambas modalidades), rejeição de alterações em inalteráveis. A rejeição de alteração em inalteráveis já é tratada no US3 (UpdateFixedRevenue valida modality); esta fase foca no endpoint de terminate.

**Independent Test**: Criar receita fixa inalterável, tentar alterar (verificar rejeição), encerrar antecipadamente (verificar que deixa de ser ativa).

**FRs**: FR-007, FR-008

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T064 [P] [US4] Write unit tests for TerminateFixedRevenue use case (early termination for both modalities, rejection if already expired, end date validation) in tests/unit/domain/use-cases/fixed-revenue/terminate-fixed-revenue.test.ts
- [x] T065 [P] [US4] Write integration tests for PATCH /revenues/fixed/:id/terminate endpoint in tests/integration/presentation/fixed-revenue-terminate.test.ts

### Implementation for User Story 4

- [x] T066 [US4] Create TerminateFixedRevenue use case (validates end date current/future, within vigência, not already expired, sets new end date) in src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case.ts
- [x] T067 [US4] Add TerminateFixedRevenueDto with zod schema (endYear, endMonth) in src/application/dtos/fixed-revenue.dto.ts
- [x] T068 [US4] Add terminate method to FixedRevenueService in src/application/services/fixed-revenue.service.ts
- [x] T069 [US4] Add updateEndDate method to PrismaFixedRevenueRepository in src/infrastructure/database/repositories/prisma-fixed-revenue.repository.ts
- [x] T070 [US4] Add terminate handler to FixedRevenueController in src/presentation/controllers/fixed-revenue.controller.ts
- [x] T071 [US4] Add PATCH /:id/terminate route to fixed revenue routes in src/presentation/routes/fixed-revenue.routes.ts

**Checkpoint**: Receitas fixas inalteráveis totalmente gerenciáveis (consulta + encerramento); alterações rejeitadas corretamente.

---

## Phase 7: User Story 5 - Consulta de receitas por competência mensal (Priority: P5)

**Goal**: Consulta consolidada de todas as receitas (avulsas + fixas ativas com versão vigente) para um mês específico, com total calculado.

**Independent Test**: Criar receitas avulsas e fixas, consultar mês específico, verificar que todas as aplicáveis são retornadas com total correto.

**FRs**: FR-009

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T072 [P] [US5] Write unit tests for RevenueQueryService (consolidation logic, total calculation, empty month) in tests/unit/application/services/revenue-query.service.test.ts
- [x] T073 [P] [US5] Write integration tests for GET /revenues?competenceYear=X&competenceMonth=Y endpoint in tests/integration/presentation/revenue-query.test.ts

### Implementation for User Story 5

- [x] T074 [US5] Create RevenueQueryService (queries both OneTimeRevenue and FixedRevenue repos, resolves current version for each fixed revenue, calculates total) in src/application/services/revenue-query.service.ts
- [x] T075 [US5] Create consolidated revenue response DTO in src/application/dtos/revenue-query.dto.ts
- [x] T076 [US5] Create RevenueQueryController (consolidated query handler) in src/presentation/controllers/revenue-query.controller.ts
- [x] T077 [US5] Create consolidated revenue route (GET /revenues with required competenceYear/competenceMonth) in src/presentation/routes/revenue-query.routes.ts
- [x] T078 [US5] Register RevenueQueryService in DI container in src/infrastructure/config/container.ts
- [x] T079 [US5] Mount consolidated revenue route in src/presentation/routes/index.ts

**Checkpoint**: Consulta consolidada funcional — todas as 5 user stories completas.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Refinements, edge case hardening, and documentation

- [x] T080 Review and harden error-handler middleware for all new domain error types in src/presentation/middlewares/error-handler.middleware.ts
- [x] T081 [P] Validate all edge cases from spec.md are covered (invalid month format, same-month start/end, multiple revenues coexistence, expired termination, zero value, >2 decimals)
- [x] T082 [P] Run full test suite (unit + integration) and fix any failures
- [x] T083 Run quickstart.md validation (execute all curl commands against running server)
- [x] T084 Update .env.example with final configuration values
- [x] T085 [P] Validate response times < 500ms for key endpoints (SC-001, SC-005) via integration test assertions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Phase 2 completion
  - US1 (Phase 3): Independent — no dependency on other stories
  - US2 (Phase 4): Independent — no dependency on other stories
  - US3 (Phase 5): Depends on US2 (FixedRevenue entity + repository must exist)
  - US4 (Phase 6): Depends on US2 (FixedRevenue entity + repository must exist)
  - US5 (Phase 7): Depends on US1 + US2 (needs both revenue types to consolidate)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **US2 (P2)**: Can start after Phase 2 — No dependencies on other stories (can run parallel with US1)
- **US3 (P3)**: Requires US2 complete (extends FixedRevenue with update use case)
- **US4 (P4)**: Requires US2 complete (extends FixedRevenue with terminate use case); can run parallel with US3
- **US5 (P5)**: Requires US1 + US2 complete (consolidates both revenue types)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Entities and ports before use cases
- Use cases before services
- Services before controllers/routes
- DI registration before route mounting

### Parallel Opportunities

- Phase 2: T005, T006, T007 can run in parallel (User entity, port, DTOs)
- Phase 2: T018, T019, T020 can run in parallel (unit tests)
- US1: T022, T023, T024 can run in parallel (all tests); T025, T026, T027 can run in parallel (entity, port, DTOs)
- US2: T038–T041 can run in parallel (all tests); T042, T043, T044, T045 can run in parallel (entities, port, DTOs)
- US1 and US2 can run in parallel after Phase 2
- US3 and US4 can run in parallel after US2

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together:
Task: T022 "Unit tests for OneTimeRevenue entity"
Task: T023 "Unit tests for CRUD use cases"
Task: T024 "Integration tests for endpoints"

# Launch entity + port + DTOs together:
Task: T025 "OneTimeRevenue entity"
Task: T026 "OneTimeRevenueRepository port"
Task: T027 "OneTimeRevenue DTOs"
```

## Parallel Example: US1 + US2 simultaneously

```bash
# After Phase 2, both can start in parallel:
Stream A (US1): T022→T025→T028→T032→T033→T034→T035→T036→T037
Stream B (US2): T038→T042→T046→T050→T051→T052→T053→T054→T055
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T021)
3. Complete Phase 3: User Story 1 (T022–T037)
4. **STOP and VALIDATE**: Test US1 independently — CRUD de receitas avulsas funcional
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 → Test independently → Receitas fixas criáveis
4. Add US3 → Test independently → Alteração com histórico
5. Add US4 → Test independently → Encerramento antecipado
6. Add US5 → Test independently → Consulta consolidada
7. Phase 8 → Polish → Final delivery

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database naming: tables use `t_` prefix, indexes use `i_` prefix, columns in snake_case (per research.md Decision 6)
- IDs generated in application via `crypto.randomUUID()` (SQLite doesn't support uuid() natively)
