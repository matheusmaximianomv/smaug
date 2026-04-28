# Data Model: Implementação da Interface Web

**Feature**: 005-implementacao-web | **Date**: 2026-04-28

## Overview

Este documento define os tipos TypeScript e estruturas de dados utilizados no frontend da aplicação Smaug. Os tipos são derivados dos contratos da API REST existente e organizados por domínio funcional.

### Convenção de Nomenclatura

**Código (Types, Interfaces, Variáveis)**: Inglês

- Exemplos: `MonthCompetence`, `competenceYear`, `competenceMonth`

**UI (Labels, Mensagens, Documentação)**: Português

- Exemplos: "Competência", "Mês/Ano de Competência"

**Rationale**: Manter código em inglês facilita reutilização e colaboração internacional, enquanto UI em português atende o público-alvo brasileiro.

---

## 1. Auth Domain

### User

Representa um usuário do sistema.

```typescript
export interface User {
  id: string; // UUID
  name: string; // 1-255 chars
  email: string; // Email válido
  createdAt: string; // ISO 8601 date string
}
```

### AuthState

Estado de autenticação no cliente.

```typescript
export interface AuthState {
  user: User | null;
  userId: string | null; // Armazenado em localStorage
  isAuthenticated: boolean;
}
```

**Validation Rules**:

- `name`: 1-255 caracteres
- `email`: Formato de email válido
- `userId`: UUID válido

**State Transitions**:

- Unauthenticated → Authenticated: Após login bem-sucedido
- Authenticated → Unauthenticated: Após logout manual

---

## 2. Dashboard Domain

### MonthCompetence

Representa uma competência mensal (mês/ano).

```typescript
export interface MonthCompetence {
  year: number; // >= 2000
  month: number; // 1-12
}
```

### MonthStatus

Status de um mês em relação ao mês atual.

```typescript
export type MonthStatus = "past" | "current" | "future";
```

### KpiData

Dados dos KPIs do dashboard.

```typescript
export interface KpiData {
  totalRevenues: number; // Soma de todas as receitas do mês
  totalExpenses: number; // Soma de todas as despesas do mês
  balance: number; // totalRevenues - totalExpenses
}
```

### SemesterChartData

Dados para o gráfico semestral (6 meses).

```typescript
export interface SemesterChartData {
  months: MonthChartData[]; // Array de 6 meses (3 passados + atual + 2 futuros)
}

export interface MonthChartData {
  year: number;
  month: number;
  label: string; // Formato "Mês/Ano" (ex: "Jan/26")
  revenues: number;
  expenses: number;
  isFuture: boolean; // true se mês > mês atual (para hachura)
}
```

### ExpenseBreakdown

Breakdown de despesas por categoria.

```typescript
export interface ExpenseBreakdown {
  categories: CategoryBreakdown[];
  total: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number; // 0-100
}
```

### DashboardData

Dados consolidados do dashboard.

```typescript
export interface DashboardData {
  competence: MonthCompetence;
  status: MonthStatus;
  kpis: KpiData;
  chart: SemesterChartData;
  breakdown: ExpenseBreakdown;
  recentRevenues: RevenueListItem[]; // Top 5 receitas do mês
  recentExpenses: ExpenseListItem[]; // Top 5 despesas do mês
}
```

**Validation Rules**:

- `month`: 1-12
- `year`: >= 2000
- `percentage`: 0-100

---

## 3. Receitas Domain

### OneTimeRevenue

Receita avulsa (única).

