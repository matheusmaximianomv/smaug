# Smaug Monorepo

Estrutura reorganizada para separar a API (`server/`) da aplicação Next.js (`web/`), mantendo ferramentas compartilhadas na raiz.

## Tech Stack

- **Server**: Node.js 22 (ESM), TypeScript 5.x (strict), Express 5, Prisma, tsyringe, Vitest, Supertest, Pino.
- **Web**: Next.js 15 (App Router), React 19 RC, Tailwind CSS, TypeScript.
- **Tooling**: ESLint, Prettier, Husky, lint-staged, dependency-cruiser.

## Estrutura do Projeto

```
server/                 # API em Clean Architecture
  src/
  prisma/
  tests/
  package.json

web/                    # Next.js 15
  app/
  features/
  infra/
  shared/
  package.json

specs/                  # Artefatos Speckit
.husky/                 # Hooks git
.lintstagedrc.json
.dependency-cruiser.js
package.json            # Scripts de orquestração e devDeps globais
```

## Instalação

```bash
npm run install:all
```

Depois da instalação, configure ambientes:

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

Atualize `DATABASE_PROVIDER` e `DATABASE_URL` para o backend conforme necessário.

## Desenvolvimento

- Subir API e Web juntos:

  ```bash
  npm run dev
  ```

- Apenas API:

  ```bash
  npm run dev:server
  ```

- Apenas Next.js:

  ```bash
  npm run dev:web
  ```

API responde em `http://localhost:3000`. Next.js usa a porta 3000 quando livre ou cai para 3001 se a API estiver ativa.

## Testes

```bash
npm test                 # executa server + web
npm run test:server      # somente API (Vitest)
npm run test:web         # somente Next.js
```

## Build

```bash
npm run build            # build server + web
npm run build:server
npm run build:web
```

## Validação e Qualidade

- Regras de dependência (evita importações cruzadas entre server/web e alerta ciclos):

  ```bash
  npm run validate:deps
  ```

- Lint & format globais:

  ```bash
  npm run lint
  npm run format
  ```

Husky + lint-staged executam estes comandos nos arquivos staged antes dos commits.

## Prisma (Backend)

```bash
npm run --prefix server prisma:prepare
npm run --prefix server prisma:generate
```

Para trabalhar com PostgreSQL:

```bash
DATABASE_PROVIDER=postgresql npm run --prefix server prisma:prepare
DATABASE_PROVIDER=postgresql npm run --prefix server prisma:generate
```

O modo `memory` usa SQLite internamente para facilitar testes.

## Next.js (Frontend)

Página inicial padrão exibe:

```
Smaug
Sistema de Gestão Financeira Pessoal
Interface em construção
```

Use `npm run dev:web` e acesse `http://localhost:3000` (ou porta fallback) para conferir.

## Fluxo de Commit

1. Instale dependências com `npm run install:all`.
2. Desenvolva usando os scripts root (`dev`, `test`, `build`).
3. Ao commitar, Husky executa lint-staged:
   - `server/**/*.{ts,tsx}` → `npm run --prefix server lint -- --fix` + `prettier --write`
   - `web/**/*.{ts,tsx}` → `npm run --prefix web lint -- --fix` + `prettier --write`
   - `*.{json,md}` → `prettier --write`

Consulte `specs/` para instruções detalhadas de cada feature.
