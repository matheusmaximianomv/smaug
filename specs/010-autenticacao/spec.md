# Feature Specification: Autenticação com e-mail e senha

**Feature Branch**: `010-autenticacao`
**Created**: 2026-10-18
**Status**: Implemented
**Input**: "Trocar a identificação por UUID (`X-User-Id`) por autenticação real com e-mail e senha,
sessão revogável e credencial de vida curta, antes de o Smaug ir para produção pública"

> A feature foi conduzida pelo fluxo OpenSpec (change `autenticacao-email-senha`, arquivada em
> `openspec/changes/archive/2026-10-18-autenticacao-email-senha/`, contrato em
> `openspec/specs/autenticacao/{conta-e-senha,sessao,acesso-a-api,sessao-no-navegador}` e delta em
> `openspec/specs/lancamentos/consulta-api`). Esta pasta traz o mesmo conteúdo no formato Spec Kit e
> é **autocontida**: o PRD, a especificação técnica, o spike e o runbook que a originaram existem só
> localmente (pasta `docs/`, fora do controle de versão), e tudo o que deles é necessário
> para entender, verificar e publicar a feature está resumido aqui. Onde documento e código
> divergiram, vale o código.

## Contexto

Antes desta feature o Smaug **não autenticava ninguém**, só identificava o usuário pelo UUID que o
próprio cliente mandava no header `X-User-Id`:

- o cadastro pedia nome e e-mail e mostrava uma tela "copie seu ID"; o login era um campo de UUID;
- a API conferia só o formato do UUID e a existência do usuário (401/404);
- o UUID ficava num cookie `userId` legível por JavaScript, com validade de 1 ano;
- `GET /users/:id` era aberto: quem soubesse um UUID obtinha nome e e-mail do dono;
- não havia senha, token, sessão nem revogação; "Sair" só apagava o cookie local.

O UUID era, portanto, uma credencial permanente e impossível de trocar, circulando em claro. O
projeto vai para produção pública com dados financeiros reais; antes disso a API precisa aceitar só
identidade **provada pelo servidor**, com credencial de vida curta e revogável.

## Clarifications

### Session 2026-10-18 (decisões fechadas no PRD e no design da change)

- Q: Existem usuários legados com dados reais? → A: Não. Só o dono usa o sistema hoje. A conta dele
  migra por exportação/importação do CSV da Área de Dados; não há código de migração de conta nem
  fluxo de ativação por UUID.
- Q: Recuperação de senha entra quando? → A: Na **próxima change**. É condição de lançamento: o
  cadastro só é aberto a terceiros depois dela.
- Q: Troca de senha pelo usuário logado entra agora? → A: Não; vai junto com a recuperação. Nesta
  feature a única reação a suspeita de vazamento é "Sair de todos os dispositivos".
- Q: Como o navegador guarda o refresh token sem depender de domínio compartilhado entre web e API?
  → A: Cookie `httpOnly` **na origem do web**, com a API repassada pelo próprio web em `/api`.
  `localStorage` foi descartado: um script malicioso levaria o refresh token para uso externo por
  até 30 dias.
- Q: Tamanho mínimo de senha? → A: 12 caracteres (máximo 128), contados após NFKC, sem regra de
  composição.
- Q: Tempos de vida? → A: Access token 10 min; refresh 7 dias sem uso; sessão no máximo 30 dias
  desde o login; tolerância de 30 s a renovações concorrentes. Todos configuráveis.
- Q: Checar senhas vazadas (Have I Been Pwned)? → A: Não nesta feature.
- Q: Haverá período de convivência entre `X-User-Id` e Bearer? → A: Não. Corte único: server, web e
  e2e vão juntos.
- Q: Como o web é publicado? → A: Imagem Docker própria, a mesma para os cenários "mesma máquina" e
  "máquinas diferentes"; o endereço da API é lido em tempo de execução.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Criar conta e entrar com e-mail e senha (Priority: P1)

Uma pessoa cria a conta com nome, e-mail e senha e já cai no dashboard; depois, volta e entra com
e-mail e senha. Nenhuma tela mostra ou pede o UUID.

**Why this priority**: É o objetivo central (PRD O1). Sem isso não há credencial a proteger.

