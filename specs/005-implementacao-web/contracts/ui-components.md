# UI Components Contracts

**Feature**: 005-implementacao-web | **Date**: 2026-04-28

## Overview

Este documento define os contratos (props interfaces) dos componentes reutilizáveis da aplicação Smaug. Estes componentes residem em `/shared/components` e são utilizados por múltiplas features.

---

## 1. Layout Components

### AppShell

Container principal da aplicação com sidebar e navegação.

```typescript
export interface AppShellProps {
  children: React.ReactNode;
}
```

**Behavior**:

- Desktop (>768px): Sidebar fixa 236px, sempre visível
- Mobile (≤768px): Sidebar oculta, bottom nav visível, hamburger menu
- Gerencia estado de sidebar aberta/fechada em mobile

**Usage**:

```tsx
<AppShell>
  <DashboardPage />
</AppShell>
```

---

### Sidebar

Navegação lateral com links para todas as páginas.

```typescript
export interface SidebarProps {
  className?: string;
}
```

**Behavior**:

- Links: Dashboard, Receitas, Despesas, Categorias, Histórico
- Highlight do link ativo baseado na rota atual
- Botão de logout no rodapé

---

### BottomNav

Barra de navegação inferior para mobile.

```typescript
export interface BottomNavProps {
  className?: string;
}
```

**Behavior**:

- Visível apenas em mobile (≤768px)
- 5 ícones: Dashboard, Receitas, Despesas, Categorias, Histórico
- Ícone ativo destacado

---

## 2. Navigation Components

### MonthNavigator

Seletor de mês com navegação e badge de status.

```typescript
export interface MonthNavigatorProps {
  year: number;
  month: number;
  status: "past" | "current" | "future";
  onChange: (year: number, month: number) => void;
  className?: string;
}
```

**Behavior**:

- Botões ← → para navegar entre meses
- Label central: "Mês/Ano" (ex: "Jan/26")
- Badge de status: "Passado" | "Vigente" | "Projeção"
- Cores do badge: cinza (passado), verde (vigente), azul (projeção)

**Usage**:

```tsx
<MonthNavigator
  year={2026}
  month={4}
  status="current"
  onChange={(y, m) => setCompetence({ year: y, month: m })}
/>
```

---

## 3. Data Display Components

### KpiCard

Card de KPI com label, valor e borda lateral colorida.

```typescript
export interface KpiCardProps {
  label: string;
  value: number;
  sublabel?: string;
  color: "red" | "green" | "text";
  className?: string;
}
```

**Behavior**:

- Valor formatado como moeda (R$ 1.234,56)
- Borda lateral de 4px na cor especificada
- Sublabel opcional (ex: "vs. mês anterior")

**Usage**:

```tsx
<KpiCard label="Total Receitas" value={5000} sublabel="+10% vs. mês anterior" color="green" />
```

---

### DataTable

Tabela genérica com colunas configuráveis e ações.

```typescript
export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}
```

**Behavior**:

- Renderiza colunas baseado em `columns`
- Ações de editar/excluir (se fornecidas) em coluna separada
- Empty state customizável
- Scroll horizontal em mobile

**Usage**:

```tsx
<DataTable
  data={revenues}
  columns={[
    { key: "description", header: "Descrição" },
    { key: "amount", header: "Valor", render: (r) => formatCurrency(r.amount) },
    {
      key: "competenceMonth",
      header: "Competência",
      render: (r) => `${r.competenceMonth}/${r.competenceYear}`,
    },
  ]}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

### SemesterChart

Gráfico de barras duplas para 6 meses (receitas vs despesas).

```typescript
export interface SemesterChartProps {
  data: MonthChartData[];
  className?: string;
}

