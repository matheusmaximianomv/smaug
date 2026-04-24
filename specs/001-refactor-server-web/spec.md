# Feature Specification: Refatoração da Estrutura de Pastas (Server/Web)

**Feature Branch**: `001-refactor-server-web`  
**Created**: 2025-04-21  
**Status**: Clarified  
**Input**: User description: "Preparar a estrutura do projeto para suportar a futura implementação de uma interface gráfica (frontend), garantindo uma separação clara entre backend (API) e frontend (web), sem impactar o funcionamento atual da aplicação."

## Clarifications

### Session 2025-04-21

- Q: Como a prevenção de importações cruzadas deve ser aplicada? → A: dependency-cruiser
- Q: Onde devem ficar os arquivos de configuração de infraestrutura (.env, docker-compose.yml, Dockerfile)? → A: Duplicados em server/ e web/ (cada um independente)
- Q: Qual versão e estrutura do Next.js deve ser usada? → A: Next.js 15 com App Router (app/)
- Q: Como deve ser a estratégia de gerenciamento de dependências entre root, server e web? → A: Projetos completamente independentes (sem workspace)
- Q: Como os scripts da raiz devem executar comandos nas subpastas server/ e web/? → A: Usar `npm run --prefix server/ <script>` para delegar comandos

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Migração do Backend para pasta `server/` (Priority: P1)

Como desenvolvedor do projeto, preciso que toda a implementação atual da API seja movida para dentro da pasta `server/`, mantendo o funcionamento atual intacto, para que o projeto tenha uma estrutura clara que separe responsabilidades entre backend e frontend.

**Why this priority**: Esta é a base fundamental da refatoração. Sem a separação clara do backend, não é possível adicionar o frontend de forma organizada. É o primeiro passo crítico que viabiliza todas as demais mudanças.

**Independent Test**: Pode ser testado executando todos os testes existentes da API e verificando que todos os endpoints continuam respondendo corretamente. Os scripts `npm run dev`, `npm start`, e `npm test` devem funcionar sem erros.

**Acceptance Scenarios**:

1. **Given** o projeto está na estrutura atual, **When** a migração para `server/` é concluída, **Then** todos os testes unitários e de integração continuam passando
2. **Given** a API está rodando, **When** faço requisições aos endpoints existentes, **Then** recebo as mesmas respostas de antes da migração
3. **Given** a estrutura foi migrada, **When** executo `npm run dev`, **Then** o servidor inicia sem erros
4. **Given** o código foi movido, **When** verifico os imports, **Then** todos os caminhos relativos estão corretos

---

### User Story 2 - Criação da estrutura Next.js em `web/` (Priority: P2)

Como desenvolvedor do projeto, preciso de uma aplicação Next.js configurada na pasta `web/` com estrutura mínima funcional, para que o projeto esteja preparado para receber a implementação do frontend no futuro.

**Why this priority**: Após separar o backend, o próximo passo lógico é criar a base do frontend. Embora não implemente funcionalidades ainda, estabelece a estrutura que será usada em features futuras.

**Independent Test**: Pode ser testado executando `npm run dev` na pasta `web/` e verificando que a aplicação Next.js inicia corretamente e exibe uma página padrão no navegador.

**Acceptance Scenarios**:

1. **Given** a pasta `web/` foi criada, **When** executo `npm install` dentro dela, **Then** todas as dependências do Next.js 15 são instaladas
2. **Given** o Next.js está configurado, **When** executo `npm run dev` em `web/`, **Then** o servidor de desenvolvimento inicia na porta configurada
3. **Given** o servidor está rodando, **When** acesso a aplicação no navegador, **Then** vejo uma página inicial funcional
4. **Given** a estrutura foi criada, **When** verifico os arquivos de configuração, **Then** encontro `package.json`, `tsconfig.json` e estrutura App Router (app/) do Next.js 15

---

### User Story 3 - Configuração da pasta root como orquestrador (Priority: P3)

Como desenvolvedor do projeto, preciso que a pasta root contenha apenas scripts de orquestração e configurações globais, delegando execução específica para `server/` e `web/`, para que o projeto tenha uma estrutura modular e escalável.

**Why this priority**: Complementa a separação de responsabilidades, mas pode ser implementado após as duas primeiras histórias. Melhora a organização mas não bloqueia o desenvolvimento.

**Independent Test**: Pode ser testado executando scripts da raiz (ex: `npm run dev:server`, `npm run dev:web`) e verificando que eles delegam corretamente para as subpastas.

**Acceptance Scenarios**:

