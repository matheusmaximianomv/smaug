# Contrato do web — sessão no navegador

**Feature**: [spec.md](../spec.md) | **Código**: `web/app/api/[...path]/route.ts`, `web/infra/{session,auth-refresh,api-client,api-error,navigation}.ts`,
`web/proxy.ts`, `web/features/auth/`, `web/app/(app)/layout.tsx`, `web/shared/components/{Sidebar,AppShell}.tsx`

## Repasse de mesma origem (`/api/*`)

O navegador fala **só** com a origem do web. `apiClient` usa `baseURL: "/api"` (sem
`withCredentials`, sem preflight de CORS), e o route handler `app/api/[...path]/route.ts` repassa
cada chamada a `API_ORIGIN` + caminho sem `/api` + query original.

| Aspecto              | Comportamento                                                                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime              | `runtime = "nodejs"`, `dynamic = "force-dynamic"`; a rota sai no build como `ƒ /api/[...path]`                                                                                                                                                                                                              |
| Destino              | `process.env.API_ORIGIN` lido **por requisição**, barra final removida; montado de `request.url` (preserva `%2F`, `%20`, `%C3%A7`)                                                                                                                                                                          |
| Métodos              | `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`                                                                                                                                                                                                                                                  |
| Cabeçalhos de ida    | Todos os do cliente (`Authorization`, `Cookie`, `Origin`, `Content-Type`, `x-forwarded-*` preenchidos pelo Next), menos os de salto: `connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `proxy-connection`, `te`, `trailer`, `transfer-encoding`, `upgrade`, `host`, `content-length` |
| Corpo de ida         | `arrayBuffer()` fora de `GET`/`HEAD` (CSV byte a byte)                                                                                                                                                                                                                                                      |
| `fetch`              | `redirect: "manual"` (3xx da API chega ao navegador), `cache: "no-store"`                                                                                                                                                                                                                                   |
| Resposta             | Status e `statusText` da API; cabeçalhos sem os de salto e sem `content-encoding` (o `fetch` já descomprimiu); cada `Set-Cookie` reanexado com `getSetCookie()`; corpo em stream                                                                                                                            |
| `API_ORIGIN` ausente | 500 sem corpo                                                                                                                                                                                                                                                                                               |
| API inalcançável     | 502 sem corpo                                                                                                                                                                                                                                                                                               |
| Guarda de rotas      | Não passa pelo `proxy.ts` (`matcher` exclui `api`)                                                                                                                                                                                                                                                          |
| `X-Forwarded-For`    | Repassado como o Next entrega (IP do socket só se o cliente não mandou um) — exige proxy TLS que o sobrescreva na publicação                                                                                                                                                                                |

## Onde fica cada credencial

| Item              | Armazenamento                                                               | Quem escreve                            | Quem lê                                  |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| Access token      | Variável de módulo em `infra/session.ts` (memória da aba)                   | `setSession`                            | interceptor do `apiClient`               |
| `smaug_refresh`   | Cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/auth` da origem do web | API (pelo repasse)                      | API, em `/auth/refresh` e `/auth/logout` |
| `smaug_session=1` | Cookie legível, `path=/`, `max-age` 30 dias, `SameSite=Lax`, sem segredo    | `setSession` / `clearSession`           | `proxy.ts` (`hasSessionHint`)            |
| `userId` (legado) | —                                                                           | apagado no carregamento de `session.ts` | ninguém                                  |

Nunca `localStorage` nem `sessionStorage`. API de `infra/session.ts`: `getAccessToken()`,
`setSession(token)`, `clearSession()`, `hasSessionHint()`.

## Renovação (`infra/auth-refresh.ts`)

- `refreshSession()`: **uma promessa por aba** (single-flight); chamadas simultâneas recebem a mesma.
  Usa axios puro (não o `apiClient`) em `POST /api/auth/refresh`, sem Bearer.
  - 200 → `setSession(accessToken)` e devolve `{accessToken, user, …}` (o perfil serve à retomada);
  - 409 `REFRESH_TOKEN_CONFLICT` → espera 250 ms e tenta **uma** vez mais;
  - 401 → `clearSession()` (apaga o indicador **antes**) e então `redirectToLogin()` — na ordem
    inversa o `proxy.ts` devolveria o usuário a `/dashboard` e recriaria o laço com `/login`;
  - rede ou 5xx → só rejeita; a sessão continua.
