# Implementation Plan: Implementação da Interface Web

**Branch**: `005-implementacao-web` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-implementacao-web/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar interface web completa em Next.js 15 (App Router) para o sistema de gestão financeira Smaug, replicando 100% do design do protótipo HTML fornecido e integrando com a API REST existente. A aplicação incluirá autenticação, dashboard com visualizações financeiras, gestão completa de receitas (avulsas e fixas com versionamento), despesas (avulsas, parceladas e recorrentes), categorias e histórico de versões, com suporte responsivo para desktop e mobile.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router), React 18+, TanStack Query v5, React Hook Form, Zod, Tailwind CSS, Shadcn/ui  
**Storage**: Browser localStorage (user session), API REST (backend já existente)  
**Testing**: Vitest (unit tests para hooks e lógica de negócio)  
**Target Platform**: Web browsers (desktop >768px e mobile ≤768px)  
**Project Type**: Web application (frontend SPA com SSR/RSC via Next.js)  
**Performance Goals**: Dashboard carrega em <2s, navegação entre meses em <1s, validação de formulários em <100ms  
**Constraints**: 100% fidelidade visual ao protótipo HTML, React Query stale time 30s / cache time 5min, validação com debounce 500ms  
**Scale/Scope**: ~10 telas principais (login, cadastro, dashboard, 2 páginas de receitas, 3 de despesas, categorias, histórico), ~15-20 componentes reutilizáveis

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Frontend Principles (Constitution v1.1.0)

#### ✅ I. Arquitetura Orientada a Domínio

- **Status**: PASS
- **Evidence**: Estrutura organizada por features (auth, dashboard, receitas, despesas, categorias, historico) com components/hooks/services/types internos a cada feature
- **Compliance**: Cada domínio terá sua própria pasta em `/features` com subpastas dedicadas

#### ✅ II. Separação entre UI e Lógica

- **Status**: PASS
- **Evidence**:
  - Componentes presentacionais (ex: KpiCard, MonthNavigator, DataTable)
  - Hooks de negócio (ex: useReceitas, useDespesas, useAuth)
  - Services para API (ex: ReceitasService, DespesasService)
- **Compliance**: Nenhuma lógica de negócio em JSX, APIs não acessadas diretamente em componentes

#### ✅ III. Independência de Framework

- **Status**: PASS
- **Evidence**:
  - Adapters planejados para routing (`/infra/router-adapter.ts`)
  - Adapters para storage (`/infra/storage-adapter.ts`)
  - Adapters para API client (`/infra/api-client.ts`)
- **Compliance**: Hooks de negócio não usarão `useRouter` ou `useSearchParams` diretamente

#### ✅ IV. Baixo Acoplamento entre Features

- **Status**: PASS
- **Evidence**: Features isoladas, compartilhamento apenas via `/shared` (UI components) e `/infra` (adapters)
- **Compliance**: Nenhuma importação direta entre features (ex: receitas não importa de despesas)

#### ✅ V. Sustentabilidade e Simplicidade

- **Status**: PASS
- **Evidence**:
  - YAGNI aplicado (sem abstrações prematuras)
  - Convenções: hooks → `useX`, services → `XService`, types → `XType`
  - Sem código morto ou comentado
- **Compliance**: Implementação incremental por prioridade (P1 → P2 → P3)

#### ✅ Architecture / Camadas

- **Status**: PASS
- **Evidence**: Fluxo unidirecional UI → Hooks → Services → Infra
- **Compliance**:
  - Server Components por padrão
  - `"use client"` apenas quando necessário (interatividade, estado, efeitos)
  - Estrutura: `/app` (rotas) + `/features` (domínios) + `/shared` (reutilizável) + `/infra` (adapters)

### Summary

**Overall Status**: ✅ PASS - Todos os princípios da constituição frontend serão respeitados

## Project Structure

### Documentation (this feature)

