# Smaug

Sistema de Gestão Financeira Pessoal — API REST em Clean Architecture (`server/`)
e interface Next.js (`web/`), com suíte E2E própria (`e2e/`).

Identificadores de código e payloads da API são em inglês; specs, documentação,
mensagens de commit e textos da UI são em português.

## Tech Stack

| Camada      | Tecnologias                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Server**  | Node.js 22 (ESM), TypeScript 5 strict, Express 5, Prisma 4 (SQLite em dev, PostgreSQL-ready), tsyringe, Zod 4, Pino, tsup         |
| **Web**     | Next.js 15 (App Router), React 19 RC, Tailwind 3, TanStack Query 5, axios, React Hook Form + Zod, lucide-react, Radix dialog/tabs |
| **Testes**  | Vitest 4 (server e web), Supertest, Testing Library, MSW 2, Playwright                                                            |
| **Tooling** | ESLint 10, Prettier, Husky, lint-staged, dependency-cruiser 17                                                                    |

## Estrutura do Projeto

```
server/                 # API em Clean Architecture
  src/{domain,application,infrastructure,presentation}/
  prisma/               # schema, migrations
  tests/{unit,integration,helpers}/
  Dockerfile  docker-compose.yml
  package.json

web/                    # Next.js 15 (App Router)
  app/                  # (auth)/{login,cadastro}  (app)/{dashboard,receitas,despesas,categorias,historico}
  features/             # auth, dashboard, receitas, despesas, categorias, historico
  shared/               # primitivos de UI, hooks e libs
  infra/                # api-client, session, router-adapter, query-client
  tests/                # harness do Vitest (MSW, fixtures, renderWithProviders)
  package.json

e2e/                    # Playwright (caixa-preta, fala só HTTP)
  package.json

docs/prototipo/         # protótipo visual — NÃO é código de produção
specs/                  # artefatos Spec Kit (001…005)
.specify/               # constituição e templates do Spec Kit
.github/workflows/      # CI
.husky/                 # hooks git
.lintstagedrc.js  .dependency-cruiser.js  eslint.config.js
package.json            # scripts de orquestração e devDeps globais
```

> **Não é npm workspaces.** `server/`, `web/` e `e2e/` têm `package.json`,
> lockfile e `node_modules` próprios — daí existir o `install:all`.

## Instalação

```bash
npm run install:all      # raiz + server + web + e2e (quatro lockfiles)
```

Depois configure os ambientes:

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

Ajuste `DATABASE_PROVIDER` e `DATABASE_URL` conforme necessário.

> ⚠️ **`web/` exige `--legacy-peer-deps`.** O React está fixado num prerelease
> (`19.0.0-rc-…`) e `^19.0.0` não casa com prerelease no semver do npm. Sem a
> flag o npm instala uma árvore **sem os peers** — foi assim que
> `@testing-library/dom` e `jest-dom` sumiram e quebraram o `vitest.setup.ts`.
> Já está fixado em `web/.npmrc`; não instale em `web/` contornando esse arquivo.

## Desenvolvimento

```bash
npm run dev              # API (3000) + web (3001) juntos
npm run dev:server       # só a API  (tsx watch)
npm run dev:web          # só o Next.js
```

| Serviço | Porta  |
| ------- | ------ |
| API     | `3000` |
| Web     | `3001` |

As portas são fixas: `web/package.json` roda `next dev -p 3001` e
`next start -p 3001`. A web fala com a API pela `NEXT_PUBLIC_API_URL`, que o
Next **inlina em tempo de build** — um `next build` precisa já ter o valor certo.

Rotas da aplicação: `/login` e `/cadastro` (públicas); `/dashboard`, `/receitas`,
`/despesas`, `/categorias` e `/historico` (protegidas pelo `web/middleware.ts`).

## Testes

