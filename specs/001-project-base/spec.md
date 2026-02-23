# Feature Specification: Project Base

**Feature Branch**: `001-project-base`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Crie a base do projeto, estrutura de banco de dados intercambiável (PostgreSQL, SQLite, etc.), base para testes unitários e de integração, base para Docker, pastas organizadas conforme Clean Architecture. Sem frontend."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Estrutura de Pastas Clean Architecture (Priority: P1)

Como desenvolvedor, quero que o projeto possua uma estrutura de
diretórios organizada seguindo os princípios da Clean Architecture,
para que cada camada (domain, application, infrastructure, presentation)
tenha responsabilidades bem definidas e o código seja fácil de navegar.

**Why this priority**: A estrutura de pastas é o alicerce de todo o
projeto. Sem ela, nenhuma outra funcionalidade pode ser construída de
forma organizada. Define a convenção que todas as features futuras
seguirão.

**Independent Test**: Pode ser verificado inspecionando a árvore de
diretórios do projeto e confirmando que as camadas estão separadas,
que não existem dependências cruzadas indevidas no código-fonte
inicial e que o projeto compila sem erros.

**Acceptance Scenarios**:

1. **Given** um repositório recém-clonado, **When** o desenvolvedor
   executa o build do projeto, **Then** o build completa com sucesso
   sem erros de compilação.
2. **Given** a estrutura de diretórios criada, **When** o
   desenvolvedor inspeciona as pastas, **Then** identifica camadas
   separadas para domain, application, infrastructure e presentation
   (API).
3. **Given** a camada de domínio, **When** o desenvolvedor analisa
   suas dependências, **Then** ela não importa nada de infrastructure
   ou presentation.

---

### User Story 2 - Camada de Persistência Intercambiável (Priority: P2)

Como desenvolvedor, quero que a camada de banco de dados seja
abstraída por meio de interfaces (Repository pattern), para que
seja possível trocar o mecanismo de persistência (PostgreSQL, SQLite,
in-memory, etc.) sem alterar a lógica de domínio ou aplicação.

**Why this priority**: A abstração de persistência é essencial para
manter a independência de frameworks (Princípio III da Constituição)
e viabilizar testes com implementações in-memory. Precede qualquer
feature de negócio que persista dados.

**Independent Test**: Pode ser verificado criando uma implementação
in-memory do repositório e executando uma operação básica de
leitura/escrita, confirmando que a interface é satisfeita sem
necessidade de banco de dados real.

**Acceptance Scenarios**:

1. **Given** uma interface de repositório definida na camada de
   domínio, **When** o desenvolvedor cria uma implementação
   in-memory, **Then** a implementação satisfaz a interface e
   operações CRUD básicas funcionam.
2. **Given** uma interface de repositório, **When** o desenvolvedor
   cria uma implementação para um banco relacional, **Then** a
   implementação satisfaz a mesma interface sem alterar nenhum
   código nas camadas de domínio ou aplicação.
3. **Given** a configuração do projeto, **When** o desenvolvedor
   altera a variável de ambiente que define o provider de banco,
   **Then** o sistema utiliza a implementação correspondente sem
   alteração de código.

---

### User Story 3 - Infraestrutura de Testes (Priority: P3)

Como desenvolvedor, quero que o projeto tenha a base configurada
para execução de testes unitários e de integração, para que toda
feature futura possa ser validada automaticamente desde o início.

**Why this priority**: A infraestrutura de testes garante qualidade
desde as primeiras features. Depende da estrutura de pastas (US1)
para saber onde os testes residem e da abstração de persistência
(US2) para testes com implementação in-memory.

**Independent Test**: Pode ser verificado executando o comando de
testes e confirmando que pelo menos um teste unitário de exemplo
e um teste de integração de exemplo passam com sucesso.

**Acceptance Scenarios**:

