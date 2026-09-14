---
name: server-http
description: Como escrever controllers, rotas e middlewares em server/src/presentation no Smaug — métodos async (req,res,next), req.userId!, cadeia instanceof mapeando erro de domínio para status, factory createXRoutes com .bind, validateRequest e ordem de montagem em routes/index.ts.
---

# Camada HTTP: controller, rota e middleware

## Quando usar esta skill

Ao criar/alterar `server/src/presentation/controllers/*.controller.ts`,
`presentation/routes/*.routes.ts` ou `presentation/middlewares/*.middleware.ts`.

## Anatomia canônica — controller

`presentation/controllers/one-time-revenue.controller.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import { PastCompetenceError } from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import {
  RevenueNotFoundError,
  PastCompetenceEditError,
} from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";

export class OneTimeRevenueController {
  constructor(private readonly service: OneTimeRevenueService) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.create(req.userId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof PastCompetenceError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.delete(req.userId!, req.params.id as string);
      res.status(204).send();
    } catch (error) {
      if (error instanceof RevenueNotFoundError) {
        res.status(404).json({ error: error.code, message: error.message });
        return;
      }
      if (error instanceof PastCompetenceEditError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }
}
```

## Regras do controller

1. **Classe com métodos `async` normais — não propriedades arrow.** É por isso que a rota precisa de
   `.bind(controller)`.
2. Assinatura sempre `(req: Request, res: Response, next: NextFunction): Promise<void>`. Nunca
   `return res...`.
3. Uma dependência no construtor, chamada `service`.
4. `req.userId!` com non-null assertion — o campo é declarado por module augmentation em
   `extract-user.middleware.ts` e garantido pelo middleware da rota. É a única exceção aceita ao
   banimento de `!`.
5. `req.params.id as string` (o Express 5 tipa `params` de forma frouxa).
6. **Mapeamento erro→status é manual, por método**, com cadeia de `if (error instanceof X)`,
   **cada um terminando em `return;`**, e `next(error)` como último recurso (vira 500).
7. Corpo de erro é sempre `{ error: error.code, message: error.message }` — o campo `error` carrega
   o **código**, não o texto humano.
8. Tabela de status:

   | Operação                        | Status                         |
   | ------------------------------- | ------------------------------ |
   | create                          | 201 + `res.json(result)`       |
   | get / list / update / terminate | 200 + `res.json(result)`       |
   | delete                          | 204 + `res.send()` (sem corpo) |
   | erro "não encontrado"           | 404                            |
   | violação de regra de negócio    | 409                            |
   | body/query inválido             | 400 (vem do `validateRequest`) |
   | header ausente/inválido         | 401 (vem do `extractUser`)     |

9. O controller **não** toca em repositório nem em entidade: só service + classes de erro.
10. `health.controller.ts` é a única exceção: função exportada `healthController(_req, res)`,
    devolvendo 200 ou **503 com `status: "degraded"`**. Parâmetro não usado leva prefixo `_`.

## Anatomia canônica — rotas

`presentation/routes/one-time-revenue.routes.ts` (arquivo completo):

```ts
import { Router } from "express";
import { OneTimeRevenueController } from "@src/presentation/controllers/one-time-revenue.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import {
  createOneTimeRevenueSchema,
  updateOneTimeRevenueSchema,
} from "@src/application/dtos/one-time-revenue.dto";

export function createOneTimeRevenueRoutes(controller: OneTimeRevenueController): Router {
  const router = Router();

  router.post("/", validateRequest(createOneTimeRevenueSchema), controller.create.bind(controller));
  router.get("/", controller.list.bind(controller));
  router.put(
    "/:id",
    validateRequest(updateOneTimeRevenueSchema),
    controller.update.bind(controller),
  );
  router.delete("/:id", controller.delete.bind(controller));

  return router;
}
```

Regras:

1. **Uma factory por feature**: `export function create<Feature>Routes(controller): Router`. Só
   export nomeado, sem `default`.
2. `const router = Router();` → registra → `return router;`.
3. Handler é sempre `controller.<metodo>.bind(controller)`.
4. **Os schemas vêm de `@src/application/dtos/<feature>.dto`**, não são declarados aqui.
5. `validateRequest(schema)` antes de handler de escrita; `validateQuery(schema)` antes de consulta.
   Não há validação de `:id`.
6. Ação de domínio vira sub-rota: `router.post("/:id/terminate", controller.terminate.bind(controller))`.

## `routes/index.ts` — o único barril do projeto

