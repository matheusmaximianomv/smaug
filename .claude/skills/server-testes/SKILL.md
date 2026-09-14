---
name: server-testes
description: Como escrever testes do server do Smaug — unit espelhando src, títulos em inglês it("should …"), dublês vi.fn das portas, describeControllerContract para controllers, e integração com SQLite próprio + Supertest + X-User-Id. Cobertura exigida 100%.
---

# Testes do server

## Quando usar esta skill

Ao escrever qualquer teste em `server/tests/`.

## Estrutura

`server/tests/unit/` **espelha `server/src/` 1:1**, e o nome do arquivo é o do fonte + `.test.ts`:

```
tests/
  helpers/       controller-contract.ts · http-mocks.ts · repository-mocks.ts · setup.ts
  integration/presentation/   um arquivo por recurso
  unit/
    application/{dtos,services}/
    domain/{entities,errors,use-cases/<agregado>,value-objects}/
    infrastructure/{config,database,database/repositories,http,logging}/
    presentation/{controllers,middlewares}/
```

Config: `server/vitest.config.ts` (o único do pacote). Alias `@src`, `environment: "node"`,
`globals: true`, cobertura **100/100/100/100** com `src/**/ports/**` excluído (são interfaces).
`test:unit` e `test:integration` filtram **por caminho** (`vitest run tests/unit`), não por project.

```bash
npm run --prefix server test               # unit + integração
npm run --prefix server test:unit
npm run --prefix server test:integration
npx vitest run tests/unit/domain/entities/user.entity.test.ts --root server   # arquivo único
```

## Convenções de escrita

1. **Títulos em inglês**: `it("should <verbo> ... when <condição>")`. 465 dos 471 `it` do pacote
   começam com `should`.
2. **`describe` é o nome da classe sob teste, verbatim**: `describe("InstallmentExpense")`,
   `describe("CreateInstallmentExpenseUseCase")`, `describe("extractUser")`.
   Quando um segundo conjunto de casos precisa de outro fixture, abra **um segundo `describe`
   irmão com sufixo** — `describe("InstallmentExpense validation guards")` — em vez de aninhar.
   Aninhamento por método só existe no teste do value object.
3. **Imports nomeados do vitest**, mesmo com `globals: true`:
   ```ts
   import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
   ```
   Fonte via `@src`; helpers por caminho relativo (`../../../../helpers/repository-mocks`).
4. **AAA separado por linha em branco, sem comentários `// Arrange`.** O "act" é uma linha só,
   normalmente atribuída a `const result`.
5. Literais compartilhados viram `const` SCREAMING_SNAKE no módulo:
   ```ts
   const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
   const USER_ID = "user-1";
   const CATEGORY_ID = "category-1";
   const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
   ```
6. Input válido é um `const validProps = { ... } as const;` (entidade) ou `const input = { ... };`
   (use case) dentro do `describe`, e cada caso **espalha e sobrescreve um campo**:
   `InstallmentExpense.create({ ...validProps, totalAmount: 10.123 })`.
7. Builders locais são consts arrow: `const buildRevenue = (end?: {...}) => FixedRevenue.create({...});`
   **Não existem fixtures compartilhadas no server** — cada arquivo tem as suas.
8. Como o domínio lê `new Date()`, todo teste com data usa o par:

   ```ts
   beforeEach(() => {
     vi.useFakeTimers();
     vi.setSystemTime(BASE_DATE);
   });

   afterEach(() => {
     vi.useRealTimers();
   });
   ```

   e prova o `updatedAt` com `vi.advanceTimersByTime(1)`.

## Dublês de repositório

Três estilos coexistem; **prefira o (a)** e crie a factory quando ela não existir.

**(a) Factory compartilhada — `tests/helpers/repository-mocks.ts`**

```ts
export type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K];
};

export function createFixedRevenueRepositoryMock(): Mocked<FixedRevenueRepository> {
  return { findById: vi.fn(), findByIdWithVersions: vi.fn(), ... } as unknown as Mocked<FixedRevenueRepository>;
}
```

