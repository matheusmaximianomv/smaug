<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0 (MINOR: frontend context added)
  Modified principles: None (backend principles I–V text unchanged)
  Added sections:
    - ## Frontend
      - ### Core Principles (Principles I–V)
      - ### Architecture / Camadas
      - ### Technology Stack & Constraints
      - ### Development Workflow
  Modified sections:
    - ## Technology Stack & Constraints (backend):
        "Tipo de aplicação" updated to include frontend
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ updated (Option 2 frontend structure)
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
    - .specify/templates/agent-file-template.md ✅ no changes needed
  Follow-up TODOs: None
-->

# Smaug Constitution

## Core Principles

### I. Clean Architecture

O sistema DEVE seguir uma arquitetura em camadas com separação
clara de responsabilidades. A regra de dependência é inviolável:
camadas internas NÃO DEVEM depender de camadas externas.

- A camada de domínio (entities e use cases) DEVE ser pura e
  independente de qualquer detalhe de infraestrutura.
- Adapters e drivers (controllers, repositórios, frameworks)
  DEVEM residir nas camadas externas.
- A comunicação entre camadas DEVE ocorrer por meio de interfaces
  (ports) definidas na camada interna.

**Rationale**: Garantir que regras de negócio permaneçam estáveis
mesmo quando tecnologias externas mudam.

### II. Clean Code

Todo código produzido DEVE ser legível, autoexplicativo e
reutilizável. Priorizar clareza sobre brevidade.

- Nomes de variáveis, funções e classes DEVEM refletir
  sua intenção sem necessidade de comentários adicionais.
- Funções DEVEM ter responsabilidade única e tamanho reduzido.
- Duplicação de lógica DEVE ser eliminada por meio de
  abstrações coerentes.
- Código morto ou comentado NÃO DEVE ser mantido na base.

**Rationale**: Código limpo reduz custo de manutenção, facilita
revisão e acelera a integração de novos contribuidores.

### III. Independência de Frameworks

A lógica de negócio NÃO DEVE depender de frameworks ou
bibliotecas externas. Dependências externas DEVEM ser isoladas
atrás de abstrações (interfaces/ports).

- Trocar um framework (e.g., Express por Fastify) NÃO DEVE
  exigir alterações nas camadas de domínio ou aplicação.
- Bibliotecas de terceiros DEVEM ser encapsuladas em adapters
  dedicados.
- O domínio DEVE utilizar apenas tipos e construções nativas
  da linguagem (TypeScript).

**Rationale**: Evitar vendor lock-in e garantir que o sistema
evolua sem reescritas estruturais.

### IV. Baixo Acoplamento

Módulos DEVEM se comunicar por meio de contratos bem definidos.
Alterações em um módulo NÃO DEVEM propagar efeitos colaterais
para outros módulos.

- Dependências entre módulos DEVEM ser explícitas e injetadas
  (Dependency Injection).
- Cada módulo DEVE expor apenas o necessário via interface
  pública; detalhes internos DEVEM permanecer encapsulados.
- Eventos ou callbacks DEVEM ser preferidos sobre chamadas
  diretas quando a relação não é estritamente hierárquica.

**Rationale**: Baixo acoplamento permite evolução independente
dos módulos e facilita testes isolados.

### V. Sustentabilidade e Escalabilidade

O sistema DEVE ser projetado para evoluir de forma incremental.
Complexidade DEVE ser justificada por necessidade concreta, não
por antecipação especulativa.

