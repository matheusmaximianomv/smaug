# Research: Implementação da Interface Web

**Feature**: 005-implementacao-web | **Date**: 2026-04-28

## Overview

Este documento consolida as decisões técnicas e padrões de implementação para a interface web do Smaug em Next.js 15.

---

## 1. Next.js 15 App Router - Padrões e Best Practices

### Decision

Utilizar Next.js 15 com App Router, priorizando Server Components e aplicando Client Components apenas quando necessário.

### Rationale

- **Server Components por padrão**: Melhor performance (menos JavaScript no cliente), SEO otimizado, acesso direto a recursos do servidor
- **App Router**: Roteamento baseado em sistema de arquivos, layouts aninhados, loading/error states automáticos
- **Streaming e Suspense**: Carregamento progressivo de UI para melhor UX

### Implementation Patterns

#### Server vs Client Components

```typescript
// Server Component (padrão) - sem "use client"
// app/(app)/dashboard/page.tsx
export default async function DashboardPage() {
  // Pode fazer fetch diretamente aqui se necessário
  return <DashboardView />;
}

// Client Component - apenas quando necessário
// features/dashboard/components/MonthNavigator.tsx
"use client";
export function MonthNavigator() {
  const [month, setMonth] = useState(new Date());
  // Interatividade, estado, efeitos
}
```

#### Route Groups

```
app/
  (auth)/          # Grupo sem afetar URL
    login/
    cadastro/
  (app)/           # Grupo autenticado
    layout.tsx     # Shell compartilhado
    dashboard/
```

### Alternatives Considered

- **Pages Router**: Descartado - App Router é o futuro do Next.js, melhor DX e performance
- **Create React App**: Descartado - Sem SSR/SSG, pior performance, sem otimizações automáticas

---

## 2. State Management e Data Fetching

### Decision

TanStack Query v5 (React Query) para server state + useState/useReducer para UI state local.

### Rationale

- **React Query**: Cache automático, refetch inteligente, otimistic updates, retry com exponential backoff
- **Sem estado global complexo**: YAGNI - não há necessidade de Redux/Zustand para este escopo
- **Configuração**: stale time 30s, cache time 5min (conforme clarificações)

### Implementation Patterns

#### Query Client Setup

```typescript
// infra/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 segundos
      cacheTime: 5 * 60 * 1000, // 5 minutos
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

#### Custom Hook Pattern

```typescript
// features/receitas/hooks/useOneTimeRevenues.ts
export function useOneTimeRevenues(year: number, month: number) {
  return useQuery({
    queryKey: ["one-time-revenues", year, month],
    queryFn: () => ReceitasService.getOneTime(year, month),
  });
}
```

#### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: ReceitasService.create,
  onMutate: async (newRevenue) => {
    await queryClient.cancelQueries(["one-time-revenues"]);
    const previous = queryClient.getQueryData(["one-time-revenues"]);
    queryClient.setQueryData(["one-time-revenues"], (old) => [...old, newRevenue]);
    return { previous };
  },
  onError: (err, newRevenue, context) => {
    queryClient.setQueryData(["one-time-revenues"], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(["one-time-revenues"]);
  },
});
```

### Alternatives Considered

- **SWR**: Descartado - React Query tem melhor DX, mais features (mutations, optimistic updates)
- **Redux Toolkit**: Descartado - Overhead desnecessário para este escopo, React Query resolve server state
- **Zustand**: Descartado - Não há necessidade de estado global complexo

---

## 3. Form Management e Validation

### Decision

React Hook Form + Zod para validação de schemas.

### Rationale

- **React Hook Form**: Performance (uncontrolled forms), validação integrada, menos re-renders
- **Zod**: Type-safe schemas, reutilização de schemas da API, validação runtime + compile-time
- **Debounce 500ms**: Conforme clarificações, validar onChange com debounce para melhor UX

### Implementation Patterns

#### Schema Definition

```typescript
// features/receitas/types/schemas.ts
import { z } from "zod";

export const oneTimeRevenueSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive().multipleOf(0.01),
  competenceYear: z.number().int().min(2000),
  competenceMonth: z.number().int().min(1).max(12),
});

export type OneTimeRevenueInput = z.infer<typeof oneTimeRevenueSchema>;
```

#### Form Component

```typescript
// features/receitas/components/OneTimeRevenueForm.tsx
"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function OneTimeRevenueForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(oneTimeRevenueSchema),
    mode: 'onChange', // Validar onChange
    delayError: 500,   // Debounce 500ms
  });

  const onSubmit = (data: OneTimeRevenueInput) => {
    // mutation.mutate(data)
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('description')} />
      {errors.description && <span>{errors.description.message}</span>}
    </form>
  );
}
```

### Alternatives Considered

