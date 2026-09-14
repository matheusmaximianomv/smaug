---
name: server-entidade-dominio
description: Como escrever entidades e value objects em server/src/domain — private constructor, static create, campos public readonly, validação interna, update copy-on-write, rehydrate e MonthlyCompetence. Use ao criar ou alterar qualquer arquivo .entity.ts ou .value-object.ts.
---

# Entidade de domínio e value object

## Quando usar esta skill

Ao criar ou alterar `server/src/domain/entities/*.entity.ts` e
`server/src/domain/value-objects/*.value-object.ts`.

## Arquivo canônico

`server/src/domain/entities/one-time-revenue.entity.ts` — copie a estrutura dele.

## Anatomia canônica

```ts
import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface OneTimeRevenueProps {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_DECIMAL_PLACES = 2;

export class OneTimeRevenue {
  public readonly id: string;
  public readonly userId: string;
  public readonly description: string;
  public readonly amount: number;
  public readonly competenceMonth: number;
  public readonly competenceYear: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: Required<OneTimeRevenueProps>) {
    this.id = props.id;
    this.userId = props.userId;
    this.description = props.description;
    this.amount = props.amount;
    this.competenceMonth = props.competenceMonth;
    this.competenceYear = props.competenceYear;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: OneTimeRevenueProps): OneTimeRevenue {
    const description = props.description.trim();
    OneTimeRevenue.validateDescription(description);
    OneTimeRevenue.validateAmount(props.amount);

    const competence = MonthlyCompetence.create(props.competenceMonth, props.competenceYear);

    const now = new Date();
    return new OneTimeRevenue({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      description,
      amount: props.amount,
      competenceMonth: competence.month,
      competenceYear: competence.year,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public update(changes: { description?: string; amount?: number }): OneTimeRevenue {
    const newDescription =
      changes.description !== undefined ? changes.description.trim() : this.description;
    const newAmount = changes.amount !== undefined ? changes.amount : this.amount;

    if (changes.description !== undefined) {
      OneTimeRevenue.validateDescription(newDescription);
    }
    if (changes.amount !== undefined) {
      OneTimeRevenue.validateAmount(newAmount);
    }

    return new OneTimeRevenue({
      id: this.id,
      userId: this.userId,
      description: newDescription,
      amount: newAmount,
      competenceMonth: this.competenceMonth,
      competenceYear: this.competenceYear,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public getCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.competenceMonth, this.competenceYear);
  }

  private static validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    const decimalStr = amount.toString();
    const decimalIndex = decimalStr.indexOf(".");
    if (decimalIndex !== -1 && decimalStr.length - decimalIndex - 1 > MAX_DECIMAL_PLACES) {
      throw new Error("Amount must have at most 2 decimal places");
    }
  }

  private static validateDescription(description: string): void {
    if (
      description.length < MIN_DESCRIPTION_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      throw new Error("Description must be between 1 and 255 characters");
    }
  }
}
```

## Regras

1. **`export interface XProps`** acima da classe, com `id?`, `createdAt?` e `updatedAt?` opcionais
   e o resto obrigatório.
2. **Números mágicos viram `const` SCREAMING_SNAKE no módulo** (`MAX_DESCRIPTION_LENGTH`,
   `MAX_DECIMAL_PLACES`), nunca literais soltos dentro do método.
3. **Campos `public readonly`** — um por prop. Nunca getters, nunca guardar um objeto `props`.
4. **`private constructor(props: Required<XProps>)`** que só faz atribuição campo a campo. Nada de
   validação no construtor.
5. **`public static create(props: XProps): X` é a única fábrica.** Ela normaliza (`trim()`,
   `toLowerCase()` em e-mail), valida, resolve `id: props.id ?? randomUUID()` e
   `createdAt: props.createdAt ?? now`.
6. **Validação mora na entidade**, em `private static validateX(...): void`, uma por regra, lançando
   `Error` com mensagem em inglês. Essa mensagem tem que ser **idêntica** à mensagem do schema Zod
   correspondente em `application/dtos/` — os testes assertam a string.
7. **Mutação devolve nova instância.** Nomes usados: `update`, `updateDetails`, `terminate`,
   `clearTermination`. Copie todos os campos e troque `updatedAt: new Date()`. Nunca mutar `this`.
