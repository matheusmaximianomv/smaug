# PR3 — Inventário dos specs Playwright

Infraestrutura e `smoke.spec.ts` já existem (PR1). Este documento é o escopo caso
a caso dos 13 specs restantes. Leia [`../../e2e/README.md`](../../e2e/README.md)
antes: a switch de SQLite e as regras de escrita estão lá.

## Regras invioláveis

1. **Nunca literais de mês/ano.** Tudo deriva de `competence` (fixture):
   `competence.current`, `.next`, `.in2`, `.prev`, `.plus(n)`. A competência base é
   congelada no `globalSetup` e propagada por env para todos os workers.
2. **Nunca semear no passado.** A API rejeita competência passada
   (`MonthlyCompetence.isPastMonth()` em todos os `create-*`/`update-*`/`terminate-*`).
   `competence.prev` serve **só** para navegação e para testar a validação
   client-side.
3. **Estados passados vêm do relógio do browser.** Badges `Pago`, `Encerrada` e
   `X/N pagas` são calculados no cliente com `new Date()`. Use `shiftClock(n)`
   para **avançar** (nunca voltar), **antes** do `page.goto`. Specs assim estão
   marcados **⏱**. Hydration mismatch é esperado neles — **não** adicione gate
   global de "zero erros no console".
4. **Valores de parcela são assertados contra o que a API devolveu**, nunca contra
   literais — o arredondamento é regra de domínio.
5. **Um usuário novo por teste** (fixture `seedUser`/`seed`), o que dá isolamento
   natural e permite `fullyParallel`.
6. Este pacote é **caixa-preta**: não importe nada de `server/` nem de `web/`
   (a regra `no-e2e-to-src` do dependency-cruiser barra).

## Seletores disponíveis

`data-testid`: `category-card`, `fixed-revenue-card`, `recurring-expense-card`,
`installment-card` (todos são `<article>`).
`aria-label`: `Fechar`, `Editar`, `Excluir`, `Editar categoria`,
`Excluir categoria`, `Mês anterior`, `Próximo mês`, `Abrir menu`, `Sair`,
`Categoria`, `Modalidade`, `<label> — mês`, `<label> — ano`.
Roles: `navigation` nomeado (`Navegação principal` / `Navegação inferior`),
`dialog` (Radix portal — `getByRole("dialog")` atravessa), `tab`/`tablist`,
`article`, `table`/`row`/`cell`, `combobox`.
`Input`/`Select` agora **associam label**, então `getByLabel()` funciona.

Helpers: `brl()`/`brlLoose()`, `monthShort()` (`"Set/26"`), `monthLong()`
(`"Setembro de 2026"`).

## Ordem de implementação

`auth` → `categorias` → `receitas/avulsas` → `despesas/avulsas` → `dashboard` →
`parceladas` → `fixas` + versionamento → `recorrentes` → `historico` → `mobile`.

---

## `tests/auth/guards.spec.ts` — `test.use({ authenticate: false })`

- visitante em `/dashboard` → `/login`
- visitante na raiz `/` → `/login`
- visitante em cada rota protegida → `/login` (loop sobre `APP_ROUTES`)
- autenticado em `/login` → `/dashboard`
- autenticado em `/cadastro` → `/dashboard`
- **cookie com valor não-UUID** → o middleware deixa passar (cookie presente), a
  API devolve 401, o interceptor limpa e `redirectToLogin` leva a `/login`
- **cookie com UUID inexistente** → `getUserById` 404 → `isInvalidSessionError` →
  `clearUserId()`; após `reload()` o middleware manda para `/login`

## `tests/auth/login.spec.ts` — `authenticate: false`

- faz login com o ID e chega ao dashboard (sidebar exibe o nome)
- **rejeita ID malformado sem chamar a API** → `"ID de usuário inválido"`
- UUID inexistente → `"Usuário não encontrado. Verifique o ID e tente novamente."`
- **a sessão persiste após recarregar** (F5 em `/receitas` continua em `/receitas`)
- logout (`aria-label="Sair"`) → `/login`; voltar a `/dashboard` redireciona

## `tests/auth/cadastro.spec.ts` — `authenticate: false`

- cria conta e exibe o ID (`"Cadastro realizado com sucesso!"`, input readonly)
- **o ID recém-criado autentica** (`"Ir para Login"` → cola o ID → `/dashboard`)
- e-mail duplicado → `"Já existe uma conta com este e-mail."`
- valida nome e e-mail → `"Nome é obrigatório"`, `"Email inválido"`

## `tests/dashboard/dashboard.spec.ts`

- dashboard vazio: `brl(0)` nos 3 KPIs, `"Nenhuma receita neste mês."`,
  `"Nenhuma despesa neste mês."`, `"Nenhuma despesa registrada neste mês."`
- consolida receitas e despesas do mês vigente (`cenarioDashboardCompleto`):
  KPIs `Total de receitas`/`Total de despesas`/`Saldo do mês` com `Superávit`;
  linhas com os `TypeBadge` (`Avulsa`, `Fixa`, `Parcelada`, `Recorrente`); `Total`
