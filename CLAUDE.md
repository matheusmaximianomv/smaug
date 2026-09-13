# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smaug is a personal financial management system (Sistema de Gestão Financeira Pessoal): a multi-package monorepo — **not** npm workspaces: `server/` (Express REST API), `web/` (Next.js frontend) and `e2e/` (Playwright) each have their own `package.json`, lockfile and `node_modules`, which is why `npm run install:all` exists. Code identifiers and API payloads are in English; specs, docs, commit messages and UI copy are in Portuguese.

## Commands

Run from the repo root unless noted.

```bash
npm run install:all      # root + server + web + e2e deps (must be run once; four separate lockfiles)
npm run dev              # server (port 3000) + web (port 3001) together
npm run dev:server       # API only (tsx watch)
npm run dev:web          # Next.js only

npm run test             # server then web
npm run --prefix server test              # vitest run (unit + integration)
npm run --prefix server test:unit
npm run --prefix server test:integration
npx vitest run tests/unit/domain/entities/user.entity.test.ts --root server   # single file
npm run --prefix web test                 # vitest run (one-shot)
npm run --prefix web test:watch
npm run --prefix web test:coverage
npm run test:e2e                          # Playwright: cria um SQLite exclusivo do run, roda, descarta
npm run e2e:install-browsers              # uma vez por máquina

npm run build            # tsup (server) then next build (web)
npm run lint             # eslint (server) + next lint (web)
npm run format           # prettier across the repo
npm run --prefix server typecheck
npm run validate:deps    # dependency-cruiser architecture rules — run from ROOT only
```

`npm run --prefix server validate:deps` is broken: it points at a `server/.dependency-cruiser.cjs` that does not exist. Use the root script, which validates both packages.

Husky + lint-staged run `eslint --fix` on `*.{ts,tsx,js}` and `prettier --write` on `*.{json,md,yml,yaml,css,scss,html}` at commit time.

### Prisma

```bash
npm run --prefix server prisma:generate   # runs prisma:prepare, then prisma generate
DATABASE_PROVIDER=postgresql npm run --prefix server prisma:generate
```

`scripts/prisma-prepare.mjs` **rewrites the `datasource` provider inside the tracked `prisma/schema.prisma`** from `$DATABASE_PROVIDER` (defaulting to `postgresql`, and mapping `memory` → `sqlite`). Running it will show up as a diff on `schema.prisma` — expected, but don't commit an accidental provider flip.

## Architecture

### Backend — Clean Architecture (`server/src/`)

```
domain/          entities, value-objects, use-cases, ports (repository interfaces), errors
application/     services (orchestrate use cases), dtos, ports (Logger)
infrastructure/  Prisma repos, Express server, tsyringe container, env (Zod-validated), Pino
presentation/    controllers, routes, middlewares (validation, auth, error, request log)
```

`domain` and `application` must never import `infrastructure` or `presentation` — enforced by `.dependency-cruiser.js` at the root, along with a hard `server/` ⇄ `web/` import ban. Circular deps are warnings.

**Path alias:** `@src/*` → `server/src/*`. `allowImportingTsExtensions` is on, so some imports carry an explicit `.ts` suffix; match whatever the neighbouring file does.

**Domain model.** Entities: `User`, `OneTimeRevenue`, `FixedRevenue` (+ `FixedRevenueVersion`), `ExpenseCategory`, `OneTimeExpense`, `InstallmentExpense` (+ `Installment`), `RecurringExpense` (+ `RecurringExpenseVersion`). The pivot concept is `MonthlyCompetence` (`monthly-competence.value-object.ts`) — an immutable `{month, year}` pair built via `MonthlyCompetence.create()` with comparison helpers (`isPastMonth`, `isBefore`, …). Recurring/fixed items are _versioned_: editing them appends a version row rather than mutating history, so month-scoped queries resolve the version in effect for a given competence.

