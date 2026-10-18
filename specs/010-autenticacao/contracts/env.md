# Contrato de configuração — variáveis de ambiente

**Feature**: [spec.md](../spec.md) | **Código**: `server/src/infrastructure/config/{env,auth-config}.ts`,
`server/.env.example`, `server/.env.docker`, `server/docker-compose.yml`, `web/.env.example`,
`web/.env.docker`, `e2e/playwright.config.ts`

O `env.ts` do server valida tudo com Zod **no import** e encerra o processo (`process.exit(1)`) se
algo falhar, listando os campos. A precedência é a do `dotenv`: variável do processo primeiro,
`server/.env` depois. `auth-config.ts` transforma as variáveis num `authConfig` tipado que o
container injeta nos adapters e no HTTP — nenhum adapter lê `process.env`.

## Server — variáveis anteriores (inalteradas)

| Variável            | Obrigatória | Padrão                  | Observação                                                                                                                                                |
| ------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_PROVIDER` | sim         | —                       | `postgresql` \| `sqlite` \| `memory`                                                                                                                      |
| `DATABASE_URL`      | sim         | —                       | **Segredo** em produção (senha do banco). SQLite relativo a `server/`                                                                                     |
| `NODE_ENV`          | sim         | —                       | `development` \| `production` \| `test`; muda padrões e pisos abaixo                                                                                      |
| `PORT`              | não         | `3000`                  |                                                                                                                                                           |
| `LOG_LEVEL`         | não         | `info`                  | `debug` \| `info` \| `warn` \| `error`                                                                                                                    |
| `CORS_ORIGIN`       | não         | `http://localhost:3001` | **Origem pública do web como o navegador a vê**; normalizada sem barra final. Agora também é a origem aceita por `requireTrustedOrigin` nas rotas `/auth` |

## Server — variáveis novas (autenticação)

### Segredos (nunca em arquivo versionado)

| Variável                     | Obrigatória | Formato / regra                                                                                |
| ---------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                 | **sim**     | base64 **padrão estrito** (com `=`), decodificando para ≥ 32 bytes (`openssl rand -base64 32`) |
| `JWT_KEY_ID`                 | **sim**     | `[A-Za-z0-9._-]+`; vai no `kid` do JWT                                                         |
| `JWT_PREVIOUS_SECRET`        | não         | Mesmo formato; só durante a rotação. **Em par** com o id                                       |
| `JWT_PREVIOUS_KEY_ID`        | não         | Diferente de `JWT_KEY_ID`                                                                      |
| `PASSWORD_PEPPERS`           | **sim**     | Chaveiro `id:base64,id:base64`; cada valor ≥ 32 bytes; ids únicos                              |
| `PASSWORD_PEPPER_CURRENT_ID` | **sim**     | Precisa existir no chaveiro                                                                    |

### Tokens e sessão

| Variável                       | Padrão      | Significado                                          |
| ------------------------------ | ----------- | ---------------------------------------------------- |
| `JWT_ISSUER`                   | `smaug-api` | `iss` emitido e exigido                              |
| `JWT_AUDIENCE`                 | `smaug-web` | `aud` emitido e exigido                              |
| `ACCESS_TOKEN_TTL_SECONDS`     | `600`       | Vida do access token (10 min)                        |
| `REFRESH_TOKEN_TTL_SECONDS`    | `604800`    | Vida de cada refresh token (7 dias)                  |
| `SESSION_MAX_LIFETIME_SECONDS` | `2592000`   | Vida máxima da sessão desde o login (30 dias)        |
| `REFRESH_REUSE_GRACE_SECONDS`  | `30`        | Janela de tolerância a renovações concorrentes (≥ 0) |

### Argon2id

| Variável             | Padrão  | Piso fora de `test` | Piso em `test`           |
| -------------------- | ------- | ------------------- | ------------------------ |
| `ARGON2_MEMORY_KIB`  | `65536` | `19456`             | 8 × `ARGON2_PARALLELISM` |
| `ARGON2_TIME_COST`   | `3`     | `2`                 | 1                        |
| `ARGON2_PARALLELISM` | `4`     | 1                   | 1                        |

### Cookie e proxy

