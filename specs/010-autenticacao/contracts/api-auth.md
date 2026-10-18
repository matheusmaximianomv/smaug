# Contrato da API — autenticação

**Feature**: [spec.md](../spec.md) | **Código**: `server/src/presentation/routes/{auth,user,index}.routes.ts`,
`controllers/auth.controller.ts`, `middlewares/{authenticate,require-trusted-origin,rate-limit}.middleware.ts`

Convenções mantidas: a API **não tem** prefixo `/api` (quem acrescenta `/api` é o repasse do web —
o navegador chama `/api/auth/login`, a API recebe `/auth/login`); corpo de erro
`{ "error": CODE, "message": string }`; 400 do `validateRequest` com `details`.

## Visão geral

| Rota                                    | Proteção                                          | Sucesso | Erros                |
| --------------------------------------- | ------------------------------------------------- | ------- | -------------------- |
| `POST /auth/register`                   | Origin, rate limit (cadastro)                     | 201     | 400, 403, 409, 429   |
| `POST /auth/login`                      | Origin, rate limit (login por IP e por IP+e-mail) | 200     | 400, 401, 403, 429   |
| `POST /auth/refresh`                    | Origin, rate limit (renovação), cookie            | 200     | 401, 403, 409, 429   |
| `POST /auth/logout`                     | Origin; cookie **ou** Bearer (opcional)           | 204     | 403                  |
| `POST /auth/logout-all`                 | Origin; Bearer obrigatório                        | 204     | 401, 403             |
| `GET /users/me`                         | Bearer                                            | 200     | 401                  |
| `/expenses/*`, `/revenues/*`, `/data/*` | Bearer (inalteradas no resto)                     | —       | + 401 `UNAUTHORIZED` |
| `/health`                               | aberta                                            | 200/503 | —                    |
| ~~`POST /users`~~, ~~`GET /users/:id`~~ | **removidas**                                     | —       | —                    |

`cookie-parser` e `requireTrustedOrigin` são aplicados só no sub-router de `/auth`. Um único
`authenticate` protege as 9 montagens de dados e `/users`.

## Corpo de sessão

Resposta de `register` (201), `login` (200) e `refresh` (200):

```json
{
  "accessToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 600,
  "user": {
    "id": "uuid",
    "name": "Ana",
    "email": "ana@exemplo.com",
    "createdAt": "2026-10-18T12:00:00.000Z"
  }
}
```

O refresh token **nunca** aparece no corpo: vai só no `Set-Cookie`.

## `POST /auth/register`

Entrada: `{ "name": string(1..255), "email": string, "password": string }`.

| Status | `error`                | Quando                                                                                                 |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| 201    | —                      | Usuário + credencial na mesma transação; sessão aberta; `Set-Cookie`                                   |
| 400    | `VALIDATION_ERROR`     | Campo ausente; `name` fora de 1–255; e-mail inválido ou > 254; senha fora de 12–128 code points (NFKC) |
| 409    | `EMAIL_ALREADY_EXISTS` | E-mail normalizado já existe, inclusive na corrida (P2002 traduzido pelo repositório)                  |
| 403    | `ORIGIN_NOT_ALLOWED`   | `Origin` presente e ≠ `CORS_ORIGIN`                                                                    |
| 429    | `TOO_MANY_REQUESTS`    | > 10 cadastros/h por IP                                                                                |

## `POST /auth/login`

Entrada: `{ "email": string, "password": string }`. A política de senha **não** se aplica; só o teto
de 128 code points.

| Status | `error`               | Quando                                                                                                           |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 200    | —                     | Credenciais corretas; sessão nova (`authMethod: password`); `Set-Cookie`; rehash se preciso                      |
| 400    | `VALIDATION_ERROR`    | E-mail ausente/inválido; senha ausente ou > 128                                                                  |
| 401    | `INVALID_CREDENTIALS` | E-mail inexistente, senha errada **ou** conta sem senha — corpo idêntico, `message: "Invalid email or password"` |
| 403    | `ORIGIN_NOT_ALLOWED`  |                                                                                                                  |
| 429    | `TOO_MANY_REQUESTS`   | > 50/15 min por IP, ou > 10/15 min por IP + e-mail normalizado                                                   |
| 500    | —                     | Credencial com `pepper_id` fora do chaveiro (erro de configuração, logado)                                       |