**Independent Test**: Cadastrar pelo `/cadastro`, conferir que cai em `/dashboard` sem ver o ID,
sair e entrar de novo pelo `/login`.

**Acceptance Scenarios**:

1. **Given** um visitante em `/cadastro`, **When** envia nome, e-mail, senha e confirmação válidos,
   **Then** cai em `/dashboard` já logado, sem ver o próprio ID; a API respondeu 201 com
   `accessToken`, `tokenType: "Bearer"`, `expiresIn` e `user`, e o cookie de refresh
2. **Given** a senha e a confirmação diferem, **When** envia, **Then** o erro aparece no campo de
   confirmação e nenhuma requisição é enviada
3. **Given** uma senha com menos de 12 caracteres, **When** envia, **Then** o erro aparece no campo
   de senha e nenhuma requisição é enviada
4. **Given** já existe conta com `ana@exemplo.com`, **When** chega um cadastro com
   `"  Ana@Exemplo.COM "`, **Then** a resposta é 409 `EMAIL_ALREADY_EXISTS` e o formulário mostra
   "Já existe uma conta com este e-mail." com link para `/login`
5. **Given** cadastros de `ana.silva@gmail.com` e `anasilva+smaug@gmail.com`, **When** ambos são
   enviados, **Then** são duas contas distintas (sem regras por provedor)
6. **Given** dois cadastros simultâneos com o mesmo e-mail, **When** chegam juntos, **Then** um
   recebe 201 e o outro 409, nunca 500
7. **Given** a conta `ana@exemplo.com`, **When** o login envia `"ANA@exemplo.com"` e a senha
   correta, **Then** a resposta é 200 com o mesmo corpo do cadastro e o cookie de refresh
8. **Given** a conta foi criada com uma senha contendo `"ﬁ"` (ligadura), **When** o login envia a
   mesma senha com `"fi"`, **Then** o login é aceito (NFKC)
9. **Given** a conta foi criada com `" frase com espaços "`, **When** o login envia
   `"frase com espaços"`, **Then** é recusado com 401 `INVALID_CREDENTIALS` (espaços contam)
10. **Given** o mesmo usuário entra no dispositivo A e depois no B, **When** usa os dois,
    **Then** as duas sessões continuam válidas

---

### User Story 2 - Sessão contínua e invisível (Priority: P1)

O usuário usa o app por quanto tempo quiser, recarrega a página, abre várias abas — e nunca vê erro
de sessão enquanto o refresh token valer.

**Why this priority**: Um access token de 10 min sem renovação silenciosa tornaria o app inutilizável
(PRD O3, critérios 5–7).

**Independent Test**: Com access token de 20 s (e2e), navegar mais que isso, recarregar `/despesas`
e recarregar duas abas ao mesmo tempo, sem passar por `/login` nem ver toast.

**Acceptance Scenarios**:

1. **Given** um usuário logado, **When** recarrega `/despesas`, **Then** a página carrega com os
   dados dele, sem passar por `/login` e sem toast de erro
2. **Given** duas abas do app, **When** as duas recarregam ao mesmo tempo, **Then** as duas
   continuam logadas (uma renovação vence; a outra recebe 409, tenta de novo e segue)
3. **Given** o access token expirou, **When** três consultas falham com 401 juntas, **Then** o web
   faz **uma** renovação, refaz as três e a tela mostra os dados
4. **Given** a renovação responde 409 `REFRESH_TOKEN_CONFLICT`, **When** o web tenta de novo,
   **Then** segue sem mostrar erro
5. **Given** o usuário navega por 15 minutos seguidos, **When** o access token vence no meio,
   **Then** nenhuma tela mostra erro de sessão
6. **Given** a renovação falha por rede ou 5xx, **When** acontece, **Then** o usuário continua na
   página (erro transitório tratado como antes) e não é mandado para `/login`
7. **Given** um visitante sem indicador de sessão abre `/receitas`, **When** entra pelo `/login`,
   **Then** volta para `/receitas`; com um destino externo (`//outro.site`), vai para `/dashboard`
8. **Given** um usuário com indicador abre `/login` ou `/cadastro`, **Then** é levado a `/dashboard`