- **Formik**: Descartado - Performance inferior, mais boilerplate
- **Yup**: Descartado - Zod é type-safe e integra melhor com TypeScript
- **Validação manual**: Descartado - Muito boilerplate, propenso a erros

---

## 4. Styling e Design System

### Decision

Tailwind CSS + Shadcn/ui como base de componentes, customizado para tokens do design.

### Rationale

- **Tailwind**: Utility-first, tree-shaking automático, design consistente via config
- **Shadcn/ui**: Componentes acessíveis (Radix UI), copiáveis (não npm package), customizáveis
- **Design Tokens**: Configurados em `tailwind.config.js` para bater 100% com protótipo

### Implementation Patterns

#### Tailwind Config

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: "#c0292a",
          light: "#fdf1f1",
          mid: "#e8a0a0",
        },
        bg: "#faf9f8",
        surface: "#ffffff",
        border: "#e8e5e2",
        text: {
          DEFAULT: "#1a1614",
          muted: "#6b6460",
          subtle: "#a09c98",
        },
        green: {
          DEFAULT: "#1a7a4a",
          light: "#f0faf5",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
      width: {
        nav: "236px",
      },
    },
  },
};
```

#### Component Customization

```typescript
// shared/components/Button.tsx (baseado em shadcn/ui)
import { cn } from '@/shared/lib/utils';

export function Button({ className, variant = 'default', ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded font-medium transition-colors',
        variant === 'default' && 'bg-red text-white hover:bg-red/90',
        variant === 'outline' && 'border border-border hover:bg-bg',
        className
      )}
      {...props}
    />
  );
}
```

### Alternatives Considered

- **CSS Modules**: Descartado - Mais verboso, sem utility classes
- **Styled Components**: Descartado - Runtime overhead, bundle size maior
- **Material UI**: Descartado - Design muito opinado, difícil customizar 100%

---

## 5. Routing e Navigation Adapters

### Decision

Criar adapters para isolar APIs do Next.js (useRouter, useSearchParams) da lógica de negócio.

### Rationale

- **Independência de Framework**: Princípio III da constituição frontend
- **Testabilidade**: Hooks de negócio podem ser testados sem Next.js
- **Portabilidade**: Lógica reutilizável fora do contexto Next.js

### Implementation Patterns

#### Router Adapter

```typescript
// infra/router-adapter.ts
import {
  useRouter as useNextRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export interface RouterAdapter {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
}

export function useRouter(): RouterAdapter {
  const router = useNextRouter();
  return {
    push: router.push,
    replace: router.replace,
    back: router.back,
  };
}

export function useSearchParams() {
  const params = useNextSearchParams();
  return {
    get: (key: string) => params.get(key),
    getAll: (key: string) => params.getAll(key),
  };
}
```

#### Usage in Business Hooks

```typescript
// features/auth/hooks/useAuth.ts
import { useRouter } from "@/infra/router-adapter";

export function useAuth() {
  const router = useRouter();

  const login = (userId: string) => {
    // lógica de autenticação
    router.push("/dashboard");
  };

  return { login };
}
```

### Alternatives Considered

- **Uso direto de Next.js APIs**: Descartado - Viola princípio de independência de framework
- **Context API para routing**: Descartado - Overhead desnecessário, adapters são mais simples

---

## 6. API Client e Error Handling

### Decision

Axios wrapper com interceptors + Toast notifications para erros.

### Rationale

- **Axios**: Interceptors para auth headers, retry automático, timeout configurável
- **Centralized Error Handling**: Interceptor captura erros e dispara toasts
- **Toast Notifications**: Conforme clarificações, não-bloqueantes com retry button

### Implementation Patterns

#### API Client

```typescript
// infra/api-client.ts
import axios from "axios";
import { toast } from "@/shared/hooks/useToast";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});

// Request interceptor - adiciona auth header
apiClient.interceptors.request.use((config) => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    config.headers["X-User-Id"] = userId;
  }
  return config;
});

// Response interceptor - trata erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Erro ao comunicar com o servidor";
    toast.error(message, {
      action: {
        label: "Tentar novamente",
        onClick: () => apiClient.request(error.config),
      },
    });
    return Promise.reject(error);
  },
);

export { apiClient };
```

#### Service Layer

```typescript
// features/receitas/services/ReceitasService.ts
import { apiClient } from "@/infra/api-client";

