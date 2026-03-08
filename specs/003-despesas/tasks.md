---
description: "Task list for Gestão de Despesas feature implementation"
---

# Tasks: Gestão de Despesas

**Input**: Design documents from `/specs/003-despesas/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED. The feature specification and constitution require coverage for domain rules and use cases at minimum, plus integration coverage for the main expense flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Update Prisma schema with ExpenseCategory, OneTimeExpense, InstallmentExpense, Installment, RecurringExpense, and RecurringExpenseVersion models and relations in prisma/schema.prisma
- [x] T002 Run database migration to add expense models after schema changes are defined

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create ExpenseCategory entity in src/domain/entities/expense-category.entity.ts
- [x] T004 [P] Create OneTimeExpense entity in src/domain/entities/one-time-expense.entity.ts
- [x] T005 [P] Create InstallmentExpense entity in src/domain/entities/installment-expense.entity.ts
- [x] T006 [P] Create Installment entity in src/domain/entities/installment.entity.ts
- [x] T007 [P] Create RecurringExpense entity in src/domain/entities/recurring-expense.entity.ts
- [x] T008 [P] Create RecurringExpenseVersion entity in src/domain/entities/recurring-expense-version.entity.ts
- [x] T009 Create IExpenseCategoryRepository interface in src/domain/ports/expense-category.repository.ts
- [x] T010 [P] Create IOneTimeExpenseRepository interface in src/domain/ports/one-time-expense.repository.ts
- [x] T011 [P] Create IInstallmentExpenseRepository interface in src/domain/ports/installment-expense.repository.ts
- [x] T012 [P] Create IRecurringExpenseRepository interface in src/domain/ports/recurring-expense.repository.ts
- [x] T013 Create PrismaExpenseCategoryRepository in src/infrastructure/database/repositories/prisma-expense-category.repository.ts
- [x] T014 [P] Create PrismaOneTimeExpenseRepository in src/infrastructure/database/repositories/prisma-one-time-expense.repository.ts
- [x] T015 [P] Create PrismaInstallmentExpenseRepository in src/infrastructure/database/repositories/prisma-installment-expense.repository.ts
- [x] T016 [P] Create PrismaRecurringExpenseRepository in src/infrastructure/database/repositories/prisma-recurring-expense.repository.ts
- [x] T017 Add new domain error codes for expenses in src/domain/errors/domain.error.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Gestão de categorias de despesas (Priority: P1) 🎯 MVP

**Goal**: Allow users to create, read, update, and delete expense categories with case-insensitive unique names

**Independent Test**: Create a category, update its name, verify uniqueness constraint, test deletion blocking when linked expenses exist

### Tests for User Story 1

- [x] T017A [P] [US1] Create unit tests for ExpenseCategory entity validation and case-insensitive uniqueness invariants in tests/unit/domain/entities/expense-category.entity.test.ts
- [x] T017B [P] [US1] Create unit tests for create/get/list/update/delete expense-category use cases in tests/unit/domain/use-cases/expense-category/
- [x] T017C [P] [US1] Create integration tests for expense-category endpoints including deletion blocking when linked expenses exist in tests/integration/presentation/expense-category.test.ts

### Implementation for User Story 1

- [x] T018 [P] [US1] Create create-expense-category.use-case.ts in src/domain/use-cases/expense-category/
- [x] T019 [P] [US1] Create get-expense-category.use-case.ts in src/domain/use-cases/expense-category/
- [x] T020 [P] [US1] Create list-expense-categories.use-case.ts in src/domain/use-cases/expense-category/
- [x] T021 [P] [US1] Create update-expense-category.use-case.ts in src/domain/use-cases/expense-category/
- [x] T022 [P] [US1] Create delete-expense-category.use-case.ts in src/domain/use-cases/expense-category/
- [x] T023 [P] [US1] Create expense-category.dto.ts in src/application/dtos/
- [x] T024 [P] [US1] Create expense-category.service.ts in src/application/services/
- [x] T025 [US1] Create expense-category.controller.ts in src/presentation/controllers/
- [x] T026 [US1] Create expense-category.routes.ts in src/presentation/routes/
- [x] T026A [US1] Register ExpenseCategory repository and service in src/infrastructure/config/container.ts
- [x] T027 [US1] Update main routes index.ts to include expense-category routes

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Cadastro e gestão de despesas avulsas (Priority: P2)

**Goal**: Allow users to create, read, update, and delete one-time expenses linked to categories and competence months

**Independent Test**: Create a one-time expense, update its amount/category, verify temporal eligibility rules, test deletion

### Tests for User Story 2

- [x] T027A [P] [US2] Create unit tests for OneTimeExpense entity validation in tests/unit/domain/entities/one-time-expense.entity.test.ts
- [x] T027B [P] [US2] Create unit tests for create/list/update/delete one-time-expense use cases including category ownership and temporal eligibility in tests/unit/domain/use-cases/one-time-expense/
- [x] T027C [P] [US2] Create integration tests for one-time-expense endpoints in tests/integration/presentation/one-time-expense.test.ts

### Implementation for User Story 2

- [x] T028 [P] [US2] Create create-one-time-expense.use-case.ts in src/domain/use-cases/one-time-expense/
- [x] T029 [P] [US2] Create list-one-time-expenses.use-case.ts in src/domain/use-cases/one-time-expense/
- [x] T030 [P] [US2] Create update-one-time-expense.use-case.ts in src/domain/use-cases/one-time-expense/
- [x] T031 [P] [US2] Create delete-one-time-expense.use-case.ts in src/domain/use-cases/one-time-expense/
- [x] T032 [P] [US2] Create one-time-expense.dto.ts in src/application/dtos/
- [x] T033 [P] [US2] Create one-time-expense.service.ts in src/application/services/
- [x] T034 [US2] Create one-time-expense.controller.ts in src/presentation/controllers/
- [x] T035 [US2] Create one-time-expense.routes.ts in src/presentation/routes/
- [x] T035A [US2] Register OneTimeExpense repository and service in src/infrastructure/config/container.ts
- [x] T036 [US2] Update main routes index.ts to include one-time-expense routes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Cadastro e gestão de despesas parceladas (Priority: P3)

**Goal**: Allow users to create installment expenses with automatic cents-based calculation and installment generation

**Independent Test**: Create installment expense, verify cents arithmetic (remainder in first installment), test update/delete restrictions, test early termination

### Tests for User Story 3

- [x] T036A [P] [US3] Create unit tests for InstallmentExpense and Installment entities including cents arithmetic, consecutive competence generation, and financial immutability in tests/unit/domain/entities/
- [x] T036B [P] [US3] Create unit tests for create/get/update/terminate/delete installment-expense use cases in tests/unit/domain/use-cases/installment-expense/
- [x] T036C [P] [US3] Create integration tests for installment-expense endpoints including past-month deletion blocking and early termination in tests/integration/presentation/installment-expense.test.ts

### Implementation for User Story 3

- [x] T037 [P] [US3] Create create-installment-expense.use-case.ts in src/domain/use-cases/installment-expense/
- [x] T038 [P] [US3] Create get-installment-expense.use-case.ts in src/domain/use-cases/installment-expense/
- [x] T039 [P] [US3] Create update-installment-expense.use-case.ts in src/domain/use-cases/installment-expense/
- [x] T040 [P] [US3] Create terminate-installment-expense.use-case.ts in src/domain/use-cases/installment-expense/
- [x] T041 [P] [US3] Create delete-installment-expense.use-case.ts in src/domain/use-cases/installment-expense/
- [x] T042 [P] [US3] Create installment-expense.dto.ts in src/application/dtos/
- [x] T043 [P] [US3] Create installment-expense.service.ts in src/application/services/
- [x] T044 [US3] Create installment-expense.controller.ts in src/presentation/controllers/
- [x] T045 [US3] Create installment-expense.routes.ts in src/presentation/routes/
- [x] T045A [US3] Register InstallmentExpense repository and service in src/infrastructure/config/container.ts
- [x] T046 [US3] Update main routes index.ts to include installment-expense routes

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Cadastro e gestão de despesas recorrentes (Priority: P4)

**Goal**: Allow users to create, read, list, terminate, and delete recurring expenses with explicit monthly invariants

**Independent Test**: Create recurring expense, verify monthly/date constraints, test retrieval, early termination, and deletion

### Tests for User Story 4

- [x] T046A [P] [US4] Create unit tests for RecurringExpense and RecurringExpenseVersion entities including monthly periodicity and date invariants in tests/unit/domain/entities/
- [x] T046B [P] [US4] Create unit tests for create/get/list/terminate/delete recurring-expense use cases in tests/unit/domain/use-cases/recurring-expense/
- [x] T046C [P] [US4] Create integration tests for recurring-expense create/get/list/terminate/delete endpoints in tests/integration/presentation/recurring-expense.test.ts

### Implementation for User Story 4

- [x] T047 [P] [US4] Create create-recurring-expense.use-case.ts in src/domain/use-cases/recurring-expense/
- [x] T048 [P] [US4] Create get-recurring-expense.use-case.ts in src/domain/use-cases/recurring-expense/
- [x] T049 [P] [US4] Create list-recurring-expenses.use-case.ts in src/domain/use-cases/recurring-expense/
- [x] T049A [US4] Enforce monthly-only recurrence invariants and active-period validation for recurring expenses in src/domain/entities/recurring-expense.entity.ts and related use cases
- [x] T051 [P] [US4] Create terminate-recurring-expense.use-case.ts in src/domain/use-cases/recurring-expense/
- [x] T052 [P] [US4] Create delete-recurring-expense.use-case.ts in src/domain/use-cases/recurring-expense/
- [x] T053 [P] [US4] Create recurring-expense.dto.ts in src/application/dtos/
- [x] T054 [P] [US4] Create recurring-expense.service.ts in src/application/services/
- [x] T055 [US4] Create recurring-expense.controller.ts in src/presentation/controllers/
- [x] T056 [US4] Create recurring-expense.routes.ts in src/presentation/routes/
- [x] T056A [US4] Register RecurringExpense repository and service in src/infrastructure/config/container.ts
- [x] T057 [US4] Update main routes index.ts to include recurring-expense routes

---

## Phase 7: User Story 5 - Alteração de despesas recorrentes com preservação histórica (Priority: P5)

**Goal**: Allow users to update recurring expenses with versioning and early termination

**Independent Test**: Create recurring expense, apply future changes, verify past months unchanged, test version history

### Tests for User Story 5

- [x] T057A [P] [US5] Create unit tests for recurring-expense update and version-history retrieval use cases in tests/unit/domain/use-cases/recurring-expense/
- [x] T057B [P] [US5] Create integration tests for recurring-expense update and version-history responses in tests/integration/presentation/recurring-expense-history.test.ts

### Implementation for User Story 5

- [x] T058 [US5] Create update-recurring-expense.use-case.ts with future-only effective dates and version creation in src/domain/use-cases/recurring-expense/
- [x] T059 [US5] Add version history retrieval to get-recurring-expense.use-case.ts in src/domain/use-cases/recurring-expense/
- [x] T060 [US5] Update recurring-expense.dto.ts to include version history in responses in src/application/dtos/
- [x] T061 [US5] Add update and history validation orchestration in recurring-expense.service.ts in src/application/services/

---

## Phase 8: User Story 6 - Consulta de despesas por competência mensal (Priority: P6)

**Goal**: Provide consolidated query of all expenses (one-time, installments, recurring) for a specific month

**Independent Test**: Create mixed expense types, query specific month, verify all applicable expenses returned with correct totals

### Tests for User Story 6

- [x] T061A [P] [US6] Create unit tests for expense query consolidation covering coexistence of multiple expense types in the same month in tests/unit/application/services/expense-query.service.test.ts
- [x] T061B [P] [US6] Create integration tests for expense-query endpoint including category, type, and installment origin reference in tests/integration/presentation/expense-query.test.ts

### Implementation for User Story 6

- [x] T062 [P] [US6] Create expense-query.dto.ts in src/application/dtos/
- [x] T063 [P] [US6] Create expense-query.service.ts in src/application/services/ to consolidate one-time, installment, and recurring expenses for the same competence month
- [x] T064 [US6] Create expense-query.controller.ts in src/presentation/controllers/
- [x] T065 [US6] Create expense-query.routes.ts in src/presentation/routes/
- [x] T065A [US6] Include installment-expense origin reference fields in expense-query.dto.ts and expense-query.service.ts responses
- [x] T066 [US6] Update main routes index.ts to include expense-query routes

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T067 [P] Validate that all story-level tests cover spec edge cases and success criteria in tests/unit and tests/integration
- [x] T068 [P] Validate quickstart and contract examples against the implemented endpoints and payloads
- [x] T069 [P] Validate response-time expectations for key expense flows against SC-001, SC-002, and SC-005
- [x] T070 Update quickstart.md with actual curl examples from contracts
- [x] T071 Run validation of all quickstart.md examples

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for category reference
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 for category reference
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Depends on US1 for category reference
- **User Story 5 (P5)**: Can start after US4 completion - Adds recurring expense update/version-history behavior
- **User Story 6 (P6)**: Can start after US2, US3, US4 completion - Queries all expense types

### Within Each User Story

- Tests must be written before or alongside implementation and must cover domain and use-case behavior
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel only when their stated dependencies are satisfied
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all use cases for User Story 1 together:
Task: "Create create-expense-category.use-case.ts in src/domain/use-cases/expense-category/"
Task: "Create get-expense-category.use-case.ts in src/domain/use-cases/expense-category/"
Task: "Create list-expense-categories.use-case.ts in src/domain/use-cases/expense-category/"
Task: "Create update-expense-category.use-case.ts in src/domain/use-cases/expense-category/"
Task: "Create delete-expense-category.use-case.ts in src/domain/use-cases/expense-category/"

# Launch all supporting files together:
Task: "Create expense-category.dto.ts in src/application/dtos/"
Task: "Create expense-category.service.ts in src/application/services/"
Task: "Create expense-category.controller.ts in src/presentation/controllers/"
Task: "Create expense-category.routes.ts in src/presentation/routes/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add User Story 6 → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Categories)
   - Developer B: User Story 2 (One-time expenses)
   - Developer C: User Story 3 (Installment expenses)
3. Stories complete and integrate independently
4. Developer A continues with User Story 4 (Recurring expenses)
5. Developer B continues with User Story 5 (Versioning)
6. Developer C continues with User Story 6 (Consolidated query)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Focus on cents arithmetic for installment calculations (FR-025)
- Ensure case-insensitive category uniqueness via nameLower column
- Maintain temporal eligibility rules (no past month creation/editing)
- Preserve recurring expense history through versioning