```bash
npm test                              # server, depois web
npm run test:server                   # Vitest (unit + integração, com Supertest)
npm run test:web                      # Vitest + jsdom + Testing Library + MSW

npm run --prefix server test:unit     # filtram por caminho
npm run --prefix server test:integration
npm run --prefix web test:watch
npm run --prefix web test:coverage    # catraca de cobertura por glob

npm run e2e:install-browsers          # uma vez por máquina
npm run test:e2e                      # cria um SQLite exclusivo do run, roda, descarta
npm run test:e2e:ui
npm run test:e2e:report
```

O pacote `e2e/` sobe a stack em portas próprias (API 3100, web 3101) para nunca
tocar no `dev.db`. Detalhes em [`e2e/README.md`](./e2e/README.md).

## Build

```bash
npm run build            # tsup (server) e depois next build (web)
npm run build:server
npm run build:web
```

## Validação e Qualidade

```bash
npm run validate:deps            # regras de arquitetura (server, web e e2e)
npm run lint                     # eslint (server) + next lint (web)
npm run format                   # prettier no repositório
npm run --prefix server typecheck
npm run --prefix web typecheck
npm run --prefix e2e typecheck
```

`npm run validate:deps` é o enforcement das regras de arquitetura, via
`.dependency-cruiser.js` na raiz:

- `domain` e `application` não podem importar `infrastructure` nem `presentation`;
- `server/` e `web/` não podem se importar em nenhuma direção;
- `e2e/` não importa código de `server/` nem de `web/` (é caixa-preta);
- ciclos são **warning**, não erro.

> Use sempre o script da **raiz**. O `npm run --prefix server validate:deps`
> aponta para um `server/.dependency-cruiser.cjs` que não existe.

## Prisma (Backend)

```bash
npm run --prefix server prisma:generate     # roda prisma:prepare e depois generate
DATABASE_PROVIDER=postgresql npm run --prefix server prisma:generate
npm run --prefix server migrate:deploy      # aplica migrations
```

> ⚠️ `scripts/prisma-prepare.mjs` **reescreve o `datasource` dentro do
> `prisma/schema.prisma` versionado** a partir de `$DATABASE_PROVIDER` (default
> `postgresql`; `memory` vira `sqlite`). Isso aparece como diff no arquivo —
> esperado, mas não commite uma troca acidental de provider. O schema rastreado
> está em `sqlite`, e o E2E falha de propósito se não estiver.

## Docker (Backend)

```bash
cd server && docker compose up --build
```

Sobe a API junto de um `postgres:16-alpine`, lendo `server/.env.docker`. A
imagem roda `migrate:deploy` antes de subir e expõe um healthcheck em `/health`.
Não há imagem para o `web/`.

## CI

`.github/workflows/ci.yml` roda lint, typecheck, `validate:deps` e a suíte
Vitest. `.github/workflows/e2e.yml` roda o Playwright em chromium e publica o
relatório como artefato.

## Fluxo de Commit

Branches seguem `###-feature-name`; commits seguem Conventional Commits.

No commit, o Husky executa o lint-staged da raiz (`.lintstagedrc.js`):

| Padrão                 | Ação                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `server/**/*.{ts,tsx}` | `npm run --prefix server lint -- --fix` + `prettier --write` |
| `web/**/*.{ts,tsx}`    | `npm run --prefix web lint` + `prettier --write`             |
| `e2e/**/*.ts`          | `prettier --write`                                           |
| `*.{json,md}`          | `prettier --write`                                           |

> O comando do `web/` roda **sem `--fix`** e sem receber os arquivos
> individualmente: `next lint` não aceita caminhos com parênteses, como
> `app/(app)` e `app/(auth)`.

## Documentação

- [`CLAUDE.md`](./CLAUDE.md) — arquitetura, convenções e armadilhas conhecidas.
- [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) — documento
  normativo; vence a prática ad-hoc.
- [`e2e/README.md`](./e2e/README.md) — como a switch de SQLite do E2E funciona.
- [`web/README.md`](./web/README.md) — estrutura e convenções do frontend.
- [`specs/`](./specs) — spec, plano e tarefas de cada feature.
