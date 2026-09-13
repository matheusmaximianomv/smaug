# Estratégia de testes

| Camada                                                                    | Ferramenta                             | Onde                                 |
| ------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| Unitário, componente, integração (componente↔componente e componente↔API) | **Vitest** + Testing Library + **MSW** | `web/**/*.test.ts(x)` e `web/tests/` |
| End-to-end                                                                | **Playwright**                         | `e2e/`                               |
| Servidor (unit + integração)                                              | Vitest + Supertest                     | `server/tests/` (pré-existente)      |

## Divisão de responsabilidade entre Vitest e Playwright

> **MSW prova que o frontend se comporta corretamente dado um contrato.
> O E2E prova que o contrato é real.**

Na prática: os testes de integração de página **não** repetem os caminhos felizes
que o E2E percorre. Eles cobrem o que o E2E não alcança barato:

- cada código de erro da API renderizando sua mensagem pt-BR;
- a action "Tentar novamente" dos toasts de erro;
- o ramo `DeleteWarningModal` vs `ConfirmDialog`;
- as guardas de competência passada/futura.

## Comandos

```bash
npm test                      # server + web (termina; não é watch)
npm run --prefix web test
npm run --prefix web test:watch
npm run --prefix web test:coverage
npm run test:e2e              # cria SQLite exclusivo, roda, descarta
npm run e2e:install-browsers  # uma vez por máquina
```

## Documentos

- [`pr2-vitest-inventory.md`](./pr2-vitest-inventory.md) — inventário caso a caso da suíte Vitest.
- [`pr3-e2e-specs.md`](./pr3-e2e-specs.md) — inventário caso a caso dos specs Playwright.
- [`../../e2e/README.md`](../../e2e/README.md) — como a switch de SQLite funciona.

## Harness do Vitest (entregue no PR1)

| Arquivo                      | Papel                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `web/vitest.setup.ts`        | shims do jsdom 29, ciclo de vida do MSW, `afterEach` global                                  |
| `web/tests/render.tsx`       | `renderWithProviders`, `renderHookWithProviders`, `createTestQueryClient`                    |
| `web/tests/router.tsx`       | contextos reais do Next + `routerAdapterMock`                                                |
| `web/tests/msw/`             | `server`, `db` (store em memória), handlers por recurso, `mockApiError`/`mockNetworkError`   |
| `web/tests/fixtures/`        | factories determinísticas por entidade                                                       |
| `web/tests/toast.ts`         | `spyOnToast`, `drainToasts`                                                                  |
| `web/tests/session.ts`       | `loginAs`, `logout` (cookie real)                                                            |
| `web/tests/time.ts`          | `NOW`, `NOW_COMPETENCE`, `freezeTime`                                                        |
| `web/tests/mocked.ts`        | `Mocked<T>`, `mockService`                                                                   |
| `web/tests/harness.test.tsx` | testes do próprio harness — se quebrarem, investigue aqui antes de qualquer teste de feature |

## Armadilhas verificadas

| Armadilha                                               | Como lidar                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `formatCurrency` emite **U+00A0** entre `R$` e o número | `expect(...).toBe("R$ 1.234,56")`. Em query do RTL o normalizador colapsa NBSP, então lá espaço comum funciona |
| `window.location` é **não-configurável** no jsdom 29    | Use a costura `@/infra/navigation` (`redirectToLogin`), não `vi.spyOn(window.location, ...)`                   |
| `useToast` tem fila global sem reset                    | `spyOnToast()` por padrão; fake timers só nos dois testes do próprio toast                                     |
| `infra/query-client.ts` é singleton com `retry: 3`      | Sempre `createTestQueryClient()`; nunca `app/providers.tsx`                                                    |
| `NEXT_PUBLIC_API_URL` é lido em tempo de módulo         | Fixado em `test.env` no `vitest.config.ts`; `vi.stubEnv` chega tarde demais                                    |
| Instalar deps em `web/`                                 | **Sempre** `--legacy-peer-deps` (React 19 RC). Já fixado em `web/.npmrc`                                       |