1. **Given** a pasta root está configurada, **When** executo `npm run dev:server`, **Then** o script delega para `server/` e a API inicia
2. **Given** a pasta root está configurada, **When** executo `npm run dev:web`, **Then** o script delega para `web/` e o Next.js inicia
3. **Given** as configurações globais existem, **When** verifico o `package.json` da raiz, **Then** encontro apenas dependências de desenvolvimento globais (ESLint, Prettier, Husky, etc.)
4. **Given** a estrutura está completa, **When** tento importar código entre `server/` e `web/`, **Then** o sistema previne importações cruzadas

---

### Edge Cases

- O que acontece se houver imports absolutos que referenciam a estrutura antiga?
- Como sincronizar variáveis de ambiente compartilhadas entre server/.env e web/.env?
- O que acontece com scripts npm que referenciam caminhos específicos?
- Como lidar com dependências compartilhadas entre server e web mantendo isolamento completo (sem workspaces)?
- O que acontece com arquivos de configuração de ferramentas (ESLint, Prettier, TypeScript) que afetam ambos os projetos?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema DEVE mover toda implementação atual da API para dentro da pasta `server/` preservando a estrutura interna
- **FR-002**: Sistema DEVE ajustar todos os imports e caminhos relativos após a migração para `server/`
- **FR-003**: Sistema DEVE manter todos os testes, configurações de banco de dados, Docker e validações funcionando após migração
- **FR-003a**: Sistema DEVE duplicar arquivos de configuração (.env, docker-compose.yml, Dockerfile) em server/ e web/ para independência completa
- **FR-004**: Sistema DEVE criar uma aplicação Next.js 15 funcional dentro da pasta `web/` usando App Router (estrutura app/)
- **FR-005**: Sistema DEVE configurar `package.json`, `tsconfig.json` e arquivos de configuração necessários em `web/` compatíveis com Next.js 15
- **FR-006**: Sistema DEVE garantir que `server/` e `web/` tenham seus próprios `package.json` e dependências completamente isoladas (sem npm workspaces)
- **FR-007**: Sistema DEVE configurar a pasta root para conter apenas scripts de orquestração usando `npm run --prefix` que delegam para server/ e web/ e documentação geral
- **FR-008**: Sistema DEVE manter dependências de desenvolvimento globais (ESLint, Prettier, Husky, lint-staged, dependency-cruiser) na raiz
- **FR-009**: Sistema DEVE prevenir importações cruzadas entre `server/` e `web/` usando dependency-cruiser para validação
- **FR-010**: Sistema DEVE garantir que todos os scripts de execução (`npm run dev`, `start`, `test`) continuem funcionais
- **FR-011**: Sistema DEVE preservar todo o comportamento atual da API sem alterações de lógica
- **FR-012**: Sistema DEVE criar apenas uma página inicial padrão em `web/` sem implementar funcionalidades de interface

### Non-Functional Requirements

- **NFR-001**: Arquitetura de projetos independentes sem npm workspaces para máximo isolamento
- **NFR-002**: Scripts de orquestração na raiz usando `npm run --prefix <pasta>/ <comando>` para delegação
- **NFR-003**: Validação de importações cruzadas via dependency-cruiser executada em CI/CD
- **NFR-004**: Configurações de infraestrutura (.env, docker-compose.yml, Dockerfile) duplicadas em server/ e web/
- **NFR-005**: Next.js 15 com App Router (estrutura app/) como base do frontend
- **NFR-006**: Compatibilidade mantida com Node.js 22 LTS em ambos os projetos

### Assumptions

- O projeto atual segue Clean Architecture com camadas bem definidas (domain, application, infrastructure, presentation)
- Existe um `package.json` na raiz com scripts e dependências
- O projeto usa TypeScript com configuração strict
- Existem testes unitários e de integração que devem continuar passando
- O projeto usa ferramentas de qualidade de código (ESLint, Prettier) que devem ser mantidas
- Não há necessidade de comunicação entre server e web neste momento

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Todos os testes existentes (unitários e integração) continuam passando após a migração para `server/`
- **SC-002**: A API responde a todas as requisições existentes com os mesmos resultados de antes da refatoração
- **SC-003**: Os scripts `npm run dev`, `npm start`, e `npm test` executam sem erros após ajustes
- **SC-004**: A aplicação Next.js em `web/` inicia e exibe uma página funcional no navegador
- **SC-005**: Não existem importações cruzadas entre `server/` e `web/` (verificável por análise estática)
- **SC-006**: O tempo de build e execução dos testes permanece similar ao anterior (variação máxima de 10%)
- **SC-007**: Desenvolvedores conseguem executar server e web independentemente sem conflitos
