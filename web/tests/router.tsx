/**
 * Stubs de roteamento para testes.
 *
 * ⚠️ Este arquivo usa deep imports INTERNOS do Next, fixados em `next@15.0.3`:
 *   next/dist/shared/lib/app-router-context.shared-runtime
 *   next/dist/shared/lib/hooks-client-context.shared-runtime
 *
 * É deliberado. A alternativa — `vi.mock("next/navigation")` — também quebraria
 * `next/link`, que lê os MESMOS contextos, degradando os testes de
 * Sidebar/BottomNav a checagem de markup. Concentrar os deep imports aqui deixa
 * o raio de impacto de um upgrade do Next em UM arquivo: se os testes de rota
 * quebrarem após atualizar o Next, reconfira estes dois caminhos.
 */
import type { ReactNode } from "react";
import { vi, type Mock } from "vitest";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathParamsContext,
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";

export type RouterStub = AppRouterInstance & {
  push: Mock;
  replace: Mock;
  back: Mock;
  forward: Mock;
  refresh: Mock;
  prefetch: Mock;
};

export function createRouterStub(): RouterStub {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as RouterStub;
}

interface RouterStubProviderProps {
  router: RouterStub;
  pathname: string;
  searchParams: URLSearchParams;
  children: ReactNode;
}

export function RouterStubProvider({
  router,
  pathname,
  searchParams,
  children,
}: RouterStubProviderProps) {
  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={searchParams as never}>
          <PathParamsContext.Provider value={{}}>{children}</PathParamsContext.Provider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

/**
 * Para o OUTRO consumidor: `@/infra/router-adapter`, que já é uma costura.
 * Uso no arquivo de teste:
 *
 *   vi.mock("@/infra/router-adapter", () => ({
 *     useRouter: () => routerAdapterMock,
 *     useSearchParams: () => searchParamsMock,
 *   }));
 */
export const routerAdapterMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
};

export const searchParamsMock = {
  get: vi.fn<(key: string) => string | null>(() => null),
  getAll: vi.fn<(key: string) => string[]>(() => []),
};
