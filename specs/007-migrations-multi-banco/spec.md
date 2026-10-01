# Feature Specification: Migrations Multi-Banco

**Feature Branch**: `007-migrations-multi-banco`
**Created**: 2026-09-30
**Status**: Implemented
**Input**: "Migrations e configuração do Prisma por provider de banco — SQLite para desenvolvimento e
testes, PostgreSQL para produção — com os comandos do Prisma lendo o ambiente e o `.env`"

> Feature de ferramental: os "usuários" aqui são quem desenvolve e quem opera o Smaug. Não há
> mudança de comportamento na API nem no web.

## Contexto

Hoje o server só funciona de ponta a ponta em SQLite, e mesmo assim por um caminho frágil:

- `prisma-prepare.mjs` lê **apenas** as variáveis do sistema. Sem `DATABASE_PROVIDER` exportado no
  terminal, ele assume `postgresql` e **reescreve o `schema.prisma` versionado** — mesmo que o
  `server/.env` diga `sqlite`. O acidente é frequente o bastante para o CI, o `run-e2e.mjs` e o
  `CLAUDE.md` carregarem travas e avisos de "nunca rode `prisma:prepare`".
- As migrations versionadas estão em dialeto SQLite (`migration_lock.toml` = `sqlite`). Não existe
  caminho de migration para PostgreSQL.
- A imagem Docker declara `DATABASE_PROVIDER=postgresql`, mas gera o client a partir do schema
  versionado (em `sqlite`) e aplica migrations SQLite contra um Postgres — a imagem não sobe.

## Clarifications

### Session 2026-09-30

- Q: Qual a precedência entre variável do sistema e `server/.env`? → A: **Sistema primeiro**; o
  `.env` só preenche o que não existir no ambiente. É a convenção do dotenv e a mesma que o
  `env.ts` do server já usa em runtime, então comandos do Prisma e server nunca enxergam bancos
  diferentes.
- Q: Um único conjunto de migrations serve aos dois bancos? → A: Não. O SQL gerado difere por
  dialeto (tipos, chaves primárias e estrangeiras, alteração de colunas) e o lock de migrations fixa
  um provider por pasta. Haverá **duas pastas de migrations versionadas**, uma por provider, com as
  **mesmas migrations — mesmos nomes, mesma ordem** — cada uma no dialeto do seu banco.
- Q: Como o desenvolvedor escolhe qual pasta é usada? → A: Pela `DATABASE_PROVIDER`. O comando é o
  mesmo para os dois bancos; a variável decide o schema e a pasta de migrations.
- Q: O `schema.prisma` versionado continua sendo reescrito? → A: Não. Passa a ser a **fonte única**
  dos models e nunca é alterado por comando; o schema de cada provider é gerado a partir dele, fora
  do controle de versão.
- Q: Como tratar o PostgreSQL, que não tem migrations hoje? → A: Recebe uma migration base
  equivalente ao estado atual. Não existe banco de produção, então não há histórico a preservar.
- Q: Testes de integração e E2E passam a usar migrations? → A: Não. Continuam recriando o banco
  descartável a partir do schema, sem histórico — só passam a apontar para o schema do provider
  SQLite gerado.
- Q: A alternativa "migrations só em PostgreSQL e SQLite sem migrations" foi considerada? → A: Sim, e
  descartada: deixaria o banco de desenvolvimento sem migrations e sujeito a perda de dados em
  mudanças destrutivas de schema.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Subir o server local sem armadilha (Priority: P1)

Quem clona o projeto copia o `.env.example`, roda os comandos documentados e tem a API no ar em
SQLite — sem precisar exportar variável no terminal e sem deixar diff em arquivo versionado.

**Why this priority**: É o primeiro contato de qualquer pessoa com o projeto, e hoje ele falha em
silêncio (troca o provider do schema versionado). Resolve sozinho o problema mais frequente.

**Independent Test**: Num clone limpo, com `server/.env` copiado do exemplo e nenhuma variável de
banco exportada, rodar generate + deploy + dev; `/health` responde 200 e `git status` sai limpo.

**Acceptance Scenarios**:

1. **Given** `server/.env` com `DATABASE_PROVIDER=sqlite` e nada exportado no terminal, **When** rodo
   o generate, **Then** o client é gerado para SQLite e nenhum arquivo versionado muda