export interface MonthChartData {
  year: number;
  month: number;
  label: string; // "Mês/Ano"
  revenues: number;
  expenses: number;
  isFuture: boolean;
}
```

**Behavior**:

- 6 barras duplas (receitas verde, despesas vermelho)
- Barras hachuradas para meses futuros (isFuture=true)
- Labels no eixo X: "Mês/Ano"
- Tooltip ao hover com valores formatados

**Usage**:

```tsx
<SemesterChart data={chartData} />
```

---

### ExpenseBreakdown

Breakdown de despesas por categoria com progress bars.

```typescript
export interface ExpenseBreakdownProps {
  categories: CategoryBreakdown[];
  total: number;
  className?: string;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number; // 0-100
}
```

**Behavior**:

- Lista de categorias ordenadas por valor (maior → menor)
- Progress bar para cada categoria (largura = percentage)
- Valor formatado como moeda
- Percentual exibido ao lado

**Usage**:

```tsx
<ExpenseBreakdown categories={breakdown} total={totalExpenses} />
```

---

## 4. Feedback Components

### Toast

Notificação toast não-bloqueante.

```typescript
export interface ToastProps {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms, default 5000
  onClose: (id: string) => void;
}
```

**Behavior**:

- Aparece no canto superior direito
- Desaparece automaticamente após `duration` ms
- Botão de ação opcional (ex: "Tentar novamente")
- Botão X para fechar manualmente
- Cores por tipo: verde (success), vermelho (error), azul (info), amarelo (warning)

**Usage**:

```tsx
<Toast
  id="toast-1"
  type="error"
  message="Erro ao salvar receita"
  action={{ label: "Tentar novamente", onClick: retry }}
  onClose={removeToast}
