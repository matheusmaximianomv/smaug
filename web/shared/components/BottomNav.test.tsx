import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RouterStubProvider, createRouterStub } from "../../tests/router";
import { BottomNav } from "./BottomNav";

function renderBottomNav(pathname = "/dashboard") {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RouterStubProvider
        router={createRouterStub()}
        pathname={pathname}
        searchParams={new URLSearchParams()}
      >
        {children}
      </RouterStubProvider>
    );
  }
  return render(<BottomNav />, { wrapper: Wrapper });
}

const NAV = () => screen.getByRole("navigation", { name: "Navegação inferior" });

describe("BottomNav", () => {
  it("expõe a navegação inferior rotulada, distinta da principal", () => {
    renderBottomNav();

    expect(NAV()).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Navegação principal" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["Dashboard", "/dashboard"],
    ["Receitas", "/receitas"],
    ["Despesas", "/despesas"],
    ["Categorias", "/categorias"],
    ["Histórico", "/historico"],
    ["Dados", "/dados"],
  ])('o link "%s" aponta para %s', (label, href) => {
    renderBottomNav();

    expect(within(NAV()).getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  it("tem exatamente 6 links", () => {
    renderBottomNav();

    expect(within(NAV()).getAllByRole("link")).toHaveLength(6);
  });

  it("destaca o link ativo por igualdade de pathname", () => {
    renderBottomNav("/categorias");

    expect(within(NAV()).getByRole("link", { name: "Categorias" })).toHaveClass("text-red");
    expect(within(NAV()).getByRole("link", { name: "Dashboard" })).toHaveClass("text-text-muted");
  });

  it("destaca o link ativo por prefixo de rota", () => {
    renderBottomNav("/despesas/parcelada/1");

    expect(within(NAV()).getByRole("link", { name: "Despesas" })).toHaveClass("text-red");
  });

  it("mescla o className recebido", () => {
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <RouterStubProvider
          router={createRouterStub()}
          pathname="/dashboard"
          searchParams={new URLSearchParams()}
        >
          {children}
        </RouterStubProvider>
      );
    }

    render(<BottomNav className="fixed" />, { wrapper: Wrapper });

    expect(NAV()).toHaveClass("fixed", "flex");
  });
});
