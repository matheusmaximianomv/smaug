---
description: "Task list for email + password authentication"
---

# Tasks: Autenticação com e-mail e senha

**Input**: Design documents from `/specs/010-autenticacao/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, deploy.md

> As 46 tarefas da change OpenSpec `autenticacao-email-senha` (`openspec/changes/archive/
2026-10-18-autenticacao-email-senha/tasks.md`, itens 1.1–11.2), renumeradas no formato Spec Kit.
> Server: testes em inglês e cobertura 100%; web e e2e: testes em pt-BR. As fases 6–9 só vão para
> `main` juntas (corte único, D12). Todas estão concluídas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 conta e login · US2 sessão contínua · US3 API com Bearer · US4 logout ·
  US5 resistência a ataques · US6 publicação e migração
- Entre parênteses, o id da tarefa OpenSpec de origem

---

## Phase 1: Spike do repasse `/api` e base de configuração

**Purpose**: decidir o repasse antes de qualquer código do web; deixar a API exigindo os segredos.

- [x] T001 [US6] Spike do repasse: `rewrites()` em `web/next.config.ts` × route handler `web/app/api/[...path]/route.ts`, contra uma API descartável que emite dois `Set-Cookie`, ecoa `Origin`/`X-Forwarded-For` e serve/recebe CSV; H1–H4 com `next build` + `next start` mudando `API_ORIGIN` só no start. Resultado: `rewrites()` reprovou H2/H3; route handler adotado ([plan.md § Spike](./plan.md#spike-do-repasse-api-tarefa-11-decide-d6)) (1.1)
- [x] T002 [P] Adicionar `argon2`, `jose`, `cookie-parser`, `express-rate-limit` (+ `@types/cookie-parser`) ao `server/package.json`; `typecheck` e `build` (argon2 externo no tsup) (1.2)
- [x] T003 [US6] Estender `server/src/infrastructure/config/env.ts` e criar `auth-config.ts` (segredos obrigatórios sem padrão, base64 ≥ 32 bytes, chaveiro `id:base64`, pepper vigente no chaveiro, pisos de Argon2 fora de `test`, `AUTH_COOKIE_SECURE` por `NODE_ENV`, `TRUST_PROXY` obrigatório fora de dev/test) exportando `authConfig`; casos novos em `env.test.ts` (1.3)
- [x] T004 Atualizar `server/.env.example` (valores marcados como inseguros, `openssl rand -base64 32`), o `server/.env` local e os `env:` de `.github/workflows/{ci,e2e}.yml` com segredos de teste (1.4)

**Checkpoint**: `npm run --prefix server test` verde com o env de teste.

## Phase 2: Domínio de autenticação

- [x] T005 [P] [US1] Value object `EmailAddress` (trim + minúsculas, formato, ≤ 254), usado por `User.create` (2.1)
- [x] T006 [P] [US1] `PasswordPolicy` (12–128 code points após NFKC, sem trim); testes 11/12/128/129, NFKC e espaços (2.2)
- [x] T007 [US2] [US4] Entidades `PasswordCredential` (`create`, `withNewHash`), `AuthSession` (`start`, `isActive`, `revoke`, `rehydrate`) e `RefreshToken` (`issue` com `expiresAt = min(ttl, sessão)`, `isExpired`, `rotatedWithin`) e `SessionRevocationReason`; bordas `now == expiresAt`, borda da janela, copy-on-write (2.3)
- [x] T008 Portas `PasswordHasher`, `AccessTokenService`, `RefreshTokenGenerator`, `PasswordCredentialRepository`, `AuthSessionRepository`; `UserRepository.createWithPasswordCredential` (2.4)
- [x] T009 [P] `InvalidCredentialsError`, `InvalidRefreshTokenError`, `RefreshTokenConflictError` em `domain/errors/domain-error.ts` e as entradas pt-BR em `web/infra/api-error.ts` (+ `ORIGIN_NOT_ALLOWED`, `TOO_MANY_REQUESTS`) (2.5)

## Phase 3: Adapters de infraestrutura

- [x] T010 [P] [US1] [US5] `infrastructure/auth/argon2-password-hasher.ts` (pepper como `secret`, chaveiro por `pepperId`, NFKC, `needsRehash`, dummy hash, pepper desconhecido → erro de configuração); testes com a biblioteca real e parâmetros mínimos (PHC `$argon2id$v=19$`, salts distintos, pepper errado, rehash, hash corrompido, `"ﬁ"`/`"fi"`) (3.1)
- [x] T011 [P] [US3] `infrastructure/auth/jose-access-token-service.ts` (HS256 fixo, `typ at+jwt`, `iss`/`aud`, claims obrigatórias, `kid` atual + anterior, `clockTolerance` 5 s, `verify` → `null`); round-trip, expirado, outra chave, `alg: none`, HS512/RS256, `typ`/`iss`/`aud` errados, claim ausente, `kid` anterior aceito e desconhecido recusado, payload sem PII (3.2)
- [x] T012 [P] [US2] `infrastructure/auth/crypto-refresh-token-generator.ts` (32 bytes base64url, SHA-256 hex); tamanho 43, hash determinístico, unicidade (3.3)
- [x] T013 Regras `auth-crypto-only-in-infra` e `http-middleware-libs-only-in-presentation` no `.dependency-cruiser.js`; verde e, com import proibido temporário, vermelho (3.4)

## Phase 4: Persistência

- [x] T014 [US2] `PasswordCredential`, `AuthSession`, `RefreshToken` no `server/prisma/schema.prisma` e `migrate:new -- add_authentication` (`20261018150956`); `migrate:check` verde nas duas pastas (4.1)
- [x] T015 [US1] `PrismaPasswordCredentialRepository` e `PrismaUserRepository.createWithPasswordCredential` (transação única; P2002 em `email` → `EmailAlreadyExistsError`), removendo `create`; rollback do usuário quando a credencial falha (4.2)
- [x] T016 [US2] [US4] `PrismaAuthSessionRepository` (`create`, `findSessionById`, `findTokenByHash`, `rotate` por CAS, `revokeSession`/`revokeAllForUser` sessão antes dos tokens, `deleteStaleForUser`); filho duplicado por `parentTokenId` falha (4.3)
- [x] T017 [US5] Teste de concorrência parametrizado por provider (10 `rotate` simultâneos → um `true`; `rotate` × `revokeSession` → nenhum token `ACTIVE` em sessão `REVOKED`, sem deadlock), em SQLite local e PostgreSQL no job `migrations` do CI (4.4)

## Phase 5: Casos de uso e service

- [x] T018 [US1] [US5] `RegisterWithPasswordUseCase` e `LoginWithPasswordUseCase` (dummy verify, rehash tolerante a falha); `CreateUserUseCase` removido (5.1)
- [x] T019 [US2] [US4] [US5] `StartSessionUseCase` (faxina), `RefreshSessionUseCase` (todos os ramos), `RevokeSessionUseCase`, `RevokeAllSessionsUseCase`, `AuthenticateRequestUseCase`; reuso fora da janela revoga e loga `warn`; dentro, 409 sem revogar; CAS perdido → releitura (5.2)
- [x] T020 `application/dtos/auth.dto.ts` (`registerSchema`, `loginSchema`, `AuthSessionResponseDto`) e `application/services/auth.service.ts` (`register`, `loginWithPassword`, `refresh`, `logout`, `logoutAll`); senha só com teto no login (5.3)

## Phase 6: HTTP, container e troca de `extractUser`

- [x] T021 [US3] [US5] `authenticate.middleware.ts` (module augmentation `userId`/`sessionId`), `require-trusted-origin.middleware.ts`, limitadores (`express-rate-limit`, 429 com `Retry-After`); `app.set("trust proxy", TRUST_PROXY)` em `server.ts` (6.1)
- [x] T022 [US1] [US4] `AuthController` (cookie com atributos injetados; apaga em 401, mantém em 409) e `routes/auth.routes.ts` (`cookieParser` só no sub-router, `requireTrustedOrigin`, limitadores por rota); `user.routes.ts` só com `GET /me`; `describeControllerContract` + casos de cookie (6.2)
- [x] T023 [US3] Fatia de auth no `container.ts` (exporta `authController` e `authenticateRequestUseCase`); as 9 montagens de `routes/index.ts` com um único `authenticateMiddleware`; removidos `extract-user.middleware.ts`, `POST /users`, `GET /users/:id` e código morto (6.3)
- [x] T024 [P] [US5] `redact` no Pino (`logger.ts`) e eventos `auth.*`; teste do `redact` e integração com coletor de logs sem senha, tokens ou `Set-Cookie` (6.4)
- [x] T025 [US1] [US2] [US4] [US5] `tests/integration/presentation/auth.test.ts` (passeio completo, um teste por código de erro, cookie, corpo idêntico em e-mail inexistente × senha errada, corrida de cadastro 201/409, 10 refreshes simultâneos, hashes no banco, rate limit com e sem `TRUST_PROXY`) + `auth-refresh-reuse`, `auth-rate-limit`, `auth-rate-limit-proxy`, `auth-logs`; `user.test.ts` para `/users/me` e rotas removidas (6.5)
- [x] T026 [US3] Migrar os 9 testes de integração de `X-User-Id` para Bearer obtido em `POST /auth/register` no `beforeAll` (inclui os 401 dos resumos anuais); `sessionId` padrão no `createRequestMock`; cobertura 100% (6.6)
- [x] T027 [P] Skills `server-http`, `server-testes`, `server-erros-dominio` e seções Auth/Env/HTTP do `CLAUDE.md`; `grep` sem `X-User-Id`/`extractUser` (6.7)

**Checkpoint**: `npm run --prefix server test` com 100% de cobertura; `typecheck`, `lint`, `validate:deps`.

## Phase 7: Web — infra e repasse

- [x] T028 [US6] Route handler `web/app/api/[...path]/route.ts` com `API_ORIGIN` de servidor e `route.test.ts`; `NEXT_PUBLIC_API_URL` removido do código, do `test.env` e dos `.env*` (7.1)
- [x] T029 [US2] `infra/session.ts` (`getAccessToken`/`setSession`/`clearSession`/`hasSessionHint`, apaga o cookie `userId`) e `infra/auth-refresh.ts` (single-flight por aba); uma renovação para N chamadas, 409 → nova tentativa (7.2)
- [x] T030 [US2] `infra/api-client.ts` (`baseURL: "/api"`, Bearer, 401 fora de `/auth/*` → renova → refaz 1×; refresh 401 → `clearSession` + `redirectToLogin`; rede/5xx não encerra); `isInvalidSessionError` só 401 (7.3)
- [x] T031 [US2] `proxy.ts` com `smaug_session` e `?next=`; sem indicador → `/login?next=`, com indicador em `/login` → `/dashboard` (7.4)
- [x] T032 Harness do web: `tests/msw/base.ts` (origem do jsdom + `/api`), handlers `/auth/*` e `/users/me` (sem `GET /users/:id`), `tests/session.ts` (`loginAs`), `harness.test.tsx` (7.5)
- [x] T033 [P] Skill `web-infra` e seção Frontend do `CLAUDE.md`; `grep` sem `NEXT_PUBLIC_API_URL`/`X-User-Id` (7.6)

## Phase 8: Web — telas de autenticação e menu

- [x] T034 [US1] `features/auth/types` (`loginSchema {email, password}`, `registerSchema` com confirmação e 12–128) e `services/AuthService.ts` (`register`, `login`, `logout`, `logoutAll`, `getMe`) (8.1)
- [x] T035 [US1] [US2] [US4] `hooks/useAuth.ts` (bootstrap por renovação com indicador, `login`, `logout`/`logoutAll` que limpam mesmo com a API fora, `safeDestination`) e `hooks/useRegister.ts` (8.2)
- [x] T036 [US1] `LoginForm.tsx` e `RegisterForm.tsx` (sem "copie seu ID", link "Entrar" no 409); `web/tests/integration/login-page.test.tsx` com `INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`, `TOO_MANY_REQUESTS` (8.3)
- [x] T037 [US4] `user`, `onLogout`, `onLogoutAll` por props a `Sidebar`/`AppShell` a partir do layout de `app/(app)`; "Sair de todos os dispositivos" no menu; `test`, `lint`, `typecheck` do web (8.4)

## Phase 9: E2E

- [x] T038 [US6] `e2e/scripts/run-e2e.mjs` e `global-setup.ts`: segredos de teste, web com `API_ORIGIN` do run, sonda por `POST /auth/register` (9.1)
- [x] T039 `SeedClient` (`register`/`login` com senha, Bearer) e fixture (login via API, cookie `smaug_refresh` no domínio do web com `path: "/api/auth"` e `httpOnly`, mais `smaug_session`); `smoke.spec.ts` (9.2)
- [x] T040 [US1] [US2] [US4] `tests/auth/{cadastro,login,guards}.spec.ts` reescritos e `sessao.spec.ts` novo (duas abas recarregadas juntas, logout numa aba derrubando a outra, "sair de todos", `?next=`, renovação silenciosa real com access token de 20 s, recarga em `/despesas`) (9.3)
- [x] T041 [P] Skill `testes-e2e` (seed com senha, cookie de refresh na fixture) (9.4)

## Phase 10: Publicação e operação

- [x] T042 [US6] `web/Dockerfile` (multi-stage, `node:24-alpine`, `next build` + `next start`) e `web/.env.docker` (só `API_ORIGIN`); `docker build` e container respondendo com `API_ORIGIN` trocado só no `docker run` (10.1)
- [x] T043 [US6] `server/docker-compose.yml` (`env_file: [.env.docker, .env.secrets]`, serviço `web`, porta da API não publicada, sub-rede fixa e `TRUST_PROXY`) e parâmetros não secretos em `server/.env.docker`; `docker compose up` com login, renovação e logout pelo web; falha sem `.env.secrets` (10.2)
- [x] T044 [US6] Runbook (segredos, rotações, revogação administrativa, perda do pepper, pré-checagem SQL, migração por CSV e renomeação do e-mail antigo) executado contra o compose local; versão versionada em [deploy.md](./deploy.md); seção Docker do `CLAUDE.md` (10.3)

## Phase 11: Verificação integrada

- [x] T045 `npm run lint`, `npm run --prefix {server,web,e2e} typecheck`, `npm run validate:deps`, `npm run test` e `npm run test:e2e` na raiz, todos verdes (11.1)
- [x] T046 [US6] Conferência manual com web e API em origens diferentes, em vários navegadores, e o critério 14 do PRD (11.2) — ver abaixo

---

## Verificação realizada

### Suítes automatizadas (T045)

- **Server**: unit + integração Supertest/SQLite com cobertura 100%; teste de concorrência do
  `PrismaAuthSessionRepository` em SQLite localmente e em PostgreSQL no job `migrations` do CI;
  `migrate:check` verde nos dois dialetos.
- **Web**: Vitest + MSW (infra, hooks, componentes, `route.test.ts` do repasse e integração de
  página do login), thresholds por glob atendidos.
- **E2E**: Playwright com o repasse real, access token de 20 s (a renovação silenciosa acontece de
  verdade durante a suíte) e as specs de `tests/auth/`.
- **Arquitetura**: `validate:deps` verde, com as duas regras novas de biblioteca por camada.

### Navegadores e origens diferentes (T046, critérios SC-005–SC-010 e SC-016)

| Navegador                       | Como                                                                                                  | Resultado |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| Chrome (Chromium do Playwright) | Conferência manual guiada: cadastro, login, recarga, renovação, logout, sair de todos                 | ok        |
| Firefox (Playwright)            | Suíte e2e de auth, inclusive com a API em outra origem (`E2E_API_HOST=127.0.0.1`, web em `localhost`) | ok        |
| WebKit (Playwright)             | Idem                                                                                                  | ok        |

Com a API em `127.0.0.1` e o web em `localhost` (origens diferentes), o navegador só falou com a
origem do web, e login, renovação e logout funcionaram nos três motores. **Safari real não foi
usado**: o WebKit do Playwright é o substituto registrado.

### Critério 14 — migração por CSV (SC-014)

Um CSV exportado pela `main` (versão anterior, `X-User-Id`) com **173 linhas** foi importado numa
conta nova da versão nova e **reexportado idêntico** — comparação feita sem a coluna `serie_id`, que
o import descarta e regenera por definição (o `serie_id` do arquivo só agrupa linhas entre si). As
séries, versões e parcelas foram, portanto, reproduzidas.

### Operação (T042–T044)

Todos os procedimentos de [deploy.md](./deploy.md) foram executados contra o compose local; o
registro está em [deploy.md § Registro de execução](./deploy.md#registro-de-execução-2026-10-18).

## Workflow follow-up

- PR de `010-autenticacao` para `main` com server, web e e2e juntos.
- Migrar a conta do dono em produção seguindo [deploy.md § 7](./deploy.md#7-corte-e-migração-da-conta-do-dono)
  e a [checklist de deploy](./checklists/deploy.md).
- Próxima change: recuperação e troca de senha (condição para abrir o cadastro a terceiros).