/>
```

---

### Skeleton

Placeholder animado para loading states.

```typescript
export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}
```

**Behavior**:

- Animação de pulse (opacity 0.5 → 1)
- Cor: `bg-border` (#e8e5e2)
- Variantes: text (h-4), circular (rounded-full), rectangular (rounded)

**Usage**:

```tsx
<Skeleton className="h-32 w-full" variant="rectangular" />
```

---

### EmptyState

Estado vazio com ilustração e CTA.

```typescript
export interface EmptyStateProps {
  illustration: string; // URL da imagem
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

**Behavior**:

- Ilustração centralizada (w-48 h-48)
- Título em `text-text` (bold)
- Descrição em `text-text-muted`
- Botão de ação primária (se fornecido)

**Usage**:

```tsx
<EmptyState
  illustration="/images/empty-revenues.svg"
  title="Nenhuma receita encontrada"
  description="Comece adicionando sua primeira receita do mês"
  action={{ label: "Adicionar receita", onClick: openForm }}
/>
```

---

## 5. Form Components

### Button

Botão com variantes.

```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  className?: string;
}
```

**Behavior**:

- Variantes: default (bg-red), outline (border), ghost (transparent), danger (bg-red-mid)
- Sizes: sm (px-3 py-1.5), md (px-4 py-2), lg (px-6 py-3)
- Loading state: spinner + disabled

**Usage**:

```tsx
<Button variant="default" size="md" onClick={handleSubmit}>
  Salvar
</Button>
```

---

### Input

Campo de input com label e erro.

```typescript
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}
```

**Behavior**:

- Label acima do input
- Borda vermelha se `error` presente
- Mensagem de erro abaixo do input em vermelho

**Usage**:

```tsx
<Input label="Descrição" error={errors.description} {...register("description")} />
```

---

### Select

Dropdown select com label e erro.

```typescript
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  className?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
}
```

**Behavior**:

- Label acima do select
- Borda vermelha se `error` presente
- Mensagem de erro abaixo do select

**Usage**:

```tsx
<Select
  label="Categoria"
  error={errors.categoryId}
  options={categories.map((c) => ({ value: c.id, label: c.name }))}
  {...register("categoryId")}
/>
```

---

## 6. Modal Components

### Modal

Modal genérico com overlay.

```typescript
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}
```

**Behavior**:

- Overlay escuro (bg-black/50)
- Fecha ao clicar no overlay ou pressionar Escape
- Tamanhos: sm (max-w-sm), md (max-w-md), lg (max-w-lg), xl (max-w-xl)
- Header com título e botão X
- Footer customizável (ex: botões de ação)

**Usage**:

```tsx
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Adicionar Receita"
  footer={
    <>
      <Button variant="outline" onClick={close}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit}>Salvar</Button>
    </>
  }
>
  <RevenueForm />
</Modal>
```

---

### ConfirmDialog

Modal de confirmação com ação destrutiva.

```typescript
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}
```

**Behavior**:

- Modal pequeno (max-w-sm)
- Ícone de alerta (cor baseada em variant)
- Botão de confirmar destacado (vermelho para danger)
- Botão de cancelar (outline)

**Usage**:

```tsx
<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Excluir receita?"
  message="Esta ação não pode ser desfeita."
  confirmLabel="Excluir"
  variant="danger"
/>
```

---

## 7. Feature-Specific Components

### VersionHistoryModal

Modal de histórico de versões (receitas fixas / despesas recorrentes).

```typescript
export interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "FIXED_REVENUE" | "RECURRING_EXPENSE";
  versions: VersionEntry[];
}

export interface VersionEntry {
  id: string;
  description: string;
  amount: number;
  categoryName?: string; // Apenas para RECURRING_EXPENSE
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string;
}
```

**Behavior**:

- Timeline vertical com versões ordenadas por data efetiva (mais recente primeiro)
- Cada versão mostra: descrição, valor, categoria (se aplicável), data efetiva
- Versão atual destacada

**Usage**:

```tsx
<VersionHistoryModal
  isOpen={showHistory}
  onClose={() => setShowHistory(false)}
  type="FIXED_REVENUE"
  versions={fixedRevenue.versions}
/>
```

---

### InstallmentModal

Modal de visualização de parcelas.

```typescript
export interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installments: Installment[];
  totalAmount: number;
}

export interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
}
```

**Behavior**:

- Lista de parcelas com número, mês/ano, valor
- Progress bar no topo (parcelas pagas vs total)
- Total geral no rodapé

**Usage**:

```tsx
<InstallmentModal
  isOpen={showInstallments}
  onClose={() => setShowInstallments(false)}
  installments={expense.installments}
  totalAmount={expense.totalAmount}
/>
```

---

## Design Tokens

Todos os componentes devem usar os tokens de design definidos em `tailwind.config.js`:

```typescript
// Cores
colors: {
  red: '#c0292a',
  'red-light': '#fdf1f1',
  'red-mid': '#e8a0a0',
  bg: '#faf9f8',
  surface: '#ffffff',
  border: '#e8e5e2',
  text: '#1a1614',
  'text-muted': '#6b6460',
  'text-subtle': '#a09c98',
  green: '#1a7a4a',
  'green-light': '#f0faf5',
}

// Tipografia
fontFamily: {
  sans: ['Plus Jakarta Sans', 'sans-serif'],
}

// Layout
width: {
  nav: '236px',
}
```

---

## Accessibility Requirements

Todos os componentes devem implementar:

1. **Navegação por teclado**: Tab, Shift+Tab, Enter, Escape
2. **Labels semânticos**: `<button>`, `<nav>`, `<main>`, etc.
3. **ARIA attributes**: `aria-label`, `aria-labelledby`, `role`, `aria-modal`
4. **Focus management**: Focus visível, focus trap em modais

---

## Testing Contracts

Cada componente deve ter testes unitários cobrindo:

1. **Renderização**: Componente renderiza sem erros
2. **Props**: Props são aplicadas corretamente
3. **Interações**: Callbacks são chamados quando esperado
4. **Acessibilidade**: Navegação por teclado funciona

Exemplo:

```typescript
describe('Button', () => {
  it('should render with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should be keyboard accessible', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

---

## Summary

Este documento define:

- **25+ componentes reutilizáveis**: Layout, navegação, data display, feedback, forms, modals
- **Props interfaces**: Contratos TypeScript para cada componente
- **Comportamentos esperados**: Como cada componente deve funcionar
- **Design tokens**: Cores, tipografia, layout
- **Requisitos de acessibilidade**: Navegação por teclado, ARIA
- **Contratos de teste**: O que deve ser testado

Todos os componentes seguem os princípios da constituição frontend e são projetados para serem reutilizáveis, acessíveis e testáveis.
