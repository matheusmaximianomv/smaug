import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastroPage from "@/app/(auth)/cadastro/page";
import { getUserId } from "@/infra/session";
import { renderWithProviders } from "../render";
import { db, mockApiError, seedDb } from "../msw";
import { makeUser } from "../fixtures";

vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

function renderPage() {
  return renderWithProviders(<CadastroPage />, { pathname: "/cadastro" });
}

async function submit(name = "Maria Souza", email = "maria@example.com") {
  await userEvent.type(screen.getByLabelText("Nome"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));
}

describe("página de cadastro", () => {
  it("apresenta a chamada da página e o caminho para o login", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Criar conta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer login" })).toHaveAttribute("href", "/login");
  });

  it("cria a conta e mostra o id para copiar, sem criar sessão", async () => {
    renderPage();

    await submit();

    expect(await screen.findByText("Cadastro realizado com sucesso!")).toBeInTheDocument();
    expect(db.users).toHaveLength(1);
    // O cadastro não autentica: o usuário ainda precisa fazer login com o id.
    expect(getUserId()).toBeNull();
  });

  it("no 409 mostra que o e-mail já está em uso", async () => {
    seedDb({ users: [makeUser({ email: "maria@example.com" })] });
    renderPage();

    await submit();

    expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeInTheDocument();
    expect(screen.queryByText("Cadastro realizado com sucesso!")).not.toBeInTheDocument();
  });

  it("no 500 mostra a mensagem genérica e mantém o formulário", async () => {
    mockApiError("post", "/users", 500, {});
    renderPage();

    await submit();

    expect(await screen.findByText("Erro ao criar conta. Tente novamente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar Conta" })).toBeEnabled();
  });
});
