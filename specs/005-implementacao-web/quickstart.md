# Quickstart: Implementação da Interface Web

**Feature**: 005-implementacao-web | **Date**: 2026-04-28

## Overview

Guia rápido para configurar, desenvolver e testar a interface web do Smaug em Next.js 15.

---

## Prerequisites

- Node.js 22 LTS
- npm (vem com Node.js)
- Backend API rodando em `http://localhost:3000` (ou configurado em `.env.local`)

---

## Setup

### 1. Instalar Dependências

```bash
cd web
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# Outras configurações (se necessário)
# NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### 3. Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:3001`

---

## Project Structure

```
web/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Rotas de autenticação
│   │   ├── cadastro/
│   │   └── login/
│   ├── (app)/            # Rotas autenticadas
│   │   ├── layout.tsx    # Shell com sidebar
│   │   ├── dashboard/
│   │   ├── receitas/
│   │   ├── despesas/
│   │   ├── categorias/
│   │   └── historico/
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
│
├── features/             # Módulos por domínio
│   ├── auth/
│   ├── dashboard/
│   ├── receitas/
│   ├── despesas/
│   ├── categorias/
│   └── historico/
│
├── shared/               # Componentes reutilizáveis
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
│
└── infra/                # Adapters externos
    ├── api-client.ts
    ├── router-adapter.ts
    ├── storage-adapter.ts
    └── query-client.ts
```

---

## Development Workflow

### 1. Criar Nova Feature

Exemplo: Adicionar nova funcionalidade em "receitas"

```bash
# Estrutura já existe, adicionar arquivos conforme necessário
web/features/receitas/
├── components/
│   └── NovoComponente.tsx
├── hooks/
│   └── useNovoHook.ts
├── services/
│   └── NovoService.ts
└── types/
    └── novos-tipos.ts
```

### 2. Criar Novo Componente Reutilizável

```bash
# Adicionar em shared/components
web/shared/components/
└── NovoComponente.tsx
```

### 3. Adicionar Nova Rota

```bash
# Criar pasta e page.tsx em app/
web/app/(app)/nova-rota/
└── page.tsx
```

---

## Common Tasks

### Adicionar Nova Dependência

```bash
npm install nome-do-pacote
```

### Rodar Linter

```bash
npm run lint
```

### Rodar Testes

```bash
# Todos os testes
npm test

# Modo watch
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Build para Produção

```bash
npm run build
```

### Iniciar Produção Localmente

```bash
npm run build
npm start
```

---

## Key Patterns

### 1. Criar Hook de Negócio

```typescript
// features/receitas/hooks/useOneTimeRevenues.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";

export function useOneTimeRevenues(year: number, month: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["one-time-revenues", year, month],
    queryFn: () => ReceitasService.getOneTime(year, month),
  });

  const createMutation = useMutation({
    mutationFn: ReceitasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["one-time-revenues"]);
    },
  });

  return {
    revenues: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    isCreating: createMutation.isLoading,
  };
}
```

### 2. Criar Service

```typescript
// features/receitas/services/ReceitasService.ts
import { apiClient } from "@/infra/api-client";
import type { OneTimeRevenue, OneTimeRevenueInput } from "../types";

