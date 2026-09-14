---
name: web-feature-hooks
description: Como escrever hooks de feature no web do Smaug com TanStack Query v5 — const QK, staleTime 30_000, mutations create/update/remove, invalidateQueries + toast.success, onError com getApiErrorMessage e ação "Tentar novamente", e o retorno { ...query, create, remove }.
---

# Hook de feature (TanStack Query)

## Quando usar esta skill

Ao criar/alterar `web/features/<f>/hooks/use*.ts`. Aqui mora a regra de negócio e o estado de
servidor; o componente só recebe o resultado.

## Arquivo canônico

`web/features/despesas/hooks/useInstallments.ts` — **arquivo completo**, copie a estrutura:

```ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { toast } from "@/shared/hooks/useToast";
import { getApiErrorMessage } from "@/infra/api-error";

const QK = ["expenses", "installment"];

export function useInstallments() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: QK,
    queryFn: DespesasService.getInstallments,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: DespesasService.createInstallment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Parcelamento criado!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao criar parcelamento."), {
        action: { label: "Tentar novamente", onClick: () => create.mutate(variables) },
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => DespesasService.deleteInstallment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast.success("Parcelamento excluído!");
    },
    onError: (error, variables) =>
      toast.error(getApiErrorMessage(error, "Erro ao excluir parcelamento."), {
        action: { label: "Tentar novamente", onClick: () => remove.mutate(variables) },
      }),
  });

  return { ...query, create, remove };
}
```

## Regras

1. **`"use client"` na primeira linha** de todo arquivo de hook.
2. **A query key é um `const` de módulo, nunca inline.** Nome: **`QK`**. Formato:
   `["<recurso>"]` ou `["<recurso>", "<subtipo>"]`, em inglês, kebab-case no subtipo
   (`["expenses", "one-time"]`, `["revenues", "fixed"]`, `["categories"]`).
   Query parametrizada é a exceção e inlineia a chave:
   `queryKey: ["dashboard", competence.year, competence.month]`.
3. **`const qc = useQueryClient();`** — sempre abreviado `qc`.
4. **`staleTime: 30_000`** em toda `useQuery` (com separador numérico, não `30 * 1000`).
   **Não use `enabled`, `select` nem `placeholderData`** — nenhum aparece no projeto.
5. `queryFn` é a referência nua do método do service (`queryFn: DespesasService.getInstallments`)
   ou uma arrow quando há argumento
   (`queryFn: () => DashboardService.getByMonth(competence.year, competence.month)`).
6. `mutationFn` é referência nua quando o payload casa 1:1; caso contrário é arrow que
   **desestrutura o `id` e espalha o resto**, com o tipo inline no parâmetro:
   ```ts
   mutationFn: ({ id, ...p }: { id: string; endYear: number; endMonth: number }) =>
     DespesasService.terminateRecurring(id, p),
   ```
7. **Vocabulário fixo dos nomes de mutation**: `create`, `update`, `remove` (nunca `delete` —
   palavra reservada), `addVersion`, `terminate`. **Não existe `createX` / `isCreating`.**
8. **`onSuccess` é bloco e faz exatamente duas coisas, nesta ordem**: `qc.invalidateQueries({ queryKey: QK });`
   e `toast.success("<mensagem pt-BR terminando em !>")`. Sem update otimista, sem `setQueryData`.
9. **`onError` é arrow concisa** (sem chaves) devolvendo `toast.error(...)`:
   ```ts
   onError: (error, variables) =>
     toast.error(getApiErrorMessage(error, "Erro ao <verbo> <substantivo>."), {
       action: { label: "Tentar novamente", onClick: () => x.mutate(variables) },
     }),
   ```
   O fallback **sempre** começa com `"Erro ao "` e termina com ponto. O rótulo da ação é
   **exatamente** `"Tentar novamente"`.
10. **Retorno**: `return { ...query, create, update, remove };` — o resultado da query é espalhado
    plano e as mutations ficam aninhadas. O consumidor lê `hook.data`, `hook.isLoading`,
    `hook.create.mutate(...)`, `hook.create.isPending`. (`isLoading` vem da query; `isPending`, das
    mutations.)
11. Defaults globais (retry 3, backoff exponencial, `gcTime`, `refetchOnWindowFocus: false`) vivem
    em `infra/query-client.ts` — não os repita no hook.
12. Hook de negócio **não** importa `next/navigation`; usa `@/infra/router-adapter`.

## Exceções legítimas (existem e estão certas)

- **`useDashboard`** — só query, devolve `useQuery` direto:
  ```ts
  export function useDashboard(competence: MonthCompetence) {
    return useQuery({
      queryKey: ["dashboard", competence.year, competence.month],
      queryFn: () => DashboardService.getByMonth(competence.year, competence.month),
      staleTime: 30_000,
    });
  }
  ```
- **`useRegister`** — mutation nua, **sem toast e sem invalidação**: o formulário renderiza o erro
  inline.
- **`useVersionHistory`** — desestrutura a query e deriva no cliente, devolvendo um nome de domínio
  (`groups`) em vez de `data`.
- **`useAuth`** — não usa TanStack Query: `useState` + `useEffect`, porque o bootstrap de sessão não
  pode ser cacheado. Guarda a regra mais importante do tratamento de erro do front:
  ```ts
  if (isInvalidSessionError(err)) {
    clearUserId();
    setAuthState({ user: null, userId: null, isAuthenticated: false });
    return;
  }
  // Falha transitória (rede fora, 5xx): a sessão continua válida — perdemos
  // apenas os dados do perfil, que voltam no próximo carregamento.
  ```
- **`useMonthNavigation`** — hook de estado de UI puro, devolve
  `{ selected, status, isCurrent, current, navigate, goToCurrent }`.

## Checklist

- [ ] `"use client"` na primeira linha.
- [ ] `const QK = [...]` no módulo.
- [ ] `useQuery` com `staleTime: 30_000`.
- [ ] Mutations nomeadas do vocabulário fixo.
- [ ] `onSuccess`: invalidate + `toast.success`.
- [ ] `onError`: `getApiErrorMessage(error, "Erro ao ….")` + ação `"Tentar novamente"` que re-dispara
      com `variables`.
- [ ] `return { ...query, ...mutations }`.
- [ ] Teste em `use<Coisa>.test.tsx` com `setup()` local (skill `web-testes`).
- [ ] Todo código de erro novo da API tem entrada em `infra/api-error.ts`.

## Não faça

- Não coloque `queryKey` inline (salvo query parametrizada).
- Não nomeie mutation de `delete`.
- Não faça update otimista nem `setQueryData`.
- Não chame `apiClient` direto — passe pelo service da feature.
- Não escreva a mensagem de erro à mão: use `getApiErrorMessage` com fallback.
- Não use `enabled`/`select` sem necessidade real — hoje não existem no código.

## Inconsistências conhecidas

- **`QK` vs `QUERY_KEY`**: `features/despesas/*` usa `QK`; `features/categorias/useCategories.ts` e
  `features/receitas/useFixedRevenues.ts` usam `QUERY_KEY`. **Em código novo, use `QK`.**
- `useVersionHistory.ts` e `shared/hooks/useDebounce.ts` não têm `"use client"` (funciona por
  acidente, pelo consumidor já ser client). **Sempre inclua a diretiva em hook novo.**
