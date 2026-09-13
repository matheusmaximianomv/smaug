# PR2 — Inventário da suíte Vitest

Harness e configuração já existem (PR1). Este documento é o escopo caso a caso.
Leia [`README.md`](./README.md) antes: as armadilhas listadas lá não se repetem aqui.

## Regras

- Colocação: testes unitários e de componente ficam **ao lado do fonte**
  (`shared/lib/competence.test.ts`). Só testes de página vão em
  `web/tests/integration/` — eles importam de mais de uma feature, o que dentro
  de uma feature violaria a proibição de import cross-feature.
- Nomes de teste em **pt-BR**, assertando a cópia real da UI.
- `thresholds` de cobertura entram **por fase** no `vitest.config.ts` (catraca),
  para que `test:coverage` fique verde em todo commit.
- Cada fase termina com `npm run --prefix web test` verde.

---

## Fase 1 — `shared/lib/` (5 arquivos) → depois: 100% em `shared/lib/**`

### `shared/lib/competence.test.ts`

`compareCompetences`: negativo/zero/positivo; desempate por ano antes de mês.
`addMonths`: +1, −1, 0, +12, **rollover Dez→Jan** (`{2026,12}+1 → {2027,1}`),
**rollover Jan→Dez** (`{2026,1}−1 → {2025,12}`), salto de 15 meses.
`getCurrentCompetence` com `vi.setSystemTime`.
`getCompetenceStatus`: `current`/`past`/`future` **passando `reference` explícito**
(dispensa fake timers) e o default derivado de hoje.
`isEligible`: mês atual → `true`; futuro → `true`; passado → `false`.
`isBeforeOrEqual`: <, =, >. `selectableYears`: 5 anos a partir de `reference.year − 1`.

### `shared/lib/dateUtils.test.ts`

`formatMonthYear(2026, 9)` → `"Set/26"`; mês 1 → `"Jan/26"`; mês 12 → `"Dez/26"`;
ano 2000 → sufixo `"/00"`; `MONTH_NAMES_FULL` tem 12 entradas e começa em `"Janeiro"`.

### `shared/lib/formatCurrency.test.ts`

Positivo, zero, **negativo** (`-R$ 50,00` — o sinal vem **antes** de `R$`),
milhares com `.`, decimais com `,`, arredondamento de 3 casas.

### `shared/lib/type-guards.test.ts`

`isString`; `isNumber` (incl. `NaN` → `false`); `isObject` (`null` → `false`,
array → `false`); `hasProperty`; `isApiError` em todas as combinações de
`message`/`statusCode`.

### `shared/lib/utils.test.ts`

`cn`: junta classes; resolve conflito Tailwind (`px-2 px-4` → `px-4`); ignora
`false`/`undefined`/`null`; aceita array e objeto condicional.

---

## Fase 2 — `infra/` + `middleware.ts` (9 arquivos) → 100% em `infra/**` e `middleware.ts`

### `infra/api-error.test.ts`

`isInvalidSessionError`: 401 → `true`; 404 → `true`; 400/409/500 → `false`;
sem `response` → `false`; `null`/`undefined`/string → `false`.
`getApiErrorMessage`:

- `VALIDATION_ERROR` **com** `details` → primeiro detalhe (achatando múltiplos campos);
- `VALIDATION_ERROR` **sem** `details` → mensagem mapeada;
- `details` presente mas vazio → cai na mensagem mapeada;
- **tabela `it.each(Object.entries(MESSAGES))`** cobrindo os ~30 códigos;
- código desconhecido → `fallback`;
- `code: "ECONNABORTED"` → `"A requisição demorou demais. Verifique sua conexão e tente novamente."`;
- `response === undefined` **e** `request` presente → `"Não foi possível falar com o servidor. Verifique sua conexão."`;
- erro nu → `fallback`;
- **precedência**: `ECONNABORTED` _com_ `response.data.error` → o código mapeado vence.

### `infra/session.test.ts`

Sem cookie → `null`; após `setUserId` → o id; valor vazio (`userId=`) → `null`;
valor URL-encoded volta decodificado; **cookie no meio de outros**
(`a=1; userId=x; b=2`); `setUserId` grava `path=/`, `max-age=31536000`,
`SameSite=Lax`; `clearUserId` remove; `clearUserId` sem sessão é no-op.

