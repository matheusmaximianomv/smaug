# Implementation Plan: Autenticação com e-mail e senha

**Branch**: `010-autenticacao` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-autenticacao/spec.md`

> Plano consolidado a partir da change OpenSpec `autenticacao-email-senha` (proposal, design D1–D12
> e tasks em `openspec/changes/archive/2026-10-18-autenticacao-email-senha/`). O Constitution Check
> abaixo foi feito contra o código da branch, depois da implementação. O PRD, a especificação técnica,
> o spike e o runbook originais ficam só na pasta local `docs/` (não versionada); o que
> deles importa está neste plano, em [research.md](./research.md) e em [deploy.md](./deploy.md).

## Summary

Troca **quem define `req.userId`**: o middleware `extractUser` (que confiava no `X-User-Id`) dá lugar
a `authenticate`, que verifica um access token JWT e confere a sessão no banco. Em volta disso entram
cadastro e login com e-mail e senha (Argon2id + pepper), sessão com refresh token opaco rotativo
(compare-and-set, janela de tolerância de 30 s, detecção de reuso), logout e "sair de todos", rate
limit e checagem de `Origin` nas rotas de `/auth`. O web passa a falar só com a própria origem
(`/api/*`, repassado por um route handler ao `API_ORIGIN` lido em runtime), guarda o access token só
em memória e o refresh num cookie `httpOnly` da origem do web, e renova a sessão em silêncio, uma vez
por aba. Controllers, services e use cases de lançamentos ficam intactos.

## Technical Context

**Language/Version**: TypeScript 5 strict (ESM), Node 24.22 (local, CI e imagem do web); a imagem
da API segue `node:22-alpine` (fora do escopo); React 19, Next.js 16 App Router
**Primary Dependencies**: novas no server — `argon2` (node-argon2, binário musl incluso), `jose`,
`cookie-parser`, `express-rate-limit` (+ `@types/cookie-parser`). Nenhuma nova no web
**Storage**: 3 tabelas novas (`t_password_credentials`, `t_auth_sessions`, `t_refresh_tokens`),
migration `20261018150956_add_authentication` nos dois dialetos; nenhuma transformação de dados. No
navegador: cookie `smaug_refresh` (`httpOnly`, emitido pela API) e `smaug_session=1` (indicador)
**Testing**: Vitest (unit + integração Supertest/SQLite, teste de concorrência também em PostgreSQL
no job `migrations` do CI) no server; Vitest + MSW no web; Playwright no e2e (chromium no CI;
firefox/webkit com `E2E_ALL_BROWSERS`)
**Target Platform**: API REST Express 5 + Next.js servidor (`next start`), atrás de proxy TLS
**Constraints**: corte único (sem convivência com `X-User-Id`); cobertura 100% no server;
`validate:deps` verde com regras novas de biblioteca por camada; atomicidade igual em SQLite e
PostgreSQL sem lock explícito nem SQL cru
**Scale/Scope**: 6 rotas novas (`/auth/{register,login,refresh,logout,logout-all}`, `/users/me`),
2 removidas (`POST /users`, `GET /users/:id`), 9 montagens trocadas para Bearer, 7 use cases,
3 adapters, 3 middlewares, 1 route handler no web, 46 tarefas

## Constitution Check

_GATE: reavaliado em 2026-10-18 contra o código da branch._

### Backend (Constitution v1.1.0)

#### ✅ I. Clean Architecture

- **Status**: PASS
- **Evidence**: entidades (`PasswordCredential`, `AuthSession`, `RefreshToken`), value objects
  (`EmailAddress`, `PasswordPolicy`), portas (`PasswordHasher`, `AccessTokenService`,
  `RefreshTokenGenerator`, `PasswordCredentialRepository`, `AuthSessionRepository`,
  `AuthEventLogger`) e os 7 use cases vivem em `domain/`; adapters em `infrastructure/auth/` e
  `infrastructure/database/repositories/`; HTTP em `presentation/`. `npm run validate:deps` verde.
- **Compliance**: as regras novas `auth-crypto-only-in-infra` (`argon2`/`jose` só em
  `server/src/infrastructure`) e `http-middleware-libs-only-in-presentation`
  (`cookie-parser`/`express-rate-limit` só em `server/src/presentation`) foram provadas vermelhas
  com um import proibido temporário. Furo pré-existente e conhecido: o dependency-cruiser não
  resolve o alias `@src/*` (sem `options.tsConfig`), então imports por alias escapam das regras de
  camada — não introduzido por esta feature.

#### ✅ II. Clean Code

- **Status**: PASS
- **Evidence**: um `execute` por use case, "agora" lido uma vez por execução, `SessionPolicy` em ms
  calculada só no container; os schemas Zod de entrada reaproveitam `EmailAddress`/`PasswordPolicy`
  por `superRefine`, então a mensagem do 400 é a do domínio e a regra tem uma fonte só. Código morto
  removido: `CreateUserUseCase`, `UserRepository.create`, `extract-user.middleware.ts`,
  `POST /users`, `GET /users/:id`, handler MSW de `/users/:id`.

#### ✅ III. Independência de Frameworks

- **Status**: PASS
- **Evidence**: o domínio só conhece portas; nenhum tipo de Express, Prisma, `argon2` ou `jose`
  entra nele. Os adapters recebem a configuração tipada (`authConfig`) pelo construtor e não leem
  `env.ts`. O cookie é detalhe do `AuthController`: o `AuthService` devolve o refresh em claro e a
  expiração sem saber que cookie existe.

#### ✅ IV. Baixo Acoplamento

- **Status**: PASS
- **Evidence**: a fatia de auth no `container.ts` segue o ritmo adapters → repositórios → use cases
  → service → controller, fiada à mão como o resto. `req.userId` continua sendo o contrato da
  identidade (D-09 da especificação), então nenhum controller de lançamentos mudou. A sessão é
  independente do método de login (`authMethod`), preparando provedores externos sem tabela nova.

#### ✅ V. Sustentabilidade e Escalabilidade

- **Status**: PASS (com limite declarado)
- **Evidence**: YAGNI — HS256 em vez de chave assimétrica (emissor e verificador são o mesmo
  processo); nenhuma tabela de identidade externa; faxina de sessões no login em vez de job.
- **Limite**: rate limit em memória vale para uma instância (NFR-007); escalar horizontalmente
  exige store compartilhado (fora do escopo).

### Frontend (Constitution v1.1.0)

#### ✅ I. Arquitetura Orientada a Domínio

- **Status**: PASS
- **Evidence**: telas, hooks, service e schemas de autenticação em `features/auth`; sessão, refresh
  e cliente HTTP em `infra/`, porque o interceptor precisa da renovação e `infra` não importa
  `features`.

#### ✅ II. Separação entre UI e Lógica

- **Status**: PASS
- **Evidence**: `LoginForm`/`RegisterForm` só apresentam e validam; bootstrap, login, logout,
  `safeDestination` e `isEmailTaken` moram em `useAuth`/`useRegister`; HTTP só em `AuthService` e
  `infra/`. Nenhum componente usa `apiClient`.

#### ✅ III. Independência de Framework

- **Status**: PASS
- **Evidence**: navegação pelo `router-adapter` e `navigation.ts` (seam de teste); nenhum hook de
  negócio importa `next/navigation`. `login/page.tsx` é Server Component que só lê `searchParams` e
  passa `next` por prop.

#### ✅ IV. Baixo Acoplamento entre Features

- **Status**: PASS — e corrige um desvio anterior
- **Evidence**: `Sidebar` e `AppShell` deixaram de importar `useAuth` de `features/auth` (inversão
  `shared → features` registrada no Constitution Check da 008); recebem `user`, `onLogout` e
  `onLogoutAll` por props, e quem chama `useAuth` é o layout cliente de `app/(app)`.

#### ✅ V. Sustentabilidade e Simplicidade

- **Status**: PASS
- **Evidence**: o repasse é um único route handler de ~90 linhas, sem BFF; `NEXT_PUBLIC_API_URL`
  removido de código, `.env*` e `test.env`; sem `cva`; sem estado global além do token em memória
  do módulo `session.ts`.

### Summary

**Overall Status**: ✅ PASS — sem desvios abertos de constituição; um desvio anterior (`shared →
features/auth`) corrigido.

## Project Structure

### Documentation (this feature)

```text
specs/010-autenticacao/
├── spec.md
├── plan.md                  # este arquivo (inclui o spike do repasse /api)
├── research.md              # decisões D1–D12 com alternativas
├── data-model.md            # tabelas, entidades, estados e transições
├── deploy.md                # publicação, segredos, migração da conta, rotações, rollback
├── contracts/
│   ├── api-auth.md          # rotas /auth/*, /users/me, erros, cookie, rate limit
│   ├── env.md               # variáveis de server, web e e2e
│   └── web-session.md       # repasse /api, cookies, renovação, guarda de rotas
├── checklists/
│   ├── requirements.md
│   └── deploy.md
└── tasks.md

openspec/specs/autenticacao/{conta-e-senha,sessao,acesso-a-api,sessao-no-navegador}/spec.md
openspec/specs/lancamentos/consulta-api/spec.md      # delta: resumos anuais exigem Bearer
# (PRD, especificação técnica, spike e runbook originais: só na pasta local docs/, não versionada)
```

### Source Code (repository root)

```text
server/
├── prisma/schema.prisma                              # PasswordCredential, AuthSession, RefreshToken
├── prisma/{sqlite,postgresql}/migrations/20261018150956_add_authentication/
├── src/domain/value-objects/{email-address,password-policy}.value-object.ts
├── src/domain/entities/{password-credential,auth-session,refresh-token}.entity.ts
├── src/domain/ports/{password-hasher,access-token-service,refresh-token-generator,
│                     password-credential.repository,auth-session.repository,auth-event-logger}.ts
├── src/domain/ports/user.repository.ts               # createWithPasswordCredential (create removido)
├── src/domain/errors/domain-error.ts                 # INVALID_CREDENTIALS, INVALID_REFRESH_TOKEN,
│                                                     # REFRESH_TOKEN_CONFLICT; EmailAlreadyExists movido
├── src/domain/use-cases/auth/                        # register, login, start, refresh, revoke,
│                                                     # revoke-all, authenticate-request
├── src/application/dtos/auth.dto.ts                  # registerSchema, loginSchema, AuthSessionResult
├── src/application/services/{auth,user}.service.ts   # UserService só getProfile
├── src/infrastructure/auth/{argon2-password-hasher,jose-access-token-service,
│                            crypto-refresh-token-generator}.ts
├── src/infrastructure/config/{env,auth-config,container}.ts
├── src/infrastructure/database/repositories/prisma-{auth-session,password-credential,user}.repository.ts
├── src/infrastructure/http/server.ts                 # app.set("trust proxy") se configurado
├── src/infrastructure/logging/logger.ts              # redact
├── src/presentation/middlewares/{authenticate,require-trusted-origin,rate-limit}.middleware.ts
├── src/presentation/controllers/{auth,user}.controller.ts
├── src/presentation/routes/{auth,user,index}.routes.ts
├── tests/integration/presentation/auth*.test.ts      # + 9 arquivos migrados para Bearer
├── tests/integration/infrastructure/database/repositories/   # repositórios + concorrência
├── .env.example, .env.docker, docker-compose.yml
└── (removidos) extract-user.middleware.ts, use-cases/user/create-user.use-case.ts

web/
├── app/api/[...path]/route.ts (+ route.test.ts)      # repasse de mesma origem
├── app/(app)/layout.tsx                              # client; chama useAuth
├── app/(auth)/{login,cadastro}/page.tsx
├── proxy.ts                                          # smaug_session + ?next=
├── infra/{session,auth-refresh,api-client,api-error}.ts
├── features/auth/{components,hooks,services,types}/
├── shared/components/{Sidebar,AppShell}.tsx          # user/onLogout/onLogoutAll por props
├── tests/msw/{base.ts,handlers/auth.ts}, tests/session.ts, vitest.config.ts
├── Dockerfile, .env.docker, .env.example
└── (removido) tests/msw/handlers/users.ts

e2e/
├── playwright.config.ts, scripts/run-e2e.mjs, src/global-setup.ts, src/config/env.ts
├── src/api/seed-client.ts, src/fixtures/test.ts
└── tests/auth/{cadastro,login,guards,sessao}.spec.ts, tests/smoke.spec.ts

.dependency-cruiser.js, .github/workflows/{ci,e2e}.yml, CLAUDE.md, .claude/skills/*
```

**Structure Decision**: monorepo existente (server + web + e2e), sem pacote novo; o web ganha
imagem Docker própria.

## Decisões (resumo; detalhe e alternativas em [research.md](./research.md))

| ID  | Decisão                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Portas em `domain/ports`, adapters em `infrastructure/auth` com configuração pelo construtor; use cases em `domain/use-cases/auth`; dependency-cruiser restringe as libs por camada                       |
| D2  | Argon2id via `argon2`, pepper como `secret` (K) do Argon2, chaveiro versionado (`PASSWORD_PEPPERS` + `PASSWORD_PEPPER_CURRENT_ID`), NFKC, um Argon2 em todo login (dummy), política 12–128 só no cadastro |
| D3  | Access JWT HS256 com `jose` (`typ at+jwt`, `kid` atual + anterior, `clockTolerance` 5 s); refresh opaco de 32 bytes, banco guarda SHA-256 hex com índice único                                            |
| D4  | Sessão = família de tokens; toda requisição confere a sessão (uma leitura), preenchendo `req.userId` e `req.sessionId`                                                                                    |
| D5  | Rotação atômica por compare-and-set (`updateMany` sessão → token → `create` do sucessor com `parent_token_id UNIQUE`) numa `$transaction`; sem lock; revogação toca a sessão antes dos tokens             |
| D6  | Mesma origem: `/api/*` do web repassado à API por **route handler** (o `rewrites()` reprovou no spike); `API_ORIGIN` lido em runtime; `TRUST_PROXY` obrigatório fora de dev/test                          |
| D7  | Web: access token só em memória, `smaug_session` como dica para o `proxy.ts`, renovação single-flight em `infra/auth-refresh.ts`; só 401 na renovação encerra                                             |
| D8  | Retorno à rota pretendida por `?next=`, aceito só se começar com `/` e não com `//` nem `/\`                                                                                                              |
| D9  | `Sidebar`/`AppShell` recebem usuário e ações por props; "Sair de todos os dispositivos" no menu                                                                                                           |
| D10 | Segredos em `server/.env.secrets` (600, não versionado); web só com `API_ORIGIN`; `NEXT_PUBLIC_API_URL` removido                                                                                          |
| D11 | Três erros de domínio novos + três de middleware (`UNAUTHORIZED`, `ORIGIN_NOT_ALLOWED`, `TOO_MANY_REQUESTS`), todos em `web/infra/api-error.ts`; Pino com `redact`; eventos `auth.*`                      |
| D12 | Corte único (server + web + e2e juntos) e migração da conta do dono por CSV; migration aditiva sem transformação de dados                                                                                 |

## Spike do repasse `/api` (tarefa 1.1, decide D6)

Executado em 2026-10-18 com Next.js 16.4.2 e Node 24.22.0. Montagem: uma API descartável em
`node:http` (fora do repo) em duas instâncias, **A** (`127.0.0.1:4100`) e **B** (`127.0.0.1:4200`),
cada uma respondendo com o próprio nome; rotas que emitem **dois** `Set-Cookie`, servem um CSV de 125
bytes com BOM, `;`, CRLF e não-ASCII (com `Content-Disposition`), recebem um upload `text/csv` e
ecoam método, URL, IP do socket e cabeçalhos. O web foi construído com `API_ORIGIN` = A
(`next build`) e iniciado com `API_ORIGIN` = B (`next start`): se a requisição chega em B, o destino
foi resolvido no start.

| #   | Hipótese                                                | `rewrites()` em `next.config.ts`                                              | Route handler `app/api/[...path]/route.ts`                               |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| H1  | `Set-Cookie` intacto, inclusive com mais de um          | passa                                                                         | passa (reanexados um a um com `getSetCookie()`)                          |
| H2  | `X-Forwarded-For` com o IP do cliente; `Origin` mantido | **falha**: `Origin` chega, `X-Forwarded-For` não (só `x-forwarded-host`)      | passa (com a ressalva abaixo)                                            |
| H3  | Destino lido de `API_ORIGIN` no start, não no build     | **falha**: o destino fica gravado em `.next/routes-manifest.json`; foi para A | passa: foi para B; nenhum arquivo de `.next/` contém o endereço do build |
| H4  | CSV de ida e volta byte a byte, com BOM                 | passa                                                                         | passa (também com `Content-Encoding: gzip` na origem)                    |

**Decisão**: pelo critério de D6 basta uma falha; o route handler passou nas quatro e é a
implementação adotada. `next.config.ts` não tem `rewrites()`.

Características do route handler (todas cobertas por `web/app/api/[...path]/route.test.ts`):
`runtime = "nodejs"`, `dynamic = "force-dynamic"`; `API_ORIGIN` lido **a cada requisição** (ausente →
500 sem corpo; não dá para exigir no build, porque o destino só existe no start); destino montado de
`request.url` (preserva `%2F`/`%20`); remove os cabeçalhos de salto (`connection`, `keep-alive`,
`proxy-*`, `te`, `trailer`, `transfer-encoding`, `upgrade`, `host`, `content-length`) na ida e na
volta, mais `content-encoding` na volta (o `fetch` já descomprime); `redirect: "manual"`,
`cache: "no-store"`; corpo da resposta repassado como stream; API inalcançável → 502 sem corpo. O
`proxy.ts` exclui `api` do `matcher`, então o repasse não passa pelo guarda de rotas.

**Ressalva sobre `X-Forwarded-For` (vale para qualquer repasse pelo Next)**: quem preenche o
cabeçalho é o próprio Next, antes do handler, e só **se o cliente não o enviou**
(`x-forwarded-for ??= socket.remoteAddress`). Se o cliente enviou, o valor dele chega à API, e o
handler não tem acesso ao socket para corrigir. Com `TRUST_PROXY` confiando no salto do Next, o
Express usa a entrada mais à direita — correta quando o Next não recebe `X-Forwarded-For` de fora ou
está atrás de um proxy que o **sobrescreve** com o IP real. Exposto direto à internet, o cliente forja
o IP e escapa do rate limit por IP. É requisito de publicação, não de código: como o cookie `Secure`
já exige HTTPS e o `next start` não termina TLS, a publicação já pressupõe um proxy TLS na frente,
que precisa sobrescrever o cabeçalho ([deploy.md § 2](./deploy.md#2-requisito-proxy-reverso-com-tls-na-frente-do-web)).
Verificado no compose local: sem proxy, um `X-Forwarded-For` forjado escapou do limite de cadastro;
atrás de nginx com `proxy_set_header X-Forwarded-For $remote_addr`, o 11º cadastro levou 429 mesmo
variando o cabeçalho.

## Deploy

O procedimento completo, versionado, está em [deploy.md](./deploy.md) e a lista de conferência em
[checklists/deploy.md](./checklists/deploy.md). Em resumo:

- **Segredos** em `server/.env.secrets` (permissão 600, não versionado pela regra `.env.*`):
  `DATABASE_URL`, `JWT_SECRET`, `JWT_KEY_ID`, `PASSWORD_PEPPERS`, `PASSWORD_PEPPER_CURRENT_ID`, cada
  segredo gerado com `openssl rand -base64 32`; **backup do pepper separado do backup do banco**.
  Sem o arquivo o compose não sobe; incompleto, o `env.ts` derruba a API.
- **Variáveis novas**: no server, as de JWT, pepper, Argon2, cookie, rate limit e `TRUST_PROXY`
  (obrigatória fora de dev/test); no web, só `API_ORIGIN` (runtime). Tabela em
  [contracts/env.md](./contracts/env.md).
- **Dois cenários** com a mesma imagem do web: mesma máquina (compose com `api` sem porta publicada,
  `web` em `127.0.0.1:8080`, sub-rede `10.250.0.0/24` = `TRUST_PROXY`) ou máquinas diferentes
  (`API_ORIGIN=https://<api>`, `TRUST_PROXY` com o IP do servidor do web).
- **Proxy reverso TLS** na frente do web, sobrescrevendo `X-Forwarded-For`: obrigatório.
- **Migration** `add_authentication` aplicada por `migrate:deploy` na partida do container.
- **Migração da conta do dono por CSV**: exportar na versão anterior → pré-checagem SQL → deploy →
  renomear o e-mail antigo para `antigo-<id>@invalid.local` → cadastrar → importar → conferir.
- **Rollback**: server e web voltam juntos; tabelas novas podem ficar; desfazer a renomeação.
- **Rotação** da chave JWT (com `JWT_PREVIOUS_*` por um TTL do access token) e do pepper (chaveiro +
  rehash no login).
- **Lançamento público** só depois da change de recuperação de senha.

## Complexity Tracking

| Decisão                                    | Por que, e o que foi descartado                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repasse `/api` pelo servidor do Next       | Cookie `httpOnly` da própria origem, sem depender de domínio compartilhado nem de cookie de terceiro. Custo: um salto a mais e o web como servidor.  |
| Janela de tolerância de 30 s               | Duas abas renovando juntas não se derrubam. Custo: reuso dentro da janela não é detectado como ataque (o atacante só recebe 409, nenhum token).      |
| Conferência da sessão em toda requisição   | Logout vale na hora, não em 10 min. Mesmo custo do `extractUser` antigo (uma leitura).                                                               |
| Teste de concorrência também em PostgreSQL | A garantia do CAS no Postgres (reavaliação do `WHERE` após o lock da linha) passa a ser testada, não só argumentada; roda no job `migrations` do CI. |

## Known Issues

- **`X-Forwarded-For` forjável com o web exposto direto** — limitação do Next, mitigada pelo
  requisito de proxy TLS (acima). Não há correção de código possível no route handler.
- **`migrate:deploy` roda antes da validação do `env.ts`** na partida do container: uma subida com
  `.env.secrets` incompleto (mas com `DATABASE_URL`) aplica as migrations e só então falha.
  Inofensivo para esta migration (aditiva).
- **Pepper antigo preso por contas inativas**: um pepper só sai do chaveiro quando nenhuma credencial
  o usa; contas que nunca mais entram exigem redefinição de senha pelo operador
  ([deploy.md § 9](./deploy.md#9-rotação-do-pepper)).
- **Furo do dependency-cruiser com `@src/*`** — pré-existente (ver Constitution Check I).
