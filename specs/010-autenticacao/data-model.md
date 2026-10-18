# Data Model: Autenticação com e-mail e senha

**Três tabelas novas, nenhuma transformação de dados.** Migration
`20261018150956_add_authentication`, gerada por `migrate:new` nos dois dialetos
(`server/prisma/{sqlite,postgresql}/migrations/`), conferida por `migrate:check` no CI. `t_users` não
muda: um usuário anterior ao corte é uma linha sem credencial, que não consegue entrar. Ids são
`String` gerados pela entidade (UUID), estados são `String` sem enum, validados no `rehydrate`.

## Tabelas (`server/prisma/schema.prisma`)

### `t_password_credentials` — `PasswordCredential` (1:1 com `User`)

| Coluna          | Tipo         | Regra                                                                       |
| --------------- | ------------ | --------------------------------------------------------------------------- |
| `user_id`       | TEXT, **PK** | FK → `t_users.id` `ON DELETE CASCADE`                                       |
| `password_hash` | TEXT         | PHC Argon2id: `$argon2id$v=19$m=…,t=…,p=…$<salt>$<hash>` (salt de 16 bytes) |
| `pepper_id`     | TEXT         | Id do pepper do chaveiro usado na derivação                                 |
| `created_at`    | DATETIME     | `DEFAULT CURRENT_TIMESTAMP`                                                 |
| `updated_at`    | DATETIME     | `@updatedAt` (muda no rehash)                                               |

Sem índice extra: a busca é sempre pela PK (`userId`).

### `t_auth_sessions` — `AuthSession` (N por usuário, uma por login)

| Coluna           | Tipo          | Regra                                                        |
| ---------------- | ------------- | ------------------------------------------------------------ |
| `id`             | TEXT, **PK**  | UUID; é o `sid` do access token                              |
| `user_id`        | TEXT          | FK → `t_users.id` `ON DELETE CASCADE`                        |
| `auth_method`    | TEXT          | `password` (único valor nesta feature)                       |
| `status`         | TEXT          | `ACTIVE` \| `REVOKED`                                        |
| `created_at`     | DATETIME      | Momento do login                                             |
| `last_used_at`   | DATETIME      | Tocado a cada rotação                                        |
| `expires_at`     | DATETIME      | `created_at` + vida máxima (30 dias): absoluto, não desliza  |
| `revoked_at`     | DATETIME NULL |                                                              |
| `revoked_reason` | TEXT NULL     | `LOGOUT` \| `LOGOUT_ALL` \| `REFRESH_TOKEN_REUSE` \| `ADMIN` |

Índice `i_auth_sessions_user_status (user_id, status)` — `revokeAllForUser` e a faxina.

### `t_refresh_tokens` — `RefreshToken` (cadeia por sessão)

| Coluna            | Tipo          | Regra                                                                          |
| ----------------- | ------------- | ------------------------------------------------------------------------------ |
| `id`              | TEXT, **PK**  | UUID                                                                           |
| `session_id`      | TEXT          | FK → `t_auth_sessions.id` `ON DELETE CASCADE`                                  |
| `token_hash`      | TEXT          | `hex(SHA-256)` do valor do cookie; **único** (`u_refresh_tokens_token_hash`)   |
| `parent_token_id` | TEXT NULL     | Antecessor na cadeia (null no primeiro); **único** (`u_refresh_tokens_parent`) |
| `status`          | TEXT          | `ACTIVE` \| `ROTATED` \| `REVOKED`                                             |
| `created_at`      | DATETIME      |                                                                                |
| `expires_at`      | DATETIME      | `min(created_at + 7 dias, sessão.expires_at)`                                  |
| `rotated_at`      | DATETIME NULL | Momento da troca (base da janela de tolerância)                                |
| `revoked_at`      | DATETIME NULL |                                                                                |

Índice `i_refresh_tokens_session_status (session_id, status)` — revogação dos tokens ativos da sessão.

O `UNIQUE` em `parent_token_id` é a rede de segurança estrutural da rotação: um token só pode ter um
sucessor, então duas rotações concorrentes do mesmo token nunca deixam dois filhos (a segunda recebe
P2002 e é desfeita). O valor em claro do refresh **nunca** é gravado.

No SQLite as datas são INTEGER em milissegundos (`timestampFormat: "unixepoch-ms"` do adapter); no
PostgreSQL, `TIMESTAMP(3)`.

