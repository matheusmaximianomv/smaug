---
name: web-componentes
description: Como escrever componentes de feature e formulários no web do Smaug — props XProps, apresentacional sem hook de dados, os dois padrões de formulário (React Hook Form + zod vs useState + bag de erros), tokens Tailwind, cn() e acessibilidade em pt-BR.
---

# Componente de feature e formulário

## Quando usar esta skill

Ao criar/alterar `web/features/<f>/components/*.tsx`. Para primitivos de `shared/components`, veja
`web-shared-ui`.

## Regras gerais

1. **`interface <Componente>Props` declarada logo acima do componente**, e **não exportada** em
   componente de feature (primitivos de `shared/` exportam).
2. **`"use client"` só quando o componente tem estado/efeito/hook.** `InstallmentForm` (useState,
   useMemo) tem; `InstallmentCard`, `InstallmentModal`, `KpiCard` **não têm** — herdam a fronteira
   da página.
3. **Apresentacional de verdade**: sem hook de dados, sem `apiClient`, sem query client.
4. **"Agora" é injetado por props**, não lido dentro do componente:
   `currentYear: number; currentMonth: number` — padrão consistente em `InstallmentCard`,
   `InstallmentModal`, `RecurringExpenseCard`.
5. Callbacks são `on<Verbo>`. **Excluir recebe o id; visualizar/editar recebem a entidade**:
   ```ts
   onDelete: (id: string) => void;
   onViewInstallments: (exp: InstallmentExpense) => void;
   ```
6. Item de lista usa elemento semântico + `data-testid`:
   `<article data-testid="installment-card" className="...">`.
7. Modal de feature embrulha `shared/components/Modal`, recebe `{ isOpen, onClose, <entidade> }` e
   faz early-return quando a entidade falta:
   ```tsx
   export function InstallmentModal({ isOpen, onClose, expense, currentYear, currentMonth }: InstallmentModalProps) {
     if (!expense) return null;
     return <Modal isOpen={isOpen} onClose={onClose} title={`Parcelas — ${expense.description}`} width="md">
   ```

## Exemplo canônico — apresentacional

`features/dashboard/components/KpiCard.tsx` (arquivo completo):

```tsx
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/formatCurrency";

interface KpiCardProps {
  label: string;
  value: number;
  sublabel: string;
  colorScheme: "green" | "red" | "positive" | "negative";
}

const COLOR_MAP: Record<KpiCardProps["colorScheme"], string> = {
  green: "border-l-[3px] border-l-green",
  red: "border-l-[3px] border-l-red",
  positive: "border-l-[3px] border-l-green",
  negative: "border-l-[3px] border-l-red",
};

export function KpiCard({ label, value, sublabel, colorScheme }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 flex flex-col gap-1",
        COLOR_MAP[colorScheme],
      )}
    >
      <span className="text-[11.5px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="text-[22px] font-bold text-text">{formatCurrency(value)}</span>
      <span className="text-xs text-text-subtle">{sublabel}</span>
    </div>
  );
}
```

**O padrão de variante do projeto inteiro é esse**: um `const UPPER_SNAKE: Record<Uniao, string>`
(ou `Record<Uniao, { label, cls }>`) no módulo, consultado e passado para `cn()`. Nomes em uso:
`COLOR_MAP`, `WIDTHS`, `STATUS_BADGE`, `STYLES`, `ICONS`, `COLORS`, `NAV_ITEMS`, `OPTIONS`, `TABS`.

## Formulários — existem DOIS padrões

**Ambos compartilham a mesma assinatura de props e a mesma regra de ouro:**
props `{ initial?, categories?, onSave, onClose, isLoading? }`; **`onSave` recebe o payload da API
já montado, nunca o estado cru do formulário**; e **o formulário nunca dispara mutation** — quem
chama `.mutate()` é a página.

### (a) React Hook Form + zodResolver — onde existe `types/schemas.ts`

Hoje: `LoginForm.tsx`, `RegisterForm.tsx`, `CategoryForm.tsx` (features `auth` e `categorias`).
**Use este padrão quando o formulário for simples e você criar o `schemas.ts` correspondente.**

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { categorySchema, type CategoryFormData } from "../types/schemas";

interface CategoryFormProps {
  initial?: { name: string };
  onSave: (data: CategoryFormData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function CategoryForm({ initial, onSave, onClose, isLoading }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: initial?.name ?? "" },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <Input
        label="Nome da categoria"
        placeholder="Ex: Moradia, Alimentação..."
        error={errors.name?.message}
        autoFocus
        {...register("name")}
      />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initial ? "Salvar" : "Criar categoria"}
        </Button>
      </div>
    </form>
  );
}
```

Detalhes fixos: desestruture exatamente `{ register, handleSubmit, formState: { errors } }`; o
genérico é o tipo `XFormData`; `defaultValues` vem de `initial?.campo ?? ""`;
**`{...register("campo")}` é espalhado por último no `<Input>`**; o erro entra como
`error={errors.campo?.message}`; o rótulo do submit é ternário sobre `initial`.
`RegisterForm` usa `noValidate` no `<form>` — com comentário explicando que a validação nativa do
browser barraria o submit antes do React.

### (b) `useState` controlado + validação imperativa — os demais 8 formulários

`InstallmentForm`, `OneTimeExpenseForm`, `RecurringExpenseForm`, `RecurringExpenseVersionForm` e os
formulários de `receitas`. **Use quando houver campos derivados, máscara de moeda ou regra de
competência** — foi por isso que nasceram.

```tsx
const [desc, setDesc] = useState("");
const [total, setTotal] = useState("");
const [count, setCount] = useState("");
const [catId, setCatId] = useState("");
const [month, setMonth] = useState(now.month);
const [year, setYear] = useState(now.year);
const [errors, setErrors] = useState<Record<string, string>>({});