### `infra/session.node.test.ts` — docblock `@vitest-environment node`

`getUserId()` → `null`; `setUserId`/`clearUserId` não lançam. Cobre os três
guards `typeof document === "undefined"`, inalcançáveis em jsdom.

### `infra/navigation.test.ts`

`redirectToLogin()` fora de `/login` atribui `/login`; **já em `/login` não navega**;
em ambiente `node` (segundo arquivo, `navigation.node.test.ts`) é no-op.
Use `@vitest-environment-options { "url": "http://localhost:3001/login" }` no
arquivo que testa o caso "já está no login".

### `infra/api-client.test.ts`

Injeta `X-User-Id` com cookie; **omite** sem cookie; `baseURL` respeita
`NEXT_PUBLIC_API_URL`; `Content-Type: application/json`; **401 → `clearUserId` +
`redirectToLogin` chamado** (`vi.mock("@/infra/navigation")`); **404 preserva** a
sessão (só 401 desloga); **500 preserva**; **erro de rede preserva**
(`mockNetworkError`); o erro é sempre re-rejeitado para quem chamou.

### `infra/query-client.test.ts`

O singleton expõe `staleTime` 30 s, `gcTime` 5 min, `retry` 3,
`refetchOnWindowFocus: false`, `mutations.retry` 1; `retryDelay(0)` → 1000,
`(1)` → 2000, `(5)` → 30000 (teto).

### `infra/router-adapter.test.tsx`

`useRouter()` devolve `{push, replace, back}` delegando ao router do contexto;
`useSearchParams().get` devolve o valor e `null` quando ausente; `getAll` devolve
`[]` quando ausente; **ambos os ramos `?? null` / `?? []` com contexto `null`**.

### `middleware.test.ts` — docblock `@vitest-environment node`

Construa `new NextRequest("http://localhost:3001/...", { headers: { cookie } })`.
Rota privada **sem** cookie → **307** para `/login`; rota privada **com** cookie →
`next()` (200 + header `x-middleware-next: "1"`); `/login` sem cookie → `next()`;
`/login` com cookie → 307 `/dashboard`; `/cadastro` com cookie → 307 `/dashboard`;
**`/login/algo` é pública** (ramo `startsWith(\`${route}/\`)`); **`/loginfake`NÃO
é pública → redireciona**; raiz`/`sem cookie → 307`/login`; `config.matcher`exclui`\_next/static`, `\_next/image`, `favicon.ico`, `api`.

---

## Fase 3 — `shared/hooks/` (3 arquivos) → 100% em `shared/hooks/**`

### `useDebounce.test.ts` (fake timers)

Devolve o valor inicial imediatamente; não atualiza antes do delay; atualiza
após; **mudanças rápidas sucessivas só emitem a última** (o `clearTimeout` do
cleanup); respeita `delay` custom; usa 500 ms por padrão; desmontar limpa o timer.

### `useMediaQuery.test.ts`

`false` no primeiro render; passa a `true` com `setMatchMedia(true)`; registra e
**remove** o listener no unmount; `useIsMobile` consulta exatamente
`"(max-width: 768px)"`; reage a mudança de `query`.

### `useToast.test.ts` (fake timers + `vi.spyOn(Math, "random")`)

`toast.show` enfileira e notifica; `success`/`error`/`info`/`warning` definem o
`type` e repassam `action`/`duration`; remove após 5000 ms por padrão; respeita
`duration` custom; **múltiplos toasts expiram independentemente**;
`useToastState` inicia com a fila corrente; `subscribe()` registra o listener e o
**cleanup o remove**; após unsubscribe o listener não é mais chamado; ids únicos.

---

## Fase 4 — feature **services** (6 arquivos, MSW) → 100% em `features/*/services/**`

Testam axios + interceptors reais contra o MSW. A asserção mais valiosa é
**verbo + path** — `PUT` vs `PATCH` é fácil de errar.

- **`AuthService`** — `register` → `POST /users`; `getUserById` → `GET /users/:id`;
  propaga 404 e 409 `EMAIL_ALREADY_EXISTS`.
- **`CategoriasService`** — `getAll`/`create`/`update` (`PUT`)/`delete`; propagação
  de erro em cada um.
