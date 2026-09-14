---
name: server-di-container
description: Como registrar dependências no container do server do Smaug (infrastructure/config/container.ts) — fiação manual sem decorators, ritmo de três blocos por fatia, tokens string, registerInstance e o bloco export consumido por routes/index.ts.
---

# Container de injeção de dependências

## Quando usar esta skill

Sempre que adicionar um repositório, caso de uso, service ou controller — nenhum deles é instanciado
fora daqui.

## Onde o código mora

`server/src/infrastructure/config/container.ts`. É o **composition root** de todo o backend.

## O ponto mais importante

**O projeto não usa decorators do tsyringe.** `grep -rn "injectable\|@inject(" server/src` retorna
zero. Apesar de `tsyringe` e `reflect-metadata` serem dependências, a fiação é **100% manual** com
`new`, nesse arquivo. O container tsyringe só é realmente resolvido para o token `"Logger"`
(em `main.ts` e nos dois middlewares de log/erro).

Portanto: **não escreva `@injectable()` nem `@inject("Token")` em classe nenhuma.**

## Cabeçalho do arquivo

```ts
import "reflect-metadata";
import { container } from "tsyringe";
// ~70 imports agrupados por fatia: repositório → porta → use cases → service → controller

const prismaClient = new PrismaClient();

container.registerInstance<PrismaClient>("PrismaClient", prismaClient);
container.registerSingleton<Logger>("Logger", PinoLogger);
container.register<RepositoryFactory>("RepositoryFactory", { useValue: getRepository });
```

Só três APIs do container são usadas: `registerInstance`, `registerSingleton`, `register`.
**Tokens são string literal igual ao nome do tipo** — `"PrismaClient"`, `"Logger"`,
`"OneTimeRevenueService"`, `"InstallmentExpenseController"`. Sem `Symbol`, sem objeto `TOKENS`.

## Anatomia canônica — uma fatia

Ritmo de três blocos, repetido sete vezes. Exemplo real (`container.ts:92-107`):

```ts
const oneTimeRevenueRepository: OneTimeRevenueRepository = new PrismaOneTimeRevenueRepository(
  prismaClient,
);
const createOneTimeRevenueUseCase = new CreateOneTimeRevenueUseCase(oneTimeRevenueRepository);
const updateOneTimeRevenueUseCase = new UpdateOneTimeRevenueUseCase(oneTimeRevenueRepository);
const deleteOneTimeRevenueUseCase = new DeleteOneTimeRevenueUseCase(oneTimeRevenueRepository);
const listOneTimeRevenuesUseCase = new ListOneTimeRevenuesUseCase(oneTimeRevenueRepository);
const oneTimeRevenueService = new OneTimeRevenueService(
  createOneTimeRevenueUseCase,
  updateOneTimeRevenueUseCase,
  deleteOneTimeRevenueUseCase,
  listOneTimeRevenuesUseCase,
);
const oneTimeRevenueController = new OneTimeRevenueController(oneTimeRevenueService);

container.registerInstance<OneTimeRevenueRepository>(
  "OneTimeRevenueRepository",
  oneTimeRevenueRepository,
);
container.registerInstance<OneTimeRevenueService>("OneTimeRevenueService", oneTimeRevenueService);
container.registerInstance<OneTimeRevenueController>(
  "OneTimeRevenueController",
  oneTimeRevenueController,
);
```

## Regras

1. **A variável do repositório é anotada com o tipo da PORTA**
   (`const xRepository: XRepository = new PrismaXRepository(prismaClient);`). É isso que impede o
   resto do grafo de enxergar a classe do Prisma. Use cases, service e controller têm tipo inferido.
2. Ordem dentro da fatia: repositório → use cases (na ordem create, update/get, delete, list) →
   service → controller.
3. **Só repositório, service e controller são registrados no container.** Casos de uso **nunca** são
   registrados — eles só existem como const locais.
4. `registerInstance<T>("T", instancia)` para tudo que já foi construído;
   `registerSingleton<Logger>("Logger", PinoLogger)` só para o logger;
   `register<RepositoryFactory>(..., { useValue: getRepository })` só para a factory legada.
5. **A ordem das fatias importa** — uma fatia posterior reutiliza const de uma anterior:
   `PrismaClient/Logger/RepositoryFactory` → `user` → `one-time-revenue` → **`expense-category`**
   (necessária para as três fatias de despesa) → `one-time-expense` → `installment-expense` →
   `recurring-expense` → `fixed-revenue` → `revenue-query` → `expense-query`.
6. O arquivo termina com um bloco `export { ... }` — é isso que `presentation/routes/index.ts`
   importa:
   ```ts
   export {
     container,
     userRepository,
     userController,
     oneTimeRevenueController,
     oneTimeExpenseController,
     installmentExpenseController,
     recurringExpenseController,
     fixedRevenueController,
     fixedRevenueRepository,
     revenueQueryController,
     expenseQueryController,
     expenseCategoryController,
     expenseCategoryRepository,
   };
   ```
   Exporte o **controller** de toda fatia nova, e o **repositório** apenas se alguma rota precisar
   dele (hoje só `userRepository`, por causa do `extractUser`).
7. O sufixo `.ts` aparece nos imports deste arquivo (ele é um dos 11 de bootstrap). Siga o padrão
   dos vizinhos ao acrescentar a fatia.

## Checklist para acrescentar uma fatia

- [ ] Imports da fatia agrupados no topo, na ordem repositório → porta → use cases → service → controller.
- [ ] Bloco de `new` posicionado **depois** de qualquer fatia da qual dependa (ex.: `expense-category`).
- [ ] Repositório anotado com o tipo da porta.
- [ ] Três `registerInstance` (repositório, service, controller).
- [ ] Controller acrescentado ao bloco `export { ... }` final.
- [ ] Montagem correspondente em `presentation/routes/index.ts`.
- [ ] `tests/unit/infrastructure/config/container.test.ts` continua passando.

## Não faça

- Não escreva `@injectable()` / `@inject()`.
- Não registre casos de uso no container.
- Não use `Symbol` nem objeto de tokens.
- Não faça `container.resolve(...)` em controller, service ou rota — a única resolução em runtime é
  `container.resolve<Logger>("Logger")`, nos dois middlewares de log/erro e no `main.ts`.
- Não instancie service ou repositório em rota, controller ou teste de integração.

## Inconsistência conhecida

O `container.ts` cria o próprio `new PrismaClient()`, separado do singleton preguiçoso de
`infrastructure/database/config.ts` (`getPrismaClient()`), usado por `/health` e pelo
`database.provider.ts` — na prática **são duas conexões**. Não "conserte" isso de passagem numa
tarefa de feature; se for unificar, é mudança própria, com teste.