**DI (`infrastructure/config/container.ts`).** tsyringe with `reflect-metadata`. The container file eagerly wires the whole graph (repository → use cases → service → controller) and both registers instances _and_ exports them as named consts. `presentation/routes/index.ts` imports those consts directly. When adding an entity, extend this file end to end — never `new` a service in a route or controller.

**Persistence.** Each aggregate has a port in `domain/ports/` and a `Prisma*Repository` in `infrastructure/database/repositories/`. A separate generic `RepositoryFactory` (`database.provider.ts`) switches on `DATABASE_PROVIDER`: `memory` yields `InMemoryRepository`, `sqlite`/`postgresql` yield a reflective `PrismaRepository`. Unit tests use in-memory fakes; no DB required.

**HTTP contract.** Routes are mounted at the root (no `/api` prefix): `/health`, `/users`, `/revenues/one-time`, `/revenues/fixed`, `/revenues` (queries), `/expenses/categories`, `/expenses/one-time`, `/expenses/installment`, `/expenses/recurring`, `/expenses` (queries).

**Auth is header-based, not token-based.** There are no passwords or JWTs. `extractUser` (`presentation/middlewares/extract-user.middleware.ts`) reads the `X-User-Id` header, requires a UUID, and 401s / 404s otherwise. It is applied per-route-group in `routes/index.ts`; `/users` and `/health` are open.

**Validation & errors.** Zod schemas live beside the routes and are applied via `validateRequest` / `validateQuery`, which emit `{error: "VALIDATION_ERROR", message, details}` with 400. The terminal `errorHandlerMiddleware` logs via the container's `Logger` and returns a bare 500 — surface intended client-facing failures explicitly in the controller/service instead of throwing.

**Env** (`infrastructure/config/env.ts`) is Zod-parsed at import time and calls `process.exit(1)` on failure: `DATABASE_PROVIDER` (`postgresql|sqlite|memory`), `DATABASE_URL`, `NODE_ENV`, `PORT` (3000), `LOG_LEVEL`, `CORS_ORIGIN` (`http://localhost:3001`).

### Frontend — feature-based (`web/`)

```
app/        App Router: (auth)/{login,cadastro}, (app)/{dashboard,receitas,despesas,categorias,historico}
features/   auth, dashboard, receitas, despesas, categorias, historico
            each owns components/ hooks/ services/ types/
shared/     UI primitives (Button, Modal, DataTable, Toast, MonthNavigator, …), hooks, lib
infra/      api-client, api-error, query-client, router-adapter, session, navigation
middleware.ts
```

**Layering is normative** (see the constitution below): `UI → hooks → services → infra`, one direction only. Components stay presentational; hooks hold business logic and state; services only talk to the outside world. Components must not call `apiClient` directly.

**Cross-feature imports are forbidden.** Share via `@/shared` or `@/infra` only. Aliases: `@/` → `web/`, plus `@/features`, `@/shared`, `@/infra` (declared in both `tsconfig.json` and `vitest.config.ts`).

**Next.js APIs are wrapped.** Business hooks must not call `useRouter`/`useSearchParams` from `next/navigation` directly — go through `infra/router-adapter.ts`. Likewise the session goes through `infra/session.ts` (`getUserId`/`setUserId`/`clearUserId`), where **the `userId` cookie is the single source of truth** — `middleware.ts` reads that same cookie server-side to gate `(app)` routes and bounce authenticated users away from `(auth)`. There is deliberately no `localStorage` copy: keeping two stores let them diverge, and a present cookie with empty `localStorage` put the app in an infinite `/login` ↔ `/dashboard` loop.

**Server state is TanStack Query v5** (not SWR). Per-feature hooks follow a fixed shape: a module-level `const QK = [...]` query key, `useQuery` with `staleTime: 30_000`, and `useMutation`s that `qc.invalidateQueries({queryKey: QK})` plus fire a `toast` from `@/shared/hooks/useToast` on success/error — see `features/despesas/hooks/useInstallments.ts`. Global defaults (retry/backoff, `gcTime`) live in `infra/query-client.ts`.

