import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import { ToastContainer } from "@/shared/components/Toast";
import { RouterStubProvider, createRouterStub, type RouterStub } from "./router";

/**
 * `app/providers.tsx` é inutilizável em teste: prende o singleton de
 * `infra/query-client.ts` (retry: 3 + backoff exponencial → uma query que falha
 * levaria ~7 s e estouraria o timeout de 5 s) e monta o ReactQueryDevtools.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity, // sem timer de GC disparando após o teardown
        staleTime: 0, // todo mount refaz a query — invalidação fica observável
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export interface ProvidersOptions {
  queryClient?: QueryClient;
  router?: RouterStub;
  pathname?: string;
  searchParams?: URLSearchParams;
  /**
   * Monta o ToastContainer real para assertar a renderização do toast.
   * Desligado por padrão: ele assina a fila global do useToast e o setTimeout de
   * 5 s vazaria para testes vizinhos.
   */
  withToasts?: boolean;
}

function buildWrapper({
  queryClient,
  router,
  pathname,
  searchParams,
  withToasts,
}: Required<ProvidersOptions>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterStubProvider router={router} pathname={pathname} searchParams={searchParams}>
          {children}
          {withToasts ? <ToastContainer /> : null}
        </RouterStubProvider>
      </QueryClientProvider>
    );
  };
}

function resolve(options: ProvidersOptions): Required<ProvidersOptions> {
  return {
    queryClient: options.queryClient ?? createTestQueryClient(),
    router: options.router ?? createRouterStub(),
    pathname: options.pathname ?? "/dashboard",
    searchParams: options.searchParams ?? new URLSearchParams(),
    withToasts: options.withToasts ?? false,
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  const { queryClient, router, pathname, searchParams, withToasts, ...rtlOptions } = options;
  const resolved = resolve({ queryClient, router, pathname, searchParams, withToasts });
  return {
    queryClient: resolved.queryClient,
    router: resolved.router,
    ...render(ui, { wrapper: buildWrapper(resolved), ...rtlOptions }),
  };
}

/** `renderHook` vem do RTL 16 — o pacote @testing-library/react-hooks foi removido. */
export function renderHookWithProviders<Result, Props>(
  hook: (initialProps: Props) => Result,
  options: ProvidersOptions & Omit<RenderHookOptions<Props>, "wrapper"> = {},
) {
  const { queryClient, router, pathname, searchParams, withToasts, ...rtlOptions } = options;
  const resolved = resolve({ queryClient, router, pathname, searchParams, withToasts });
  return {
    queryClient: resolved.queryClient,
    router: resolved.router,
    ...renderHook(hook, { wrapper: buildWrapper(resolved), ...rtlOptions }),
  };
}
