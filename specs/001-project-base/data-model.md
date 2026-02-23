# Data Model: Project Base

**Branch**: `001-project-base` | **Date**: 2026-02-22
**Source**: spec.md (Key Entities) + research.md (Prisma)

## Overview

O projeto base não define entidades de negócio — estas serão
criadas em features futuras (receitas, despesas, etc.). Este
documento define as **abstrações de infraestrutura** e os
**contratos de persistência** que todas as entidades futuras
seguirão.

## Core Abstractions

### 1. Repository Interface (Port)

Contrato genérico que toda entidade de negócio futura DEVE
implementar. Reside em `src/domain/ports/`.

```typescript
// src/domain/ports/repository.interface.ts
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}
```

**Regras de validação**:

- `ID` DEVE ser tipado (string UUID por padrão).
- Métodos DEVEM retornar Promises (async por natureza).
- `findById` retorna `null` se não encontrado (não lança exceção).
- `create` retorna a entidade criada com ID gerado.
- `update` recebe `Partial<T>` para atualizações parciais.

**Implementações planejadas** (nesta feature):

- `InMemoryRepository<T>` — `src/infrastructure/database/repositories/in-memory.repository.ts`
- Implementação Prisma — adicionada conforme entidades de negócio surjam

### 2. Logger Interface (Port)

Contrato para logging estruturado. Reside em `src/application/ports/`.

```typescript
// src/application/ports/logger.interface.ts
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}
```

**Implementação**: `PinoLogger` em `src/infrastructure/logging/logger.ts`

### 3. Database Configuration

```typescript
// src/infrastructure/config/env.ts (parte do schema zod)
{
  DATABASE_PROVIDER: "postgresql" | "sqlite",
  DATABASE_URL: string,        // Connection string completa
  NODE_ENV: "development" | "production" | "test",
  PORT: number,                // Porta do servidor HTTP (default: 3000)
  LOG_LEVEL: "debug" | "info" | "warn" | "error"  // default: "info"
}
```

**Regras de validação** (zod schema):

- `DATABASE_PROVIDER` DEVE ser um dos providers suportados.
- `DATABASE_URL` DEVE ser string não-vazia.
- `PORT` DEVE ser número inteiro entre 1 e 65535.
- `NODE_ENV` DEVE ser um dos valores do enum.
- Falha na validação → processo encerra com código 1 e mensagem
  descritiva (fail-fast, FR-019).

## Prisma Schema (Base)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("DATABASE_PROVIDER")
  url      = env("DATABASE_URL")
}

// CAVEAT: O campo `provider` é resolvido em tempo de `prisma generate`,
// não em runtime. Ao trocar entre postgresql e sqlite, DEVE-SE
// re-executar `npx prisma generate` para regenerar o client.

// Entidades de negócio serão adicionadas em features futuras.
// Exemplo de estrutura esperada:
// model Transaction {
//   id        String   @id @default(uuid())
//   type      String   // "income" | "expense"
//   amount    Decimal
//   category  String
//   date      DateTime
//   isFixed   Boolean  @default(false)
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
```

## State Transitions

Não aplicável nesta feature (sem entidades de negócio com lifecycle).

## Relationships

Não aplicável nesta feature. Relacionamentos serão definidos conforme
entidades de negócio forem adicionadas.

## Data Volume Assumptions

- Escopo inicial: desenvolvimento local e testes.
- Produção futura: estimativa de centenas a milhares de transações
  por usuário por mês (finanças pessoais).
- Sem necessidade de sharding ou particionamento no escopo base.
