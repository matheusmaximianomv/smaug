# Tasks: Refatoração da Estrutura de Pastas (Server/Web)

**Feature**: 004-refactor-server-web  
**Input**: Design documents from `/specs/004-refactor-server-web/`  
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Esta refatoração trabalha com estrutura monorepo:
- **Estrutura atual**: `/src/`, `/tests/`, `/prisma/`, etc. (raiz)
- **Estrutura alvo**: `/server/`, `/web/`, `/` (orquestração)

---

## Phase 1: Setup (Preparação Inicial)

**Purpose**: Backup e validação do estado atual antes da refatoração

- [x] T001 Verificar que não há mudanças não commitadas com `git status`
- [x] T002 Criar branch de backup com `git branch backup-before-refactor`
- [x] T003 Executar testes atuais para garantir que estão passando com `npm test`
- [x] T004 Documentar estrutura atual listando diretórios principais

---

## Phase 2: Foundational (Não Aplicável)

**Purpose**: Esta refatoração não possui tarefas foundational bloqueantes. Cada user story é independente.

**Checkpoint**: Pode proceder diretamente para User Story 1

---

## Phase 3: User Story 1 - Migração do Backend para `server/` (Priority: P1) 🎯 MVP

**Goal**: Mover toda implementação atual da API para `server/`, preservando estrutura interna e funcionalidade

**Independent Test**: Executar todos os testes existentes da API (`npm test` em `server/`) e verificar que todos os endpoints continuam respondendo corretamente. Os scripts `npm run dev`, `npm start`, e `npm test` devem funcionar sem erros.

**Acceptance Criteria**:
- ✅ Todos os testes unitários e de integração continuam passando
- ✅ API responde com mesmas respostas de antes da migração
- ✅ Scripts `npm run dev`, `npm start`, `npm test` funcionam sem erros
- ✅ Todos os imports e caminhos relativos estão corretos

### Implementation for User Story 1

- [x] T005 [US1] Criar diretório `server/` na raiz do projeto
- [x] T006 [US1] Mover diretório `src/` para `server/src/` usando `git mv src server/`
- [x] T007 [US1] Mover diretório `tests/` para `server/tests/` usando `git mv tests server/`
- [x] T008 [US1] Mover diretório `prisma/` para `server/prisma/` usando `git mv prisma server/`
- [x] T009 [US1] Mover `package.json` para `server/package.json` usando `git mv package.json server/`
- [x] T010 [US1] Mover `package-lock.json` para `server/package-lock.json` usando `git mv package-lock.json server/`
- [x] T011 [US1] Mover `tsconfig.json` para `server/tsconfig.json` usando `git mv tsconfig.json server/`
- [x] T012 [US1] Mover `vitest.config.ts` para `server/vitest.config.ts` usando `git mv vitest.config.ts server/`
- [x] T013 [US1] Mover `docker-compose.yml` para `server/docker-compose.yml` usando `git mv docker-compose.yml server/`
- [x] T014 [US1] Mover `Dockerfile` para `server/Dockerfile` usando `git mv Dockerfile server/`
- [x] T015 [US1] Mover `.env.example` para `server/.env.example` usando `git mv .env.example server/`
- [x] T016 [US1] Criar `server/eslint.config.js` reutilizando configuração raiz (`import baseConfig from "../eslint.config.js"`)
- [x] T017 [US1] Copiar `.prettierrc` para `server/.prettierrc` usando `cp .prettierrc server/`
- [x] T018 [US1] Atualizar `server/package.json` alterando `name` para `"smaug-server"` e `description` para `"Smaug API - Backend"`
- [x] T019 [US1] Verificar que `server/tsconfig.json` mantém `baseUrl: "."` e paths apontam para `src/*`
- [x] T020 [US1] Executar `cd server && npm install` para instalar dependências
- [x] T021 [US1] Executar `cd server && npm run prisma:generate` para gerar Prisma client
- [x] T022 [US1] Executar `cd server && npm test` para validar que todos os testes passam
- [x] T023 [US1] Executar `cd server && npm run build` para validar que build funciona
- [x] T024 [US1] Testar execução com `cd server && npm run dev` (se .env configurado)

**Checkpoint**: User Story 1 completo - Backend migrado e funcional em `server/`

---

## Phase 4: User Story 2 - Criação da estrutura Next.js em `web/` (Priority: P2)

**Goal**: Criar aplicação Next.js 15 configurada na pasta `web/` com estrutura mínima funcional

**Independent Test**: Executar `npm run dev` na pasta `web/` e verificar que a aplicação Next.js inicia corretamente e exibe uma página padrão no navegador.