---

### User Story 3 - A API só aceita identidade provada (Priority: P1)

Toda rota de dados exige um access token emitido pelo servidor; conhecer o UUID de alguém não dá
acesso a nada.

**Why this priority**: É o buraco que motiva a feature (PRD O2, RS-13).

**Independent Test**: Chamar `/expenses` sem `Authorization`, com `X-User-Id` de um usuário real,
com `Basic …` e com token válido.

**Acceptance Scenarios**:

1. **Given** `GET /expenses?competenceYear=2026&competenceMonth=10` sem `Authorization`, **Then** 401
   `{error: "UNAUTHORIZED", message: "Authentication required"}`
2. **Given** `Authorization: Basic …`, **Then** 401 `UNAUTHORIZED`
3. **Given** só `X-User-Id` com o UUID de um usuário existente, **Then** 401 `UNAUTHORIZED`
4. **Given** o token de A e `X-User-Id` de B, **Then** a resposta traz só dados de A
5. **Given** o usuário A pede `GET /expenses/one-time/<id de B>`, **Then** 404, como antes
6. **Given** um token com `alg: "none"` e payload de um token válido, **Then** 401
7. **Given** um access token emitido há mais de 10 minutos, **Then** 401
8. **Given** `GET /users/me` com token válido, **Then** 200 com `{id, name, email, createdAt}`;
   `GET /users/<uuid>` e `POST /users` não devolvem perfil nem criam conta
9. **Given** `GET /expenses/summary?year=2026` ou `GET /revenues/summary?year=2026` sem token,
   **Then** 401 (delta de `lancamentos/consulta-api`)

---

### User Story 4 - Sair e sair de todos os dispositivos (Priority: P2)

O usuário encerra a sessão deste dispositivo, ou de todos, com efeito imediato no servidor.

**Why this priority**: É a única reação a suspeita de vazamento até a troca de senha existir (PRD O3,
critérios 9–10).

**Independent Test**: Duas abas; "Sair" numa derruba a outra na próxima chamada. "Sair de todos" a
partir de um contexto derruba o outro.

**Acceptance Scenarios**:

1. **Given** um usuário logado, **When** faz logout com o cookie, **Then** 204, cookie apagado, o
   refresh token deixa de renovar e o access token anterior recebe 401 **imediatamente**
2. **Given** `POST /auth/logout` sem cookie ou com sessão já revogada, **Then** 204 (idempotente)
3. **Given** sessões nos dispositivos A e B, **When** A chama "Sair de todos os dispositivos",
   **Then** nenhuma das duas renova e os access tokens de ambas recebem 401
4. **Given** "Sair" na aba A, **When** o usuário age na aba B, **Then** a renovação da aba B falha e
   ela vai para `/login`, sem laço com `/dashboard`
5. **Given** a API está fora do ar, **When** o usuário clica em "Sair", **Then** o access token e o
   indicador são apagados e ele vai para `/login`
6. **Given** logout e renovação da mesma sessão chegam juntos, **Then** a sessão termina revogada,
   sem refresh token válido, e as duas requisições terminam (sem deadlock)

---

### User Story 5 - Resistência a ataques (Priority: P2)

Um atacante com um refresh token roubado, tentando adivinhar senhas ou descobrir contas, encontra
respostas uniformes, limites de tentativa e revogação automática.

**Why this priority**: Produção pública com dados financeiros (PRD §9). Depende das US1–US4.

**Independent Test**: Reapresentar um refresh já trocado fora da janela; comparar o 401 de e-mail
inexistente com o de senha errada; estourar o limite de login.

**Acceptance Scenarios**:

1. **Given** um login com e-mail sem conta e outro com senha errada, **Then** ambos recebem 401 com o
   mesmo corpo `{error: "INVALID_CREDENTIALS", message}` e ambos executam uma verificação de senha
   completa (tempo da mesma ordem de grandeza); a conta anterior ao corte (sem senha) responde igual
2. **Given** T1 foi trocado por T2 há 5 minutos, **When** alguém apresenta T1, **Then** 401
   `INVALID_REFRESH_TOKEN`, T2 deixa de renovar, os access tokens da sessão recebem 401, um aviso
   `auth.refresh.reuse_detected` é logado — e as outras sessões do usuário continuam
