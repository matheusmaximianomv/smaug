---
name: web-shared-ui
description: Como escrever primitivos de UI, hooks e libs compartilhadas em web/shared no Smaug — forwardRef só nos wrappers de elemento nativo, cn() + objeto clsx (não cva), wrappers Radix com JSDoc, DataTable genérico, toast como objeto e "agora" como parâmetro reference.
---

# `shared/` — primitivos de UI, hooks e libs

## Quando usar esta skill

Ao criar/alterar `web/shared/components/*`, `web/shared/hooks/*` ou `web/shared/lib/*`. Também ao
promover um componente de feature para compartilhado.

## Primitivos de UI — `shared/components/`

### Regra 1: `forwardRef` só nos wrappers de elemento nativo

Exatamente três componentes usam `forwardRef` — `Button`, `Input`, `Select` — porque precisam
funcionar com `{...register()}` do React Hook Form. Todos seguem a mesma forma:
`export interface XProps extends XHTMLAttributes<HTMLXElement>`, `...props` espalhado por último,
e `X.displayName = "X";` no fim.

`shared/components/Button.tsx` (arquivo completo):

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "md", isLoading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-red text-white hover:bg-red/90 focus-visible:ring-red": variant === "default",
            "border border-border bg-surface hover:bg-bg": variant === "outline",
            "hover:bg-bg": variant === "ghost",
            "bg-red text-white hover:bg-red/90": variant === "danger",
          },
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-base": size === "md",
            "h-12 px-6 text-lg": size === "lg",
          },
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
```

Os demais primitivos são `export function X(props: XProps)`: `Modal`, `ConfirmDialog`, `DataTable`,
`EmptyState`, `Skeleton`, `Tabs`, `TypeBadge`, `MonthNavigator`, `ToastContainer`, `AppShell`,
`Sidebar`, `BottomNav`. `ErrorBoundary` é o único componente de classe.

### Regra 2: variantes por `cn()` + objeto `clsx`, **não** por `cva`

`class-variance-authority` está em `package.json`, mas **não é importado por arquivo nenhum**.
O mecanismo real de variante é o objeto `clsx` dentro do `cn()` (como no `Button` acima) ou um
`Record<Uniao, string>` no módulo:

```tsx
const WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
```

**Não introduza `cva` em componente novo.**

### Regra 3: vocabulário de props

`variant: "default" | "outline" | "ghost" | "danger"`, `size: "sm" | "md" | "lg"`,
`width: "sm" | "md" | "lg"`, booleanos com prefixo `is` (`isLoading`, `isDanger`, `isOpen`).
Props opcionais recebem **default na desestruturação, com literal em pt-BR**:

```tsx
export function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDanger = false,
  isLoading = false,
}: ConfirmDialogProps) {
```

`ConfirmDialog` **compõe** `Modal` em vez de reimplementar — é o padrão para diálogos novos.

### Regra 4: Radix com JSDoc justificando

`@radix-ui/react-dialog` e `@radix-ui/react-tabs` sustentam `Modal` e `Tabs`, importados em
namespace (`import * as Dialog from "@radix-ui/react-dialog"`). Todo wrapper carrega um JSDoc **em
português explicando por que o Radix substituiu a versão manual**:

```tsx
/**
 * Apoiado no Radix Dialog: ele entrega focus trap, devolução do foco ao fechar,
 * Escape, trava de scroll e a associação do título via aria-labelledby — tudo o
 * que a versão manual não tinha (o foco escapava para a página atrás).
 */
```

O Radix exige título acessível mesmo sem cabeçalho visível — daí o
`<Dialog.Title className="sr-only">Janela</Dialog.Title>` no ramo sem `title`.

### Regra 5: genéricos no `DataTable`

```tsx
export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({ ... }: DataTableProps<T>) {
```

`Column<T>` é exportado (o consumidor tipa o array de colunas); `DataTableProps<T>` não. A restrição
`T extends { id: string }` torna `key={row.id}` seguro. A coluna de ações é acrescentada
automaticamente quando há `onEdit || onDelete`, com `title` + `aria-label` em pt-BR.

### Quando promover um componente para `shared/`

Quando **duas features** precisarem dele. Ele entra em `shared/components/`, com props genéricas
(sem tipo de feature) e sem importar nada de `features/`.

## `shared/hooks/`

- **`useToast.ts`** — pub/sub **fora do React** (`toastListeners`/`toastQueue` no módulo) mais
  `useToastState()` para assinar. O consumidor **importa o objeto `toast`, não um hook**:
  `import { toast } from "@/shared/hooks/useToast";` — é isso que permite disparar de dentro de
  `onSuccess`/`onError` de uma mutation.
  ```ts
  export interface Toast {
    id: string;
    type: "success" | "error" | "info" | "warning";
    message: string;
    action?: { label: string; onClick: () => void };
    duration?: number;
  }
  export const toast = { show, success, error, info, warning };
  ```
  O shape `action?: { label, onClick }` é o idioma da casa para "CTA opcional" e reaparece em
  `EmptyStateProps`.
- **`useMediaQuery.ts`** — `useMediaQuery(query: string): boolean` e `useIsMobile()`
  (`"(max-width: 768px)"`).
- **`useDebounce.ts`** — `useDebounce<T>(value: T, delay = 500): T`.

## `shared/lib/`

Um arquivo por função ou por conceito, **sem barril**:

| Arquivo             | API                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils.ts`          | `cn(...inputs: ClassValue[])` = `twMerge(clsx(inputs))`                                                                                                                |
| `formatCurrency.ts` | `formatCurrency(value: number): string` (`Intl` pt-BR/BRL)                                                                                                             |
| `parseAmount.ts`    | `parseAmount(input: string): number` — devolve `NaN` para lixo                                                                                                         |
| `competence.ts`     | `Competence`, `CompetenceStatus`, `compareCompetences`, `addMonths`, `getCurrentCompetence`, `getCompetenceStatus`, `isEligible`, `isBeforeOrEqual`, `selectableYears` |
| `dateUtils.ts`      | `MONTH_NAMES_FULL`, `formatMonthYear(year, month)` → `"Set/26"`                                                                                                        |
| `type-guards.ts`    | `isString`, `isNumber`, `isObject`, `hasProperty`, `isApiError`                                                                                                        |

**Regra que atravessa todo o `shared/lib`: "agora" é um parâmetro opcional com default, nunca lido
implicitamente.**

```ts
export function getCompetenceStatus(
  competence: Competence,
  reference: Competence = getCurrentCompetence(),
): CompetenceStatus;
export function isEligible(
  competence: Competence,
  reference: Competence = getCurrentCompetence(),
): boolean;
```

É o que torna essas funções 100% testáveis sem fake timers — e o `web/vitest.config.ts` exige
exatamente 100% de cobertura em `shared/lib/**`.

`parseAmount.ts` é o **exemplar do padrão de comentário do projeto**: 20 linhas de JSDoc citando o
bug que ele substituiu (`parseFloat(v.replace(",", "."))` transformando `"1.234,56"` em `1.234`).
Imite esse estilo quando escrever uma lib nova.

## Checklist

- [ ] `forwardRef` + `displayName` **apenas** se embrulhar elemento de formulário nativo.
- [ ] Variante por `cn()` + objeto `clsx` ou `Record<Uniao, string>`; nunca `cva`.
- [ ] Defaults de props em pt-BR na desestruturação.
- [ ] Wrapper de biblioteca com JSDoc em pt-BR justificando a escolha.
- [ ] Nada importado de `features/`.
- [ ] Função de lib com "agora" como parâmetro `reference` default.
- [ ] Teste ao lado, com 100% de cobertura (`shared/**` é gate fechado).

## Não faça

- Não use `cva`.
- Não importe de `@/features/...` dentro de `shared/` (o `MonthStatus` em `MonthNavigator.tsx` é
  dívida, não precedente).
- Não leia `new Date()` dentro de uma função de `shared/lib`.
- Não crie `shared/lib/index.ts` nem `shared/components/index.ts`.
- Não use `shared/types/index.ts` como destino de tipo novo: ele já está morto (nada o importa) e
  duplica `Toast` e `ApiError`.
