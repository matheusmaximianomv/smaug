# Research: Autenticação com e-mail e senha

**Feature**: [spec.md](./spec.md) | **Fonte**: design da change OpenSpec `autenticacao-email-senha`
(D1–D12) e a especificação técnica local (na pasta `docs/`, não versionada — o necessário está resumido
aqui)

Cada decisão segue o formato Decisão · Razão · Alternativas descartadas. Onde o documento e o código
divergiram, este arquivo descreve o código.

## Ponto de partida verificado no código

- `extractUser(userRepository)` era montado por grupo de rota em `presentation/routes/index.ts` (9
  montagens) e só preenchia `req.userId`; os controllers usam `req.userId!`. Já fazia uma leitura de
  banco por requisição.
- `POST /users` e `GET /users/:id` eram abertos. A corrida `findByEmail`→`create` do cadastro virava
  500 (P2002 não tratado).
- Ids `String @id` sem `@default` (a entidade gera o UUID); estados como `String`, sem enum.
  `$transaction` interativo já era usado (`PrismaDataImportRepository`).
- `env.ts` valida com Zod no import e encerra o processo se falhar; `server/.env.docker` é
  versionado.
- A imagem da API usa `node:22-alpine`: `node:crypto.argon2` (Node 24.7+) não está disponível onde a
  aplicação roda em produção.
- Web: o `userId` vivia num cookie legível; `api-client.ts` injetava `X-User-Id` e, em 401, limpava o
  cookie; `isInvalidSessionError` tratava 401 e 404; `proxy.ts` já excluía `api` do `matcher`;
  `Sidebar`/`AppShell` importavam `useAuth` de `features/auth`.

## D1 — Portas em `domain/ports`, adapters em `infrastructure/auth`

- **Decisão**: portas `PasswordHasher`, `AccessTokenService`, `RefreshTokenGenerator`,
  `PasswordCredentialRepository`, `AuthSessionRepository` e `AuthEventLogger` em `domain/ports/`;
  `UserRepository` ganha `createWithPasswordCredential` e perde `create`. Adapters
  `Argon2PasswordHasher`, `JoseAccessTokenService`, `CryptoRefreshTokenGenerator` recebem a
  configuração (`authConfig`) pelo construtor. Use cases em `domain/use-cases/auth/`; o
  `AuthService` orquestra "autenticar → abrir sessão". Regras novas no `.dependency-cruiser.js`:
  `argon2`/`jose` só em `server/src/infrastructure/`; `cookie-parser`/`express-rate-limit` só em
  `server/src/presentation/`.
- **Razão**: os use cases deste projeto vivem em `domain` e só dependem de `domain/ports`;
  configuração por construtor deixa os unit tests usarem parâmetros baratos sem `process.env`.
- **Alternativas**: portas em `application/ports` (onde está o `Logger`) — quebraria a regra de que
  use cases só dependem de `domain`. O `AuthEventLogger` é uma porta mínima no domínio, satisfeita
  estruturalmente pelo `Logger` de `application/ports`.

## D2 — Senha: Argon2id via `argon2`, pepper como `secret`

- **Decisão**: pacote `argon2` (node-argon2), Argon2id, PHC, salt de 16 bytes; o pepper entra como
  `secret` (parâmetro K da RFC 9106). Chaveiro versionado `PASSWORD_PEPPERS=id:base64,…` +
  `PASSWORD_PEPPER_CURRENT_ID`, com `pepper_id` em coluna própria. Senha normalizada com NFKC antes
  de hash e verify. Login executa **um** Argon2 em todos os caminhos (`verifyAgainstDummy` para
  usuário inexistente ou sem credencial; o hash dummy é gerado no construtor). `needsRehash` compara
  parâmetros e pepper; rehash tolerante a falha. Padrões 64 MiB / t=3 / p=4; fora de `test`, pisos
  OWASP (19456 KiB, t=2); em `test`, só o mínimo do Argon2 (8 KiB por faixa).
- **Razão**: `argon2` traz binário musl (roda na imagem Alpine), `needsRehash` e `secret` tipado.
  Pepper versionado permite rotação sem perder as credenciais antigas.