**Acceptance Criteria**:
- ✅ Todas as dependências do Next.js 15 são instaladas
- ✅ Servidor de desenvolvimento inicia na porta configurada
- ✅ Página inicial funcional é exibida no navegador
- ✅ Arquivos `package.json`, `tsconfig.json` e estrutura App Router (app/) existem

### Implementation for User Story 2

- [x] T025 [US2] Executar `npx create-next-app@latest web --typescript --tailwind --app --no-src-dir --import-alias "@/*"` na raiz do projeto
- [x] T026 [US2] Criar diretório `web/features/` para organização por domínio
- [x] T027 [US2] Criar diretório `web/shared/` para código reutilizável
- [x] T028 [US2] Criar diretório `web/infra/` para adapters externos
- [x] T029 [US2] Criar arquivo `web/features/.gitkeep` para preservar estrutura vazia
- [x] T030 [US2] Criar arquivo `web/shared/.gitkeep` para preservar estrutura vazia
- [x] T031 [US2] Criar arquivo `web/infra/.gitkeep` para preservar estrutura vazia
- [x] T032 [US2] Atualizar `web/tsconfig.json` adicionando paths: `"@/features/*": ["./features/*"]`, `"@/shared/*": ["./shared/*"]`, `"@/infra/*": ["./infra/*"]`
- [x] T033 [US2] Editar `web/app/page.tsx` criando página inicial com título "Smaug", subtítulo "Sistema de Gestão Financeira Pessoal" e texto "Interface em construção"
- [x] T034 [US2] Criar arquivo `web/.env.example` com variável `NEXT_PUBLIC_API_URL=http://localhost:3000`
- [x] T035 [US2] Executar `cd web && npm install` para garantir que dependências estão instaladas
- [x] T036 [US2] Executar `cd web && npm run dev` para validar que aplicação inicia
- [x] T037 [US2] Abrir navegador em `http://localhost:3000` e verificar que página inicial é exibida corretamente

**Checkpoint**: User Story 2 completo - Frontend Next.js 15 funcional em `web/`

---

## Phase 5: User Story 3 - Configuração da pasta root como orquestrador (Priority: P3)

**Goal**: Configurar pasta root com scripts de orquestração e configurações globais, delegando execução para `server/` e `web/`

**Independent Test**: Executar scripts da raiz (`npm run dev:server`, `npm run dev:web`) e verificar que delegam corretamente para as subpastas.

**Acceptance Criteria**:
- ✅ Script `npm run dev:server` delega para `server/` e API inicia
- ✅ Script `npm run dev:web` delega para `web/` e Next.js inicia
- ✅ `package.json` da raiz contém apenas dependências de desenvolvimento globais
- ✅ Sistema previne importações cruzadas entre `server/` e `web/`

### Implementation for User Story 3