3. **Given** 10 renovações simultâneas com o mesmo token (SQLite ou PostgreSQL), **Then** exatamente
   uma recebe 200, as demais 409, e a sessão fica com exatamente um refresh token válido
4. **Given** o mesmo IP envia mais de 10 logins para o mesmo e-mail em 15 min, **Then** os excedentes
   recebem 429 `TOO_MANY_REQUESTS` com `Retry-After`, mesmo com a senha correta
5. **Given** o mesmo IP envia mais de 10 cadastros em uma hora, **Then** os excedentes recebem 429
6. **Given** `POST /auth/refresh` com `Origin: https://malicioso.example`, **Then** 403
   `ORIGIN_NOT_ALLOWED` e o token não é rotacionado; sem `Origin`, a requisição segue
7. **Given** nenhum proxy confiável e um cliente variando `X-Forwarded-For`, **Then** todas as
   requisições contam para o IP real da conexão; com o web confiável, dois clientes atrás dele são
   contados separadamente
8. **Given** um script na página lê `document.cookie`, `localStorage` e `sessionStorage` com o usuário
   logado, **Then** não encontra o refresh token nem o access token
9. **Given** a bateria completa de cadastro, login, falha, renovação e logout com um coletor de logs,
   **Then** nenhuma entrada contém a senha, o access token, o refresh token ou o `Set-Cookie`

---

### User Story 6 - Publicação independente de domínio e migração da conta (Priority: P3)

O operador publica web e API na mesma máquina ou em máquinas diferentes, com a mesma imagem do web, e
migra a conta do dono sem perder lançamentos.

**Why this priority**: Necessária para o corte, mas não muda o comportamento do produto.

**Independent Test**: A mesma imagem do web iniciada com dois `API_ORIGIN` diferentes repassa para
cada um sem rebuild; CSV exportado na versão anterior importado numa conta nova e reexportado igual.

**Acceptance Scenarios**:

1. **Given** o web em `https://app.exemplo` e a API em `https://api.outro.exemplo`, **Then** login,
   renovação e logout funcionam e nenhuma requisição do navegador vai a `api.outro.exemplo`
2. **Given** a mesma imagem do web iniciada com dois endereços de API, **Then** cada instância
   repassa para o endereço com que foi iniciada, sem rebuild
3. **Given** o usuário exporta e importa o CSV em `/dados` pela origem do web, **Then** o arquivo
   tem o nome de `Content-Disposition` e o import é aceito como antes
4. **Given** a API inicia sem a chave do JWT, sem o chaveiro de peppers, com o pepper vigente fora
   do chaveiro, com segredo de menos de 32 bytes ou (fora de `test`) com custo de Argon2 abaixo do
   mínimo OWASP, **Then** o processo encerra com erro de configuração antes de aceitar requisições
5. **Given** o CSV exportado na versão anterior, **When** importado numa conta nova da versão nova,
   **Then** reproduz os lançamentos

### Edge Cases

- **Conta anterior ao corte** (linha de `t_users` sem credencial): não tem como entrar; login responde
  `INVALID_CREDENTIALS` igual a senha errada. O e-mail dela continua ocupando o índice único — a
  migração renomeia esse e-mail antes de cadastrar a conta nova.
- **Pepper desconhecido**: credencial que referencia um id de pepper ausente da configuração faz o
  login responder **500** com log de erro de configuração, não `INVALID_CREDENTIALS`.
- **Pepper errado sob o mesmo id**: nenhum login com a senha correta é aceito (prova de que o pepper
  participa da derivação).
- **Rehash**: no login correto, se os parâmetros de custo ou o pepper vigente mudaram, o hash é
  regravado; falha ao regravar é logada e não impede o login.
- **Login com senha curta**: a política de 12 caracteres não se aplica ao login (não revela nada da
  senha cadastrada); só o teto de 128 code points é aplicado, contra abuso do custo do Argon2.
- **Refresh na borda**: em `now == expiresAt` o token (e a sessão) já expirou; trocado há exatamente
  30 s ainda é conflito (borda inclusiva).