export const ReceitasService = {
  getOneTime: async (year: number, month: number) => {
    const { data } = await apiClient.get("/revenues/one-time", {
      params: { competenceYear: year, competenceMonth: month },
    });
    return data;
  },

  create: async (revenue: OneTimeRevenueInput) => {
    const { data } = await apiClient.post("/revenues/one-time", revenue);
    return data;
  },
};
```

### Alternatives Considered

- **Fetch API**: Descartado - Sem interceptors nativos, mais boilerplate
- **tRPC**: Descartado - Backend já existe com REST, não vale migração

---

## 7. Loading States e Empty States

### Decision

Skeleton screens para loading + Empty states com ilustração + mensagem + CTA.

### Rationale

- **Skeleton Screens**: Conforme clarificações, mantém estrutura da página, melhor percepção de performance
- **Empty States**: Conforme clarificações, ilustração + mensagem descritiva + botão de ação primária
- **Suspense Boundaries**: Aproveitar Suspense do React 18 para loading declarativo

### Implementation Patterns

#### Skeleton Component

```typescript
// shared/components/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-border rounded', className)} />
  );
}

// Usage
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" /> {/* KPI cards */}
      <Skeleton className="h-64 w-full" /> {/* Chart */}
      <Skeleton className="h-48 w-full" /> {/* Table */}
    </div>
  );
}
```

#### Empty State Component

```typescript
// shared/components/EmptyState.tsx
export function EmptyState({
  illustration,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <img src={illustration} alt="" className="w-48 h-48 mb-4" />
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="text-text-muted mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

### Alternatives Considered

- **Spinner centralizado**: Descartado - Pior UX, não mantém estrutura da página
- **Mensagem de texto simples**: Descartado - Menos engajamento, sem CTA claro

---

## 8. Accessibility (A11y)

### Decision

Acessibilidade básica: navegação por Tab, Enter/Escape em modais, labels semânticos.

### Rationale

- **Conforme clarificações**: Nível básico equilibra usabilidade e esforço
- **Shadcn/ui**: Já fornece componentes acessíveis (baseados em Radix UI)
- **Semantic HTML**: Usar tags corretas (button, nav, main, etc.)

### Implementation Patterns

#### Keyboard Navigation

```typescript
// shared/components/Modal.tsx
"use client";
export function Modal({ isOpen, onClose, children }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <div role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

#### Semantic Labels

```typescript
<button aria-label="Navegar para mês anterior" onClick={previousMonth}>
  <ChevronLeft />
</button>
```

### Alternatives Considered

- **WCAG 2.1 AA completo**: Descartado - Overhead desnecessário para MVP
- **Sem requisitos de a11y**: Descartado - Viola boas práticas básicas

---

## 9. Responsive Design

### Decision

Mobile-first com breakpoint em 768px, sidebar condicional + bottom nav.

### Rationale

- **Breakpoint 768px**: Conforme especificação, separa mobile de desktop
- **Mobile**: Sidebar oculta + bottom nav com 5 ícones + hamburger menu
- **Desktop**: Sidebar fixa 236px + sem bottom nav

### Implementation Patterns

#### Responsive Hook

```typescript
// shared/hooks/useMediaQuery.ts
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery("(max-width: 768px)");
```

#### App Shell

```typescript
// shared/components/AppShell.tsx
export function AppShell({ children }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Sidebar - desktop sempre visível, mobile condicional */}
      <aside className={cn(
        'w-nav bg-surface border-r border-border',
        isMobile && !sidebarOpen && 'hidden'
      )}>
        <Sidebar />
      </aside>

      <main className="flex-1 overflow-auto">
        {isMobile && <MobileHeader onMenuClick={() => setSidebarOpen(true)} />}
        {children}
        {isMobile && <BottomNav />}
      </main>
    </div>
  );
}
```

### Alternatives Considered

- **Breakpoint 640px (Tailwind sm)**: Descartado - Especificação define 768px
- **Drawer permanente**: Descartado - Especificação requer bottom nav em mobile

---

## 10. Monetary Formatting

### Decision

Formato brasileiro R$ 1.234,56 usando Intl.NumberFormat.

### Rationale

- **Conforme clarificações**: Padrão brasileiro com símbolo, separador de milhar, 2 decimais
- **Intl.NumberFormat**: API nativa, sem dependências, suporte a localização

### Implementation Patterns

#### Format Utility

```typescript
// shared/lib/formatCurrency.ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Usage
formatCurrency(1234.56); // "R$ 1.234,56"
```

### Alternatives Considered

- **Biblioteca externa (currency.js)**: Descartado - Intl.NumberFormat é suficiente
- **Formatação manual**: Descartado - Propenso a erros, não suporta localização

---

## Summary

Todas as decisões técnicas foram tomadas com base em:

1. **Requisitos da especificação**: Stack obrigatória, design tokens, comportamentos
2. **Clarificações**: 10 decisões de design/UX confirmadas
3. **Constituição v1.1.0**: Princípios frontend I-V respeitados
4. **Best Practices**: Padrões da indústria para Next.js, React, TypeScript

Próximos passos: Phase 1 - Data Model e Contracts.
