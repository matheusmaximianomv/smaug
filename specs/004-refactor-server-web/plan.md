# Implementation Plan: Refatoração da Estrutura de Pastas (Server/Web)

**Branch**: `004-refactor-server-web` | **Date**: 2025-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-refactor-server-web/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Preparar a estrutura do projeto para suportar a futura implementação de uma interface gráfica (frontend), garantindo uma separação clara entre backend (API) e frontend (web), sem impactar o funcionamento atual da aplicação. A refatoração envolve:

1. **Migração do Backend**: Mover toda implementação atual da API para `server/`, preservando estrutura interna e funcionalidade
2. **Setup do Frontend**: Criar aplicação Next.js 15 com App Router em `web/` com estrutura mínima funcional
3. **Orquestração Root**: Configurar pasta raiz com scripts de delegação usando `npm run --prefix` e dependências de desenvolvimento globais

**Abordagem Técnica**: Projetos completamente independentes (sem npm workspaces), com validação de importações cruzadas via dependency-cruiser, configurações de infraestrutura duplicadas em cada projeto, e scripts de orquestração na raiz usando `npm run --prefix`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Node.js 22 LTS
**Primary Dependencies**:
- **Backend**: Express 5.x, Prisma 4.x, tsyringe (DI), pino (logging), Vitest (testing)
- **Frontend**: Next.js 15 (App Router), React, TailwindCSS (assumed), TypeScript
- **DevOps**: Docker, PostgreSQL (database), dotenv (env management)
- **Quality**: ESLint, Prettier, Husky, lint-staged, dependency-cruiser

**Storage**: PostgreSQL (via Prisma ORM) - já configurado no projeto atual
**Testing**: Vitest (unit + integration) - framework já em uso no backend
**Target Platform**: Linux server (backend) + Modern browsers (frontend)
**Project Type**: Monorepo estrutural (não workspace) - API REST + Web Application
**Performance Goals**: 
- Manter performance atual da API (variação máxima de 10% no tempo de build/testes)
- Next.js 15 com otimizações padrão (Server Components, code splitting)

**Constraints**:
- Zero breaking changes na API existente
- Projetos completamente independentes (sem npm workspaces)
- Validação de importações cruzadas obrigatória (dependency-cruiser)
- Compatibilidade com Node.js 22 LTS em ambos os projetos

**Scale/Scope**: 
- Refatoração estrutural (não adiciona funcionalidades)
- ~2 projetos independentes (server + web)
- Frontend inicial: apenas página padrão (sem features implementadas)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Backend Principles

✅ **I. Clean Architecture**: A migração para `server/` preserva a estrutura em camadas existente (domain, application, infrastructure, presentation). Nenhuma alteração nas dependências entre camadas.

✅ **II. Clean Code**: Refatoração estrutural apenas - sem alterações de lógica. Código permanece legível e com responsabilidades claras.

✅ **III. Independência de Frameworks**: A migração não altera o isolamento de frameworks. Express continua encapsulado em adapters na camada de apresentação.

✅ **IV. Baixo Acoplamento**: Projetos `server/` e `web/` são completamente independentes. Validação via dependency-cruiser garante zero acoplamento entre eles.

✅ **V. Sustentabilidade e Escalabilidade**: Estrutura modular permite evolução independente de backend e frontend. YAGNI aplicado - apenas estrutura base do frontend, sem features prematuras.

### Frontend Principles

✅ **I. Arquitetura Orientada a Domínio**: Next.js 15 será configurado com estrutura `/features` por domínio conforme constituição.

✅ **II. Separação entre UI e Lógica**: Estrutura base preparada para separação components/hooks/services (implementação em features futuras).

✅ **III. Independência de Framework**: Estrutura `/infra` para adapters será criada desde o início.

✅ **IV. Baixo Acoplamento entre Features**: Isolamento garantido por dependency-cruiser. Sem features implementadas nesta refatoração.

✅ **V. Sustentabilidade e Simplicidade**: Apenas página padrão inicial. Sem abstrações prematuras. Nomenclatura seguirá convenções (useX, XService, XType).

### Technology Stack Compliance

