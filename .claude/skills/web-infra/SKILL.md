---
name: web-infra
description: Camada infra do web do Smaug — api-client (só 401 encerra sessão), tabela de mensagens de api-error.ts e sua ordem de resolução, session.ts (cookie userId como fonte única), navigation.ts como seam de teste, router-adapter e query-client.
---

# `infra/` — cliente HTTP, erros, sessão e navegação

## Quando usar esta skill

Ao mexer em `web/infra/*`, ao adicionar um código de erro da API, ou quando precisar de sessão,
navegação ou configuração do TanStack Query.

## `infra/api-client.ts` — a única instância axios

```ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const userId = getUserId();
  if (userId && config.headers) {
    config.headers["X-User-Id"] = userId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Só 401 encerra a sessão. Falha de rede ou 5xx são transitórios e não devem
    // derrubar o login — quem chamou trata o erro.
    if (error.response?.status === 401) {
      clearUserId();
      redirectToLogin();
    }
    return Promise.reject(error);
  },
);

export { apiClient };
```

Regras:

1. **Só 401 encerra a sessão.** Rede fora e 5xx são transitórios — nunca deslogue por causa deles.
2. O header `X-User-Id` é injetado aqui, lendo o cookie. Nenhum service monta esse header.
3. `NEXT_PUBLIC_API_URL` é **inlinado em tempo de build** — o `next build` precisa rodar com o valor
   certo, e o Vitest o fixa em `test.env` (ver skill `web-testes`).

## `infra/api-error.ts` — a tabela de mensagens

Estrutura: uma `const MESSAGES: Record<string, string>` **privada**, com cabeçalho JSDoc
`/** Mensagens em pt-BR para os códigos de erro emitidos pela API. */`, agrupada por blocos
separados por linha em branco, nesta ordem: genéricos → usuário → categoria → códigos de
"não encontrado" → códigos de regra de data → códigos de estado → códigos de parcelamento.
~35 entradas. A chave é o `error` SCREAMING_SNAKE que o server devolve; o valor é uma frase completa
em pt-BR terminando em ponto.

```ts
interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
}

const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Dados inválidos. Revise os campos e tente novamente.",
  UNAUTHORIZED: "Sessão inválida. Faça login novamente.",

  USER_NOT_FOUND: "Usuário não encontrado.",
  EMAIL_ALREADY_EXISTS: "Já existe uma conta com este e-mail.",
  // ...
  INSTALLMENT_FINANCIAL_IMMUTABLE:
    "Valor total e número de parcelas não podem ser alterados após a criação.",
  NO_FUTURE_INSTALLMENTS: "Não há parcelas futuras para encerrar.",
};
```

Duas funções exportadas, ambas recebendo `error: unknown` e fazendo o cast internamente:

```ts
export function isInvalidSessionError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 401 || status === 404;
}

export function getApiErrorMessage(error: unknown, fallback: string): string;
```

**Ordem de resolução de `getApiErrorMessage` (decore, os testes dependem dela):**

1. Se o corpo tem `error === "VALIDATION_ERROR"` **e** `details`, devolve o **primeiro detalhe de
   campo** (`Object.values(body.details).flat()[0]`).
2. Senão, procura `MESSAGES[body.error]`.
3. `code === "ECONNABORTED"` → `"A requisição demorou demais. Verifique sua conexão e tente novamente."`
4. Sem `response` mas com `request` (offline) → `"Não foi possível falar com o servidor. Verifique sua conexão."`
5. Caso contrário, o `fallback` que o chamador passou.

**Regra operacional**: código de erro novo no server entra nessa tabela **no mesmo PR**. Sem isso o
usuário vê o texto genérico de fallback. Nunca escreva a mensagem à mão dentro de um componente ou
hook — sempre `getApiErrorMessage(error, "Erro ao ….")`.

## `infra/session.ts` — o cookie é a fonte única

```ts
const COOKIE_NAME = "userId";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function getUserId(): string | null;
export function setUserId(userId: string): void;
export function clearUserId(): void;
```

- Toda função começa com guarda de SSR: `if (typeof document === "undefined") return ...;`
- Cookie escrito como
  `` `${COOKIE_NAME}=${encodeURIComponent(userId)};path=/;max-age=${MAX_AGE_SECONDS};SameSite=Lax` ``
- **Não existe cópia em `localStorage`, e isso é deliberado**: manter dois armazenamentos fez eles
  divergirem — cookie presente com `localStorage` vazio colocava o app num laço infinito
  `/login` ↔ `/dashboard`. O `middleware.ts` lê **esse mesmo cookie** no servidor.

## `infra/navigation.ts` — seam de teste

```ts
/** Manda o usuário para o login, a menos que ele já esteja lá. */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.href = "/login";
}
```

Existe porque `window.location` **não é configurável no jsdom 29** — não dá para espionar. Toda
navegação "dura" passa por aqui, e os testes fazem mock deste módulo.

## `infra/router-adapter.ts` — Next atrás de uma interface

```ts
"use client";

export interface RouterAdapter {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
}

export function useRouter(): RouterAdapter;
export function useSearchParams(); // { get(key), getAll(key) }
```

**Hook de negócio nunca importa `useRouter`/`useSearchParams` de `next/navigation`** — é regra
normativa da constituição (princípio III do frontend). Passe por este adapter.
(`Sidebar.tsx` importa `usePathname` direto porque o adapter não cobre esse caso; se precisar dele
em hook, estenda o adapter.)

## `infra/query-client.ts` — singleton

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 1 },
  },
});
```

Consumido por `app/providers.tsx`. **Nunca use este singleton em teste** — use
`createTestQueryClient()` (skill `web-testes`), senão o `retry: 3` faz os testes de erro pendurarem.

## Estilo da pasta

Arquivos planos, **kebab-case** (`api-client.ts`, `api-error.ts`, `router-adapter.ts`,
`query-client.ts`), só exports nomeados, sem barril, imports internos relativos (`./session`).

## Checklist — adicionar um código de erro novo

- [ ] Classe de erro no `server/src/domain/errors/domain-error.ts` (skill `server-erros-dominio`).
- [ ] Controller mapeando para o status certo.
- [ ] Entrada em `MESSAGES` de `infra/api-error.ts`, no bloco temático correspondente, em pt-BR,
      terminando em ponto.
- [ ] Teste em `infra/api-error.test.ts`.
- [ ] Se algum fluxo de tela depender dele, teste de integração de página assertando a mensagem.

## Não faça

- Não crie uma segunda instância de axios.
- Não deslogue o usuário em erro de rede ou 5xx.
- Não guarde `userId` em `localStorage`.
- Não espione `window.location` no teste — use o seam `@/infra/navigation`.
- Não importe `next/navigation` em hook de negócio.
- Não use o `queryClient` singleton em teste.
