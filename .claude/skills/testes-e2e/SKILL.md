---
name: testes-e2e
description: Como escrever testes E2E do Smaug com Playwright no pacote e2e/ — caixa-preta sem importar server/web, fixtures test.ts + scenarios.ts em vez de page objects, seletores por papel, SeedClient por HTTP (com importCsv para dado passado) e competência congelada.
---

# Testes E2E (Playwright)

## Quando usar esta skill

Ao escrever ou alterar qualquer coisa em `e2e/`.

```bash
npm run e2e:install-browsers    # uma vez por máquina
npm run test:e2e                # cria SQLite exclusivo do run, roda, descarta
npm run test:e2e:ui
npm run test:e2e:report
```

## A regra que define o pacote: caixa-preta

`e2e/` **não importa nada de `server/` nem de `web/`** — a regra `no-e2e-to-src` do
`.dependency-cruiser.js` é `error`. Ele fala só HTTP e DOM. Por isso existe
`src/support/month-names.ts` duplicando nomes de mês em vez de importar do `web/` — e o arquivo diz
isso no cabeçalho.

`e2e/package.json` tem só três devDeps (`@playwright/test`, `@types/node`, `typescript`): a
restrição é imposta no nível da dependência.

## Estrutura

```
e2e/
  playwright.config.ts · scripts/run-e2e.mjs · README.md
  src/
    api/         seed-client.ts · types.ts
    config/      env.ts
    fixtures/    test.ts · scenarios.ts
    support/     ui.ts · competence.ts · format.ts · month-names.ts
    global-setup.ts · global-teardown.ts
  tests/
    smoke.spec.ts
    auth/ · dados/ · dashboard/ · despesas/ · historico/ · lancamentos/ · receitas/ · responsive/
```

## As quatro regras do `e2e/README.md`

> - **Nunca** literais de mês/ano. Tudo deriva de `competence.current`, congelada no `globalSetup`
>   e propagada por env para todos os workers.
> - **Nunca** semear no passado pelos `create-*`: a API rejeita competência passada. A situação de
>   cada mês (passado/atual/futuro, parcela paga, série encerrada) é calculada pelo **servidor**, com
>   o relógio dele — mexer no relógio do browser não muda nada. Para ter dado passado (um
>   parcelamento já em andamento), importe-o: `seed.importCsv([...])` é o único escritor que
>   dispensa a trava de passado.
> - Valores de parcela são assertados contra o que a API devolveu, nunca contra literais — o
>   arredondamento é regra de domínio.
> - Este pacote é **caixa-preta**: não importa nada de `server/` nem de `web/`.

## Não existem page objects

A estrutura real é em três camadas:

1. **`src/fixtures/test.ts`** — `test = base.extend<Options & Fixtures>({...})` com
   `authenticate` (opção, default `true`), `apiRequest`, `seedUser` (**um usuário novo por teste**,
   intitulado `E2E ${testInfo.title.slice(0, 40)}` — é o que permite `fullyParallel` sem truncar
   tabela), `seed` (`SeedClient`), `context` sobrescrito (aborta Google Fonts, injeta o cookie
   `userId`) e `competence`.
   **Não há fixture de relógio** (`shiftClock` foi removido): desde que a situação das competências
   passou a vir do servidor, `page.clock` não altera "Paga", "Atual" nem "Encerrada".
   O módulo faz `export { expect };` — **o spec importa `expect` e `test` daqui, nunca de
   `@playwright/test`.**
2. **`src/fixtures/scenarios.ts`** — builders em pt-BR `cenarioX(seed, k: CompetenceKit, options?)`,
   cada um com uma `interface CenarioX` de retorno, **devolvendo tudo que criaram** para o spec
   assertar contra a resposta do servidor. Existem: `cenarioDashboardCompleto`,
   `cenarioReceitaFixaVersionada`, `cenarioRecorrenteVersionada`, `cenarioHistoricoMisto`,
   `cenarioCategoriaComVinculo`, `cenarioParcelamento`.
3. **`src/support/ui.ts`** — só o que é **estrutural** na UI: `goto(page, path)` (goto + espera de
   hidratação), `waitForHydration`, `dialog(page)`, `ficha(page, descrição)` (o diálogo da Ficha pelo
   nome acessível), `monthStrip(page)` (faixa de 12 meses), `kpiCard(page, label)`, `monthBadge`,
   `panel`, `hideDevOverlays`, `documentOverflow`.
   Cópia de texto **fica no spec**, para a asserção ser legível no ponto de uso.