| Variável             | Padrão                                         | Regra                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_COOKIE_SECURE` | `true` fora de development/test; `false` nelas | `true` \| `false`. Não desligue em produção                                                                                                                                                                                                                                                                                                                                                                                                    |
| `AUTH_COOKIE_PATH`   | `/api/auth`                                    | Começa com `/`; é o caminho de `/auth` **visto pelo navegador** (com o `/api` do web)                                                                                                                                                                                                                                                                                                                                                          |
| `TRUST_PROXY`        | — (nenhum proxy confiável)                     | **Obrigatória fora de development/test.** Valor do `app.set("trust proxy")` do Express: dígitos = número de saltos; senão lista de IPs/sub-redes/nomes (`loopback`, `10.250.0.0/24`, `10.250.0.0/24, 203.0.113.10`). `true` é **recusado** (tornaria o `X-Forwarded-For` forjável). Em development com o web repassando `/api` na mesma máquina, use `loopback` (sem ele o `express-rate-limit` registra `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`) |

### Rate limit (janelas fixas, por IP do cliente)

| Variável                          | Padrão | Janela                                 |
| --------------------------------- | ------ | -------------------------------------- |
| `AUTH_RATE_LIMIT_REGISTER_PER_IP` | `10`   | 1 h                                    |
| `AUTH_RATE_LIMIT_LOGIN_PER_IP`    | `50`   | 15 min                                 |
| `AUTH_RATE_LIMIT_LOGIN_PER_EMAIL` | `10`   | 15 min (chave IP + e-mail normalizado) |
| `AUTH_RATE_LIMIT_REFRESH_PER_IP`  | `60`   | 1 min                                  |

### Regras cruzadas (`checkAuthEnv`)

A API não sobe quando: o pepper vigente não está no chaveiro; só um de `JWT_PREVIOUS_SECRET` /
`JWT_PREVIOUS_KEY_ID` está definido, ou o id anterior é igual ao atual; o Argon2 fica abaixo do
piso do ambiente; `TRUST_PROXY` falta fora de development/test.

## Server — só ferramentas e testes

| Variável                       | Uso                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `POSTGRES_SHADOW_DATABASE_URL` | `migrate:new`/`migrate:check` (banco descartável, apagado a cada uso) — pré-existente                    |
| `POSTGRES_TEST_DATABASE_URL`   | Liga o teste de concorrência do `PrismaAuthSessionRepository` contra PostgreSQL (job `migrations` do CI) |

Os segredos de teste (públicos de propósito) estão no `test.env` de `server/vitest.config.ts` e no
`serverEnv` de `e2e/playwright.config.ts`; os de exemplo em `server/.env.example` estão marcados como
inseguros.

## Onde cada variável mora em produção (compose)

| Arquivo / fonte           | Versionado                                | Conteúdo                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/.env.docker`      | sim                                       | `DATABASE_PROVIDER=postgresql`, `NODE_ENV=production`, `PORT`, `LOG_LEVEL`, `TRUST_PROXY=10.250.0.0/24`, `AUTH_COOKIE_SECURE=true`, `AUTH_COOKIE_PATH`, `JWT_ISSUER`/`AUDIENCE`, TTLs, `ARGON2_*` |
| `server/.env.secrets`     | **não** (regra `.env.*`), permissão `600` | `DATABASE_URL`, `JWT_SECRET`, `JWT_KEY_ID`, `JWT_PREVIOUS_*` (só em rotação), `PASSWORD_PEPPERS`, `PASSWORD_PEPPER_CURRENT_ID`                                                                    |
| `environment:` do compose | sim                                       | Só `CORS_ORIGIN: ${SMAUG_PUBLIC_ORIGIN:-http://localhost:${SMAUG_WEB_PORT:-8080}}`                                                                                                                |
| `web/.env.docker`         | sim                                       | Só `API_ORIGIN=http://api:3000`                                                                                                                                                                   |

### Interpolação do compose (no shell, nunca em arquivo versionado)

| Variável              | Padrão                               | Uso                                                                                |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `SMAUG_WEB_PORT`      | `8080`                               | Porta do web no host                                                               |
| `SMAUG_WEB_BIND`      | `127.0.0.1`                          | Interface do web no host; `0.0.0.0` só com o proxy TLS em outra máquina e firewall |
| `SMAUG_PUBLIC_ORIGIN` | `http://localhost:${SMAUG_WEB_PORT}` | Vira `CORS_ORIGIN` da API: `https://<domínio>` em produção                         |

A sub-rede fixa `10.250.0.0/24` de `networks.default` no compose e o `TRUST_PROXY` do `.env.docker`
andam juntos: mudou um, mude o outro.

## Web

| Variável     | Obrigatória      | Padrão | Observação                                                                                                                                                                                                                                                                  |
| ------------ | ---------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_ORIGIN` | sim (em runtime) | —      | Destino do repasse `/api` (`app/api/[...path]/route.ts`). Variável de **servidor**, sem `NEXT_PUBLIC_`, lida **a cada requisição**: não vai para o bundle e pode mudar entre execuções da mesma build. Ausente → toda chamada `/api/*` responde 500. Barra final é removida |

- Dev local (`web/.env.example` → `web/.env.local`): `API_ORIGIN=http://localhost:3000`.
- Compose: `API_ORIGIN=http://api:3000`. Máquinas diferentes: `-e API_ORIGIN=https://<host da API>`
  no `docker run`.
- **Removida**: `NEXT_PUBLIC_API_URL` (código, `.env*` e `test.env` do `web/vitest.config.ts`). O
  web chama `/api` relativo, e os testes usam MSW em `http://localhost:3001/api`.

## E2E (`e2e/`)

| Variável                        | Padrão          | Uso                                                                                                     |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `E2E_API_HOST`                  | `localhost`     | Host da API do run; `127.0.0.1` põe web e API em **origens diferentes** (o web continua em `localhost`) |
| `E2E_ALL_BROWSERS`              | —               | Liga os projetos firefox e webkit além do chromium                                                      |
| `E2E_API_PORT` / `E2E_WEB_PORT` | `3100` / `3101` | Portas dedicadas do run                                                                                 |

A API do run sobe com `NODE_ENV=test`, segredos fixos de teste, Argon2 mínimo
(`1024`/`1`/`1`), `TRUST_PROXY=loopback`, `AUTH_RATE_LIMIT_* = 100000` e
`ACCESS_TOKEN_TTL_SECONDS=20` (para a renovação silenciosa acontecer de verdade durante a suíte); o
web sobe com `API_ORIGIN` apontando para ela. Com `npm run test:e2e` as flags de `--grep` não são
repassadas: use `node e2e/scripts/run-e2e.mjs` direto.