Uso — repositório e use case construídos **uma vez no escopo do describe**, resetados por teste:

```ts
const repository = createFixedRevenueRepositoryMock();
const useCase = new TerminateFixedRevenueUseCase(repository);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(BASE_DATE);
  repository.update.mockImplementation(async (revenue) => revenue);
});
```

Vantagem: o call site fica sem cast — `repository.findById.mockResolvedValue(buildRevenue());`

**(b) Tipo mapeado inline + reconstrução no `beforeEach`** (fatias de despesa). Custa um cast em
cada arranjo: `(categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category)`.

**(c) Objeto literal no escopo do describe** (services e middlewares). Colaborador não exercitado
entra como descartável anônimo: `{ execute: vi.fn() } as unknown as CreateInstallmentExpenseUseCase`.

Outras regras de mock:

- `vi.fn()` por método da porta. **`vi.mock()` de módulo só em `infrastructure/` e `main.test.ts`.**
- `mockResolvedValue` / `mockRejectedValue` para arranjar; `mockImplementation(async (x) => x)` para
  update pass-through.
- Reset com `vi.clearAllMocks()` no `beforeEach`.
- `vi.spyOn(Classe.prototype as unknown as {...}, "metodoPrivado")` só quando não há outro caminho,
  e sempre com `mockRestore()` explícito ao final.

## Vocabulário de `expect`

| Intenção                 | Idioma                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Primitivo                | `expect(x).toBe(...)` — nunca `toEqual` para escalar                                                          |
| Objeto/array             | `expect(result.expense).toEqual(createdExpense)`                                                              |
| Data                     | `expect(x.createdAt.toISOString()).toBe(BASE_DATE.toISOString())`                                             |
| Throw síncrono           | `expect(() => X.create({...})).toThrow("Amount must have at most 2 decimal places")` — **string da mensagem** |
| Rejeição assíncrona      | `await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError)` — **classe**             |
| Efeito colateral ausente | `expect(repository.create).not.toHaveBeenCalled()` — em quase todo caso de erro                               |
| Argumento frouxo         | `expect(repo.create).toHaveBeenCalledWith(expect.any(InstallmentExpense), expect.any(Array))`                 |
| Metadado de erro         | `it("should expose the error codes")` assertando `.code` e `.name`                                            |

## Teste de controller — use `describeControllerContract`

`tests/helpers/controller-contract.ts` gera a bateria padrão. **Um arquivo de teste de controller
não tem `describe`, `it` nem `beforeEach` próprios** — é uma única chamada.

API:

```ts
export interface MethodContract {
  method: string; // método do controller exercitado
  delegatesTo: string; // método do service ao qual delega
  request?: Partial<Request>;
  expectedArgs?: unknown[];
  successStatus: number;
  successResult?: unknown; // undefined ⇒ resposta sem corpo (res.send())
  mappedErrors?: Array<{ error: Error & { code?: string }; status: number }>;
}

export function describeControllerContract(
  title: string,
  setup: () => { controller: ControllerMock; service: ServiceMock },
  contracts: MethodContract[],
): void;

export function createServiceMock(methods: string[]): ServiceMock;
```

Uso real (`tests/unit/presentation/controllers/installment-expense.controller.test.ts`):

```ts
const expense = { id: "expense-1", description: "Notebook" };

describeControllerContract(
  "InstallmentExpenseController",
  () => {
    const service = createServiceMock(["create", "get", "list", "update", "terminate", "delete"]);
    return {
      service,
      controller: new InstallmentExpenseController(
        service as unknown as InstallmentExpenseService,
      ) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "create",
      delegatesTo: "create",
      request: { body: { description: "Notebook", totalAmount: 1000 } },
      expectedArgs: ["user-1", { description: "Notebook", totalAmount: 1000 }],
      successStatus: 201,
      successResult: expense,
      mappedErrors: [
        { error: new InstallmentExpensePastStartError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "delete",
      delegatesTo: "delete",
      request: { params: { id: "expense-1" } },
      expectedArgs: ["user-1", "expense-1"],
      successStatus: 204, // sem successResult ⇒ espera res.send()
      mappedErrors: [
        /* ... */
      ],
    },
  ],
);
```