- **`ReceitasService`** — os 4 de one-time; `getFixed`/`createFixed` (com e **sem**
  `endYear`/`endMonth`); **`addVersion` faz `PATCH /revenues/fixed/:id` e devolve a
  _versão_, não a receita**; `terminate` → `PATCH /:id/terminate`; `deleteFixed`.
- **`DespesasService`** — os 3 de one-time; `getInstallments`/`createInstallment`/
  `deleteInstallment`; `getRecurring`/`createRecurring`/`addRecurringVersion`
  (`PATCH`)/`terminateRecurring` (`PATCH /:id/terminate`)/`deleteRecurring`.
- **`DashboardService`** — ver abaixo.
- **`HistoricoService`** — ver abaixo.

### `DashboardService.test.ts` — o maior ganho da suíte

Com `vi.setSystemTime(new Date("2026-09-13T00:00:00Z"))` (TZ já é UTC):

- **Mês selecionado DENTRO da janela** (`2026-09`): **6** `fetchMonth` = **12
  requisições**, competências `2026-06 … 2026-11` (offsets `[-3,-2,-1,0,1,2]`).
- **Mês selecionado FORA da janela** (`2026-01`): **7** `fetchMonth` = **14
  requisições**; o mês extra é o **último** do array (`selectedIdx === 6`) e os
  KPIs vêm dele, não de um mês do gráfico.
- **Rollover de ano**: com hoje = `2026-01-15`, o gráfico é
  `2025-10, 2025-11, 2025-12, 2026-01, 2026-02, 2026-03`.
- **Params**: cada chamada envia `{competenceYear, competenceMonth}`.
- **`recentRevenues`**: one-time mapeadas de `{id, description, amount}` com
  `type: "ONE_TIME"`; **fixas lidas de `currentVersion.description`/`.amount`**
  com `type: "FIXED"`; one-time vêm antes das fixas.
- **`breakdown`**: agrupa por `category.id`; **soma** despesas da mesma categoria;
  `percentage = amount / totalExpenses * 100`; **`totalExpenses === 0` →
  `percentage === 0`** (sem `NaN`); despesa **sem categoria** → chave
  `"sem-categoria"`, nome `"Sem categoria"`.
- **`kpis.balance`** = receitas − despesas (positivo, negativo e zero).
- **`status`** = `getCompetenceStatus(selecionado, hoje)`.
- **`chart.months`** preserva a ordem dos offsets e usa `results[i]` (índice do
  gráfico), **não** o do selecionado.
- `Promise.all` que rejeita propaga o erro.

### `HistoricoService.test.ts`

**NÃO exportar** `toEntries`/`groupByMonth` — todos os ramos são alcançáveis por
`getGroups()` com as fixtures certas. Casos: achata `versions` de fixas **e** de
recorrentes; **`versions` `undefined` → `?? []`, sem estourar** (use
`makeFixedRevenue()` sem `versions`); tagueia `type`; fixa carrega `modality` e
**não** `categoryName`; recorrente carrega `categoryName` de `ver.category?.name`
e **`undefined` quando não há `category`**; `parentDescription` vem da **versão**;
agrupa por `${year}-${MM}` **com padding** (use um fixture com mês 9 para provar
que `2026-9` e `2026-09` não geram grupos distintos); ordena **DESC por ano, depois
mês**; várias entradas no mesmo mês ficam no mesmo grupo; entrada vazia → `[]`.

---

## Fase 5 — `shared/components/` (16 arquivos)

Ordem: folhas (`Skeleton`, `TypeBadge`, `Button`, `Input`, `Select`, `EmptyState`)
→ compostos (`DataTable`, `Modal`, `Tabs`, `Toast`, `ErrorBoundary`,
`MonthNavigator`, `ConfirmDialog`) → shell (`BottomNav`, `Sidebar`, `AppShell`).

- **`Button`** — children; `onClick`; `disabled`; **`isLoading` → `toBeDisabled()`**
  (o spinner é `<span>` sem role: **não** use `getByRole("status")`); `isLoading`
  não dispara `onClick`; cada `variant`/`size`; `className` mesclado; `forwardRef`;
  `type="submit"` submete o form pai.
- **`Input`** — agora **associa label** (`htmlFor`/`id` via `useId`), então
  `getByLabelText` **funciona**; exibe `error` com `aria-describedby` e
  `aria-invalid`; sem `label` não renderiza `<label>`; `forwardRef`; `id`
  explícito tem precedência sobre o gerado.