1. **Given** o projeto configurado, **When** o desenvolvedor executa
   o comando de testes unitários, **Then** os testes de exemplo
   passam com sucesso e o relatório é exibido.
2. **Given** o projeto configurado, **When** o desenvolvedor executa
   o comando de testes de integração, **Then** os testes de exemplo
   passam e são executados em isolamento dos testes unitários.
3. **Given** a estrutura de testes, **When** o desenvolvedor cria um
   novo teste em qualquer camada, **Then** o framework de testes
   detecta e executa o novo teste automaticamente.

---

### User Story 4 - Containerização com Docker (Priority: P4)

Como desenvolvedor, quero que o projeto tenha configuração Docker
pronta para uso, para que o ambiente de desenvolvimento e execução
seja reproduzível em qualquer máquina.

**Why this priority**: Docker garante consistência de ambiente, mas
é complementar à estrutura de código. Pode ser adicionado após as
fundações de código estarem prontas.

**Independent Test**: Pode ser verificado construindo a imagem
Docker e iniciando o container, confirmando que o servidor responde
a uma requisição de health check.

**Acceptance Scenarios**:

1. **Given** o Dockerfile e docker-compose configurados, **When** o
   desenvolvedor executa o build da imagem, **Then** a imagem é
   construída com sucesso sem erros.
2. **Given** a imagem construída, **When** o desenvolvedor inicia o
   container, **Then** a aplicação inicia e responde a uma
   requisição de health check.
3. **Given** o docker-compose configurado, **When** o desenvolvedor
   executa `docker compose up`, **Then** todos os serviços
   necessários (aplicação e banco de dados) sobem e se comunicam
   corretamente.

---

### Edge Cases

- O que acontece quando a variável de ambiente do provider de banco
  de dados não está definida? O sistema DEVE falhar com mensagem
  clara indicando a configuração ausente.
- O que acontece quando o provider de banco de dados informado não
  possui implementação? O sistema DEVE falhar na inicialização com
  erro descritivo.
- O que acontece quando o banco de dados está indisponível na
  inicialização? O sistema DEVE reportar o erro de conexão de forma
  clara, sem expor detalhes sensíveis.
- O que acontece quando testes unitários e de integração são
  executados simultaneamente? Eles DEVEM ser independentes e não
  interferir entre si.

## Clarifications

### Session 2026-02-22

- Q: Qual a estratégia de gerenciamento de migrações de schema? → A: Migrações via ORM/toolkit (e.g., TypeORM, Prisma, Drizzle) encapsuladas na camada de infrastructure.
- Q: Qual o nível de infraestrutura de logging no projeto base? → A: Logging estruturado (JSON) com biblioteca dedicada (e.g., pino, winston) encapsulada em adapter na camada de infrastructure.
- Q: Qual gerenciador de pacotes o projeto DEVE utilizar? → A: npm (padrão do Node.js, sem instalação adicional).
- Q: Qual a versão mínima do Node.js? → A: Node.js 22 LTS (manutenção ativa até abril 2027).
- Q: Como as variáveis de ambiente DEVEM ser carregadas e validadas? → A: Arquivos .env com dotenv + validação por schema na inicialização (e.g., zod, joi) — fail-fast com mensagem clara se config inválida.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O projeto DEVE possuir estrutura de diretórios
  separando as camadas domain, application, infrastructure e
  presentation conforme Clean Architecture.
- **FR-002**: A camada de domínio NÃO DEVE importar módulos das
  camadas infrastructure ou presentation.
- **FR-003**: O sistema DEVE expor interfaces de repositório
  (ports) na camada de domínio para operações de persistência.
- **FR-004**: O sistema DEVE suportar pelo menos duas
  implementações de persistência intercambiáveis (e.g.,
  in-memory para testes e banco relacional para produção).
- **FR-005**: A seleção do provider de persistência DEVE ser
  configurável via variáveis de ambiente, sem alteração de código.