- **Política no login**: o `loginSchema` aplica só o teto de 128 code points (e o formato do
  e-mail) — limite contra abuso do custo do Argon2, não a política; senhas curtas seguem para a
  verificação normal e recebem `INVALID_CREDENTIALS`, sem revelar nada da conta.
- **Alternativas**: `@node-rs/argon2` (equivalente; plano B local ao adapter); `node:crypto.argon2`
  (indisponível no runtime da API); HMAC prévio da senha com o pepper (uma etapa a mais para errar
  quando a biblioteca já aceita o segredo); bcrypt/scrypt (Argon2id é a recomendação atual da OWASP).

## D3 — Access JWT HS256 com `jose`; refresh opaco com SHA-256

- **Decisão**: access token `typ: at+jwt`, claims `iss`/`aud`/`sub`/`sid`/`jti`/`iat`/`exp`, sem PII,
  `kid` no cabeçalho com chave atual + anterior opcional (rotação), `algorithms: ["HS256"]` fixo,
  `clockTolerance` 5 s; `verify` devolve `null` em qualquer falha. Refresh: 32 bytes aleatórios em
  base64url (43 caracteres); o banco guarda `hex(SHA-256)` com índice único.
- **Razão**: emissor e verificador são o mesmo processo; o estado do refresh precisa ser consultado
  de qualquer forma (rotação, reuso, revogação). 256 bits de entropia dispensam hash lento e permitem
  busca por índice.
- **Alternativas**: RS256/EdDSA (só fazem sentido com verificador terceiro; YAGNI, troca local ao
  adapter); `jsonwebtoken` (CommonJS, histórico de confusão de algoritmo); refresh JWT (auto-suficiência
  que não se paga, mais um segredo); Argon2 do refresh (desnecessário e impediria o índice).

## D4 — Sessão = família de tokens; toda requisição confere a sessão

- **Decisão**: `AuthSession` (uma por login) com cadeia de `RefreshToken` via `parentTokenId`. O
  middleware `authenticate` verifica o JWT e lê a sessão (`AuthenticateRequestUseCase`), preenchendo
  `req.userId` e `req.sessionId`; a module augmentation de `express-serve-static-core` mora em
  `authenticate.middleware.ts`. `authenticateIfPresent` (usado só no logout) identifica sem exigir.
- **Razão**: logout e revogação valem na requisição seguinte, ao mesmo custo do `extractUser`.
- **Alternativas**: JWT stateless (logout só valeria em até 10 min); tabela de "família" separada da
  sessão (dois conceitos para a mesma coisa); `req.auth.userId` (mexeria em todos os controllers).

## D5 — Rotação atômica por compare-and-set, sem lock

- **Decisão**: `PrismaAuthSessionRepository.rotate` numa `$transaction` interativa: (1) `updateMany`
  da sessão `WHERE status='ACTIVE' AND expires_at > now` (toca `last_used_at`); (2) `updateMany` do
  token `WHERE status='ACTIVE' AND expires_at > now` → `ROTATED`; (3) `create` do sucessor com
  `parent_token_id UNIQUE`. `count ≠ 1` ou P2002 → rollback → `false`. `revokeSession` toca a sessão
  antes dos tokens (mesma ordem de lock, sem deadlock). O `RefreshSessionUseCase` decide:
  `ROTATED` dentro da janela (30 s, borda inclusiva) → 409; fora → revoga a família
  (`REFRESH_TOKEN_REUSE`) + `warn`; CAS perdido → relê o token e decide igual.
- **Razão**: no PostgreSQL a segunda transação espera o lock da linha e reavalia o `WHERE` (0
  linhas); no SQLite as escritas são serializadas; o `UNIQUE` é a rede de segurança estrutural.
  Funciona igual nos dois sem SQL cru. A política de reuso revoga **só a família** (o vazamento é
  daquele dispositivo), não todas as sessões do usuário.
