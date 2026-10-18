# Implementation Plan: Atualizações de plataforma — Next.js 16, Tailwind 4 e Node 24

**Branch**: `009-upgrades-next16-tailwind4-node24` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-upgrades-next16-tailwind4-node24/spec.md`

> Plano consolidado depois da implementação. As decisões (com alternativas) estão em
> [research.md](./research.md) com ids por etapa — **N** (Next 16), **T** (Tailwind 4), **P** (Node 24 +
> Prisma 7), **A** (ajustes posteriores). O Constitution Check foi feito contra o código da branch.

## Summary

Três atualizações de plataforma aplicadas em sequência, cada uma verificada antes da seguinte:

1. **Next.js 15.0.3 → 16.4.2** com React/React DOM 19.3.1 estáveis (sai o RC), ESLint 9 em flat
   config (`next lint` foi removido na 16), `middleware.ts` → `proxy.ts` e fim do
   `--legacy-peer-deps`. Motivo: 20 advisories do `next` (1 RCE crítica, CVE-2025-66478) e o RC que
   prendia o web a peers relaxados.
2. **Tailwind CSS 3.4.19 → 4.3.3** CSS-first (`@theme` em `app/globals.css`), `tailwind-merge` 3.7.0 e
   `tw-animate-css` 1.4.0. Motivo: o `tailwind-merge` instalado já seguia as regras da v4 e apagava
   contornos de foco; as classes de animação nunca geraram CSS. Entrega duas mudanças visíveis:
   **animação de sobreposições** e **foco visível**.
3. **Node 22 → 24.22.0** (npm 11.19.1) com `.nvmrc` como fonte única, e **Prisma 4.16.2 → 7.10.1** com
   driver adapters (`pg` / `better-sqlite3`) e `prisma.config.ts`. Motivo: Node 22 sai de suporte em
   2027-04-30 (o 24 vai até 2028-04-30); o Prisma 4 não recebe correção desde 2023-06-30.

Nenhuma mudança de API, de domínio, de dados ou de migrations. O Docker fica como está.

## Technical Context

**Language/Version**: TypeScript 5 strict (ESM), **Node 24** (24.22.0 verificado), npm 11
**Primary Dependencies**:

| Pacote     | Antes                                                                     | Depois                                                                                           |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| web        | `next` 15.0.3, React 19 RC, `eslint` 8, `tailwindcss` 3.4, `axios` 1.15.2 | `next` 16.4.2, React 19.3.1, `eslint` 9.39.5, `tailwindcss` 4.3.3 + `@tailwindcss/postcss` 4.3.3 |
| web        | `tailwind-merge` 3.5.0, `@types/react*` ^18, `@types/node` ^20            | `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0, `@types/react*` 19.3.0, `@types/node` ^24        |
| server     | `prisma`/`@prisma/client` ^4.16.2, `@types/node` ^25.3.0                  | `prisma`/`@prisma/client` ^7.10.1 + `@prisma/adapter-pg` e `@prisma/adapter-better-sqlite3`      |
| server     | `tsup` target `node22`                                                    | `tsup` target `node24`; `@types/node` ^24                                                        |
| e2e / raiz | `@types/node` ^22.10.0; `engines` `>=22`                                  | `@types/node` ^24; `engines` `node >=24` (raiz também `npm >=11`)                                |