- **FR-006**: O projeto DEVE ter configuração funcional para
  execução de testes unitários com comandos dedicados.
- **FR-007**: O projeto DEVE ter configuração funcional para
  execução de testes de integração com comandos dedicados,
  isolados dos testes unitários.
- **FR-008**: O projeto DEVE incluir um Dockerfile que produza
  uma imagem funcional da aplicação.
- **FR-009**: O projeto DEVE incluir um docker-compose que
  orquestre a aplicação e seus serviços de dependência (banco
  de dados).
- **FR-010**: A aplicação DEVE expor um endpoint de health check
  para verificação de disponibilidade.
- **FR-011**: O projeto DEVE ter configuração de linting e
  formatação automática.
- **FR-012**: O projeto DEVE compilar e iniciar sem erros a
  partir de um clone limpo seguindo instruções documentadas.
- **FR-013**: Dependências entre módulos DEVEM ser resolvidas
  por injeção de dependência.
- **FR-014**: Migrações de schema DEVEM ser gerenciadas por
  ORM/toolkit, encapsuladas na camada de infrastructure,
  garantindo compatibilidade cross-database entre os providers
  suportados.
- **FR-015**: O projeto DEVE incluir infraestrutura de logging
  estruturado (formato JSON) encapsulada em adapter na camada
  de infrastructure, acessível via interface (port) definida
  na camada de application.
- **FR-016**: Toda operação de entrada (request) e saída
  (response) da API DEVE ser registrada no log com timestamp,
  método, path e status code.
- **FR-017**: O projeto DEVE utilizar npm como gerenciador de
  pacotes. O package-lock.json DEVE ser versionado no
  repositório.
- **FR-018**: O projeto DEVE ter como versão mínima o Node.js 22
  LTS. O Dockerfile DEVE utilizar imagem base node:22-alpine
  (ou equivalente). O campo "engines" no package.json DEVE
  restringir a versão mínima.
- **FR-019**: Variáveis de ambiente DEVEM ser carregadas via
  dotenv (.env) e validadas por schema (e.g., zod, joi) na
  inicialização da aplicação. Se a validação falhar, o sistema
  DEVE encerrar imediatamente com mensagem descritiva (fail-fast).
- **FR-020**: O projeto DEVE incluir um arquivo .env.example
  versionado no repositório documentando todas as variáveis
  de ambiente necessárias com valores de exemplo. O arquivo
  .env real NÃO DEVE ser versionado.

### Key Entities

- **Repository Interface (Port)**: Contrato abstrato que define
  operações de persistência. Reside na camada de domínio. Cada
  entidade de negócio futura terá seu próprio repositório
  seguindo este padrão.
- **Database Configuration**: Representação da configuração de
  conexão ao banco de dados. Atributos: provider (tipo do banco),
  connection string, opções de pool.
- **Migration**: Representação de uma alteração incremental de
  schema. Gerenciada pelo ORM/toolkit na camada de infrastructure.
  Cada migração DEVE ser reversível e executável em qualquer
  provider suportado.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O projeto compila com sucesso (`build`) em menos
  de 30 segundos a partir de um clone limpo.
- **SC-002**: Testes unitários de exemplo executam e passam em
  menos de 10 segundos.
- **SC-003**: Testes de integração de exemplo executam e passam
  em menos de 30 segundos.
- **SC-004**: A imagem Docker é construída com sucesso e o
  container responde ao health check em menos de 60 segundos
  após `docker compose up`.
- **SC-005**: Trocar o provider de banco de dados requer
  alteração apenas em variáveis de ambiente e/ou arquivo de
  configuração — zero alterações em código de domínio ou
  aplicação.
- **SC-006**: Nenhuma dependência circular entre camadas é
  detectada por ferramentas de análise estática.
- **SC-007**: Ao receber uma requisição no health check, o
  sistema produz log estruturado (JSON) com pelo menos
  timestamp, método, path e status code.