- [x] T038 [US3] Criar `package.json` na raiz com `name: "smaug"`, `version: "1.0.0"`, `description: "Smaug - Sistema de Gestão Financeira Pessoal"`, `private: true`
- [x] T039 [US3] Adicionar `engines` no `package.json` raiz: `"node": ">=22.0.0"`, `"npm": ">=10.0.0"`
- [x] T040 [US3] Adicionar script `"dev:server": "npm run --prefix server dev"` no `package.json` raiz
- [x] T041 [US3] Adicionar script `"dev:web": "npm run --prefix web dev"` no `package.json` raiz
- [x] T042 [US3] Adicionar script `"dev": "npm run dev:server & npm run dev:web"` no `package.json` raiz
- [x] T043 [US3] Adicionar script `"build:server": "npm run --prefix server build"` no `package.json` raiz
- [x] T044 [US3] Adicionar script `"build:web": "npm run --prefix web build"` no `package.json` raiz
- [x] T045 [US3] Adicionar script `"build": "npm run build:server && npm run build:web"` no `package.json` raiz
- [x] T046 [US3] Adicionar script `"test:server": "npm run --prefix server test"` no `package.json` raiz
- [x] T047 [US3] Adicionar script `"test:web": "npm run --prefix web test"` no `package.json` raiz
- [x] T048 [US3] Adicionar script `"test": "npm run test:server && npm run test:web"` no `package.json` raiz
- [x] T049 [US3] Adicionar script `"lint:server": "npm run --prefix server lint"` no `package.json` raiz
- [x] T050 [US3] Adicionar script `"lint:web": "npm run --prefix web lint"` no `package.json` raiz
- [x] T051 [US3] Adicionar script `"lint": "npm run lint:server && npm run lint:web"` no `package.json` raiz
- [x] T052 [US3] Adicionar script `"format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""` no `package.json` raiz
- [x] T053 [US3] Adicionar script `"install:all": "npm install && npm install --prefix server && npm install --prefix web"` no `package.json` raiz
- [x] T054 [US3] Adicionar script `"validate:deps": "dependency-cruiser --validate .dependency-cruiser.js server web"` no `package.json` raiz
- [x] T055 [US3] Adicionar script `"prepare": "husky install"` no `package.json` raiz
- [x] T056 [US3] Adicionar devDependencies no `package.json` raiz: `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `dependency-cruiser`, `eslint`, `husky`, `lint-staged`, `prettier`, `typescript`, `typescript-eslint`
- [x] T057 [US3] Executar `npm install` na raiz para instalar dependências globais
- [x] T058 [US3] Criar arquivo `.dependency-cruiser.js` na raiz com regras `no-server-to-web` e `no-web-to-server`
- [x] T059 [US3] Adicionar regra `no-circular-dependencies` com severity `warn` em `.dependency-cruiser.js`
- [x] T060 [US3] Configurar `options` em `.dependency-cruiser.js`: `doNotFollow: {path: 'node_modules'}`, `tsPreCompilationDeps: true`, `tsConfig: {fileName: 'server/tsconfig.json'}`
- [x] T061 [US3] Executar `npx husky install` para inicializar Husky
- [x] T062 [US3] Executar `npx husky add .husky/pre-commit "npm run lint-staged"` para criar hook
- [x] T063 [US3] Criar arquivo `.lintstagedrc.json` na raiz com regras para `server/**/*.{ts,tsx}`, `web/**/*.{ts,tsx}`, e `*.{json,md}`
- [x] T064 [US3] Atualizar `README.md` na raiz documentando nova estrutura do projeto (server/, web/, scripts de orquestração)
- [x] T065 [US3] Adicionar seção "Instalação" no README.md com comando `npm run install:all`
- [x] T066 [US3] Adicionar seção "Desenvolvimento" no README.md com comandos `npm run dev`, `npm run dev:server`, `npm run dev:web`
- [x] T067 [US3] Adicionar seção "Testes" no README.md com comandos `npm test`, `npm run test:server`, `npm run test:web`
- [x] T068 [US3] Adicionar seção "Build" no README.md com comandos `npm run build`, `npm run build:server`, `npm run build:web`
- [x] T069 [US3] Adicionar seção "Validação" no README.md com comandos `npm run validate:deps`, `npm run lint`, `npm run format`
- [x] T070 [US3] Executar `npm run validate:deps` para verificar que não há importações cruzadas
- [x] T071 [US3] Executar `npm run dev:server` para validar que delega corretamente e API inicia
- [x] T072 [US3] Executar `npm run dev:web` para validar que delega corretamente e Next.js inicia
- [x] T073 [US3] Executar `npm test` para validar que testes de ambos os projetos executam

**Checkpoint**: User Story 3 completo - Orquestração root configurada e funcional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação final e documentação

- [x] T074 [P] Executar `npm run validate:deps` para validação final de importações cruzadas
- [x] T075 [P] Executar `npm test` para validação final de todos os testes
- [x] T076 [P] Executar `npm run build` para validação final de build de ambos os projetos
- [x] T077 Executar `npm run dev` para testar execução simultânea de server e web
- [x] T078 Verificar que server roda em `http://localhost:3000` e web em `http://localhost:3001`
- [x] T079 [P] Revisar mudanças com `git status` e `git diff`
- [x] T080 Executar `git add .` para adicionar todos os arquivos
- [x] T081 Criar commit com mensagem: "refactor: reorganizar projeto em estrutura server/web" incluindo BREAKING CHANGE
- [x] T082 [P] Atualizar documentação adicional que referencie estrutura antiga (se existir)
- [x] T083 [P] Atualizar scripts de CI/CD para refletir nova estrutura (se existir)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - não aplicável para esta refatoração
- **User Story 1 (Phase 3)**: Depends on Setup completion - MUST complete before US2 and US3
- **User Story 2 (Phase 4)**: Depends on US1 completion (backend migrado)
- **User Story 3 (Phase 5)**: Depends on US1 and US2 completion (ambos projetos existem)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories
- **User Story 2 (P2)**: MUST wait for US1 to complete (backend precisa estar em server/)
- **User Story 3 (P3)**: MUST wait for US1 and US2 to complete (precisa de ambos os projetos)

**⚠️ IMPORTANT**: Esta refatoração é SEQUENCIAL. Cada user story depende da anterior estar completa.

