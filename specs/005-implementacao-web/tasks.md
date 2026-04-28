---
description: "Task list for web interface implementation"
---

# Tasks: Implementação da Interface Web

**Input**: Design documents from `/specs/005-implementacao-web/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-components.md

**Tests**: Tests are NOT explicitly requested in the specification. Focus on implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `web/` at repository root
- All paths relative to `web/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create web/ directory and initialize Next.js 15 project with TypeScript
- [x] T002 Install core dependencies: next@15, react@18, typescript, tailwindcss, @tanstack/react-query@5, react-hook-form, zod, axios
- [x] T003 [P] Configure TypeScript strict mode in web/tsconfig.json
- [x] T004 [P] Configure Tailwind CSS with design tokens in web/tailwind.config.js
- [x] T005 [P] Configure Next.js in web/next.config.js
- [x] T006 [P] Setup ESLint and Prettier in web/.eslintrc.json
- [x] T007 [P] Configure Vitest for testing in web/vitest.config.ts
- [x] T008 Create web/.env.example with NEXT_PUBLIC_API_URL placeholder
- [x] T009 Create web/.env.local with development API URL (http://localhost:3000)
- [x] T010 Create base directory structure: app/, features/, shared/, infra/, public/
- [x] T010b Setup shadcn/ui CLI and configure component directory in web/components/ui

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 [P] Implement API client adapter in web/infra/api-client.ts with axios, interceptors, and error handling
- [x] T012 [P] Implement router adapter in web/infra/router-adapter.ts abstracting Next.js navigation
- [x] T013 [P] Implement storage adapter in web/infra/storage-adapter.ts abstracting localStorage
- [x] T014 [P] Configure React Query client in web/infra/query-client.ts with staleTime 30s, cacheTime 5min
- [x] T015 [P] Create formatCurrency utility in web/shared/lib/formatCurrency.ts (R$ 1.234,56)
- [x] T016 [P] Create date utilities in web/shared/lib/dateUtils.ts (month navigation, formatting)
- [x] T017 [P] Create useDebounce hook in web/shared/hooks/useDebounce.ts (500ms)
- [x] T018 [P] Create useToast hook in web/shared/hooks/useToast.ts for notifications
- [x] T019 [P] Create useMediaQuery hook in web/shared/hooks/useMediaQuery.ts (768px breakpoint)
- [x] T020 [P] Create common types in web/shared/types/index.ts (ApiResponse, ApiError, LoadingState)
- [x] T021 [P] Implement Button component in web/shared/components/Button.tsx
- [x] T022 [P] Implement Input component in web/shared/components/Input.tsx
- [x] T023 [P] Implement Select component in web/shared/components/Select.tsx
- [x] T024 [P] Implement Modal component in web/shared/components/Modal.tsx
- [x] T025 [P] Implement Toast component in web/shared/components/Toast.tsx
- [x] T026 [P] Implement Skeleton component in web/shared/components/Skeleton.tsx
- [x] T027 [P] Implement EmptyState component in web/shared/components/EmptyState.tsx
- [x] T028 [P] Implement ConfirmDialog component in web/shared/components/ConfirmDialog.tsx
- [x] T029 Create root layout in web/app/layout.tsx with React Query provider and font setup
- [x] T030 Create landing page in web/app/page.tsx with redirect logic

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - User Authentication and Onboarding (Priority: P1) 🎯 MVP

**Goal**: Enable users to register, receive a user ID, and login to access the system

**Independent Test**: Create a new account, copy the user ID, login with it, verify session persists after browser close/reopen

### Implementation for User Story 1

- [x] T031 [P] [US1] Create User type in web/features/auth/types/index.ts
- [x] T032 [P] [US1] Create AuthState type in web/features/auth/types/index.ts
- [x] T033 [P] [US1] Create Zod schemas for register and login in web/features/auth/types/schemas.ts
- [x] T034 [P] [US1] Implement AuthService in web/features/auth/services/AuthService.ts (register, getUserById)
- [x] T035 [US1] Implement useAuth hook in web/features/auth/hooks/useAuth.ts (login, logout, session management)
- [x] T036 [US1] Implement useRegister hook in web/features/auth/hooks/useRegister.ts (register mutation)
- [x] T037 [P] [US1] Create RegisterForm component in web/features/auth/components/RegisterForm.tsx
- [x] T038 [P] [US1] Create LoginForm component in web/features/auth/components/LoginForm.tsx
- [x] T039 [US1] Create register page in web/app/(auth)/cadastro/page.tsx
- [x] T040 [US1] Create login page in web/app/(auth)/login/page.tsx
- [x] T041 [US1] Create auth middleware/guard for protected routes

**Checkpoint**: At this point, User Story 1 should be fully functional - users can register, login, and maintain session

---

## Phase 4: User Story 2 - Financial Dashboard Overview (Priority: P1) 🎯 MVP

**Goal**: Display monthly financial summary with KPIs, semester chart, and expense breakdown

**Independent Test**: Login and view dashboard showing current month data with navigation between months

### Implementation for User Story 2

- [x] T042 [P] [US2] Create MonthCompetence type in web/features/dashboard/types/index.ts
- [x] T043 [P] [US2] Create KpiData type in web/features/dashboard/types/index.ts
- [x] T044 [P] [US2] Create SemesterChartData type in web/features/dashboard/types/index.ts
- [x] T045 [P] [US2] Create ExpenseBreakdown type in web/features/dashboard/types/index.ts
- [x] T046 [P] [US2] Create DashboardData type in web/features/dashboard/types/index.ts
- [x] T047 [P] [US2] Implement DashboardService in web/features/dashboard/services/DashboardService.ts
- [x] T048 [US2] Implement useDashboard hook in web/features/dashboard/hooks/useDashboard.ts
- [x] T049 [US2] Implement useMonthNavigation hook in web/features/dashboard/hooks/useMonthNavigation.ts
- [x] T050 [P] [US2] Create MonthNavigator component in web/shared/components/MonthNavigator.tsx
- [x] T051 [P] [US2] Create KpiCard component in web/features/dashboard/components/KpiCard.tsx
- [x] T052 [P] [US2] Create SemesterChart component in web/features/dashboard/components/SemesterChart.tsx
- [x] T053 [P] [US2] Create ExpenseBreakdown component in web/features/dashboard/components/ExpenseBreakdown.tsx
- [x] T054 [P] [US2] Create Sidebar component in web/shared/components/Sidebar.tsx
- [x] T055 [P] [US2] Create BottomNav component in web/shared/components/BottomNav.tsx
- [x] T056 [US2] Create AppShell component in web/shared/components/AppShell.tsx (integrates sidebar + bottom nav)
- [x] T057 [US2] Create authenticated layout in web/app/(app)/layout.tsx with AppShell
- [x] T058 [US2] Create dashboard page in web/app/(app)/dashboard/page.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can login and view their dashboard

---

## Phase 5: User Story 8 - Expense Category Management (Priority: P2)

**Goal**: Enable creation, editing, and deletion of expense categories with protection for linked categories

**Independent Test**: Create categories, link one to an expense, verify deletion protection, delete unused category

### Implementation for User Story 8

- [x] T059 [P] [US8] Create Category type in web/features/categorias/types/index.ts
- [x] T060 [P] [US8] Create CategoryWithCount type in web/features/categorias/types/index.ts
- [x] T061 [P] [US8] Create Zod schema for category in web/features/categorias/types/schemas.ts
- [x] T062 [P] [US8] Implement CategoriasService in web/features/categorias/services/CategoriasService.ts
- [x] T063 [US8] Implement useCategories hook in web/features/categorias/hooks/useCategories.ts
- [x] T064 [P] [US8] Create CategoryCard component in web/features/categorias/components/CategoryCard.tsx
- [x] T065 [P] [US8] Create CategoryForm component in web/features/categorias/components/CategoryForm.tsx
- [x] T066 [P] [US8] Create DeleteWarningModal component in web/features/categorias/components/DeleteWarningModal.tsx
- [x] T067 [US8] Create categories page in web/app/(app)/categorias/page.tsx

**Checkpoint**: Categories feature complete - required for expense management in next phases

---

## Phase 6: User Story 3 - One-Time Revenue Management (Priority: P2)

**Goal**: Enable CRUD operations for one-time revenues with month filtering

**Independent Test**: Create a one-time revenue, edit it, filter by month, delete it

### Implementation for User Story 3

- [x] T068 [P] [US3] Create OneTimeRevenue type in web/features/receitas/types/index.ts
- [x] T069 [P] [US3] Create RevenueListItem type in web/features/receitas/types/index.ts
- [x] T070 [P] [US3] Create Zod schema for one-time revenue in web/features/receitas/types/schemas.ts
- [x] T071 [P] [US3] Implement ReceitasService.getOneTime in web/features/receitas/services/ReceitasService.ts
- [x] T072 [P] [US3] Implement ReceitasService.create in web/features/receitas/services/ReceitasService.ts
- [x] T073 [P] [US3] Implement ReceitasService.update in web/features/receitas/services/ReceitasService.ts
- [x] T074 [P] [US3] Implement ReceitasService.delete in web/features/receitas/services/ReceitasService.ts
- [x] T075 [US3] Implement useOneTimeRevenues hook in web/features/receitas/hooks/useOneTimeRevenues.ts
- [x] T076 [P] [US3] Create DataTable component in web/shared/components/DataTable.tsx
- [x] T077 [P] [US3] Create OneTimeRevenueForm component in web/features/receitas/components/OneTimeRevenueForm.tsx
- [x] T078 [US3] Create receitas page in web/app/(app)/receitas/page.tsx with one-time revenue management

**Checkpoint**: One-time revenue management complete and independently testable

---

## Phase 7: User Story 4 - Fixed Revenue Management with Versioning (Priority: P2)

**Goal**: Enable creation and management of fixed revenues with versioning support

**Independent Test**: Create fixed revenue, add new version (if alterable), view history, terminate early

### Implementation for User Story 4

- [x] T079 [P] [US4] Create FixedRevenue type in web/features/receitas/types/index.ts
- [x] T080 [P] [US4] Create FixedRevenueVersion type in web/features/receitas/types/index.ts
- [x] T081 [P] [US4] Create RevenueModality type in web/features/receitas/types/index.ts
- [x] T082 [P] [US4] Create Zod schemas for fixed revenue in web/features/receitas/types/schemas.ts
- [x] T083 [P] [US4] Implement ReceitasService.getFixed in web/features/receitas/services/ReceitasService.ts
- [x] T084 [P] [US4] Implement ReceitasService.createFixed in web/features/receitas/services/ReceitasService.ts
- [x] T085 [P] [US4] Implement ReceitasService.addVersion in web/features/receitas/services/ReceitasService.ts
- [x] T086 [P] [US4] Implement ReceitasService.terminate in web/features/receitas/services/ReceitasService.ts
- [x] T087 [US4] Implement useFixedRevenues hook in web/features/receitas/hooks/useFixedRevenues.ts
- [x] T088 [P] [US4] Create FixedRevenueCard component in web/features/receitas/components/FixedRevenueCard.tsx
- [x] T089 [P] [US4] Create FixedRevenueForm component in web/features/receitas/components/FixedRevenueForm.tsx
- [x] T090 [P] [US4] Create VersionHistoryModal component in web/features/receitas/components/VersionHistoryModal.tsx
- [x] T091 [US4] Update receitas page in web/app/(app)/receitas/page.tsx to include fixed revenue management

**Checkpoint**: Fixed revenue management complete with versioning support

---

## Phase 8: User Story 5 - One-Time Expense Management (Priority: P2)

**Goal**: Enable CRUD operations for one-time expenses with category assignment

**Independent Test**: Create one-time expense with category, edit it, filter by month, delete it

### Implementation for User Story 5

- [x] T092 [P] [US5] Create OneTimeExpense type in web/features/despesas/types/index.ts
- [x] T093 [P] [US5] Create ExpenseListItem type in web/features/despesas/types/index.ts
- [x] T094 [P] [US5] Create Zod schema for one-time expense in web/features/despesas/types/schemas.ts
- [x] T095 [P] [US5] Implement DespesasService.getOneTime in web/features/despesas/services/DespesasService.ts
- [x] T096 [P] [US5] Implement DespesasService.create in web/features/despesas/services/DespesasService.ts
- [x] T097 [P] [US5] Implement DespesasService.update in web/features/despesas/services/DespesasService.ts
- [x] T098 [P] [US5] Implement DespesasService.delete in web/features/despesas/services/DespesasService.ts
- [x] T099 [US5] Implement useOneTimeExpenses hook in web/features/despesas/hooks/useOneTimeExpenses.ts
- [x] T100 [P] [US5] Create OneTimeExpenseForm component in web/features/despesas/components/OneTimeExpenseForm.tsx
- [x] T101 [US5] Create despesas page in web/app/(app)/despesas/page.tsx with one-time expense management

**Checkpoint**: One-time expense management complete and independently testable

---

## Phase 9: User Story 6 - Installment Expense Management (Priority: P3)

**Goal**: Enable creation and management of installment expenses with automatic parcel generation

**Independent Test**: Create installment expense, view installments modal, terminate early

### Implementation for User Story 6

- [x] T102 [P] [US6] Create InstallmentExpense type in web/features/despesas/types/index.ts
- [x] T103 [P] [US6] Create Installment type in web/features/despesas/types/index.ts
- [x] T104 [P] [US6] Create Zod schema for installment expense in web/features/despesas/types/schemas.ts
- [x] T105 [P] [US6] Implement DespesasService.getInstallments in web/features/despesas/services/DespesasService.ts
- [x] T106 [P] [US6] Implement DespesasService.createInstallment in web/features/despesas/services/DespesasService.ts
- [x] T107 [P] [US6] Implement DespesasService.terminateInstallment in web/features/despesas/services/DespesasService.ts
- [x] T108 [P] [US6] Implement DespesasService.deleteInstallment in web/features/despesas/services/DespesasService.ts
- [x] T109 [US6] Implement useInstallments hook in web/features/despesas/hooks/useInstallments.ts
- [x] T110 [P] [US6] Create InstallmentCard component in web/features/despesas/components/InstallmentCard.tsx
- [x] T111 [P] [US6] Create InstallmentForm component in web/features/despesas/components/InstallmentForm.tsx
- [x] T112 [P] [US6] Create InstallmentModal component in web/features/despesas/components/InstallmentModal.tsx
- [x] T113 [US6] Update despesas page in web/app/(app)/despesas/page.tsx to include installment management

**Checkpoint**: Installment expense management complete with automatic parcel generation

---

## Phase 10: User Story 7 - Recurring Expense Management with Versioning (Priority: P3)

**Goal**: Enable creation and management of recurring expenses with versioning support

**Independent Test**: Create recurring expense, add new version, view history, terminate early

### Implementation for User Story 7

- [x] T114 [P] [US7] Create RecurringExpense type in web/features/despesas/types/index.ts
- [x] T115 [P] [US7] Create RecurringExpenseVersion type in web/features/despesas/types/index.ts
- [x] T116 [P] [US7] Create Zod schemas for recurring expense in web/features/despesas/types/schemas.ts
- [x] T117 [P] [US7] Implement DespesasService.getRecurring in web/features/despesas/services/DespesasService.ts
- [x] T118 [P] [US7] Implement DespesasService.createRecurring in web/features/despesas/services/DespesasService.ts
- [x] T119 [P] [US7] Implement DespesasService.addRecurringVersion in web/features/despesas/services/DespesasService.ts
- [x] T120 [P] [US7] Implement DespesasService.terminateRecurring in web/features/despesas/services/DespesasService.ts
- [x] T121 [US7] Implement useRecurringExpenses hook in web/features/despesas/hooks/useRecurringExpenses.ts
- [x] T122 [P] [US7] Create RecurringExpenseCard component in web/features/despesas/components/RecurringExpenseCard.tsx
- [x] T123 [P] [US7] Create RecurringExpenseForm component in web/features/despesas/components/RecurringExpenseForm.tsx
- [x] T124 [US7] Update despesas page in web/app/(app)/despesas/page.tsx to include recurring expense management

**Checkpoint**: Recurring expense management complete with versioning support

---

## Phase 11: User Story 9 - Version History Timeline (Priority: P3)

**Goal**: Display comprehensive history of all versions with filtering

**Independent Test**: View history timeline with all versions, apply filters for revenues/expenses only

### Implementation for User Story 9

- [x] T125 [P] [US9] Create VersionHistoryEntry type in web/features/historico/types/index.ts
- [x] T126 [P] [US9] Create VersionHistoryGroup type in web/features/historico/types/index.ts
- [x] T127 [P] [US9] Implement HistoricoService in web/features/historico/services/HistoricoService.ts
- [x] T128 [US9] Implement useVersionHistory hook in web/features/historico/hooks/useVersionHistory.ts
- [x] T129 [P] [US9] Create VersionTimeline component in web/features/historico/components/VersionTimeline.tsx
- [x] T130 [P] [US9] Create VersionCard component in web/features/historico/components/VersionCard.tsx
- [x] T131 [P] [US9] Create FilterBar component in web/features/historico/components/FilterBar.tsx
- [x] T132 [US9] Create historico page in web/app/(app)/historico/page.tsx

**Checkpoint**: Version history feature complete with filtering capabilities

---

## Phase 12: User Story 10 - Responsive Mobile Experience (Priority: P2)

**Goal**: Ensure all features work seamlessly on mobile devices with optimized UI

**Independent Test**: Access application on mobile device, verify bottom nav, hamburger menu, and horizontal scrolling tables

### Implementation for User Story 10

- [x] T133 [P] [US10] Add responsive styles to AppShell component in web/shared/components/AppShell.tsx
- [x] T134 [P] [US10] Add responsive styles to Sidebar component in web/shared/components/Sidebar.tsx
- [x] T135 [P] [US10] Add responsive styles to BottomNav component in web/shared/components/BottomNav.tsx
- [x] T136 [P] [US10] Add responsive styles to DataTable component in web/shared/components/DataTable.tsx (horizontal scroll)
- [x] T137 [P] [US10] Add responsive styles to dashboard page in web/app/(app)/dashboard/page.tsx
- [x] T138 [P] [US10] Add responsive styles to receitas page in web/app/(app)/receitas/page.tsx
- [x] T139 [P] [US10] Add responsive styles to despesas page in web/app/(app)/despesas/page.tsx
- [x] T140 [P] [US10] Add responsive styles to categorias page in web/app/(app)/categorias/page.tsx
- [x] T141 [P] [US10] Add responsive styles to historico page in web/app/(app)/historico/page.tsx
- [x] T142 [US10] Test all features on mobile viewport (≤768px) and verify functionality

**Checkpoint**: All features now work seamlessly on both desktop and mobile devices

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T143 [P] Add Plus Jakarta Sans font files to web/public/fonts/ (verify OFL license compliance)
- [x] T144 [P] Add empty state illustrations to web/public/images/
- [x] T145 [P] Create type guards in web/shared/lib/type-guards.ts
- [x] T146 [P] Add error boundary components for graceful error handling
- [x] T147 [P] Add loading states and skeleton screens to all pages
- [x] T148 [P] Add empty states to all list views
- [x] T149 [P] Implement optimistic updates for all mutations
- [x] T150 [P] Add accessibility attributes (aria-labels, roles) to all interactive components
- [x] T151 [P] Add keyboard navigation support (Tab, Enter, Escape) to all modals and forms
- [x] T152 Code cleanup and refactoring across all features
- [x] T153 Performance optimization: lazy load heavy components
- [x] T154 Security review: validate all user inputs, sanitize data
- [x] T155 Update web/README.md with setup and development instructions
- [x] T156 Run quickstart.md validation to ensure all setup steps work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-12)**: All depend on Foundational phase completion
  - US1 (Auth) - No dependencies on other stories
  - US2 (Dashboard) - Depends on US1 (needs auth)
  - US8 (Categories) - Can start after Foundational (independent)
  - US3 (One-Time Revenues) - Depends on US1 (needs auth)
  - US4 (Fixed Revenues) - Depends on US3 (shares UI patterns)
  - US5 (One-Time Expenses) - Depends on US1, US8 (needs auth + categories)
  - US6 (Installment Expenses) - Depends on US5 (shares UI patterns)
  - US7 (Recurring Expenses) - Depends on US5 (shares UI patterns)
  - US9 (History) - Depends on US4, US7 (needs versioned items)
  - US10 (Responsive) - Can be done incrementally or at end
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (authentication required)
- **User Story 8 (P2)**: Can start after Foundational - Independent (but needed for expenses)
- **User Story 3 (P2)**: Depends on US1 (authentication required)
- **User Story 4 (P2)**: Depends on US3 (shares patterns and components)
- **User Story 5 (P2)**: Depends on US1, US8 (authentication + categories required)
- **User Story 6 (P3)**: Depends on US5 (shares expense patterns)
- **User Story 7 (P3)**: Depends on US5 (shares expense patterns)
- **User Story 9 (P3)**: Depends on US4, US7 (needs versioned items to display)
- **User Story 10 (P2)**: Can be done incrementally with each story or at end