- **`Déficit`** quando as despesas superam as receitas
- breakdown por categoria com `"XX% das despesas"`
- visão semestral com 6 meses (labels `monthShort` de `current-3` a `current+2`)
- **os totais da UI batem com `/revenues` e `/expenses`** (`seed.queryRevenues`/
  `seed.queryExpenses`) — cross-check contra a verdade do servidor

## `tests/dashboard/month-navigation.spec.ts`

- abre no mês vigente com badge `"Mês vigente"` e label `monthLong(current)`
- `"Mês anterior"` → badge `"Passado"` e surge `"← Mês atual"`
- `"Próximo mês"` → `"Projeção"` e os KPIs viram
  `"Receitas projetadas"`/`"Despesas projetadas"`
- `"← Mês atual"` volta ao vigente
- receita fixa em aberto aparece também na projeção do mês seguinte
- despesa avulsa do mês vigente **não** aparece no mês seguinte
- clicar numa coluna do gráfico semestral navega para o mês

## `tests/receitas/avulsas.spec.ts`

- vazio: `"Nenhuma receita avulsa cadastrada."`
- cria (`"Nova receita avulsa"` → placeholder `"Ex: Freelance, bônus..."`, `"0,00"`,
  competência → `"Adicionar receita"`) → linha com `monthShort` e `brl`
- edita (`aria-label="Editar"` → `"Salvar alterações"`)
- exclui → `"Tem certeza que deseja excluir a receita \"X\"?"`
- **bloqueia competência passada** → `"Não é permitido criar receitas em
competências passadas."` (selecione `current.year - 1` no select de ano —
  `selectableYears()` oferece `ano-1 … ano+3`, então é alcançável)
- valor não numérico → `"Valor inválido. Use número positivo."`
- **ordena por competência decrescente** (semeie em `current`, `next`, `in2`)

## `tests/receitas/fixas.spec.ts`

- vazio com CTA `"+ Criar primeira receita fixa"`
- cria alterável → card com `brl(v)`, `"/mês"`, badges `Fixa` + `Alterável`,
  `"Vigência: <Set/26> → em aberto"`, `"1 versão"`
- **cria inalterável e `"Nova versão"` NÃO aparece** (badge `Inalterável`)
- cria com término (checkbox `"Definir data de término"`) →
  `"Vigência: <Set/26> → <Dez/26>"`
- início passado → `"Início não pode ser em competência passada."`
- término < início → `"Término não pode ser anterior ao início."`
- exclui → `"Tem certeza que deseja excluir permanentemente esta receita fixa?"`

## `tests/receitas/fixas-versionamento.spec.ts`

- adiciona versão vigente a partir do mês seguinte → `"2 versões"`; **o valor
  exibido continua o da versão vigente hoje**
- `"Ver histórico"` lista em ordem decrescente (`"A partir de <Out/26>"` acima de
  `"A partir de <Set/26>"`), valores com `"/mês"`; fecha por `aria-label="Fechar"`
- vigência passada → `"A vigência não pode começar em mês passado."`
- **duas versões no mesmo mês** → toast `"Já existe uma versão vigente a partir
deste mês."` (`VERSION_CONFLICT`)
- encerra (`"Encerrar"` → `"Encerrar receita"`) → `"Vigência: <Set/26> → <Set/26>"`
- **⏱** receita encerrada no mês passado aparece como `"Encerrada"` e **somem**
  `"Nova versão"` e `"Encerrar"` (clock `+1`)
- o dashboard do mês seguinte reflete a nova versão

## `tests/despesas/categorias.spec.ts`

- vazio com CTA `"+ Criar primeira categoria"`
- cria → card com inicial maiúscula e `"0 despesas vinculadas"`
- nome duplicado → toast `"Já existe uma categoria com este nome."`
- edita (`aria-label="Editar categoria"` → `"Salvar"`)
- exclui sem vínculos → `"Tem certeza que deseja excluir a categoria \"X\"?"`
- **bloqueia exclusão com despesas vinculadas**: contador `"1 despesa vinculada"`;
  `"Excluir categoria"` abre o modal `"Não é possível excluir"` com o botão
  `"Entendido"`; **a categoria continua na lista**
- **a proteção também existe no servidor**: `seed.deleteCategoryRaw(id)` → `409`
  com `error: "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES"`
- o contador de vínculos sobe ao criar despesa na categoria

## `tests/despesas/avulsas.spec.ts`

- vazio: `"Nenhuma despesa avulsa cadastrada."`
- cria vinculada a categoria (coluna `Categoria` na tabela)
- exige categoria → `"Selecione uma categoria."`
- edita / exclui (`"Excluir a despesa \"X\"?"`)
- competência passada → `"Não é permitido criar despesas em competências passadas."`

## `tests/despesas/parceladas.spec.ts`

- vazio com CTA `"+ Criar parcelamento"`
- **preview antes de salvar**: `"Cada parcela: R$ 100,00"` para 300,00 em 3x
- cria → card: `"3× · <Set/26> → <Nov/26>"`, `"0/3 pagas"`, `"<brl>/parcela"`,
  `"<brl> total"`, badge `Parcelada` + categoria