## Domínio (server)

### Value objects

| VO               | Arquivo                           | Regra                                                                                                                  |
| ---------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `EmailAddress`   | `email-address.value-object.ts`   | `trim` + minúsculas, formato `x@y.z` sem espaços, ≤ 254; única normalização de e-mail (cadastro, login, `User.create`) |
| `PasswordPolicy` | `password-policy.value-object.ts` | Classe só estática: 12–128 code points após NFKC, sem trim nem composição                                              |

Os schemas Zod de `application/dtos/auth.dto.ts` aplicam esses VOs por `superRefine`; o `loginSchema`
aplica só o teto de 128 na senha.

### Entidades

| Entidade             | Fábricas / métodos                                                                                                 | Notas                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `PasswordCredential` | `create(props)`, `withNewHash(hash, now)`                                                                          | Sem id próprio (`userId` é a chave); `withNewHash` preserva `createdAt` |
| `AuthSession`        | `start(userId, method, now, maxLifetimeMs)`, `rehydrate(record)`, `isActive(now)`, `revoke(reason, now)`           | `revoke` é idempotente (guarda data e motivo da primeira revogação)     |
| `RefreshToken`       | `issue(session, hash, parentId, now, ttlMs)`, `rehydrate(record)`, `isExpired(now)`, `rotatedWithin(graceMs, now)` | Só o hash; `issue` limita a expiração à da sessão                       |

`rehydrate` recebe um `XRecord` com estados como `string` e só devolve a entidade depois de validar
os valores fechados (`AUTH_METHODS`, `AUTH_SESSION_STATUSES`, `SESSION_REVOCATION_REASONS`,
`REFRESH_TOKEN_STATUSES`). Copy-on-write em todas.

### Portas (`domain/ports/`)

| Porta                          | Responsabilidade                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `PasswordHasher`               | `hash` → `{hash, pepperId}`; `verify` → `{matches, needsRehash}` (parâmetros e pepper); `verifyAgainstDummy`              |
| `AccessTokenService`           | `issue({userId, sessionId})` → `{token, expiresAt}`; `verify(token)` → claims ou `null`                                   |
| `RefreshTokenGenerator`        | `generate()` → `{plain, hash}` (32 bytes base64url); `hash(plain)` (SHA-256 hex)                                          |
| `PasswordCredentialRepository` | `findByUserId`; `update` (gravação do rehash)                                                                             |
| `AuthSessionRepository`        | `create`, `findSessionById`, `findTokenByHash`, `rotate` (CAS), `revokeSession`, `revokeAllForUser`, `deleteStaleForUser` |
| `AuthEventLogger`              | `info`/`warn`/`error` mínimos para os eventos `auth.*`                                                                    |
| `UserRepository` (alterada)    | `findById`, `findByEmail`, `createWithPasswordCredential` (`create` removido)                                             |

### Política de sessão

`SessionPolicy` (em ms, montada no container a partir das variáveis em segundos):
`refreshTokenTtlMs` (7 dias), `maxLifetimeMs` (30 dias) e `reuseGraceMs` (30 s). A vida do access
token (10 min) é configuração do `JoseAccessTokenService`, não da política.

## Estados e transições

"Expirado" **nunca** é gravado: é sempre derivado de `expires_at` comparado com agora (sem job de
varredura). Em `now == expiresAt` já expirou.

### Sessão

```text
              login / cadastro
                     |
                     v
                +---------+   logout | logout-all | reuso detectado | admin
                | ACTIVE  |-------------------------------------------------> +---------+
                +---------+                                                    | REVOKED |
                     |                                                         +---------+
                     | agora >= expires_at (vida máxima absoluta)
                     v
               (EXPIRADA — derivado, não gravado)
```

| De      | Evento                                         | Para    | `revoked_reason`        |
| ------- | ---------------------------------------------- | ------- | ----------------------- |
| —       | cadastro ou login                              | ACTIVE  | —                       |
| ACTIVE  | `POST /auth/logout`                            | REVOKED | `LOGOUT`                |
| ACTIVE  | `POST /auth/logout-all` (todas do usuário)     | REVOKED | `LOGOUT_ALL`            |
| ACTIVE  | refresh `ROTATED` reapresentado fora da janela | REVOKED | `REFRESH_TOKEN_REUSE`   |
| ACTIVE  | `UPDATE` do operador (deploy.md § 10)          | REVOKED | `ADMIN`                 |
| REVOKED | qualquer                                       | REVOKED | inalterado (definitivo) |

