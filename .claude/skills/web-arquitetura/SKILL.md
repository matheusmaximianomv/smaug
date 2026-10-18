---
name: web-arquitetura
description: Arquitetura do frontend Smaug (web/) — camadas UI → hooks → services → infra, estrutura por feature, política de import e alias, Server vs Client Component, e as anatomias de página do App Router (CRUD simples e tela de feature com assistente e Ficha). Leia antes de criar qualquer arquivo em web/.
---

# Arquitetura do web

## Quando usar esta skill

Ao criar uma página, uma feature nova, ou sempre que a dúvida for "onde este arquivo vai" /
"posso importar isso daqui".

## Camadas (normativo — constituição, seção Frontend)

```
UI (components)
      ↓
Hooks
      ↓
Services / API Layer
      ↓
Infra / External
```

Sentido único. **A UI depende de hooks, não de services nem de infra.** Componentes não chamam
`apiClient`. Regra de negócio não vive dentro de JSX.

```
web/
  app/        App Router: (auth)/{login,cadastro}, (app)/{dashboard,receitas,despesas,categorias,historico}
  features/   auth · dashboard · receitas · despesas · categorias · historico
              cada uma com components/ hooks/ services/ types/
  shared/     components (primitivos) · hooks · lib · types
  infra/      api-client · api-error · session · navigation · router-adapter · query-client
  proxy.ts    (guarda de rotas; o antigo middleware da Next 15)
  tests/      harness do Vitest + testes de integração de página
```

## Imports

Aliases (declarados **em dois lugares**: `web/tsconfig.json` e `web/vitest.config.ts` — alias novo
exige editar os dois): `@/*` → `web/`, mais `@/features/*`, `@/shared/*`, `@/infra/*`.

**Regra real, observada no código:**

- **Relativo** quando fica dentro da mesma feature ou da mesma pasta de topo:
  `../services/DespesasService`, `../types`, `../lib/utils`, `./Modal`, `./session`.
- **Alias** ao cruzar fronteira de topo — mesmo de dentro de uma feature:
  `@/shared/hooks/useToast`, `@/infra/api-error`.
- **`app/` sempre alias**, nunca relativo.
- Testes são a exceção: alcançam o harness por caminho relativo longo
  (`../../../tests/render`).

Ordem dentro do arquivo (consistente, não imposta por lint):
react/next → terceiros → módulos com alias → módulos relativos → `import type` por último.

**Não existem barris de re-export.** Os únicos `index.ts` são `features/<f>/types/index.ts` e
`shared/types/index.ts`, e eles _contêm_ as declarações. Importe sempre o arquivo concreto:

```tsx
import { Button } from "@/shared/components/Button";
import { useExpenseMonth } from "@/features/despesas/hooks/useExpenseMonth";
```

## Cross-feature

Compartilhamento acontece por `@/shared` ou `@/infra`. Na prática o código admite **uma exceção**:

- ✅ **Tipos** de outra feature, quando o domínio realmente se relaciona:
  `features/despesas/types` importa `Category` de `@/features/categorias/types`;
  `HistoricoService` agrega tipos de `receitas` e `despesas` — é um agregador por desenho.
- ❌ **Componente, hook ou service** de outra feature. Quando uma segunda feature precisa dele,
  **promova para `shared/`** — foi o que aconteceu com `MonthYearSelect` (`shared/components/`), com
  a navegação de competência (`shared/hooks/useCompetenceNavigation.ts`) e com os blocos de extrato,
  assistente e Ficha usados por Receitas e Despesas (`shared/components/lancamentos/`).
- ❌ Hook de outra feature, nem para dado auxiliar: `DespesasScreen` precisa das categorias, mas
  quem chama `useCategories()` é a **página** `app/(app)/despesas/page.tsx`, que passa
  `categories` por prop.
- ❌ `shared/` importando de `features/`. Ainda há dívida: `AppShell` e `Sidebar` importam `useAuth`
  de `@/features/auth`. Não acrescente outros casos.

## Server vs Client Component

Regra: **manter a fronteira RSC o mais baixa possível.** `"use client"` vai no componente que de
fato usa hook/estado/efeito/API de browser — sempre na **primeira linha**, seguida de linha em branco.

| Arquivo                                                                    | Diretiva         |
| -------------------------------------------------------------------------- | ---------------- |
| `app/layout.tsx` (shell + `metadata`)                                      | RSC              |
| `app/page.tsx` (só `redirect("/login")`)                                   | RSC              |
| `app/(app)/layout.tsx` (delega para `AppShell`)                            | RSC              |
| `app/(auth)/layout.tsx`, `login/page.tsx`, `cadastro/page.tsx`             | RSC              |
| todas as `app/(app)/*/page.tsx`                                            | `"use client"`   |
| hooks de feature, `providers.tsx`, primitivos com estado                   | `"use client"`   |
| componentes de apresentação puros (`KpiCard`, `EntryRow`, `ConfirmDialog`) | **sem diretiva** |

`metadata` só existe em `app/layout.tsx`. Os providers globais (`QueryClientProvider`,
`ToastContainer`, devtools) vivem em `app/providers.tsx`, que consome o **singleton**
`queryClient` de `@/infra/query-client` — não crie `useState(() => new QueryClient())`.

**Não existem `loading.tsx`, `error.tsx`, `not-found.tsx` nem `route.ts` no projeto** — e isso é
deliberado:

- Loading é early-return dentro da própria página client (`if (isLoading) return <Skeleton ... />`)
  ou dentro do container de feature (`LedgerLayout` mostra o esqueleto enquanto `ledger` é `undefined`).
- Erro de mutação vira **toast** (disparado pelo hook); erro de formulário vira bloco inline
  `<div className="rounded-lg border border-red bg-red-light p-3 text-sm text-red">`.