### Within Each User Story

**User Story 1 (Backend Migration)**:
- Tasks T005-T017: Podem ser executadas em sequência (movimentação de arquivos)
- Task T018-T019: Ajustes de configuração (após movimentação)
- Tasks T020-T024: Validação (após ajustes)

**User Story 2 (Frontend Setup)**:
- Task T025: Criação do projeto Next.js (bloqueante)
- Tasks T026-T031: Criação de estrutura de pastas (podem ser paralelas após T025)
- Tasks T032-T034: Configurações (após estrutura)
- Tasks T035-T037: Validação (após configurações)

**User Story 3 (Root Orchestration)**:
- Tasks T038-T056: Configuração do package.json raiz (sequencial, mas rápido)
- Task T057: Instalação de dependências (após T056)
- Tasks T058-T060: Configuração dependency-cruiser (podem ser paralelas com T061-T063)
- Tasks T061-T063: Configuração Husky (podem ser paralelas com T058-T060)
- Tasks T064-T069: Documentação README (podem ser paralelas)
- Tasks T070-T073: Validação final (sequencial)

### Parallel Opportunities

**Limited parallelism** due to sequential nature of refactoring:

- Within US1: Tasks T016-T017 (copiar configs) podem ser paralelas
- Within US2: Tasks T026-T031 (criar diretórios) podem ser paralelas após T025
- Within US2: Tasks T032-T034 (configurações) podem ser paralelas
- Within US3: Tasks T040-T055 (adicionar scripts) podem ser agrupadas em uma única edição
- Within US3: Tasks T058-T060 e T061-T063 podem ser paralelas
- Within US3: Tasks T064-T069 (documentação) podem ser paralelas
- Phase 6: Tasks T074-T076 podem ser paralelas

---

## Parallel Example: User Story 2

```bash
# Após criar projeto Next.js (T025), criar estrutura em paralelo:
Task T026: "Criar diretório web/features/"
Task T027: "Criar diretório web/shared/"
Task T028: "Criar diretório web/infra/"

# Configurações podem ser feitas em paralelo:
Task T032: "Atualizar web/tsconfig.json"
Task T033: "Editar web/app/page.tsx"
Task T034: "Criar web/.env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 3: User Story 1 (T005-T024)
3. **STOP and VALIDATE**: Test backend independently in `server/`
4. Commit: Backend migration complete

**At this point**: Backend está funcional em `server/`, mas frontend ainda não existe.

### Incremental Delivery

1. Complete Setup (Phase 1) → Backup criado
2. Complete User Story 1 (Phase 3) → Backend migrado e testado ✅
3. Complete User Story 2 (Phase 4) → Frontend criado e testado ✅
4. Complete User Story 3 (Phase 5) → Orquestração configurada e testada ✅
5. Complete Polish (Phase 6) → Validação final e commit ✅

### Sequential Execution (Recommended)

Esta refatoração deve ser executada **sequencialmente** devido às dependências:

1. **Day 1**: Setup + User Story 1 (Backend Migration)
   - Tempo estimado: 1-2 horas
   - Checkpoint: Backend funcional em `server/`

2. **Day 1**: User Story 2 (Frontend Setup)
   - Tempo estimado: 30-45 minutos
   - Checkpoint: Frontend funcional em `web/`

3. **Day 1**: User Story 3 (Root Orchestration)
   - Tempo estimado: 30-45 minutos
   - Checkpoint: Scripts de orquestração funcionais

4. **Day 1**: Polish & Validation
   - Tempo estimado: 15-30 minutos
   - Checkpoint: Tudo validado e commitado

**Total estimado**: 2-3 horas

---

## Notes

- Esta é uma refatoração **estrutural** - sem alterações de lógica
- **Zero breaking changes** na API existente
- Cada user story tem critérios de teste independentes
- Validação contínua após cada fase
- Usar `git mv` para preservar histórico do Git
- Commit incremental recomendado após cada user story
- Consultar `quickstart.md` para comandos detalhados
- Em caso de problemas, consultar seção Troubleshooting do quickstart.md

---

## Task Summary

- **Total Tasks**: 83
- **Setup**: 4 tasks
- **User Story 1 (P1)**: 20 tasks
- **User Story 2 (P2)**: 13 tasks
- **User Story 3 (P3)**: 36 tasks
- **Polish**: 10 tasks
- **Parallel Opportunities**: Limitadas (~15 tasks podem ser paralelas dentro de suas fases)
- **Estimated Time**: 2-3 horas (execução sequencial)
- **MVP Scope**: User Story 1 apenas (Backend migrado)