```text
specs/005-implementacao-web/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── ui-components.md # Contratos de componentes reutilizáveis
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
web/                      # Frontend Next.js 15 (App Router)
├── app/                  # Next.js App Router (rotas, layouts, pages)
│   ├── (auth)/           # Grupo de rotas de autenticação
│   │   ├── cadastro/
│   │   │   └── page.tsx
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/            # Grupo de rotas autenticadas
│   │   ├── layout.tsx    # Shell com sidebar + mobile nav
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── receitas/
│   │   │   └── page.tsx
│   │   ├── despesas/
│   │   │   └── page.tsx
│   │   ├── categorias/
│   │   │   └── page.tsx
│   │   └── historico/
│   │       └── page.tsx
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page (redirect)
│
├── features/             # Módulos organizados por domínio
│   ├── auth/
│   │   ├── components/   # LoginForm, RegisterForm
│   │   ├── hooks/        # useAuth, useRegister
│   │   ├── services/     # AuthService
│   │   └── types/        # User, AuthState
│   ├── dashboard/
│   │   ├── components/   # KpiCard, SemesterChart, ExpenseBreakdown
│   │   ├── hooks/        # useDashboard, useMonthNavigation
│   │   ├── services/     # DashboardService
│   │   └── types/        # DashboardData, MonthData
│   ├── receitas/
│   │   ├── components/   # OneTimeRevenueForm, FixedRevenueCard, VersionHistoryModal
│   │   ├── hooks/        # useOneTimeRevenues, useFixedRevenues
│   │   ├── services/     # ReceitasService
│   │   └── types/        # OneTimeRevenue, FixedRevenue, RevenueVersion
│   ├── despesas/
│   │   ├── components/   # OneTimeExpenseForm, InstallmentCard, RecurringExpenseCard
│   │   ├── hooks/        # useOneTimeExpenses, useInstallments, useRecurringExpenses
│   │   ├── services/     # DespesasService
│   │   └── types/        # OneTimeExpense, InstallmentExpense, RecurringExpense
│   ├── categorias/
│   │   ├── components/   # CategoryCard, CategoryForm, DeleteWarningModal
│   │   ├── hooks/        # useCategories
│   │   ├── services/     # CategoriasService
│   │   └── types/        # Category
│   └── historico/
│       ├── components/   # VersionTimeline, VersionCard, FilterBar
│       ├── hooks/        # useVersionHistory
│       ├── services/     # HistoricoService
│       └── types/        # VersionHistoryEntry
│
├── shared/               # UI reutilizável, utilitários, tipos comuns
│   ├── components/       # MonthNavigator, DataTable, AppShell, Toast, Skeleton, EmptyState
│   ├── hooks/            # useDebounce, useToast, useMediaQuery
│   ├── lib/              # formatCurrency, dateUtils, validators
│   └── types/            # CommonTypes, ApiResponse
│
├── infra/                # Adapters externos
│   ├── api-client.ts     # Axios/fetch wrapper com interceptors
│   ├── router-adapter.ts # Abstração de useRouter/useSearchParams
│   ├── storage-adapter.ts# Abstração de localStorage
│   └── query-client.ts   # Configuração React Query
│
├── public/               # Assets estáticos
│   ├── fonts/            # Plus Jakarta Sans
│   └── images/           # Ilustrações para empty states
│
├── .env.example
├── .env.local            # Variáveis de ambiente (desenvolvimento)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── vitest.config.ts
```

**Structure Decision**: Estrutura de Web Application (frontend only) seguindo a arquitetura orientada a domínio da constituição v1.1.0. O backend já existe e será consumido via API REST. A organização por features facilita manutenção, isolamento de mudanças e evolução independente de cada domínio funcional.

---

## Performance Budget

### Load Time Targets (from spec.md Success Criteria)

- **SC-002**: Dashboard load time < 2 seconds after login
- **SC-004**: Month navigation < 1 second
- **SC-006**: Form validation display < 100ms (after 500ms debounce)

### Bundle Size Limits

- **Initial Bundle**: < 500 KB (gzipped)
- **Route Chunks**: < 200 KB each (gzipped)
- **Total JavaScript**: < 1 MB (gzipped)

### Core Web Vitals

- **First Contentful Paint (FCP)**: < 1.0s
- **Largest Contentful Paint (LCP)**: < 2.0s
- **Time to Interactive (TTI)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### Optimization Strategies

- Server Components by default (reduce client JS)
- Code splitting per route (Next.js automatic)
- Lazy loading for heavy components (charts, modals)
- React Query caching (stale time 30s, cache time 5min)
- Image optimization via next/image
- Font optimization (Plus Jakarta Sans subset)

### Validation

Performance targets will be validated during Phase 13 (Polish) task T153. Use Lighthouse CI or similar tools to measure and enforce budgets.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - Nenhuma violação identificada. Todos os princípios da constituição serão respeitados.

---

## Phase 1 Complete - Constitution Re-Check

_Re-evaluation after data model and contracts design_

### Frontend Principles (Constitution v1.1.0) - POST-DESIGN

#### ✅ I. Arquitetura Orientada a Domínio

- **Status**: PASS
- **Evidence**: Data model organizado por 7 domínios (Auth, Dashboard, Receitas, Despesas, Categorias, Histórico, Common). Cada feature terá types, hooks, services, components isolados.
- **Validation**: `data-model.md` confirma separação clara por domínio funcional

#### ✅ II. Separação entre UI e Lógica

- **Status**: PASS
- **Evidence**:
  - Types definidos em `data-model.md` (25+ interfaces)
  - Contracts de componentes em `contracts/ui-components.md` (25+ componentes)
  - Separação clara: Components (UI) ← Hooks (lógica) ← Services (API)
- **Validation**: Nenhum componente acessa API diretamente, toda lógica em hooks

#### ✅ III. Independência de Framework

- **Status**: PASS
- **Evidence**:
  - Adapters definidos em `research.md`: RouterAdapter, StorageAdapter, ApiClient
  - Types são framework-agnostic (apenas TypeScript nativo)
- **Validation**: Hooks de negócio não dependem de Next.js APIs

#### ✅ IV. Baixo Acoplamento entre Features

- **Status**: PASS
- **Evidence**:
  - Cada domínio tem seus próprios types (Auth, Dashboard, Receitas, etc.)
  - Compartilhamento apenas via Common types e shared components
- **Validation**: Nenhuma importação cruzada entre features no data model

#### ✅ V. Sustentabilidade e Simplicidade

- **Status**: PASS
- **Evidence**:
  - YAGNI aplicado: sem abstrações prematuras
  - Convenções seguidas: interfaces nomeadas semanticamente
  - Type guards para type narrowing seguro
- **Validation**: Data model é direto, sem over-engineering

#### ✅ Architecture / Camadas

- **Status**: PASS
- **Evidence**: Fluxo de dados definido em `data-model.md`: API → Services → React Query → Hooks → Components
- **Validation**: Camadas respeitam dependência unidirecional

### Summary

**Overall Status**: ✅ PASS - Design confirma aderência total aos princípios da constituição. Pronto para Phase 2 (tasks).