- **Vida máxima**: uma sessão renovada todo dia expira 30 dias depois do login; o refresh nunca vale
  além da vida máxima da sessão.
- **Corrida no CAS**: se outra requisição rotacionou entre a leitura e o compare-and-set, o servidor
  relê o token; trocado dentro da janela → 409, senão → 401.
- **Cookie legado `userId`**: é apagado no primeiro carregamento e não faz ninguém parecer logado.
- **Destino de retorno malicioso** (`?next=//evil`, `?next=/\evil`, URL absoluta): ignorado, vai para
  `/dashboard`.
- **Repasse sem `API_ORIGIN`**: cada chamada `/api/*` responde 500 sem corpo; API inalcançável → 502.
  Ambos são tratados pelo web como transitórios (não encerram a sessão).
- **`X-Forwarded-For` forjado com o web exposto direto**: o Next só preenche o cabeçalho quando o
  cliente não o envia, então o cliente escapa do limite por IP. Por isso a publicação exige um proxy
  reverso TLS na frente do web que sobrescreva o cabeçalho (ver [deploy.md](./deploy.md)).

## Requirements _(mandatory)_

### Functional Requirements

#### Conta e senha

- **FR-001**: `POST /auth/register` com `{name, email, password}` MUST criar o usuário e a credencial
  numa **única transação** e abrir uma sessão, respondendo 201 com access token e perfil; falha ao
  gravar a credencial não deixa usuário no banco.
- **FR-002**: Campo ausente, e-mail fora do formato ou `name` fora de 1–255 caracteres MUST responder
  400 `VALIDATION_ERROR` com `details`.
- **FR-003**: O e-mail MUST ser normalizado (trim + minúsculas) antes de validar, comparar e gravar,
  com no máximo 254 caracteres e sem regras por provedor.
- **FR-004**: Um e-mail normalizado MUST pertencer a no máximo uma conta; duplicado responde 409
  `EMAIL_ALREADY_EXISTS`, inclusive na corrida entre dois cadastros.
- **FR-005**: A senha MUST ter 12–128 code points após NFKC, sem regra de composição nem trim; a
  política vale no cadastro e MUST NOT valer no login (lá, só o teto de 128).
- **FR-006**: `POST /auth/login` com `{email, password}` corretos MUST abrir uma sessão nova (uma por
  login) e responder 200 com o mesmo corpo do cadastro e o cookie de refresh.
- **FR-007**: E-mail inexistente, senha errada e conta sem senha MUST receber a mesma resposta 401
  `INVALID_CREDENTIALS`, com corpo idêntico, uma verificação Argon2 completa em todos os caminhos e
  sem o e-mail na mensagem.
- **FR-008**: A senha MUST ser guardada só como Argon2id em formato PHC, salt aleatório de 16 bytes,
  com um pepper secreto fora do banco participando da derivação; a credencial registra o id do pepper.
  Senha em claro MUST NOT ser gravada nem logada.
- **FR-009**: No login correto, parâmetros de custo ou pepper vigente diferentes dos da credencial
  MUST disparar rehash; falha no rehash MUST ser logada e MUST NOT impedir o login.

#### Sessão

- **FR-010**: Abrir uma sessão MUST entregar o access token só no corpo e o refresh token só no
  cookie `smaug_refresh`, e registrar o método de login (`password`).
- **FR-011**: O cookie MUST ser `HttpOnly`, `SameSite=Strict`, `Path=/api/auth` (configurável), sem
  `Domain`, com `Max-Age` até a expiração do token, e `Secure` fora de development/test.
- **FR-012**: O access token MUST ser um JWT HS256, `typ: at+jwt`, com `iss`, `aud`, `sub`, `sid`,
  `jti`, `iat`, `exp`, válido por 10 min (configurável), sem nome nem e-mail. Assinatura ausente,
  outro algoritmo, outro tipo, emissor ou audiência, expirado ou claim ausente MUST ser recusado.
- **FR-013**: O refresh token MUST valer 7 dias desde a emissão (configurável), limitado à vida
  máxima da sessão de 30 dias desde o login (configurável); o banco guarda só o hash dele.
