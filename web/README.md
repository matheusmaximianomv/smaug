# Smaug — Web

Frontend em **Next.js 15 (App Router)** e React 19 RC. Consome a API REST de
`server/`; não há rotas de API aqui (`app/api/` não existe).

Rode os comandos a partir desta pasta ou com `--prefix web` da raiz.

## Comandos

```bash
npm run dev                 # next dev -p 3001
npm run build               # next build
npm run start               # next start -p 3001
npm run lint                # next lint
npm run typecheck           # tsc --noEmit

npm test                    # vitest run (uma passada)
npm run test:watch
npm run test:unit           # tudo, menos tests/integration
npm run test:integration    # só as páginas
npm run test:coverage
```

A porta é **3001**, fixa nos scripts. A API responde em `3000`.

## Ambiente

`NEXT_PUBLIC_API_URL` é a única variável necessária.

```bash
cp .env.example .env.local
```

> ⚠️ O Next **inlina** a variável em tempo de build. Um `next build` feito com o
> valor errado não se corrige em runtime — é preciso rebuildar.

> ⚠️ **Instale sempre com `--legacy-peer-deps`.** O React está fixado num
> prerelease (`19.0.0-rc-…`) e `^19.0.0` não casa com prerelease no semver do
> npm; sem a flag o npm instala uma árvore sem os peers e o `vitest.setup.ts`
> quebra por falta de `@testing-library/dom`. Já está fixado em `.npmrc`.

## Estrutura

```
app/            App Router
  (auth)/       login, cadastro            — layout próprio
  (app)/        dashboard, receitas, despesas, categorias, historico
  layout.tsx  providers.tsx  page.tsx      — page.tsx só faz redirect("/login")
features/       auth, dashboard, receitas, despesas, categorias, historico
                cada uma com components/ hooks/ services/ types/
shared/         components/ (Button, Modal, DataTable, Toast, MonthNavigator, …)
                hooks/ (useToast, useDebounce, useMediaQuery)  lib/  types/
infra/          api-client, api-error, session, navigation, router-adapter, query-client
tests/          harness do Vitest — MSW, fixtures, renderWithProviders
middleware.ts   guarda de rotas server-side
```

A fonte é **Plus Jakarta Sans**, carregada por `<link>` no `app/layout.tsx`.

## Regras de arquitetura

Estas regras vêm da constituição do projeto
([`.specify/memory/constitution.md`](../.specify/memory/constitution.md)) e
valem sobre a prática ad-hoc.

**Camadas, em uma direção só:**

```
UI (components)  →  hooks  →  services  →  infra
```

- Componentes são apresentacionais; a lógica de negócio e o estado vivem nos hooks.
- Services só falam com o mundo externo.
- **Componentes não chamam `apiClient` diretamente.**

**Imports cross-feature são proibidos.** Compartilhe via `@/shared` ou `@/infra`.
A regra é verificada por `npm run validate:deps` na raiz.

Aliases (declarados em `tsconfig.json` **e** `vitest.config.ts`): `@/` → `web/`,
`@/features`, `@/shared`, `@/infra`.

**APIs do Next são encapsuladas.** Hooks de negócio não usam `useRouter` nem
`useSearchParams` de `next/navigation` — passam por `infra/router-adapter.ts`.

**Server Components por padrão**; `"use client"` apenas para interatividade,
estado, efeitos ou APIs de browser.

## Sessão e autenticação

Não há senha nem JWT: a API identifica o usuário pelo header `X-User-Id`.

O **cookie `userId` é a fonte única de verdade**, lido por `infra/session.ts`
(`getUserId` / `setUserId` / `clearUserId`) e pelo `middleware.ts` no servidor,
que protege `(app)` e devolve quem já está autenticado para fora de `(auth)`.

> Não reintroduza uma cópia em `localStorage`. Manter dois stores permitia que
> divergissem — cookie presente com `localStorage` vazio colocava o app num laço
> infinito entre `/login` e `/dashboard`.

`infra/api-client.ts` é a única instância axios: injeta o `X-User-Id` no
request e, **somente em 401**, limpa a sessão e chama `redirectToLogin()`. Falhas
de rede e 5xx são transitórias e não deslogam o usuário.

`infra/api-error.ts` traduz os códigos de erro da API para mensagens em pt-BR.

## Estado de servidor

**TanStack Query v5.** Os hooks por feature seguem um formato fixo: uma query key
`const QK = [...]` no nível do módulo, `useQuery` com `staleTime: 30_000`, e
`useMutation`s que invalidam (`qc.invalidateQueries({ queryKey: QK })`) e disparam
um `toast` de `@/shared/hooks/useToast`. Veja
`features/despesas/hooks/useInstallments.ts` como referência.

Os defaults globais (retry, backoff, `gcTime`) estão em `infra/query-client.ts`.

## Convenções

- Hooks `useX`; services `XService` (objeto simples de funções async); tipos em
  `features/<f>/types`.
- Formulários com React Hook Form + `@hookform/resolvers` e schemas Zod em
  `types/schemas.ts`.
- Ícones de `lucide-react`. Os primitivos de UI são feitos à mão com Tailwind +
  `class-variance-authority` / `tailwind-merge` — **não** há biblioteca de
  componentes como dependência.

## Testes

Vitest + jsdom + Testing Library, com **MSW** interceptando HTTP para que os
interceptors reais do axios sejam exercitados.

- Testes unitários e de componente ficam **ao lado do fonte**
  (`shared/lib/competence.test.ts`).
- Testes de página ficam em `tests/integration/` — eles importam de mais de uma
  feature, o que dentro de uma feature violaria a proibição de cross-feature.
- `vitest.setup.ts` cobre as lacunas do jsdom 29 (`matchMedia`,
  `ResizeObserver`, pointer capture), o ciclo de vida do MSW e o `afterEach`
  global.
- O harness compartilhado está em `tests/` (`renderWithProviders`, fixtures,
  handlers do MSW).

A cobertura tem **catraca por glob** no `vitest.config.ts`: 100% nas quatro
métricas em `shared/lib`, `infra`, `middleware.ts`, `shared/hooks`,
`shared/components`, `features/*/services`, `features/*/hooks` e
`features/*/components`. `app/**` tem um piso menor de branches, documentado no
próprio arquivo.

As armadilhas já mapeadas (NBSP no `formatCurrency`, `window.location`
não-configurável no jsdom, fila global do `useToast`, entre outras) estão na
seção de testes do [`CLAUDE.md`](../CLAUDE.md) — leia antes de escrever testes.
