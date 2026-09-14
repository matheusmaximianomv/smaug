---
name: server-servico-dto
description: Como escrever services de aplicação e DTOs (schemas Zod + XResponseDto) no server do Smaug — userId como primeiro parâmetro, toResponseDto estático, toISOString só aqui, schema de update com refine, e o padrão loadX(): Map contra N+1.
---

# Service de aplicação e DTO

## Quando usar esta skill

Ao criar/alterar `server/src/application/services/*.service.ts` ou
`server/src/application/dtos/*.dto.ts`.

## Papel do service

Orquestrar casos de uso, injetar o `userId` e **mapear entidade → DTO de resposta**. É a única
camada onde `.toISOString()` acontece. O service **não** contém regra de negócio.

## Anatomia canônica — service

`application/services/one-time-revenue.service.ts` (arquivo completo, é o gabarito para agregado simples):

```ts
export class OneTimeRevenueService {
  constructor(
    private readonly createUseCase: CreateOneTimeRevenueUseCase,
    private readonly updateUseCase: UpdateOneTimeRevenueUseCase,
    private readonly deleteUseCase: DeleteOneTimeRevenueUseCase,
    private readonly listUseCase: ListOneTimeRevenuesUseCase,
  ) {}

  public async create(
    userId: string,
    input: { description: string; amount: number; competenceMonth: number; competenceYear: number },
  ): Promise<OneTimeRevenueResponseDto> {
    const revenue = await this.createUseCase.execute({ userId, ...input });
    return OneTimeRevenueService.toResponseDto(revenue);
  }

  public async update(
    userId: string,
    id: string,
    input: { description?: string; amount?: number },
  ): Promise<OneTimeRevenueResponseDto> {
    const revenue = await this.updateUseCase.execute({ id, userId, ...input });
    return OneTimeRevenueService.toResponseDto(revenue);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  public async list(
    userId: string,
    filters?: { competenceYear?: number; competenceMonth?: number },
  ): Promise<OneTimeRevenueResponseDto[]> {
    const revenues = await this.listUseCase.execute({
      userId,
      competenceYear: filters?.competenceYear,
      competenceMonth: filters?.competenceMonth,
    });
    return revenues.map(OneTimeRevenueService.toResponseDto);
  }

  public static toResponseDto(revenue: OneTimeRevenue): OneTimeRevenueResponseDto {
    return {
      id: revenue.id,
      userId: revenue.userId,
      description: revenue.description,
      amount: revenue.amount,
      competenceYear: revenue.competenceYear,
      competenceMonth: revenue.competenceMonth,
      createdAt: revenue.createdAt.toISOString(),
      updatedAt: revenue.updatedAt.toISOString(),
    };
  }
}
```

## Regras do service

1. **Um campo `private readonly <verbo>UseCase` por caso de uso** — `createUseCase`, `updateUseCase`,
   `listUseCase`, `terminateUseCase`, `deleteUseCase`.
2. **Nome do método espelha o verbo, sem o agregado**: `create`, `get`, `list`, `update`,
   `terminate`, `delete`.
3. **`userId` é sempre o primeiro parâmetro**, `id` o segundo, payload por último. Ele é fundido no
   input do use case no ponto de chamada: `execute({ userId, ...input })` ou `execute({ id, userId })`.
4. **Retorno é sempre `*ResponseDto`, `*ResponseDto[]` ou `void`.** Nunca entidade.
5. **O mapper é um método `static` do próprio service**, chamado `toResponseDto`. Deixe-o `public`
   quando outro service o reutiliza (`OneTimeRevenueService.toResponseDto`,
   `UserService.toResponseDto`, `FixedRevenueService.toResponseDto` + `toVersionResponseDto`);
   `private` caso contrário.
6. O service pode injetar **repositórios** além dos use cases quando precisa de leitura extra para
   enriquecer o DTO (`InstallmentExpenseService` recebe `categoryRepository` e
   `installmentExpenseRepository` **antes** dos use cases). `ExpenseQueryService` e
   `RevenueQueryService` são serviços de leitura pura — só repositórios, nenhum use case.
7. **Evite N+1 com o idioma `loadX(): Map`**:
   ```ts
   const [categoryMap, installmentsMap] = await Promise.all([
     this.loadCategories(expenses),
     this.loadInstallments(expenses),
   ]);
   return expenses.map((expense) =>
     this.toResponseDtoWithCategory(
       expense,
       installmentsMap.get(expense.id) ?? [],
       categoryMap.get(expense.categoryId)!,
     ),
   );
   ```
   Helpers privados seguem os nomes `load<Coisas>` (devolve `Map`), `to<Coisa>Dto`,
   `toResponseDtoWithCategory`.
