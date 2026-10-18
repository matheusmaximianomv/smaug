import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterStubProvider, createRouterStub } from "../../tests/router";
import { Sidebar, type ShellUser } from "./Sidebar";

const onLogout = vi.fn();
const onLogoutAll = vi.fn();

function renderSidebar(pathname = "/dashboard", user: ShellUser | null = null) {
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
  return render(<Sidebar user={user} onLogout={onLogout} onLogoutAll={onLogoutAll} />, {
    wrapper: Wrapper,
  });
}

const NAV = () => screen.getByRole("navigation", { name: "Navegação principal" });

describe("Sidebar: navegação", () => {
  it("expõe a navegação principal rotulada", () => {
    renderSidebar();

    expect(NAV()).toBeInTheDocument();
  });

  it.each([
    ["Dashboard", "/dashboard"],
    ["Receitas", "/receitas"],
    ["Despesas", "/despesas"],
    ["Categorias", "/categorias"],
    ["Histórico", "/historico"],
    ["Dados", "/dados"],
  ])('o link "%s" aponta para %s', (label, href) => {
    renderSidebar();

    expect(within(NAV()).getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  it("tem exatamente 6 links", () => {
    renderSidebar();

    expect(within(NAV()).getAllByRole("link")).toHaveLength(6);
  });

  it("destaca o link ativo por pathname exato", () => {
    renderSidebar("/receitas");

    expect(within(NAV()).getByRole("link", { name: "Receitas" })).toHaveClass("text-red");
    expect(within(NAV()).getByRole("link", { name: "Despesas" })).not.toHaveClass("text-red");
  });

  it("destaca o link ativo por prefixo de rota", () => {
    renderSidebar("/receitas/123");

    expect(within(NAV()).getByRole("link", { name: "Receitas" })).toHaveClass("text-red");
  });
});

describe("Sidebar: usuário", () => {
  it("mostra as iniciais de um nome composto", () => {
    renderSidebar("/dashboard", { name: "João Silva" });

    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("mostra uma inicial só quando o nome tem uma palavra", () => {
    renderSidebar("/dashboard", { name: "Maria" });

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("limita as iniciais a dois caracteres", () => {
    renderSidebar("/dashboard", { name: "Ana Beatriz Costa" });

    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it('mostra "?" quando não há usuário carregado', () => {
    renderSidebar("/dashboard", null);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("chama onLogout ao clicar em Sair", async () => {
    renderSidebar("/dashboard", { name: "João Silva" });
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onLogoutAll).not.toHaveBeenCalled();
  });

  it('chama onLogoutAll ao clicar em "Sair de todos os dispositivos"', async () => {
    renderSidebar("/dashboard", { name: "João Silva" });
    await userEvent.click(screen.getByRole("button", { name: "Sair de todos os dispositivos" }));

    expect(onLogoutAll).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();
  });
});