## `POST /auth/refresh`

Sem corpo; lê o cookie `smaug_refresh`.

| Status | `error`                  | Cookie             | Quando                                                                                                    |
| ------ | ------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| 200    | —                        | novo (rotacionado) | Token `ACTIVE` válido; o apresentado vira `ROTATED`                                                       |
| 401    | `INVALID_REFRESH_TOKEN`  | **apagado**        | Ausente, desconhecido, expirado, revogado, sessão encerrada ou reuso fora da janela (que revoga a sessão) |
| 409    | `REFRESH_TOKEN_CONFLICT` | **mantido**        | Token trocado há ≤ 30 s (outra aba venceu); tentar de novo                                                |
| 403    | `ORIGIN_NOT_ALLOWED`     | —                  | O token não é rotacionado                                                                                 |
| 429    | `TOO_MANY_REQUESTS`      | —                  | > 60/min por IP                                                                                           |

## `POST /auth/logout`

Revoga a sessão do cookie ou, sem cookie, a do Bearer válido (`authenticateIfPresent`; um access
expirado não impede, o cookie basta). **Sempre 204** com o cookie apagado — idempotente com cookie
ausente, sessão desconhecida ou já revogada. Só `403 ORIGIN_NOT_ALLOWED` interrompe.

## `POST /auth/logout-all`

Bearer obrigatório. Revoga todas as sessões `ACTIVE` do usuário (`LOGOUT_ALL`), incluindo a corrente;
204 com o cookie apagado. Sem token válido: 401 `UNAUTHORIZED`.

## `GET /users/me`

Bearer obrigatório. 200 com `{id, name, email, createdAt}` do usuário do token; 401 `UNAUTHORIZED`.

## Rotas protegidas

`Authorization: Bearer <access token>` (esquema sem distinção de caixa, token sem espaço). O
middleware verifica o JWT e confere numa leitura que a sessão existe, é do mesmo usuário, está
`ACTIVE` e antes de `expires_at`. Qualquer falha:

```json
{ "error": "UNAUTHORIZED", "message": "Authentication required" }
```

O motivo não é detalhado. `X-User-Id` é ignorado. O antigo 404 `USER_NOT_FOUND` do middleware deixou
de existir. Autorização por dono inalterada (registro alheio → 404). Os resumos anuais
`GET /expenses/summary` e `GET /revenues/summary` seguem a mesma regra (delta de
`lancamentos/consulta-api`).

## Access token (JWT)

| Campo                 | Valor                                                            |
| --------------------- | ---------------------------------------------------------------- |
| Cabeçalho             | `alg: HS256` (único aceito), `typ: at+jwt`, `kid` = `JWT_KEY_ID` |
| `iss` / `aud`         | `JWT_ISSUER` (`smaug-api`) / `JWT_AUDIENCE` (`smaug-web`)        |
| `sub` / `sid` / `jti` | id do usuário / id da sessão / id único do token                 |
| `iat` / `exp`         | `exp = iat + ACCESS_TOKEN_TTL_SECONDS` (600)                     |
| Proibido              | nome, e-mail ou qualquer dado de perfil                          |

Verificação: chave atual ou anterior pelo `kid` (`kid` desconhecido → recusado), `clockTolerance`
5 s; `alg: none`, HS512, RS256, `typ`/`iss`/`aud` errados, claim ausente ou expirado → 401.

## Cookie de refresh

```text
Set-Cookie: smaug_refresh=<43 caracteres base64url>; Max-Age=<até expirar>; Path=/api/auth; HttpOnly; Secure; SameSite=Strict
```

- Nome fixo `smaug_refresh`; `Path` = `AUTH_COOKIE_PATH` (o caminho **visto pelo navegador**);
  sem `Domain`; `Secure` = `AUTH_COOKIE_SECURE` (padrão `true` fora de development/test).
- `Max-Age` = tempo até `expires_at` do token (no máximo 7 dias, nunca além da vida da sessão).
- Apagado (`Expires=Thu, 01 Jan 1970…`) com os mesmos atributos em 401 da renovação, logout e
  logout-all — o navegador só apaga se o `Path` coincidir.