Revogar a sessão revoga, na mesma transação, todos os tokens `ACTIVE` dela, tocando a sessão
**antes** dos tokens (mesma ordem de lock da rotação).

### Refresh token

```text
              emitido (login ou rotação)
                     |
                     v
                +---------+  rotação (CAS ok)    +---------+
                | ACTIVE  |--------------------->| ROTATED |
                +---------+                      +---------+
                  |     |                          |
 sessão revogada  |     | agora >= expires_at      | reapresentado:
                  v     v                          |   <= 30 s -> 409, nada muda
            +---------+ (EXPIRADO — derivado)      |   >  30 s -> sessão REVOKED
            | REVOKED |                            |   (o ROTATED fica; o ACTIVE da cadeia vira REVOKED)
            +---------+
```

### Renovação (`RefreshSessionUseCase`)

| Situação do token apresentado                           | Resposta                     | Efeito                                              |
| ------------------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| Cookie ausente, hash desconhecido                       | 401 `INVALID_REFRESH_TOKEN`  | Cookie apagado                                      |
| Sessão revogada ou expirada                             | 401 `INVALID_REFRESH_TOKEN`  | Cookie apagado                                      |
| `REVOKED`                                               | 401 `INVALID_REFRESH_TOKEN`  | Cookie apagado                                      |
| `ROTATED` há ≤ 30 s                                     | 409 `REFRESH_TOKEN_CONFLICT` | Nada muda; cookie mantido; log `info`               |
| `ROTATED` há > 30 s                                     | 401 `INVALID_REFRESH_TOKEN`  | Sessão revogada (`REFRESH_TOKEN_REUSE`); log `warn` |
| `ACTIVE` expirado                                       | 401 `INVALID_REFRESH_TOKEN`  | Cookie apagado                                      |
| `ACTIVE` válido, CAS ok                                 | 200                          | Token → `ROTATED`; sucessor `ACTIVE`; cookie novo   |
| `ACTIVE` válido, CAS perdido; releitura: trocado ≤ 30 s | 409 `REFRESH_TOKEN_CONFLICT` | Nada muda                                           |
| `ACTIVE` válido, CAS perdido; releitura: outro caso     | 401 `INVALID_REFRESH_TOKEN`  | Cookie apagado                                      |

### Rotação atômica (`PrismaAuthSessionRepository.rotate`)

Uma `$transaction` interativa:

1. `updateMany t_auth_sessions WHERE id = :sid AND status = 'ACTIVE' AND expires_at > :now SET
last_used_at = :now` — `count ≠ 1` → rollback → `false`;
2. `updateMany t_refresh_tokens WHERE id = :current AND status = 'ACTIVE' AND expires_at > :now SET
status = 'ROTATED', rotated_at = :now` — `count ≠ 1` → rollback → `false`;
3. `create t_refresh_tokens (sucessor, parent_token_id = :current)` — P2002 → rollback → `false`;
4. commit → `true`.

Corrida com logout: se o logout comita antes, o passo 1 encontra `REVOKED` → `false` → 401; se a
rotação comita antes, o logout revoga também o sucessor (é `ACTIVE` da mesma sessão).

### Faxina

`StartSessionUseCase` chama `deleteStaleForUser(userId, now − 7 dias)` a cada login: apaga as sessões
do usuário com `expires_at` ou `revoked_at` anteriores a esse instante (os tokens vão por cascade).
Crescimento: uma sessão por login e um token por renovação (no máximo um a cada 10 min de uso).

## Web

| Item              | Onde                                                 | Conteúdo                                                 |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Access token      | memória do módulo `infra/session.ts`                 | Some ao recarregar; recuperado pela renovação silenciosa |
| `smaug_refresh`   | cookie `httpOnly` da origem do web, `Path=/api/auth` | Emitido pela API, inacessível a JavaScript               |
| `smaug_session=1` | cookie legível, `path=/`, `SameSite=Lax`, 30 dias    | Só dica para o `proxy.ts`; sem segredo                   |
| `userId` (legado) | —                                                    | Apagado no carregamento de `session.ts`                  |

Detalhe em [contracts/web-session.md](./contracts/web-session.md).
