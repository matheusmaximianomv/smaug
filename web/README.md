# Smaug — Web

Frontend em **Next.js 16 (App Router)** e React 19. Consome a API REST de
`server/` pelo repasse de mesma origem `app/api/[...path]/route.ts` — a única rota
de API daqui, que não tem lógica própria.

Rode os comandos a partir desta pasta ou com `--prefix web` da raiz.

## Comandos

```bash
npm run dev                 # next dev -p 3001
npm run build               # next build
npm run start               # next start -p 3001
npm run lint                # eslint . (ESLint 9, config flat em eslint.config.mjs)
npm run typecheck           # tsc --noEmit

npm test                    # vitest run (uma passada)
npm run test:watch
npm run test:unit           # tudo, menos tests/integration
npm run test:integration    # só as páginas
npm run test:coverage
```

A porta é **3001**, fixa nos scripts. A API responde em `3000`.

## Ambiente

`API_ORIGIN` é a única variável necessária: o endereço da API para onde o route
handler `app/api/[...path]/route.ts` repassa `/api/*` (`/api/auth/login` →
`${API_ORIGIN}/auth/login`). O navegador só fala com a origem do web, então o
cookie do refresh fica na origem do web e não há CORS.

```bash
cp .env.example .env.local   # API_ORIGIN=http://localhost:3000
```

É variável de **servidor** (sem `NEXT_PUBLIC_`): não vai para o bundle e é lida a
cada requisição pelo `next start`, então a mesma build serve a qualquer destino e
trocá-la não exige rebuild. Ausente, cada chamada a `/api` responde 500; API
inalcançável, 502. Na imagem Docker vem de `.env.docker` (`http://api:3000`).

> ⚠️ **`X-Forwarded-For`.** O repasse encaminha o `X-Forwarded-For` como o Next o
> preenche, e a API usa esse IP no rate limit do login. Com o `next start` exposto
> direto à internet, o cliente manda o próprio `X-Forwarded-For` e forja o IP. Em
> qualquer publicação, ponha na frente um proxy reverso (com TLS) que
> **sobrescreva** o cabeçalho, e deixe o web ouvindo só onde esse proxy alcança.

> A instalação é estrita (`npm ci`, sem flags): com o React 19 estável todos os
> peers casam. Não reintroduza flag que relaxe os peers — ela escondia uma árvore
> sem peers que já quebrou o `vitest.setup.ts` por falta de `@testing-library/dom`.

## Estrutura

```
app/            App Router
  (auth)/       login, cadastro            — layout próprio
  (app)/        dashboard, receitas, despesas, categorias, historico
  api/[...path] repasse /api/* → API_ORIGIN
  layout.tsx  providers.tsx  page.tsx      — page.tsx só faz redirect("/login")
features/       auth, dashboard, receitas, despesas, categorias, historico
                cada uma com components/ hooks/ services/ types/
shared/         components/ (Button, Modal, Toast, MonthNavigator, lancamentos/, …)
                hooks/ (useToast, useDebounce, useMediaQuery)  lib/  types/
infra/          api-client, api-error, session, auth-refresh, navigation, router-adapter, query-client
tests/          harness do Vitest — MSW, fixtures, renderWithProviders
proxy.ts        guarda de rotas server-side (o antigo middleware da Next 15)
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

Login por e-mail e senha (`/login`, `/cadastro`). A API devolve um access token
curto e grava o refresh token rotativo no cookie `httpOnly` **`smaug_refresh`**
(`Path=/api/auth`), que nenhum script da página lê.

`infra/session.ts` guarda só o que o navegador precisa:

- o **access token, em memória** (variável de módulo — nunca em cookie,
  `localStorage` ou `sessionStorage`): `getAccessToken` / `setSession` /
  `clearSession`. Recarregar a página o perde, e a sessão volta por uma renovação;
- o **indicador `smaug_session=1`**, cookie sem segredo lido por `hasSessionHint` e
  pelo `proxy.ts` no servidor, que protege `(app)` (mandando para
  `/login?next=<rota>`) e devolve quem já tem sessão para fora de `(auth)`.

`infra/auth-refresh.ts` faz a renovação (`POST /api/auth/refresh`) em
**single-flight**: chamadas simultâneas na aba recebem a mesma promessa. 409 é
repetido uma vez; 401 apaga o indicador **antes** de redirecionar, o que impede o
laço `/login` ↔ `/dashboard` quando o indicador diverge do estado real.

`infra/api-client.ts` é a única instância axios (`baseURL: "/api"`): injeta
`Authorization: Bearer <access token>` e, num 401 fora de `/auth/*`, renova uma vez
e refaz a requisição. **Só uma renovação recusada com 401 encerra a sessão** — falhas
de rede e 5xx são transitórias e não deslogam o usuário.

`infra/api-error.ts` traduz os códigos de erro da API para mensagens em pt-BR.

## Estado de servidor

**TanStack Query v5.** Os hooks por feature seguem um formato fixo: uma query key
`const QK = [...]` no nível do módulo, `useQuery` com `staleTime: 30_000`, e
`useMutation`s que invalidam (`qc.invalidateQueries({ queryKey: QK })`) e disparam
um `toast` de `@/shared/hooks/useToast`. Veja
`features/categorias/hooks/useCategories.ts` como referência.

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
métricas em `shared/lib`, `infra`, `proxy.ts`, `shared/hooks`,
`shared/components`, `features/*/services`, `features/*/hooks` e
`features/*/components`. `app/**` tem um piso menor de branches, documentado no
próprio arquivo.

As armadilhas já mapeadas (NBSP no `formatCurrency`, `window.location`
não-configurável no jsdom, fila global do `useToast`, entre outras) estão na
seção de testes do [`CLAUDE.md`](../CLAUDE.md) — leia antes de escrever testes.
