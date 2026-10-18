---
description: "Task list for the platform upgrades (Next.js 16, Tailwind 4, Node 24 + Prisma 7)"
---

# Tasks: Atualizações de plataforma — Next.js 16, Tailwind 4 e Node 24

**Input**: Design documents from `/specs/009-upgrades-next16-tailwind4-node24/`
**Prerequisites**: plan.md, spec.md, research.md

> Tarefas executadas nas três etapas, na ordem em que foram aplicadas (Next 16 → Tailwind 4 →
> Node 24 + Prisma 7), mais os ajustes posteriores. Cada fase terminou verde em typecheck, lint e nos
> testes do pacote. Todas estão concluídas, exceto o acompanhamento do CI, que depende da abertura do PR.
> Entre parênteses, a decisão de [research.md](./research.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 sem regressão · US2 animação de sobreposições · US3 foco visível · US4 ambiente e
  deploy

---

## Phase 1: Next.js 16 — dependências e React estável

**Purpose**: sair das advisories do `next` e do React RC; base estrita para as etapas seguintes.

- [x] T001 [US4] Registrar a linha de base do `npm audit` do web (21 achados, `next` crítico)
- [x] T002 [US1] Rodar `npx @next/codemod@latest upgrade latest --yes --skip-adoption` em `web/`: `next`/`eslint-config-next` 16.4.2, `react`/`react-dom` 19.3.1, `@types/react*` 19.3.0; nenhum `export const instant` em `web/app` (N1)
- [x] T003 [US4] Limpar as sobras do codemod em `web/package.json`: sem bloco `overrides`, `eslint` fixado em 9.39.5 (N2, N3)
- [x] T004 [US4] Remover `web/.npmrc` e reconciliar `web/package-lock.json` sem apagá-lo (só `vitest`/`@vitest/*`/`chai` mudam além do codemod; `lucide-react` segue 1.12.0); `npm ci` estrito e `npm ls` sem `invalid` (N2)
- [x] T005 [P] [US1] Atualizar o comentário dos deep imports de teste em `web/tests/router.tsx` para `next@16.4.2`

## Phase 2: Next.js 16 — proxy, lint e build

- [x] T006 [US1] `git mv web/middleware.ts web/proxy.ts` e renomear a função para `proxy`, matcher intacto (N6)
- [x] T007 [US1] `git mv web/middleware.test.ts web/proxy.test.ts`, mantendo a asserção de `x-middleware-next`; trocar `middleware` por `proxy` nos globs de `web/vitest.config.ts` (threshold 100%)
- [x] T008 [P] [US1] Atualizar os comentários que citavam o middleware (`web/infra/session.ts`, `web/infra/session.node.test.ts`, `web/vitest.setup.ts`, `web/tests/fixtures/ids.ts`, `e2e/src/fixtures/test.ts`, `e2e/src/global-setup.ts`, `e2e/tests/auth/guards.spec.ts`)
- [x] T009 [US4] Criar `web/eslint.config.mjs` (flat config com `core-web-vitals` + `typescript` e o override de testes), apagar `web/.eslintrc.json` e trocar o script para `"lint": "eslint ."` (N3)
- [x] T010 [US4] Suprimir, com comentário do porquê, os dois `react-hooks/set-state-in-effect` em `web/shared/hooks/useMediaQuery.ts` e `web/features/auth/hooks/useAuth.ts`; lint com 0 erros e 9 avisos (N4)
- [x] T011 [US4] Trocar a entrada `web/**/*.{ts,tsx}` de `.lintstagedrc.js` pela função com o ESLint CLI sobre os arquivos staged; conferido com um erro proposital num arquivo de `web/app/(app)/` (N5)
- [x] T012 [US4] Gerar o build e commitar o `web/tsconfig.json` ajustado (`jsx: "react-jsx"`, `.next/dev/types/**/*.ts`); `git status` limpo após um segundo build (N8)
- [x] T013 [P] [US4] Adicionar `/AGENTS.md` ao `web/.gitignore` (N8)
- [x] T014 [US1] Smoke do proxy em `next start` e `next dev`: 307 anônimo, 200 com cookie, 307 de `/login` com cookie
- [x] T015 [US4] `npm audit fix` sem `--force` no web: `axios` 1.15.2 → 1.20.0; audit sem `next` nem `axios` (N9)
- [x] T016 [US4] E2E local em modo `build` por padrão em `e2e/scripts/run-e2e.mjs` e `e2e/playwright.config.ts`, com `E2E_WEB_MODE=dev` documentado em `e2e/README.md` (N7)
- [x] T017 [US1] E2E 96/96 em modo `build` (com o `npm run dev` aberto) e em modo `dev` (com ele fechado)
- [x] T018 [P] Documentação: `CLAUDE.md`, `README.md`, `web/README.md` e as skills `smaug-padroes-gerais`, `web-arquitetura`, `web-infra`, `web-testes` sem `next lint`, `--legacy-peer-deps`, `middleware.ts`, "Next.js 15" ou "React 19 RC"

**Checkpoint**: lint, `validate:deps`, typecheck ×3, `npm run test` (server 921, web 1237) e cobertura
verdes.

## Phase 3: Tailwind 4 — migração do CSS

- [x] T019 [US1] Instalar `tailwindcss` e `@tailwindcss/postcss` 4.3.3, `postcss` ^8.5.30, `tailwind-merge` ^3.7.0 e `tw-animate-css` ^1.4.0 em `web/`, com `npm install` estrito (T2, T3)
- [x] T020 [US1] Rodar `npx @tailwindcss/upgrade`: `web/tailwind.config.ts` removido, `web/postcss.config.mjs` com `@tailwindcss/postcss`, `web/app/globals.css` com `@import "tailwindcss"` e `@theme` com todos os tokens (T1)
- [x] T021 [US1] Revisar `web/app/globals.css`: sem o bloco `--color-gray-200`, `--font-sans` entre aspas, `bg-stripes`/`bg-hatch` como `@utility`, `@import "tw-animate-css"` e regra base de `cursor: pointer` (T7)
- [x] T022 [US1] Reverter os erros do codemod: `variant: "outline"` em `web/shared/components/Button.tsx`/`Button.test.tsx` e o comentário de `MonthCells.tsx` (T8)
- [x] T023 [US1] Revisar as renomeações da v4 nos ~35 `.tsx` de `app/(auth)`, `features/*/components` e `shared/components/**`, ajustando as asserções de `Skeleton.test.tsx`, `Modal.test.tsx` e `ConfirmDialog.test.tsx` (T8)
- [x] T024 [P] [US1] Remover `tailwind.config.ts` das exclusões de cobertura de `web/vitest.config.ts`
- [x] T025 [US1] Build de produção com o CSS contendo `bg-stripes`, `bg-hatch` e `bg-tipo-avulsa-light`

## Phase 4: Tailwind 4 — foco visível (US3)

**Goal**: indicador de foco por teclado em todo controle (FR-016–FR-019).

- [x] T026 [US3] `focus-visible:ring-red` na classe base do `Button`; teste das quatro variantes com `ring-red` e `ring-2` (T7, T9)
- [x] T027 [P] [US3] `EntryRow`: `focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red`, com teste
- [x] T028 [P] [US3] `MonthCells`: sem o remendo `[outline-style:solid]`, `outline-2 outline-offset-2 outline-text` na célula de referência, com teste
- [x] T029 [P] [US3] `MoneyField`: `placeholder:text-text-subtle`, com teste
- [x] T030 [US3] Regra base `:focus-visible` (outline vermelho de 2 px) para controles crus em `web/app/globals.css` (T9)
- [x] T031 [US3] Passeio por Tab em Login, extrato de Despesas, Ficha com confirmação e assistente: indicador vermelho em todo controle, inclusive `danger` e `ghost`; cursor de mão em botões habilitados

## Phase 5: Tailwind 4 — animação de sobreposições (US2)

**Goal**: transição de entrada/saída de toasts e modais, com movimento reduzido respeitado
(FR-010–FR-015).

- [x] T032 [US2] Classes `motion-safe:` de entrada no `Toast`, com teste de presença (T5)
- [x] T033 [US2] Classes `motion-safe:` de entrada/saída por `data-[state]` no overlay e no painel do `Modal` (zoom no desktop, folha inferior até 768 px), com teste; `ConfirmDialog` e integrações de Receitas/Despesas/Categorias verdes sem mudar expectativa de fechamento (T5, T6)
- [x] T034 [US2] `ModalGate` em `web/shared/components/Modal.tsx` e uso em `DespesasScreen`/`ReceitasScreen`, para que Ficha e assistente animem a saída (T9)
- [x] T035 [US2] Devolução do foco à origem no `onCloseAutoFocus` do `Modal`, sem devolução na troca de conteúdo da Ficha de série (T9)
- [x] T036 [US2] Verificação no navegador (build de produção + Chromium): entrada e saída animadas, só a camada de cima anima, foco devolvido; com `prefers-reduced-motion: reduce`, nenhuma animação e modais somem em < 10 ms

## Phase 6: Tailwind 4 — documentação e verificação

- [x] T037 [P] Documentação: `CLAUDE.md` (Tech Stack com Tailwind 4 e `tw-animate-css`) e as skills `web-componentes`, `web-shared-ui`, `web-testes` sem `tailwind.config` nem `outline-none`
- [x] T038 [US1] Lint, typecheck, `validate:deps`, `npm run test` (server 921, web 1248) e cobertura verdes
- [x] T039 [US1] E2E completo (desktop e mobile) verde, sem precisar da contingência `reducedMotion`
- [x] T040 [US1] Capturas `main` × branch em 1280 px e 375 px de todas as telas: só as diferenças aceitas (FR-020)

**Checkpoint**: telas idênticas fora das diferenças aceitas; animação e foco conferidos no navegador.

## Phase 7: Node 24 — runtime, engines e locks

- [x] T041 [US4] Criar `.nvmrc` com `24` e ativar com `nvm install && nvm use` (Node 24.22.0, npm 11.19.1) (P1)
- [x] T042 [US4] `engines` `>=24` nos quatro `package.json` (web ganha o campo) e `npm >=11` na raiz (P3)
- [x] T043 [US4] `@types/node` `^24` em `server/`, `web/` e `e2e/` (P3)
- [x] T044 [US4] Reconciliar os locks de `server/`, `web/` e `e2e/` com `npm install` (diffs restritos a `@types/node`/`undici-types` e, no server, à entrada de `jiti`); typecheck ×3 verde (P4)
- [x] T045 [US4] Reconciliar o lock da raiz (poda de 203 entradas órfãs, nenhum `name@version` novo); `npm ls` limpo (P4)
- [x] T046 [US4] `npm ci` dos quatro locks sem erro (P4)
- [x] T047 [US4] `target: "node24"` em `server/tsup.config.ts`; `node dist/main.js` com SQLite respondendo `/health` 200 (P5)

## Phase 8: Prisma 7

- [x] T048 [US4] Instalar `prisma`, `@prisma/client`, `@prisma/adapter-pg` e `@prisma/adapter-better-sqlite3` ^7.10.1 em `dependencies` do server; `better-sqlite3` 12.11.1 sem erro de ABI (P6)
- [x] T049 [US1] Remover `url = env("DATABASE_URL")` do datasource de `server/prisma/schema.prisma`; generator segue `prisma-client-js` (P7, P9)
- [x] T050 [US4] Criar `server/prisma/prisma.config.ts` com `SMAUG_PRISMA_PROVIDER` obrigatório, schema/migrations por provider, `datasource.url` e `shadowDatabaseUrl` (P9)
- [x] T051 [US4] Ajustar `server/scripts/lib/prisma-env.mjs` e `server/scripts/prisma.mjs` às flags do CLI 7 (`--config`, `--to-schema`, banco sombra pela config, `db execute` sem `--url`; recusa de `--config`); `prisma:generate` sem `DATABASE_URL` e `migrate:deploy` num SQLite novo OK (P10)
- [x] T052 [US1] `migrate:check` contra Postgres 16 descartável verde; campo temporário gera o mesmo `ALTER TABLE` nos dois dialetos e falha o check (revertido) (P11)
- [x] T053 [US1] Criar `server/src/infrastructure/database/prisma-adapter.ts` e trocar `getPrismaClient()` em `config.ts` por `new PrismaClient({ adapter })`, com `memory` → `sqlite` (P8)
- [x] T054 [P] [US1] Atualizar `server/tests/unit/infrastructure/database/config.test.ts` e criar `prisma-adapter.test.ts` (+4 testes)
- [x] T055 [US1] Criar `server/tests/helpers/sqlite-test-database.ts` e migrar os 10 testes de `server/tests/integration/presentation/` com banco (P12)
- [x] T056 [US1] `e2e/scripts/run-e2e.mjs`: `db push` sem `--force-reset`/`--skip-generate`; guarda "client não é SQLite" ainda funcionando (P12)
- [x] T057 [P] Atualizar o comentário de `server/src/infrastructure/config/sqlite-url.ts`; cobertura do server 100% (101 arquivos, 925 testes)

## Phase 9: Node 24 — CI e documentação

- [x] T058 [US4] `node-version-file: .nvmrc` nos três `actions/setup-node@v4` de `.github/workflows/ci.yml` e `e2e.yml` (P2)
- [x] T059 [US4] Instalação com `npm ci` por pacote no lugar de `npm run install:all` nos dois workflows (P2)
- [x] T060 [P] Documentação: `CLAUDE.md` (seção Prisma, harness de integração, trava do CLI sob agente de IA, Tech Stack), `README.md`, comentário de `e2e/src/support/format.ts` e as skills `server-testes`, `server-di-container`, `smaug-padroes-gerais`; a linha de Docker do `CLAUDE.md` (`node:22-alpine`) mantida

## Phase 10: Ajustes posteriores e verificação integrada

- [x] T061 [P] [US4] `turbopack: { root: __dirname }` em `web/next.config.ts` (A1)
- [x] T062 [P] [US4] `settings.next.rootDir` absoluto em `web/eslint.config.mjs` (A2)
- [x] T063 [P] [US1] Timeout de 15 s no teste "revisa uma fixa alterável sem término e uma avulsa" de `web/tests/integration/receitas-page.test.tsx` (A3)
- [x] T064 [US1] Lint (0 erros, 9 avisos), `validate:deps`, typecheck ×3, `npm run test`, cobertura do server (925, 100%) e do web (1250, thresholds) verdes
- [x] T065 [US1] `npm run build` e E2E 96/96 em modo `build`
- [x] T066 [US1] Smoke do `dist/` com SQLite e com PostgreSQL 16 (`?schema=public`): health, users 201/409, categoria 409, import/export CSV, `DateTime` inteiro no SQLite, 503 em 5,08 s com host inalcançável
- [x] T067 [US1] Smoke com `NODE_OPTIONS=--trace-deprecation` (dev server + `next start`): nenhum `DeprecationWarning`
- [x] T068 [US4] Docker (fora do escopo): imagem do `Dockerfile` inalterado construída e testada offline (666 MB)
- [x] T069 Escrever esta pasta de spec no formato Spec Kit, com o Constitution Check e a seção de deploy
- [x] T071 [US4] `npm audit fix` sem `--force` na raiz, em `web/`, `server/` e `e2e/` (só lockfiles, mais `vitest`/`@vitest/coverage-v8` `^4.1.12` no server); raiz, server e e2e com 0 achados; no web resta só o `braces` de desenvolvimento, sem correção, aceito
- [x] T072 [US4] Zerar os 9 avisos de lint do web (A4) e atualizar as actions do CI para as majors em `node24`, com runner fixo em `ubuntu-24.04`
- [ ] T070 [US4] Abrir o PR e acompanhar os workflows: `ci.yml` (jobs principal e `migrations`) e `e2e.yml` verdes, com o log do `setup-node` resolvendo Node 24.x

**Checkpoint**: tudo verde localmente; falta só o CI do PR.

## Dependencies & Execution Order

- Fases 1–2 (Next) antes das 3–6 (Tailwind): o Tailwind partiu do lock estrito, sem
  `--legacy-peer-deps`, e reconferiu o `postcss` contra ele.
- Fases 7–9 (Node + Prisma) por último; dentro delas, o Prisma (Fase 8) só depois do Node (Fase 7),
  para que cada subida possa ser revertida sozinha.
- Fase 10 depende de todas; T070 depende de commit, push e abertura do PR.
- Commits recomendados separados: lock da raiz (poda de órfãos) e lock do server (Prisma 7) em commits
  próprios, para revisão isolada.
