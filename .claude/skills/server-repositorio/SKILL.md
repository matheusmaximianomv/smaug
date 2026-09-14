---
name: server-repositorio
description: Como escrever a porta de repositório em domain/ports e o repositório Prisma em infrastructure/database/repositories no server do Smaug — mapper toDomain com tipo estrutural inline, orderBy explícito, filtro OR de competência e $transaction.
---

# Porta e repositório

## Quando usar esta skill

Ao criar/alterar `server/src/domain/ports/*.repository.ts` ou
`server/src/infrastructure/database/repositories/prisma-*.repository.ts`.

## Porta — `domain/ports/<agregado>.repository.ts`

```ts
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

export interface OneTimeRevenueRepository {
  findById(id: string): Promise<OneTimeRevenue | null>;
  findAllByUser(userId: string): Promise<OneTimeRevenue[]>;
  findByUserAndCompetence(
    userId: string,
    competenceYear: number,
    competenceMonth: number,
  ): Promise<OneTimeRevenue[]>;
  create(revenue: OneTimeRevenue): Promise<OneTimeRevenue>;
  update(revenue: OneTimeRevenue): Promise<OneTimeRevenue>;
  delete(id: string): Promise<void>;
}
```

Regras da porta:

1. **Interface**, nunca classe abstrata. Nome `<Agregado>Repository`, **sem prefixo `I`**.
2. Devolve **entidades de domínio**, jamais linha do Prisma.
3. Todo método devolve `Promise`. Busca de um item devolve `T | null` — **não lança, não usa `undefined`**.
4. `update(entity)` recebe a **entidade inteira** (já atualizada por copy-on-write), não um patch.
5. Escrita composta passa os filhos explicitamente:
   `create(expense: InstallmentExpense, installments: Installment[])`.
6. Vocabulário de método em uso: `findById`, `findAllByUser` / `listByUser`,
   `findByUserAndCompetence`, `findActiveForCompetence`, `findByCategoryId`, `findByIdWithVersions`,
   `create`, `update`, `delete`, `terminate`, `addVersion`, `findVersions`, `findVersionForMonth`,
   `countLinkedExpenses`, `hasPastInstallments`, `deleteFutureInstallments`,
   `findInstallmentsByExpense`, `findInstallmentsByCompetence`.
7. JSDoc só quando o nome não basta, e **em português**:
   `/** Quantidade de despesas (avulsas, parceladas e versões de recorrentes) ligadas à categoria. */`

## Repositório Prisma — `infrastructure/database/repositories/prisma-<agregado>.repository.ts`

```ts
import { PrismaClient } from "@prisma/client";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";

export class PrismaOneTimeRevenueRepository implements OneTimeRevenueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<OneTimeRevenue | null> {
    const record = await this.prisma.oneTimeRevenue.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaOneTimeRevenueRepository.toDomain(record);
  }

  public async findAllByUser(userId: string): Promise<OneTimeRevenue[]> {
    const records = await this.prisma.oneTimeRevenue.findMany({
      where: { userId },
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }, { createdAt: "desc" }],
    });
    return records.map(PrismaOneTimeRevenueRepository.toDomain);
  }

  public async update(revenue: OneTimeRevenue): Promise<OneTimeRevenue> {
    const record = await this.prisma.oneTimeRevenue.update({
      where: { id: revenue.id },
      data: {
        description: revenue.description,
        amount: revenue.amount,
        updatedAt: revenue.updatedAt,
      },
    });
    return PrismaOneTimeRevenueRepository.toDomain(record);
  }

  private static toDomain(record: {
    id: string;
    userId: string;
    description: string;
    amount: number;
    competenceMonth: number;
    competenceYear: number;
    createdAt: Date;
    updatedAt: Date;
  }): OneTimeRevenue {
    return OneTimeRevenue.create({
      id: record.id,
      userId: record.userId,
      description: record.description,
      amount: record.amount,
      competenceMonth: record.competenceMonth,
      competenceYear: record.competenceYear,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
```