✅ **Backend**: TypeScript strict + Node.js 22 LTS + Express + Prisma (conforme constituição)
✅ **Frontend**: Next.js 15 App Router + TypeScript strict (conforme constituição v1.1.0)
✅ **Testing**: Vitest mantido para backend (conforme decisão feature 001-project-base)
✅ **Development Workflow**: ESLint + Prettier + Husky mantidos na raiz

### Gate Status: ✅ PASS

Nenhuma violação identificada. A refatoração é puramente estrutural e alinha-se completamente com todos os princípios da constituição v1.1.0.

## Project Structure

### Documentation (this feature)

```text
specs/004-refactor-server-web/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (N/A - structural refactoring only)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (N/A - no new contracts)
├── checklists/
│   └── requirements.md  # Specification quality validation (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Estrutura Atual** (antes da refatoração):
```text
/
├── src/                 # Backend atual (Clean Architecture)
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── tests/
│   ├── unit/
│   └── integration/
├── prisma/              # Database schema e migrations
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
└── [configs: .eslintrc, .prettierrc, etc.]
```

**Estrutura Alvo** (após refatoração):
```text
/
├── server/              # Backend migrado (Clean Architecture preservada)
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── prisma/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── [configs específicos do server]
│
├── web/                 # Frontend Next.js 15 (novo)
│   ├── app/             # Next.js App Router
│   │   ├── layout.tsx
│   │   └── page.tsx     # Página inicial padrão
│   ├── features/        # Estrutura preparada (vazia inicialmente)
│   ├── shared/          # Estrutura preparada (vazia inicialmente)
│   ├── infra/           # Estrutura preparada (vazia inicialmente)
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── tailwind.config.js
│
├── .dependency-cruiser.js  # Validação de importações cruzadas
├── package.json            # Orquestração root (scripts delegados)
├── .eslintrc.json          # Config global ESLint
├── .prettierrc             # Config global Prettier
├── .husky/                 # Git hooks globais
├── README.md               # Documentação atualizada
└── [outros configs globais]
```

**Structure Decision**: Monorepo estrutural com projetos independentes. A estrutura escolhida segue o padrão de separação física completa entre backend (`server/`) e frontend (`web/`), sem uso de npm workspaces. Cada projeto mantém suas próprias dependências, configurações e ciclo de vida independente. A raiz serve apenas como orquestrador via scripts `npm run --prefix`.

## Complexity Tracking

N/A - Nenhuma violação da constituição identificada. Todos os gates passaram.

---

## Phase Completion Summary

### ✅ Phase 0: Research (Completed)

**Artefato**: [research.md](./research.md)

Todas as decisões técnicas foram documentadas:
1. Estratégia de migração de código (git mv incremental)
2. Configuração de dependency-cruiser para validação
3. Gerenciamento de configurações duplicadas
4. Scripts de orquestração com npm run --prefix
5. Setup do Next.js 15 com App Router
6. Ajuste de imports absolutos e TypeScript paths
7. Configuração de ferramentas de qualidade multi-projeto

**Resultado**: Nenhuma clarificação pendente. Todas as questões técnicas resolvidas.

### ✅ Phase 1: Design (Completed)

**Artefatos**:
- [quickstart.md](./quickstart.md) - Guia passo-a-passo completo da refatoração
- **data-model.md**: N/A (refatoração estrutural, sem novos modelos de dados)
- **contracts/**: N/A (sem novos contratos de interface)

**Resultado**: Documentação de implementação completa e pronta para execução.

### ⏭️ Phase 2: Task Breakdown (Next Step)

**Comando**: `/speckit.tasks`

Este comando irá gerar `tasks.md` com a decomposição detalhada das tarefas de implementação baseadas neste plano.

---

## Next Steps

1. **Executar `/speckit.tasks`** para gerar lista de tarefas ordenadas por dependência
2. **Seguir o guia em [quickstart.md](./quickstart.md)** para executar a refatoração
3. **Validar cada fase** conforme descrito no quickstart (testes, build, execução)
4. **Commit incremental** após cada fase bem-sucedida

## References

- **Specification**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Quickstart Guide**: [quickstart.md](./quickstart.md)
- **Constitution**: [../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)
- **Requirements Checklist**: [checklists/requirements.md](./checklists/requirements.md)