8. Arredondamento monetário fica em `private static round()` com `const CENTS_FACTOR = 100;` no
   módulo (ver `expense-query.service.ts`).

## Anatomia canônica — DTO

`application/dtos/one-time-revenue.dto.ts`. Ordem fixa no arquivo: **schema → tipo inferido →
schema → tipo inferido → interface de resposta**.

```ts
import { z } from "zod";

export const createOneTimeRevenueSchema = z.object({
  description: z
    .string({ error: "Description is required" })
    .min(1, "Description must be between 1 and 255 characters")
    .max(255, "Description must be between 1 and 255 characters"),
  amount: z.number({ error: "Amount must be a number" }).positive("Amount must be greater than 0"),
  competenceYear: z
    .number({ error: "Competence year is required" })
    .int("Competence year must be an integer")
    .min(2000, "Competence year must be >= 2000"),
  competenceMonth: z
    .number({ error: "Competence month is required" })
    .int("Competence month must be an integer")
    .min(1, "Competence month must be between 1 and 12")
    .max(12, "Competence month must be between 1 and 12"),
});

export type CreateOneTimeRevenueDto = z.infer<typeof createOneTimeRevenueSchema>;

export const updateOneTimeRevenueSchema = z
  .object({
    description: z.string().min(1, "...").max(255, "...").optional(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
  })
  .refine((data) => data.description !== undefined || data.amount !== undefined, {
    message: "At least one field (description or amount) must be provided",
  });

export type UpdateOneTimeRevenueDto = z.infer<typeof updateOneTimeRevenueSchema>;

export interface OneTimeRevenueResponseDto {
  id: string;
  userId: string;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}
```

## Regras do DTO

1. **DTO de entrada é `type` inferido do Zod; DTO de saída é `interface` escrita à mão.** Sem exceção
   nos 9 arquivos existentes.
2. Nomes: `const <verbo><Agregado>Schema` (camelCase, sufixo `Schema`);
   `type <Verbo><Agregado>Dto = z.infer<typeof ...>`; `interface <Agregado>ResponseDto`.
3. **Datas no DTO de resposta são `string` ISO**, nunca `Date`.
4. Zod v4: `z.string({ error: "X is required" })`. **Toda restrição carrega mensagem**, e essa
   mensagem é **idêntica** à do `throw new Error(...)` da entidade correspondente.
5. Schema de create tem campos obrigatórios; schema de update tem tudo `.optional()` **mais um
   `.refine()`** garantindo "ao menos um campo".
6. Schema de query usa `z.coerce.number()` (ver `expense-query.dto.ts`, `revenue-query.dto.ts`).
7. Dinheiro valida casas decimais com
   `.refine((value) => Number.isInteger(Math.round(value * 100)), "...at most 2 decimal places")`.
8. **Não coloque `userId` no schema** — ele vem do header, via `req.userId`.
9. **Não existe função mapper nos arquivos de DTO.** O mapeamento é método do service.
10. DTOs de consulta compõem por extensão + união discriminada:
    ```ts
    export interface OneTimeExpenseItemDto extends BaseExpenseItemDto { type: "ONE_TIME"; ... }
    export type ExpenseQueryItemDto = OneTimeExpenseItemDto | InstallmentExpenseItemDto | RecurringExpenseItemDto;
    ```
    O discriminador é `type` com valores SCREAMING_SNAKE (`"ONE_TIME" | "INSTALLMENT" | "RECURRING"`).

## Checklist

- [ ] DTO: schemas + `z.infer` + `interface XResponseDto` com datas ISO.
- [ ] Mensagens do Zod iguais às da entidade.
- [ ] Schema de update `.optional()` + `.refine()`.
- [ ] Service com um `<verbo>UseCase` por caso de uso.
- [ ] `userId` primeiro em todo método.
- [ ] `static toResponseDto` fazendo `.toISOString()`.
- [ ] `loadX(): Map` se a listagem enriquece com outro agregado.
- [ ] Registrado no `container.ts`.
- [ ] Testes em `tests/unit/application/services/` e `tests/unit/application/dtos/`.

## Não faça

- Não devolva entidade de um service.
- Não chame `.toISOString()` no use case, no controller ou no repositório.
- Não escreva regra de negócio no service (pertence ao use case ou à entidade).
- Não coloque schema Zod dentro de `presentation/routes/` — ele mora no DTO e a rota o importa.
- Não crie função `mapToDto` solta no arquivo de DTO.

## Inconsistências conhecidas

- `UserService` usa `createUser`/`getUserById` e `ExpenseQueryService` usa
  `getConsolidatedExpenses`, fugindo do vocabulário curto. Para agregado novo, use os verbos curtos.
- `CLAUDE.md` afirmava que os schemas Zod ficam ao lado das rotas; **não ficam** — ficam em
  `application/dtos/`.