## Regras do repositório

1. `export class Prisma<Agregado>Repository implements <Agregado>Repository`. **Sem `@injectable()`** —
   o projeto não usa decorators.
2. `constructor(private readonly prisma: PrismaClient) {}` — o client é **injetado**, nunca importado
   como singleton dentro do repositório.
3. Todos os métodos públicos são `public async` e devolvem entidade.
4. **O mapper linha→entidade é `private static to…`**, chamado como `Classe.toDomain(record)` ou
   passado point-free em `.map(Classe.toDomain)` (funciona por ser `static`).
   - Um agregado por arquivo → `toDomain`.
   - Vários → `toExpenseDomain` / `toInstallmentDomain` / `toVersionDomain` / `toRevenueDomain`.
   - Sentido inverso (entidade→linha) → `private static toVersionData(...)`.
5. **O parâmetro `record` é tipado com um objeto estrutural inline**, nunca com o tipo gerado do
   Prisma. É isso que mantém o domínio livre de Prisma e faz a regra `no-domain-to-infra` valer na
   prática.
6. `create` lista **todas** as colunas explicitamente (inclusive `id`, `createdAt`, `updatedAt`, que
   vêm da entidade); `update` lista **apenas as colunas mutáveis** + `updatedAt`.
7. `orderBy` é sempre explícito em consultas de lista — tipicamente
   `[{ competenceYear: "desc" }, { competenceMonth: "desc" }, { createdAt: "desc" }]`.
8. Reconstrução usa `Entity.create({ ...record })`. Exceção: `RecurringExpense` e
   `RecurringExpenseVersion`, cujo `create()` rejeita competência passada — use
   `Entity.rehydrate(record)`.
9. Filtro "a partir de uma competência" usa o idioma `OR`:
   ```ts
   OR: [{ competenceYear: { gt: year } }, { competenceYear: year, competenceMonth: { gt: month } }];
   ```
10. Filtrar por dono através de relação: `installmentExpense: { userId }`.
11. Escrita composta: `create` aninhado + `include` ordenado
    (`installments: { create: installments.map(...) }` / `include: { installments: { orderBy: [{ installmentNumber: "asc" }] } }`).
    Atualização em lote: `this.prisma.$transaction(items.map((i) => this.prisma.installment.update({ ... })))`.
12. Filtrar em memória é aceitável quando a regra vive na entidade:
    `records.map(toExpenseDomain).filter((e) => e.isActiveForMonth(month, year))`.

## Checklist

- [ ] Porta em `domain/ports/`, devolvendo entidades e `T | null`.
- [ ] Classe Prisma `implements` a porta, com `PrismaClient` injetado.
- [ ] `private static toDomain(record: { ...inline... })`.
- [ ] `orderBy` explícito em toda lista.
- [ ] `create` com todas as colunas; `update` só com as mutáveis.
- [ ] `$transaction` para escrita em lote.
- [ ] Registrado no `container.ts` com a variável **anotada pelo tipo da porta**.
- [ ] Teste unitário do repositório em `tests/unit/infrastructure/database/repositories/`.

## Não faça

- Não importe `@prisma/client` fora de `infrastructure/`.
- Não tipe o `record` com `Prisma.OneTimeRevenueGetPayload<...>` nem com o model gerado.
- Não use `@injectable()`.
- Não faça `prisma.$queryRaw` de regra de negócio — a regra vive no domínio.
- Não devolva `undefined` de um `findById`; devolva `null`.

## Contexto adicional

`domain/ports/repository.interface.ts` (`Repository<T, ID>`) e
`infrastructure/database/database.provider.ts` (`RepositoryFactory`, `PrismaRepository<T>`,
`InMemoryRepository<T>`) são o caminho **genérico legado**, usado só pelo switch de
`DATABASE_PROVIDER`. **Nenhum agregado os utiliza** — não os use para código novo.
