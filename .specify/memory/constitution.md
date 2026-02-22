<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (first version)
  Added sections:
    - Core Principles (5 principles)
    - Technology Stack & Constraints
    - Development Workflow
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
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
- **Tipo de aplicação**: API REST — sem interface gráfica.
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

**Version**: 1.0.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-02-22
