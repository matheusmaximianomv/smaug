import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@/features/auth/types";
import { setMatchMedia } from "../../vitest.setup";
import { RouterStubProvider, createRouterStub } from "../../tests/router";
import { AppShell } from "./AppShell";

const authMock = vi.hoisted(() => ({
  user: null as User | null,
  logout: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

function renderShell() {
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
  return render(
    <AppShell>
      <p>Conteúdo da página</p>
    </AppShell>,
    { wrapper: Wrapper },
  );
}

afterEach(() => {
  setMatchMedia(false);
  authMock.user = null;
});

describe("AppShell no desktop", () => {
  it("mostra a sidebar e nenhuma barra inferior", () => {
    setMatchMedia(false);

    renderShell();

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Navegação inferior" }),
    ).not.toBeInTheDocument();
  });

  it("não mostra a barra superior com botão de menu", () => {
    setMatchMedia(false);

    renderShell();

    expect(screen.queryByRole("button", { name: "Abrir menu" })).not.toBeInTheDocument();
  });
});

describe("AppShell no mobile", () => {
  it("mostra a barra superior com Abrir menu e a navegação inferior", () => {
    setMatchMedia(true);

    renderShell();

    expect(screen.getByRole("button", { name: "Abrir menu" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegação inferior" })).toBeInTheDocument();
  });

  it("não mostra a sidebar fixa antes de abrir o menu", () => {
    setMatchMedia(true);

    renderShell();

    expect(
      screen.queryByRole("navigation", { name: "Navegação principal" }),
    ).not.toBeInTheDocument();
  });

  it("Abrir menu revela a sidebar", async () => {
    setMatchMedia(true);
    renderShell();

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });

  it("clicar no overlay fecha a sidebar", async () => {
    setMatchMedia(true);
    const { container } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));

    await userEvent.click(container.querySelector(".bg-black\\/40")!);

    expect(
      screen.queryByRole("navigation", { name: "Navegação principal" }),
    ).not.toBeInTheDocument();
  });

  it("mostra as iniciais do usuário no avatar", () => {
    setMatchMedia(true);
    authMock.user = { id: "u1", name: "João Silva", email: "j@e.com", createdAt: "" };

    renderShell();

    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it('mostra "?" quando não há usuário carregado', () => {
    setMatchMedia(true);
    authMock.user = null;

    renderShell();

    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

describe("AppShell: conteúdo", () => {
  it.each([false, true])("renderiza os children dentro do main (mobile: %s)", (mobile) => {
    setMatchMedia(mobile);

    renderShell();

    expect(screen.getByRole("main")).toHaveTextContent("Conteúdo da página");
  });
});