8. **`static rehydrate(props)` só quando `create()` valida regra temporal.** Hoje existe apenas em
   `RecurringExpense` e `RecurringExpenseVersion`, porque o `create()` delas rejeita competência
   passada e o repositório precisa reconstruir linhas antigas. Em todos os outros agregados o
   repositório chama `Entity.create({ ...record })`.
9. **Sem `toJSON` / `toPrimitives`.** Serialização é responsabilidade do service (`toResponseDto`).
10. **Nada de framework**: nem Prisma, nem Express, nem Zod, nem tsyringe dentro de `domain/`.
11. Tipo de persistência, quando precisa ser exportado para o repositório, é um alias explícito:
    `export type RecurringExpenseVersionPersistenceProps = Required<RecurringExpenseVersionProps>;`
    ou uma interface quando há campos nuláveis (`endMonth: number | null`).

## Value object — `MonthlyCompetence`

É o conceito-pivô de todo o domínio. Único VO do projeto
(`domain/value-objects/monthly-competence.value-object.ts`).

```ts
const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_YEAR = 2000;
const MONTH_PAD_LENGTH = 2;

export class MonthlyCompetence {
  public readonly month: number;
  public readonly year: number;

  private constructor(month: number, year: number) {
    this.month = month;
    this.year = year;
  }

  public static create(month: number, year: number): MonthlyCompetence {
    if (!Number.isInteger(month) || month < MIN_MONTH || month > MAX_MONTH) {
      throw new Error("Month must be an integer between 1 and 12");
    }
    if (!Number.isInteger(year) || year < MIN_YEAR) {
      throw new Error("Year must be an integer >= 2000");
    }
    return new MonthlyCompetence(month, year);
  }
```

API pública: `isPastMonth(referenceDate = new Date())`, `isFutureOrCurrent(referenceDate = new Date())`,
`isBefore(other)`, `isBeforeOrEqual(other)`, `isAfter(other)`, `isAfterOrEqual(other)`,
`equals(other)`, `toString()` → `"2026-09"`.

Regras do VO:

- Construtor recebe **argumentos posicionais** `(month, year)`, não um objeto de props.
- Toda comparação com "hoje" usa **UTC** (`getUTCFullYear()`, `getUTCMonth() + 1`).
- `referenceDate` é sempre um **parâmetro com default**, nunca lido implicitamente — é o que torna
  o VO 100% testável sem fake timers.
- Entidades guardam `month`/`year` achatados como `number` e expõem `getXCompetence()` que
  reconstrói o VO sob demanda.

## Checklist para criar uma entidade

- [ ] `export interface XProps` com `id?`/`createdAt?`/`updatedAt?`.
- [ ] Constantes de limite no módulo.
- [ ] Campos `public readonly` espelhando `Required<XProps>`.
- [ ] `private constructor` só com atribuições.
- [ ] `static create()` normaliza → valida → `randomUUID()` / `new Date()`.
- [ ] Um `private static validateX()` por regra, com mensagem igual à do Zod.
- [ ] Métodos de mutação devolvendo nova instância com `updatedAt: new Date()`.
- [ ] `static rehydrate()` **apenas** se `create()` validar regra de tempo.
- [ ] `getXCompetence()` se a entidade tiver competência.
- [ ] Teste unitário em `server/tests/unit/domain/entities/x.entity.test.ts` (skill `server-testes`).

## Não faça

- Não valide no construtor — valide em `create()`.
- Não devolva `this` de um método de update.
- Não exponha getters: os campos já são `public readonly`.
- Não use `node:crypto` (o padrão do projeto é `import { randomUUID } from "crypto"`).
- Não coloque regra de tempo ou checagem cross-agregado na entidade, salvo o caso já existente de
  `RecurringExpense` — isso é responsabilidade do caso de uso.

## Inconsistências conhecidas

- **`public constructor` vs `constructor`**: 32 arquivos usam a forma explícita, 28 a implícita.
  Fatias novas (installment, recurring, expense-category) usam `public constructor` — **siga essa**.
- **Validação de 2 casas decimais está duplicada em 5 entidades.** Não replique por preguiça em
  código novo sem necessidade; se for extrair, extraia para o domínio (não para infra) e atualize
  as 5 de uma vez.
- **Guarda de competência passada** aparece na entidade (`RecurringExpense`) e no use case
  (revenue/expense avulsos, parcelado). Para agregado novo, **coloque no caso de uso** — é o lado
  majoritário e evita precisar de `rehydrate`.