export const ReceitasService = {
  getOneTime: async (year: number, month: number): Promise<OneTimeRevenue[]> => {
    const { data } = await apiClient.get("/revenues/one-time", {
      params: { competenceYear: year, competenceMonth: month },
    });
    return data;
  },

  create: async (revenue: OneTimeRevenueInput): Promise<OneTimeRevenue> => {
    const { data } = await apiClient.post("/revenues/one-time", revenue);
    return data;
  },

  update: async (id: string, revenue: Partial<OneTimeRevenueInput>): Promise<OneTimeRevenue> => {
    const { data } = await apiClient.put(`/revenues/one-time/${id}`, revenue);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/revenues/one-time/${id}`);
  },
};
```

### 3. Criar Componente com Form

```typescript
// features/receitas/components/OneTimeRevenueForm.tsx
"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { oneTimeRevenueSchema } from '../types/schemas';
import { Input, Button } from '@/shared/components';

export function OneTimeRevenueForm({ onSubmit, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(oneTimeRevenueSchema),
    mode: 'onChange',
    delayError: 500, // Debounce 500ms
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Descrição"
        error={errors.description?.message}
        {...register('description')}
      />
      <Input
        label="Valor"
        type="number"
        step="0.01"
        error={errors.amount?.message}
        {...register('amount', { valueAsNumber: true })}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
```

### 4. Criar Page com Server Component

```typescript
// app/(app)/receitas/page.tsx
import { ReceitasView } from '@/features/receitas/components/ReceitasView';

export default function ReceitasPage() {
  return <ReceitasView />;
}
```

### 5. Usar Adapter de Router

```typescript
// features/auth/hooks/useAuth.ts
import { useRouter } from "@/infra/router-adapter";
import { StorageAdapter } from "@/infra/storage-adapter";

export function useAuth() {
  const router = useRouter();

  const login = (userId: string) => {
    StorageAdapter.set("userId", userId);
    router.push("/dashboard");
  };

  const logout = () => {
    StorageAdapter.remove("userId");
    router.push("/login");
  };

  return { login, logout };
}
```

---

## Debugging

### 1. React Query Devtools

Já configurado em desenvolvimento. Acesse o ícone no canto inferior direito da tela.

### 2. Console Logs

```typescript
// Evite console.log em produção
if (process.env.NODE_ENV === "development") {
  console.log("Debug info:", data);
}
```

### 3. Network Tab

Use o Network tab do navegador para inspecionar requisições à API.

### 4. React DevTools

Instale a extensão React DevTools no navegador para inspecionar componentes.

---

## Environment Variables

### Desenvolvimento (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Produção (`.env.production`)

```env
NEXT_PUBLIC_API_URL=https://api.smaug.com
```

**Nota**: Variáveis com prefixo `NEXT_PUBLIC_` são expostas no cliente.

---

## Testing

### Estrutura de Testes

```
web/
├── features/
│   └── receitas/
│       └── hooks/
│           ├── useOneTimeRevenues.ts
│           └── useOneTimeRevenues.test.ts
└── shared/
    └── components/
        ├── Button.tsx
        └── Button.test.tsx
```

### Exemplo de Teste de Hook

```typescript
// features/receitas/hooks/useOneTimeRevenues.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOneTimeRevenues } from './useOneTimeRevenues';
import { ReceitasService } from '../services/ReceitasService';
import { vi } from 'vitest';

vi.mock('../services/ReceitasService');

describe('useOneTimeRevenues', () => {
  it('should fetch revenues for given month', async () => {
    const mockRevenues = [{ id: '1', description: 'Test', amount: 100 }];
    vi.mocked(ReceitasService.getOneTime).mockResolvedValue(mockRevenues);

    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useOneTimeRevenues(2026, 4), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.revenues).toEqual(mockRevenues);
  });
});
```

### Exemplo de Teste de Componente

```typescript
// shared/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { vi } from 'vitest';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when isLoading', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## Troubleshooting

### Problema: API não responde

**Solução**: Verifique se o backend está rodando:

```bash
cd backend
npm run dev
```

### Problema: Erro de CORS

**Solução**: Configure CORS no backend para aceitar `http://localhost:3001`

### Problema: Variáveis de ambiente não carregam

**Solução**:

1. Reinicie o servidor de desenvolvimento
2. Verifique se o arquivo `.env.local` existe
3. Verifique se as variáveis têm prefixo `NEXT_PUBLIC_`

### Problema: Tipos TypeScript não reconhecidos

**Solução**:

```bash
# Limpar cache do TypeScript
rm -rf .next
npm run dev
```

---

## Performance Tips

### 1. Use Server Components quando possível

```typescript
// ✅ Bom - Server Component (padrão)
export default async function DashboardPage() {
  return <DashboardView />;
}

// ❌ Evitar - Client Component desnecessário
"use client";
export default function DashboardPage() {
  return <DashboardView />;
}
```

### 2. Lazy load componentes pesados

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
```

### 3. Otimize imagens

```typescript
import Image from 'next/image';

<Image
  src="/images/logo.png"
  alt="Smaug"
  width={200}
  height={50}
  priority
/>
```

---

## Deployment

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy to Vercel (recomendado)

1. Conecte o repositório no Vercel
2. Configure variáveis de ambiente
3. Deploy automático em cada push

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)

---

## Visual Fidelity Validation Checklist

Para garantir 100% de fidelidade ao protótipo HTML (`smaug-handoff/project/Smaug Standalone.html`):

### Cores

- [ ] Vermelho principal: `#c0292a` (botões, badges, bordas)
- [ ] Vermelho claro: `#fdf1f1` (backgrounds)
- [ ] Vermelho médio: `#e8a0a0` (hover states)
- [ ] Verde: `#1a7a4a` (receitas, positivos)
- [ ] Verde claro: `#f0faf5` (backgrounds)
- [ ] Background: `#faf9f8`
- [ ] Surface: `#ffffff`
- [ ] Border: `#e8e5e2`
- [ ] Text: `#1a1614` (principal)
- [ ] Text muted: `#6b6460`
- [ ] Text subtle: `#a09c98`

### Tipografia

- [ ] Font family: Plus Jakarta Sans (todas as telas)
- [ ] Tamanhos de fonte correspondem ao protótipo
- [ ] Pesos de fonte (regular, medium, semibold, bold) aplicados corretamente

### Espaçamento

- [ ] Tolerância máxima: ±2px em relação ao protótipo
- [ ] Padding e margin de cards, botões e formulários
- [ ] Espaçamento entre elementos de lista
- [ ] Gaps em grids e flexbox layouts

### Layout

- [ ] Sidebar: 236px de largura (desktop >768px)
- [ ] Bottom nav: visível apenas em mobile (≤768px)
- [ ] Breakpoint mobile/desktop: 768px
- [ ] Grid e flexbox layouts idênticos ao protótipo

### Componentes

- [ ] Botões: altura, padding, border-radius, estados hover/active
- [ ] Cards: sombras, bordas, espaçamento interno
- [ ] Inputs: altura, padding, border, focus states
- [ ] Modais: largura, padding, overlay opacity
- [ ] Tabelas: espaçamento de células, bordas, header styles

### Validação Final

- [ ] Comparação lado-a-lado com protótipo HTML aberto
- [ ] Teste em diferentes resoluções (mobile, tablet, desktop)
- [ ] Verificação de estados interativos (hover, focus, active, disabled)

---

## Support

Para dúvidas ou problemas:

1. Consulte a documentação em `specs/005-implementacao-web/`
2. Verifique os contratos da API em `specs/002-receitas/contracts/` e `specs/003-despesas/contracts/`
3. Revise a constituição do projeto em `.specify/memory/constitution.md`
