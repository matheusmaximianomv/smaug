# Research: Gestão de Receitas Mensais

**Branch**: `002-receitas` | **Date**: 2026-02-23
**Purpose**: Resolver decisões técnicas pendentes para implementação da feature de receitas.

## Decision 1: Persistência — SQLite via Prisma

**Decision**: SQLite como banco de dados, configurado via Prisma com provider `sqlite`.

**Rationale**:

- Solicitação explícita do usuário para usar SQLite nesta fase.
- Prisma já está configurado no projeto (001-project-base) com suporte a multi-provider.
- O `schema.prisma` atual usa `postgresql` — será alterado para `sqlite` com `DATABASE_URL` apontando para arquivo local.
- SQLite é suficiente para finanças pessoais (single-user por instância, volume baixo).
- Migração futura para PostgreSQL é trivial via Prisma (trocar provider + URL).

**Alternatives considered**:

- **PostgreSQL**: Mais robusto, suporte a concorrência nativa. Rejeitado nesta fase por adicionar complexidade de infra (Docker/serviço externo) desnecessária para o escopo atual.
- **In-Memory (existente)**: Já implementado no projeto. Rejeitado como provider principal por não persistir dados entre reinícios. Continuará sendo usado em testes unitários.

**Implementation notes**:

- Alterar `schema.prisma`: `provider = "sqlite"`, `url = "file:./dev.db"`.
- SQLite não suporta `@default(uuid())` nativamente — IDs serão gerados na aplicação (via `crypto.randomUUID()`) e passados ao Prisma como `String @id`.
- Valores monetários armazenados como `Float` no SQLite (Prisma mapeia `Decimal` para `Float` no SQLite). Validação de 2 casas decimais será feita na camada de domínio.

---

## Decision 2: Registro de Usuário Simplificado (sem JWT)

**Decision**: Registro de usuário simples com nome e email. Identificação via `userId` no header da requisição (sem autenticação JWT).

**Rationale**:

- Solicitação explícita do usuário: "registre o usuário de forma simples sem autenticação JWT".
- O foco desta feature é a gestão de receitas, não autenticação.
- O `userId` será enviado via header customizado (`X-User-Id`) em cada requisição.
- Um middleware extrairá o `userId` do header e validará sua existência no banco.
- Isso permite implementar o isolamento por usuário (FR-017) sem a complexidade de JWT.

**Alternatives considered**:

- **JWT completo**: Mais seguro, padrão da indústria. Rejeitado nesta fase conforme solicitação do usuário — será implementado em feature futura.
- **Sem usuário**: Simplifica drasticamente, mas impossibilita FR-017 (isolamento por usuário). Rejeitado por violar requisito funcional.

**Implementation notes**:

- Endpoint `POST /users` para criar usuário (nome + email únicos).
- Endpoint `GET /users/:id` para consultar usuário.
- Middleware `extractUser` valida `X-User-Id` header e injeta `userId` no `req`.
- Rotas de receitas exigem `X-User-Id` válido; rotas de usuário e health não exigem.

---

## Decision 3: Modelagem de Receitas Fixas Alteráveis — Versionamento

**Decision**: Receitas fixas alteráveis usam modelo de versionamento com tabela separada `FixedRevenueVersion`.

**Rationale**:

- FR-006 exige que alterações preservem o histórico dos meses anteriores.
- FR-016 exige rastreabilidade das mudanças ao longo do tempo.
- Um modelo de versionamento onde cada alteração cria uma nova versão com `effectiveFrom` (mês de início) resolve ambos os requisitos.
- Para consultar o valor vigente de um mês, busca-se a versão com `effectiveFrom <= mês` mais recente.

**Alternatives considered**:

- **Event Sourcing**: Rastreabilidade completa, mas over-engineering para o escopo atual (YAGNI, Princípio V). Rejeitado.
- **Campo `history` JSON**: Simples, mas dificulta queries por período e viola normalização. Rejeitado.
- **Colunas `previousValue`/`previousDescription`**: Limitado a uma alteração. Rejeitado por não suportar múltiplas alterações.

**Implementation notes**:

- `FixedRevenue` contém metadados imutáveis: `id`, `userId`, `startDate`, `endDate`, `modality`, `createdAt`.
- `FixedRevenueVersion` contém atributos versionados: `id`, `fixedRevenueId`, `description`, `amount`, `effectiveFrom`, `createdAt`.
- Na criação, uma versão inicial é criada automaticamente com `effectiveFrom = startDate`.
- Para receitas inalteráveis: apenas 1 versão é permitida (validação no domínio).