## Checagem de origem

`requireTrustedOrigin(CORS_ORIGIN)` em todo `/auth/*`: `Origin` presente e diferente (comparação
exata; `CORS_ORIGIN` é normalizado sem barra final) → 403
`{ "error": "ORIGIN_NOT_ALLOWED", "message": "Origin not allowed" }`. Sem `Origin` (clientes que não
são navegador), segue. É defesa em profundidade; a primeira linha contra CSRF é o `SameSite=Strict`.

## Rate limit

`express-rate-limit`, store em memória (uma instância), janelas fixas, cabeçalhos padrão
`draft-8` (`RateLimit-Policy`, `RateLimit`), sem os legados `X-RateLimit-*`.

| Limitador       | Rota             | Chave                   | Padrão        | Variável                          |
| --------------- | ---------------- | ----------------------- | ------------- | --------------------------------- |
| `register`      | `/auth/register` | IP                      | 10 por 1 h    | `AUTH_RATE_LIMIT_REGISTER_PER_IP` |
| `loginPerIp`    | `/auth/login`    | IP                      | 50 por 15 min | `AUTH_RATE_LIMIT_LOGIN_PER_IP`    |
| `loginPerEmail` | `/auth/login`    | IP + e-mail normalizado | 10 por 15 min | `AUTH_RATE_LIMIT_LOGIN_PER_EMAIL` |
| `refresh`       | `/auth/refresh`  | IP                      | 60 por 1 min  | `AUTH_RATE_LIMIT_REFRESH_PER_IP`  |

Excedente: 429 `{ "error": "TOO_MANY_REQUESTS", "message": "Too many requests, try again later" }`
com `Retry-After`, e log `warn` `auth.rate_limited` (`limiter`, `path`). O limite vale mesmo com a
senha correta. O IP é `req.ip`, que depende de `TRUST_PROXY`: sem proxy confiável, é o IP da conexão
e `X-Forwarded-For` é ignorado; com o salto do web confiável, é a entrada mais à direita do
`X-Forwarded-For` que esse salto escreveu.

## Códigos de erro novos

| Código                   | Status | Origem              | Mensagem da API                                           | Mensagem do web (`infra/api-error.ts`)                                     |
| ------------------------ | ------ | ------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `INVALID_CREDENTIALS`    | 401    | domínio             | Invalid email or password                                 | E-mail ou senha incorretos.                                                |
| `INVALID_REFRESH_TOKEN`  | 401    | domínio             | Refresh token is invalid, expired or revoked              | Sua sessão expirou. Faça login novamente.                                  |
| `REFRESH_TOKEN_CONFLICT` | 409    | domínio             | Refresh token was already rotated by a concurrent request | Não foi possível renovar a sessão. Tente novamente.                        |
| `UNAUTHORIZED`           | 401    | middleware          | Authentication required                                   | Sessão inválida. Faça login novamente.                                     |
| `ORIGIN_NOT_ALLOWED`     | 403    | middleware          | Origin not allowed                                        | Origem da requisição não permitida. Recarregue a página e tente novamente. |
| `TOO_MANY_REQUESTS`      | 429    | middleware          | Too many requests, try again later                        | Muitas tentativas. Aguarde alguns minutos e tente novamente.               |
| `EMAIL_ALREADY_EXISTS`   | 409    | domínio (existente) | A user with email "…" already exists                      | Já existe uma conta com este e-mail.                                       |

`EmailAlreadyExistsError` foi movido de `create-user.use-case.ts` (removido) para o catálogo
`domain/errors/domain-error.ts`.

## Logs de segurança

Eventos com `userId`/`sessionId` (nunca e-mail digitado, senha, hash, token ou cookie):
`auth.register`, `auth.login.succeeded`, `auth.login.failed`, `auth.password.rehashed`,
`auth.password.rehash_failed`, `auth.refresh.conflict`, `auth.refresh.reuse_detected` (warn),
`auth.session.revoked`, `auth.rate_limited` (warn). O Pino mascara como `[REDACTED]` os campos
`password`, `passwordHash`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `set-cookie`,
`secret` e `pepper`, na raiz e um nível abaixo (`*.campo`).