```typescript
export interface OneTimeRevenue {
  id: string; // UUID
  userId: string; // UUID
  description: string; // 1-255 chars
  amount: number; // > 0, max 2 decimais
  competenceYear: number; // >= 2000
  competenceMonth: number; // 1-12
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### FixedRevenue

Receita fixa (recorrente mensal).

```typescript
export interface FixedRevenue {
  id: string; // UUID
  userId: string; // UUID
  modality: RevenueModality;
  startYear: number; // >= 2000
  startMonth: number; // 1-12
  endYear: number | null; // >= 2000 ou null (sem fim)
  endMonth: number | null; // 1-12 ou null
  currentVersion: FixedRevenueVersion;
  versions: FixedRevenueVersion[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type RevenueModality = "ALTERABLE" | "UNALTERABLE";
```

### FixedRevenueVersion

Versão de uma receita fixa.

```typescript
export interface FixedRevenueVersion {
  id: string; // UUID
  description: string; // 1-255 chars
  amount: number; // > 0, max 2 decimais
  effectiveYear: number; // >= 2000
  effectiveMonth: number; // 1-12
  createdAt: string; // ISO 8601
}
```

### RevenueListItem

Item de receita para listagens (união de tipos).

```typescript
export interface RevenueListItem {
  id: string;
  type: "ONE_TIME" | "FIXED";
  description: string;
  amount: number;
  competenceYear?: number; // Para ONE_TIME
  competenceMonth?: number; // Para ONE_TIME
  modality?: RevenueModality; // Para FIXED
}
```

**Validation Rules**:

- `description`: 1-255 caracteres
- `amount`: > 0, máximo 2 casas decimais
- `competenceYear`, `effectiveYear`, `startYear`: >= 2000
- `competenceMonth`, `effectiveMonth`, `startMonth`, `endMonth`: 1-12
- `endDate` >= `startDate` (se definido)
- Competência >= mês atual (para criação/edição)

**State Transitions** (FixedRevenue):

- Active → Terminated: Quando `endYear/endMonth` é definido
- Alterable → Alterable com nova versão: Quando nova versão é adicionada
- Unalterable: Não pode ter novas versões

---

## 4. Despesas Domain

### OneTimeExpense

Despesa avulsa (única).

```typescript
export interface OneTimeExpense {
  id: string; // UUID
  userId: string; // UUID
  categoryId: string; // UUID
  category: Category; // Populated
  description: string; // 1-255 chars
  amount: number; // > 0, max 2 decimais
  competenceYear: number; // >= 2000
  competenceMonth: number; // 1-12
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### InstallmentExpense

Despesa parcelada.

```typescript
export interface InstallmentExpense {
  id: string; // UUID
  userId: string; // UUID
  categoryId: string; // UUID
  category: Category; // Populated
  description: string; // 1-255 chars
  totalAmount: number; // > 0, max 2 decimais
  installmentCount: number; // 1-72
  startYear: number; // >= 2000
  startMonth: number; // 1-12
  installments: Installment[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Installment {
  id: string; // UUID
  installmentNumber: number; // 1-N
  amount: number; // Calculado: Math.floor(total * 100 / n) / 100
  competenceYear: number;
  competenceMonth: number;
}
```

### RecurringExpense

Despesa recorrente (mensal com versionamento).

```typescript
export interface RecurringExpense {
  id: string; // UUID
  userId: string; // UUID
  startYear: number; // >= 2000
  startMonth: number; // 1-12
  endYear: number | null; // >= 2000 ou null
  endMonth: number | null; // 1-12 ou null
  currentVersion: RecurringExpenseVersion;
  versions: RecurringExpenseVersion[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface RecurringExpenseVersion {
  id: string; // UUID
  categoryId: string; // UUID
  category: Category; // Populated
  description: string; // 1-255 chars
  amount: number; // > 0, max 2 decimais
  effectiveYear: number; // >= 2000
  effectiveMonth: number; // 1-12
  createdAt: string; // ISO 8601
}
```

### ExpenseListItem

Item de despesa para listagens (união de tipos).

```typescript
export interface ExpenseListItem {
  id: string;
  type: "ONE_TIME" | "INSTALLMENT" | "RECURRING";
  userId: string;
  categoryId: string;
  category: Category;
  description: string;
  amount: number;
  competenceYear?: number; // Para ONE_TIME
  competenceMonth?: number; // Para ONE_TIME
  installmentExpenseId?: string; // Para INSTALLMENT
  installmentNumber?: number; // Para INSTALLMENT
  installmentCount?: number; // Para INSTALLMENT
  totalAmount?: number; // Para INSTALLMENT
  recurringExpenseId?: string; // Para RECURRING
  startYear?: number; // Para INSTALLMENT/RECURRING
  startMonth?: number; // Para INSTALLMENT/RECURRING
  endYear?: number | null; // Para RECURRING
  endMonth?: number | null; // Para RECURRING
  effectiveYear?: number; // Para RECURRING
  effectiveMonth?: number; // Para RECURRING
  versionId?: string; // Para RECURRING
  createdAt: string;
  updatedAt: string;
}
```

**Validation Rules**:

- `description`: 1-255 caracteres
- `amount`, `totalAmount`: > 0, máximo 2 casas decimais
- `installmentCount`: 1-72
- `competenceYear`, `effectiveYear`, `startYear`: >= 2000
- `competenceMonth`, `effectiveMonth`, `startMonth`, `endMonth`: 1-12
- `endDate` >= `startDate` (se definido)
- Competência >= mês atual (para criação/edição)
- Cálculo de parcelas: `Math.floor(total * 100 / n) / 100`, diferença na 1ª parcela

**State Transitions**:

- InstallmentExpense: Active → Terminated (remove parcelas futuras)
- RecurringExpense: Active → Terminated (define endYear/endMonth)
- RecurringExpense: Pode ter múltiplas versões ao longo do tempo

---

## 5. Categorias Domain

### Category

Categoria de despesas.

```typescript
export interface Category {
  id: string; // UUID
  userId: string; // UUID
  name: string; // 1-100 chars, único por usuário (case-insensitive)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CategoryWithCount extends Category {
  linkedExpensesCount: number; // Contador de despesas vinculadas
}
```

**Validation Rules**:

- `name`: 1-100 caracteres, único por usuário (case-insensitive)
- Não pode ser excluída se `linkedExpensesCount` > 0

**State Transitions**:

- Can be deleted → Cannot be deleted: Quando despesas são vinculadas
- Cannot be deleted → Can be deleted: Quando todas as despesas vinculadas são removidas

---

## 6. Histórico Domain

### VersionHistoryEntry

Entrada no histórico de versões.

```typescript
export interface VersionHistoryEntry {
  id: string; // UUID do item (FixedRevenue ou RecurringExpense)
  type: "FIXED_REVENUE" | "RECURRING_EXPENSE";
  versionId: string; // UUID da versão
  description: string;
  amount: number;
  categoryId?: string; // Apenas para RECURRING_EXPENSE
  categoryName?: string; // Apenas para RECURRING_EXPENSE
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string; // ISO 8601
}

export interface VersionHistoryGroup {
  year: number;
  month: number;
  label: string; // Formato "Mês/Ano"
  entries: VersionHistoryEntry[];
}
```

**Validation Rules**:

- `effectiveYear`: >= 2000
- `effectiveMonth`: 1-12

---

## 7. Common Types

### ApiResponse

Wrapper genérico para respostas da API.

```typescript
export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
}

export interface ApiError {
  error: string; // Error code (ex: "VALIDATION_ERROR")
  message: string; // Human-readable message
  details?: Record<string, string[]>; // Validation errors
}
```

### PaginatedResponse

Resposta paginada (se necessário no futuro).

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### FormState

Estado de formulários.

```typescript
export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string>;
  isSubmitting: boolean;
  isValid: boolean;
}
```

---

## 8. UI State Types

### ToastNotification

Notificação toast.

```typescript
export interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms, default 5000
}
```

### ModalState

Estado de modais.

```typescript
export interface ModalState {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}
```

### LoadingState

Estado de carregamento.

```typescript
export type LoadingState = "idle" | "loading" | "success" | "error";
```

---

## Relationships

### Entity Relationships

```
User (1) ─── (N) OneTimeRevenue
User (1) ─── (N) FixedRevenue
User (1) ─── (N) Category
User (1) ─── (N) OneTimeExpense
User (1) ─── (N) InstallmentExpense
User (1) ─── (N) RecurringExpense

FixedRevenue (1) ─── (N) FixedRevenueVersion
RecurringExpense (1) ─── (N) RecurringExpenseVersion
InstallmentExpense (1) ─── (N) Installment

Category (1) ─── (N) OneTimeExpense
Category (1) ─── (N) InstallmentExpense
Category (1) ─── (N) RecurringExpenseVersion
```

### Data Flow

```
API (Backend)
      ↓
Services (API calls)
      ↓
React Query (cache)
      ↓
Hooks (business logic)
      ↓
Components (UI)
```

---

## Type Guards

Funções utilitárias para type narrowing.

```typescript
// shared/lib/type-guards.ts

export function isOneTimeRevenue(item: RevenueListItem): item is OneTimeRevenue {
  return item.type === "ONE_TIME";
}

export function isFixedRevenue(item: RevenueListItem): item is FixedRevenue {
  return item.type === "FIXED";
}

export function isOneTimeExpense(item: ExpenseListItem): item is OneTimeExpense {
  return item.type === "ONE_TIME";
}

export function isInstallmentExpense(item: ExpenseListItem): item is InstallmentExpense {
  return item.type === "INSTALLMENT";
}

export function isRecurringExpense(item: ExpenseListItem): item is RecurringExpense {
  return item.type === "RECURRING";
}

export function isPastMonth(competence: MonthCompetence, current: MonthCompetence): boolean {
  if (competence.year < current.year) return true;
  if (competence.year === current.year && competence.month < current.month) return true;
  return false;
}

export function isFutureMonth(competence: MonthCompetence, current: MonthCompetence): boolean {
  if (competence.year > current.year) return true;
  if (competence.year === current.year && competence.month > current.month) return true;
  return false;
}
```

---

## Summary

Este data model define:

- **7 domínios funcionais**: Auth, Dashboard, Receitas, Despesas, Categorias, Histórico, Common
- **25+ tipos TypeScript**: Entidades, DTOs, UI state
- **Regras de validação**: Constraints de campos e transições de estado
- **Relacionamentos**: Entre entidades e fluxo de dados
- **Type guards**: Para type narrowing seguro

Todos os tipos são derivados dos contratos da API REST existente (specs/002-receitas e specs/003-despesas) e organizados seguindo a arquitetura orientada a domínio da constituição frontend.