**`infra/api-client.ts`** is the single axios instance: base URL from `NEXT_PUBLIC_API_URL`, a request interceptor injecting `X-User-Id` from the session cookie, and a response interceptor that on 401 clears the session and calls `redirectToLogin()` from `infra/navigation.ts`. Only 401 ends the session — network failures and 5xx are transient and must not log the user out.

**Naming conventions:** hooks `useX`, services `XService` (exported as a plain object of async functions), types under `features/<f>/types`. Forms use React Hook Form + `@hookform/resolvers` with Zod schemas in `types/schemas.ts`. Icons come from `lucide-react`; UI primitives are hand-rolled with Tailwind + `class-variance-authority`/`tailwind-merge` — there is no component library dependency.

## Testing

- **Server unit** (`server/tests/unit/`, mirrors the layer structure): node env, in-memory repositories, no database.
- **Server integration** (`server/tests/integration/presentation/`): Supertest against the real Express app over SQLite.
- `server/vitest.config.ts` supplies the `@src` alias and 100% coverage thresholds. The `test:unit` / `test:integration` scripts filter **by path** (`vitest run tests/unit`), not by project.
- ⚠️ `server/vitest.workspace.ts` and `server/vitest.integration.config.ts` are **dead files**: Vitest 4 dropped `defineWorkspace`/`vitest.workspace.ts` in favour of `test.projects`, so `--project unit` fails with `No projects matched the filter "unit"`, and nothing references the integration config.
- **Web unit/component/integration**: Vitest + jsdom + `@testing-library/react`, with **MSW** intercepting HTTP so the real axios interceptors are exercised. `web/vitest.setup.ts` handles the jsdom 29 gaps (`matchMedia`, `ResizeObserver`, pointer capture), the MSW lifecycle and the global `afterEach`. Shared harness lives in `web/tests/` (`renderWithProviders`, fixtures, MSW handlers); unit and component tests sit **next to the source**, page-level integration tests in `web/tests/integration/`.
- **E2E**: Playwright in the top-level `e2e/` package. `npm run test:e2e` provisions a **SQLite file exclusive to that run**, seeds it over HTTP, and discards it at the end — see `e2e/README.md`.
- The constitution asks that tests target hooks and business logic rather than markup; coverage thresholds in `web/vitest.config.ts` encode that as per-glob gates.
- **Read `docs/testing/README.md`** before writing tests: it carries the Vitest×Playwright split and a table of verified pitfalls (NBSP in `formatCurrency`, non-configurable `window.location` in jsdom, the global `useToast` queue).

## Workflow

This repo uses Spec Kit. Feature work lives in `specs/###-feature-name/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `tasks.md`, `contracts/`, `checklists/`) and is driven by the `speckit.*` skills (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, …) backed by `.specify/`. Branches follow `###-feature-name`; commits follow Conventional Commits; every feature's `plan.md` carries a Constitution Check.

`.specify/memory/constitution.md` is the normative document — it wins over ad-hoc practice. Beyond the layering rules already described, it mandates: no framework types in the domain, DI everywhere, YAGNI over speculative abstraction, no dead or commented-out code, Server Components by default with `"use client"` only for interactivity/state/effects/browser APIs, and local state preferred over global.

`smaug-handoff/` is prototype material — ignore it.

## Tech Stack

| Layer   | Key technologies                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server  | Node 22, TypeScript 5 strict ESM, Express 5, Prisma 4 (SQLite dev, PostgreSQL-ready), tsyringe 4, Zod 4, Pino, tsup                                     |
| Web     | Next.js 15 App Router, React 19 RC, Tailwind 3, TanStack Query 5, axios, React Hook Form + Zod, lucide-react                                            |
| Tooling | separate npm packages (no workspaces), ESLint 10, Prettier, Husky, lint-staged, dependency-cruiser 17, Vitest 4 (server + web), MSW 2, Playwright (e2e) |
