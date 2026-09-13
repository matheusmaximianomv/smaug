import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathParamsContext,
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { createRouterStub } from "../tests/router";
import { useRouter, useSearchParams } from "./router-adapter";

/**
 * O adapter existe justamente para que hooks de negócio não importem
 * `next/navigation`. Aqui montamos os contextos reais do Next — os mesmos que
 * `tests/router.tsx` usa — para provar a delegação.
 */
function wrapperWith(searchParams: URLSearchParams | null, router = createRouterStub()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value="/dashboard">
          <SearchParamsContext.Provider value={searchParams as never}>
            <PathParamsContext.Provider value={{}}>{children}</PathParamsContext.Provider>
          </SearchParamsContext.Provider>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    );
  }
  return { Wrapper, router };
}

describe("useRouter", () => {
  it("expõe apenas push, replace e back", () => {
    const { Wrapper } = wrapperWith(new URLSearchParams());

    const { result } = renderHook(() => useRouter(), { wrapper: Wrapper });

    expect(Object.keys(result.current).sort()).toEqual(["back", "push", "replace"]);
  });

  it("delega push ao router do contexto", () => {
    const { Wrapper, router } = wrapperWith(new URLSearchParams());

    const { result } = renderHook(() => useRouter(), { wrapper: Wrapper });
    result.current.push("/receitas");

    expect(router.push).toHaveBeenCalledWith("/receitas");
  });

  it("delega replace ao router do contexto", () => {
    const { Wrapper, router } = wrapperWith(new URLSearchParams());

    const { result } = renderHook(() => useRouter(), { wrapper: Wrapper });
    result.current.replace("/login");

    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("delega back ao router do contexto", () => {
    const { Wrapper, router } = wrapperWith(new URLSearchParams());

    const { result } = renderHook(() => useRouter(), { wrapper: Wrapper });
    result.current.back();

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe("useSearchParams", () => {
  it("devolve o valor do parâmetro presente", () => {
    const { Wrapper } = wrapperWith(new URLSearchParams("tab=fixas"));

    const { result } = renderHook(() => useSearchParams(), { wrapper: Wrapper });

    expect(result.current.get("tab")).toBe("fixas");
  });

  it("devolve null para parâmetro ausente", () => {
    const { Wrapper } = wrapperWith(new URLSearchParams("tab=fixas"));

    const { result } = renderHook(() => useSearchParams(), { wrapper: Wrapper });

    expect(result.current.get("ano")).toBeNull();
  });

  it("devolve todos os valores repetidos de um parâmetro", () => {
    const { Wrapper } = wrapperWith(new URLSearchParams("tipo=fixa&tipo=avulsa"));

    const { result } = renderHook(() => useSearchParams(), { wrapper: Wrapper });

    expect(result.current.getAll("tipo")).toEqual(["fixa", "avulsa"]);
  });

  it("devolve lista vazia para parâmetro ausente", () => {
    const { Wrapper } = wrapperWith(new URLSearchParams("tab=fixas"));

    const { result } = renderHook(() => useSearchParams(), { wrapper: Wrapper });

    expect(result.current.getAll("tipo")).toEqual([]);
  });

  it("devolve null quando não há contexto de search params", () => {
    const { Wrapper } = wrapperWith(null);

    const { result } = renderHook(() => useSearchParams(), { wrapper: Wrapper });

    expect(result.current.get("tab")).toBeNull();
  });

  it("devolve lista vazia quando não há contexto de search params", () => {
    const { Wrapper } = wrapperWith(null);

    const { result } = renderHook(() => useSearchParams(), { wrapper: Wrapper });

    expect(result.current.getAll("tipo")).toEqual([]);
  });
});
