# Research: Project Base

**Branch**: `001-project-base` | **Date**: 2026-02-22
**Purpose**: Resolver decisões tecnológicas pendentes no Technical Context do plan.md.

## Decision 1: HTTP Framework

**Decision**: Express 4.x (com @types/express)

**Rationale**:

- Ecossistema mais maduro e maior base de middleware disponível.
- Documentação extensiva e comunidade ativa — menor curva de aprendizado.
- Será encapsulado em adapter na camada infrastructure (FR-003, Princípio III),
  então a troca futura para Fastify é viável sem impacto em domain/application.
- Express é suficiente para o escopo inicial (API de finanças pessoais).

**Alternatives considered**:

- **Fastify**: Melhor performance (benchmarks ~2x Express), schema validation
  nativa, melhor suporte a TypeScript. Rejeitado por ser menos necessário
  no escopo atual — performance não é constraint crítico para finanças pessoais.
  Pode ser adotado no futuro via troca do adapter.
- **Koa**: Middleware mais moderno (async/await nativo), mas ecossistema menor.
  Rejeitado pela menor disponibilidade de middleware pronto.

---

## Decision 2: ORM / Database Toolkit

**Decision**: Prisma

**Rationale**:

- Type-safety forte com geração automática de tipos a partir do schema.
- Suporte nativo a PostgreSQL e SQLite (FR-004, FR-014).
- Sistema de migrações robusto e cross-database (`prisma migrate`).
- Schema declarativo (`schema.prisma`) como fonte única de verdade para
  o modelo de dados — facilita onboarding e documentação.
- Prisma Client é gerado e pode ser encapsulado atrás de Repository
  interfaces na camada infrastructure.

**Alternatives considered**:

- **TypeORM**: Code-first com decorators, suporte amplo a bancos.
  Rejeitado por: manutenção inconsistente, bugs conhecidos em migrações,
  TypeScript types menos confiáveis.
- **Drizzle**: Mais leve, SQL-like API, zero overhead de geração.
  Rejeitado por: ecossistema mais jovem, menos tooling para migrações
  cross-database. Bom candidato futuro se Prisma se tornar limitante.

---

## Decision 3: Logging Library

**Decision**: pino

**Rationale**:

- Performance superior (logging JSON ~5x mais rápido que winston em benchmarks).
- Output JSON por padrão — alinhado com FR-015/FR-016.
- API minimalista e fácil de encapsular em adapter.
- `pino-pretty` disponível para dev local (human-readable).
- Baixo footprint — menos dependências transitivas.

**Alternatives considered**:

- **winston**: Mais flexível com transports (file, console, HTTP, etc.).
  Rejeitado por: overhead de performance, API mais complexa, maior número
  de dependências. O escopo atual não requer múltiplos transports —
  stdout JSON é suficiente (Docker coleta logs via stdout).

---

## Decision 4: Testing Framework

**Decision**: Vitest

**Rationale**:

- Compatível com API do Jest (migração trivial se necessário).
- Suporte nativo a TypeScript e ESM sem configuração adicional.
- Execução significativamente mais rápida que Jest (watch mode instantâneo).
- Configuração mínima via `vitest.config.ts`.
- Suporte a workspaces para separar suites unit/integration com configs
  diferentes (FR-006, FR-007).

**Alternatives considered**:

- **Jest**: Padrão da indústria, mais plugins disponíveis.
  Rejeitado por: configuração mais verbosa para TypeScript (ts-jest ou
  SWC transform), performance inferior no watch mode, ESM support
  ainda experimental.
- **Node.js test runner (node:test)**: Built-in no Node.js 22.
  Rejeitado por: API menos madura, sem mocking robusto integrado,
  menos tooling de cobertura.

---

## Decision 5: DI Container

**Decision**: tsyringe

**Rationale**:

- Leve e focado — resolve DI com decorators (@injectable, @inject).
- Mantido pela Microsoft, boa integração com TypeScript.
- Suporte a singleton e transient scopes.
- Sem overhead de runtime significativo.
- Encapsula resolução de dependências (FR-013) sem acoplar ao framework.

**Alternatives considered**:

- **InversifyJS**: Mais feature-rich (named bindings, middleware, etc.).
  Rejeitado por: mais complexo que o necessário para o escopo atual (YAGNI,
  Princípio V). API mais verbosa.
- **Manual DI (sem container)**: Factories e composition root manuais.
  Rejeitado por: escalabilidade — conforme o projeto cresce, manter
  wiring manual se torna propenso a erros. tsyringe é leve o suficiente
  para justificar o uso desde o início.

---

## Decision 6: Environment Validation Library

**Decision**: zod

**Rationale**:

- Já amplamente adotado no ecossistema TypeScript.
- Type inference automática — o schema define o tipo TypeScript.
- Zero dependências externas.
- API composável e declarativa para validação de env vars (FR-019).
- Mensagens de erro claras por padrão (alinhado com fail-fast).

**Alternatives considered**:

- **joi**: Maduro e robusto, mas tipagem TypeScript requer plugin separado.
  Rejeitado por: pior integração com TypeScript types, mais pesado.
- **env-var**: Focado exclusivamente em variáveis de ambiente.
  Rejeitado por: menos flexível — zod pode ser reusado para validação
  de DTOs e request bodies em features futuras.

---

## Summary of Technology Stack

| Concern          | Choice     | Version              |
| ---------------- | ---------- | -------------------- |
| Language         | TypeScript | 5.x (strict)         |
| Runtime          | Node.js    | 22 LTS               |
| Package Manager  | npm        | latest               |
| HTTP Framework   | Express    | 4.x                  |
| ORM / Migrations | Prisma     | latest               |
| Logging          | pino       | latest               |
| Testing          | Vitest     | latest               |
| DI Container     | tsyringe   | latest               |
| Env Validation   | zod        | latest               |
| Env Loading      | dotenv     | latest               |
| Linting          | ESLint     | latest (flat config) |
| Formatting       | Prettier   | latest               |