- O princípio YAGNI (You Aren't Gonna Need It) DEVE ser
  aplicado: não implementar funcionalidades sem demanda real.
- Novas features DEVEM ser adicionáveis sem reescrita de
  código existente (Open/Closed Principle).
- A estrutura do projeto DEVE suportar crescimento sem
  degradação de organização ou performance de build.

**Rationale**: Um sistema sustentável mantém velocidade de
entrega constante ao longo do tempo.

## Technology Stack & Constraints

- **Linguagem**: TypeScript (strict mode habilitado).
- **Plataforma**: Node.js.
- **Tipo de aplicação**: API REST (backend) + Interface gráfica Next.js (frontend).
- **Domínio funcional**: Finanças pessoais — registro de
  receitas e despesas (fixas e eventuais), cálculo automático
  de saldo mensal, total economizado e evolução financeira.
- **Persistência**: A definir por feature; DEVE ser abstraída
  via Repository pattern na camada de infraestrutura.
- **Testes**: Framework a definir por feature; testes DEVEM
  cobrir domínio e use cases no mínimo.

## Development Workflow

- Todo código DEVE passar por revisão antes de merge na branch
  principal.
- Commits DEVEM ser atômicos e com mensagens descritivas
  seguindo Conventional Commits.
- Linting e formatação DEVEM ser executados automaticamente
  (e.g., ESLint + Prettier).
- Testes DEVEM passar antes de qualquer merge.
- Features DEVEM ser desenvolvidas em branches isoladas
  seguindo o padrão `###-feature-name`.

## Governance

Esta constituição é o documento normativo supremo do projeto
Smaug. Em caso de conflito entre práticas e esta constituição,
a constituição prevalece.

- **Emendas**: Qualquer alteração DEVE ser documentada,
  justificada e registrada com incremento de versão.
- **Versionamento**: Segue Semantic Versioning —
  MAJOR para remoções/redefinições incompatíveis de princípios,
  MINOR para adições ou expansões materiais,
  PATCH para clarificações e correções textuais.
- **Revisão de conformidade**: A cada nova feature, o
  Constitution Check no plan.md DEVE validar aderência
  aos princípios aqui definidos.

---

## Frontend

### Core Principles

#### I. Arquitetura Orientada a Domínio

O frontend DEVE ser organizado por features/domínios, não por
tipo técnico. A estrutura de pastas DEVE refletir as entidades
do negócio.

- Cada feature DEVE conter seus próprios `components`, `hooks`,
  `services` e `types` internamente.
- Estruturas globais como `/components` ou `/hooks` NÃO DEVEM
  concentrar lógica de features específicas.
- Componentes DEVEM ser preferencialmente presentacionais:
  recebem dados via props e disparam eventos.

**Rationale**: Organização por domínio facilita localização de
código, isolamento de mudanças e evolução independente de
features.

#### II. Separação entre UI e Lógica

Componentes React, hooks e services DEVEM ter responsabilidades
claramente distintas e não se sobrepor.

- Componentes DEVEM apenas renderizar, receber dados via props
  e disparar eventos — sem lógica de negócio.
- Hooks DEVEM encapsular regras de negócio, controle de estado
  e efeitos colaterais.
- Services DEVEM ser responsáveis exclusivamente por chamadas
  externas (API, armazenamento, etc.).
- Regras de negócio complexas NÃO DEVEM residir dentro de JSX.
- APIs externas NÃO DEVEM ser acessadas diretamente dentro de
  componentes.

**Rationale**: Separação clara de responsabilidades facilita
testes unitários, reutilização e manutenção independente.

#### III. Independência de Framework (Frontend)

A lógica de negócio do frontend NÃO DEVE depender diretamente
de APIs específicas do Next.js ou de qualquer outro framework.

- `useRouter`, `useSearchParams` e APIs específicas do Next.js
  NÃO DEVEM ser usados diretamente em hooks de negócio.
- Adapters DEVEM ser criados para: roteamento, cookies/sessão
  e acesso a serviços externos.
- O objetivo é permitir que a lógica de negócio seja
  reutilizável fora do contexto Next.js.

**Rationale**: Evitar vendor lock-in no frontend e garantir
portabilidade da lógica de negócio.

#### IV. Baixo Acoplamento entre Features

Features DEVEM ser independentes entre si. Importações diretas
de lógica entre features são PROIBIDAS.

- Compartilhamento de código DEVE ocorrer exclusivamente via
  `/shared` (UI e utilitários reutilizáveis) ou `/infra`
  (adapters e integrações externas).
- Comunicação entre partes DEVE usar props, context controlado
  ou eventos.
- Uma feature NÃO DEVE conhecer os detalhes internos de outra.

**Rationale**: Baixo acoplamento permite evolução e remoção de
features sem efeitos colaterais em outras partes do sistema.

#### V. Sustentabilidade e Simplicidade

O frontend DEVE priorizar soluções simples, legíveis e de fácil
manutenção. Complexidade DEVE ser justificada por demanda
concreta.

- YAGNI DEVE ser aplicado: não antecipar complexidade sem
  demanda real.
- Abstrações prematuras DEVEM ser evitadas.
- Código DEVE ser autoexplicativo; funções DEVEM ter
  responsabilidade única.
- Código morto NÃO DEVE ser mantido na base.
- Convenções de nomenclatura DEVEM ser seguidas:
  hooks → `useX`, services → `XService`, types → `XType`.

**Rationale**: Simplicidade mantém velocidade de entrega e
reduz o custo cognitivo de evolução do sistema.

### Architecture / Camadas

#### Fluxo de Dependências

A arquitetura em camadas do frontend DEVE seguir o fluxo
unidirecional abaixo. Dependências inversas são PROIBIDAS.

```
UI (components)
      ↓
Hooks / Use Cases
      ↓
Services / API Layer
      ↓
Infra / External
```

- UI DEVE depender de hooks — NÃO de services ou infra.
- Hooks DEVEM depender de services — NÃO de UI.
- Services NÃO DEVEM depender de UI ou hooks.

#### Modelo Híbrido Next.js (Server vs. Client)

- Server Components DEVEM ser o padrão para toda renderização.
- `"use client"` DEVE ser adicionado apenas quando necessário:
  interatividade, estado (`useState`/`useReducer`), efeitos
  (`useEffect`) ou APIs do browser.
- Lazy loading (`next/dynamic`) DEVE ser aplicado para
  componentes client pesados quando fizer sentido.

#### Estrutura de Pastas

```
/app                  # Next.js App Router (rotas, layouts, RSC)
/features             # Módulos organizados por domínio
  /[feature]/
    /components       # UI presentacional da feature
    /hooks            # Lógica de negócio e estado
    /services         # Integração com APIs externas
    /types            # Contratos e tipos da feature
/shared               # UI reutilizável, utilitários, tipos comuns
/infra                # Adapters externos (API client, router, storage)
```

### Technology Stack & Constraints

- **Framework**: Next.js com App Router.
- **Linguagem**: TypeScript (strict mode habilitado).
- **Renderização**: Server Components por padrão; Client
  Components apenas quando necessário (interatividade, estado,
  APIs do browser).
- **Estado**: Priorizar estado local (`useState`); estado
  global DEVE ser introduzido apenas com demanda concreta.
- **Domínio funcional**: Interface gráfica para finanças
  pessoais — visualização e gestão de receitas, despesas e
  saldo mensal.

### Development Workflow

- PRs DEVEM ser obrigatórios para merge na branch principal.
- Commits DEVEM seguir Conventional Commits.
- Lint e formatação DEVEM ser executados automaticamente.
- Testes DEVEM focar em hooks e lógica de negócio.
- PRs DEVEM incluir contexto da mudança e evidências visuais
  (screenshots ou gravações) para alterações de UI.
- A cada nova feature, o Constitution Check no plan.md DEVE
  validar aderência aos princípios desta seção.

---

**Version**: 1.1.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-04-21