Ele gera três tipos de teste por contrato: caminho feliz, um por erro mapeado
(`should respond with <status> for <ErrorName>`) e `should forward unexpected errors to next`.
O `"user-1"` de `expectedArgs` vem do `userId` default de `createRequestMock`.

Helpers auxiliares em `tests/helpers/http-mocks.ts`: `createResponseMock()` (com `status`/`json`/`send`
encadeáveis) e `createRequestMock(overrides)` (defaults `params/query/body/headers` vazios,
`userId: "user-1"`). Em `tests/helpers/setup.ts`: `withEnv(vars, fn)` para isolar `process.env`.

## Teste de integração

`tests/integration/presentation/<recurso>.test.ts`. **Um arquivo `.db` por arquivo de teste.**
Boilerplate a copiar:

```ts
const TEST_DB_URL = "file:./test-installment-expense.db";

beforeAll(async () => {
  vi.resetModules();

  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.NODE_ENV = "test";
  process.env.PORT = "3000";
  process.env.LOG_LEVEL = "error";

  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

  const { execSync } = await import("child_process");
  execSync(`DATABASE_URL=${TEST_DB_URL} npx prisma db push --force-reset --skip-generate`, {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  const { createHttpServer } = await import("@src/infrastructure/http/server");
  app = createHttpServer();

  const createUserRes = await request(app).post("/users").send({ name: "...", email: "..." });
  userId = createUserRes.body.id;
});
```

Ordem obrigatória: `vi.resetModules()` → env → `prisma db push` → **`await import()` dinâmico** do
app (import estático avaliaria o container contra o ambiente de dev) → seed **por HTTP**, nunca via
Prisma.

```ts
afterAll(async () => {
  await prisma.$disconnect();
  const { unlinkSync, existsSync } = await import("fs");
  const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
  if (existsSync(dbPath)) unlinkSync(dbPath);
});

beforeEach(async () => {
  await prisma.installment.deleteMany(); // tabela filha primeiro
  await prisma.installmentExpense.deleteMany();
});
```

Supertest com header local:

```ts
const authHeaders = () => ({ "X-User-Id": userId });
const res = await request(app).post("/expenses/installment").set(authHeaders()).send({ ... });
expect(res.status).toBe(409);
expect(res.body.error).toBe("NO_FUTURE_INSTALLMENTS");
```

Formato do arquivo: o **primeiro teste é um passeio completo pelo ciclo de vida**
(`"should create, list, get, update, terminate, and delete ..."`), seguido de um teste por código
de erro. Estado dependente de tempo usa `vi.useFakeTimers()` + `vi.setSystemTime(...)` **dentro do
`it`**; linha em competência passada é inserida direto pelo Prisma (contornando a guarda da API),
com `id` explícito e legível (`"installment-no-future-1"`).

Pré-requisito: um client do Prisma já gerado. Esses runs deixam arquivos `.db` em `server/`.

## Checklist

- [ ] Arquivo espelhando o caminho do fonte, com `.test.ts`.
- [ ] `describe` = nome da classe; `it("should …")` em inglês.
- [ ] Imports nomeados do vitest; fonte por `@src`.
- [ ] Fake timers quando houver data.
- [ ] Caso de erro assertando também `not.toHaveBeenCalled()` no repositório.
- [ ] Controller coberto por `describeControllerContract`, não por testes escritos à mão.
- [ ] Integração com `.db` próprio, import dinâmico do app e seed por HTTP.
- [ ] `npm run --prefix server test` verde e cobertura 100% (thresholds falham o run).

## Não faça

- Não escreva teste de controller manualmente quando `describeControllerContract` cobre o caso.
- Não use import estático do app no teste de integração.
- Não compartilhe arquivo `.db` entre arquivos de teste.
- Não semeie dados de integração direto no Prisma quando a API pode criá-los (a exceção é estado
  em competência passada, que a API recusa de propósito).
- Não use `it("deve …")` no server — português é a convenção do `web/` e do `e2e/`.