- **`Select`** — idem, mais: placeholder padrão `"Selecione..."`; `placeholder=""`
  omite a opção vazia; renderiza as `options`; `onChange` recebe o valor.
- **`Modal`** — fechado → nada; aberto → renderiza em **portal** (consultar por
  `screen`, nunca pelo `container`); com `title` → título + botão
  `aria-label="Fechar"`; clicar em Fechar chama `onClose`; **Escape** chama
  `onClose`; sem `title` → `Dialog.Title` sr-only `"Janela"` e sem botão Fechar;
  `footer`; cada `width` aplica `max-w-*`.
- **`ConfirmDialog`** — defaults `"Confirmar ação"`/`"Confirmar"`/`"Cancelar"`;
  labels custom; `onConfirm`/`onClose`; `isDanger` usa variante `danger`;
  **`isLoading` desabilita Cancelar e põe Confirmar em loading**.
- **`DataTable`** — vazio → `"Nenhum registro encontrado."`; `emptyMessage` custom;
  cabeçalhos e linhas; `render` custom por coluna; acesso por `key` sem `render`;
  `align`; coluna de ações só com `onEdit`/`onDelete`; `aria-label="Editar"`/
  `"Excluir"` disparam com a **linha** correta; só `onEdit` → sem Excluir.
- **`EmptyState`** — mensagem; `icon` opcional; `action` chama `onClick`; sem
  `action` não há botão.
- **`ErrorBoundary`** — sem erro → children; filho que lança → `"Algo deu errado."`;
  `fallback` custom; **`"Tentar novamente"` reseta**; silencie o `console.error`
  do React com `vi.spyOn(console, "error").mockImplementation(() => {})`.
- **`Skeleton`** — aplica `animate-pulse`; mescla `className`.
- **`Tabs`** — `role="tablist"`, um `role="tab"` por item; ativo com
  `aria-selected="true"`; clique chama `onValueChange`; **navegação por setas**;
  `count` renderiza badge; **`count: 0` renderiza** (`!= null`, não falsy);
  `count: undefined` não renderiza.
- **`Toast`** (fake timers) — fila vazia → `null`; mensagem e ícone por tipo;
  botão de `action`; múltiplos toasts; some após `duration`; unmount cancela a
  inscrição.
- **`TypeBadge`** — `it.each` sobre as 8 chaves (`ONE_TIME`/`avulsa` → `"Avulsa"`,
  `FIXED`/`fixa` → `"Fixa"`, `INSTALLMENT`/`parcelada` → `"Parcelada"`,
  `RECURRING`/`recorrente` → `"Recorrente"`); **tipo desconhecido → `null`**.
- **`MonthNavigator`** — label `"Setembro de 2026"`; badge por status
  (`"Mês vigente"`/`"Projeção"`/`"Passado"`); `aria-label="Mês anterior"` →
  `onChange(2026, 8)`; `"Próximo mês"` → `onChange(2026, 10)`; **rollover Dez →
  `onChange(2027, 1)`**; **rollover Jan → `onChange(2025, 12)`**; `"← Mês atual"`
  **aparece** só quando `status !== "current"` **e** há `onGoToCurrent`; **não**
  aparece em `current`; **não** aparece sem `onGoToCurrent`; clicá-lo chama
  `onGoToCurrent`.
- **`Sidebar`** — `getByRole("navigation", { name: "Navegação principal" })`; os 5
  links com `href` corretos; ativo casa por pathname exato **e** por prefixo
  (`/receitas/123`); iniciais (`"João Silva"` → `"JS"`, nome de uma palavra, sem
  usuário → `"?"`); `aria-label="Sair"` chama `logout`. Requer
  `RouterStubProvider` **e** `vi.mock("@/features/auth/hooks/useAuth")`.
- **`BottomNav`** — `getByRole("navigation", { name: "Navegação inferior" })`; os 5
  links; destaque do ativo por igualdade e por prefixo.
- **`AppShell`** — `setMatchMedia(false)` → `Sidebar`, sem barra superior e sem
  `BottomNav`; `setMatchMedia(true)` → `aria-label="Abrir menu"`, `BottomNav`, sem
  sidebar fixa; Abrir menu revela overlay + sidebar; clicar no overlay fecha;
  iniciais no avatar mobile; `children` sempre dentro do `<main>`.

---

