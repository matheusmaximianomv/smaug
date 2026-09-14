---
name: server-caso-de-uso
description: Como escrever um caso de uso em server/src/domain/use-cases — interface XInput, classe com um único execute, injeção pela porta, ownership check que vira 404, e onde cada validação mora. Use ao criar ou alterar qualquer arquivo .use-case.ts.
---

# Caso de uso

## Quando usar esta skill

Ao criar ou alterar `server/src/domain/use-cases/<agregado>/<verbo>-<agregado>.use-case.ts`.

## Onde o código mora

Uma pasta por agregado, um arquivo por verbo:

```
domain/use-cases/
  expense-category/      create · delete · get · list-expense-categories · update
  fixed-revenue/         create · delete · get · list-fixed-revenues · terminate · update
  installment-expense/   create · delete · get · list-installment-expenses · terminate · update
  one-time-expense/      create · delete · list-one-time-expenses · update
  one-time-revenue/      create · delete · list-one-time-revenues · update
  recurring-expense/     create · delete · get · list-recurring-expenses · terminate · update
  user/                  create-user · get-user
```

Verbos usados: `create`, `get`, `list`, `update`, `terminate`, `delete`. Listagem pluraliza no nome
do arquivo e da classe (`list-one-time-revenues.use-case.ts` → `ListOneTimeRevenuesUseCase`).

## Anatomia canônica — create

`domain/use-cases/one-time-revenue/create-one-time-revenue.use-case.ts`:

```ts
export interface CreateOneTimeRevenueInput {
  userId: string;
  description: string;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
}

export class CreateOneTimeRevenueUseCase {
  constructor(private readonly repository: OneTimeRevenueRepository) {}

  public async execute(input: CreateOneTimeRevenueInput): Promise<OneTimeRevenue> {
    const competence = MonthlyCompetence.create(input.competenceMonth, input.competenceYear);

    if (competence.isPastMonth()) {
      throw new PastCompetenceError();
    }

    const revenue = OneTimeRevenue.create({
      userId: input.userId,
      description: input.description,
      amount: input.amount,
      competenceMonth: input.competenceMonth,
      competenceYear: input.competenceYear,
    });

    return this.repository.create(revenue);
  }
}
```

## Anatomia canônica — update com ownership e cross-agregado

`domain/use-cases/installment-expense/update-installment-expense.use-case.ts`:

```ts
export interface UpdateInstallmentExpenseInput {
  id: string;
  userId: string;
  description?: string;
  categoryId?: string;
}

export interface InstallmentExpenseDetails {
  expense: InstallmentExpense;
  installments: Installment[];
}

export class UpdateInstallmentExpenseUseCase {
  public constructor(
    private readonly installmentExpenseRepository: InstallmentExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: UpdateInstallmentExpenseInput): Promise<InstallmentExpenseDetails> {
    const expense = await this.installmentExpenseRepository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new InstallmentExpenseNotFoundError(input.id);
    }

    if (input.categoryId !== undefined) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category || category.userId !== input.userId) {
        throw new ExpenseCategoryNotFoundError(input.categoryId);
      }
    }

    const updatedExpense = expense.updateDetails({
      description: input.description,
      categoryId: input.categoryId,
    });

    const persistedExpense = await this.installmentExpenseRepository.update(updatedExpense);
    const installments = await this.installmentExpenseRepository.findInstallmentsByExpense(
      persistedExpense.id,
    );

    return { expense: persistedExpense, installments };
  }
}
```

## Anatomia canônica — list com filtro opcional

```ts
public async execute(input: ListOneTimeRevenuesInput): Promise<OneTimeRevenue[]> {
  if (input.competenceYear !== undefined && input.competenceMonth !== undefined) {
    return this.repository.findByUserAndCompetence(
      input.userId,
      input.competenceYear,
      input.competenceMonth,
    );
  }
  return this.repository.findAllByUser(input.userId);
}
```

## Regras

1. **Um `export interface XUseCaseInput`** por arquivo, nomeado como a classe sem o sufixo `UseCase`
   - `Input` (`CreateOneTimeRevenueUseCase` → `CreateOneTimeRevenueInput`).
2. **Uma classe com exatamente um método público: `public async execute(input): Promise<...>`.**
   Sempre `async`, sempre recebendo **um único objeto** de input.
3. **A saída é entidade de domínio, array de entidades ou `void` — nunca DTO.** Quando o retorno
   agrega filhos, declare uma segunda interface exportada ao lado do input
   (`InstallmentExpenseDetails`, `RecurringExpenseDetails`, `InstallmentExpenseWithInstallments`).
4. **Dependências entram pelo construtor tipadas pela porta**, nunca pela classe concreta.
   Nome do campo: `repository` quando há uma só; por papel quando há várias
   (`installmentExpenseRepository`, `categoryRepository`).
5. **Ownership check é a primeira regra de negócio**, sempre neste idioma:
   ```ts
   const x = await this.repository.findById(input.id);
   if (!x || x.userId !== input.userId) {
     throw new XNotFoundError(input.id);
   }
   ```
   Acesso de outro usuário vira **404, nunca 403**.
6. **Validação cross-agregado** (a categoria existe e é do usuário?) fica aqui, antes de construir
   a entidade.
7. **Divisão de responsabilidade de validação**: forma/formato → entidade (`Entity.create`);
   regra temporal e cross-agregado → caso de uso.
8. Escrita composta faz **re-leitura** para devolver o estado canônico
   (`findInstallmentsByExpense(persisted.id)`, `findVersions(created.id)`).
9. "Agora" é calculado inline em UTC quando preciso; não existe abstração de relógio:
   ```ts
   const referenceDate = new Date();
   const referenceYear = referenceDate.getUTCFullYear();
   const referenceMonth = referenceDate.getUTCMonth() + 1;
   ```
10. Nada de `@injectable()`/`@inject()` — o projeto **não usa decorators**. A fiação é manual no
    `container.ts` (skill `server-di-container`).

## Checklist para criar um caso de uso

- [ ] Arquivo em `domain/use-cases/<agregado>/<verbo>-<agregado>.use-case.ts`.
- [ ] `export interface XInput` com `userId` e, para operações sobre um item, `id`.
- [ ] Construtor recebendo portas com `private readonly`.
- [ ] `public async execute(input)` único, devolvendo entidade.
- [ ] Ownership check antes de qualquer outra regra.
- [ ] Regras de tempo via `MonthlyCompetence`, lançando erro do catálogo.
- [ ] Re-leitura quando a escrita envolve filhos.
- [ ] Registrado no `container.ts` e injetado no service.
- [ ] Teste unitário com dublês `vi.fn()` das portas (skill `server-testes`).

## Não faça

- Não retorne DTO nem chame `.toISOString()` aqui — isso é do service.
- Não adicione um segundo método público (`executeAll`, helpers) — extraia para outro use case.
- Não acesse o Prisma nem o Express diretamente.
- Não lance 403 para recurso de outro usuário.
- Não use decorators do tsyringe.

## Inconsistências conhecidas

- `InstallmentExpenseDetails` e `RecurringExpenseDetails` estão **duplicadas** em vários arquivos de
  use case da mesma pasta. Ao criar um agregado novo, declare a interface uma vez e importe do
  arquivo onde nasceu (é o que `delete-one-time-revenue.use-case.ts` já faz com os erros).
- Ordem de argumento de competência varia entre portas (`(userId, year, month)` vs
  `(id, month, year)`). Para métodos novos, use **`(…, year, month)`**.
