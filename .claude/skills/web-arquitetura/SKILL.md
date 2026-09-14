---
name: web-arquitetura
description: Arquitetura do frontend Smaug (web/) — camadas UI → hooks → services → infra, estrutura por feature, política de import e alias, Server vs Client Component, e a anatomia de uma página CRUD do App Router. Leia antes de criar qualquer arquivo em web/.
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
  middleware.ts
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
import { useInstallments } from "@/features/despesas/hooks/useInstallments";
```

## Cross-feature

Compartilhamento acontece por `@/shared` ou `@/infra`. Na prática o código admite **uma exceção**:

- ✅ **Tipos** de outra feature, quando o domínio realmente se relaciona:
  `features/despesas/types` importa `Category` de `@/features/categorias/types`;
  `HistoricoService` agrega tipos de `receitas` e `despesas` — é um agregador por desenho.
- ❌ **Componente, hook ou service** de outra feature. `features/despesas/components/*` importando
  `MonthYearSelect` de `@/features/receitas/components` é **dívida conhecida** — se você precisar
  dele numa terceira feature, **promova para `shared/components/`** em vez de repetir o import.
- ❌ `shared/` importando de `features/`. `shared/components/MonthNavigator.tsx` importa
  `MonthStatus` de `@/features/dashboard/types`, e isso também é dívida.

## Server vs Client Component

Regra: **manter a fronteira RSC o mais baixa possível.** `"use client"` vai no componente que de
fato usa hook/estado/efeito/API de browser — sempre na **primeira linha**, seguida de linha em branco.

| Arquivo                                                                           | Diretiva         |
| --------------------------------------------------------------------------------- | ---------------- |
| `app/layout.tsx` (shell + `metadata`)                                             | RSC              |
| `app/page.tsx` (só `redirect("/login")`)                                          | RSC              |
| `app/(app)/layout.tsx` (delega para `AppShell`)                                   | RSC              |
| `app/(auth)/layout.tsx`, `login/page.tsx`, `cadastro/page.tsx`                    | RSC              |
| todas as `app/(app)/*/page.tsx`                                                   | `"use client"`   |
| hooks de feature, `providers.tsx`, primitivos com estado                          | `"use client"`   |
| componentes de apresentação puros (`InstallmentCard`, `KpiCard`, `ConfirmDialog`) | **sem diretiva** |

`metadata` só existe em `app/layout.tsx`. Os providers globais (`QueryClientProvider`,
`ToastContainer`, devtools) vivem em `app/providers.tsx`, que consome o **singleton**
`queryClient` de `@/infra/query-client` — não crie `useState(() => new QueryClient())`.

**Não existem `loading.tsx`, `error.tsx`, `not-found.tsx` nem `route.ts` no projeto** — e isso é
deliberado:

- Loading é early-return dentro da própria página client: `if (isLoading) return <Skeleton ... />`.
- Erro de mutação vira **toast** (disparado pelo hook); erro de formulário vira bloco inline
  `<div className="rounded-lg border border-red bg-red-light p-3 text-sm text-red">`.
- `shared/components/ErrorBoundary.tsx` existe e é testado, mas **não está montado** em nenhum lugar.

## `middleware.ts`

Gate de rota server-side, lendo o **mesmo cookie `userId`** que `infra/session.ts` escreve:

```ts
const PUBLIC_ROUTES = ["/login", "/cadastro"];
// !isPublic && !userId  → redirect /login
// isPublic  && userId   → redirect /dashboard
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"] };
```

## Anatomia de uma página CRUD

Gabarito: `app/(app)/despesas/page.tsx` (as páginas de `receitas` e `categorias` o espelham).

```tsx
"use client";

import { useState } from "react";
import { Plus, TrendingDown } from "lucide-react";
// hooks de feature → componentes de feature → primitivos de shared → libs → import type

type Tab = "avulsas" | "parceladas" | "recorrentes";
type ModalType = null | "add-avulsa" | "edit-avulsa" | "view-parcelas" | "add-recorrente";

function getNow() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function DespesasPage() {
  const now = getNow();
  const [tab, setTab] = useState<Tab>("avulsas");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAvulsa, setSelectedAvulsa] = useState<OneTimeExpense | null>(null);
  const [deleteAvulsa, setDeleteAvulsa] = useState<OneTimeExpense | null>(null);

  const avulsas = useOneTimeExpenses();
  // ...
}
```

Regras da página:

1. **Uniões locais `type Tab` / `type ModalType` declaradas acima do componente**; `ModalType`
   inclui `null` como primeiro membro.
2. **Um `useState` por modal, seleção e alvo de exclusão**, nomeados `selectedX` / `deleteX`.
3. **O hook é guardado num substantivo curto e NÃO desestruturado**: `const avulsas = useOneTimeExpenses();`
   e depois `avulsas.data`, `avulsas.isLoading`, `avulsas.create.mutate(...)`,
   `avulsas.create.isPending`. (Hook só de query, como `useDashboard`, pode desestruturar.)
4. **A mutação é disparada pela página**, fechando o modal num `onSuccess` local:
   ```tsx
   onSave={(data) => installments.create.mutate(data, { onSuccess: () => setModal(null) })}
   ```
5. Renderização em três ramos por aba: `isLoading ? <Skeleton/> : !data?.length ? <EmptyState/> : <lista>`.
6. **Todos os modais são renderizados ao final**, sempre montados, controlados por
   `isOpen={modal === "..."}`; o `ConfirmDialog` por `isOpen={!!deleteX}` com um `if (deleteX)`
   defensivo dentro do `onConfirm` (é exatamente esse idioma que justifica o threshold relaxado de
   `app/**` no `vitest.config.ts`).
7. Container raiz: `className="p-4 sm:p-7 max-w-[1100px]"` (mais `space-y-6` nas páginas simples).
8. O componente da página é `export default function <Rota>Page()`.

## Checklist — criar uma feature nova

- [ ] `features/<nome-pt-br>/{components,hooks,services,types}`.
- [ ] `types/index.ts` com as interfaces de domínio; `types/schemas.ts` só se houver formulário RHF.
- [ ] `services/<Feature>Service.ts` (skill `web-feature-services`).
- [ ] `hooks/use<Coisa>.ts` (skill `web-feature-hooks`).
- [ ] Componentes apresentacionais (skill `web-componentes`).
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