- **Verificação**: teste de concorrência parametrizado por provider (10 `rotate` simultâneos → um
  `true`; `rotate` × `revokeSession` → nenhum token `ACTIVE` em sessão `REVOKED`), em SQLite
  localmente e em PostgreSQL no job `migrations` do CI (`POSTGRES_TEST_DATABASE_URL`).
- **Alternativas**: `SELECT … FOR UPDATE` (SQL cru, inexistente no SQLite); sem janela de tolerância
  (duas abas recarregando juntas se derrubariam); devolver o mesmo sucessor na corrida (exigiria
  guardar o refresh em claro).

## D6 — Mesma origem: `/api` do web repassado à API

- **Decisão**: o navegador chama só `<web>/api/*`; um route handler do Next
  (`web/app/api/[...path]/route.ts`) repassa para `API_ORIGIN`, variável de servidor lida em **tempo
  de execução** (a mesma imagem serve aos dois cenários de publicação). O cookie `smaug_refresh`
  (`HttpOnly; Secure; SameSite=Strict; Path=/api/auth`) é emitido pela API e, pelo repasse, fica sendo
  cookie do web. A API mantém o `cors()` e usa `CORS_ORIGIN` também em `requireTrustedOrigin`;
  `TRUST_PROXY` (obrigatório fora de dev/test; `true` recusado) faz o rate limit ver o IP do cliente.
