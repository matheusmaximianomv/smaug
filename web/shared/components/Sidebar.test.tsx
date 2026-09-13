import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@/features/auth/types";
import { RouterStubProvider, createRouterStub } from "../../tests/router";
import { Sidebar } from "./Sidebar";

/**
 * `useAuth` faz uma requisição no mount e lê o cookie; aqui o assunto é a
 * navegação, então ele vira um duplo.
 */
const authMock = vi.hoisted(() => ({
  user: null as User | null,
  logout: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

function renderSidebar(pathname = "/dashboard") {
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
  return render(<Sidebar />, { wrapper: Wrapper });
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
  ])('o link "%s" aponta para %s', (label, href) => {
    renderSidebar();

    expect(within(NAV()).getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  it("tem exatamente 5 links", () => {
    renderSidebar();

    expect(within(NAV()).getAllByRole("link")).toHaveLength(5);
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
    authMock.user = { id: "u1", name: "João Silva", email: "j@e.com", createdAt: "" };

    renderSidebar();

    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("mostra uma inicial só quando o nome tem uma palavra", () => {
    authMock.user = { id: "u1", name: "Maria", email: "m@e.com", createdAt: "" };

    renderSidebar();

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("limita as iniciais a dois caracteres", () => {
    authMock.user = { id: "u1", name: "Ana Beatriz Costa", email: "a@e.com", createdAt: "" };

    renderSidebar();

    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it('mostra "?" quando não há usuário carregado', () => {
    authMock.user = null;

    renderSidebar();

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("chama logout ao clicar em Sair", async () => {
    authMock.user = { id: "u1", name: "João Silva", email: "j@e.com", createdAt: "" };

    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(authMock.logout).toHaveBeenCalledTimes(1);
  });
});