- `settleRefresh()`: espera a renovação em voo, se houver, sem propagar a falha.

## Interceptores do `apiClient`

1. **Requisição**: aguarda `settleRefresh()`, anexa `Authorization: Bearer <token>` se houver token
   e grava o token enviado em `config._sentToken`.
2. **Resposta 401 fora de `/auth/*`**, ainda não refeita (`_retried`):
   - se o token atual é `null` ou igual ao enviado → `refreshSession()`;
   - se mudou desde o envio (outra chamada já renovou) → não renova;
   - refaz a requisição **uma vez** com o token atual.
3. 401 em `/auth/*` (login errado, renovação recusada) só rejeita. Qualquer outro erro só rejeita.

`isInvalidSessionError` considera só 401 (antes 401 e 404).

## Bootstrap (`features/auth/hooks/useAuth.ts`)

Ao montar o layout de `app/(app)`:

| Estado                         | Ação                                                     |
| ------------------------------ | -------------------------------------------------------- |
| Token em memória               | `GET /api/users/me`                                      |
| Sem token, com `smaug_session` | `refreshSession()` e segue com o `user` devolvido        |
| Sem token, sem indicador       | Sem sessão (o `proxy.ts` já teria mandado para `/login`) |

`login(input, next)` → `POST /auth/login`, `setSession`, navega para `safeDestination(next)`.
`useRegister` → `POST /auth/register`, `setSession`, `/dashboard`; `isEmailTaken` para o 409.
`logout()` e `logoutAll()` chamam a API e, **mesmo se ela falhar**, limpam a sessão local e vão a
`/login`; `logoutAll` em 401 renova e repete uma vez.

## Guarda de rotas (`proxy.ts`)

| Situação                                    | Resultado                                             |
| ------------------------------------------- | ----------------------------------------------------- |
| Rota de `(app)` sem `smaug_session`         | `/login?next=<pathname+search>` (na raiz, sem `next`) |
| `/login` ou `/cadastro` com `smaug_session` | `/dashboard`                                          |
| Qualquer outra                              | segue                                                 |

`safeDestination(next)`: aceita só caminho que começa com `/`, sem espaço, `\` nem caracteres de
controle em nenhuma posição e que, resolvido como URL, não muda de origem. `//host`, `/\host`,
`/\t/host` e URLs absolutas → `/dashboard`. `app/(auth)/login/page.tsx` é Server Component que lê
`searchParams.next` e o passa ao `LoginForm` por prop.

## Telas

- **Cadastro**: nome, e-mail, senha, confirmação. `registerSchema` (zod) exige senha de 12–128
  caracteres e confirmação igual (erro no campo de confirmação), sem enviar requisição. Sucesso →
  `/dashboard`, sem tela "copie seu ID". 409 → "Já existe uma conta com este e-mail." + link "Entrar".
- **Login**: e-mail e senha (`loginSchema {email, password}`), link para o cadastro. 401
  `INVALID_CREDENTIALS` → "E-mail ou senha incorretos." sem tentativa de renovação; 429 → "Muitas
  tentativas. Aguarde alguns minutos e tente novamente."
- **Menu** (`Sidebar`): "Sair" e "Sair de todos os dispositivos". `Sidebar`/`AppShell` recebem
  `user` (`ShellUser {name}`), `onLogout` e `onLogoutAll` por props; não importam `features/auth`.

## Harness de teste

MSW intercepta `http://localhost:3001/api` (`tests/msw/base.ts`), com handlers de `/auth/*` e
`/users/me` (`tests/msw/handlers/auth.ts`; tokens `access-<userId>-<n>`) e um `db` com senhas,
sessão e tokens emitidos. `tests/session.ts`: `loginAs(user?)` semeia token em memória, indicador e
sessão MSW e devolve o `User`; `logout()`. `vitest.setup.ts` chama `clearSession()` no `afterEach`.
`tests/requests.ts` grava o caminho sem `/api`.