Helper específico de um arquivo fica no próprio spec, com JSDoc:

```ts
/** A linha do extrato é um botão cujo nome acessível começa pela descrição. */
function linha(page: Page, description: string): Locator {
  return page.getByRole("button", { name: new RegExp(`^${description}`) });
}
```

## Seletores

**Primário: papel, rótulo e texto** — `getByRole("tab"|"button"|"dialog"|"heading")`, `getByLabel`,
`getByPlaceholder`, `getByText`.

**`data-testid` só para card repetido que não tem papel próprio.** Resta exatamente um:
`category-card`. As linhas do extrato de Receitas/Despesas são botões e as Fichas são diálogos
nomeados pela descrição — consulte-os por papel (`ficha(page, "Notebook")`). Duas armadilhas da
Ficha: há dois botões "Fechar" (o × e o do rodapé — use `.last()`), e `getByText("Mês atual")`
precisa de `{ exact: true }` por causa do botão "Voltar para o mês atual".

**Sempre `goto(page, "/despesas")` do `support/ui.ts`, nunca `page.goto` direto** — a exceção são
os testes de guarda de rota, que querem justamente observar o redirecionamento.

## Seeding — `SeedClient` (`src/api/seed-client.ts`)

Semeia **exclusivamente por HTTP**, nunca escrevendo no SQLite (os ids são `String @id` sem
`@default`, há estado derivado como `nameLower` e a expansão de parcelas, e um segundo escritor
SQLite quebraria os workers paralelos).

Construtor `(api: APIRequestContext, userId?: string)`, `asUser(userId)`, getter privado `headers`
emitindo `{ "X-User-Id": this.userId }`, e um `unwrap<T>` que grita quando o seed falha:

```ts
private async unwrap<T>(res: APIResponse, what: string): Promise<T> {
  if (!res.ok()) {
    const body = await res.text().catch(() => "<sem corpo>");
    throw new Error(`[seed] ${what} → HTTP ${res.status()}\n${body}`);
  }
  return (await res.json()) as T;
}
```

Métodos agrupados por comentário-faixa (`// ---- usuários`, `// -------- categorias`, …).
Variantes `...Raw` existem onde o teste assere a falha (`deleteCategoryRaw`).

**Dado no passado: `importCsv(rows)`.** Recebe as linhas do CSV sem cabeçalho (o método acrescenta
BOM, cabeçalho e CRLF) e posta em `/data/import`. Monte a competência com `csvCompetence(...)` de
`support/format.ts`:

```ts
// A situação das parcelas vem do relógio do SERVIDOR; o único jeito de ter
// uma parcela já paga é importar a série com o 1º mês no passado.
await seed.importCsv([
  `${csvCompetence(competence.prev)};despesa;Eletrônicos;Notebook;33,34;parcelada;1;3;s1;`,
  `${csvCompetence(competence.current)};despesa;Eletrônicos;Notebook;33,33;parcelada;2;3;s1;`,
  `${csvCompetence(competence.next)};despesa;Eletrônicos;Notebook;33,33;parcelada;3;3;s1;`,
]);
```

## Estilo do spec

```ts
import type { Page } from "@playwright/test";
import { cenarioParcelamento } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, cellAmount, csvCompetence } from "../../src/support/format.js";
import { dialog, ficha, goto } from "../../src/support/ui.js";

test.describe("despesas parceladas", () => {
  test("a Revisão divide R$ 100,00 em 3× com os centavos na 1ª e o servidor grava o mesmo", async ({
    page,
    seed,
  }) => {
    await seed.createCategory("Eletrônicos");
    await goto(page, "/despesas");
    await page.getByRole("button", { name: "Nova despesa" }).click();
```

- **Import relativo com extensão `.js` obrigatória** (ESM + `moduleResolution: "Bundler"`).
- Títulos de `test.describe` e `test` em **pt-BR, minúsculos, linguagem de domínio**
  (`"cria um parcelamento e o card resume o plano"`,
  `"bloqueia primeira parcela em competência passada"`).