- **FR-014**: `POST /auth/refresh` MUST ler o cookie e, se válido, responder 200 com access token
  novo, `user` e refresh novo no cookie, invalidando o apresentado. Ausente, desconhecido, expirado,
  revogado ou de sessão encerrada → 401 `INVALID_REFRESH_TOKEN` com o cookie apagado.
- **FR-015**: Um refresh trocado há no máximo 30 s (configurável), reapresentado, MUST receber 409
  `REFRESH_TOKEN_CONFLICT` sem revogar e sem apagar o cookie. Renovações simultâneas com o mesmo
  token MUST gerar no máximo um par válido.
- **FR-016**: Reapresentar um refresh trocado há mais que a janela MUST revogar a sessão inteira
  (todos os tokens dela), responder 401 `INVALID_REFRESH_TOKEN` e logar aviso com usuário e sessão;
  as demais sessões do usuário MUST continuar válidas.
- **FR-017**: `POST /auth/logout` MUST revogar a sessão do cookie ou de um Bearer válido, responder
  204 e apagar o cookie; é idempotente e definitivo.
- **FR-018**: `POST /auth/logout-all`, com Bearer válido, MUST revogar todas as sessões ativas do
  usuário, responder 204 e apagar o cookie; sem token válido, 401 `UNAUTHORIZED`.
- **FR-019**: Logout e renovação concorrentes da mesma sessão MUST terminar com a sessão revogada e
  nenhum refresh válido, sem deadlock.
- **FR-020**: As rotas de `/auth` MUST recusar com 403 `ORIGIN_NOT_ALLOWED` um `Origin` presente e
  diferente da origem pública do web (`CORS_ORIGIN`); sem `Origin`, seguem.
- **FR-021**: Cadastro (10/h por IP), login (50/15 min por IP e 10/15 min por IP + e-mail
  normalizado) e renovação (60/min por IP) MUST ter limite de tentativas, todos configuráveis; acima
  dele, 429 `TOO_MANY_REQUESTS` com `Retry-After`. O IP do cliente MUST vir do salto de proxy
  confiável configurado e MUST NOT ser lido de `X-Forwarded-For` sem proxy confiável.

#### Acesso à API

- **FR-022**: Todas as rotas de dados (`/expenses/*`, `/revenues/*`, `/data/*`) e `/users/me` MUST
  exigir `Authorization: Bearer <access token>`; qualquer falha responde 401
  `{error: "UNAUTHORIZED", message: "Authentication required"}` sem detalhar o motivo. `/health` e
  `/auth/*` continuam abertas.
- **FR-023**: O servidor MUST ignorar `X-User-Id`.
- **FR-024**: Toda requisição autenticada MUST conferir, com no máximo uma leitura de banco, que a
  sessão do token existe, pertence ao usuário do token, está ativa e não passou da vida máxima.
- **FR-025**: A autorização por dono MUST continuar igual (registro alheio → 404).
- **FR-026**: `GET /users/me` MUST devolver `{id, name, email, createdAt}`; `POST /users` e
  `GET /users/:id` MUST deixar de existir.
- **FR-027**: A API MUST recusar a inicialização sem chave JWT, chaveiro de peppers ou id do pepper
  vigente, com segredo < 32 bytes, pepper vigente fora do chaveiro, `TRUST_PROXY` ausente (fora de
  development/test) ou, fora de `test`, Argon2 abaixo de 19456 KiB / t=2.
- **FR-028**: Nenhum log MUST conter senha, hash, pepper, chave, access/refresh token, cookie ou
  `Authorization`; eventos de segurança (`auth.*`) MUST ser logados com ids de usuário/sessão, sem o
  e-mail digitado no login.
- **FR-029**: Os resumos anuais (`GET /expenses/summary`, `GET /revenues/summary`) MUST exigir o
  access token (delta de `lancamentos/consulta-api`); o restante do contrato deles não muda.

#### Navegador

- **FR-030**: O web MUST fazer todas as chamadas por `/api/*` da própria origem, repassadas pelo
  servidor do Next ao `API_ORIGIN` lido em tempo de execução, preservando método, corpo,
  `Authorization`, `Cookie`, `Set-Cookie` (vários), `Origin`, o IP do cliente e o CSV byte a byte.