---

## Decision 4: Validação de Requests com Zod

**Decision**: Usar zod para validação de request bodies nos endpoints, via middleware de validação reutilizável.

**Rationale**:

- Zod já está no projeto (001-project-base) para validação de env vars.
- Type inference automática — schema define o tipo TypeScript do DTO.
- Consistente com a stack existente (Princípio II — Clean Code).
- Middleware genérico `validateRequest(schema)` centraliza validação e retorna erros descritivos (FR-015).

**Alternatives considered**:

- **express-validator**: Mais middleware-oriented, mas adiciona dependência extra desnecessária quando zod já está disponível. Rejeitado.
- **Validação manual nos controllers**: Duplicação de lógica, propenso a erros. Rejeitado.

---

## Decision 5: Estratégia de Testes

**Decision**: Testes unitários para domain entities/use-cases com mocks; testes de integração para endpoints HTTP com SQLite in-file temporário.

**Rationale**:

- Constitution exige: "testes DEVEM cobrir domínio e use cases no mínimo".
- Testes unitários usam InMemoryRepository (já existente) para isolar lógica de domínio.
- Testes de integração usam supertest (já instalado) + SQLite file temporário para testar fluxo completo (HTTP → Controller → Service → Use Case → Repository → DB).
- Vitest workspace já separa unit/integration com configs diferentes.

**Implementation notes**:

- Testes unitários: `tests/unit/domain/entities/`, `tests/unit/domain/use-cases/`.
- Testes de integração: `tests/integration/presentation/` — cada módulo (user, one-time-revenue, fixed-revenue).
- Setup de integração: criar/destruir banco SQLite temporário por suite.
- `DATABASE_PROVIDER=sqlite` e `DATABASE_URL=file:./test.db` para testes de integração.

---

## Decision 6: Convenção de Nomenclatura no Banco de Dados

**Decision**: Nomes de objetos no banco em `snake_case` com prefixo indicando o tipo do objeto.

**Rationale**:

- Padrão definido pelo usuário para manter consistência e legibilidade no schema do banco.
- O prefixo identifica rapidamente o tipo do objeto: `t_` para tabelas, `e_` para enums, `i_` para índices, `fk_` para foreign keys.
- Prisma suporta `@@map` (tabela) e `@map` (coluna) para manter os nomes no código TypeScript em PascalCase/camelCase enquanto o banco usa snake_case com prefixos.

**Naming rules**:

| Tipo   | Prefixo | Exemplo                                              |
| ------ | ------- | ---------------------------------------------------- |
| Tabela | `t_`    | `t_users`, `t_one_time_revenues`, `t_fixed_revenues` |
| Enum   | `e_`    | `e_modality`                                         |
| Índice | `i_`    | `i_one_time_revenues_user_competence`                |

**Column naming**: Todas as colunas em `snake_case` sem prefixo: `user_id`, `competence_month`, `created_at`, etc.

**Implementation notes**:

- No Prisma, usar `@@map("t_users")` no model e `@map("user_id")` nos campos.
- O código TypeScript continua usando PascalCase para models e camelCase para campos.
- Exemplo:
  ```prisma
  model User {
    id    String @id @map("id")
    name  String @map("name")
    email String @unique @map("email")
    @@map("t_users")
  }
  ```

---

## Summary of Decisions

| Concern               | Choice                                 | Notes                                                  |
| --------------------- | -------------------------------------- | ------------------------------------------------------ |
| Database              | SQLite via Prisma                      | Arquivo local, migração futura para PostgreSQL trivial |
| User Auth             | Header `X-User-Id` (sem JWT)           | Registro simples nome+email, middleware de extração    |
| Fixed Revenue History | Tabela `FixedRevenueVersion`           | Versionamento com `effectiveFrom` por mês              |
| Request Validation    | Zod middleware                         | Reutilizável, type-safe, já na stack                   |
| Testing Strategy      | Unit (InMemory) + Integration (SQLite) | Vitest workspace, supertest para HTTP                  |
| DB Naming             | snake_case + prefixo por tipo          | `t_` tabelas, `e_` enums; colunas snake_case           |