## Fase 6 — feature **hooks** (11 arquivos) → 100/95/100/100 em `features/*/hooks/**`

Escreva **`useCategories.test.tsx` primeiro** como template canônico e replique.

### Template (`useCategories.test.tsx`)

`useQuery` usa key `["categories"]`, `queryFn` `CategoriasService.getAll`,
`staleTime` 30 000; loading → sucesso com dados;
**`create` sucesso → `invalidateQueries({queryKey:["categories"]})`** (espione
`queryClient.invalidateQueries`) **+ `toast.success("Categoria criada com sucesso!")`**;
**`create` erro → `toast.error(getApiErrorMessage(err, "Erro ao criar categoria."),
{action:{label:"Tentar novamente", onClick}})`** e **invocar `action.onClick`
re-dispara a mutation com as MESMAS `variables`**; idem `update`
(`"Categoria atualizada!"` / `"Erro ao atualizar categoria."`) e `remove`
(`"Categoria excluída!"` / `"Erro ao excluir categoria."`); o retorno espalha
`...query` e expõe `create`/`update`/`remove`.

### Os demais

| Hook                   | Key                          | Particularidades                                                                                                                                                                  |
| ---------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useOneTimeRevenues`   | `["revenues","one-time"]`    | `"Receita avulsa criada!/atualizada!/excluída!"`                                                                                                                                  |
| `useFixedRevenues`     | `["revenues","fixed"]`       | **4 mutations**: `create`, `addVersion` (`"Nova versão criada!"`), `terminate` (`"Receita fixa encerrada!"`), `remove`; `addVersion`/`terminate` desestruturam `{id, ...payload}` |
| `useOneTimeExpenses`   | `["expenses","one-time"]`    | `"Despesa avulsa criada!/atualizada!/excluída!"`                                                                                                                                  |
| `useInstallments`      | `["expenses","installment"]` | **só `create` e `remove`** (não há `update`)                                                                                                                                      |
| `useRecurringExpenses` | `["expenses","recurring"]`   | **4 mutations**                                                                                                                                                                   |
| `useRegister`          | —                            | chama `AuthService.register`; `isPending`; `data`/`error`; **não** dispara toast nem invalidação (exceção ao padrão)                                                              |
| `useDashboard`         | `["dashboard", year, month]` | ano e mês **fazem parte** da key; trocar competência gera **nova** entrada de cache                                                                                               |
| `useMonthNavigation`   | —                            | ver abaixo                                                                                                                                                                        |
| `useVersionHistory`    | `["version-history"]`        | ver abaixo                                                                                                                                                                        |
| `useAuth`              | —                            | ver abaixo                                                                                                                                                                        |

### `useMonthNavigation.test.ts` (`vi.setSystemTime`)

Inicia no mês corrente com `status: "current"` e `isCurrent: true`; `navigate(1)` →
próximo mês, `"future"`, `isCurrent: false`; `navigate(-1)` → `"past"`;
**`navigate` acumula a partir do `prev`, não do `current`** (dois `navigate(1)` →
+2 meses); `goToCurrent` volta; **rollover de ano nos dois sentidos**; `current`
permanece imutável durante a navegação.

### `useVersionHistory.test.tsx`

Filtro `"all"` devolve tudo; `"fixed-revenues"` mantém só `type === "fixed-revenue"`;
`"recurring-expenses"` idem; **grupos que ficam sem entradas após o filtro são
removidos**; `data` `undefined` → `groups: []`; expõe `isLoading`/`error`/`refetch`;
**trocar o filtro re-deriva sem refetch**.

### `useAuth.test.tsx` — 5 ramos, o hook mais valioso

`vi.mock("@/infra/router-adapter")`, `session.ts` real.

1. **Mount sem cookie** → `isLoading` vai a `false`, `isAuthenticated: false`,
   **`AuthService.getUserById` nunca é chamado**.
2. **Mount com cookie, sucesso** → `user`, `userId`, `isAuthenticated: true`,
   `error: null`, `isLoading: false`.
3. **Sessão inválida (401 e 404, dois casos)** → `clearUserId()` (cookie some),
   `isAuthenticated: false`, `user: null`, **`error` permanece `null`**.
4. **Erro transitório (500 e rede, dois casos)** → **`isAuthenticated` continua
   `true`**, `userId` preservado, `user: null`,
   `error === "Não foi possível carregar seu perfil. Tente novamente em instantes."`,
   **cookie NÃO é limpo**.
5. **`login(id)` sucesso** → chama `getUserById` **antes** de `setUserId`; grava o
   cookie; popula o estado; `router.push("/dashboard")`.
6. **`login(id)` falha** → **a promise rejeita para cima**; **`setUserId` NÃO é
   chamado**; cookie continua ausente; **sem `router.push`**.
7. **`logout()`** → limpa o cookie; zera o estado; `router.push("/login")`.
8. O efeito de mount roda **uma única vez** mesmo com re-renders.

---

## Fase 7 — feature **components** (21 arquivos)

Ordem: cards apresentacionais → formulários → os com lógica
(`InstallmentForm`, `MonthYearSelect`) → formulários de auth (clipboard + fake timers).

Destaques que não podem faltar:

- **`InstallmentForm`** — **tabela `it.each` de arredondamento** contra
  `Math.floor(Math.round(total*100)/count)/100`: `100/3` → `R$ 33,33`;
  `10/3` → `R$ 3,33`; `1200/12` → `R$ 100,00`; `"1234,56"/2` → `R$ 617,28`
  (⚠️ o código só faz `.replace(",", ".")`, então **ponto de milhar quebra o
  `parseFloat`** — não use `"1.234,56"`); `1/72` → `R$ 0,01`; `0,10/3` → `R$ 0,03`
  (truncamento, não arredondamento).
  **O preview não aparece** quando `total` vazio/não numérico, `count` vazio,
  `count === 0`, `count > 72`, `count < 1`.
  Validações: `"Descrição obrigatória."`, `"Valor total inválido."`,
  **`"Entre 1 e 72 parcelas."` nos limites 0, 1, 72 e 73**,
  `"Selecione uma categoria."`,
  `"A primeira parcela não pode cair em competência passada."`.
  `getNow()` usa `new Date()` direto → `vi.setSystemTime` define o default do
  `MonthYearSelect`.
- **`OneTimeExpenseForm`** — validações; **competência passada bloqueia na criação**
  (`"Não é permitido criar despesas em competências passadas."`); **com `initial`
  (edição) a checagem é PULADA** — mês passado é aceito; `onSave` recebe a
  descrição com `trim()`; botão `"Adicionar despesa"` vs `"Salvar"`.
- **`RecurringExpenseForm`** — `"Início não pode ser em competência passada."`;
  checkbox `"Definir data de término"` revela o segundo `MonthYearSelect`;
  término < início → `"Término não pode ser anterior ao início."`; término **igual**
  ao início é aceito; sem término → `endYear: null, endMonth: null`.
- **`FixedRevenueCard`** — **`"Nova versão"` só aparece com `modality === "ALTERABLE"`
  e não encerrada**; badge `"Alterável"`/`"Inalterável"`; use
  `getByTestId("fixed-revenue-card")` ou `getByRole("article")`.
- **`RecurringExpenseCard`** — **`isEnded` só quando `endMonth != null` E a
  competência final é estritamente passada** → badge `"Encerrada"` e somem
  `"Nova versão"`/`"Encerrar"`; `endMonth: null` → `"em aberto"`; `"1 versão"` vs
  `"2 versões"`.
- **`InstallmentCard`** — **contagem de pagas** é estritamente anterior a
  `currentYear`/`currentMonth` (o mês corrente **não** conta); `installments`
  vazio → `formatCurrency(0)`; `"{n}× · Set/26 → Ago/27"`; barra `paid/count`;
  ausência de `category` não quebra.
- **`CategoryCard`** — **pluralização**: `0` → `"0 despesas vinculadas"`,
  `1` → `"1 despesa vinculada"`, `2` → `"2 despesas vinculadas"`.
- **`MonthYearSelect`** — 12 meses; 5 anos de `selectableYears()` relativos a hoje;
  `onMonthChange`/`onYearChange` recebem **`Number`**, não string; `required`
  renderiza asterisco; os dois selects têm `aria-label` (`"… — mês"`/`"… — ano"`).
- **`RegisterForm`** — sucesso troca a tela (`"Cadastro realizado com sucesso!"` +
  id em campo `readOnly`); **botão de copiar chama `navigator.clipboard.writeText`
  e troca o ícone por 2 s** (fake timers + `userEvent.setup({ advanceTimers })`);
  `"Ir para Login"` chama `redirectToLogin`.
- **`LoginForm`** — UUID inválido → `"ID de usuário inválido"` e `login` não é
  chamado; 404 → `"Usuário não encontrado. Verifique o ID e tente novamente."`;
  500 → `getApiErrorMessage(..., "Não foi possível entrar. Tente novamente.")`.
- **`SemesterChart`** — **`maxVal` usa `Math.max(..., 1)`** → todos zerados não
  geram divisão por zero; valor > 0 tem altura mínima de 2 %; `isFuture` aplica
  hachurado.
- **`ExpenseBreakdown`** — vazio → `"Nenhuma despesa registrada neste mês."`;
  `percentage.toFixed(0)` → `"33% das despesas"`.
- **`VersionHistoryModal`** — `revenue === null` → `null`; **ordena DESC por ano e
  mês**; `"A partir de Set/26"`; `versions` `undefined` → lista vazia sem quebrar.

Os demais (`KpiCard`, `CategoryForm`, `DeleteWarningModal`, `FilterBar`,
`VersionCard`, `VersionTimeline`, `InstallmentModal`, `FixedRevenueForm`,
`FixedRevenueVersionForm`, `RecurringExpenseVersionForm`, `OneTimeRevenueForm`)
seguem o padrão: validações pt-BR, estados vazios, e callbacks.

---

## Fase 8 — integração de página (7 arquivos em `web/tests/integration/`)

→ depois: piso global 90/85/90/90

Hooks + services + axios reais contra o MSW, via `renderWithProviders`.
**Não repita os caminhos felizes do E2E** (ver README).

Ordem: `categorias` → `login`/`cadastro` → `historico` → `receitas` →
`dashboard` + `despesas` (os dois últimos por último: depurar 400 linhas contra
dependências não provadas é onde cronograma morre).

- **`categorias-page`** — skeleton; vazio → `"Nenhuma categoria cadastrada."` +
  `"+ Criar primeira categoria"`; **criação completa** (form → `POST` →
  invalidação → **a categoria aparece na grade** e o modal fecha); edição;
  **exclusão com 0 vinculadas → `ConfirmDialog`**; **exclusão com > 0 vinculadas →
  `DeleteWarningModal`, NÃO o `ConfirmDialog`** (a regra mais importante da
  página); 409 na criação → toast `"Já existe uma categoria com este nome."`
  (`withToasts: true`).
- **`receitas-page`** — aba `"Avulsas"` ativa por padrão com `count` nos badges;
  trocar aba muda conteúdo e rótulo do botão; **avulsas ordenadas DESC por
  competência**; vazios; **`"Nova versão"` numa `ALTERABLE`** vs **ausente numa
  `UNALTERABLE`**; encerrar; `"Ver histórico"` ordenado.
- **`despesas-page`** — as **3 abas** com counts; rótulo do botão por aba; os **3
  `ConfirmDialog`** com mensagens exatas (`"Excluir a despesa \"X\"?"`,
  `"Excluir todo o parcelamento? Todas as parcelas serão removidas."`,
  `"Excluir a despesa recorrente?"`); **os formulários recebem `catOptions` de
  `useCategories`** — esta página exercita 4 hooks e 2 features ao mesmo tempo.
- **`dashboard-page`** (`vi.setSystemTime`) — os 3 KPIs e a **troca para
  `"Receitas projetadas"`/`"Despesas projetadas"` quando `status === "future"`**;
  sublabel pluralizado; `"Superávit"` vs `"Déficit"`; gráfico de 6 meses e o
  **merge** com `data.chart.months`; clique no gráfico navega; `MonthNavigator`
  **dispara novo fetch com a nova query key**; tabelas vazias; linha de **Total**
  bate com o KPI; `data` `undefined` → todos os `??` sem quebrar.
- **`historico-page`** — timeline agrupada DESC; filtros; **um filtro que esvazia
  um grupo remove o cabeçalho**; **trocar o filtro NÃO dispara novo request**
  (asserção sobre a contagem de requisições MSW).
- **`login-page`** / **`cadastro-page`** — login ponta a ponta (cookie gravado +
  `router.push`); 404 → mensagem e **cookie NÃO gravado**; cadastro → 409 →
  `"Já existe uma conta com este e-mail."`.