**Storage**: SQLite (dev/testes/E2E) e PostgreSQL (Docker), **sem migration nova**. Ver
[§ Modelo de dados e contratos](#modelo-de-dados-e-contratos).
**Testing**: Vitest 4 (server unit + integração Supertest/SQLite; web + MSW), Playwright (e2e)
**Target Platform**: Linux (dev e CI); navegadores Safari 16.4+, Chrome 111+, Firefox 128+
**Project Type**: monorepo de pacotes npm separados — API REST (`server/`) + Next.js App Router (`web/`)
**Performance Goals**: transições de sobreposição ≤ 200 ms; `/health` 503 em ~5 s com o banco
inalcançável
**Constraints**: comportamento observável idêntico (fora animação e foco); `npm ci` estrito nos quatro
pacotes; cobertura 100% no server e thresholds por glob no web; `validate:deps` verde; `Dockerfile`
intocado
**Scale/Scope**: 103 arquivos rastreados alterados + 5 novos; ~40 arquivos de apresentação no web,
19 no server (10 testes de integração migrados para um helper)

## Constitution Check

_GATE: reavaliado em 2026-10-17 contra o código da branch._

### Backend (Constitution v1.1.0)

#### ✅ I. Clean Architecture

- **Status**: PASS
- **Evidence**: o Prisma 7 e os adapters ficam em `infrastructure/database/` (`config.ts` e o novo
  `prisma-adapter.ts`); nenhum arquivo de `domain/` ou `application/` mudou. `npm run validate:deps`:
  sem violações.

#### ✅ II. Clean Code

- **Status**: PASS
- **Evidence**: o bloco `new PrismaClient({ datasources })` + `execSync(...)` + `unlinkSync`, repetido em
  10 testes de integração, virou um helper (`tests/helpers/sqlite-test-database.ts`, −158/+70 linhas).
  Os comentários que descreviam o Prisma 4 (`sqlite-url.ts`, `prisma-env.mjs`, `run-e2e.mjs`) foram
  atualizados; nenhum código comentado ficou.

#### ✅ III. Independência de Frameworks

- **Status**: PASS
- **Evidence**: os 11 imports de `@prisma/client` em `src/` continuam restritos a `infrastructure/`
  (generator `prisma-client-js` mantido — research P7); os repositórios não mudaram.

#### ✅ IV. Baixo Acoplamento

- **Status**: PASS
- **Evidence**: `createPrismaAdapter(provider, url)` não lê o `env.ts`, então a aplicação e o harness de
  testes montam o client pelo mesmo ponto sem acoplar o teste à configuração da app. O container
  continua obtendo o client por `getPrismaClient()`.

#### ✅ V. Sustentabilidade e Escalabilidade

- **Status**: PASS
- **Evidence**: só o necessário para as subidas — sem APIs novas do Node 24, sem generator
  `prisma-client`, sem typed SQL/extensions. A versão do Node tem fonte única (`.nvmrc`).

### Frontend (Constitution v1.1.0)

#### ✅ I. Arquitetura Orientada a Domínio

- **Status**: PASS
- **Evidence**: as mudanças de apresentação ficam nos componentes de cada feature e em `shared/`; o
  `ModalGate` mora em `shared/components/Modal.tsx`, usado por `despesas` e `receitas` sem import
  cruzado.

#### ✅ II. Separação entre UI e Lógica

- **Status**: PASS
- **Evidence**: animação e foco são só classes e CSS base; a lógica de abertura/fechamento continua nos
  containers de feature (`DespesasScreen`, `ReceitasScreen`), que passaram a guardar
  `{ modal, isOpen, key, origin }` para o portão. Nenhum hook de feature, service ou contrato mudou.

#### ✅ III. Independência de Framework

- **Status**: PASS
- **Evidence**: `proxy.ts` é o mesmo arquivo do antigo `middleware.ts` com a função renomeada; o
  roteamento continua atrás de `infra/router-adapter.ts` e a sessão de `infra/session.ts`.

#### ✅ IV. Baixo Acoplamento entre Features

- **Status**: PASS
- **Evidence**: `validate:deps` sem violações; nenhum import novo entre features.

#### ✅ V. Sustentabilidade e Simplicidade

- **Status**: PASS, com uma ressalva registrada
- **Evidence**: tokens num único lugar (`@theme`); animações por biblioteca só-CSS em vez de keyframes
  próprios; sem `cva`.
- **Ressalva**: duas supressões comentadas de `react-hooks/set-state-in-effect` (`useMediaQuery`,
  `useAuth`) em vez de refatorar para `useSyncExternalStore` — ver Complexity Tracking.

#### ✅ Development Workflow

- **Status**: PASS
- **Evidence**: lint (0 erros) e Prettier continuam automáticos via lint-staged, agora sobre os arquivos
  staged; o PR leva capturas `main` × branch das telas (exigência de evidência visual para UI).

### Summary

Todos os princípios PASS. Nenhuma violação a justificar; a ressalva de Frontend V está em Complexity
Tracking.

## Modelo de dados e contratos

**Não há `data-model.md` nem `contracts/` nesta feature**, porque nada mudou neles:

- Os models de `server/prisma/schema.prisma` são idênticos; o único diff do arquivo é a remoção da
  linha `url = env("DATABASE_URL")` do datasource, exigida pelo Prisma 7. Nenhuma migration nova ou
  editada em `prisma/sqlite/migrations/` ou `prisma/postgresql/migrations/`.
- O contrato HTTP e o formato do CSV (`specs/006-importar-exportar-dados/contracts/csv-format.md`) não
  mudam. A única diferença observável na API é diagnóstica: no 503 do `/health` por timeout, o campo
  opcional `database.error` passa a trazer a mensagem do driver ("Connection terminated due to
  connection timeout") — campo já previsto em `specs/001-project-base/contracts/health.md`, que o
  Prisma 4 deixava vazio.
- No SQLite, `DateTime` continua gravado como inteiro em milissegundos (research P8).

## Deploy

Cada item abaixo foi conferido no código da branch.

### Versão de Node e npm

- **Node 24** (`.nvmrc` na raiz contém `24`; verificado com 24.22.0) e **npm 11** (verificado com
  11.19.1).
- `engines`: raiz `"node": ">=24", "npm": ">=11"`; `server/`, `web/` e `e2e/` `"node": ">=24"`. Não há
  `engine-strict`: um Node 22 só gera aviso `EBADENGINE`, não bloqueio — mas o projeto só é testado
  no 24.

### Passos de atualização de um ambiente existente

Detalhados no [quickstart.md](./quickstart.md):

1. `nvm install && nvm use` na raiz.
2. `npm ci` nos quatro pacotes: `npm ci && npm ci --prefix server && npm ci --prefix web && npm ci
--prefix e2e` (o `web/` não precisa mais de `--legacy-peer-deps`; `web/.npmrc` foi removido).
3. Gerar o client do Prisma para o provider do ambiente:
   `DATABASE_PROVIDER=sqlite npm run --prefix server prisma:generate` (dev, testes, E2E) ou
   `DATABASE_PROVIDER=postgresql …` (produção). O client gera para **um provider por vez**; client e
   adapter de providers diferentes falham na construção com `PrismaClientInitializationError`.
4. `npm run --prefix server migrate:deploy` — não há migration nova, então num banco já atualizado é
   no-op.
5. Build: `npm run build` (tsup + `next build`), com `NEXT_PUBLIC_API_URL` definido (abaixo).

### Variáveis de ambiente

| Variável                                             | Situação                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_PROVIDER`, `DATABASE_URL`, `NODE_ENV`      | **Inalteradas** (obrigatórias, sem default, validadas em `env.ts`)                                                     |
| `PORT`, `LOG_LEVEL`, `CORS_ORIGIN`                   | **Inalteradas**                                                                                                        |
| `POSTGRES_SHADOW_DATABASE_URL`                       | **Inalterada** (só `migrate:new`/`migrate:check`)                                                                      |
| `NEXT_PUBLIC_API_URL`                                | **Inalterada**, ainda inlined no `next build` — o build precisa rodar com o valor de destino                           |
| `SMAUG_PRISMA_PROVIDER`, `SMAUG_SHADOW_DATABASE_URL` | **Novas, internas**: postas pelo wrapper `scripts/prisma.mjs` para o `prisma.config.ts`; não devem ser definidas à mão |
| `E2E_WEB_MODE`                                       | **Default mudou**: `build` local e no CI (antes `dev` local); `dev` segue opcional                                     |
| `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`        | Exigida **pelo CLI do Prisma 7** só para ações destrutivas sob agente de IA; o projeto não a define nem depende dela   |

`server/.env.example`, `server/.env.docker` e `web/.env.example` não mudaram. `?schema=public` na URL do
PostgreSQL continua aceito (o `pg` o ignora; o schema padrão já é `public`).

### Banco e migrations

- **Nenhuma migration nova**; checksums em `_prisma_migrations` continuam batendo.
- **Nenhuma conversão de dados**: o adapter SQLite grava `DateTime` no mesmo formato do Prisma 4
  (`timestampFormat: "unixepoch-ms"`), e um banco tocado pelo Prisma 7 volta a ser lido pelo 4 em caso
  de rollback.
- `/health` com o PostgreSQL inalcançável: 503 em ~5 s (`connectionTimeoutMillis: 5_000`).

### Docker

- **O que mudou**: nada no `server/Dockerfile`, no `docker-compose.yml` nem no `.env.docker`. A imagem
  foi construída e testada com o Prisma 7: build ok, `migrate:deploy` aplicou as 2 migrations,
  `/health` `healthy` e `POST /users` 201 contra `postgres:16-alpine`, inclusive numa rede sem internet.
  Isso depende de duas escolhas: generator `prisma-client-js` (mantém `node_modules/.prisma`, que o
  `runner` copia) e `prisma.config.ts` dentro de `prisma/` (pasta que o `runner` copia).
- **O que ficou para uma change futura**:
  - a imagem continua em **`node:22-alpine`** (22.22.2, dentro do mínimo do Prisma 7) enquanto local e
    CI usam 24 — e o `server/package.json` declara `>=24`, então o `npm ci` da imagem emite aviso de
    `engines`;
  - a imagem cresceu de **301 MB para 666 MB** (CLI do Prisma 7 no `runner`);
  - ordem do `apk add --no-cache curl openssl` depois do `npm ci --omit=dev` no `runner` (inofensiva no
    Prisma 7, mas fora de lugar);
  - troca para o generator `prisma-client` (muda o `COPY` de `node_modules/.prisma`);
  - não há imagem para o `web/`.

### CI

- `actions/setup-node@v4` lê `node-version-file: .nvmrc` nos três jobs (`ci.yml` principal e
  `migrations`, `e2e.yml`).
- Instalação com `npm ci` por pacote no lugar de `npm run install:all`: o CI agora falha se um lock
  commitado estiver fora de sincronia com o `package.json`.
- `npm run lint` passa a rodar o ESLint CLI no web. `prisma:generate` (SQLite, sem `DATABASE_URL`) e
  `migrate:check` (job `migrations`, Postgres 16) funcionam sem alteração nos workflows.
- O `ci.yml` não roda `next build`; o build de produção do web é exercitado pelo `e2e.yml` (modo
  `build`), que injeta `NEXT_PUBLIC_API_URL`.

### Restrições novas

- **`npx prisma …` direto em `server/` não funciona**: sem `--config` o CLI não acha a config, e a config
  lança erro se `SMAUG_PRISMA_PROVIDER` faltar. Use sempre `npm run --prefix server prisma -- <args>` (ou
  `prisma:generate`, `migrate:deploy`…). O wrapper recusa `--schema` e `--config`.
- **O CLI do Prisma 7 recusa ações destrutivas sob agente de IA** (`db push --force-reset`,
  `migrate reset`) quando detecta variáveis como `CLAUDECODE`, `AI_AGENT`, `CURSOR_AGENT`; exige
  consentimento explícito do usuário em `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. Testes e E2E
  não usam essas ações.
- **`next lint` não existe mais**: o lint do web é `eslint .` (ESLint 9, `web/eslint.config.mjs`); o
  `next build` não roda mais o lint.
- **`next dev` admite uma instância por diretório**: o E2E em modo `dev` exige o `npm run dev` fechado.
- **Navegadores**: Safari 16.4+, Chrome 111+, Firefox 128+.
- **`better-sqlite3` é módulo nativo** e dependência de produção (mesmo na imagem PostgreSQL): num
  ambiente sem prebuild (fora de Node 24 glibc / musl) o `node-gyp` exigiria Python e compilador.
- **npm 11 avisa sobre scripts de instalação** não declarados em `allowScripts` (`prisma`,
  `@prisma/engines`, `better-sqlite3`, `@swc/core`, `esbuild`…); hoje só aviso. `better-sqlite3`
  precisa do script para ter binário.

### Rollback

Reverter os commits. Os do Prisma podem ser revertidos sozinhos, mantendo o Node 24. Não há migration
nova nem mudança de formato de dados; depois de reverter, `npm ci --prefix server` e `prisma:generate`
restauram o client 4. Os locks continuam instaláveis com npm 10 / Node 22.

## Resultados de validação

Node 24.22.0 / npm 11.19.1, client do Prisma gerado para SQLite.

| Verificação                                                        | Resultado                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run --prefix server test:coverage`                            | 101 arquivos, **925 testes**, 100% nas quatro métricas                                                                                                                                                            |
| `npm run --prefix web test:coverage`                               | 123 arquivos, **1250 testes**, thresholds por glob verdes (`proxy.ts` 100%)                                                                                                                                       |
| `npm run test:e2e` (modo `build`)                                  | **96/96**; na etapa Next também 96/96 em modo `dev`                                                                                                                                                               |
| `npm run lint`                                                     | **0 erros, 9 avisos** — todos do web e já existentes antes das três etapas (8 surgiram quando o lint passou a varrer o web todo + 1 antigo)                                                                       |
| `npm run validate:deps`                                            | sem violações                                                                                                                                                                                                     |
| `typecheck` server / web / e2e                                     | verdes                                                                                                                                                                                                            |
| `npm run build` (`NEXT_PUBLIC_API_URL=http://localhost:3000`)      | verde; 10 rotas estáticas + "Proxy (Middleware)"; `git status` limpo após um segundo build                                                                                                                        |
| `migrate:check` contra Postgres 16 descartável                     | verde nos dois dialetos, inclusive com o banco sombra inexistente                                                                                                                                                 |
| Smoke do `dist/` com SQLite e com PostgreSQL 16 (`?schema=public`) | `/health` 200, `POST /users` 201 e 409 `EMAIL_ALREADY_EXISTS`, categoria repetida 409, import CSV 201, export com as linhas; SQLite com `typeof(created_at) = 'integer'`; PostgreSQL inalcançável → 503 em 5,08 s |
| Smoke do proxy (`next start` e `next dev`)                         | `/dashboard` sem cookie → 307 `/login`; com cookie → 200; `/login` com cookie → 307 `/dashboard`                                                                                                                  |
| `NODE_OPTIONS=--trace-deprecation` (dev server + `next start`)     | nenhum `DeprecationWarning`                                                                                                                                                                                       |
| `npm ci` nos quatro locks                                          | sem erro (só avisos de scripts de instalação)                                                                                                                                                                     |
| Navegador (build de produção + Chromium)                           | entrada e saída animadas (saídas em ~115–180 ms), só a camada de cima anima, foco devolvido à origem; com movimento reduzido, `animation-name: none` e modais somem em < 10 ms                                    |
| Capturas `main` × branch (1280 px e 375 px, todas as telas)        | idênticas, exceto placeholder do campo de valor, selo "Vigente" (−2 px) e ~1 px nas tabelas do Dashboard                                                                                                          |
| Docker (fora do escopo, ensaiado)                                  | `Dockerfile` inalterado: build, `migrate:deploy` e `/health` `healthy` offline; 666 MB                                                                                                                            |

**`npm audit`** (lock da `main` × branch depois das atualizações × branch depois do `npm audit fix`):

| Pacote | `main`                                                 | Após as atualizações                  | Após o `audit fix`                 | Produção (`--omit=dev`): `main` → final |
| ------ | ------------------------------------------------------ | ------------------------------------- | ---------------------------------- | --------------------------------------- |
| web    | 21 (1 crítico, 17 altos, 3 moderados) — `next` crítico | 8 altos (`braces`, `undici`, `vite`…) | 5 altos (só `braces`, um advisory) | 7 (1 crítico) → **0**                   |
| server | 24 (1 crítico, 13 altos, 8 moderados, 2 baixos)        | 24 (mesma distribuição)               | **0**                              | 5 (1 crítico) → **0**                   |
| raiz   | 23 (2 críticos, 13 altos, 6 moderados, 2 baixos)       | 10 (7 altos, 3 moderados)             | **0**                              | 5 → **0**                               |
| e2e    | 0                                                      | 0                                     | 0                                  | 0 → 0                                   |

Na etapa Next, o audit do web já tinha caído para 12 (11 altos, 1 moderado); a do Tailwind tirou os que
vinham do `tailwindcss` 3. Depois das três atualizações, um `npm audit fix` sem `--force` nos quatro
pacotes (só lockfiles, dentro das faixas declaradas, sem `overrides`) zerou raiz e server, inclusive o
crítico de produção pré-existente `proxy-addr` (via `express`) e o `source-map-js` trazido pelo CLI do
Prisma 7. No server, `vitest` e `@vitest/coverage-v8` sobem juntos para `^4.1.12` (o coverage exige a
mesma versão exata), o que corrige o `@vitest/mocker`.

**Risco aceito**: os 5 achados restantes do web são um único advisory sem versão corrigida,
`braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, DoS por estouro de pilha com padrões muito aninhados). Chega por
`eslint-config-next` → `@next/eslint-plugin-next`, que fixa `fast-glob` 3.3.1 (→ `micromatch` →
`braces`). É só de desenvolvimento (lint), não roda em produção e os globs vêm da configuração do
próprio projeto. Override não resolve (nenhuma versão de `fast-glob`/`micromatch` deixa de puxar
`braces`) e remover o `eslint-config-next` custaria as regras `@next/next/*`. Revisar quando o plugin
do Next deixar de depender de `fast-glob` ou quando o `braces` publicar correção.

**Pendente**: CI do PR (`ci.yml` com os jobs principal e `migrations`, e `e2e.yml`) — depende da
abertura do PR.

## Project Structure

### Documentation (this feature)

```text
specs/009-upgrades-next16-tailwind4-node24/
├── spec.md               # requisitos (preservação, animação, foco), cenários e critérios
├── plan.md               # este arquivo: contexto, Constitution Check, deploy, validação
├── research.md           # decisões N1–N9, T1–T9, P1–P13, A1–A3 e riscos
├── quickstart.md         # atualizar o ambiente local e validar
├── tasks.md              # tarefas executadas, por etapa
└── checklists/
    └── requirements.md   # qualidade da especificação
```

Sem `data-model.md` e sem `contracts/` (ver [§ Modelo de dados e contratos](#modelo-de-dados-e-contratos)).

### Source Code (repository root)

```text
.nvmrc                                   # novo: "24"
package.json, package-lock.json          # engines; poda de 203 entradas órfãs
.lintstagedrc.js                         # ESLint CLI sobre os arquivos staged do web
.github/workflows/{ci,e2e}.yml           # node-version-file + npm ci por pacote

server/
├── package.json, package-lock.json      # Prisma 7 + adapters, @types/node ^24, engines
├── tsup.config.ts                       # target node24
├── prisma/
│   ├── schema.prisma                    # sem `url` no datasource
│   └── prisma.config.ts                 # novo: config do CLI 7, passada pelo wrapper
├── scripts/prisma.mjs, scripts/lib/prisma-env.mjs   # --config, flags do CLI 7
├── src/infrastructure/
│   ├── config/sqlite-url.ts             # só comentário
│   └── database/{config.ts, prisma-adapter.ts (novo)}
└── tests/
    ├── helpers/sqlite-test-database.ts  # novo
    ├── integration/presentation/*.test.ts        # 10 arquivos migrados para o helper
    └── unit/infrastructure/database/{config,prisma-adapter (novo)}.test.ts

web/
├── package.json, package-lock.json      # Next 16, React 19.3.1, ESLint 9, Tailwind 4, engines
├── eslint.config.mjs (novo)             # substitui .eslintrc.json (removido)
├── .npmrc, tailwind.config.ts           # removidos
├── proxy.ts, proxy.test.ts              # renomeados de middleware.*
├── next.config.ts                       # turbopack.root
├── postcss.config.mjs, app/globals.css  # @tailwindcss/postcss; @theme, tw-animate-css, base de foco/cursor
├── tsconfig.json, vitest.config.ts, .gitignore
├── shared/components/{Modal,Toast,Button,…}.tsx  # animações, ModalGate, foco
├── shared/components/lancamentos/*.tsx           # foco, contornos, placeholder, renomeações v4
├── features/*/components/*.tsx                   # renomeações v4; DespesasScreen/ReceitasScreen com ModalGate
└── tests/{router.tsx, integration/receitas-page.test.tsx}

e2e/
├── package.json, package-lock.json      # @types/node ^24, engines
├── playwright.config.ts, scripts/run-e2e.mjs     # modo build por padrão; db push sem reset
└── src/**, tests/auth/guards.spec.ts    # comentários middleware → proxy

CLAUDE.md, README.md, web/README.md, e2e/README.md, .claude/skills/*  # documentação
```

**Structure Decision**: nenhuma pasta nova além de `server/tests/helpers/` já existente; os arquivos
novos (`prisma.config.ts`, `prisma-adapter.ts`, `eslint.config.mjs`, `.nvmrc`) ficam onde a ferramenta
ou a camada exigem.

## Complexity Tracking

| Decisão                                                 | Por que, e o que foi descartado                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Duas supressões de `react-hooks/set-state-in-effect`    | Sincronização pós-hidratação intencional. `useSyncExternalStore` derrubaria a cobertura de `shared/hooks/**` abaixo de 100% sem testes `node`. |
| ESLint 9 no web e 10 na raiz/server                     | Plugins do `eslint-config-next` 16 declaram peer `eslint ≤ 9`; o 10 traria de volta o `--legacy-peer-deps`.                                    |
| `prisma.config.ts` fora do lugar auto-descoberto        | Na raiz do `server/` a config não chegaria ao `runner` do Docker; todo comando já passa pelo wrapper.                                          |
| Generator depreciado `prisma-client-js`                 | O `prisma-client` quebraria o `COPY` de `node_modules/.prisma` do `Dockerfile`, fora do escopo.                                                |
| `ModalGate` em vez de passar `isOpen` pelos componentes | Animar a saída exige não desmontar o modal; o portão evita tocar ~13 componentes de Ficha/assistente.                                          |

## Follow-ups conhecidos

- **Change de Docker**: `node:24-alpine`; corrigir a ordem do `apk add` no `runner`; reduzir a imagem
  (666 MB — estágio de migração separado ou CLI fora do `runner`); generator `prisma-client` (`output`
  reescrito pelo wrapper, `.gitignore`, imports de `@prisma/client`, detecção do `run-e2e.mjs`, `COPY`
  do `Dockerfile`); atualizar a linha de Docker do `CLAUDE.md`.
- **`braces` no web (risco aceito)**: rever o GHSA-vfj7-8cjw-p6xm quando o `@next/eslint-plugin-next`
  deixar de fixar `fast-glob` ou o `braces` publicar correção.
- Reavaliar o **Node 26** depois de 2026-10-28 (Active LTS).
- Antes de qualquer Prisma 8: conferir se o `prisma-client-js` ainda existe.
- Declarar `allowScripts` (npm 11/12) em `server/` e `web/` quando o npm 12 fixar o bloqueio, com
  `better-sqlite3` obrigatório.
- Opcional: limpar os 9 avisos de lint (inclusive `react-hooks/incompatible-library` em `form.watch()`
  dos assistentes).
- Opcional: reescrever `useMediaQuery` com `useSyncExternalStore`, com teste em ambiente `node`.
- Opcional: aviso `MODULE_TYPELESS_PACKAGE_JSON` do `eslint.config.js` da raiz; `shell: true` só-Windows
  de `e2e/scripts/run-e2e.mjs` (DEP0190).
- Opcional: animação de saída de toasts (exigiria ciclo de vida no `useToast`); regressão visual
  automatizada no Playwright.
