import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { User } from "@/features/auth/types";
import AppLayout from "@/app/(app)/layout";
import AuthLayout from "@/app/(auth)/layout";
import { renderWithProviders } from "../render";

const authMock = vi.hoisted(() => ({
  user: null as User | null,
  logout: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

describe("layout das rotas autenticadas", () => {
  it("envolve o conteúdo no AppShell, com a navegação principal", () => {
    renderWithProviders(
      <AppLayout>
        <p>Conteúdo da página</p>
      </AppLayout>,
    );

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Conteúdo da página");
  });
});

describe("layout das rotas de autenticação", () => {
  it("centraliza o conteúdo sem shell de aplicação", () => {
    renderWithProviders(
      <AuthLayout>
        <p>Formulário de login</p>
      </AuthLayout>,
    );

    expect(screen.getByText("Formulário de login")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });
});