- abre o modal: título `"Parcelas — <descrição>"`, 3 linhas `1/3`,`2/3`,`3/3` com
  o `monthShort` de cada competência; a do mês vigente traz `"Atual"`
- **⏱** após um mês, a primeira parcela mostra `"Pago"` e o card `"1/3 pagas"`
  (clock `+1`)
- número de parcelas → `"Entre 1 e 72 parcelas."` (teste 0 e 73)
- primeira parcela no passado → `"A primeira parcela não pode cair em competência
passada."`
- exclui → `"Excluir todo o parcelamento? Todas as parcelas serão removidas."`
- **os valores das parcelas somam o total** — assere contra
  `seed.createInstallmentExpense(...).installments`, nunca contra literais

## `tests/despesas/recorrentes.spec.ts`

- vazio com CTA `"+ Criar recorrente"`
- cria → badge `Recorrente`, categoria, `"Vigência: <Set/26> → em aberto"`, `"1 versão"`
- adiciona versão trocando valor **e categoria** → `"2 versões"`; modal
  `"Histórico de versões"` com as duas, `"A partir de <mês>"`, `"<brl>/mês"`
- exige categoria (`"Selecione uma categoria."`) e bloqueia vigência passada
  (`"A vigência não pode começar em mês passado."`)
- encerra → vigência fechada
- **⏱** recorrente encerrada aparece como `"Encerrada"` (clock `+1`)
- término < início → `"Término não pode ser anterior ao início."`
- exclui → `"Excluir a despesa recorrente?"`

## `tests/historico/historico.spec.ts`

- usuário sem versões → `"Nenhum histórico de versões encontrado."`
- agrupa por mês de vigência em ordem decrescente (`cenarioHistoricoMisto`):
  `monthShort(next)` acima de `monthShort(current)`
- mostra tipo, modalidade e categoria: `"Receita Fixa"` + badge `Alterável`;
  `"Despesa Recorrente"` + nome da categoria
- **sinal correto**: `+R$ …` para receita, `-R$ …` para despesa, sufixo `"/mês"`
- filtro `"Receitas Fixas"` esconde as recorrentes
- filtro `"Despesas Recorrentes"` esconde as fixas
- filtro `"Todos"` restaura
- filtro sem resultado → estado vazio (usuário só com fixas, filtra recorrentes)
- **fluxo cruzado**: cria uma versão pela UI em `/receitas` → aparece em `/historico`

## `tests/responsive/mobile.mobile.spec.ts` — projeto `mobile-chromium`

- em ≤768px a sidebar fixa não aparece e o `BottomNav` sim (5 itens)
- a barra superior abre a sidebar em overlay (`aria-label="Abrir menu"`); clicar
  no overlay fecha
- navega por todas as rotas pelo `BottomNav`
- **o conteúdo não estoura horizontalmente**:
  `document.documentElement.scrollWidth <= clientWidth + 1` em cada rota
- é possível criar uma categoria pelo celular (modal utilizável)
- a tabela de receitas rola horizontalmente sem quebrar o layout

---

## Builders de cenário a criar (`src/fixtures/scenarios.ts`)

Funções puras sobre o `SeedClient`, retornando os ids/nomes criados:

| Builder                                           | Conteúdo                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `cenarioDashboardCompleto(seed, k)`               | 2 categorias, 1 receita avulsa, 1 fixa, 1 despesa avulsa, 1 parcelamento 3x, 1 recorrente — tudo em `k.current` |
| `cenarioReceitaFixaVersionada(seed, k)`           | fixa ALTERABLE em `current` + versão em `next`                                                                  |
| `cenarioRecorrenteVersionada(seed, k)`            | recorrente em `current` + versão em `next` (com troca de categoria)                                             |
| `cenarioHistoricoMisto(seed, k)`                  | os dois acima, para a timeline agrupar em 2 meses                                                               |
| `cenarioCategoriaComVinculo(seed, k)`             | categoria + despesa avulsa apontando para ela                                                                   |
| `cenarioParcelamento(seed, k, {parcelas, total})` | parcelamento configurável                                                                                       |

## CI (parte deste PR)

`.github/workflows/e2e.yml` (o repo ainda não tem `.github/`):
`actions/checkout` → `setup-node@v4` (node 22, cache npm com os **4** lockfiles) →
`npm run install:all` → cache de `~/.cache/ms-playwright` →
`npx playwright install --with-deps chromium chromium-headless-shell` (working-directory `e2e`) →
`npm run test:e2e` com `CI: "true"` → upload de `e2e/playwright-report/` e
`e2e/test-results/`.

⚠️ **Não** rode `prisma:generate`/`prisma:prepare` no CI: o postinstall do
`@prisma/client` já gera a partir do schema versionado (que está em `sqlite`), e
`prisma:prepare` sem `DATABASE_PROVIDER` viraria o schema para postgres. O
`run-e2e.mjs` detecta e falha com instrução, mas o certo é não chamar.