- `shared/components/ErrorBoundary.tsx` existe e é testado, mas **não está montado** em nenhum lugar.

## `proxy.ts`

Gate de rota server-side (na Next 16 o antigo `middleware` virou `proxy`; a função exportada é `proxy`), lendo o **mesmo cookie `userId`** que `infra/session.ts` escreve:

```ts
const PUBLIC_ROUTES = ["/login", "/cadastro"];
// !isPublic && !userId  → redirect /login
// isPublic  && userId   → redirect /dashboard
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] };
```

## Anatomia de página — dois formatos

### (a) Página CRUD simples — `app/(app)/categorias/page.tsx`

A página é o container: chama o hook, guarda o estado dos modais e dispara as mutations.

```tsx
"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { useCategories } from "@/features/categorias/hooks/useCategories";
// componentes de feature → primitivos de shared → import type

export default function CategoriasPage() {
  const { data: categories, isLoading, create, update, remove } = useCategories();
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [selected, setSelected] = useState<CategoryWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

  const handleSave = (data: { name: string }) => {
    if (modal === "add") {
      create.mutate(data.name, { onSuccess: () => setModal(null) });
    } else if (modal === "edit" && selected) {
      update.mutate({ id: selected.id, name: data.name }, { onSuccess: () => setModal(null) });
    }
  };
  // ...
}
```

Regras:

1. **Um `useState` por modal, seleção e alvo de exclusão** (`selected`, `deleteTarget`).
2. **A mutação é disparada pela página**, fechando o modal num `onSuccess` local.
3. Renderização em três ramos: `isLoading ? <Skeleton/> : !data?.length ? <EmptyState/> : <lista>`.
4. Os modais ficam ao final, sempre montados, controlados por `isOpen`; o `ConfirmDialog` por
   `isOpen={!!deleteTarget}` com um `if (deleteTarget)` defensivo no `onConfirm` — é esse idioma
   que justifica o threshold relaxado de `app/**` no `vitest.config.ts`.
5. Container raiz: `className="p-4 sm:p-7 max-w-[1100px]"`.
6. O componente da página é `export default function <Rota>Page()`.

### (b) Tela de feature — Receitas e Despesas

Quando a tela tem navegação, assistente e Fichas, a página só monta a tela da feature
(`app/(app)/receitas/page.tsx` é `return <ReceitasScreen />;`). Despesas passa as categorias:

```tsx
export default function DespesasPage() {
  const categories = useCategories();
  return <DespesasScreen categories={categories.data ?? []} />;
}
```

`features/despesas/components/DespesasScreen.tsx` é o container:

```tsx
type ModalState =
  | null
  | { t: "new" }
  | { t: "edit"; item: OneTimeExpenseMonthItem }
  | { t: "item"; item: ExpenseMonthItem; status: CompetenceStatus };

export function DespesasScreen({ categories }: DespesasScreenProps) {
  const [modal, setModal] = useState<ModalState>(null);
  const nav = useLedgerNavigation();
  const month = useExpenseMonth(nav.selected);
  const summary = useExpenseYearSummary(nav.selected.year);
  nav.adoptReference(month.data?.reference ?? summary.data?.reference);

  return (
    <LedgerLayout /* textos, navigation={nav}, ledger={month.ledger}, onNew, onOpen */>
      {(modal?.t === "new" || modal?.t === "edit") && <ExpenseWizard /* ... */ />}
      {modal?.t === "item" && <ExpenseFicha /* ... */ />}
    </LedgerLayout>
  );
}
```

Regras:

1. **Um único `ModalState`**, união discriminada por `t` com `null`; o que o modal precisa (item,
   situação da competência) vai **dentro** do estado, não em `useState`s paralelos.
2. Modais são **montados condicionalmente** (`modal?.t === "..." && <X />`): assistente e Ficha
   nascem com o estado inicial certo a cada abertura.
3. **Quem dispara a mutation é o hook do assistente ou da Ficha** (`useExpenseWizard`,
   `useExpenseMutations({ onSuccess })`), não a tela.
4. O "agora" vem do servidor (`reference` da consulta), adotado via `nav.adoptReference(...)` durante
   o render — nunca `new Date()` na tela.
5. Layout, faixa de meses, resumo, lista, estado vazio e erro vêm de `LedgerLayout`
   (`shared/components/lancamentos/`); a tela de feature só fornece textos, dados e modais.

## Checklist — criar uma feature nova

- [ ] `features/<nome-pt-br>/{components,hooks,services,types}`.
- [ ] `types/index.ts` com as interfaces de domínio; `types/schemas.ts` só se houver formulário RHF.
- [ ] `services/<Feature>Service.ts` (skill `web-feature-services`).
- [ ] `hooks/use<Coisa>.ts` (skill `web-feature-hooks`).
- [ ] Componentes (skill `web-componentes`): apresentacionais, e containers só no formato (b).
- [ ] Página em `app/(app)/<rota>/page.tsx` com `"use client"`.
- [ ] Rota acrescentada à navegação (`shared/components/Sidebar.tsx` / `BottomNav.tsx`).
- [ ] Teste ao lado de cada fonte + integração de página em `web/tests/integration/` (skill `web-testes`).

## Não faça

- Não chame `apiClient` de dentro de um componente.
- Não importe `useRouter`/`useSearchParams` de `next/navigation` em hook de negócio — use
  `@/infra/router-adapter`.
- Não crie barril `index.ts` de re-export.
- Não importe componente/hook/service de outra feature.
- Não crie `loading.tsx`/`error.tsx` — siga o padrão de early-return + toast.
- Não instancie um `QueryClient` novo em `providers.tsx`.