- **FR-031**: O access token MUST viver só em memória da aba; o refresh só no cookie `httpOnly`; o
  indicador `smaug_session=1` (sem segredo) só decide rotas. O cookie legado `userId` MUST ser
  apagado e ignorado.
- **FR-032**: O cadastro MUST pedir nome, e-mail, senha e confirmação e, com sucesso, ir ao dashboard;
  o login MUST pedir e-mail e senha; nenhuma tela mostra ou pede o UUID.
- **FR-033**: O web MUST mostrar em pt-BR "E-mail ou senha incorretos." (`INVALID_CREDENTIALS`),
  "Já existe uma conta com este e-mail." com link "Entrar" (`EMAIL_ALREADY_EXISTS`) e "Muitas
  tentativas. Aguarde alguns minutos e tente novamente." (`TOO_MANY_REQUESTS`).
- **FR-034**: Sem access token em memória numa página protegida, o web MUST renovar em silêncio e
  seguir com o perfil devolvido.
- **FR-035**: Um 401 fora de `/auth/*` MUST disparar **uma** renovação por aba (single-flight) e
  refazer cada chamada uma vez; 409 na renovação MUST ser tentado mais uma vez; sem toast.
- **FR-036**: Só uma renovação recusada com 401 MUST encerrar a sessão no web (apagar token e
  indicador, depois ir a `/login`); rede e 5xx MUST NOT.
