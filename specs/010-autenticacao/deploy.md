# Deploy: autenticação com e-mail e senha

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md § Deploy](./plan.md#deploy) |
**Conferência**: [checklists/deploy.md](./checklists/deploy.md) | **Variáveis**: [contracts/env.md](./contracts/env.md)

Operação da publicação com autenticação: segredos, subida, corte da versão `X-User-Id`, migração da
conta do dono, rollback, rotações, revogação e incidentes. É a versão versionada e autocontida do
runbook local (na pasta `docs/`, não versionada), que tem o mesmo conteúdo com mais
detalhe de bastidor; em caso de divergência, vale este arquivo e o código.

Convenções: comandos a partir de `server/`; `$PSQL` abrevia o psql do Postgres do compose (as
variáveis `-v` só são interpoladas no SQL lido da entrada, não em `-c`):

```bash
cd server
PSQL="docker compose exec -T postgres psql -U postgres -d smaug -v ON_ERROR_STOP=1"
```

## 0. Desenvolvimento local (sem Docker)

1. `server/.env` a partir de `server/.env.example`: os segredos de exemplo servem **só** na sua
   máquina; acrescente `TRUST_PROXY=loopback` (o web repassa `/api` com `X-Forwarded-For`).
2. `web/.env.local` a partir de `web/.env.example`: `API_ORIGIN=http://localhost:3000`.
   `NEXT_PUBLIC_API_URL` não existe mais — apague-a se estiver no seu `.env.local`.
3. `npm run --prefix server migrate:deploy` (cria as 3 tabelas novas) e `npm run dev`.
4. A conta antiga de desenvolvimento não tem senha: cadastre outra (ou renomeie o e-mail como no
   § 7, passo 5) e importe um CSV, se quiser os dados.

## 1. Peças e arquivos

| Arquivo                     | Versionado                                                | Conteúdo                                                                                                                       |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `server/.env.docker`        | sim                                                       | Configuração **não secreta** da API: provider, `NODE_ENV=production`, `TRUST_PROXY`, `AUTH_COOKIE_*`, TTLs, `ARGON2_*`         |
| `server/.env.secrets`       | **não** (regra `.env.*` do `.gitignore`), permissão `600` | `DATABASE_URL`, `JWT_SECRET`, `JWT_KEY_ID`, `JWT_PREVIOUS_*` (só em rotação), `PASSWORD_PEPPERS`, `PASSWORD_PEPPER_CURRENT_ID` |
| `web/.env.docker`           | sim                                                       | Só `API_ORIGIN` (o web não guarda segredo)                                                                                     |
| `server/docker-compose.yml` | sim                                                       | `api` (porta não publicada), `web` (`127.0.0.1:8080` por padrão), `postgres` (`127.0.0.1:5432`)                                |
| `web/Dockerfile`            | sim                                                       | `node:24-alpine`, multi-stage, `next build` + `next start -p 3001`; nada de `API_ORIGIN` no build                              |

Interpolação do compose (no shell): `SMAUG_WEB_PORT` (8080), `SMAUG_WEB_BIND` (`127.0.0.1`) e
`SMAUG_PUBLIC_ORIGIN` (padrão `http://localhost:${SMAUG_WEB_PORT}`), que vira o `CORS_ORIGIN` da API:
a origem pública do web **como o navegador a vê** (`https://<domínio>` em produção). As rotas `/auth`
recusam com `403 ORIGIN_NOT_ALLOWED` um `Origin` diferente.

Sem `server/.env.secrets` o compose nem sobe; incompleto, o `env.ts` derruba a API na partida. A
imagem do web é a mesma em qualquer cenário: `API_ORIGIN` é lido a cada requisição, então trocá-lo é
só reiniciar o container, sem rebuild.

## 2. Requisito: proxy reverso com TLS na frente do web

**Obrigatório.** O `next start` não termina TLS e o cookie `smaug_refresh` é `Secure`, então o
navegador só o devolve por HTTPS. Além disso o Next só preenche `X-Forwarded-For` **se o cliente não
mandou um** (ressalva do spike, [plan.md](./plan.md#spike-do-repasse-api-tarefa-11-decide-d6)): com o
web exposto direto, qualquer cliente forja o IP e escapa do rate limit das rotas `/auth`. O proxy na
frente precisa **sobrescrever** o `X-Forwarded-For` com o IP real.

nginx:

```nginx
server {
  listen 443 ssl;
  server_name smaug.exemplo.com;
  # ssl_certificate / ssl_certificate_key ...
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;   # sobrescreve, não acrescenta
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Caddy:

```caddyfile
smaug.exemplo.com {
  reverse_proxy 127.0.0.1:8080 {
    header_up X-Forwarded-For {remote_host}
  }
}
```

Por isso o compose publica o web só em `127.0.0.1`. `TRUST_PROXY` da API confia nos saltos **entre o
Next e a API** (a sub-rede do compose); o IP real chega como a entrada que o proxy TLS escreveu e o
Next repassou. `TRUST_PROXY=true` é recusado pelo `env.ts`.

## 3. Cenários de publicação

### 3.1 Mesma máquina (compose)

```text
navegador --https--> proxy TLS (host) --http--> web :3001 ---------> api:3000 --> postgres
                     sobrescreve XFF            (127.0.0.1:8080)     rede 10.250.0.0/24, sem porta no host
```

- `web/.env.docker`: `API_ORIGIN=http://api:3000` (o padrão versionado).
- `server/.env.docker`: `TRUST_PROXY=10.250.0.0/24` (sub-rede fixa de `networks.default` no compose;
  mudou lá, mude aqui).
- `SMAUG_PUBLIC_ORIGIN=https://smaug.exemplo.com docker compose up -d --build --wait`.

### 3.2 Máquinas diferentes (mesma imagem do web)

Máquina do web:

```bash
docker build -t smaug-web web/
docker run -d --name smaug-web --restart unless-stopped \
  -e API_ORIGIN=https://api.interno.exemplo.com \
  -p 127.0.0.1:8080:3001 smaug-web
# + proxy TLS do § 2 na frente de 127.0.0.1:8080
```

Máquina da API: o compose sem o serviço `web` e com a porta da API publicada para o proxy TLS local,
num arquivo **fora do repositório** (ex.: `/etc/smaug/api-publica.yml`):

```yaml
services:
  api:
    ports:
      - "127.0.0.1:3000:3000"
```

```bash
SMAUG_PUBLIC_ORIGIN=https://smaug.exemplo.com \
  docker compose -f docker-compose.yml -f /etc/smaug/api-publica.yml up -d --build api
```

- Proxy TLS da API (`api.interno.exemplo.com` → `127.0.0.1:3000`) **acrescentando** ao
  `X-Forwarded-For` (`$proxy_add_x_forwarded_for` no nginx), com firewall aceitando só o IP do
  servidor do web.
- `TRUST_PROXY` lista todos os saltos entre o Next e a API: a sub-rede do compose (o proxy local
  chega pelo gateway `10.250.0.1`) e o IP do servidor do web, ex.:
  `TRUST_PROXY=10.250.0.0/24, 203.0.113.10`.
- `CORS_ORIGIN` continua sendo a origem pública **do web** (o navegador nunca fala com a API).

## 4. Segredos: geração e backup

Cada segredo é base64 padrão de 32 bytes aleatórios (o `env.ts` exige que decodifique para ≥ 32
bytes e recusa base64url ou espaços). Os ids (`JWT_KEY_ID`, id do pepper) são rótulos livres
(`[A-Za-z0-9._-]+`); use a data para saber a idade.

```bash
cd server
git check-ignore -v .env.secrets          # precisa responder: .gitignore:…:.env.*  .env.secrets
( umask 077; cat > .env.secrets <<EOF
DATABASE_URL=postgresql://postgres:<senha do banco>@postgres:5432/smaug?schema=public
JWT_SECRET=$(openssl rand -base64 32)
JWT_KEY_ID=jwt-2026-10
PASSWORD_PEPPERS=pep-2026-10:$(openssl rand -base64 32)
PASSWORD_PEPPER_CURRENT_ID=pep-2026-10
EOF
)
chmod 600 .env.secrets && ls -l .env.secrets   # -rw------- dono do deploy
```

Backup:

- Guarde uma cópia do `.env.secrets` (no mínimo o `PASSWORD_PEPPERS` completo) num cofre de senhas ou
  mídia cifrada, **separada do backup do banco**: quem tem os dois tem o necessário para atacar os
  hashes offline; quem perde o pepper perde todas as senhas feitas com ele (§ 11).
- O backup precisa conter **todos** os ids de pepper ainda em uso no banco (§ 9), não só o vigente.
- `JWT_SECRET` perdido não é incidente: gere outro e todos renovam a sessão (o refresh é opaco e não
  depende dele). Ver § 8.
- Nunca coloque segredo em `.env.docker`, em `environment:` do compose ou na linha de comando.

## 5. Subida e verificação

```bash
cd server
SMAUG_WEB_PORT=8080 docker compose up -d --build --wait
docker compose ps              # api e web healthy; api sem porta no host (3000/tcp)
docker compose port api 3000   # ":0" = não publicada
```

O container da API roda `npm run migrate:deploy` antes de iniciar (§ 6) e depois o `env.ts` valida a
configuração. Verificação ponta a ponta **pelo web** (com o proxy TLS, troque `W` pela origem
pública):

```bash
W=http://localhost:8080
curl -s -D reg.h -H 'Content-Type: application/json' -H "Origin: $W" \
  -d '{"name":"Teste","email":"teste@exemplo.com","password":"senha-forte-123"}' $W/api/auth/register
RT=$(grep -i '^set-cookie: smaug_refresh=' reg.h | sed -E 's/^[^=]*=([^;]*);.*/\1/')
curl -s -D ref.h -X POST -H "Origin: $W" -H "Cookie: smaug_refresh=$RT" $W/api/auth/refresh
RT=$(grep -i '^set-cookie: smaug_refresh=' ref.h | sed -E 's/^[^=]*=([^;]*);.*/\1/')
curl -s -i -X POST -H "Origin: $W" -H "Cookie: smaug_refresh=$RT" $W/api/auth/logout   # 204 + cookie apagado
```

Sobre o `Secure` em `http://localhost`: o curl com cookie jar não reenvia cookie `Secure` por
`http://`, por isso o cookie vai à mão no cabeçalho `Cookie:`. Navegadores tratam `http://localhost`
como contexto seguro e aceitam o cookie; por **qualquer outro host em `http://`** (IP da rede, nome
interno) o navegador descarta o cookie e a sessão cai na primeira renovação — por isso o proxy TLS do
§ 2. Não desligue `AUTH_COOKIE_SECURE` em produção.

## 6. Migration `add_authentication`

`prisma/<provider>/migrations/20261018150956_add_authentication/` (gerada por `migrate:new` nos dois
dialetos; o job `migrations` do CI roda `migrate:check`). Cria só tabelas novas —
`t_password_credentials`, `t_auth_sessions`, `t_refresh_tokens`, com FKs `ON DELETE CASCADE` — e
**nenhuma transformação de dados** (ver [data-model.md](./data-model.md)). Usuário legado = linha de
`t_users` sem credencial, que não consegue entrar.

Aplicada pelo próprio container a cada partida (`migrate:deploy`, idempotente). Fora do Docker:
`npm run --prefix server migrate:deploy`. Conferir:

```bash
$PSQL -c 'SELECT migration_name, finished_at IS NOT NULL AS ok FROM _prisma_migrations ORDER BY started_at;'
```

Atenção: o `migrate:deploy` roda **antes** da validação do `env.ts`. Uma subida com `.env.secrets`
incompleto (mas com `DATABASE_URL`) já aplica as migrations e só então falha. Inofensivo para esta
migration (aditiva), mas confira o log antes de concluir que "nada mudou".

## 7. Corte e migração da conta do dono

Server e web vão juntos; não existe convivência entre `X-User-Id` e Bearer. O corte derruba a sessão
atual do dono (esperado).

1. **Na versão anterior**, exportar o CSV completo em `/dados` ("Exportar tudo") e guardar o arquivo.
2. **Pré-checagem SQL, só leitura**: a normalização de e-mail da versão nova (`trim` + minúsculas)
   precisa valer para os dados existentes. As duas consultas devem voltar **0 linhas**; se não,
   corrija à mão antes do corte.

   ```bash
   $PSQL -c "SELECT id FROM t_users WHERE email <> lower(trim(email));" \
         -c "SELECT lower(trim(email)), count(*) FROM t_users GROUP BY 1 HAVING count(*) > 1;"
   ```

3. Gerar `server/.env.secrets` e o backup do pepper (§ 4).
4. Deploy conjunto (`docker compose up -d --build --wait`); conferir a migration (§ 6).
5. **Liberar o e-mail da conta antiga.** `t_users.email` é único e a conta antiga não é apagada (os
   lançamentos a referenciam sem cascade). Renomeie-a antes de cadastrar a nova:

   ```bash
   echo "UPDATE t_users SET email = 'antigo-' || id || '@invalid.local' WHERE email = :'email';" \
     | $PSQL -v email='<e-mail do dono>'
   # esperado: UPDATE 1
   ```

   `.local`/`invalid` não são entregáveis nem colidem com cadastros reais.

6. Cadastrar a conta nova pelo web (`/cadastro`) com o mesmo e-mail.
7. Importar o CSV em `/dados` e **conferir** os lançamentos (contagem por mês, séries e parcelas). O
   import é aditivo: não importe duas vezes. Uma conferência objetiva: exportar de novo na conta nova
   e comparar com o arquivo original (ver [tasks.md § Verificação](./tasks.md#verificação-realizada)).
8. Depois de conferido, a conta antiga e seus lançamentos podem ser apagados à mão (opcional).
9. **Cadastro aberto a terceiros só depois da change de recuperação de senha.**

### Rollback

Voltar server e web à versão anterior **juntos**. As tabelas novas são aditivas e podem ficar. Para a
conta antiga voltar a funcionar com o UUID, desfaça a renomeação — antes, renomeie ou apague a conta
nova, que ocupa o e-mail:

```sql
UPDATE t_users SET email = '<e-mail do dono>' WHERE id = '<id antigo>';
```

Lançamentos importados na conta nova durante a janela ficam nela.

## 8. Rotação da chave do JWT

O access token (HS256, `kid` no cabeçalho) vive `ACCESS_TOKEN_TTL_SECONDS` (600 s). A chave anterior
fica só para **verificação** durante esse tempo, em par `JWT_PREVIOUS_SECRET` / `JWT_PREVIOUS_KEY_ID`.

Rotação planejada:

1. Em `.env.secrets`: o valor atual de `JWT_SECRET`/`JWT_KEY_ID` passa para
   `JWT_PREVIOUS_SECRET`/`JWT_PREVIOUS_KEY_ID`; gere `JWT_SECRET=$(openssl rand -base64 32)` e um
   `JWT_KEY_ID` novo (diferente).
2. `docker compose up -d --wait api` (o compose recria o container quando o `env_file` muda). Tokens
   antigos continuam aceitos; os novos saem com o `kid` novo.
3. Depois de pelo menos `ACCESS_TOKEN_TTL_SECONDS`, remova as duas linhas `JWT_PREVIOUS_*` e recrie a
   API de novo.

Chave **comprometida**: pule o "anterior" — troque `JWT_SECRET`/`JWT_KEY_ID` e recrie a API. Todo
access token em circulação passa a dar 401 e o web renova sozinho pelo cookie (o refresh não depende
da chave). Se a conta também estiver comprometida, revogue as sessões (§ 10).

## 9. Rotação do pepper

`PASSWORD_PEPPERS` é um chaveiro `id:base64,id:base64`; `PASSWORD_PEPPER_CURRENT_ID` escolhe o usado
nos hashes novos. Cada credencial grava o `pepper_id`. No login com sucesso, uma credencial com pepper
diferente do vigente (ou parâmetros Argon2 antigos) é refeita (evento `auth.password.rehashed`).

1. Acrescente o pepper novo ao chaveiro e torne-o vigente:
   `PASSWORD_PEPPERS=pep-2026-10:<antigo>,pep-2026-11:$(openssl rand -base64 32)` e
   `PASSWORD_PEPPER_CURRENT_ID=pep-2026-11`. **Atualize o backup (§ 4) antes de subir.**
2. `docker compose up -d --wait api`.
3. Acompanhe a migração das credenciais conforme os usuários entram:

   ```bash
   $PSQL -c "SELECT pepper_id, count(*) FROM t_password_credentials GROUP BY 1 ORDER BY 1;"
   ```

4. Só remova um pepper do chaveiro quando a consulta não mostrar mais o id dele. Uma credencial com
   pepper fora do chaveiro faz o login daquela conta responder **500** (erro de configuração, não
   "senha errada"). Contas que nunca mais entram prendem o pepper antigo: ou ele fica no chaveiro, ou
   a senha delas é redefinida pelo operador (§ 11).

Pepper **comprometido** (vazou junto com o banco): rotacione como acima e redefina (§ 11) as senhas
que ainda estiverem no id comprometido; não há como refazer o hash sem a senha em claro.

## 10. Revogação administrativa (conta comprometida)

Sem rota: `UPDATE` direto. Efeito imediato — toda requisição autenticada confere a sessão, então o
access token em mãos de terceiros dá 401 na hora, e o refresh deixa de renovar. Não é preciso
rotacionar a chave do JWT.

```bash
$PSQL -v email='<e-mail da conta>' <<'SQL'
BEGIN;
UPDATE t_refresh_tokens SET status = 'REVOKED', revoked_at = now()
 WHERE status = 'ACTIVE'
   AND session_id IN (SELECT s.id FROM t_auth_sessions s JOIN t_users u ON u.id = s.user_id
                       WHERE u.email = :'email' AND s.status = 'ACTIVE');
UPDATE t_auth_sessions SET status = 'REVOKED', revoked_at = now(), revoked_reason = 'ADMIN'
 WHERE status = 'ACTIVE' AND user_id = (SELECT id FROM t_users WHERE email = :'email');
COMMIT;
SQL
```

Conferir que não sobrou sessão `ACTIVE` da conta. Se a senha também vazou, redefina-a (§ 11): a
revogação não impede um login novo.

## 11. Perda do pepper / redefinição de senha pelo operador

Sem o pepper, os hashes feitos com ele não podem ser verificados nem refeitos, e não existe
recuperação de senha nesta versão. Os lançamentos ficam intactos; o que se substitui é a credencial.

1. Contas afetadas:

   ```bash
   $PSQL -c "SELECT u.email FROM t_password_credentials c JOIN t_users u ON u.id = c.user_id
             WHERE c.pepper_id = '<id perdido>' ORDER BY 1;"
   ```

2. Se o perdido era o vigente, gere um pepper novo, torne-o vigente (§ 9) e recrie a API.
3. Para cada conta, o dono escolhe uma senha nova (12 a 128 caracteres) e o operador grava o hash
   feito **dentro do container da API** (mesmo Argon2id, parâmetros e pepper vigente). A senha vai por
   variável de ambiente sem valor na linha de comando, para não aparecer na lista de processos:

   ```bash
   read -rs NEW_PASSWORD && export NEW_PASSWORD
   HASH=$(docker compose exec -T -e NEW_PASSWORD api node -e '
   const argon2 = require("argon2");
   const env = process.env, id = env.PASSWORD_PEPPER_CURRENT_ID;
   const pw = env.NEW_PASSWORD.normalize("NFKC");
   if ([...pw].length < 12 || [...pw].length > 128) throw new Error("senha: 12 a 128 caracteres");
   const entry = env.PASSWORD_PEPPERS.split(",").find((e) => e.trim().startsWith(id + ":"));
   const secret = Buffer.from(entry.trim().slice(id.length + 1), "base64");
   argon2.hash(pw, { type: argon2.argon2id, memoryCost: +env.ARGON2_MEMORY_KIB,
     timeCost: +env.ARGON2_TIME_COST, parallelism: +env.ARGON2_PARALLELISM, secret })
     .then((h) => console.log(id + " " + h));')
   unset NEW_PASSWORD
   set -- $HASH
   $PSQL -v pid="$1" -v hash="$2" -v email='<e-mail da conta>' <<'SQL'
   UPDATE t_password_credentials SET password_hash = :'hash', pepper_id = :'pid', updated_at = now()
    WHERE user_id = (SELECT id FROM t_users WHERE email = :'email');
   SQL
   # esperado: UPDATE 1
   ```

4. Revogue as sessões da conta (§ 10) e remova o id perdido do chaveiro quando a consulta do passo 1
   voltar vazia.

O mesmo procedimento serve para "esqueci a senha" do dono enquanto não houver recuperação de senha.

## 12. Condição de lançamento público

Esta versão vai ao ar **só para o dono**. Abrir o cadastro a terceiros exige, antes, a change de
**recuperação e troca de senha** (sem ela, quem esquece a senha perde o acesso, e a única
contingência é o § 11, feita pelo operador). A verificação de e-mail tende a vir junto, e com ela o
409 do cadastro pode deixar de revelar quais e-mails têm conta. Outros limites a revisitar antes de
escalar: rate limit em memória (uma instância) e a imagem da API ainda em `node:22-alpine`.

## Registro de execução (2026-10-18)

Executado contra o compose local (Docker 28, `SMAUG_WEB_PORT=8081`, `.env.secrets` gerado como no
§ 4):

| Passo                                                      | Resultado                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker build` de `web/`                                   | ok; rota `ƒ /api/[...path]` dinâmica; `next.config.ts` carrega no runner sem devDependencies                                               |
| Mesma imagem com `API_ORIGIN` = A e depois = B             | respondeu `"api":"A"` e depois `"api":"B"`, sem rebuild                                                                                    |
| `docker compose up` **sem** `.env.secrets`                 | falha antes de criar containers (`env file … .env.secrets not found`)                                                                      |
| `.env.secrets` só com `DATABASE_URL`                       | API sai com código 1 listando `JWT_SECRET`, `JWT_KEY_ID`, `PASSWORD_PEPPERS`, `PASSWORD_PEPPER_CURRENT_ID` (migrations já aplicadas — § 6) |
| `.env.secrets` completo                                    | `api`, `web`, `postgres` healthy; porta da API não publicada; Argon2 com binário musl                                                      |
| `POST /api/auth/register` pelo web                         | 201, `Set-Cookie: smaug_refresh=…; Max-Age=604799; Path=/api/auth; HttpOnly; Secure; SameSite=Strict`                                      |
| `POST /api/auth/refresh`; `GET /api/users/me` com o Bearer | 200 + cookie novo; 200                                                                                                                     |
| `POST /api/auth/logout`                                    | 204 + cookie apagado; refresh depois → 401 `INVALID_REFRESH_TOKEN`                                                                         |
| Rate limit de cadastro sem proxy TLS                       | 10 × 201, depois 429; com `X-Forwarded-For` forjado → 201 (escapa: motivo do § 2)                                                          |
| O mesmo atrás de nginx com `X-Forwarded-For $remote_addr`  | 10 × 201 e 429, mesmo variando o cabeçalho forjado                                                                                         |
| § 6 conferência da migration                               | 3 migrations ok, incluindo `20261018150956_add_authentication`                                                                             |
| § 7 pré-checagem                                           | 0 linhas nas duas consultas                                                                                                                |
| § 7 passos 5–7 (usuário legado inserido à mão)             | cadastro com o mesmo e-mail → 409; `UPDATE 1`; cadastro → 201; import do CSV → 201                                                         |
| § 10 revogação administrativa                              | Bearer 200 antes; depois Bearer 401 `UNAUTHORIZED` e refresh 401 `INVALID_REFRESH_TOKEN`                                                   |
| § 8 rotação do JWT                                         | token da chave antiga ainda 200 com `JWT_PREVIOUS_*`; login novo com `kid` novo                                                            |
| § 9 rotação do pepper                                      | após um login, `pep-2026-10 \| 10` e `pep-2026-11 \| 1`; um `auth.password.rehashed` no log                                                |
| § 11 perda do pepper                                       | login no id perdido → 500 (`pepper … is not in the keyring`); após o script, senha nova → 200                                              |
