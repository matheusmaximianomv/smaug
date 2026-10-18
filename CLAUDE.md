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
npm run lint             # eslint (server) + eslint 9 flat config (web)
npm run format           # prettier across the repo
npm run --prefix server typecheck         # also `--prefix web`, `--prefix e2e`
npm run validate:deps    # dependency-cruiser architecture rules — run from ROOT only
```

Use **Node 24** (`.nvmrc`): `better-sqlite3` is compiled for it, and under Node 22 the native module fails to load (server integration tests answer 500).

`npm run --prefix server validate:deps` is broken: it points at a `server/.dependency-cruiser.cjs` that does not exist. Use the root script, which validates all three packages (`server web e2e`).

Husky + lint-staged run the **root** `.lintstagedrc.js` at commit time: `server/**/*.{ts,tsx}` → `eslint --fix` + prettier; `web/**/*.{ts,tsx}` → `npm --prefix web exec -- eslint --config web/eslint.config.mjs <staged files>` **without `--fix`** + prettier (the explicit `--config` is needed because ESLint 9 resolves its config from the cwd — the root, which has its own ESLint 10 config — and each path is quoted to survive `app/(app)`/`app/(auth)`); `e2e/**/*.ts` and `*.{json,md}` → prettier only. (The `lint-staged` block inside `server/package.json` is dead — nothing invokes it.)

### Prisma

```bash
npm run --prefix server prisma:generate   # client for the resolved provider
npm run --prefix server migrate:deploy    # applies prisma/<provider>/migrations
npm run --prefix server migrate:new -- <snake_name>   # same migration in both dialects
npm run --prefix server migrate:check     # parity + fidelity of both folders (CI)
npm run --prefix server prisma -- <any prisma CLI args>
```

`server/prisma/schema.prisma` is the **single source** of the models and is never rewritten (its
datasource has no `url`: Prisma 7 rejects it). Every command goes through `server/scripts/prisma.mjs`,
which resolves `DATABASE_PROVIDER` / `DATABASE_URL` from the system env first and `server/.env` second
(same precedence as `env.ts`), **fails** when the provider is missing or invalid (no default;
`memory` → `sqlite`), writes the derived, gitignored `prisma/<provider>/schema.prisma` and runs the CLI
with `--config prisma/prisma.config.ts` — that config (in `prisma/`, not in `server/`, so the Docker
`runner` stage copies it) reads the provider from `SMAUG_PRISMA_PROVIDER`, set by the wrapper, and points
at that provider's schema, `prisma/<provider>/migrations/` and URLs; run outside the wrapper it throws.
The wrapper refuses `--schema` and `--config`. Each provider has its own tracked
`prisma/<provider>/migrations/` — same folder names, same order, one dialect each. `migrate dev` is
blocked (it would create the migration in one dialect only); `migrate:new` diffs both folders against
the source schema instead. `migrate:new`/`migrate:check` need a **throwaway** Postgres in
`POSTGRES_SHADOW_DATABASE_URL` (it is wiped on every run; created if missing).

At runtime Prisma 7 needs a **driver adapter**: `infrastructure/database/prisma-adapter.ts`
(`createPrismaAdapter`) picks `@prisma/adapter-pg` or `@prisma/adapter-better-sqlite3` by provider, with
two settings that keep the behaviour of the old Rust engine — `connectionTimeoutMillis: 5_000` on `pg` (otherwise
`/health` hangs > 30 s on an unreachable host instead of the 503 in ~5 s) and
`timestampFormat: "unixepoch-ms"` on SQLite (the engine stored `DateTime` as INTEGER ms; the adapter
default writes TEXT, and mixed formats break `orderBy`). The generator stays `prisma-client-js` (client
in `node_modules/.prisma/client`). The generated client targets one provider at a time — switch
provider, regenerate; a client/adapter mismatch fails at construction with
`PrismaClientInitializationError` ("The Driver Adapter … is not compatible with the provider …").

A relative SQLite path in `DATABASE_URL` is relative to `server/` (where `.env` lives):
`file:./prisma/sqlite/dev.db` is `server/prisma/sqlite/dev.db`. The Prisma 7 CLI would resolve it from
the config's folder (`prisma/`) and `better-sqlite3` from the current directory, so both the wrapper
and `env.ts` (via `config/sqlite-url.ts`) turn it absolute first; the whole app shares the single
client from `infrastructure/database/config.ts`.

The Prisma 7 CLI **refuses destructive actions** (`db push --force-reset`, `migrate reset`) when it
detects an AI agent in the environment (`CLAUDECODE`, `AI_AGENT`, `CURSOR_AGENT`, …), demanding
`PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` with the user's consent. The test harness and
`run-e2e.mjs` never reset (each run uses a fresh file); a manual reset asked of an agent needs the
user's explicit consent.

## Architecture

### Backend — Clean Architecture (`server/src/`)

```
domain/          entities, value-objects, use-cases, ports (repository interfaces), errors
application/     services (orchestrate use cases), dtos, ports (Logger)
infrastructure/  Prisma repos, Express server, tsyringe container, env (Zod-validated), Pino
presentation/    controllers, routes, middlewares (validation, auth, error, request log)
```

`domain` and `application` must never import `infrastructure` or `presentation` — enforced by `.dependency-cruiser.js` at the root, along with a hard `server/` ⇄ `web/` import ban, a `no-e2e-to-src` rule keeping `e2e/` black-box, `auth-crypto-only-in-infra` (`argon2`/`jose` only under `server/src/infrastructure/`) and `http-middleware-libs-only-in-presentation` (`cookie-parser`/`express-rate-limit` only under `server/src/presentation/`). Circular deps are warnings. **Known hole:** the config has no `options.tsConfig`, so dependency-cruiser does not resolve the `@src/*` alias — imports written through the alias escape the layer rules; review them by hand.

**Path alias:** `@src/*` → `server/src/*`. `allowImportingTsExtensions` is on, so some imports carry an explicit `.ts` suffix; match whatever the neighbouring file does.

**Domain model.** Entities: `User`, `PasswordCredential`, `AuthSession`, `RefreshToken`, `OneTimeRevenue`, `FixedRevenue` (+ `FixedRevenueVersion`), `ExpenseCategory`, `OneTimeExpense`, `InstallmentExpense` (+ `Installment`), `RecurringExpense` (+ `RecurringExpenseVersion`). The pivot concept is `MonthlyCompetence` (`monthly-competence.value-object.ts`) — an immutable `{month, year}` pair built via `MonthlyCompetence.create()` with comparison helpers (`isPastMonth`, `isBefore`, …). Recurring/fixed items are _versioned_: editing them appends a version row rather than mutating history, so month-scoped queries resolve the version in effect for a given competence. Auth value objects: `EmailAddress` (trim + lowercase, ≤ 254) and `PasswordPolicy` (12–128 code points after NFKC, never trimmed; static-only).

**DI (`infrastructure/config/container.ts`).** tsyringe + `reflect-metadata` are dependencies, but **there is not a single `@injectable()`/`@inject()` in `server/src`** — the graph is wired by hand with `new`, in dependency order, inside this one file, which both registers instances (string tokens equal to the type name) _and_ exports them as named consts. `presentation/routes/index.ts` imports those consts directly. The container is resolved at runtime only for the `"Logger"` token. The auth slice (adapters built with `authConfig` → repositories → use cases → `AuthService` → `AuthController`, which receives the refresh-cookie config) exports only `authController` and `authenticateRequestUseCase`; `userRepository` is no longer exported. When adding an entity, extend this file end to end — never `new` a service in a route or controller.

**Persistence.** Each aggregate has a port in `domain/ports/` and a `Prisma*Repository` in `infrastructure/database/repositories/`. A separate generic `RepositoryFactory` (`database.provider.ts`) switches on `DATABASE_PROVIDER`: `memory` yields `InMemoryRepository`, `sqlite`/`postgresql` yield a reflective `PrismaRepository`. Unit tests use in-memory fakes; no DB required. Auth tables: `PasswordCredential` (PK `userId`), `AuthSession`, `RefreshToken` (`token_hash` and `parent_token_id` UNIQUE), migration `20261018150956_add_authentication` in both dialects. `PrismaUserRepository.createWithPasswordCredential` writes user + credential in one `$transaction` and maps P2002 on `email` to `EmailAlreadyExistsError` (read from the error `meta`: `constraint.fields` on SQLite, `constraint.index` on Postgres). `PrismaAuthSessionRepository.rotate` is an interactive `$transaction` doing **compare-and-set** with `updateMany` (session → current token → create successor); a count ≠ 1 or a P2002 returns `false` — the caller re-reads, never throws. Its concurrency test is parameterized by provider and runs against Postgres when `POSTGRES_TEST_DATABASE_URL` is set (the CI `migrations` job does).

**HTTP contract.** Routes are mounted at the root (no `/api` prefix — `/api` exists only on the web side, see Frontend): `/health`, `/auth`, `/users`, `/revenues/one-time`, `/revenues/fixed`, `/revenues` (queries), `/expenses/categories`, `/expenses/one-time`, `/expenses/installment`, `/expenses/recurring`, `/expenses` (queries), `/data` (CSV export/import). Mount order matters — the specific prefixes are registered before the `/revenues` and `/expenses` catch-alls. `/health` returns **503 with `status: "degraded"`** when the database is unreachable, not just 200. Auth endpoints: `POST /auth/register` 201, `POST /auth/login` 200, `POST /auth/refresh` 200 (reads the cookie), `POST /auth/logout` 204 (Bearer optional), `POST /auth/logout-all` 204 (Bearer required); session-opening responses are `{accessToken, tokenType: "Bearer", expiresIn, user}`. `/users` now only serves `GET /users/me` — `POST /users` and `GET /users/:id` are gone.

**Auth is email + password with Bearer JWT + opaque refresh.** `presentation/middlewares/authenticate.middleware.ts` exports `authenticate` (requires `Authorization: Bearer <jwt>`, 401 `UNAUTHORIZED` otherwise) and `authenticateIfPresent`, and augments `Request` with `req.userId` and `req.sessionId`; it delegates to `AuthenticateRequestUseCase`, which also checks that the session is still active. One `authenticateMiddleware` instance in `routes/index.ts` guards `/users` and every domain mount; only `/health` and `/auth` are open. The access token is a JWT signed by `JoseAccessTokenService` (HS256 fixed, `typ: at+jwt`, `kid` current + previous for rotation, 5 s clock tolerance, `verify` → `null`). The refresh token is opaque (`CryptoRefreshTokenGenerator`: 32 random bytes base64url, stored as SHA-256 hex) and travels only in the `smaug_refresh` cookie (HttpOnly, `SameSite=Strict`, `Path=AUTH_COOKIE_PATH`, `Max-Age`) set/cleared by `AuthController`; `AuthService` returns `{response, refreshToken, refreshTokenExpiresAt}` and knows nothing of cookies. A session is a **token family**: each refresh rotates via CAS; replaying the just-rotated token inside `REFRESH_REUSE_GRACE_SECONDS` (30 s) answers 409 `REFRESH_TOKEN_CONFLICT` (cookie kept — a concurrent tab won), outside it revokes the whole family and logs `auth.refresh.reuse_detected` (401 `INVALID_REFRESH_TOKEN`, cookie cleared). `StartSession` also purges the user's sessions stale for 7 days. Passwords use `Argon2PasswordHasher` (Argon2id, pepper keyring passed as the Argon2 `secret`, NFKC, `needsRehash` on login with failure-tolerant rehash, a dummy hash so unknown emails cost the same — `verifyAgainstDummy`). The `/auth` sub-router alone mounts `cookieParser()` and `requireTrustedOrigin(CORS_ORIGIN)` (403 `ORIGIN_NOT_ALLOWED` on a foreign `Origin`), plus `createAuthRateLimiters(logger, authConfig.rateLimits)` (`express-rate-limit`, 429 `TOO_MANY_REQUESTS` with `Retry-After`; register/IP, login/IP, login/email, refresh/IP). Pino `redact` censors `password`, `passwordHash`, tokens, `authorization`, `cookie`, `set-cookie`, `secret`, `pepper` (root and `*.`) as `[REDACTED]`; auth events are logged as `auth.*` through the domain `AuthEventLogger` port.

**Validation & errors.** Zod schemas live in `application/dtos/*.dto.ts` (alongside the `XResponseDto` interfaces), are imported by the route files, and are applied via `validateRequest` / `validateQuery`, which emit `{error: "VALIDATION_ERROR", message, details}` with 400. The terminal `errorHandlerMiddleware` logs via the container's `Logger` and returns a bare 500 — surface intended client-facing failures explicitly in the controller/service instead of throwing.

**CSV export/import (`/data`).** The whole engine lives in the server; the web only triggers a
download and uploads a file. `application/csv/` holds the pure serializer/parser (BOM, `;`, CRLF,
comma decimal, quote escaping); `DataExportService` walks the competence range reusing
`RevenueQueryService`/`ExpenseQueryService` (so version resolution and category joins are not
duplicated) and sorts deterministically — competence, nature, category, description, then amount,
series and installment number as tiebreakers, so twin rows can't reorder between exports.
`ImportEntriesUseCase` builds every entity in memory and hands the batch to `DataImportRepository`,
which persists it in a single `$transaction`: import never deduplicates, so a half-written batch
could not be retried safely. Import is always additive — the file's `serie_id` only groups rows
with each other and is then discarded. It is also the one place allowed to bypass the
past-competence guard, via `RecurringExpense.createForImport` /
`RecurringExpenseVersion.createForImport` — factories that waive **only** the temporal guard and
still enforce every other invariant; `rehydrate` stays reserved for the repository.
The `observacao` column exists in the format but has no
field in the domain: it is exported empty and ignored on import. Import sends the CSV as a raw
`text/csv` body (`express.text`), not multipart.

**Env** (`infrastructure/config/env.ts`) is Zod-parsed at import time and calls `process.exit(1)` on failure. Required, no default: `DATABASE_PROVIDER` (`postgresql|sqlite|memory`), `DATABASE_URL`, `NODE_ENV`, `JWT_SECRET` (strict base64, ≥ 32 bytes — `openssl rand -base64 32`), `JWT_KEY_ID`, `PASSWORD_PEPPERS` (keyring `id:base64,id:base64`), `PASSWORD_PEPPER_CURRENT_ID` (must exist in the keyring). Defaults: `PORT` (3000), `LOG_LEVEL` (`info`), `CORS_ORIGIN` (`http://localhost:3001`, trailing slashes stripped — it is compared verbatim with `Origin` by both CORS and `requireTrustedOrigin`), `JWT_ISSUER`/`JWT_AUDIENCE` (`smaug-api`/`smaug-web`), `ACCESS_TOKEN_TTL_SECONDS` (600), `REFRESH_TOKEN_TTL_SECONDS` (604800), `SESSION_MAX_LIFETIME_SECONDS` (2592000), `REFRESH_REUSE_GRACE_SECONDS` (30), `ARGON2_MEMORY_KIB`/`ARGON2_TIME_COST`/`ARGON2_PARALLELISM` (65536/3/4; OWASP floors 19456 KiB and 2 enforced outside `test`), `AUTH_COOKIE_PATH` (`/api/auth`), `AUTH_RATE_LIMIT_REGISTER_PER_IP` (10/h), `AUTH_RATE_LIMIT_LOGIN_PER_IP` (50/15 min), `AUTH_RATE_LIMIT_LOGIN_PER_EMAIL` (10/15 min), `AUTH_RATE_LIMIT_REFRESH_PER_IP` (60/min). Optional: `JWT_PREVIOUS_SECRET` + `JWT_PREVIOUS_KEY_ID` (together, for key rotation), `AUTH_COOKIE_SECURE` (defaults to `true` outside development/test) and `TRUST_PROXY` — **required outside development/test**, `"true"` is refused (it would make `X-Forwarded-For` forgeable and the rate limit bypassable), digits mean hop count, anything else is an Express IP/subnet/name list (`loopback` for dev behind the web's `/api` relay); `server.ts` calls `app.set("trust proxy", …)` only when set. The cross-field rules live in `config/auth-config.ts` (`checkAuthEnv`), which also builds the typed **`authConfig`** exported by `env.ts`: adapters, the HTTP layer and the container receive slices of it (`accessToken`, `session`, `password`, `cookie`, `trustProxy`, `rateLimits`) and never read `env` themselves.

**Docker.** `server/docker-compose.yml` runs three services: `api` (`server/Dockerfile`, multi-stage `node:22-alpine`, always PostgreSQL, runs `npm run migrate:deploy` before starting; `env_file` = versioned non-secret `server/.env.docker` + **unversioned `server/.env.secrets`** with mode 600 holding `JWT_*`, `PASSWORD_PEPPER*` and `DATABASE_URL` — without it compose does not start), `web` (`web/Dockerfile`, multi-stage `node:24-alpine`, `next start -p 3001`; `web/.env.docker` holds only `API_ORIGIN=http://api:3000`, read at runtime so one image serves any API) and `postgres` (`postgres:16-alpine`, bound to `127.0.0.1:5432`). The API port is **not published** (`expose` only): the browser reaches it through the web's `/api` relay. The web is published on `${SMAUG_WEB_BIND:-127.0.0.1}:${SMAUG_WEB_PORT:-8080}`; `SMAUG_PUBLIC_ORIGIN` (default `http://localhost:${SMAUG_WEB_PORT}`) becomes the API's `CORS_ORIGIN`. The default network has a fixed subnet `10.250.0.0/24`, mirrored by `TRUST_PROXY=10.250.0.0/24` in `.env.docker` (change one, change the other). `.env.docker` sets `AUTH_COOKIE_SECURE=true`, so a public deployment **requires a TLS reverse proxy in front of the web that overwrites `X-Forwarded-For`** — exposed directly, a client forges its IP and escapes the rate limit. The deploy procedure is `specs/010-autenticacao/deploy.md` (secrets, both publishing scenarios, TLS proxy, CSV account migration, rollback, key/pepper rotation), with the checklist in `specs/010-autenticacao/checklists/deploy.md`; a longer local runbook may exist in the unversioned `docs/`. There is no seed script anywhere in `server/`.

### Frontend — feature-based (`web/`)

```
app/        App Router: (auth)/{login,cadastro}, (app)/{dashboard,receitas,despesas,categorias,historico,dados}, api/[...path] (relay to the API)
features/   auth, dashboard, receitas, despesas, categorias, historico, dados
            each owns components/ hooks/ services/ types/
shared/     UI primitives (Button, Modal, Toast, MonthNavigator, …), lancamentos/ (ledger, wizard and Ficha blocks shared by receitas/despesas), hooks, lib
infra/      api-client, auth-refresh, api-error, query-client, router-adapter, session, navigation
proxy.ts    (route guard; the Next 16 name for middleware)
```

**Layering is normative** (see the constitution below): `UI → hooks → services → infra`, one direction only. Components stay presentational; hooks hold business logic and state; services only talk to the outside world. Components must not call `apiClient` directly.

**Cross-feature imports are forbidden, with one carve-out.** Share via `@/shared` or `@/infra` only. The exception the code actually makes is for **types** of a genuinely related domain (`despesas` importing `Category` from `@/features/categorias/types`; `historico` aggregating both) — a component, hook or service from another feature is never acceptable: when a second feature needs one, promote it to `shared/` (as was done with `MonthYearSelect`, now in `shared/components/`). `shared/` never imports a feature: `AppShell`/`Sidebar` receive the user (`ShellUser {name}`), `onLogout` and `onLogoutAll` by props from the client `app/(app)/layout.tsx`, which calls `useAuth`. Aliases: `@/` → `web/`, plus `@/features`, `@/shared`, `@/infra` (declared in both `tsconfig.json` and `vitest.config.ts`).

**Next.js APIs are wrapped.** Business hooks must not call `useRouter`/`useSearchParams` from `next/navigation` directly — go through `infra/router-adapter.ts`. Likewise the session goes through `infra/session.ts` (`getAccessToken`/`setSession`/`clearSession`/`hasSessionHint`). The source of truth is **the server**: the refresh token lives only in the HttpOnly `smaug_refresh` cookie, which no script reads. The access token is kept **in a module variable only** — never cookie, `localStorage` or `sessionStorage`; a reload loses it and the session resumes through a refresh. `setSession` also writes the non-secret hint cookie `smaug_session=1` (`path=/`, `SameSite=Lax`, 30 days), and the legacy `userId` cookie is erased on module load. `proxy.ts` (the Next 16 name for middleware, exporting `proxy`; its matcher skips `/api`) reads only that hint: without it, `(app)` routes redirect to `/login?next=<pathname+search>` (the root goes without `next`); with it, `/login`/`/cadastro` bounce to `/dashboard`. The hint may diverge from reality without looping `/login` ↔ `/dashboard`, because the only path that ends the session — a refresh refused with 401 — calls `clearSession()` **before** `redirectToLogin()`. `useAuth` bootstraps (token in memory → `GET /users/me`; else hint present → refresh), and `login(input, next)` validates `next` with `safeDestination` against open redirects; `logout`/`logoutAll` clear and redirect even with the API down. `app/(auth)/login/page.tsx` is an async Server Component that reads `searchParams` and passes `next` to `LoginForm`.

**Server state is TanStack Query v5** (not SWR). Per-feature hooks follow a fixed shape: a module-level `const QK = [...]` query key, `useQuery` with `staleTime: 30_000`, and `useMutation`s that `qc.invalidateQueries({queryKey: QK})` plus fire a `toast` from `@/shared/hooks/useToast` on success/error — see `features/categorias/hooks/useCategories.ts`. Receitas/Despesas key everything under a `["revenues"]`/`["expenses"]` prefix and their mutations also invalidate `["dashboard"]`. Global defaults (retry/backoff, `gcTime`) live in `infra/query-client.ts`.

**The browser only talks to the web's origin.** `app/api/[...path]/route.ts` (runtime `nodejs`, `force-dynamic`) relays `/api/*` to `API_ORIGIN/*`; `API_ORIGIN` is a **server** variable read on every request (`web/.env.example`: `http://localhost:3000`), so the same build serves any API — missing → bare 500, API unreachable → bare 502. It strips hop-by-hop headers and re-attaches every `Set-Cookie`, so `smaug_refresh` becomes a first-party cookie of the web origin. `rewrites()` was rejected in the spike (it freezes the target at build time). There is no `NEXT_PUBLIC_*` API URL any more.

**`infra/api-client.ts`** is the single axios instance: `baseURL: "/api"`, no `withCredentials`, an async request interceptor that awaits `settleRefresh()` (an in-flight refresh), sets `Authorization: Bearer <token>` and records the token it sent (`_sentToken`). On a 401 outside `/auth/*`: if the current token differs from the one sent (a refresh already happened), it just retries with the current one; otherwise it calls `refreshSession()` and retries once (`_retried`). **`infra/auth-refresh.ts`** owns `refreshSession()`, single-flight per tab, on plain axios (not `apiClient`) against `/api/auth/refresh`: 409 `REFRESH_TOKEN_CONFLICT` → waits 250 ms and tries once more (another tab won the rotation); 401 → `clearSession()` then `redirectToLogin()` from `infra/navigation.ts`. Only a refresh refused with 401 ends the session — network failures and 5xx reject to the caller and are transient.

**`infra/api-error.ts`** maps API business codes to pt-BR copy — a ~45-entry table (`VALIDATION_ERROR`, `PAST_COMPETENCE`, `INSTALLMENT_FINANCIAL_IMMUTABLE`, `INVALID_CREDENTIALS`, `TOO_MANY_REQUESTS`, `ORIGIN_NOT_ALLOWED`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_CONFLICT`, …) plus offline and `ECONNABORTED` branches; `isInvalidSessionError` is true only for 401. Add the code here rather than hard-coding a message in a component.

**Naming conventions:** hooks `useX`, services `XService` (exported as a plain object of async functions), types under `features/<f>/types`. Forms use React Hook Form + `@hookform/resolvers` with Zod schemas in `types/schemas.ts` — today `auth`, `categorias`, `despesas` and `receitas` have one; the other features carry just `types/index.ts`. Icons come from `lucide-react`. UI primitives are hand-rolled with Tailwind + `tailwind-merge`/`clsx` behind `cn()`; variants are a `clsx` object or a module-level `Record<Union, string>` — **`class-variance-authority` is a dependency but is imported by no file, so do not introduce `cva`**. The only third-party UI is Radix: `@radix-ui/react-dialog` behind `Modal` and `@radix-ui/react-tabs` behind `Tabs`.

## Testing

- **Server unit** (`server/tests/unit/`, mirrors the layer structure): node env, in-memory repositories, no database.
- **Server integration** (`server/tests/integration/presentation/`): Supertest against the real Express app over SQLite. Each test file gets **its own `.db` file** from `sqliteTestDatabase(name)` (`server/tests/helpers/sqlite-test-database.ts`): an absolute path in `server/prisma/sqlite/` (the CLI, the test's own client and the app must all open the same file); `push()` deletes the file and runs `db push` through the wrapper — **with no reset flag**, which the Prisma 7 CLI refuses under an AI agent (see Prisma above) and a fresh file makes unnecessary; `client()` builds a `PrismaClient` with the app's own adapter; `remove()` in `afterAll` also drops `-journal`/`-wal`/`-shm`. The test then dynamically imports the app so the container picks up the test URL — so a **SQLite** client from `DATABASE_PROVIDER=sqlite prisma:generate` is a prerequisite (it also writes the derived schema those commands point at). Before that import the file sets `NODE_ENV=test`, the Argon2 minimum (`ARGON2_MEMORY_KIB=1024`, `ARGON2_TIME_COST=1`, `ARGON2_PARALLELISM=1`) and a high `AUTH_RATE_LIMIT_REGISTER_PER_IP`, then gets its Bearer from `POST /auth/register` in `beforeAll`. Repository integration tests live in `server/tests/integration/infrastructure/database/repositories/`; auth flows in `auth*.test.ts` (`auth`, `auth-refresh-reuse`, `auth-rate-limit`, `auth-rate-limit-proxy`, `auth-logs`).
- `server/tests/helpers/` is shared harness: `controller-contract.ts` exposes `describeControllerContract`, which generates the standard happy-path / mapped-domain-error / `next(err)` battery — use it when adding a controller instead of rewriting those cases (`successBody` when the JSON differs from the service result, `decorateResponse` to add `res.cookie`/`clearCookie` to the mock); `createRequestMock` defaults `sessionId` to `"session-1"`.
- `server/vitest.config.ts` supplies the `@src` alias, the test-only secrets (`JWT_SECRET`, `JWT_KEY_ID`, `PASSWORD_PEPPERS`, `PASSWORD_PEPPER_CURRENT_ID`) in `test.env`, and 100% coverage thresholds. The `test:unit` / `test:integration` scripts filter **by path** (`vitest run tests/unit`), not by project. It is the only Vitest config in `server/`.
- **Web unit/component/integration**: Vitest + jsdom + `@testing-library/react`, with **MSW** intercepting HTTP so the real axios interceptors are exercised. `web/vitest.setup.ts` handles the jsdom 29 gaps (`matchMedia`, `ResizeObserver`, pointer capture), the MSW lifecycle and the global `afterEach`. Unit and component tests sit **next to the source**; page-level integration tests go in `web/tests/integration/`, because they import from more than one feature — which inside a feature would breach the cross-feature import ban. MSW serves the API under `http://localhost:3001/api` (`tests/msw/base.ts`), including simulated auth (`handlers/auth.ts`: register, login, refresh, logout, logout-all, `GET /users/me`; tokens `access-<userId>-<n>`; `db` keeps passwords, the session and issued tokens). `tests/requests.ts` records paths without `/api`; `vitest.setup.ts` calls `clearSession()` in the global `afterEach`.
- **E2E**: Playwright in the top-level `e2e/` package. `npm run test:e2e` provisions a **SQLite file exclusive to that run**, seeds it over HTTP, and discards it at the end — see `e2e/README.md`. `playwright.config.ts` passes **explicit test secrets** in the API's `serverEnv` (plus Argon2 minimum, `AUTH_RATE_LIMIT_*=100000`, `TRUST_PROXY=loopback`) and `ACCESS_TOKEN_TTL_SECONDS=20` (`e2e/src/config/env.ts`) so silent refresh really happens — seed within ~20 s of the test start or the seed token expires; the web gets `API_ORIGIN`. `E2E_API_HOST` (default `localhost`; `127.0.0.1` makes API and web different sites) and `E2E_ALL_BROWSERS` (adds firefox/webkit). `SeedClient` registers/logs in with a password (Bearer, `asUser(accessToken)`); the `signInBrowser` fixture logs in through the API and plants `smaug_refresh` (web domain, `/api/auth`, httpOnly, Strict) + `smaug_session=1` in the browser context. `npm run test:e2e -- --grep …` does not forward flags: call `node e2e/scripts/run-e2e.mjs` directly.
- The constitution asks that tests target hooks and business logic rather than markup; coverage thresholds in `web/vitest.config.ts` encode that as per-glob gates.

**Vitest vs Playwright — who proves what.** MSW proves the frontend behaves correctly _given a contract_; E2E proves the contract is _real_. So page-level integration tests deliberately do **not** re-walk the happy paths E2E already covers. They cover what E2E cannot reach cheaply: every API error code rendering its pt-BR message, the "Tentar novamente" action on error toasts, the `DeleteWarningModal` vs `ConfirmDialog` branch, and the past/future competence guards.

**`web/tests/` harness.**

| File               | Role                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `render.tsx`       | `renderWithProviders`, `renderHookWithProviders`, `createTestQueryClient`                           |
| `router.tsx`       | real Next contexts + `routerAdapterMock`                                                            |
| `msw/`             | `server`, `db` (in-memory store), per-resource handlers, `mockApiError`/`mockNetworkError`          |
| `fixtures/`        | deterministic per-entity factories                                                                  |
| `toast.ts`         | `spyOnToast`, `drainToasts`                                                                         |
| `session.ts`       | `loginAs(user = makeUser())` (seeds token, hint cookie and MSW session; returns the user), `logout` |
| `time.ts`          | `NOW`, `NOW_COMPETENCE`, `freezeTime`                                                               |
| `mocked.ts`        | `Mocked<T>`, `mockService`                                                                          |
| `requests.ts`      | `recordRequests`, `signatures`, `bodyOf` — the vocabulary of service tests                          |
| `harness.test.tsx` | tests of the harness itself — if these break, start here, not in a feature test                     |

**Verified pitfalls.** These cost real debugging time; don't rediscover them:

| Pitfall                                                       | How to handle                                                                                                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatCurrency` emits **U+00A0** between `R$` and the number | Assert `toBe("R$ 1.234,56")` with an NBSP. Inside an RTL query the normalizer collapses it, so a plain space works there                                                                                          |
| `window.location` is **non-configurable** in jsdom 29         | Use the `@/infra/navigation` seam (`redirectToLogin`), never `vi.spyOn(window.location, …)`                                                                                                                       |
| `useToast` has a global queue with no reset                   | `spyOnToast()` by default; fake timers only in the two toast tests themselves                                                                                                                                     |
| `infra/query-client.ts` is a singleton with `retry: 3`        | Always `createTestQueryClient()`; never `app/providers.tsx`                                                                                                                                                       |
| Server: fake clock × JWT `exp`                                | A token issued before `vi.setSystemTime` to a later date is already expired: issue it after, or raise `ACCESS_TOKEN_TTL_SECONDS`/`SESSION_MAX_LIFETIME_SECONDS` in that file (see `lancamentos-read-api.test.ts`) |
| Server: local `server/.env` refills env vars                  | `env.ts` calls `dotenv.config()`: tests that rely on an absent var (`TRUST_PROXY`) must `vi.mock("dotenv")`                                                                                                       |
| Server: native modules under Node 22                          | `better-sqlite3` is built for Node 24 (`.nvmrc`); under Node 22 integration tests fail with 500s — use Node 24                                                                                                    |

## Skills (`.claude/skills/`)

`CLAUDE.md` describes what exists; `.claude/skills/` is the **prescriptive** counterpart — one skill
per element type (entity, use case, repository, service/DTO, controller/route, DI, hook, component,
shared UI, infra, and the three test layers), each with the canonical anatomy copied from a real
file, a creation checklist and the known inconsistencies. Start from `smaug-padroes-gerais`, which
indexes the rest. They are written in pt-BR, matching the project's docs convention.

## Workflow

This repo uses Spec Kit. Feature work lives in `specs/###-feature-name/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `tasks.md`, `contracts/`, `checklists/`) and is driven by the `speckit.*` skills (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, …) backed by `.specify/`. Branches follow `###-feature-name`; commits follow Conventional Commits; every feature's `plan.md` carries a Constitution Check. The 008 redesign was driven by OpenSpec instead (`openspec/`, `/opsx:*` skills): its archived change is in `openspec/changes/archive/` and its behavior contract in `openspec/specs/lancamentos/` (`consulta-api`, `extrato-mensal`, `assistente`, `ficha`), mirrored by the Spec Kit folder `specs/008-redesign-receitas-despesas/` — change one, keep the other in sync. Email + password authentication (branch `010-autenticacao`) was also driven by OpenSpec: the change `autenticacao-email-senha` (archived in `openspec/changes/archive/`, contract in `openspec/specs/autenticacao/`), mirrored by the versioned, self-contained Spec Kit folder `specs/010-autenticacao/` (spec, plan with the `/api` relay spike, research, data model, contracts for the auth API, env and web session, tasks, and `deploy.md`). The PRD, technical spec and runbook it was distilled from are local-only notes under the unversioned `docs/` folder — never link to them from versioned files.

`.specify/memory/constitution.md` is the normative document — it wins over ad-hoc practice. Beyond the layering rules already described, it mandates: no framework types in the domain, DI everywhere, YAGNI over speculative abstraction, no dead or commented-out code, Server Components by default with `"use client"` only for interactivity/state/effects/browser APIs, and local state preferred over global.

`prototipo_v3_despesas_receitas/` is prototype material, **not production code** — it runs on React UMD and persists to `localStorage`. Treat it as a visual reference only; the product decisions it led to are in `docs/008-redesign-receitas-despesas/` (PRD and technical spec), and where the prototype diverges from server rules, the server wins. That redesign **is implemented** (branch `008-redesign-receitas-despesas`, spec in `specs/008-redesign-receitas-despesas/`). The "Área de Dados" (CSV export/import) **is implemented** (branch `006-importar-exportar-dados`), and its wire format stays frozen in `specs/006-importar-exportar-dados/contracts/csv-format.md` — that file is the contract, not the prototype's JS (`ESPECIFICACAO-CSV.md` there is identical).

CI: `.github/workflows/ci.yml` runs lint, typecheck, `validate:deps` and the Vitest suites against a SQLite client (`prisma:generate` with `DATABASE_PROVIDER=sqlite`), plus a `migrations` job that runs `migrate:check` with a Postgres service and, on a `postgresql` client, the session-rotation concurrency test (`POSTGRES_TEST_DATABASE_URL`); `.github/workflows/e2e.yml` runs Playwright on chromium. `e2e/scripts/run-e2e.mjs` refuses to start unless the generated client is SQLite.

## Tech Stack

| Layer   | Key technologies                                                                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server  | Node 24, TypeScript 5 strict ESM, Express 5, Prisma 7 (driver adapters: pg / better-sqlite3; SQLite dev, PostgreSQL in Docker), tsyringe 4, Zod 4, Pino, tsup, argon2, jose, cookie-parser, express-rate-limit |
| Web     | Next.js 16 App Router, React 19, Tailwind 4 (CSS-first, `@theme` em `app/globals.css`) + `tw-animate-css`, TanStack Query 5, axios, React Hook Form + Zod, lucide-react                                        |
| Tooling | separate npm packages (no workspaces), ESLint 10, Prettier, Husky, lint-staged, dependency-cruiser 17, Vitest 4 (server + web), MSW 2, Playwright (e2e)                                                        |