```ts
router.get("/health", healthController);
router.use("/users", createUserRoutes(userController));
router.use(
  "/expenses/categories",
  extractUser(userRepository),
  createExpenseCategoryRoutes(expenseCategoryController),
);
router.use(
  "/expenses/one-time",
  extractUser(userRepository),
  createOneTimeExpenseRoutes(oneTimeExpenseController),
);
router.use(
  "/expenses/installment",
  extractUser(userRepository),
  createInstallmentExpenseRoutes(installmentExpenseController),
);
router.use(
  "/expenses/recurring",
  extractUser(userRepository),
  createRecurringExpenseRoutes(recurringExpenseController),
);
router.use(
  "/revenues/one-time",
  extractUser(userRepository),
  createOneTimeRevenueRoutes(oneTimeRevenueController),
);
router.use(
  "/revenues/fixed",
  extractUser(userRepository),
  createFixedRevenueRoutes(fixedRevenueController),
);
router.use(
  "/revenues",
  extractUser(userRepository),
  createRevenueQueryRoutes(revenueQueryController),
);
router.use(
  "/expenses",
  extractUser(userRepository),
  createExpenseQueryRoutes(expenseQueryController),
);

export default router;
```

**A ordem é funcional, não estética**: `/health` e `/users` ficam abertos (é assim que se cria o
primeiro usuário); os prefixos específicos vêm antes; os catch-alls `/revenues` e `/expenses`
**ficam por último**, senão engolem `/revenues/one-time` e companhia. `extractUser(userRepository)`
é reaplicado em cada montagem. Os controllers são os consts exportados por `container.ts`.

## Middlewares (`presentation/middlewares/`, os 4)

Todos são **funções exportadas** — sem classe, sem decorator. Dois são handlers diretos, dois são
factories que devolvem um handler.

- **`extract-user.middleware.ts`** — a autenticação do projeto. Factory que recebe o
  `UserRepository`; lê o header `x-user-id`, exige UUID e a existência do usuário:
  401 `UNAUTHORIZED` se faltar/for inválido, 404 `USER_NOT_FOUND` se não existir. Declara
  `declare module "express-serve-static-core" { interface Request { userId?: string; } }`.
  **Não há senha nem JWT.**
- **`validate-request.middleware.ts`** — `validateRequest(schema)` e `validateQuery(schema)`.
  Achatam os issues do Zod em `Record<string, string[]>` (chave `issue.path.join(".") || "_root"`)
  e respondem
  `400 { error: "VALIDATION_ERROR", message: "Invalid request body", details: formatted }`.
  `validateRequest` **sobrescreve `req.body = result.data`** (o controller recebe dado já coagido).
- **`request-logger.middleware.ts`** — resolve o `Logger` do container, cronometra com
  `process.hrtime.bigint()` e loga no evento `res.on("finish")`.
- **`error-handler.middleware.ts`** — handler de 4 argumentos, **sempre o último** do app. Loga e
  devolve `500 { error: "Internal Server Error" }`. **Ele não conhece `DomainError`**: toda falha
  que o cliente precisa entender tem que ser mapeada no controller.

Montagem em `infrastructure/http/server.ts` (a ordem importa):

```ts
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(routes);
app.use(errorHandlerMiddleware); // sempre por último
```

## Checklist

- [ ] Controller como classe, com métodos `async (req,res,next): Promise<void>`.
- [ ] `req.userId!` e `req.params.id as string`.
- [ ] Cadeia `instanceof` cobrindo **todos** os erros que o service pode lançar, cada um com `return;`.
- [ ] `next(error)` no fim de todo `catch`.
- [ ] Status conforme a tabela; delete devolve 204 com `res.send()`.
- [ ] Rota com factory `create<Feature>Routes(controller)` e `.bind(controller)`.
- [ ] Schemas importados do DTO.
- [ ] Montagem em `routes/index.ts` **antes** dos catch-alls, com `extractUser(userRepository)`.
- [ ] Teste de controller via `describeControllerContract` (skill `server-testes`).
- [ ] Teste de integração cobrindo cada status (skill `server-testes`).

## Não faça

- Não transforme métodos do controller em propriedades arrow (quebraria o padrão do `.bind`).
- Não declare schema Zod no arquivo de rota.
- Não deixe erro de negócio cair no `errorHandlerMiddleware` — vira 500 genérico.
- Não monte um prefixo novo depois dos catch-alls `/revenues` / `/expenses`.
- Não instancie controller ou service na rota: importe o const do `container.ts`.

## Inconsistências conhecidas

- **`PUT /:id` nas receitas vs `PATCH /:id` nas despesas.** Para recurso novo, escolha pelo
  semântico (substituição total → `PUT`; parcial → `PATCH`) e mantenha coerente com o
  `web/features/*/services` correspondente, que os testes de service assertam por assinatura.
- `validateQuery` grava `validatedQuery` no request, mas **nenhum controller lê**;
  `ExpenseQueryController` re-parseia `req.query` com o próprio schema. Não replique a dupla
  validação: escolha uma.
