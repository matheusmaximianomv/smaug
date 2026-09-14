---
name: server-arquitetura
description: Arquitetura do backend Smaug (server/) — camadas Clean Architecture, regra de dependência, alias @src, nomenclatura de arquivos e o roteiro end-to-end para adicionar um agregado novo. Leia antes de criar qualquer arquivo em server/src.
---

# Arquitetura do server

## Quando usar esta skill

Ao adicionar um recurso novo ao backend, ao mover código entre camadas, ou sempre que a dúvida
for "em que pasta isso vai".

## Camadas

```
server/src/
  domain/          entities, value-objects, use-cases, ports (interfaces de repositório), errors
  application/     services (orquestram use cases), dtos (Zod + response), ports (Logger)
  infrastructure/  repositórios Prisma, servidor Express, container tsyringe, env (Zod), Pino
  presentation/    controllers, routes, middlewares
```

Regra de dependência (validada por `.dependency-cruiser.js`, severidade `error`):
**`domain` e `application` nunca importam `infrastructure` nem `presentation`.**

Fluxo de uma requisição:

```
route → middleware (extractUser, validateRequest) → controller → service → use case → port → repositório Prisma
                                                                                   ↓
                                                                          entidade de domínio
```

O domínio não conhece Express, Prisma nem Zod. `MonthlyCompetence`, entidades e use cases usam só
tipos nativos do TypeScript (princípio III da constituição).

## Convenções de arquivo e import

**Nomes**: kebab-case + sufixo de papel.

| Papel              | Arquivo                                 | Classe/função                        |
| ------------------ | --------------------------------------- | ------------------------------------ |
| Entidade           | `one-time-revenue.entity.ts`            | `OneTimeRevenue`                     |
| Value object       | `monthly-competence.value-object.ts`    | `MonthlyCompetence`                  |
| Porta              | `one-time-revenue.repository.ts`        | `interface OneTimeRevenueRepository` |
| Repositório Prisma | `prisma-one-time-revenue.repository.ts` | `PrismaOneTimeRevenueRepository`     |
| Caso de uso        | `create-one-time-revenue.use-case.ts`   | `CreateOneTimeRevenueUseCase`        |
| Service            | `one-time-revenue.service.ts`           | `OneTimeRevenueService`              |
| DTO                | `one-time-revenue.dto.ts`               | schemas + tipos                      |
| Controller         | `one-time-revenue.controller.ts`        | `OneTimeRevenueController`           |
| Rotas              | `one-time-revenue.routes.ts`            | `createOneTimeRevenueRoutes()`       |
| Middleware         | `extract-user.middleware.ts`            | `extractUser()`                      |

Casos de uso de listagem pluralizam: `list-one-time-revenues.use-case.ts` →
`ListOneTimeRevenuesUseCase`.

**Imports**: sempre pelo alias `@src/*`. Não existe **nenhum** import relativo em `server/src/`.

```ts
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
```

**Sufixo `.ts` no import**: `allowImportingTsExtensions` está ligado, mas o sufixo só aparece nos
11 arquivos de bootstrap/infraestrutura (`main.ts`, `container.ts`, `http/server.ts`,
`logging/logger.ts`, `database/config.ts`, `database.provider.ts`, `in-memory.repository.ts`,
`routes/index.ts`, `health.controller.ts`, os dois middlewares de log/erro). Em código de feature,
**importe sem extensão**. Na dúvida, copie o vizinho do mesmo arquivo.

**Barris**: só existe um — `presentation/routes/index.ts`. Não crie outros.

## Anatomia de um agregado (gabarito: `recurring-expense`)

Uma fatia completa tem exatamente estes arquivos:

```
domain/entities/recurring-expense.entity.ts
domain/entities/recurring-expense-version.entity.ts
domain/ports/recurring-expense.repository.ts
domain/use-cases/recurring-expense/{create,get,list-recurring-expenses,update,terminate,delete}-recurring-expense.use-case.ts
domain/errors/domain-error.ts                        (os erros novos entram aqui)
application/dtos/recurring-expense.dto.ts
application/services/recurring-expense.service.ts
infrastructure/database/repositories/prisma-recurring-expense.repository.ts
presentation/controllers/recurring-expense.controller.ts
presentation/routes/recurring-expense.routes.ts
infrastructure/config/container.ts                   (a fatia é acrescentada)
presentation/routes/index.ts                         (a montagem é acrescentada)
tests/unit/... espelhando cada arquivo acima + tests/integration/presentation/recurring-expense.test.ts
```

## Checklist — adicionar um agregado novo, na ordem

1. **Prisma**: modelo em `server/prisma/schema.prisma` + migration (`npm run --prefix server migrate:deploy`
   aplica; não existe script de dev-migrate nem de seed).
2. **Entidade** (e entidade de versão, se o agregado for versionado) — skill `server-entidade-dominio`.
3. **Erros** de domínio no catálogo — skill `server-erros-dominio`.
4. **Porta** em `domain/ports/` — skill `server-repositorio`.
5. **Casos de uso**, um arquivo por verbo — skill `server-caso-de-uso`.
6. **DTO** (schemas Zod + `XResponseDto`) — skill `server-servico-dto`.
7. **Service** orquestrando os use cases e mapeando para DTO — mesma skill.
8. **Repositório Prisma** implementando a porta — skill `server-repositorio`.
9. **Controller** + **rotas** — skill `server-http`.
10. **Container**: acrescente a fatia e exporte o controller — skill `server-di-container`.
11. **`routes/index.ts`**: monte o sub-router **antes** dos catch-alls `/revenues` e `/expenses`.
12. **Testes**: unit espelhando cada arquivo + um arquivo de integração — skill `server-testes`.
13. **Frontend**: se houver código de erro novo, acrescente à tabela de `web/infra/api-error.ts`.
14. `npm run validate:deps && npm run --prefix server typecheck && npm run --prefix server test`.

## Contrato HTTP

Rotas montadas na raiz, **sem prefixo `/api`**:

```
/health                    aberta, 200 ou 503 com status "degraded"
/users                     aberta (é como se cria o primeiro usuário)
/expenses/categories       \
/expenses/one-time          |
/expenses/installment       |  atrás de extractUser(userRepository)
/expenses/recurring         |
/revenues/one-time          |
/revenues/fixed            /
/revenues                  catch-all de consulta — DEPOIS dos específicos
/expenses                  catch-all de consulta — DEPOIS dos específicos
```

## Ambiente

`infrastructure/config/env.ts` faz `safeParse` no import e chama `process.exit(1)` se falhar.
Obrigatórias sem default: `DATABASE_PROVIDER` (`postgresql|sqlite|memory`), `DATABASE_URL`,
`NODE_ENV`. Com default: `PORT` (3000), `LOG_LEVEL` (`info`), `CORS_ORIGIN` (`http://localhost:3001`).

## Não faça

- Não importe `infrastructure`/`presentation` a partir de `domain` ou `application`.
- Não use tipo gerado do Prisma, tipo do Express ou schema do Zod dentro de `domain/`.
- Não crie barril novo (`index.ts` de re-export).
- Não use import relativo em `server/src/`.
- Não instancie service/repositório fora do `container.ts`.