- Fixtures desestruturadas na assinatura: `async ({ page, seed, competence })`.
- `test.use({ authenticate: false })` dentro de um `describe` aninhado para casos não autenticados.
- Dinheiro via `brl(...)` (ou `compact`/`cellAmount` na faixa e nas células), mês via
  `monthShort(...)` / `monthLong(...)` / `monthTitle(...)` — **nunca literal**.
- Tabela de rotas vira laço:
  ```ts
  for (const route of APP_ROUTES) {
    test(`visitante em ${route} é mandado para o login`, async ({ page }) => { ... });
  }
  ```
- `expect.poll` para estado eventualmente consistente (limpeza de cookie, tamanho de lista).

## Configuração

`playwright.config.ts`: `fullyParallel: true`, `retries` 2 no CI, `workers` 2 no CI / 4 local,
`timeout: 60_000`, `expect.timeout: 10_000`, `trace: "on-first-retry"`,
`screenshot: "only-on-failure"`, `video: "retain-on-failure"`, `navigationTimeout: 45_000`
(o `next dev` compila sob demanda), `locale: "pt-BR"`, `timezoneId: "UTC"`.

Projetos: `desktop-chromium` (1280×800, ignora `**/*.mobile.spec.ts`) e `mobile-chromium`
(Pixel 5, casa `**/*.mobile.spec.ts`) — **o infixo `.mobile.spec.ts` é o seletor de projeto**.
Firefox/WebKit só com `E2E_ALL_BROWSERS`. Os dois `webServer` usam `reuseExistingServer: false`:
nunca reaproveitar, porque poderia ser o `dev.db`.

Portas: API 3100, Web 3101 (não colidem com o `npm run dev`, em 3000/3001). Knobs de env:
`E2E_API_PORT`, `E2E_WEB_PORT`, `E2E_WEB_MODE` (`dev` local / `build` no CI), `E2E_TMP_DIR`,
`E2E_KEEP_DB`, `E2E_ALL_BROWSERS`.

`scripts/run-e2e.mjs` recusa rodar se o client do Prisma não for SQLite, cria
`e2e/.tmp/smaug-e2e-<runid>.db`, roda `prisma db push` pelo wrapper do server, sobe o
Playwright, limpa `["", "-journal", "-wal", "-shm"]` no fim e trata SIGINT/SIGTERM.
`global-setup.ts` confere que `/health` responde `provider: "sqlite"`, faz um `POST /users` de sonda
para provar que o schema existe, congela `E2E_BASE_COMPETENCE` no env e avisa se faltarem menos de
15 min para a virada de mês em UTC.

## Divisão com o Vitest

> MSW prova que o frontend se comporta **dado um contrato**; o E2E prova que o contrato é **real**.

Caminho feliz de ponta a ponta é do E2E. Matriz de código de erro, texto de toast, ramo de modal e
guarda de competência é do Vitest (skill `web-testes`).

## Checklist

- [ ] Spec em `tests/<área>/<assunto>.spec.ts` (ou `.mobile.spec.ts` para o projeto mobile).
- [ ] `import { expect, test } from "../../src/fixtures/test.js";` com extensão `.js`.
- [ ] Nenhum import de `server/` ou `web/`.
- [ ] Estado montado por `cenarioX(seed, competence)` ou pelo `SeedClient`, sempre por HTTP.
- [ ] `goto(page, "/rota")` em vez de `page.goto`.
- [ ] Seletor por papel/rótulo/texto; `data-testid` só se o card não tiver papel.
- [ ] Zero literal de mês, ano ou valor de parcela — derive de `competence` e da resposta da API.
- [ ] Estado "passado" produzido com `seed.importCsv(...)`, nunca com `create-*` no passado nem mexendo no relógio.
- [ ] `npm run test:e2e` verde.

## Não faça

- Não importe de `server/` nem de `web/`.
- Não crie page object — use fixture + cenário + `support/ui.ts`.
- Não escreva `"Set/26"`, `2026` ou `R$ 208,33` literal num spec.
- Não semeie competência passada pelos `create-*` (a API recusa de propósito) — use `importCsv`.
- Não use `page.clock` para produzir situação passada: o servidor decide, não o browser.
- Não importe `expect`/`test` de `@playwright/test`.
- Não repita no E2E um caminho que o Vitest já cobre barato.