2. **Given** o mesmo cenário, **When** rodo o deploy, **Then** as migrations SQLite são aplicadas ao
   banco do `DATABASE_URL` do `.env`
3. **Given** `.env` com `sqlite` e `DATABASE_PROVIDER=postgresql` exportado no terminal, **When**
   rodo qualquer comando do Prisma, **Then** vale `postgresql` — o sistema vence o arquivo
4. **Given** a variável não existe nem no sistema nem no `.env`, **When** rodo qualquer comando do
   Prisma, **Then** o comando para com uma mensagem dizendo qual variável falta e onde defini-la —
   sem assumir provider
5. **Given** `DATABASE_PROVIDER` com valor fora de `postgresql|sqlite|memory`, **When** rodo qualquer
   comando do Prisma, **Then** o comando para listando os valores aceitos
6. **Given** um banco de desenvolvimento criado **antes** desta feature, **When** rodo o deploy,
   **Then** as migrations já aplicadas são reconhecidas e nada é reaplicado

---

### User Story 2 - Rodar em PostgreSQL (Priority: P1)

Quem opera o Smaug sobe a API contra PostgreSQL — pela imagem Docker ou apontando um server local
para um Postgres — com as mesmas migrations que o desenvolvimento usa em SQLite.

**Why this priority**: É o destino de produção, e hoje não funciona de nenhuma forma.

**Independent Test**: `docker compose up` em `server/`; o container aplica as migrations PostgreSQL,
sobe, e `/health` responde 200 com o banco acessível.

**Acceptance Scenarios**:

1. **Given** um Postgres vazio, **When** rodo o deploy com `DATABASE_PROVIDER=postgresql`, **Then**
   todas as migrations PostgreSQL são aplicadas e o banco fica equivalente ao schema de origem
2. **Given** a imagem Docker, **When** ela é construída, **Then** o client gerado é o de PostgreSQL
3. **Given** o `docker compose up`, **When** o container inicia, **Then** as migrations PostgreSQL são
   aplicadas antes da API subir e o healthcheck passa
4. **Given** a API rodando em PostgreSQL, **When** exercito os fluxos de cadastro, receitas, despesas
   e dados, **Then** eles se comportam como em SQLite

---

### User Story 3 - Evoluir o schema nos dois bancos (Priority: P2)

Quem muda um model edita um único schema e cria a migration uma vez — ela nasce nas duas pastas, com
o mesmo nome, cada uma no seu dialeto. Se um lado ficar para trás, o CI avisa.

**Why this priority**: Só importa na próxima mudança de schema, mas sem ela as duas pastas divergem
na primeira oportunidade.

**Independent Test**: Adicionar um campo ao schema de origem, rodar o comando de nova migration e
verificar uma pasta nova com o mesmo nome em cada provider; apagar uma delas e ver o CI falhar.

**Acceptance Scenarios**:

1. **Given** alterei o schema de origem, **When** rodo o comando de nova migration com um nome,
   **Then** surge uma migration com esse mesmo nome em cada pasta, no dialeto de cada banco
2. **Given** uma pasta tem uma migration que a outra não tem, **When** o CI roda, **Then** ele falha
   apontando a migration órfã
3. **Given** alterei o schema de origem sem criar migration, **When** o CI roda, **Then** ele falha
   nos dois providers indicando que as migrations não reproduzem o schema
4. **Given** as duas pastas estão em dia, **When** o CI roda, **Then** a verificação passa

---

### Edge Cases

- `DATABASE_PROVIDER=memory`: os comandos do Prisma tratam como SQLite, como já acontece hoje.
- `server/.env` inexistente: vale só o ambiente do sistema, sem erro por falta do arquivo.
- Variável presente no sistema porém **vazia**: conta como definida e vence o `.env`, seguindo a
  convenção do dotenv — o comando então falha pela validação de valor.
- Trocar de provider na mesma máquina: exige gerar o client de novo; o schema gerado do provider
  anterior é simplesmente sobrescrito.
- Edição manual de um schema gerado: é perdida no próximo comando — a fonte é só o schema de origem.
- Rodar um comando do Prisma de fora de `server/` (via `--prefix`): resolve o `.env` e os caminhos a
  partir de `server/`, não do diretório corrente.
- Nome de migration já existente: o comando de nova migration recusa, nas duas pastas.

## Requirements _(mandatory)_

### Functional