- **FR-037**: Sem indicador, rota de `(app)` MUST ir a `/login?next=<rota>`; com indicador, `/login`
  e `/cadastro` MUST ir a `/dashboard`. Depois do login, o web MUST voltar a `next` só se for caminho
  interno (começa com `/`, não com `//` nem `/\`).
- **FR-038**: O menu MUST oferecer "Sair" e "Sair de todos os dispositivos"; ambos limpam o estado
  local e vão a `/login` mesmo com a API fora.

### Non-Functional Requirements

- **NFR-001**: Verificar uma senha leva ~100–500 ms no hardware de produção (padrão 64 MiB, t=3,
  p=4); nunca abaixo do piso OWASP fora de `test`.
- **NFR-002**: Rota protegida custa no máximo uma leitura de banco para autenticar (como o antigo
  `extractUser`).
- **NFR-003**: Mesmo comportamento em SQLite (dev, testes, e2e) e PostgreSQL (Docker), com a
  migration nos dois dialetos; a atomicidade da rotação não depende de lock nem de SQL cru.
- **NFR-004**: Cobertura do server continua 100%; `validate:deps` verde, com `argon2`/`jose`
  restritos a `server/src/infrastructure` e `cookie-parser`/`express-rate-limit` a
  `server/src/presentation`.
- **NFR-005**: Corte único: não há período de convivência entre `X-User-Id` e Bearer.
- **NFR-006**: A API pode ficar em qualquer domínio; nenhuma configuração de domínio compartilhado.
- **NFR-007**: O rate limit em memória vale para **uma** instância da API.
- **NFR-008**: Segredos ficam em arquivo `.env` não versionado, com permissão restrita, nunca em
  arquivo versionado, `environment:` do compose ou linha de comando.

### Key Entities

- **User** (existente): `id`, `name`, `email` (único, normalizado), `createdAt`. Ganha relação 1:1 com
  a credencial e 1:N com sessões.
- **PasswordCredential**: o segredo que o sistema guarda; 1:1 com o usuário (`userId` é a chave),
  `passwordHash` (PHC Argon2id) e `pepperId`.
- **AuthSession**: uma por login; `authMethod`, `status` (`ACTIVE`/`REVOKED`), `lastUsedAt`,
  `expiresAt` (vida máxima absoluta) e o motivo da revogação. "Expirada" é derivado.
- **RefreshToken**: elo de uma cadeia por sessão (`parentTokenId` único), só o hash, `status`
  (`ACTIVE`/`ROTATED`/`REVOKED`), `expiresAt`, `rotatedAt`.
- **EmailAddress** e **PasswordPolicy**: value objects das regras de e-mail e senha, reaproveitados
  pelos schemas de entrada.

Detalhe em [data-model.md](./data-model.md).

## Success Criteria _(mandatory)_

### Measurable Outcomes

Os critérios de aceite do PRD (§11), na mesma numeração:

- **SC-001**: Cadastro válido leva ao dashboard sem pedir login nem mostrar UUID.
- **SC-002**: Cadastro com e-mail já usado (inclusive com caixa/espaços diferentes) responde 409.
- **SC-003**: Login com senha errada e com e-mail inexistente produzem resposta idêntica (status,
  corpo e ordem de grandeza do tempo).
- **SC-004**: Nenhuma rota de dados aceita `X-User-Id`; sem `Authorization` válido, 401.
- **SC-005**: Depois de 10 minutos de uso contínuo, o app segue funcionando sem o usuário perceber a
  renovação.
- **SC-006**: Recarregar a página mantém o usuário logado enquanto o refresh valer.
- **SC-007**: Duas abas recarregadas ao mesmo tempo continuam logadas.
- **SC-008**: Reapresentar um refresh antigo (fora da janela) derruba aquela sessão: a próxima
  requisição dela recebe 401.
- **SC-009**: Depois de "Sair", o access token anterior deixa de ser aceito imediatamente.
- **SC-010**: Depois de "Sair de todos os dispositivos", nenhuma sessão do usuário renova.
- **SC-011**: No banco a senha só aparece como `$argon2id$v=19$m=…,t=…,p=…$<salt>$<hash>`; dois
  usuários com a mesma senha têm hashes diferentes.
- **SC-012**: Com o pepper errado configurado, nenhum login funciona.
- **SC-013**: Os logs de uma bateria completa de testes não contêm senha nem token emitido.
- **SC-014**: O CSV exportado na versão anterior, importado numa conta nova da versão nova, reproduz
  os lançamentos.
- **SC-015**: `GET /users/:id` não existe mais; `GET /users/me` só responde com token válido.
- **SC-016**: Com a API num domínio diferente do web, login, renovação e logout funcionam em Chrome,
  Firefox e Safari, sem o navegador chamar o domínio da API.

Métricas de operação (sem gate): zero `X-User-Id` nos logs de acesso depois do corte; reuso de
refresh detectado ≈ 0 em uso normal (valor alto indica bug de concorrência no web, não ataque);
nenhum relato de "fui deslogado sozinho" com várias abas.

A verificação de cada critério está em [tasks.md § Verificação](./tasks.md#verificação-realizada).

## Assumptions

- O único usuário real hoje é o dono; não há base legada a preservar além da conta dele, que migra
  por CSV (procedimento em [deploy.md](./deploy.md)).
- Uma única instância da API; o rate limit em memória basta.
- A publicação tem um proxy reverso com TLS na frente do web (o cookie é `Secure` e o proxy precisa
  sobrescrever `X-Forwarded-For`).
- O e-mail é identificador de login, não prova de posse da caixa postal (sem verificação nesta
  feature); a enumeração de contas pelo 409 do cadastro é um custo aceito, mitigado pelo rate limit.
- A equivalência das séries reimportadas pelo CSV era hipótese e foi conferida (SC-014).

## Out of Scope

- **Recuperação e troca de senha** — próxima change. **Condição para abrir o cadastro a terceiros**:
  até lá o único usuário é o dono, que tem o CSV e a redefinição pelo operador como contingência.
- Verificação de e-mail, MFA/2FA, passkeys.
- Login com Google/Apple (a sessão já é independente do método; nenhuma tabela ou rota de identidade
  externa foi criada).
- Painel de sessões ativas; exclusão de conta; autorização por papéis.
- Checagem de senhas vazadas.
- **Rate limit distribuído** (store compartilhado para várias instâncias).
- Job de limpeza de sessões e tokens antigos (há faxina oportunista no login: sessões do usuário
  expiradas ou revogadas há mais de 7 dias são apagadas, com seus tokens).
- **Node 24 na imagem da API**: `server/Dockerfile` segue em `node:22-alpine` (change separada); a
  feature funciona nas duas versões (`argon2` traz binário musl). A imagem nova do web já usa
  `node:24-alpine`.