const installmentAmt = useMemo(() => {
  const t = Math.round(parseAmount(total) * 100);
  const c = parseInt(count);
  if (!t || !c || c < 1 || c > 72) return null;
  return Math.floor(t / c) / 100;
}, [total, count]);

function submit(e: React.FormEvent) {
  e.preventDefault();
  const v: Record<string, string> = {};
  if (!desc.trim()) v.desc = "Descrição obrigatória.";
  const t = parseAmount(total);
  if (isNaN(t) || t <= 0) v.total = "Valor total inválido.";
  const c = parseInt(count);
  if (isNaN(c) || c < 1 || c > 72) v.count = "Entre 1 e 72 parcelas.";
  if (!catId) v.cat = "Selecione uma categoria.";
  if (!isEligible({ year, month })) {
    v.competence = "A primeira parcela não pode cair em competência passada.";
  }
  if (Object.keys(v).length) {
    setErrors(v);
    return;
  }
  onSave({
    description: desc.trim(),
    totalAmount: t,
    installmentCount: c,
    categoryId: catId,
    startYear: year,
    startMonth: month,
  });
}
```

Detalhes fixos: bag de erro é `Record<string, string>` com chaves curtas (`desc`, `total`, `count`,
`cat`, `competence`); valor monetário **sempre** por `parseAmount()`, nunca `parseFloat`; competência
validada com `isEligible({ year, month })` de `@/shared/lib/competence`.

### Rodapé de formulário (idêntico nos dois padrões)

```tsx
<div className="flex justify-end gap-2 border-t border-border pt-4">
  <Button variant="ghost" type="button" onClick={onClose}>
    Cancelar
  </Button>
  <Button type="submit" isLoading={isLoading}>
    ...
  </Button>
</div>
```

## Tailwind

- **Só tokens do tema**, nunca hex cru: `bg-surface`, `bg-bg`, `border-border`, `text-text`,
  `text-text-muted`, `text-text-subtle`, `text-red`, `bg-red-light`, `border-red-mid`, `text-green`,
  `bg-green-light`, `w-nav`. Definidos em `web/tailwind.config.ts`.
- **Tamanhos de fonte arbitrários são intencionais** e fazem parte do design:
  `text-[11px]`, `text-[11.5px]`, `text-[13px]`, `text-[13.5px]`, `text-[14.5px]`, `text-[18px]`,
  `text-[22px]`.
- Superfície de card: `rounded-lg border border-border bg-surface p-4|p-5`.
- Título de seção: `text-[13px] font-bold uppercase tracking-wide text-text-muted`.
- Ritmo vertical: `space-y-4` em formulário, `space-y-6` em página, `gap-2.5` em lista de cards.
- Foco: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red`.
- **`cn()` sempre que a classe for condicional** ou o componente aceitar `className`; string literal
  simples caso contrário. Condicional: `cn(base, cond && "classes")`.
- Ícones de `lucide-react`, sempre com `size` numérico explícito (12/14/16/18/20/40) e
  `className="mr-1"` quando precedem texto.

## Acessibilidade

`aria-label` em **pt-BR** em todo botão só-ícone (`"Fechar"`, `"Excluir"`, `"Editar"`,
`"Mês anterior"`, `"Próximo mês"`, `"Abrir menu"`, `"Sair"`), `aria-invalid` / `aria-describedby`
nos campos, `aria-label="Navegação principal"` no `<nav>`. Os testes consultam por papel e nome
acessível — quebrar o rótulo quebra o teste.

## Checklist

- [ ] `interface <Componente>Props` acima do componente, não exportada.
- [ ] `"use client"` só se houver estado/efeito.
- [ ] Sem hook de dados, sem `apiClient`.
- [ ] "Agora" recebido por prop.
- [ ] Variantes por `Record<Uniao, string>` + `cn()`.
- [ ] `onSave` recebendo o payload pronto; nenhuma mutation chamada aqui.
- [ ] Rodapé de formulário no formato padrão.
- [ ] Tokens Tailwind; nada de hex.
- [ ] `aria-label` em pt-BR nos botões só-ícone; `data-testid` em card de lista.
- [ ] Teste ao lado do arquivo (skill `web-testes`).

## Não faça

- Não chame `useMutation`/`apiClient` dentro do componente.
- Não leia `new Date()` dentro de componente de lista/card — receba por prop.
- Não interpole classe com template literal (``className={`... ${cond ? "x" : ""}`}``); use `cn()`.
  Só `FilterBar.tsx` e `AppShell.tsx` fazem isso, e é dívida.
- Não use hex arbitrário para cor de tema (os poucos `bg-[#f5f0ff]` existentes são paletas pontuais
  de badge, não precedente).
- Não crie um terceiro padrão de formulário.