- **FR-001**: Os comandos de preparo, geração do client e aplicação de migrations DEVEM resolver
  `DATABASE_PROVIDER` e `DATABASE_URL` pelo ambiente do sistema e, na ausência, pelo `server/.env`.
- **FR-002**: A precedência DEVE ser a mesma do server em runtime (sistema vence arquivo).
- **FR-003**: Sem `DATABASE_PROVIDER` resolvido, ou com valor inválido, os comandos DEVEM parar com
  mensagem clara — nunca assumir um provider por padrão.
- **FR-004**: Nenhum comando DEVE alterar arquivo versionado.
- **FR-005**: DEVE existir um único schema de origem versionado; o schema de cada provider DEVE ser
  derivado dele e não DEVE ser versionado.
- **FR-006**: DEVEM existir migrations versionadas para SQLite e para PostgreSQL, com o mesmo
  conjunto de nomes na mesma ordem.
- **FR-007**: O provider resolvido DEVE selecionar o schema e as migrations usados, com o mesmo
  comando para os dois bancos.
- **FR-008**: As migrations SQLite existentes DEVEM ser preservadas com os nomes e o conteúdo atuais,
  para que bancos de desenvolvimento já criados continuem reconhecidos.
- **FR-009**: O PostgreSQL DEVE receber uma migration base que produza schema equivalente ao atual.
- **FR-010**: DEVE existir um comando que crie uma migration nova, com o mesmo nome, nos dois
  dialetos.
- **FR-011**: O CI DEVE falhar quando as pastas divergirem entre si ou quando qualquer uma delas não
  reproduzir o schema de origem.
- **FR-012**: A imagem Docker DEVE gerar o client e aplicar as migrations de PostgreSQL.
- **FR-013**: Testes de integração e E2E DEVEM usar o schema SQLite derivado e continuar recriando o
  banco descartável sem migrations.
- **FR-014**: As travas e avisos que existem só por causa da reescrita do schema versionado (CI,
  `run-e2e.mjs`, `CLAUDE.md`) DEVEM ser removidos ou reescritos para o novo fluxo.
- **FR-015**: A documentação (`CLAUDE.md` e skills afetadas) DEVE descrever o passo a passo de
  primeira execução e o fluxo de nova migration.

### Non-Functional

- **NFR-001**: Nenhuma dependência nova: a leitura do `.env` usa o `dotenv` que o server já tem.
- **NFR-002**: Mudança em `server/src` restrita à infraestrutura de configuração: `env.ts` resolve o
  caminho SQLite relativo a partir de `server/` e `container.ts` usa o client único que recebe essa
  URL (ver D5 no plano). O resto da feature é schema, migrations, scripts, Docker, CI e harness de
  testes.
- **NFR-003**: A versão do Prisma (4.x) não muda nesta feature.

## Key Entities

- **Schema de origem**: definição única dos models, versionada, agnóstica de provider.
- **Schema por provider**: cópia derivada do schema de origem com o provider fixado; descartável.
- **Pasta de migrations por provider**: histórico versionado de migrations no dialeto de um banco,
  com lock próprio.
- **Migration**: passo nomeado de evolução do schema; existe com o mesmo nome em cada pasta.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Num clone limpo, a API sobe em SQLite com no máximo 5 comandos documentados, sem
  exportar variável no terminal.
- **SC-002**: Depois de rodar qualquer comando do Prisma, em qualquer provider, o controle de versão
  mostra zero arquivos alterados.
- **SC-003**: A imagem Docker sobe contra PostgreSQL e o health check responde saudável na primeira
  tentativa, a partir de um banco vazio.
- **SC-004**: As duas pastas de migrations têm sempre o mesmo número de migrations com os mesmos
  nomes — verificado a cada execução do CI.
- **SC-005**: 100% das divergências introduzidas de propósito (migration faltando num lado, schema
  alterado sem migration) fazem o CI falhar.
- **SC-006**: Toda a suíte existente (unit, integração, E2E) passa sem alteração de asserção.

## Assumptions

- Não existe banco PostgreSQL em produção; a migration base pode ser gerada do zero.
- O client do Prisma continua sendo gerado para um provider por vez; alternar exige regerar.
- Criar a migration PostgreSQL pode exigir um Postgres local; o `docker-compose.yml` que já existe em
  `server/` atende.
- O CI ganha um Postgres de serviço para a verificação de migrations; o restante do pipeline
  continua em SQLite.