### Within Each User Story

- Types before services
- Services before hooks
- Hooks before components
- Components before pages
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Within each user story, tasks marked [P] can run in parallel
- US8 (Categories) can be developed in parallel with US3 (One-Time Revenues)
- US6 and US7 can be developed in parallel (both depend on US5)

---

## Parallel Example: User Story 1 (Authentication)

```bash
# Launch all types together:
Task T031: "Create User type in web/features/auth/types/index.ts"
Task T032: "Create AuthState type in web/features/auth/types/index.ts"
Task T033: "Create Zod schemas in web/features/auth/types/schemas.ts"

# Launch all service methods together:
Task T034: "Implement AuthService in web/features/auth/services/AuthService.ts"

# Launch all components together (after hooks complete):
Task T037: "Create RegisterForm in web/features/auth/components/RegisterForm.tsx"
Task T038: "Create LoginForm in web/features/auth/components/LoginForm.tsx"
```

---

## Parallel Example: User Story 2 (Dashboard)

```bash
# Launch all types together:
Task T042-T046: All dashboard types can be created in parallel

# Launch all components together (after hooks complete):
Task T051: "Create KpiCard component"
Task T052: "Create SemesterChart component"
Task T053: "Create ExpenseBreakdown component"
Task T054: "Create Sidebar component"
Task T055: "Create BottomNav component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Authentication)
4. Complete Phase 4: User Story 2 (Dashboard)
5. **STOP and VALIDATE**: Test authentication and dashboard independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Auth) → Test independently → Deploy/Demo
3. Add US2 (Dashboard) → Test independently → Deploy/Demo (MVP!)
4. Add US8 (Categories) + US3 (One-Time Revenues) in parallel → Test → Deploy
5. Add US4 (Fixed Revenues) → Test → Deploy
6. Add US5 (One-Time Expenses) → Test → Deploy
7. Add US6 + US7 (Installment + Recurring Expenses) in parallel → Test → Deploy
8. Add US9 (History) → Test → Deploy
9. Add US10 (Responsive) → Test → Deploy
10. Polish (Phase 13) → Final validation → Production deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Auth) → US3 (One-Time Revenues) → US4 (Fixed Revenues)
   - Developer B: US2 (Dashboard) → US8 (Categories) → US5 (One-Time Expenses)
   - Developer C: Foundational components → US6 (Installments) → US7 (Recurring)
3. Developer D (or A/B/C): US9 (History) → US10 (Responsive) → Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on MVP (US1 + US2) first for fastest time to value
- Categories (US8) should be done early to unblock expense management
- Responsive design (US10) can be done incrementally or at the end
- Tests are not included as they were not explicitly requested in the specification

---

## Summary

- **Total Tasks**: 157
- **Setup Tasks**: 11
- **Foundational Tasks**: 20 (blocking)
- **User Story Tasks**: 113
  - US1 (Auth): 11 tasks
  - US2 (Dashboard): 17 tasks
  - US8 (Categories): 9 tasks
  - US3 (One-Time Revenues): 11 tasks
  - US4 (Fixed Revenues): 13 tasks
  - US5 (One-Time Expenses): 10 tasks
  - US6 (Installment Expenses): 12 tasks
  - US7 (Recurring Expenses): 11 tasks
  - US9 (History): 8 tasks
  - US10 (Responsive): 10 tasks
- **Polish Tasks**: 13
- **Parallel Opportunities**: 89 tasks marked [P]
- **Suggested MVP Scope**: US1 (Auth) + US2 (Dashboard) = 28 tasks after foundational