- **Razão**: cookie `httpOnly` sem depender de domínio compartilhado nem de cookie de terceiro.
- **Spike**: `rewrites()` reprovou H3 (destino congelado no build) e H2 (sem `X-Forwarded-For`); o
  route handler passou H1–H4. Ressalva do `X-Forwarded-For` e detalhes em
  [plan.md § Spike](./plan.md#spike-do-repasse-api-tarefa-11-decide-d6).
- **Alternativas**: refresh em `localStorage` (exfiltrável por XSS ou dependência comprometida por até
  30 dias); cookie da API com `SameSite=None` (cookie de terceiro: Safari bloqueia, Firefox isola);
  BFF completo guardando os tokens no Next (mais código sem ganho sobre o repasse); `rewrites()`
  (reprovado no spike).

## D7 — Web: token em memória, renovação single-flight em `infra/`

- **Decisão**: `infra/session.ts` expõe `getAccessToken`/`setSession`/`clearSession`/`hasSessionHint`;
  o token vive numa variável de módulo; `smaug_session=1` (`path=/`, `SameSite=Lax`, 30 dias) é só
  dica para o `proxy.ts`; o cookie legado `userId` é apagado no carregamento. `infra/auth-refresh.ts`
  tem uma promessa de renovação por aba (axios puro, não `apiClient`): 409 → espera 250 ms e tenta uma
  vez; 401 → `clearSession()` **antes** de `redirectToLogin()`; rede/5xx → rejeita sem encerrar. O
  `api-client` (`baseURL: "/api"`, sem `withCredentials`) aguarda uma renovação em voo antes de
  enviar, grava o token enviado e, num 401 fora de `/auth/*`, refaz com o token atual se ele mudou
  desde o envio; senão renova e refaz uma vez. `isInvalidSessionError` passa a considerar só 401.
- **Razão**: `infra` não pode importar `features`, e o interceptor precisa da renovação; uma renovação
  por aba evita que N chamadas expiradas gerem N rotações (e falsos reusos).
- **Alternativas**: token em `sessionStorage` (legível por script); renovação proativa por timer
  (renova sem necessidade e ainda precisa do caminho reativo).

## D8 — Retorno à rota pretendida

- **Decisão**: o `proxy.ts` acrescenta `?next=<pathname+search>` ao mandar para `/login` (sem `next`
  na raiz); depois do login, `safeDestination` aceita só caminhos que começam com `/`, sem espaço,
  `\` nem caracteres de controle em qualquer posição (o parser WHATWG apaga tab/CR/LF, e `/\t/host`
  viraria `//host`), e que, resolvidos como URL, continuam na mesma origem; senão `/dashboard`.
  Navegação pelo `router-adapter`.
- **Razão**: o PRD pede a volta à rota tentada; a validação evita redirecionamento aberto.

## D9 — `shared/` deixa de depender de `features/auth`

- **Decisão**: `Sidebar` e `AppShell` recebem `user` (`ShellUser {name}`), `onLogout` e `onLogoutAll`
  por props; o layout cliente de `app/(app)` chama `useAuth`. "Sair de todos os dispositivos" entra no
  menu.
- **Razão**: corrige a inversão `shared → features` herdada (registrada na 008).

## D10 — Configuração e segredos em `.env` não versionados

- **Decisão**: variáveis novas no `env.ts`, com `auth-config.ts` exportando `authConfig` tipado
  (tabela em [contracts/env.md](./contracts/env.md)). Produção lê segredos de `server/.env.secrets`
  (600, ignorado pela regra `.env.*`), nunca de `.env.docker`. Web: só `API_ORIGIN`;
  `NEXT_PUBLIC_API_URL` sai (inclusive do `test.env` do `vitest.config.ts`). Segredos em base64
  padrão estrito, decodificando para ≥ 32 bytes (`Buffer.from` aceitaria lixo em silêncio).
- **Alternativas**: `<VAR>_FILE`/Docker secrets (mudaria o mecanismo do `env.ts` sem ganho para uma
  máquina só); segredos em `.env.docker` (versionado).

## D11 — Erros e logs

- **Decisão**: no catálogo `domain/errors/domain-error.ts`: `InvalidCredentialsError` (401),
  `InvalidRefreshTokenError` (401, apaga o cookie), `RefreshTokenConflictError` (409, mantém o
  cookie); `EmailAlreadyExistsError` movido para o catálogo e também lançado pelo repositório ao
  traduzir P2002 (detectado no `meta` do erro: `constraint.fields` no SQLite, `constraint.index` no
  PostgreSQL). De middleware: `UNAUTHORIZED` 401, `ORIGIN_NOT_ALLOWED` 403, `TOO_MANY_REQUESTS` 429
  (+ `Retry-After`). Todos com mensagem pt-BR em `web/infra/api-error.ts`. Pino com `redact`
  (`password`, `passwordHash`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `set-cookie`,
  `secret`, `pepper`, na raiz e em `*.`) e censura `[REDACTED]`. Eventos `auth.register`,
  `auth.login.succeeded`/`failed`, `auth.password.rehashed`/`rehash_failed`, `auth.refresh.conflict`,
  `auth.refresh.reuse_detected` (warn), `auth.session.revoked`, `auth.rate_limited` (warn).

## D12 — Corte único e migração por CSV

- **Decisão**: server, web e e2e vão juntos; migration `add_authentication` (3 tabelas, sem
  transformação) gerada por `migrate:new` nos dois dialetos. A conta do dono é recriada e os
  lançamentos reimportados pelo CSV. Procedimento em [deploy.md § 7](./deploy.md#7-corte-e-migração-da-conta-do-dono).
- **Alternativas**: modo duplo/feature flag (manteria aberto o buraco que motiva a mudança); ativação
  por UUID + e-mail (manteria o UUID como credencial por um período); senha definida pelo operador
  (desnecessária com um único usuário).

## Decisões técnicas menores

| Pergunta                                         | Decisão                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Teste de concorrência contra Postgres no CI?     | Sim, no job `migrations`                                                                  |
| Restringir libs de auth por camada?              | Sim, duas regras novas no dependency-cruiser                                              |
| Node do Dockerfile da API (22) ≠ `engines` (≥24) | Change separada; a feature funciona nas duas versões                                      |
| Limpeza de sessões e tokens antigos              | Faxina no login (`deleteStaleForUser`: expiradas ou revogadas há mais de 7 dias), sem job |
| `GET /users/me` ou `GET /auth/me`?               | `GET /users/me` (reaproveita `UserController`)                                            |
| Remover o `cors()` da API?                       | Não; `CORS_ORIGIN` também alimenta `requireTrustedOrigin`                                 |
| Como o web é publicado?                          | Imagem Docker própria (`web/Dockerfile`, `node:24-alpine`, `next start -p 3001`)          |
| Store do rate limit                              | Memória (uma instância), janelas fixas: cadastro 1 h, login 15 min, refresh 1 min         |
